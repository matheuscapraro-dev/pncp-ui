import { NextRequest } from "next/server";

const PNCP_BASE = "https://pncp.gov.br/api/consulta";
const SERVER_CONCURRENCY = 8;
const FETCH_TIMEOUT_MS = 20_000; // 20s per PNCP request
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const BATCH_DELAY_MS = 200; // delay between batches to avoid throttling
const RETRY_CONCURRENCY = 4; // lower concurrency for retry pass
const RETRY_BATCH_DELAY_MS = 1_000; // longer delay between retry batches

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Streaming PNCP fetcher.
 *
 * Fetches ALL pages server-side in parallel batches and streams results
 * back as NDJSON (newline-delimited JSON). This eliminates hundreds of
 * individual browser→proxy round-trips.
 *
 * Each line is one of:
 *   { type: "meta", totalItems, totalPages }
 *   { type: "batch", items: [...], loadedPages, totalPages }
 *   { type: "done" }
 *   { type: "error", message }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const endpoint = searchParams.get("endpoint");
  if (!endpoint || !endpoint.startsWith("v1/")) {
    return new Response(
      JSON.stringify({ error: "Endpoint inválido." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const pageSize = Number(searchParams.get("tamanhoPagina")) || 50;

  // Build upstream URL template (without pagina/tamanhoPagina)
  const baseParams = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (key !== "endpoint" && key !== "pagina" && key !== "tamanhoPagina") {
      baseParams.set(key, value);
    }
  }

  function buildUrl(page: number): string {
    const url = new URL(`${PNCP_BASE}/${endpoint}`);
    for (const [k, v] of baseParams.entries()) url.searchParams.set(k, v);
    url.searchParams.set("pagina", String(page));
    url.searchParams.set("tamanhoPagina", String(pageSize));
    return url.toString();
  }

  async function fetchPage(page: number, signal: AbortSignal): Promise<{ data: unknown[]; totalRegistros: number; totalPaginas: number }> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
        const combined = AbortSignal.any([signal, timeout]);

        const resp = await fetch(buildUrl(page), {
          headers: { Accept: "application/json" },
          signal: combined,
        });
        if (resp.status === 204) return { data: [], totalRegistros: 0, totalPaginas: 0 };
        const text = await resp.text();
        if (!text || text.trim() === "") return { data: [], totalRegistros: 0, totalPaginas: 0 };
        if (!resp.ok) {
          // Retry on server errors (5xx) and rate limits (429)
          if ((resp.status >= 500 || resp.status === 429) && attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
            continue;
          }
          throw new Error(`PNCP ${resp.status}: ${text.slice(0, 200)}`);
        }
        return JSON.parse(text);
      } catch (err) {
        // Don't retry if the main signal was aborted (user cancelled)
        if (signal.aborted) throw err;
        // Retry on timeout / network errors
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    // Should not reach here, but satisfy TS
    return { data: [], totalRegistros: 0, totalPaginas: 0 };
  }

  const encoder = new TextEncoder();
  const abortController = new AbortController();

  // Abort server fetches if client disconnects
  request.signal.addEventListener("abort", () => abortController.abort());

  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: unknown) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      }

      try {
        // 1. Fetch first page to discover totals
        const first = await fetchPage(1, abortController.signal);
        const totalPages = first.totalPaginas || 1;
        const totalItems = first.totalRegistros || first.data.length;

        send({ type: "meta", totalItems, totalPages });
        send({ type: "batch", items: first.data, loadedPages: 1, totalPages });

        if (totalPages <= 1) {
          send({ type: "done" });
          controller.close();
          return;
        }

        // 2. Fetch remaining pages in server-side batches with delay
        const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        let loadedPages = 1;
        const failedPages: number[] = [];

        for (let i = 0; i < remaining.length; i += SERVER_CONCURRENCY) {
          if (abortController.signal.aborted) break;

          const batch = remaining.slice(i, i + SERVER_CONCURRENCY);
          const results = await Promise.allSettled(
            batch.map((p) => fetchPage(p, abortController.signal))
          );

          if (abortController.signal.aborted) break;

          const batchItems: unknown[] = [];
          for (let j = 0; j < results.length; j++) {
            const r = results[j];
            if (r.status === "fulfilled" && r.value.data) {
              batchItems.push(...r.value.data);
            } else if (r.status === "rejected") {
              failedPages.push(batch[j]);
            }
          }

          loadedPages += batch.length;
          send({ type: "batch", items: batchItems, loadedPages, totalPages });

          // Delay between batches to avoid PNCP throttling
          const isLastBatch = i + SERVER_CONCURRENCY >= remaining.length;
          if (!isLastBatch && !abortController.signal.aborted) {
            await sleep(BATCH_DELAY_MS);
          }
        }

        // 3. Retry failed pages with lower concurrency and longer delays
        if (failedPages.length > 0 && !abortController.signal.aborted) {
          for (let i = 0; i < failedPages.length; i += RETRY_CONCURRENCY) {
            if (abortController.signal.aborted) break;

            // Wait before each retry batch
            await sleep(RETRY_BATCH_DELAY_MS);
            if (abortController.signal.aborted) break;

            const retryBatch = failedPages.slice(i, i + RETRY_CONCURRENCY);
            const results = await Promise.allSettled(
              retryBatch.map((p) => fetchPage(p, abortController.signal))
            );

            if (abortController.signal.aborted) break;

            const retryItems: unknown[] = [];
            for (const r of results) {
              if (r.status === "fulfilled" && r.value.data) {
                retryItems.push(...r.value.data);
              }
            }

            if (retryItems.length > 0) {
              send({ type: "batch", items: retryItems, loadedPages: totalPages, totalPages });
            }
          }
        }

        if (!abortController.signal.aborted) {
          send({ type: "done" });
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          const message = err instanceof Error ? err.message : "Erro desconhecido";
          send({ type: "error", message });
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    },
  });
}
