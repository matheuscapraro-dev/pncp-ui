import { NextRequest } from "next/server";

const PNCP_BASE = "https://pncp.gov.br/api/consulta";

// ─── Tuning (mirrors worker/src/fetch-pncp.ts) ─────────────────────────────
const CONCURRENCY = 5;             // parallel requests per wave
const FETCH_TIMEOUT_MS = 15_000;   // 15s timeout — PNCP can be slow
const WAVE_DELAY_MS = 500;         // pause between concurrency waves
const MAX_ATTEMPTS = 5;            // total attempts per page (1 initial + 4 retries)
const RETRY_PASSES = 3;            // number of full retry sweeps for failures
const RETRY_WAVE_DELAY_MS = 2_000; // pause between retry waves
const RETRY_CONCURRENCY = 3;       // concurrency for retries
const CHUNK_DAYS = 5;              // split date ranges into N-day chunks to avoid rate-limits

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type PageResult = { data: unknown[]; totalRegistros: number; totalPaginas: number };

// ─── Date-range chunking helpers (mirrored from worker/src/index.ts) ─────────

function apiDateToISO(apiDate: string): string {
  return `${apiDate.slice(0, 4)}-${apiDate.slice(4, 6)}-${apiDate.slice(6, 8)}`;
}

function isoToApiDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function dateFromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function splitDateRange(startISO: string, endISO: string, chunkDays: number): [string, string][] {
  const chunks: [string, string][] = [];
  const end = dateFromISO(endISO);
  let cursor = dateFromISO(startISO);

  while (cursor <= end) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setDate(chunkEnd.getDate() + chunkDays - 1);
    const actualEnd = chunkEnd > end ? end : chunkEnd;
    chunks.push([dateToISO(cursor), dateToISO(actualEnd)]);
    cursor = new Date(actualEnd);
    cursor.setDate(cursor.getDate() + 1);
  }

  return chunks;
}

