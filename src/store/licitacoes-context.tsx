"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
  type Dispatch,
} from "react";
import { toast } from "sonner";
import type {
  CompraPublicacaoDTO,
  ContratoDTO,
  AtaRegistroPrecoDTO,
  FilterState,
  PaginaRetorno,
  SearchMode,
} from "@/types/pncp";
import {
  MAX_PAGE_SIZE_CONTRATACOES,
  MAX_PAGE_SIZE_CONTRATOS,
} from "@/lib/constants";
import {
  buscarContratacoesPorPublicacao,
  buscarContratacoesPorProposta,
  buscarContratacoesPorAtualizacao,
  buscarContratos,
  buscarContratosAtualizacao,
  buscarAtas,
  buscarAtasAtualizacao,
} from "@/lib/pncp-api";
import { daysAgoISO, todayISO } from "@/lib/utils";
import { calcularPrioridade } from "@/lib/priority";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isContratacaoMode(m: SearchMode): boolean {
  return m === "publicacao" || m === "proposta" || m === "atualizacao";
}

export function isContratoMode(m: SearchMode): boolean {
  return m === "contratos" || m === "contratos_atualizacao";
}

export function isAtaMode(m: SearchMode): boolean {
  return m === "atas" || m === "atas_atualizacao";
}

function maxPageSize(mode: SearchMode): number {
  return isContratacaoMode(mode) ? MAX_PAGE_SIZE_CONTRATACOES : MAX_PAGE_SIZE_CONTRATOS;
}

const FETCH_CONCURRENCY = 5;

// ─── State ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResultItem = any;

export interface FetchProgress {
  loadedPages: number;
  totalPages: number;
  loadedItems: number;
  totalItems: number;
}

interface State {
  filters: FilterState;
  allResults: ResultItem[];
  totalApiResults: number;
  loading: boolean;
  fetchProgress: FetchProgress | null;
  error: string | null;
  sortByPriority: boolean;
  frontPage: number;
  frontPageSize: number;
}

const initialFilters: FilterState = {
  searchMode: "publicacao",
  dataInicial: daysAgoISO(30),
  dataFinal: todayISO(),
  codigoModalidadeContratacao: 6,
  codigoModoDisputa: null,
  uf: "",
  codigoMunicipioIbge: "",
  cnpj: "",
  textoBusca: "",
  pagina: 1,
  tamanhoPagina: 20,
  codigoUnidadeAdministrativa: "",
  situacaoCompraId: "",
  srp: "",
  valorMinimo: "",
  valorMaximo: "",
  palavrasIncluir: "",
  palavrasExcluir: "",
  esferaId: "",
  poderId: "",
  tipoInstrumentoConvocatorio: "",
  municipioNome: "",
  nomeOrgao: "",
  hasLinkExterno: "",
  valorHomologadoMinimo: "",
  valorHomologadoMaximo: "",
};

const initialState: State = {
  filters: initialFilters,
  allResults: [],
  totalApiResults: 0,
  loading: false,
  fetchProgress: null,
  error: null,
  sortByPriority: false,
  frontPage: 1,
  frontPageSize: 50,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_FILTERS"; payload: Partial<FilterState> }
  | { type: "FETCH_START" }
  | { type: "FETCH_PROGRESS"; payload: { items: ResultItem[]; progress: FetchProgress } }
  | { type: "FETCH_DONE" }
  | { type: "FETCH_FIRST_PAGE"; payload: { items: ResultItem[]; totalItems: number; totalPages: number } }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "TOGGLE_PRIORITY" }
  | { type: "SET_FRONT_PAGE"; payload: number }
  | { type: "SET_FRONT_PAGE_SIZE"; payload: number }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_FILTERS":
      return { ...state, filters: { ...state.filters, ...action.payload }, frontPage: 1 };
    case "FETCH_START":
      return { ...state, loading: true, error: null, allResults: [], totalApiResults: 0, fetchProgress: null, frontPage: 1 };
    case "FETCH_FIRST_PAGE": {
      const { items, totalItems, totalPages } = action.payload;
      return {
        ...state,
        allResults: items,
        totalApiResults: totalItems,
        fetchProgress: { loadedPages: 1, totalPages, loadedItems: items.length, totalItems },
      };
    }
    case "FETCH_PROGRESS": {
      const { items, progress } = action.payload;
      return {
        ...state,
        allResults: [...state.allResults, ...items],
        fetchProgress: progress,
      };
    }
    case "FETCH_DONE":
      return { ...state, loading: false, fetchProgress: null };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false, fetchProgress: null };
    case "TOGGLE_PRIORITY":
      return { ...state, sortByPriority: !state.sortByPriority };
    case "SET_FRONT_PAGE":
      return { ...state, frontPage: action.payload };
    case "SET_FRONT_PAGE_SIZE":
      return { ...state, frontPageSize: action.payload, frontPage: 1 };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ─── Keyword helpers ─────────────────────────────────────────────────────────

