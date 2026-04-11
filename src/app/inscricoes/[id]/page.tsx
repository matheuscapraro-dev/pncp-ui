"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  DollarSign,
  ExternalLink,
  FileText,
  Filter,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { applySubscriptionFilters } from "@/lib/subscription-filters";
import {
  SITUACAO_COMPRA,
  ESFERAS,
  PODERES,
  TIPOS_INSTRUMENTO_CONVOCATORIO,
} from "@/lib/constants";
import type { Subscription, SubscriptionFilters } from "@/types/subscription";

interface SubscriptionData {
  subscription: Subscription;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawItems: any[];
  totalApiResults: number;
  filteredCount: number;
  refreshedAt: string | null;
}

/** Subset of SubscriptionFilters that can be changed interactively */
interface LocalFilters {
  palavrasIncluir: string;
  palavrasExcluir: string;
  situacaoCompraId: string;
  srp: string;
  esferaId: string;
  poderId: string;
  tipoInstrumentoConvocatorio: string;
  municipioNome: string;
  nomeOrgao: string;
  hasLinkExterno: string;
  valorMinimo: string;
  valorMaximo: string;
  valorHomologadoMinimo: string;
  valorHomologadoMaximo: string;
}

const EMPTY_FILTERS: LocalFilters = {
  palavrasIncluir: "",
  palavrasExcluir: "",
  situacaoCompraId: "",
  srp: "",
  esferaId: "",
  poderId: "",
  tipoInstrumentoConvocatorio: "",
  municipioNome: "",
  nomeOrgao: "",
  hasLinkExterno: "",
  valorMinimo: "",
  valorMaximo: "",
  valorHomologadoMinimo: "",
  valorHomologadoMaximo: "",
};

function filtersFromSubscription(f: SubscriptionFilters): LocalFilters {
  return {
    palavrasIncluir: f.palavrasIncluir ?? "",
    palavrasExcluir: f.palavrasExcluir ?? "",
    situacaoCompraId: f.situacaoCompraId ?? "",
    srp: f.srp ?? "",
    esferaId: f.esferaId ?? "",
    poderId: f.poderId ?? "",
    tipoInstrumentoConvocatorio: f.tipoInstrumentoConvocatorio ?? "",
    municipioNome: f.municipioNome ?? "",
    nomeOrgao: f.nomeOrgao ?? "",
    hasLinkExterno: f.hasLinkExterno ?? "",
    valorMinimo: f.valorMinimo ?? "",
    valorMaximo: f.valorMaximo ?? "",
    valorHomologadoMinimo: f.valorHomologadoMinimo ?? "",
    valorHomologadoMaximo: f.valorHomologadoMaximo ?? "",
  };
}

