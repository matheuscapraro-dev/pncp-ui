"use client";

import { SearchForm } from "@/components/search-form";
import { KpiCards } from "@/components/kpi-cards";
import { ResultsTable } from "@/components/results-table";
import { Pagination } from "@/components/pagination";
import { useLicitacoes } from "@/store/licitacoes-context";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  const { state } = useLicitacoes();
  const hasResults = state.results.length > 0 || state.loading;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Busca de Licitações</h1>
        <p className="text-muted-foreground">
          Consulte contratações públicas no Portal Nacional de Contratações Públicas (PNCP).
        </p>
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