/**
 * Streaming PNCP fetcher.
 *
 * Splits the date range into small chunks (CHUNK_DAYS) to avoid PNCP
 * rate-limiting on large result sets, then fetches ALL pages for each
 * chunk in controlled waves. Results are streamed back as NDJSON.
 *
 * Protocol (one JSON object per line):
 *   { type: "meta", totalItems, totalPages }   ← sent per chunk (additive)
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

  function buildUrl(page: number, overrideParams?: URLSearchParams): string {
    const url = new URL(`${PNCP_BASE}/${endpoint}`);
    const src = overrideParams ?? baseParams;
    for (const [k, v] of src.entries()) url.searchParams.set(k, v);
    url.searchParams.set("pagina", String(page));
    url.searchParams.set("tamanhoPagina", String(pageSize));
    return url.toString();
  }

  /** Fetch a single page with built-in per-attempt retry & back-off. */
  async function fetchPage(page: number, signal: AbortSignal, overrideParams?: URLSearchParams): Promise<PageResult> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
        const combined = AbortSignal.any([signal, timeout]);

        const resp = await fetch(buildUrl(page, overrideParams), {
          headers: { Accept: "application/json" },
          signal: combined,
        });

        if (resp.status === 204) return { data: [], totalRegistros: 0, totalPaginas: 0 };

        const text = await resp.text();
        if (!text || text.trim() === "") return { data: [], totalRegistros: 0, totalPaginas: 0 };

        if (!resp.ok) {
          if ((resp.status >= 500 || resp.status === 429 || resp.status === 400 || resp.status === 422) && attempt < MAX_ATTEMPTS - 1) {
            await sleep(800 * (attempt + 1));
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
   * Returns list of failed page numbers.
   */
  async function fetchWaves(
    pages: number[],
    signal: AbortSignal,
    concurrency: number,
    waveDelay: number,
    onBatch: (items: unknown[], pagesCompleted: number) => void,
    overrideParams?: URLSearchParams,
  ): Promise<number[]> {
    const failed: number[] = [];

    for (let i = 0; i < pages.length; i += concurrency) {
      if (signal.aborted) break;

      const wave = pages.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        wave.map((p) => fetchPage(p, signal, overrideParams)),
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

      const isLast = i + concurrency >= pages.length;
      if (!isLast && !signal.aborted) {
        await sleep(waveDelay);
      }
    }

    return failed;
  }

  /**
   * Fetch all pages for a single date-range chunk (page-1 discover + waves + retries).
   */
  async function fetchChunk(
    signal: AbortSignal,
    chunkParams: URLSearchParams,
    send: (obj: unknown) => void,
    grandTotals: { items: number; pages: number; completed: number },
  ): Promise<void> {
    const first = await fetchPage(1, signal, chunkParams);
    const chunkTotalPages = first.totalPaginas || 1;
    const chunkTotalItems = first.totalRegistros || first.data.length;

    // Accumulate into grand totals and notify client
    grandTotals.items += chunkTotalItems;
    grandTotals.pages += chunkTotalPages;
    grandTotals.completed += 1;

    send({ type: "meta", totalItems: grandTotals.items, totalPages: grandTotals.pages });
    send({ type: "batch", items: first.data, loadedPages: grandTotals.completed, totalPages: grandTotals.pages });

    if (chunkTotalPages <= 1) return;

    // Fetch remaining pages for this chunk
    const remaining = Array.from({ length: chunkTotalPages - 1 }, (_, i) => i + 2);

    let failedPages = await fetchWaves(
      remaining,
      signal,
      CONCURRENCY,
      WAVE_DELAY_MS,
      (items, count) => {
        grandTotals.completed += count;
        send({ type: "batch", items, loadedPages: grandTotals.completed, totalPages: grandTotals.pages });
      },
      chunkParams,
    );

    // Retry passes with increasing back-off
    for (let pass = 0; pass < RETRY_PASSES && failedPages.length > 0; pass++) {
      if (signal.aborted) break;

      await sleep(RETRY_WAVE_DELAY_MS * Math.pow(2, pass));
      if (signal.aborted) break;

      failedPages = await fetchWaves(
        failedPages,
        signal,
        RETRY_CONCURRENCY,
        RETRY_WAVE_DELAY_MS,
        (items) => {
          if (items.length > 0) {
            send({ type: "batch", items, loadedPages: grandTotals.completed, totalPages: grandTotals.pages });
          }
        },
        chunkParams,
      );
    }
  }

  // ─── Determine date chunks ───────────────────────────────────────────────

  const rawDataInicial = baseParams.get("dataInicial");  // API format: "20260405"
  const rawDataFinal = baseParams.get("dataFinal");      // API format: "20260412"

  // Only chunk when both dates are present (mode "proposta" has no dataInicial)
  let dateChunks: [string, string][] | null = null;
  if (rawDataInicial && rawDataFinal) {
    const startISO = apiDateToISO(rawDataInicial);
    const endISO = apiDateToISO(rawDataFinal);
    dateChunks = splitDateRange(startISO, endISO, CHUNK_DAYS);
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
        if (!dateChunks || dateChunks.length <= 1) {
          // ── No chunking: single date range or no dates (proposta mode) ──
          await fetchChunk(abortController.signal, baseParams, send, { items: 0, pages: 0, completed: 0 });
        } else {
          // ── Chunked: iterate over date-range chunks ──
          const grandTotals = { items: 0, pages: 0, completed: 0 };

          for (const [chunkStart, chunkEnd] of dateChunks) {
            if (abortController.signal.aborted) break;

            // Clone base params and override dates for this chunk
            const chunkParams = new URLSearchParams(baseParams);
            chunkParams.set("dataInicial", isoToApiDate(chunkStart));
            chunkParams.set("dataFinal", isoToApiDate(chunkEnd));

            await fetchChunk(abortController.signal, chunkParams, send, grandTotals);
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
