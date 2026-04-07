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
} from "@/lib/pncp-api";
import { daysAgoISO, todayISO } from "@/lib/utils";
import { calcularPrioridade } from "@/lib/priority";

// ─── State ───────────────────────────────────────────────────────────────────

interface State {
  filters: FilterState;
  results: CompraPublicacaoDTO[];
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
  codigoModalidadeContratacao: 6, // Pregão Eletrônico
  codigoModoDisputa: null,
  uf: "",
  codigoMunicipioIbge: "",
  cnpj: "",
  textoBusca: "",
  pagina: 1,
  tamanhoPagina: DEFAULT_PAGE_SIZE,
  situacaoCompraId: "",
  srp: "",
  valorMinimo: "",
  valorMaximo: "",
};

const initialState: State = {
  filters: initialFilters,
  results: [],
  pagination: {
    totalRegistros: 0,
    totalPaginas: 0,
    numeroPagina: 0,
    paginasRestantes: 0,
  },
  kpis: { totalResultados: 0, valorTotalEstimado: 0, valorTotalHomologado: 0, totalPagina: 0, srpCount: 0 },
  loading: false,
  error: null,
  sortByPriority: false,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_FILTERS"; payload: Partial<FilterState> }
  | { type: "SET_RESULTS"; payload: PaginaRetorno<CompraPublicacaoDTO> }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "TOGGLE_PRIORITY" }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_FILTERS":
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };
    case "SET_RESULTS": {
      const { data, totalRegistros, totalPaginas, numeroPagina, paginasRestantes } =
        action.payload;
      const valorTotalEstimado = data.reduce(
        (sum, c) => sum + (c.valorTotalEstimado ?? 0),
        0
      );
      const valorTotalHomologado = data.reduce(
        (sum, c) => sum + (c.valorTotalHomologado ?? 0),
        0
      );
      const srpCount = data.filter((c) => c.srp).length;
      return {
        ...state,
        results: data,
        pagination: { totalRegistros, totalPaginas, numeroPagina, paginasRestantes },
        kpis: {
          totalResultados: totalRegistros,
          valorTotalEstimado,
          valorTotalHomologado,
          totalPagina: data.length,
          srpCount,
        },
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

// ─── Context ─────────────────────────────────────────────────────────────────

interface LicitacoesContextValue {
  state: State;
  dispatch: Dispatch<Action>;
  executarBusca: (overrides?: Partial<FilterState>) => Promise<void>;
  filteredResults: CompraPublicacaoDTO[];
}

const LicitacoesContext = createContext<LicitacoesContextValue | null>(null);

export function LicitacoesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const executarBusca = useCallback(
    async (overrides?: Partial<FilterState>) => {
      const filters = { ...state.filters, ...overrides };

      // Apply overrides to state
      if (overrides) {
        dispatch({ type: "SET_FILTERS", payload: overrides });
      }

      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        let result: PaginaRetorno<CompraPublicacaoDTO>;

        const commonParams = {
          pagina: filters.pagina,
          tamanhoPagina: filters.tamanhoPagina,
          ...(filters.uf ? { uf: filters.uf } : {}),
          ...(filters.codigoMunicipioIbge
            ? { codigoMunicipioIbge: filters.codigoMunicipioIbge }
            : {}),
          ...(filters.cnpj ? { cnpj: filters.cnpj } : {}),
          ...(filters.codigoModoDisputa != null
            ? { codigoModoDisputa: filters.codigoModoDisputa }
            : {}),
        };

        switch (filters.searchMode) {
          case "publicacao":
            result = await buscarContratacoesPorPublicacao({
              dataInicial: filters.dataInicial,
              dataFinal: filters.dataFinal,
              codigoModalidadeContratacao:
                filters.codigoModalidadeContratacao ?? 6,
              ...commonParams,
            });
            break;
          case "proposta":
            result = await buscarContratacoesPorProposta({
              dataFinal: filters.dataFinal,
              ...(filters.codigoModalidadeContratacao != null
                ? {
                    codigoModalidadeContratacao:
                      filters.codigoModalidadeContratacao,
                  }
                : {}),
              ...commonParams,
            });
            break;
          case "atualizacao":
            result = await buscarContratacoesPorAtualizacao({
              dataInicial: filters.dataInicial,
              dataFinal: filters.dataFinal,
              codigoModalidadeContratacao:
                filters.codigoModalidadeContratacao ?? 6,
              ...commonParams,
            });
            break;
        }

        dispatch({ type: "SET_RESULTS", payload: result });

        // Toast feedback
        if (result.empty || result.data.length === 0) {
          toast.info("Nenhum resultado encontrado para os filtros selecionados.");
        } else {
          toast.success(`${result.totalRegistros} resultados encontrados.`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        dispatch({
          type: "SET_ERROR",
          payload: message,
        });
        toast.error("Erro na busca", { description: message });
      }
    },
    [state.filters]
  );

  // Client-side text filter + priority sort + extended filters
  const filteredResults = (() => {
    let items = state.results;
    const q = state.filters.textoBusca.toLowerCase().trim();
    if (q) {
      items = items.filter(
        (c) =>
          c.objetoCompra?.toLowerCase().includes(q) ||
          c.orgaoEntidade?.razaoSocial?.toLowerCase().includes(q) ||
          c.unidadeOrgao?.nomeUnidade?.toLowerCase().includes(q)
      );
    }
    // Situação filter
    if (state.filters.situacaoCompraId) {
      items = items.filter(
        (c) => c.situacaoCompraId === state.filters.situacaoCompraId
      );
    }
    // SRP filter
    if (state.filters.srp === "true") {
      items = items.filter((c) => c.srp);
    } else if (state.filters.srp === "false") {
      items = items.filter((c) => !c.srp);
    }
    // Value range filter
    const vMin = state.filters.valorMinimo ? parseFloat(state.filters.valorMinimo) : null;
    const vMax = state.filters.valorMaximo ? parseFloat(state.filters.valorMaximo) : null;
    if (vMin != null && !isNaN(vMin)) {
      items = items.filter((c) => (c.valorTotalEstimado ?? 0) >= vMin);
    }
    if (vMax != null && !isNaN(vMax)) {
      items = items.filter((c) => (c.valorTotalEstimado ?? 0) <= vMax);
    }
    if (state.sortByPriority) {
      items = [...items].sort(
        (a, b) => calcularPrioridade(b) - calcularPrioridade(a)
      );
    }
    return items;
  })();

  return (
    <LicitacoesContext.Provider
      value={{ state, dispatch, executarBusca, filteredResults }}
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
