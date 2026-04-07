"use client";

import { SearchForm } from "@/components/search-form";
import { KpiCards } from "@/components/kpi-cards";
import { ResultsTable } from "@/components/results-table";
import { Pagination } from "@/components/pagination";
import { useLicitacoes } from "@/store/licitacoes-context";
import { Separator } from "@/components/ui/separator";
import { FileText } from "lucide-react";

export default function HomePage() {
  const { state } = useLicitacoes();
  const hasResults = state.results.length > 0 || state.loading;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Busca de Licitações</h1>
          <p className="text-sm text-muted-foreground">
            Consulte contratações públicas no Portal Nacional de Contratações Públicas (PNCP).
          </p>
        </div>
      </div>

      <SearchForm />

      {hasResults && (
        <>
          <Separator />
          <KpiCards />
          <ResultsTable />
          <Pagination />
        </>
      )}
    </div>
  );
}
