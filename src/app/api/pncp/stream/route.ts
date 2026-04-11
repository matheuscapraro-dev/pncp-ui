import { NextRequest } from "next/server";

const PNCP_BASE = "https://pncp.gov.br/api/consulta";

// ─── Tuning for 500+ page fetches ───────────────────────────────────────────
const CONCURRENCY = 8;            // parallel requests per wave
const FETCH_TIMEOUT_MS = 15_000;  // 15s timeout per individual request
const WAVE_DELAY_MS = 200;        // pause between concurrency waves
const MAX_ATTEMPTS = 4;           // total attempts per page (1 initial + 3 retries)
const RETRY_PASSES = 3;           // number of full retry sweeps for failures
const RETRY_WAVE_DELAY_MS = 1_000; // pause between retry waves
const RETRY_CONCURRENCY = 4;      // concurrency for retries

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type PageResult = { data: unknown[]; totalRegistros: number; totalPaginas: number };

/**
 * Streaming PNCP fetcher.
 *
 * Fetches ALL pages server-side in controlled waves and streams results
 * back as NDJSON. Failed pages are retried in multiple passes with
 * exponential back-off so that 500+ page result sets complete reliably.
 *
 * Protocol (one JSON object per line):
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
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const pageSize = Number(searchParams.get("tamanhoPagina")) || 50;

  // Build upstream URL template (strip internal params and empty values)
  const baseParams = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (key !== "endpoint" && key !== "pagina" && key !== "tamanhoPagina" && value !== "") {
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

  /** Fetch a single page with built-in per-attempt retry & back-off. */
  async function fetchPage(page: number, signal: AbortSignal): Promise<PageResult> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
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
          if ((resp.status >= 500 || resp.status === 429 || resp.status === 400) && attempt < MAX_ATTEMPTS - 1) {
            await sleep(800 * (attempt + 1)); // 800ms, 1600ms, 2400ms
            continue;
          }
          throw new Error(`PNCP ${resp.status}: ${text.slice(0, 200)}`);
        }

        return JSON.parse(text);
      } catch (err) {
        if (signal.aborted) throw err;
        if (attempt < MAX_ATTEMPTS - 1) {
          await sleep(800 * (attempt + 1));
          continue;
        }
        throw err;
      }
    }
    return { data: [], totalRegistros: 0, totalPaginas: 0 };
  }

  /**
   * Fetch an array of pages in controlled waves.
   * Returns { items, failedPages }.
   */
  async function fetchWaves(
    pages: number[],
    signal: AbortSignal,
    concurrency: number,
    waveDelay: number,
    onBatch: (items: unknown[], pagesCompleted: number) => void,
  ): Promise<number[]> {
    const failed: number[] = [];

    for (let i = 0; i < pages.length; i += concurrency) {
      if (signal.aborted) break;

      const wave = pages.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        wave.map((p) => fetchPage(p, signal)),
      );

      if (signal.aborted) break;

      const waveItems: unknown[] = [];
      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status === "fulfilled" && r.value.data) {
          waveItems.push(...r.value.data);
        } else {
          failed.push(wave[j]);
        }
      }

      onBatch(waveItems, wave.length);

      // Delay between waves (skip after last)
      const isLast = i + concurrency >= pages.length;
      if (!isLast && !signal.aborted) {
        await sleep(waveDelay);
      }
    }

    return failed;
  }

  const encoder = new TextEncoder();
  const abortController = new AbortController();
  request.signal.addEventListener("abort", () => abortController.abort());

  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: unknown) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      }

      try {
        // 1. First page — discover totals
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

        // 2. Fetch remaining pages
        const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        let completedPages = 1;

        let failedPages = await fetchWaves(
          remaining,
          abortController.signal,
          CONCURRENCY,
          WAVE_DELAY_MS,
          (items, count) => {
            completedPages += count;
            send({ type: "batch", items, loadedPages: completedPages, totalPages });
          },
        );

        // 3. Multiple retry passes with increasing back-off
        for (let pass = 0; pass < RETRY_PASSES && failedPages.length > 0; pass++) {
          if (abortController.signal.aborted) break;

          // Exponential cooldown: 2s, 4s, 8s before each pass
          await sleep(RETRY_WAVE_DELAY_MS * Math.pow(2, pass));
          if (abortController.signal.aborted) break;

          failedPages = await fetchWaves(
            failedPages,
            abortController.signal,
            RETRY_CONCURRENCY,
            RETRY_WAVE_DELAY_MS,
            (items) => {
              if (items.length > 0) {
                send({ type: "batch", items, loadedPages: totalPages, totalPages });
              }
            },
          );
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
