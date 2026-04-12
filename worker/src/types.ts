/**
 * Shared types for the worker.
 * Mirrors the relevant types from the Next.js app.
 */

export type SearchMode =
  | "publicacao"
  | "proposta"
  | "atualizacao"
  | "contratos"
  | "contratos_atualizacao"
  | "atas"
  | "atas_atualizacao";

export interface SubscriptionFilters {
  searchMode: SearchMode;
  diasRetroativos: number;
  codigoModalidadeContratacao: number | null;
  codigoModoDisputa: number | null;
  uf: string;
  codigoMunicipioIbge: string;
  cnpj: string;
  codigoUnidadeAdministrativa: string;
  situacaoCompraId: string;
  statusProposta: string;
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

export interface SubscriptionIndex {
  subscriptions: Subscription[];
  updatedAt: string;
}

export interface SubscriptionResultsEnvelope {
  subscriptionId: string;
  refreshedAt: string;
  totalApiResults: number;
  filteredCount: number;
  items: unknown[];
}

export interface SubscriptionRawEnvelope {
  subscriptionId: string;
  refreshedAt: string;
  totalApiResults: number;
  items: unknown[];
}
