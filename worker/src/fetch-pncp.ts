/**
 * Multi-page PNCP fetcher for the subscription worker.
 * Replicates the wave-based concurrent fetching from the Next.js streaming route.
 */

const PNCP_BASE = "https://pncp.gov.br/api/consulta";

// ─── Tuning ──────────────────────────────────────────────────────────────────
const CONCURRENCY = 5;
const FETCH_TIMEOUT_MS = 30_000;
const WAVE_DELAY_MS = 500;
const MAX_ATTEMPTS = 4;
const RETRY_PASSES = 3;
const RETRY_WAVE_DELAY_MS = 2_000;
const RETRY_CONCURRENCY = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface PageResult {
  data: unknown[];
  totalRegistros: number;
  totalPaginas: number;
}

export interface FetchAllResult {
  items: unknown[];
  totalApiResults: number;
  failedPages: number[];
}

async function fetchPage(url: string, attempt = 0): Promise<PageResult> {
  for (let i = attempt; i < MAX_ATTEMPTS; i++) {
    try {
      const resp = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (resp.status === 204) return { data: [], totalRegistros: 0, totalPaginas: 0 };

      const text = await resp.text();
      if (!text || text.trim() === "") return { data: [], totalRegistros: 0, totalPaginas: 0 };

      if (!resp.ok) {
        if ((resp.status >= 500 || resp.status === 429) && i < MAX_ATTEMPTS - 1) {
          await sleep(800 * (i + 1));
          continue;
        }
        throw new Error(`PNCP ${resp.status}: ${text.slice(0, 200)}`);
      }

      return JSON.parse(text);
    } catch (err) {
      if (i < MAX_ATTEMPTS - 1) {
        await sleep(800 * (i + 1));
        continue;
      }
      throw err;
    }
  }
  return { data: [], totalRegistros: 0, totalPaginas: 0 };
}

async function fetchWaves(
  urls: Map<number, string>,
  concurrency: number,
  waveDelay: number,
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ items: unknown[]; failed: number[] }> {
  const pages = [...urls.keys()];
  const allItems: unknown[] = [];
  const failed: number[] = [];
  let completed = 0;

  for (let i = 0; i < pages.length; i += concurrency) {
    const wave = pages.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      wave.map((p) => fetchPage(urls.get(p)!)),
    );

    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === "fulfilled" && r.value.data) {
        allItems.push(...r.value.data);
      } else {
        failed.push(wave[j]);
      }
      completed++;
    }

    onProgress?.(completed, pages.length);

    const isLast = i + concurrency >= pages.length;
    if (!isLast) await sleep(waveDelay);
  }

  return { items: allItems, failed };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface FetchParams {
  endpoint: string;
  params: Record<string, string>;
  pageSize?: number;
  onProgress?: (loaded: number, total: number) => void;
}

export async function fetchAllPages(opts: FetchParams): Promise<FetchAllResult> {
  const { endpoint, params, pageSize = 50, onProgress } = opts;

  function buildUrl(page: number): string {
    const url = new URL(`${PNCP_BASE}/${endpoint}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    url.searchParams.set("pagina", String(page));
    url.searchParams.set("tamanhoPagina", String(pageSize));
    return url.toString();
  }

  // 1. Fetch first page to discover totals
  const first = await fetchPage(buildUrl(1));
  const totalPages = first.totalPaginas || 1;
  const totalApiResults = first.totalRegistros || first.data.length;

  onProgress?.(1, totalPages);

  if (totalPages <= 1) {
    return { items: first.data, totalApiResults, failedPages: [] };
  }

  // 2. Build URL map for remaining pages
  const remaining = new Map<number, string>();
  for (let p = 2; p <= totalPages; p++) {
    remaining.set(p, buildUrl(p));
  }

  // 3. Initial fetch waves
  let loaded = 1;
  const { items, failed } = await fetchWaves(
    remaining,
    CONCURRENCY,
    WAVE_DELAY_MS,
    (completed, total) => {
      onProgress?.(loaded + completed, totalPages);
    },
  );
  loaded += remaining.size;

  const allItems = [...first.data, ...items];
  let failedPages = failed;

  // 4. Retry passes
  for (let pass = 0; pass < RETRY_PASSES && failedPages.length > 0; pass++) {
    await sleep(RETRY_WAVE_DELAY_MS * Math.pow(2, pass));

    const retryUrls = new Map<number, string>();
    for (const p of failedPages) retryUrls.set(p, buildUrl(p));

    const result = await fetchWaves(retryUrls, RETRY_CONCURRENCY, RETRY_WAVE_DELAY_MS);
    allItems.push(...result.items);
    failedPages = result.failed;
  }

  return { items: allItems, totalApiResults, failedPages };
}
