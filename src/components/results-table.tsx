"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLicitacoes } from "@/store/licitacoes-context";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, formatDate, formatDateTime, formatCnpj } from "@/lib/utils";
import { calcularPrioridade } from "@/lib/priority";
import {
  ArrowUpDown,
  ExternalLink,
  AlertCircle,
  SearchX,
  Bookmark,
  CircleCheck,
  CircleX,
  CirclePause,
  Ban,
  Eye,
} from "lucide-react";
import type { CompraPublicacaoDTO, SituacaoCompraId } from "@/types/pncp";

// ─── Situação badge with distinct colors per status ──────────────────────────

const SITUACAO_CONFIG: Record<
  string,
  { label: string; icon: typeof CircleCheck; className: string }
> = {
  "1": {
    label: "Divulgada",
    icon: CircleCheck,
    className:
      "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  "2": {
    label: "Revogada",
    icon: CircleX,
    className:
      "border-red-500/40 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-400",
  },
  "3": {
    label: "Anulada",
    icon: Ban,
    className:
      "border-orange-500/40 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-400",
  },
  "4": {
    label: "Suspensa",
    icon: CirclePause,
    className:
      "border-amber-500/40 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400",
  },
};

function SituacaoBadge({ id }: { id: SituacaoCompraId | string }) {
  const config = SITUACAO_CONFIG[id] ?? {
    label: id,
    icon: CircleCheck,
    className: "border-gray-500/40 bg-gray-50 text-gray-700 dark:border-gray-500/30 dark:bg-gray-950/40 dark:text-gray-400",
  };
  const Icon = config.icon;
  return (
    <Badge
      variant="outline"
      className={`gap-1 font-medium ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function SrpBadge({ srp }: { srp: boolean }) {
  if (!srp) return null;
  return (
    <Badge
      variant="outline"
      className="gap-1 border-blue-500/40 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-400"
    >
      <Bookmark className="h-2.5 w-2.5" />
      SRP
    </Badge>
  );
}

function RowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 9 }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
}

function buildDetailHref(c: CompraPublicacaoDTO) {
  const cnpj = c.orgaoEntidade?.cnpj?.replace(/\D/g, "");
  return `/licitacao/${cnpj}/${c.anoCompra}/${c.sequencialCompra}`;
}

export function ResultsTable() {
  const router = useRouter();
  const { state, dispatch, filteredResults } = useLicitacoes();
  const { loading, error, sortByPriority } = state;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div>
          <p className="font-medium text-destructive">Erro ao buscar licitações</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch({ type: "SET_ERROR", payload: null })}
        >
          Fechar
        </Button>
      </div>
    );
  }

  const colCount = sortByPriority ? 10 : 9;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredResults.length > 0
            ? `Mostrando ${filteredResults.length} resultado${filteredResults.length !== 1 ? "s" : ""} nesta página`
            : ""}
        </p>
        <Button
          variant={sortByPriority ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => dispatch({ type: "TOGGLE_PRIORITY" })}
        >
          <ArrowUpDown className="h-3 w-3" />
          {sortByPriority ? "Prioridade ativa" : "Ordenar por prioridade"}
        </Button>
      </div>

      <div className="rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="min-w-[260px]">Objeto</TableHead>
              <TableHead className="min-w-[150px]">Órgão</TableHead>
              <TableHead>UF</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead className="text-right">Valor Estimado</TableHead>
              <TableHead className="text-right">Homologado</TableHead>
              <TableHead>Publicação</TableHead>
              <TableHead>Situação</TableHead>
              {sortByPriority && (
                <TableHead className="text-right">Score</TableHead>
              )}
              <TableHead className="w-20 text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
            ) : filteredResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <SearchX className="h-10 w-10" />
                    <p className="text-base font-medium">
                      Nenhum resultado encontrado
                    </p>
                    <p className="text-sm">
                      Tente ajustar os filtros ou o período da busca.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredResults.map((c, idx) => {
                const rowId = c.numeroControlePNCP ?? String(idx);
                const href = buildDetailHref(c);
                const externalUrl = c.linkSistemaOrigem || null;

                return (
                  <TableRow
                    key={rowId}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => router.push(href)}
                  >
                    <TableCell className="max-w-[300px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="line-clamp-2 text-sm font-medium">
                            {c.objetoCompra}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-md">
                          <p className="text-xs">{c.objetoCompra}</p>
                        </TooltipContent>
                      </Tooltip>
                      <div className="mt-1 flex gap-1.5">
                        <SrpBadge srp={c.srp} />
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="line-clamp-1 text-sm">
                            {c.orgaoEntidade?.razaoSocial}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs">
                            {c.orgaoEntidade?.razaoSocial}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            CNPJ: {formatCnpj(c.orgaoEntidade?.cnpj ?? "")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {c.unidadeOrgao?.ufSigla}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.modalidadeNome}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(c.valorTotalEstimado)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(c.valorTotalHomologado)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(c.dataPublicacaoPncp)}
                    </TableCell>
                    <TableCell>
                      <SituacaoBadge id={c.situacaoCompraId} />
                    </TableCell>
                    {sortByPriority && (
                      <TableCell className="text-right font-mono text-xs">
                        {calcularPrioridade(c)}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {/* View detail (internal) */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(href);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalhes</TooltipContent>
                        </Tooltip>

                        {/* External system link */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${externalUrl ? "text-primary hover:text-primary" : "text-muted-foreground/30 cursor-not-allowed"}`}
                              disabled={!externalUrl}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (externalUrl) {
                                  window.open(externalUrl, "_blank", "noopener,noreferrer");
                                }
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {externalUrl
                              ? "Abrir no sistema de origem"
                              : "Link externo indisponível"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
