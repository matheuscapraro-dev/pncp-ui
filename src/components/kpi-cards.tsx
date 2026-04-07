"use client";

import { useLicitacoes } from "@/store/licitacoes-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { FileText, DollarSign, CheckCircle, Layers, Bookmark } from "lucide-react";

export function KpiCards() {
  const { state } = useLicitacoes();
  const { kpis, loading } = state;

  const avgEstimado =
    kpis.totalPagina > 0 ? kpis.valorTotalEstimado / kpis.totalPagina : 0;

  const cards = [
    {
      label: "Total de Resultados",
      value: formatNumber(kpis.totalResultados),
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Valor Total Estimado",
      value: formatCurrency(kpis.valorTotalEstimado),
      subtitle: `Média: ${formatCurrency(avgEstimado)}`,
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Valor Total Homologado",
      value: formatCurrency(kpis.valorTotalHomologado),
      icon: CheckCircle,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/30",
    },
    {
      label: "Itens Nesta Página",
      value: formatNumber(kpis.totalPagina),
      icon: Layers,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      label: "Registro de Preços (SRP)",
      value: formatNumber(kpis.srpCount),
      subtitle: kpis.totalPagina > 0
        ? `${Math.round((kpis.srpCount / kpis.totalPagina) * 100)}% da página`
        : undefined,
      icon: Bookmark,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-50 dark:bg-cyan-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map(({ label, value, subtitle, icon: Icon, color, bg }) => (
        <Card key={label} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {label}
            </CardTitle>
            <div className={`rounded-md p-1.5 ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <>
                <div className="text-xl font-bold">{value}</div>
                {subtitle && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
