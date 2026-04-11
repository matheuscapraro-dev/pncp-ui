/**
 * PNCP Subscription Worker
 *
 * Runs as a Render Cron Job (e.g. daily at 06:00 UTC).
 * For each enabled subscription:
 *   1. Computes the date range from diasRetroativos
 *   2. Splits into smaller date chunks to avoid massive single fetches
 *   3. Fetches ALL pages from the PNCP API
 *   4. Applies client-side filters
 *   5. Saves filtered results to Vercel Blob
 *   6. Updates subscription metadata
 */

import { loadSubscriptions, saveSubscriptions, saveResults } from "./blob.js";
import { fetchAllPages } from "./fetch-pncp.js";
import { applyFilters } from "./apply-filters.js";
import type { Subscription, SubscriptionFilters, SubscriptionResultsEnvelope } from "./types.js";

// ─── Crash handlers ──────────────────────────────────────────────────────────

process.on("SIGTERM", () => {
  console.log("\n⚠ SIGTERM recebido — processo será encerrado pelo host.");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\n⚠ SIGINT recebido — encerrando.");
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  console.error("💥 uncaughtException:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 unhandledRejection:", reason);
  process.exit(1);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function elapsed(start: number): string {
  const s = ((Date.now() - start) / 1000).toFixed(1);
  return `${s}s`;
}

function memUsage(): string {
  const mb = process.memoryUsage().rss / 1024 / 1024;
  return `${mb.toFixed(0)}MB`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function toApiDate(iso: string): string {
  return iso.replace(/-/g, "");
}

/**
 * Split a date range [start, end] into chunks of `chunkDays` days.
 * Returns array of [startISO, endISO] pairs.
 */
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

function isContratacaoMode(m: string): boolean {
  return m === "publicacao" || m === "proposta" || m === "atualizacao";
}

function isContratoMode(m: string): boolean {
  return m === "contratos" || m === "contratos_atualizacao";
}

const MODE_ENDPOINTS: Record<string, string> = {
  publicacao: "v1/contratacoes/publicacao",
  proposta: "v1/contratacoes/proposta",
  atualizacao: "v1/contratacoes/atualizacao",
  contratos: "v1/contratos",
  contratos_atualizacao: "v1/contratos/atualizacao",
  atas: "v1/atas",
  atas_atualizacao: "v1/atas/atualizacao",
};

const PAGE_SIZE_CONTRATACOES = 50;
const PAGE_SIZE_CONTRATOS = 50;

/** Days per chunk — keeps each fetch under ~100 pages */
const CHUNK_DAYS = 5;

// ─── Build params for a subscription ─────────────────────────────────────────

function buildFetchParams(f: SubscriptionFilters, overrideDates?: { dataInicial: string; dataFinal: string }) {
  const mode = f.searchMode;
  const endpoint = MODE_ENDPOINTS[mode];
  if (!endpoint) throw new Error(`Modo de busca desconhecido: ${mode}`);

  const params: Record<string, string> = {};

  const dataInicial = overrideDates
    ? toApiDate(overrideDates.dataInicial)
    : toApiDate(daysAgoISO(f.diasRetroativos));
  const dataFinal = overrideDates
    ? toApiDate(overrideDates.dataFinal)
    : toApiDate(todayISO());

  if (mode !== "proposta") {
    params.dataInicial = dataInicial;
  }
  params.dataFinal = dataFinal;

  if (isContratacaoMode(mode)) {
    if (f.codigoModalidadeContratacao != null) {
      params.codigoModalidadeContratacao = String(f.codigoModalidadeContratacao);
    }
    if (f.codigoModoDisputa != null) {
      params.codigoModoDisputa = String(f.codigoModoDisputa);
    }
    if (f.codigoMunicipioIbge) {
      params.codigoMunicipioIbge = f.codigoMunicipioIbge;
    }
  }

  if (f.uf) params.uf = f.uf;
  if (f.cnpj) {
    const key = isContratoMode(mode) ? "cnpjOrgao" : "cnpj";
    params[key] = f.cnpj;
  }
  if (f.codigoUnidadeAdministrativa) {
    params.codigoUnidadeAdministrativa = f.codigoUnidadeAdministrativa;
  }

  // Filter out any empty string values to prevent PNCP 400 errors
  for (const [k, v] of Object.entries(params)) {
    if (v === "") delete params[k];
  }

  const pageSize = isContratacaoMode(mode) ? PAGE_SIZE_CONTRATACOES : PAGE_SIZE_CONTRATOS;

  return { endpoint, params, pageSize };
}

// ─── Process a single subscription ───────────────────────────────────────────

async function processSubscription(sub: Subscription): Promise<Partial<Subscription>> {
  const label = `[${sub.nome}]`;
  const t0 = Date.now();
  console.log(`${label} Processando...`);
  console.log(`${label} Modo: ${sub.filters.searchMode}, Dias: ${sub.filters.diasRetroativos}`);
  console.log(`${label} Memória: ${memUsage()}`);

  try {
    const mode = sub.filters.searchMode;
    const startDate = daysAgoISO(sub.filters.diasRetroativos);
    const endDate = todayISO();

    // For modes with dataInicial, split into date chunks to avoid 500+ page fetches.
    // "proposta" mode doesn't use dataInicial so we skip chunking for it.
    const useChunking = mode !== "proposta";
    const chunks = useChunking
      ? splitDateRange(startDate, endDate, CHUNK_DAYS)
      : [[startDate, endDate] as [string, string]];

    console.log(`${label} Período: ${startDate} → ${endDate} (${chunks.length} chunk(s) de ${CHUNK_DAYS} dias)`);

    let allItems: unknown[] = [];
    let totalApiResults = 0;
    let totalFailedPages = 0;

    for (let ci = 0; ci < chunks.length; ci++) {
      const [chunkStart, chunkEnd] = chunks[ci];
      const chunkLabel = chunks.length > 1 ? `${label} [${ci + 1}/${chunks.length}: ${chunkStart}→${chunkEnd}]` : label;

      const { endpoint, params, pageSize } = buildFetchParams(sub.filters, { dataInicial: chunkStart, dataFinal: chunkEnd });

      if (ci === 0) {
        console.log(`${chunkLabel} Endpoint: ${endpoint}`);
        console.log(`${chunkLabel} Params: ${JSON.stringify(params)}`);
        console.log(`${chunkLabel} PageSize: ${pageSize}`);
      }
      console.log(`${chunkLabel} Iniciando fetch...`);

      const result = await fetchAllPages({
        endpoint,
        params,
        pageSize,
        label: chunkLabel,
        onProgress: (loaded, total) => {
          if (loaded % 5 === 0 || loaded === total || loaded === 1) {
            console.log(`${chunkLabel} Progresso: ${loaded}/${total} páginas (${elapsed(t0)}) [${memUsage()}]`);
          }
        },
      });

      console.log(`${chunkLabel} Chunk concluído em ${elapsed(t0)} — ${result.totalApiResults} registros, ${result.items.length} carregados`);

      allItems.push(...result.items);
      totalApiResults += result.totalApiResults;
      totalFailedPages += result.failedPages.length;

      if (result.failedPages.length > 0) {
        console.warn(`${chunkLabel} ${result.failedPages.length} páginas falharam: ${result.failedPages.join(", ")}`);
      }
    }

    console.log(`${label} Fetch total concluído em ${elapsed(t0)} — ${totalApiResults} registros, ${allItems.length} carregados [${memUsage()}]`);

    if (totalFailedPages > 0) {
      console.warn(`${label} Total de páginas falhadas: ${totalFailedPages}`);
    }

    // Apply client-side filters
    const filtered = applyFilters(allItems, sub.filters);
    console.log(`${label} Após filtros: ${filtered.length} itens`);

    // Free memory from unfiltered results
    allItems = [];

    // Save results to Blob
    console.log(`${label} Salvando resultados no Blob...`);
    const envelope: SubscriptionResultsEnvelope = {
      subscriptionId: sub.id,
      refreshedAt: new Date().toISOString(),
      totalApiResults,
      filteredCount: filtered.length,
      items: filtered,
    };
    await saveResults(envelope);

    console.log(`${label} ✓ Concluído em ${elapsed(t0)} — ${filtered.length} resultados salvos [${memUsage()}]`);

    return {
      status: "ready",
      lastRefreshedAt: envelope.refreshedAt,
      lastResultCount: filtered.length,
      totalApiResults,
      lastError: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    const stack = err instanceof Error ? err.stack : "";
    console.error(`${label} ✗ Erro após ${elapsed(t0)}: ${msg}`);
    if (stack) console.error(`${label} Stack: ${stack}`);
    return {
      status: "error",
      lastRefreshedAt: new Date().toISOString(),
      lastError: msg,
    };
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const mainT0 = Date.now();

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  PNCP Subscription Worker");
  console.log(`  ${new Date().toISOString()}`);
  console.log(`  Node ${process.version} | PID ${process.pid} | ${memUsage()}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // Heartbeat timer — logs every 60s so we can see the process is alive
  const heartbeat = setInterval(() => {
    console.log(`♥ heartbeat ${elapsed(mainT0)} | ${memUsage()}`);
  }, 60_000);

  try {
    const subscriptions = await loadSubscriptions();
    const enabled = subscriptions.filter((s) => s.enabled);

    console.log(`Total de inscrições: ${subscriptions.length}`);
    console.log(`Ativas: ${enabled.length}\n`);

    if (enabled.length === 0) {
      console.log("Nenhuma inscrição ativa. Finalizando.");
      return;
    }

    // Process subscriptions sequentially to avoid overwhelming the PNCP API
    for (const sub of enabled) {
      const updates = await processSubscription(sub);

      // Update the subscription metadata
      const idx = subscriptions.findIndex((s) => s.id === sub.id);
      if (idx !== -1) {
        subscriptions[idx] = { ...subscriptions[idx], ...updates };
      }

      console.log("");
    }

    // Persist updated subscription metadata
    await saveSubscriptions(subscriptions);

    console.log("═══════════════════════════════════════════════════════════");
    console.log(`  Worker finalizado com sucesso em ${elapsed(mainT0)}!`);
    console.log("═══════════════════════════════════════════════════════════");
  } finally {
    clearInterval(heartbeat);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
