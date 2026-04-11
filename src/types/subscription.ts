import type { SearchMode } from "./pncp";

// ─── Subscription Filters ────────────────────────────────────────────────────

export interface SubscriptionFilters {
  searchMode: SearchMode;

  /** Rolling window: the worker computes dataInicial = today - N days. */
  diasRetroativos: number;

  // Server-side params (sent directly to PNCP API)
  codigoModalidadeContratacao: number | null;
  codigoModoDisputa: number | null;
  uf: string;
  codigoMunicipioIbge: string;
  cnpj: string;
  codigoUnidadeAdministrativa: string;

  // Client-side filters (applied after fetching)
  situacaoCompraId: string;
  srp: string;
  valorMinimo: string;
  valorMaximo: string;
  palavrasIncluir: string;
  palavrasExcluir: string;
  esferaId: string;
  poderId: string;
  tipoInstrumentoConvocatorio: string;
  municipioNome: string;
  nomeOrgao: string;
  hasLinkExterno: string;
  valorHomologadoMinimo: string;
  valorHomologadoMaximo: string;
}

// ─── Subscription ────────────────────────────────────────────────────────────

export type SubscriptionStatus = "pending" | "ready" | "error";

export interface Subscription {
  id: string;
  nome: string;
  filters: SubscriptionFilters;
  enabled: boolean;
  status: SubscriptionStatus;
  createdAt: string;
  lastRefreshedAt: string | null;
  lastResultCount: number;
  totalApiResults: number;
  lastError: string | null;
}

// ─── Subscription store (persisted in Vercel Blob) ───────────────────────────

export interface SubscriptionIndex {
  subscriptions: Subscription[];
  updatedAt: string;
}

export interface SubscriptionResultsEnvelope {
  subscriptionId: string;
  refreshedAt: string;
  totalApiResults: number;
  filteredCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
}
