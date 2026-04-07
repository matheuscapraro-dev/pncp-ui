"use client";

import { useLicitacoes } from "@/store/licitacoes-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { FileText, DollarSign, CheckCircle } from "lucide-react";

export function KpiCards() {
  const { state } = useLicitacoes();
  const { kpis, loading } = state;

  const cards = [
    {
      label: "Total de Resultados",
      value: formatNumber(kpis.totalResultados),
      icon: FileText,
    },
    {
      label: "Valor Total Estimado",
      value: formatCurrency(kpis.valorTotalEstimado),
      icon: DollarSign,
    },
    {
      label: "Valor Total Homologado",
      value: formatCurrency(kpis.valorTotalHomologado),
      icon: CheckCircle,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <div className="text-2xl font-bold">{value}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
