"use client";

import { useRouter } from "next/navigation";
import { useLicitacoes, isContratacaoMode, isContratoMode, isAtaMode } from "@/store/licitacoes-context";
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
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, formatCnpj } from "@/lib/utils";
import { calcularPrioridade } from "@/lib/priority";
import {
  ArrowUpDown,
  ExternalLink,
  AlertCircle,
  SearchX,
  Eye,
  Filter,
} from "lucide-react";
import { SituacaoBadge, SrpBadge, CanceladoBadge } from "@/components/shared-badges";
import type { CompraPublicacaoDTO, ContratoDTO, AtaRegistroPrecoDTO } from "@/types/pncp";

function RowSkeleton({ cols }: { cols: number }) {
  return (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  );
}

function buildDetailHref(c: CompraPublicacaoDTO) {
  const cnpj = c.orgaoEntidade?.cnpj?.replace(/\D/g, "");
  return `/licitacao/${cnpj}/${c.anoCompra}/${c.sequencialCompra}`;
}

// ─── Mobile card (shared) ────────────────────────────────────────────────────

function MobileContratacaoCard({ c, onClick }: { c: CompraPublicacaoDTO; onClick: () => void }) {
  const externalUrl = c.linkSistemaOrigem || null;
  return (
    <Card className="cursor-pointer transition-colors hover:bg-muted/30" onClick={onClick}>
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium leading-snug line-clamp-2">{c.objetoCompra}</p>
        <div className="flex flex-wrap gap-1.5">
          <SituacaoBadge id={c.situacaoCompraId} />
          <SrpBadge srp={c.srp} />
          {c.unidadeOrgao?.ufSigla && (
            <Badge variant="outline" className="font-mono text-xs">{c.unidadeOrgao.ufSigla}</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">{c.orgaoEntidade?.razaoSocial}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{formatDate(c.dataPublicacaoPncp)}</span>
          <span className="font-mono font-semibold">{formatCurrency(c.valorTotalEstimado)}</span>
        </div>
        {externalUrl && (
          <Button variant="outline" size="sm" className="h-6 gap-1 text-xs w-full" onClick={(e) => {
            e.stopPropagation(); window.open(externalUrl, "_blank", "noopener,noreferrer");
          }}>
            <ExternalLink className="h-3 w-3" /> Sistema de origem
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function MobileContratoCard({ c }: { c: ContratoDTO }) {
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium leading-snug line-clamp-2">{c.objetoContrato}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{c.orgaoEntidade?.razaoSocial}</p>
        <p className="text-xs text-muted-foreground">Fornecedor: {c.nomeRazaoSocialFornecedor}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{formatDate(c.dataPublicacaoPncp)}</span>
          <span className="font-mono font-semibold">{formatCurrency(c.valorGlobal)}</span>
        </div>
        <div className="flex gap-2 text-[10px] text-muted-foreground">
          <span>Vigência: {formatDate(c.dataVigenciaInicio)} – {formatDate(c.dataVigenciaFim)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function MobileAtaCard({ c }: { c: AtaRegistroPrecoDTO }) {
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium leading-snug line-clamp-2">{c.objetoContratacao}</p>
        <CanceladoBadge cancelado={c.cancelado} />
        <p className="text-xs text-muted-foreground line-clamp-1">{c.nomeOrgao}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{formatDate(c.dataPublicacaoPncp)}</span>
          <span className="text-muted-foreground">Vigência: {formatDate(c.vigenciaInicio)} – {formatDate(c.vigenciaFim)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ResultsTable({ onSelectItem }: { onSelectItem?: (item: CompraPublicacaoDTO) => void }) {
  const router = useRouter();
  const { state, dispatch, filteredResults, displayResults } = useLicitacoes();
  const { loading, error, sortByPriority, allResults } = state;
  const mode = state.filters.searchMode;
  const isContratacao = isContratacaoMode(mode);
  const isContrato = isContratoMode(mode);
  const isAta = isAtaMode(mode);

  const hasClientFilters = filteredResults.length !== allResults.length;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div>
          <p className="font-medium text-destructive">Erro ao buscar</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => dispatch({ type: "SET_ERROR", payload: null })}>
          Fechar
        </Button>
      </div>
    );
  }

  // ── Status bar ──
  const statusBar = (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        {loading ? "Buscando..." : filteredResults.length > 0 ? (
          <>
            Mostrando <strong>{filteredResults.length}</strong> resultado{filteredResults.length !== 1 ? "s" : ""}
            {hasClientFilters && (
              <span className="ml-1 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Filter className="inline h-3 w-3" />
                de {allResults.length} carregados (filtros ativos)
              </span>
            )}
          </>
        ) : allResults.length > 0 ? (
          <span className="text-amber-600 dark:text-amber-400">
            <Filter className="mr-1 inline h-3 w-3" />
            Nenhum resultado após filtros ({allResults.length} carregados)
          </span>
        ) : ""}
      </p>
      {isContratacao && (
        <Button
          variant={sortByPriority ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => dispatch({ type: "TOGGLE_PRIORITY" })}
        >
          <ArrowUpDown className="h-3 w-3" />
          <span className="hidden sm:inline">{sortByPriority ? "Prioridade ativa" : "Ordenar por prioridade"}</span>
          <span className="sm:hidden">{sortByPriority ? "Prio ✓" : "Prioridade"}</span>
        </Button>
      )}
    </div>
  );

  // empty state
  const emptyState = !loading && filteredResults.length === 0 && (
    <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
      <SearchX className="h-10 w-10" />
      <p className="text-base font-medium">Nenhum resultado encontrado</p>
      <p className="text-sm">Tente ajustar os filtros ou o período da busca.</p>
    </div>
  );

  // ── CONTRATAÇÕES TABLE ──
  if (isContratacao) {
    const items = displayResults as CompraPublicacaoDTO[];
    const colCount = sortByPriority ? 10 : 9;

    return (
      <div>
        {statusBar}
        {emptyState}

        {/* Mobile cards */}
        {!loading && items.length > 0 && (
          <div className="flex flex-col gap-2 lg:hidden">
            {items.map((c, idx) => (
              <MobileContratacaoCard
                key={c.numeroControlePNCP ?? idx}
                c={c}
                onClick={() => onSelectItem ? onSelectItem(c) : router.push(buildDetailHref(c))}
              />
            ))}
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden lg:block rounded-lg border shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="min-w-[240px]">Objeto</TableHead>
                <TableHead className="min-w-[140px]">Órgão</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead className="text-right">Estimado</TableHead>
                <TableHead className="text-right">Homologado</TableHead>
                <TableHead>Publicação</TableHead>
                <TableHead>Situação</TableHead>
                {sortByPriority && <TableHead className="text-right">Score</TableHead>}
                <TableHead className="w-20 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} cols={colCount} />)
                : items.map((c, idx) => {
                    const rowId = c.numeroControlePNCP ?? String(idx);
                    const href = buildDetailHref(c);
                    const externalUrl = c.linkSistemaOrigem || null;
                    return (
                      <TableRow key={rowId} className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => onSelectItem ? onSelectItem(c) : router.push(href)}>
                        <TableCell className="max-w-[300px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="line-clamp-2 text-sm font-medium">{c.objetoCompra}</span>
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
                              <span className="line-clamp-1 text-sm">{c.orgaoEntidade?.razaoSocial}</span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p className="text-xs">{c.orgaoEntidade?.razaoSocial}</p>
                              <p className="text-xs text-muted-foreground">CNPJ: {formatCnpj(c.orgaoEntidade?.cnpj ?? "")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{c.unidadeOrgao?.ufSigla}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{c.modalidadeNome}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(c.valorTotalEstimado)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(c.valorTotalHomologado)}</TableCell>
                        <TableCell className="text-sm">{formatDate(c.dataPublicacaoPncp)}</TableCell>
                        <TableCell><SituacaoBadge id={c.situacaoCompraId} /></TableCell>
                        {sortByPriority && (
                          <TableCell className="text-right font-mono text-xs">{calcularPrioridade(c)}</TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={(e) => { e.stopPropagation(); onSelectItem ? onSelectItem(c) : router.push(href); }}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver detalhes</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon"
                                  className={`h-7 w-7 ${externalUrl ? "text-primary hover:text-primary" : "text-muted-foreground/30 cursor-not-allowed"}`}
                                  disabled={!externalUrl}
                                  onClick={(e) => { e.stopPropagation(); if (externalUrl) window.open(externalUrl, "_blank", "noopener,noreferrer"); }}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{externalUrl ? "Abrir no sistema de origem" : "Link externo indisponível"}</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // ── CONTRATOS TABLE ──
  if (isContrato) {
    const items = displayResults as ContratoDTO[];
    return (
      <div>
        {statusBar}
        {emptyState}

        {/* Mobile cards */}
        {!loading && items.length > 0 && (
          <div className="flex flex-col gap-2 lg:hidden">
            {items.map((c, idx) => <MobileContratoCard key={c.numeroControlePNCP ?? idx} c={c} />)}
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden lg:block rounded-lg border shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="min-w-[240px]">Objeto</TableHead>
                <TableHead className="min-w-[140px]">Órgão</TableHead>
                <TableHead className="min-w-[140px]">Fornecedor</TableHead>
                <TableHead className="text-right">Valor Inicial</TableHead>
                <TableHead className="text-right">Valor Global</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Publicação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} cols={7} />)
                : items.map((c, idx) => (
                    <TableRow key={c.numeroControlePNCP ?? idx}>
                      <TableCell className="max-w-[300px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="line-clamp-2 text-sm font-medium">{c.objetoContrato}</span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-md">
                            <p className="text-xs">{c.objetoContrato}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="line-clamp-1 text-sm">{c.orgaoEntidade?.razaoSocial}</span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="text-xs">{c.orgaoEntidade?.razaoSocial}</p>
                            <p className="text-xs text-muted-foreground">CNPJ: {formatCnpj(c.orgaoEntidade?.cnpj ?? "")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <span className="line-clamp-1 text-sm">{c.nomeRazaoSocialFornecedor}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(c.valorInicial)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(c.valorGlobal)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(c.dataVigenciaInicio)} – {formatDate(c.dataVigenciaFim)}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(c.dataPublicacaoPncp)}</TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // ── ATAS TABLE ──
  const ataItems = displayResults as AtaRegistroPrecoDTO[];
  return (
    <div>
      {statusBar}
      {emptyState}

      {/* Mobile cards */}
      {!loading && ataItems.length > 0 && (
        <div className="flex flex-col gap-2 lg:hidden">
          {ataItems.map((c, idx) => <MobileAtaCard key={c.numeroControlePNCPAta ?? idx} c={c} />)}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden lg:block rounded-lg border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="min-w-[240px]">Objeto</TableHead>
              <TableHead className="min-w-[140px]">Órgão</TableHead>
              <TableHead className="min-w-[120px]">Unidade</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Publicação</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} cols={6} />)
              : ataItems.map((c, idx) => (
                  <TableRow key={c.numeroControlePNCPAta ?? idx}>
                    <TableCell className="max-w-[300px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="line-clamp-2 text-sm font-medium">{c.objetoContratacao}</span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-md">
                          <p className="text-xs">{c.objetoContratacao}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <span className="line-clamp-1 text-sm">{c.nomeOrgao}</span>
                    </TableCell>
                    <TableCell className="max-w-[150px]">
                      <span className="line-clamp-1 text-sm">{c.nomeUnidadeOrgao}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(c.vigenciaInicio)} – {formatDate(c.vigenciaFim)}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(c.dataPublicacaoPncp)}</TableCell>
                    <TableCell><CanceladoBadge cancelado={c.cancelado} /></TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