function parseKeywords(raw: string): string[] {
  return raw.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean)
    .map((k) => k.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
}

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─── Filtering ───────────────────────────────────────────────────────────────

function applyFilters(allResults: ResultItem[], f: FilterState, sortByPriority: boolean): ResultItem[] {
  const mode = f.searchMode;

  if (isContratacaoMode(mode)) {
    let items = allResults as CompraPublicacaoDTO[];
    const q = f.textoBusca.toLowerCase().trim();
    if (q) {
      items = items.filter((c) =>
        c.objetoCompra?.toLowerCase().includes(q) ||
        c.orgaoEntidade?.razaoSocial?.toLowerCase().includes(q) ||
        c.unidadeOrgao?.nomeUnidade?.toLowerCase().includes(q));
    }
    if (f.situacaoCompraId) items = items.filter((c) => c.situacaoCompraId === f.situacaoCompraId);
    if (f.srp === "true") items = items.filter((c) => c.srp);
    else if (f.srp === "false") items = items.filter((c) => !c.srp);
    if (f.esferaId) items = items.filter((c) => c.orgaoEntidade?.esferaId === f.esferaId);
    if (f.poderId) items = items.filter((c) => c.orgaoEntidade?.poderId === f.poderId);
    if (f.tipoInstrumentoConvocatorio) {
      const cod = Number(f.tipoInstrumentoConvocatorio);
      items = items.filter((c) => c.tipoInstrumentoConvocatorioCodigo === cod);
    }
    if (f.municipioNome) {
      const m = f.municipioNome.toLowerCase().trim();
      items = items.filter((c) => c.unidadeOrgao?.municipioNome?.toLowerCase().includes(m));
    }
    if (f.nomeOrgao) {
      const n = f.nomeOrgao.toLowerCase().trim();
      items = items.filter((c) => c.orgaoEntidade?.razaoSocial?.toLowerCase().includes(n));
    }
    if (f.hasLinkExterno === "true") items = items.filter((c) => !!c.linkSistemaOrigem);
    else if (f.hasLinkExterno === "false") items = items.filter((c) => !c.linkSistemaOrigem);

    const incKws = parseKeywords(f.palavrasIncluir);
    if (incKws.length > 0) {
      items = items.filter((c) => {
        const obj = normalizeText(c.objetoCompra ?? "");
        return incKws.some((kw) => obj.includes(kw));
      });
    }
    const excKws = parseKeywords(f.palavrasExcluir);
    if (excKws.length > 0) {
      items = items.filter((c) => {
        const obj = normalizeText(c.objetoCompra ?? "");
        return !excKws.some((kw) => obj.includes(kw));
      });
    }

    const vMin = f.valorMinimo ? parseFloat(f.valorMinimo) : null;
    const vMax = f.valorMaximo ? parseFloat(f.valorMaximo) : null;
    if (vMin != null && !isNaN(vMin)) items = items.filter((c) => (c.valorTotalEstimado ?? 0) >= vMin);
    if (vMax != null && !isNaN(vMax)) items = items.filter((c) => (c.valorTotalEstimado ?? 0) <= vMax);
    const hMin = f.valorHomologadoMinimo ? parseFloat(f.valorHomologadoMinimo) : null;
    const hMax = f.valorHomologadoMaximo ? parseFloat(f.valorHomologadoMaximo) : null;
    if (hMin != null && !isNaN(hMin)) items = items.filter((c) => (c.valorTotalHomologado ?? 0) >= hMin);
    if (hMax != null && !isNaN(hMax)) items = items.filter((c) => (c.valorTotalHomologado ?? 0) <= hMax);

    if (sortByPriority) items = [...items].sort((a, b) => calcularPrioridade(b) - calcularPrioridade(a));
    return items;
  }

  if (isContratoMode(mode)) {
    let items = allResults as ContratoDTO[];
    const q = f.textoBusca.toLowerCase().trim();
    if (q) {
      items = items.filter((c) =>
        c.objetoContrato?.toLowerCase().includes(q) ||
        c.nomeRazaoSocialFornecedor?.toLowerCase().includes(q) ||
        c.orgaoEntidade?.razaoSocial?.toLowerCase().includes(q));
    }
    if (f.nomeOrgao) {
      const n = f.nomeOrgao.toLowerCase().trim();
      items = items.filter((c) => c.orgaoEntidade?.razaoSocial?.toLowerCase().includes(n));
    }
    const vMin = f.valorMinimo ? parseFloat(f.valorMinimo) : null;
    const vMax = f.valorMaximo ? parseFloat(f.valorMaximo) : null;
    if (vMin != null && !isNaN(vMin)) items = items.filter((c) => (c.valorInicial ?? 0) >= vMin);
    if (vMax != null && !isNaN(vMax)) items = items.filter((c) => (c.valorInicial ?? 0) <= vMax);
    const incKws = parseKeywords(f.palavrasIncluir);
    if (incKws.length > 0) items = items.filter((c) => { const o = normalizeText(c.objetoContrato ?? ""); return incKws.some((kw) => o.includes(kw)); });
    const excKws = parseKeywords(f.palavrasExcluir);
    if (excKws.length > 0) items = items.filter((c) => { const o = normalizeText(c.objetoContrato ?? ""); return !excKws.some((kw) => o.includes(kw)); });
    return items;
  }

  // Atas
  {
    let items = allResults as AtaRegistroPrecoDTO[];
    const q = f.textoBusca.toLowerCase().trim();
    if (q) {
      items = items.filter((c) =>
        c.objetoContratacao?.toLowerCase().includes(q) ||
        c.nomeOrgao?.toLowerCase().includes(q) ||
        c.nomeUnidadeOrgao?.toLowerCase().includes(q));
    }
    if (f.nomeOrgao) {
      const n = f.nomeOrgao.toLowerCase().trim();
      items = items.filter((c) => c.nomeOrgao?.toLowerCase().includes(n));
    }
    const incKws = parseKeywords(f.palavrasIncluir);
    if (incKws.length > 0) items = items.filter((c) => { const o = normalizeText(c.objetoContratacao ?? ""); return incKws.some((kw) => o.includes(kw)); });
    const excKws = parseKeywords(f.palavrasExcluir);
    if (excKws.length > 0) items = items.filter((c) => { const o = normalizeText(c.objetoContratacao ?? ""); return !excKws.some((kw) => o.includes(kw)); });
    return items;
  }
}

