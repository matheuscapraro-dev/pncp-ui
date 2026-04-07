"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
  type Dispatch,
} from "react";
import { toast } from "sonner";
import type {
  CompraPublicacaoDTO,
  ContratoDTO,
  AtaRegistroPrecoDTO,
  FilterState,
  KpiData,
  PaginaRetorno,
  SearchMode,
} from "@/types/pncp";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
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

// ─── State ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResultItem = any;

interface State {
  filters: FilterState;
  results: ResultItem[];
  pagination: {
    totalRegistros: number;
    totalPaginas: number;
    numeroPagina: number;
    paginasRestantes: number;
  };
  kpis: KpiData;
  loading: boolean;
  error: string | null;
  sortByPriority: boolean;
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
  tamanhoPagina: DEFAULT_PAGE_SIZE,
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
  results: [],
  pagination: { totalRegistros: 0, totalPaginas: 0, numeroPagina: 0, paginasRestantes: 0 },
  kpis: { totalResultados: 0, valorTotalEstimado: 0, valorTotalHomologado: 0, totalPagina: 0, srpCount: 0 },
  loading: false,
  error: null,
  sortByPriority: false,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_FILTERS"; payload: Partial<FilterState> }
  | { type: "SET_RESULTS"; payload: { page: PaginaRetorno<ResultItem>; mode: SearchMode } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "TOGGLE_PRIORITY" }
  | { type: "RESET" };

function computeKpis(data: ResultItem[], totalRegistros: number, mode: SearchMode): KpiData {
  if (isContratacaoMode(mode)) {
    const items = data as CompraPublicacaoDTO[];
    return {
      totalResultados: totalRegistros,
      valorTotalEstimado: items.reduce((s, c) => s + (c.valorTotalEstimado ?? 0), 0),
      valorTotalHomologado: items.reduce((s, c) => s + (c.valorTotalHomologado ?? 0), 0),
      totalPagina: items.length,
      srpCount: items.filter((c) => c.srp).length,
    };
  }
  if (isContratoMode(mode)) {
    const items = data as ContratoDTO[];
    return {
      totalResultados: totalRegistros,
      valorTotalEstimado: items.reduce((s, c) => s + (c.valorInicial ?? 0), 0),
      valorTotalHomologado: items.reduce((s, c) => s + (c.valorGlobal ?? 0), 0),
      totalPagina: items.length,
      srpCount: 0,
    };
  }
  return {
    totalResultados: totalRegistros,
    valorTotalEstimado: 0,
    valorTotalHomologado: 0,
    totalPagina: data.length,
    srpCount: 0,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_FILTERS":
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case "SET_RESULTS": {
      const { page, mode } = action.payload;
      const { data, totalRegistros, totalPaginas, numeroPagina, paginasRestantes } = page;
      return {
        ...state,
        results: data,
        pagination: { totalRegistros, totalPaginas, numeroPagina, paginasRestantes },
        kpis: computeKpis(data, totalRegistros, mode),
        loading: false,
        error: null,
      };
    }
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "TOGGLE_PRIORITY":
      return { ...state, sortByPriority: !state.sortByPriority };
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

// ─── Context ─────────────────────────────────────────────────────────────────

interface LicitacoesContextValue {
  state: State;
  dispatch: Dispatch<Action>;
  executarBusca: (overrides?: Partial<FilterState>) => Promise<void>;
  filteredResults: ResultItem[];
}

const LicitacoesContext = createContext<LicitacoesContextValue | null>(null);

export function LicitacoesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const executarBusca = useCallback(
    async (overrides?: Partial<FilterState>) => {
      const filters = { ...state.filters, ...overrides };
      if (overrides) dispatch({ type: "SET_FILTERS", payload: overrides });

      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: PaginaRetorno<any>;

        const base = { pagina: filters.pagina, tamanhoPagina: filters.tamanhoPagina };
        const optUnidade = filters.codigoUnidadeAdministrativa
          ? { codigoUnidadeAdministrativa: filters.codigoUnidadeAdministrativa } : {};

        const contratacaoCommon = {
          ...base,
          ...optUnidade,
          ...(filters.uf ? { uf: filters.uf } : {}),
          ...(filters.codigoMunicipioIbge ? { codigoMunicipioIbge: filters.codigoMunicipioIbge } : {}),
          ...(filters.cnpj ? { cnpj: filters.cnpj } : {}),
          ...(filters.codigoModoDisputa != null ? { codigoModoDisputa: filters.codigoModoDisputa } : {}),
        };

        switch (filters.searchMode) {
          case "publicacao":
            result = await buscarContratacoesPorPublicacao({
              dataInicial: filters.dataInicial,
              dataFinal: filters.dataFinal,
              codigoModalidadeContratacao: filters.codigoModalidadeContratacao ?? 6,
              ...contratacaoCommon,
            });
            break;
          case "proposta":
            result = await buscarContratacoesPorProposta({
              dataFinal: filters.dataFinal,
              ...(filters.codigoModalidadeContratacao != null
                ? { codigoModalidadeContratacao: filters.codigoModalidadeContratacao }
                : {}),
              ...contratacaoCommon,
            });
            break;
          case "atualizacao":
            result = await buscarContratacoesPorAtualizacao({
              dataInicial: filters.dataInicial,
              dataFinal: filters.dataFinal,
              codigoModalidadeContratacao: filters.codigoModalidadeContratacao ?? 6,
              ...contratacaoCommon,
            });
            break;
          case "contratos":
            result = await buscarContratos({
              dataInicial: filters.dataInicial,
              dataFinal: filters.dataFinal,
              ...base,
              ...optUnidade,
              ...(filters.cnpj ? { cnpjOrgao: filters.cnpj } : {}),
            });
            break;
          case "contratos_atualizacao":
            result = await buscarContratosAtualizacao({
              dataInicial: filters.dataInicial,
              dataFinal: filters.dataFinal,
              ...base,
              ...optUnidade,
              ...(filters.cnpj ? { cnpjOrgao: filters.cnpj } : {}),
            });
            break;
          case "atas":
            result = await buscarAtas({
              dataInicial: filters.dataInicial,
              dataFinal: filters.dataFinal,
              ...base,
              ...optUnidade,
              ...(filters.cnpj ? { cnpj: filters.cnpj } : {}),
            });
            break;
          case "atas_atualizacao":
            result = await buscarAtasAtualizacao({
              dataInicial: filters.dataInicial,
              dataFinal: filters.dataFinal,
              ...base,
              ...optUnidade,
              ...(filters.cnpj ? { cnpj: filters.cnpj } : {}),
            });
            break;
        }

        dispatch({ type: "SET_RESULTS", payload: { page: result, mode: filters.searchMode } });

        if (result.empty || result.data.length === 0) {
          toast.info("Nenhum resultado encontrado para os filtros selecionados.");
        } else {
          toast.success(`${result.totalRegistros} resultados encontrados.`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        dispatch({ type: "SET_ERROR", payload: message });
        toast.error("Erro na busca", { description: message });
      }
    },
    [state.filters]
  );

  // ── Client-side filtering ──
  const filteredResults = (() => {
    const f = state.filters;
    const mode = f.searchMode;

    // ── Contratações ──
    if (isContratacaoMode(mode)) {
      let items = state.results as CompraPublicacaoDTO[];
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

      if (state.sortByPriority) items = [...items].sort((a, b) => calcularPrioridade(b) - calcularPrioridade(a));
      return items;
    }

    // ── Contratos ──
    if (isContratoMode(mode)) {
      let items = state.results as ContratoDTO[];
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

    // ── Atas ──
    {
      let items = state.results as AtaRegistroPrecoDTO[];
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
  })();

  return (
    <LicitacoesContext.Provider value={{ state, dispatch, executarBusca, filteredResults }}>
      {children}
    </LicitacoesContext.Provider>
  );
}

export function useLicitacoes() {
  const ctx = useContext(LicitacoesContext);
  if (!ctx) throw new Error("useLicitacoes must be used within LicitacoesProvider");
  return ctx;
}
