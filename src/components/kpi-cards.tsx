"use client";

import { useLicitacoes, isContratacaoMode, isContratoMode } from "@/store/licitacoes-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { FileText, DollarSign, CheckCircle, Layers, Bookmark, Filter } from "lucide-react";
import type { CompraPublicacaoDTO, ContratoDTO } from "@/types/pncp";

export function KpiCards() {
  const { state, filteredResults } = useLicitacoes();
  const { kpis, loading } = state;
  const mode = state.filters.searchMode;

  // Compute KPIs from the FILTERED results (what the user actually sees)
  const filteredCount = filteredResults.length;

  let filteredEstimado = 0;
  let filteredHomologado = 0;
  let filteredSrpCount = 0;

  if (isContratacaoMode(mode)) {
    const items = filteredResults as CompraPublicacaoDTO[];
    filteredEstimado = items.reduce((s, c) => s + (c.valorTotalEstimado ?? 0), 0);
    filteredHomologado = items.reduce((s, c) => s + (c.valorTotalHomologado ?? 0), 0);
    filteredSrpCount = items.filter((c) => c.srp).length;
  } else if (isContratoMode(mode)) {
    const items = filteredResults as ContratoDTO[];
    filteredEstimado = items.reduce((s, c) => s + (c.valorInicial ?? 0), 0);
    filteredHomologado = items.reduce((s, c) => s + (c.valorGlobal ?? 0), 0);
  }

  const avgEstimado = filteredCount > 0 ? filteredEstimado / filteredCount : 0;
  const hasClientFilters = filteredCount !== kpis.totalPagina;

  const cards = [
    {
      label: "Total na API",
      value: formatNumber(kpis.totalResultados),
      subtitle: hasClientFilters ? `${filteredCount} após filtros locais` : undefined,
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: hasClientFilters ? "Exibindo" : "Na Página",
      value: formatNumber(filteredCount),
      subtitle: hasClientFilters ? `de ${kpis.totalPagina} da página` : `de ${kpis.totalResultados.toLocaleString("pt-BR")} total`,
      icon: hasClientFilters ? Filter : Layers,
      color: hasClientFilters ? "text-amber-600 dark:text-amber-400" : "text-orange-600 dark:text-orange-400",
      bg: hasClientFilters ? "bg-amber-50 dark:bg-amber-950/30" : "bg-orange-50 dark:bg-orange-950/30",
    },
    ...(isContratacaoMode(mode) || isContratoMode(mode)
      ? [
          {
            label: "Valor Estimado",
            value: formatCurrency(filteredEstimado),
            subtitle: filteredCount > 0 ? `Média: ${formatCurrency(avgEstimado)}` : undefined,
            icon: DollarSign,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-950/30",
          },
          {
            label: isContratoMode(mode) ? "Valor Global" : "Valor Homologado",
            value: formatCurrency(filteredHomologado),
            icon: CheckCircle,
            color: "text-violet-600 dark:text-violet-400",
            bg: "bg-violet-50 dark:bg-violet-950/30",
          },
        ]
      : []),
    ...(isContratacaoMode(mode)
      ? [
          {
            label: "SRP",
            value: formatNumber(filteredSrpCount),
            subtitle: filteredCount > 0
              ? `${Math.round((filteredSrpCount / filteredCount) * 100)}% dos exibidos`
              : undefined,
            icon: Bookmark,
            color: "text-cyan-600 dark:text-cyan-400",
            bg: "bg-cyan-50 dark:bg-cyan-950/30",
          },
        ]
      : []),
  ];

  const colClass =
    cards.length <= 2
      ? "grid-cols-1 sm:grid-cols-2"
      : cards.length <= 3
      ? "grid-cols-1 sm:grid-cols-3"
      : cards.length <= 4
      ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"
      : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";

  return (
    <div className={`grid gap-3 ${colClass}`}>
      {cards.map(({ label, value, subtitle, icon: Icon, color, bg }) => (
        <Card key={label} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">
              {label}
            </CardTitle>
            <div className={`rounded-md p-1 ${bg}`}>
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {loading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <>
                <div className="text-lg font-bold leading-tight">{value}</div>
                {subtitle && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