function countActiveFilters(f: LocalFilters): number {
  return Object.values(f).filter((v) => v !== "").length;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

function StatusBadge({ sub }: { sub: Subscription }) {
  switch (sub.status) {
    case "pending":
      return <Badge variant="secondary">Aguardando 1ª atualização</Badge>;
    case "ready":
      return (
        <Badge variant="default" className="bg-emerald-600">
          Atualizado {sub.lastRefreshedAt ? timeAgo(sub.lastRefreshedAt) : ""}
        </Badge>
      );
    case "error":
      return <Badge variant="destructive">Erro na última atualização</Badge>;
  }
}

// ─── Contratação row ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ContratacaoRow({ item }: { item: any }) {
  const cnpj = item.orgaoEntidade?.cnpj ?? "";
  const detailHref = `/licitacao/${cnpj}/${item.anoCompra}/${item.sequencialCompra}`;

  return (
    <TableRow>
      <TableCell className="max-w-[400px]">
        <Link href={detailHref} className="font-medium text-sm hover:underline line-clamp-2">
          {item.objetoCompra ?? "—"}
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {item.orgaoEntidade?.razaoSocial ?? "—"}
        </p>
      </TableCell>
      <TableCell className="text-xs">
        {item.unidadeOrgao?.ufSigla ?? "—"}
      </TableCell>
      <TableCell className="text-xs whitespace-nowrap">
        {item.modalidadeNome ?? "—"}
      </TableCell>
      <TableCell className="text-xs text-right whitespace-nowrap">
        {formatCurrency(item.valorTotalEstimado)}
      </TableCell>
      <TableCell className="text-xs whitespace-nowrap">
        {formatDate(item.dataPublicacaoPncp)}
      </TableCell>
      <TableCell className="text-xs">
        {item.situacaoCompraNome ?? "—"}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={detailHref}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <FileText className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Ver detalhes</TooltipContent>
          </Tooltip>
          {item.linkSistemaOrigem && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={item.linkSistemaOrigem} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent>Sistema de origem</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ContratoRow({ item }: { item: any }) {
  return (
    <TableRow>
      <TableCell className="max-w-[400px]">
        <p className="font-medium text-sm line-clamp-2">{item.objetoContrato ?? "—"}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {item.orgaoEntidade?.razaoSocial ?? "—"}
        </p>
      </TableCell>
      <TableCell className="text-xs truncate max-w-[150px]">
        {item.nomeRazaoSocialFornecedor ?? "—"}
      </TableCell>
      <TableCell className="text-xs text-right whitespace-nowrap">
        {formatCurrency(item.valorInicial)}
      </TableCell>
      <TableCell className="text-xs whitespace-nowrap">
        {formatDate(item.dataPublicacaoPncp)}
      </TableCell>
      <TableCell className="text-xs whitespace-nowrap">
        {formatDate(item.dataVigenciaFim)}
      </TableCell>
    </TableRow>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AtaRow({ item }: { item: any }) {
  return (
    <TableRow>
      <TableCell className="max-w-[400px]">
        <p className="font-medium text-sm line-clamp-2">{item.objetoContratacao ?? "—"}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {item.nomeOrgao ?? "—"}
        </p>
      </TableCell>
      <TableCell className="text-xs whitespace-nowrap">
        {item.numeroAtaRegistroPreco ?? "—"}
      </TableCell>
      <TableCell className="text-xs whitespace-nowrap">
        {formatDate(item.dataPublicacaoPncp)}
      </TableCell>
      <TableCell className="text-xs whitespace-nowrap">
        {formatDate(item.vigenciaFim)}
      </TableCell>
      <TableCell className="text-xs">
        {item.cancelado ? (
          <Badge variant="destructive" className="text-[10px]">Cancelada</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">Ativa</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

// ─── Filter panel ────────────────────────────────────────────────────────────

function FilterPanel({
  filters,
  onChange,
  onReset,
  isContratacao,
  expanded,
  onToggle,
}: {
  filters: LocalFilters;
  onChange: (f: LocalFilters) => void;
  onReset: () => void;
  isContratacao: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const set = (key: keyof LocalFilters, value: string) =>
    onChange({ ...filters, [key]: value });

  const activeCount = countActiveFilters(filters);

  return (
    <Card>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros interativos</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {activeCount} ativo{activeCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <CardContent className="border-t p-3 pt-3 space-y-4">
          {/* Keywords */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Palavras-chave (incluir)</Label>
              <Input
                placeholder='engenharia OR "serviço de limpeza"'
                value={filters.palavrasIncluir}
                onChange={(e) => set("palavrasIncluir", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Palavras-chave (excluir)</Label>
              <Input
                placeholder="material, alimento"
                value={filters.palavrasExcluir}
                onChange={(e) => set("palavrasExcluir", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Órgão / Município */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Nome do órgão</Label>
              <Input
                placeholder="Filtrar por razão social"
                value={filters.nomeOrgao}
                onChange={(e) => set("nomeOrgao", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            {isContratacao && (
              <div className="space-y-1">
                <Label className="text-xs">Município</Label>
                <Input
                  placeholder="Filtrar por município"
                  value={filters.municipioNome}
                  onChange={(e) => set("municipioNome", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>

          {/* Valor */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Valor mín.</Label>
              <Input
                type="number"
                placeholder="0"
                value={filters.valorMinimo}
                onChange={(e) => set("valorMinimo", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor máx.</Label>
              <Input
                type="number"
                placeholder="∞"
                value={filters.valorMaximo}
                onChange={(e) => set("valorMaximo", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            {isContratacao && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Homologado mín.</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.valorHomologadoMinimo}
                    onChange={(e) => set("valorHomologadoMinimo", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Homologado máx.</Label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={filters.valorHomologadoMaximo}
                    onChange={(e) => set("valorHomologadoMaximo", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </>
            )}
          </div>

          {/* Selects (contratação only) */}
          {isContratacao && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Situação</Label>
                <Select value={filters.situacaoCompraId} onValueChange={(v) => set("situacaoCompraId", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas</SelectItem>
                    {Object.entries(SITUACAO_COMPRA).map(([id, nome]) => (
                      <SelectItem key={id} value={id}>{nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">SRP</Label>
                <Select value={filters.srp} onValueChange={(v) => set("srp", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Esfera</Label>
                <Select value={filters.esferaId} onValueChange={(v) => set("esferaId", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas</SelectItem>
                    {ESFERAS.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Poder</Label>
                <Select value={filters.poderId} onValueChange={(v) => set("poderId", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {PODERES.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Instrumento</Label>
                <Select value={filters.tipoInstrumentoConvocatorio} onValueChange={(v) => set("tipoInstrumentoConvocatorio", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {TIPOS_INSTRUMENTO_CONVOCATORIO.map((t) => (
                      <SelectItem key={t.codigo} value={String(t.codigo)}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Link externo</Label>
                <Select value={filters.hasLinkExterno} onValueChange={(v) => set("hasLinkExterno", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    <SelectItem value="true">Com link</SelectItem>
                    <SelectItem value="false">Sem link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Reset */}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5 text-xs">
              <RotateCcw className="h-3 w-3" />
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Page sizes ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export default function SubscriptionResultsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [localFilters, setLocalFilters] = useState<LocalFilters>(EMPTY_FILTERS);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch(`/api/subscriptions/${params.id}?raw=1`);
        if (resp.status === 404) {
          setError("Inscrição não encontrada.");
          return;
        }
        if (!resp.ok) {
          const body = await resp.json();
          setError(body.error || "Erro ao carregar inscrição");
          return;
        }
        const json = await resp.json();
        setData(json);
        setLocalFilters(filtersFromSubscription(json.subscription.filters));
      } catch {
        setError("Erro de conexão.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir esta inscrição?")) return;
    setDeleting(true);
    try {
      const resp = await fetch(`/api/subscriptions/${params.id}`, { method: "DELETE" });
      if (resp.ok) {
        toast.success("Inscrição excluída.");
        router.push("/");
      } else {
        toast.error("Erro ao excluir.");
      }
    } finally {
      setDeleting(false);
    }
  }

  const sub = data?.subscription;
  const mode = sub?.filters.searchMode ?? "publicacao";
  const isContratacao = mode === "publicacao" || mode === "proposta" || mode === "atualizacao";
  const isContrato = mode === "contratos" || mode === "contratos_atualizacao";

  const hasRawData = (data?.rawItems?.length ?? 0) > 0;
  const sourceItems = hasRawData ? data!.rawItems : data?.results ?? [];

  const filteredResults = useMemo(() => {
    if (!data || sourceItems.length === 0) return [];
    return applySubscriptionFilters(sourceItems, { searchMode: mode, ...localFilters });
  }, [data, sourceItems, mode, localFilters]);

  const handleFilterChange = useCallback((f: LocalFilters) => {
    setLocalFilters(f);
    setPage(1);
  }, []);

  const handleFilterReset = useCallback(() => {
    setLocalFilters(EMPTY_FILTERS);
    setPage(1);
  }, []);

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 px-3 py-4 pt-16 sm:px-4 sm:py-6 md:pt-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1400px] px-3 py-4 pt-16 sm:px-4 sm:py-6 md:pt-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">{error || "Inscrição não encontrada."}</p>
      </div>
    );
  }

  const { totalApiResults, refreshedAt } = data;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const displayItems = filteredResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPI values
  let valorTotal = 0;
  if (isContratacao) {
    valorTotal = filteredResults.reduce((s: number, c: { valorTotalEstimado?: number }) => s + (c.valorTotalEstimado ?? 0), 0);
  } else if (isContrato) {
    valorTotal = filteredResults.reduce((s: number, c: { valorInicial?: number }) => s + (c.valorInicial ?? 0), 0);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-3 py-4 pt-16 sm:space-y-6 sm:px-4 sm:py-6 md:pt-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="mb-1 -ml-2">
            <Link href="/">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Consulta
            </Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{sub!.nome}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge sub={sub!} />
            {refreshedAt && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDateTime(refreshedAt)}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="gap-1.5"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Excluir
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">Total na API</CardTitle>
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-1">
              <Database className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg font-bold">{formatNumber(totalApiResults)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">Após Filtros</CardTitle>
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-1">
              <Filter className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg font-bold">{formatNumber(filteredResults.length)}</div>
            {hasRawData && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                de {formatNumber(sourceItems.length)} brutos
              </p>
            )}
          </CardContent>
        </Card>

        {(isContratacao || isContrato) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
              <CardTitle className="text-[11px] font-medium text-muted-foreground">Valor Total</CardTitle>
              <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-lg font-bold">{formatCurrency(valorTotal)}</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">Janela</CardTitle>
            <div className="rounded-md bg-violet-50 dark:bg-violet-950/30 p-1">
              <Clock className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg font-bold">{sub!.filters.diasRetroativos}d</div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">dias retroativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending state */}
      {sub!.status === "pending" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
            <p className="font-medium">Aguardando primeira atualização</p>
            <p className="text-sm text-muted-foreground mt-1">
              O worker roda diariamente às 06:00 (BRT). Os resultados aparecerão aqui automaticamente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {sub!.status === "error" && sub!.lastError && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-destructive">Erro na última atualização:</p>
            <p className="text-sm text-muted-foreground mt-1">{sub!.lastError}</p>
          </CardContent>
        </Card>
      )}

      {/* Interactive filters */}
      {sourceItems.length > 0 && (
        <FilterPanel
          filters={localFilters}
          onChange={handleFilterChange}
          onReset={handleFilterReset}
          isContratacao={isContratacao}
          expanded={filtersExpanded}
          onToggle={() => setFiltersExpanded((e) => !e)}
        />
      )}

      {/* Results table */}
      {filteredResults.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isContratacao && (
                      <>
                        <TableHead className="min-w-[300px]">Objeto</TableHead>
                        <TableHead className="w-[50px]">UF</TableHead>
                        <TableHead className="w-[140px]">Modalidade</TableHead>
                        <TableHead className="text-right w-[130px]">Valor Estimado</TableHead>
                        <TableHead className="w-[100px]">Publicação</TableHead>
                        <TableHead className="w-[100px]">Situação</TableHead>
                        <TableHead className="w-[80px]" />
                      </>
                    )}
                    {isContrato && (
                      <>
                        <TableHead className="min-w-[300px]">Objeto</TableHead>
                        <TableHead className="w-[150px]">Fornecedor</TableHead>
                        <TableHead className="text-right w-[130px]">Valor Inicial</TableHead>
                        <TableHead className="w-[100px]">Publicação</TableHead>
                        <TableHead className="w-[100px]">Vigência Fim</TableHead>
                      </>
                    )}
                    {!isContratacao && !isContrato && (
                      <>
                        <TableHead className="min-w-[300px]">Objeto</TableHead>
                        <TableHead className="w-[120px]">Nº Ata</TableHead>
                        <TableHead className="w-[100px]">Publicação</TableHead>
                        <TableHead className="w-[100px]">Vigência Fim</TableHead>
                        <TableHead className="w-[80px]">Status</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayItems.map((item, i) => {
                    const key = item.numeroControlePNCP || item.numeroControlePNCPAta || `row-${i}`;
                    if (isContratacao) return <ContratacaoRow key={key} item={item} />;
                    if (isContrato) return <ContratoRow key={key} item={item} />;
                    return <AtaRow key={key} item={item} />;
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Página {page} de {totalPages} · {formatNumber(filteredResults.length)} resultados
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state (after sync but no results matching filters) */}
      {sub!.status === "ready" && filteredResults.length === 0 && sourceItems.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Filter className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="font-medium">Nenhum resultado com estes filtros</p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatNumber(sourceItems.length)} itens brutos disponíveis. Ajuste os filtros para ver resultados.
            </p>
            <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={handleFilterReset}>
              <RotateCcw className="h-3 w-3" />
              Limpar filtros
            </Button>
          </CardContent>
        </Card>
      )}

      {sub!.status === "ready" && sourceItems.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="font-medium">Nenhum resultado encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              A última sincronização não encontrou itens que correspondam aos parâmetros da API.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
