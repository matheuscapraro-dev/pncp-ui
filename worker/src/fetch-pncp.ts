/**
 * Multi-page PNCP fetcher for the subscription worker.
 * Replicates the wave-based concurrent fetching from the Next.js streaming route.
 */

const PNCP_BASE = "https://pncp.gov.br/api/consulta";

// ─── Tuning ──────────────────────────────────────────────────────────────────
const CONCURRENCY = 5;
const FETCH_TIMEOUT_MS = 15_000;
const WAVE_DELAY_MS = 500;
const MAX_ATTEMPTS = 5;
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

async function fetchPage(url: string, attempt = 0, label?: string): Promise<PageResult> {
  const tag = label ? `${label} ` : "";
  for (let i = attempt; i < MAX_ATTEMPTS; i++) {
    try {
      const t0 = Date.now();
      const resp = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      const dt = Date.now() - t0;

      if (resp.status === 204) {
        console.log(`${tag}  fetch ${resp.status} (${dt}ms) — vazio`);
        return { data: [], totalRegistros: 0, totalPaginas: 0 };
      }

      const text = await resp.text();
      if (!text || text.trim() === "") {
        console.log(`${tag}  fetch ${resp.status} (${dt}ms) — body vazio`);
        return { data: [], totalRegistros: 0, totalPaginas: 0 };
      }

      if (!resp.ok) {
        console.warn(`${tag}  fetch ${resp.status} (${dt}ms) tentativa ${i + 1}/${MAX_ATTEMPTS}: ${text.slice(0, 120)}`);
        if ((resp.status >= 500 || resp.status === 429 || resp.status === 400 || resp.status === 422) && i < MAX_ATTEMPTS - 1) {
          await sleep(800 * (i + 1));
          continue;
        }
        throw new Error(`PNCP ${resp.status}: ${text.slice(0, 200)}`);
      }

      if (i > 0) {
        console.log(`${tag}  fetch OK (${dt}ms) após ${i + 1} tentativas`);
      }

      return JSON.parse(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`${tag}  fetch erro tentativa ${i + 1}/${MAX_ATTEMPTS}: ${msg.slice(0, 150)}`);
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
        const reason = r.status === "rejected" ? (r.reason instanceof Error ? r.reason.message : String(r.reason)) : "no data";
        console.warn(`  Página ${wave[j]} falhou: ${reason.slice(0, 120)}`);
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
  label?: string;
  onProgress?: (loaded: number, total: number) => void;
}

export async function fetchAllPages(opts: FetchParams): Promise<FetchAllResult> {
  const { endpoint, params, pageSize = 50, label, onProgress } = opts;
  const tag = label ?? "";

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
  const firstUrl = buildUrl(1);
  console.log(`${tag} Buscando página 1: ${firstUrl}`);
  const first = await fetchPage(firstUrl, 0, label);
  const totalPages = first.totalPaginas || 1;
  const totalApiResults = first.totalRegistros || first.data.length;

  console.log(`${tag} Página 1 OK → ${totalApiResults} registros em ${totalPages} páginas (${first.data.length} nesta página)`);

  onProgress?.(1, totalPages);

  if (totalPages <= 1) {
    console.log(`${tag} Apenas 1 página, retornando ${first.data.length} itens`);
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
    const delay = RETRY_WAVE_DELAY_MS * Math.pow(2, pass);
    console.log(`${tag} Retry pass ${pass + 1}/${RETRY_PASSES}: ${failedPages.length} páginas falhadas, aguardando ${delay}ms...`);
    await sleep(delay);

    const retryUrls = new Map<number, string>();
    for (const p of failedPages) retryUrls.set(p, buildUrl(p));

    const result = await fetchWaves(retryUrls, RETRY_CONCURRENCY, RETRY_WAVE_DELAY_MS);
    allItems.push(...result.items);
    failedPages = result.failed;
    console.log(`${tag} Retry pass ${pass + 1} concluído: ${result.failed.length} ainda falharam`);
  }

  console.log(`${tag} fetchAllPages concluído: ${allItems.length} itens carregados, ${failedPages.length} páginas falharam`);
  return { items: allItems, totalApiResults, failedPages };
}
