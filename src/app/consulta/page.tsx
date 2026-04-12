"use client";

import { useState } from "react";
import { SearchForm } from "@/components/search-form";
import { KpiCards } from "@/components/kpi-cards";
import { ResultsTable } from "@/components/results-table";
import { Pagination } from "@/components/pagination";
import { DetailSheet } from "@/components/detail-sheet";
import { useLicitacoes } from "@/store/licitacoes-context";
import { Separator } from "@/components/ui/separator";
import { FileText } from "lucide-react";
import type { CompraPublicacaoDTO } from "@/types/pncp";

export default function ConsultaPage() {
  const { state } = useLicitacoes();
  const hasResults = state.allResults.length > 0 || state.loading;
  const [selectedItem, setSelectedItem] = useState<CompraPublicacaoDTO | null>(null);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-3 py-4 pt-16 sm:space-y-6 sm:px-4 sm:py-6 md:pt-6">
      <div className="flex items-start gap-3">
        <div className="hidden sm:block rounded-lg bg-primary/10 p-2">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Consulta PNCP</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Contratações, contratos e atas do Portal Nacional de Contratações Públicas.
          </p>
        </div>
      </div>

      <SearchForm />

      {hasResults && (
        <>
          <Separator />
          <KpiCards />
          <ResultsTable onSelectItem={setSelectedItem} />
          <Pagination />
        </>
      )}

      <DetailSheet
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => { if (!open) setSelectedItem(null); }}
      />
    </div>
  );
}
