"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Clock,
  Database,
  DollarSign,
  ExternalLink,
  FileText,
  Filter,
  Loader2,
  Trash2,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatCnpj } from "@/lib/utils";
import { toast } from "sonner";
import type { Subscription } from "@/types/subscription";

interface SubscriptionData {
  subscription: Subscription;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any[];
  totalApiResults: number;
  filteredCount: number;
  refreshedAt: string | null;
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

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch(`/api/subscriptions/${params.id}`);
        if (resp.status === 404) {
          setError("Inscrição não encontrada.");
          return;
        }
        if (!resp.ok) {
          const body = await resp.json();
          setError(body.error || "Erro ao carregar inscrição");
          return;
        }
        setData(await resp.json());
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

  const { subscription: sub, results, totalApiResults, filteredCount, refreshedAt } = data;
  const mode = sub.filters.searchMode;
  const isContratacao = mode === "publicacao" || mode === "proposta" || mode === "atualizacao";
  const isContrato = mode === "contratos" || mode === "contratos_atualizacao";

  // Pagination
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const displayItems = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPI values
  let valorTotal = 0;
  if (isContratacao) {
    valorTotal = results.reduce((s: number, c: { valorTotalEstimado?: number }) => s + (c.valorTotalEstimado ?? 0), 0);
  } else if (isContrato) {
    valorTotal = results.reduce((s: number, c: { valorInicial?: number }) => s + (c.valorInicial ?? 0), 0);
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
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{sub.nome}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge sub={sub} />
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
            <div className="text-lg font-bold">{formatNumber(results.length)}</div>
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
            <div className="text-lg font-bold">{sub.filters.diasRetroativos}d</div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">dias retroativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending state */}
      {sub.status === "pending" && (
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
      {sub.status === "error" && sub.lastError && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-destructive">Erro na última atualização:</p>
            <p className="text-sm text-muted-foreground mt-1">{sub.lastError}</p>
          </CardContent>
        </Card>
      )}

      {/* Results table */}
      {results.length > 0 && (
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
                  Página {page} de {totalPages} · {formatNumber(results.length)} resultados
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

      {/* Empty state (after sync but no results) */}
      {sub.status === "ready" && results.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="font-medium">Nenhum resultado encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              A última sincronização não encontrou itens que correspondam aos filtros.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
