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
  SearchMode,
} from "@/types/pncp";
import {
  MAX_PAGE_SIZE_CONTRATACOES,
  MAX_PAGE_SIZE_CONTRATOS,
} from "@/lib/constants";
import { daysAgoISO, todayISO } from "@/lib/utils";
import { calcularPrioridade } from "@/lib/priority";
import { compileBooleanExpr } from "@/lib/boolean-filter";

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
      const newAll = [...state.allResults, ...items];
      const totalItems = state.totalApiResults;
      return {
        ...state,
        allResults: newAll,
        fetchProgress: { ...progress, loadedItems: newAll.length, totalItems },
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

// ─── Text helpers ────────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─── Filtering ───────────────────────────────────────────────────────────────

function applyFilters(allResults: ResultItem[], f: FilterState, sortByPriority: boolean): ResultItem[] {
  const mode = f.searchMode;

  // Compile boolean expressions once (not per item)
  const incMatcher = compileBooleanExpr(f.palavrasIncluir);
  const excMatcher = compileBooleanExpr(f.palavrasExcluir);

  if (isContratacaoMode(mode)) {
    let items = allResults as CompraPublicacaoDTO[];
    const q = f.textoBusca.toLowerCase().trim();
    if (q) {
      items = items.filter((c) =>
        c.objetoCompra?.toLowerCase().includes(q) ||
        c.orgaoEntidade?.razaoSocial?.toLowerCase().includes(q) ||
        c.unidadeOrgao?.nomeUnidade?.toLowerCase().includes(q));
    }
    if (f.situacaoCompraId) items = items.filter((c) => String(c.situacaoCompraId) === f.situacaoCompraId);
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

    if (incMatcher) items = items.filter((c) => incMatcher(normalizeText(c.objetoCompra ?? "")));
    if (excMatcher) items = items.filter((c) => !excMatcher(normalizeText(c.objetoCompra ?? "")));

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
    if (incMatcher) items = items.filter((c) => incMatcher(normalizeText(c.objetoContrato ?? "")));
    if (excMatcher) items = items.filter((c) => !excMatcher(normalizeText(c.objetoContrato ?? "")));
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
    if (incMatcher) items = items.filter((c) => incMatcher(normalizeText(c.objetoContratacao ?? "")));
    if (excMatcher) items = items.filter((c) => !excMatcher(normalizeText(c.objetoContratacao ?? "")));
    return items;
  }
}

// ─── Streaming fetch helper ──────────────────────────────────────────────────

const MODE_ENDPOINTS: Record<SearchMode, string> = {
  publicacao: "v1/contratacoes/publicacao",
  proposta: "v1/contratacoes/proposta",
  atualizacao: "v1/contratacoes/atualizacao",
  contratos: "v1/contratos",
  contratos_atualizacao: "v1/contratos/atualizacao",
  atas: "v1/atas",
  atas_atualizacao: "v1/atas/atualizacao",
};

function toApiDate(iso: string): string {
  return iso.replace(/-/g, "");
}

async function fetchStream(
  filters: FilterState,
  dispatch: Dispatch<Action>,
  signal: AbortSignal,
) {
  const mode = filters.searchMode;
  const pgSize = maxPageSize(mode);
  const endpoint = MODE_ENDPOINTS[mode];

  // Build query params for the stream endpoint
  const params = new URLSearchParams();
  params.set("endpoint", endpoint);
  params.set("tamanhoPagina", String(pgSize));

  // Date params
  if (filters.dataInicial) params.set("dataInicial", toApiDate(filters.dataInicial));
  if (filters.dataFinal) params.set("dataFinal", toApiDate(filters.dataFinal));

  // Contratação-specific params
  if (isContratacaoMode(mode)) {
    if (filters.codigoModalidadeContratacao != null)
      params.set("codigoModalidadeContratacao", String(filters.codigoModalidadeContratacao));
    if (filters.codigoModoDisputa != null)
      params.set("codigoModoDisputa", String(filters.codigoModoDisputa));
    if (filters.codigoMunicipioIbge) params.set("codigoMunicipioIbge", filters.codigoMunicipioIbge);
  }

  // Shared params
  if (filters.uf) params.set("uf", filters.uf);
  if (filters.cnpj) {
    const cnpjKey = isContratoMode(mode) ? "cnpjOrgao" : "cnpj";
    params.set(cnpjKey, filters.cnpj);
  }
  if (filters.codigoUnidadeAdministrativa)
    params.set("codigoUnidadeAdministrativa", filters.codigoUnidadeAdministrativa);

  const url = `/api/pncp/stream?${params.toString()}`;
  const resp = await fetch(url, { signal });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Stream error ${resp.status}: ${text}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error("Streaming não suportado pelo navegador.");

  const decoder = new TextDecoder();
  let buffer = "";
  let metaTotalItems = 0;
  let metaTotalPages = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (signal.aborted) { reader.cancel(); return; }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const msg = JSON.parse(line);

      switch (msg.type) {
        case "meta":
          metaTotalItems = msg.totalItems;
          metaTotalPages = msg.totalPages;
          break;

        case "batch": {
          const items = msg.items as ResultItem[];
          if (!metaTotalPages) break;

          if (msg.loadedPages === 1) {
            dispatch({
              type: "FETCH_FIRST_PAGE",
              payload: { items, totalItems: metaTotalItems, totalPages: metaTotalPages },
            });
          } else {
            dispatch({
              type: "FETCH_PROGRESS",
              payload: {
                items,
                progress: {
                  loadedPages: msg.loadedPages,
                  totalPages: metaTotalPages,
                  loadedItems: 0, // computed in reducer from allResults.length
                  totalItems: 0, // computed in reducer from totalApiResults
                },
              },
            });
          }
          break;
        }

        case "done":
          dispatch({ type: "FETCH_DONE" });
          return;

        case "error":
          throw new Error(msg.message);
      }
    }
  }

  // If stream ends without "done" message
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
        await fetchStream(filters, dispatch, ac.signal);

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
