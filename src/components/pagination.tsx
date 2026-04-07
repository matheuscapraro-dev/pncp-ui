"use client";

import { useLicitacoes } from "@/store/licitacoes-context";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export function Pagination() {
  const { state, executarBusca } = useLicitacoes();
  const { pagination, loading, filters } = state;
  const { totalPaginas, numeroPagina, totalRegistros } = pagination;

  if (totalPaginas <= 0) return null;

  function goToPage(page: number) {
    executarBusca({ pagina: page });
  }

  return (
    <div className="flex items-center justify-between py-4">
      <span className="text-sm text-muted-foreground">
        Página {numeroPagina} de {totalPaginas} ({totalRegistros} resultados)
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          disabled={numeroPagina <= 1 || loading}
          onClick={() => goToPage(1)}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={numeroPagina <= 1 || loading}
          onClick={() => goToPage(filters.pagina - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={numeroPagina >= totalPaginas || loading}
          onClick={() => goToPage(filters.pagina + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={numeroPagina >= totalPaginas || loading}
          onClick={() => goToPage(totalPaginas)}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