// ─── Multi-page fetch helper ─────────────────────────────────────────────────

type FetchPageFn = (pagina: number, tamanhoPagina: number) => Promise<PaginaRetorno<ResultItem>>;

async function fetchAllPages(
  fetchPage: FetchPageFn,
  pageSize: number,
  dispatch: Dispatch<Action>,
  signal: AbortSignal,
) {
  // First page — discover totals
  const first = await fetchPage(1, pageSize);
  if (signal.aborted) return;

  const totalPages = first.totalPaginas || 1;
  const totalItems = first.totalRegistros || first.data.length;

  dispatch({
    type: "FETCH_FIRST_PAGE",
    payload: { items: first.data, totalItems, totalPages },
  });

  if (totalPages <= 1) {
    dispatch({ type: "FETCH_DONE" });
    return;
  }

  // Remaining pages in concurrent batches
  let loadedPages = 1;
  let loadedItems = first.data.length;
  const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

  for (let i = 0; i < remaining.length; i += FETCH_CONCURRENCY) {
    if (signal.aborted) return;

    const batch = remaining.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((p) => fetchPage(p, pageSize))
    );

    if (signal.aborted) return;

    const batchItems: ResultItem[] = [];
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.data) {
        batchItems.push(...r.value.data);
      }
    }

    loadedPages += batch.length;
    loadedItems += batchItems.length;

    dispatch({
      type: "FETCH_PROGRESS",
      payload: {
        items: batchItems,
        progress: { loadedPages, totalPages, loadedItems, totalItems },
      },
    });
  }

  dispatch({ type: "FETCH_DONE" });
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface LicitacoesContextValue {
  state: State;
  dispatch: Dispatch<Action>;
  executarBusca: (overrides?: Partial<FilterState>) => Promise<void>;
  cancelarBusca: () => void;
  filteredResults: ResultItem[];
  displayResults: ResultItem[];
  totalFilteredPages: number;
}

const LicitacoesContext = createContext<LicitacoesContextValue | null>(null);

