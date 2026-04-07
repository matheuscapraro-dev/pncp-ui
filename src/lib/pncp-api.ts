import type {
  PaginaRetorno,
  CompraPublicacaoDTO,
  CompraDetalheDTO,
  ContratoDTO,
  AtaRegistroPrecoDTO,
  ContratacaoPublicacaoParams,
  ContratacaoPropostaParams,
  ContratacaoAtualizacaoParams,
  ContratosParams,
  ContratosAtualizacaoParams,
  AtasParams,
  AtasAtualizacaoParams,
} from "@/types/pncp";
import { toApiDate } from "@/lib/utils";

/**
 * PNCP API client — all calls go through the local proxy at /api/pncp
 * to avoid CORS issues.
 */

const EMPTY_PAGE = {
  data: [],
  totalRegistros: 0,
  totalPaginas: 0,
  numeroPagina: 0,
  paginasRestantes: 0,
  empty: true,
};

async function fetchPNCP<T>(
  endpoint: string,
  params: Record<string, string | number | undefined>
): Promise<T> {
  const url = new URL("/api/pncp", window.location.origin);
  url.searchParams.set("endpoint", endpoint);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const resp = await fetch(url.toString());

  // 204 No Content — empty result set
  if (resp.status === 204) {
    return EMPTY_PAGE as unknown as T;
  }

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`PNCP API error ${resp.status}: ${body}`);
  }

  const text = await resp.text();
  if (!text || text.trim() === "") {
    return EMPTY_PAGE as unknown as T;
  }

  return JSON.parse(text) as T;
}

/** Convert date params from ISO (YYYY-MM-DD) to PNCP format (AAAAMMDD). */
function convertDates(params: Record<string, unknown>): Record<string, unknown> {
  const result = { ...params };
  const dateKeys = ["dataInicial", "dataFinal"];
  for (const key of dateKeys) {
    if (typeof result[key] === "string" && (result[key] as string).includes("-")) {
      result[key] = toApiDate(result[key] as string);
    }
  }
  return result;
}

// ─── Contratações ────────────────────────────────────────────────────────────

export function buscarContratacoesPorPublicacao(
  params: ContratacaoPublicacaoParams
) {
  return fetchPNCP<PaginaRetorno<CompraPublicacaoDTO>>(
    "v1/contratacoes/publicacao",
    convertDates({ ...params }) as Record<string, string | number | undefined>
  );
}

export function buscarContratacoesPorProposta(
  params: ContratacaoPropostaParams
) {
  return fetchPNCP<PaginaRetorno<CompraPublicacaoDTO>>(
    "v1/contratacoes/proposta",
    convertDates({ ...params }) as Record<string, string | number | undefined>
  );
}

export function buscarContratacoesPorAtualizacao(
  params: ContratacaoAtualizacaoParams
) {
  return fetchPNCP<PaginaRetorno<CompraPublicacaoDTO>>(
    "v1/contratacoes/atualizacao",
    convertDates({ ...params }) as Record<string, string | number | undefined>
  );
}

export function consultarContratacao(
  cnpj: string,
  ano: number,
  sequencial: number
) {
  return fetchPNCP<CompraDetalheDTO>(
    `v1/orgaos/${encodeURIComponent(cnpj)}/compras/${ano}/${sequencial}`,
    {}
  );
}

// ─── Contratos ───────────────────────────────────────────────────────────────

export function buscarContratos(params: ContratosParams) {
  return fetchPNCP<PaginaRetorno<ContratoDTO>>(
    "v1/contratos",
    convertDates({ ...params }) as Record<string, string | number | undefined>
  );
}

export function buscarContratosAtualizacao(params: ContratosAtualizacaoParams) {
  return fetchPNCP<PaginaRetorno<ContratoDTO>>(
    "v1/contratos/atualizacao",
    convertDates({ ...params }) as Record<string, string | number | undefined>
  );
}

// ─── Atas ────────────────────────────────────────────────────────────────────

export function buscarAtas(params: AtasParams) {
  return fetchPNCP<PaginaRetorno<AtaRegistroPrecoDTO>>(
    "v1/atas",
    convertDates({ ...params }) as Record<string, string | number | undefined>
  );
}

export function buscarAtasAtualizacao(params: AtasAtualizacaoParams) {
  return fetchPNCP<PaginaRetorno<AtaRegistroPrecoDTO>>(
    "v1/atas/atualizacao",
    convertDates({ ...params }) as Record<string, string | number | undefined>
  );
}
