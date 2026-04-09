import { NextRequest } from "next/server";

const PNCP_BASE = "https://pncp.gov.br/api/consulta";
const SERVER_CONCURRENCY = 10;
const FETCH_TIMEOUT_MS = 30_000; // 30s per PNCP request

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
    // Combine caller abort signal with a per-request timeout so a hung
    // PNCP response never blocks the whole stream indefinitely.
    const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
    const combined = AbortSignal.any([signal, timeout]);

    const resp = await fetch(buildUrl(page), {
      headers: { Accept: "application/json" },
      signal: combined,
    });
    if (resp.status === 204) return { data: [], totalRegistros: 0, totalPaginas: 0 };
    const text = await resp.text();
    if (!text || text.trim() === "") return { data: [], totalRegistros: 0, totalPaginas: 0 };
    if (!resp.ok) throw new Error(`PNCP ${resp.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text);
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

        // 2. Fetch remaining pages in server-side batches
        const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        let loadedPages = 1;

        for (let i = 0; i < remaining.length; i += SERVER_CONCURRENCY) {
          if (abortController.signal.aborted) break;

          const batch = remaining.slice(i, i + SERVER_CONCURRENCY);
          const results = await Promise.allSettled(
            batch.map((p) => fetchPage(p, abortController.signal))
          );

          if (abortController.signal.aborted) break;

          const batchItems: unknown[] = [];
          for (const r of results) {
            if (r.status === "fulfilled" && r.value.data) {
              batchItems.push(...r.value.data);
            }
          }

          loadedPages += batch.length;
          send({ type: "batch", items: batchItems, loadedPages, totalPages });
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