export function LicitacoesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef<AbortController | null>(null);

  const cancelarBusca = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    dispatch({ type: "FETCH_DONE" });
    toast.info("Busca cancelada.");
  }, []);

  const executarBusca = useCallback(
    async (overrides?: Partial<FilterState>) => {
      // Abort any in-flight fetch
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const filters = { ...state.filters, ...overrides };
      if (overrides) dispatch({ type: "SET_FILTERS", payload: overrides });

      dispatch({ type: "FETCH_START" });

      try {
        const mode = filters.searchMode;
        const pgSize = maxPageSize(mode);

        const optUnidade = filters.codigoUnidadeAdministrativa
          ? { codigoUnidadeAdministrativa: filters.codigoUnidadeAdministrativa } : {};

        const contratacaoCommon = {
          ...optUnidade,
          ...(filters.uf ? { uf: filters.uf } : {}),
          ...(filters.codigoMunicipioIbge ? { codigoMunicipioIbge: filters.codigoMunicipioIbge } : {}),
          ...(filters.cnpj ? { cnpj: filters.cnpj } : {}),
          ...(filters.codigoModoDisputa != null ? { codigoModoDisputa: filters.codigoModoDisputa } : {}),
        };

        // Build a fetchPage function for the current mode
        let fetchPage: FetchPageFn;

        switch (mode) {
          case "publicacao":
            fetchPage = (pagina, tamanhoPagina) =>
              buscarContratacoesPorPublicacao({
                dataInicial: filters.dataInicial,
                dataFinal: filters.dataFinal,
                codigoModalidadeContratacao: filters.codigoModalidadeContratacao ?? 6,
                pagina,
                tamanhoPagina,
                ...contratacaoCommon,
              });
            break;
          case "proposta":
            fetchPage = (pagina, tamanhoPagina) =>
              buscarContratacoesPorProposta({
                dataFinal: filters.dataFinal,
                pagina,
                tamanhoPagina,
                ...(filters.codigoModalidadeContratacao != null
                  ? { codigoModalidadeContratacao: filters.codigoModalidadeContratacao }
                  : {}),
                ...contratacaoCommon,
              });
            break;
          case "atualizacao":
            fetchPage = (pagina, tamanhoPagina) =>
              buscarContratacoesPorAtualizacao({
                dataInicial: filters.dataInicial,
                dataFinal: filters.dataFinal,
                codigoModalidadeContratacao: filters.codigoModalidadeContratacao ?? 6,
                pagina,
                tamanhoPagina,
                ...contratacaoCommon,
              });
            break;
          case "contratos":
            fetchPage = (pagina, tamanhoPagina) =>
              buscarContratos({
                dataInicial: filters.dataInicial,
                dataFinal: filters.dataFinal,
                pagina,
                tamanhoPagina,
                ...optUnidade,
                ...(filters.cnpj ? { cnpjOrgao: filters.cnpj } : {}),
              });
            break;
          case "contratos_atualizacao":
            fetchPage = (pagina, tamanhoPagina) =>
              buscarContratosAtualizacao({
                dataInicial: filters.dataInicial,
                dataFinal: filters.dataFinal,
                pagina,
                tamanhoPagina,
                ...optUnidade,
                ...(filters.cnpj ? { cnpjOrgao: filters.cnpj } : {}),
              });
            break;
          case "atas":
            fetchPage = (pagina, tamanhoPagina) =>
              buscarAtas({
                dataInicial: filters.dataInicial,
                dataFinal: filters.dataFinal,
                pagina,
                tamanhoPagina,
                ...optUnidade,
                ...(filters.cnpj ? { cnpj: filters.cnpj } : {}),
              });
            break;
          case "atas_atualizacao":
            fetchPage = (pagina, tamanhoPagina) =>
              buscarAtasAtualizacao({
                dataInicial: filters.dataInicial,
                dataFinal: filters.dataFinal,
                pagina,
                tamanhoPagina,
                ...optUnidade,
                ...(filters.cnpj ? { cnpj: filters.cnpj } : {}),
              });
            break;
        }

        await fetchAllPages(fetchPage, pgSize, dispatch, ac.signal);

        if (!ac.signal.aborted) {
          toast.success("Todos os resultados carregados.");
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        dispatch({ type: "SET_ERROR", payload: message });
        toast.error("Erro na busca", { description: message });
      }
    },
    [state.filters]
  );

  // Client-side filtering over all accumulated results
  const filteredResults = useMemo(
    () => applyFilters(state.allResults, state.filters, state.sortByPriority),
    [state.allResults, state.filters, state.sortByPriority]
  );

  // Client-side pagination
  const totalFilteredPages = Math.max(1, Math.ceil(filteredResults.length / state.frontPageSize));

  const displayResults = useMemo(() => {
    const start = (state.frontPage - 1) * state.frontPageSize;
    return filteredResults.slice(start, start + state.frontPageSize);
  }, [filteredResults, state.frontPage, state.frontPageSize]);

  return (
    <LicitacoesContext.Provider
      value={{ state, dispatch, executarBusca, cancelarBusca, filteredResults, displayResults, totalFilteredPages }}
    >
      {children}
    </LicitacoesContext.Provider>
  );
}

export function useLicitacoes() {
  const ctx = useContext(LicitacoesContext);
  if (!ctx) throw new Error("useLicitacoes must be used within LicitacoesProvider");
  return ctx;
}
