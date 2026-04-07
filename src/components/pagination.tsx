"use client";

import { useLicitacoes } from "@/store/licitacoes-context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

export function Pagination() {
  const { state, executarBusca } = useLicitacoes();
  const { pagination, loading, filters } = state;
  const { totalPaginas, numeroPagina, totalRegistros } = pagination;

  if (totalPaginas <= 0) return null;

  function goToPage(page: number) {
    executarBusca({ pagina: page });
  }

  function changePageSize(size: string) {
    executarBusca({ tamanhoPagina: Number(size), pagina: 1 });
  }

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Itens por página:</span>
        <Select
          value={String(filters.tamanhoPagina)}
          onValueChange={changePageSize}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          Página {numeroPagina} de {totalPaginas} ({totalRegistros.toLocaleString("pt-BR")} resultados)
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={numeroPagina <= 1 || loading}
          onClick={() => goToPage(1)}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={numeroPagina <= 1 || loading}
          onClick={() => goToPage(filters.pagina - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={numeroPagina >= totalPaginas || loading}
          onClick={() => goToPage(filters.pagina + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={numeroPagina >= totalPaginas || loading}
          onClick={() => goToPage(totalPaginas)}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
