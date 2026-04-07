"use client";

import Link from "next/link";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { SITUACAO_COMPRA } from "@/lib/constants";
import { calcularPrioridade } from "@/lib/priority";
import { ArrowUpDown, ExternalLink, AlertCircle, SearchX } from "lucide-react";
import type { CompraPublicacaoDTO } from "@/types/pncp";

function SituacaoBadge({ id }: { id: string }) {
  const label = SITUACAO_COMPRA[id] ?? id;
  const variant =
    id === "1" ? "default" : id === "4" ? "secondary" : "destructive";
  return <Badge variant={variant}>{label}</Badge>;
}

function RowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 7 }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export function ResultsTable() {
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
        <Button variant="outline" size="sm" onClick={() => dispatch({ type: "SET_ERROR", payload: null })}>
          Fechar
        </Button>
      </div>
    );
  }

  function buildDetailHref(c: CompraPublicacaoDTO) {
    const cnpj = c.orgaoEntidade?.cnpj?.replace(/\D/g, "");
    return `/licitacao/${cnpj}/${c.anoCompra}/${c.sequencialCompra}`;
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-2">
        <Button
          variant={sortByPriority ? "default" : "outline"}
          size="sm"
          onClick={() => dispatch({ type: "TOGGLE_PRIORITY" })}
        >
          <ArrowUpDown className="mr-1 h-3 w-3" />
          {sortByPriority ? "Prioridade ativa" : "Ordenar por prioridade"}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[320px]">Objeto</TableHead>
              <TableHead>Órgão</TableHead>
              <TableHead>UF</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead className="text-right">Valor Estimado</TableHead>
              <TableHead>Publicação</TableHead>
              <TableHead>Situação</TableHead>
              {sortByPriority && <TableHead className="text-right">Score</TableHead>}
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
            ) : filteredResults.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={sortByPriority ? 9 : 8}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <SearchX className="h-8 w-8" />
                    <p className="font-medium">Nenhum resultado encontrado</p>
                    <p className="text-xs">Tente ajustar os filtros ou o período da busca.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredResults.map((c, idx) => (
                <TableRow key={c.numeroControlePNCP ?? idx}>
                  <TableCell className="max-w-[320px] truncate font-medium" title={c.objetoCompra}>
                    {c.objetoCompra}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate" title={c.orgaoEntidade?.razaoSocial}>
                    {c.orgaoEntidade?.razaoSocial}
                  </TableCell>
                  <TableCell>{c.unidadeOrgao?.ufSigla}</TableCell>
                  <TableCell>{c.modalidadeNome}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(c.valorTotalEstimado)}
                  </TableCell>
                  <TableCell>{formatDate(c.dataPublicacaoPncp)}</TableCell>
                  <TableCell>
                    <SituacaoBadge id={c.situacaoCompraId} />
                  </TableCell>
                  {sortByPriority && (
                    <TableCell className="text-right font-mono text-xs">
                      {calcularPrioridade(c)}
                    </TableCell>
                  )}
                  <TableCell>
                    <Link href={buildDetailHref(c)}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
