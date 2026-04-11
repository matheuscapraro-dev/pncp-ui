/**
 * PNCP Subscription Worker
 *
 * Runs as a Render Cron Job (e.g. daily at 06:00 UTC).
 * For each enabled subscription:
 *   1. Computes the date range from diasRetroativos
 *   2. Fetches ALL pages from the PNCP API
 *   3. Applies client-side filters
 *   4. Saves filtered results to Vercel Blob
 *   5. Updates subscription metadata
 */

import { loadSubscriptions, saveSubscriptions, saveResults } from "./blob.js";
import { fetchAllPages } from "./fetch-pncp.js";
import { applyFilters } from "./apply-filters.js";
import type { Subscription, SubscriptionFilters, SubscriptionResultsEnvelope } from "./types.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function toApiDate(iso: string): string {
  return iso.replace(/-/g, "");
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

// ─── Build params for a subscription ─────────────────────────────────────────

function buildFetchParams(f: SubscriptionFilters) {
  const mode = f.searchMode;
  const endpoint = MODE_ENDPOINTS[mode];
  if (!endpoint) throw new Error(`Modo de busca desconhecido: ${mode}`);

  const params: Record<string, string> = {};

  const dataInicial = toApiDate(daysAgoISO(f.diasRetroativos));
  const dataFinal = toApiDate(todayISO());

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

  const pageSize = isContratacaoMode(mode) ? PAGE_SIZE_CONTRATACOES : PAGE_SIZE_CONTRATOS;

  return { endpoint, params, pageSize };
}

// ─── Process a single subscription ───────────────────────────────────────────

async function processSubscription(sub: Subscription): Promise<Partial<Subscription>> {
  const label = `[${sub.nome}]`;
  console.log(`${label} Processando...`);
  console.log(`${label} Modo: ${sub.filters.searchMode}, Dias: ${sub.filters.diasRetroativos}`);

  try {
    const { endpoint, params, pageSize } = buildFetchParams(sub.filters);

    const result = await fetchAllPages({
      endpoint,
      params,
      pageSize,
      onProgress: (loaded, total) => {
        if (loaded % 10 === 0 || loaded === total) {
          console.log(`${label} Progresso: ${loaded}/${total} páginas`);
        }
      },
    });

    console.log(`${label} API retornou ${result.totalApiResults} itens (${result.items.length} carregados)`);

    if (result.failedPages.length > 0) {
      console.warn(`${label} ${result.failedPages.length} páginas falharam: ${result.failedPages.join(", ")}`);
    }

    // Apply client-side filters
    const filtered = applyFilters(result.items, sub.filters);
    console.log(`${label} Após filtros: ${filtered.length} itens`);

    // Save results to Blob
    const envelope: SubscriptionResultsEnvelope = {
      subscriptionId: sub.id,
      refreshedAt: new Date().toISOString(),
      totalApiResults: result.totalApiResults,
      filteredCount: filtered.length,
      items: filtered,
    };
    await saveResults(envelope);

    console.log(`${label} ✓ Resultados salvos no Blob`);

    return {
      status: "ready",
      lastRefreshedAt: envelope.refreshedAt,
      lastResultCount: filtered.length,
      totalApiResults: result.totalApiResults,
      lastError: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(`${label} ✗ Erro: ${msg}`);
    return {
      status: "error",
      lastRefreshedAt: new Date().toISOString(),
      lastError: msg,
    };
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  PNCP Subscription Worker");
  console.log(`  ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════════════════════\n");

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
  console.log("  Worker finalizado com sucesso!");
  console.log("═══════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
