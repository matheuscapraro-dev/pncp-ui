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

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

export function Pagination() {
  const { state, dispatch, totalFilteredPages, filteredResults } = useLicitacoes();
  const { loading, frontPage, frontPageSize } = state;

  if (totalFilteredPages <= 0) return null;

  function goToPage(page: number) {
    dispatch({ type: "SET_FRONT_PAGE", payload: page });
  }

  function changePageSize(size: string) {
    dispatch({ type: "SET_FRONT_PAGE_SIZE", payload: Number(size) });
  }

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Itens por página:</span>
        <Select
          value={String(frontPageSize)}
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
          Página {frontPage} de {totalFilteredPages} ({filteredResults.length.toLocaleString("pt-BR")} resultados)
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={frontPage <= 1 || loading}
          onClick={() => goToPage(1)}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={frontPage <= 1 || loading}
          onClick={() => goToPage(frontPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={frontPage >= totalFilteredPages || loading}
          onClick={() => goToPage(frontPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={frontPage >= totalFilteredPages || loading}
          onClick={() => goToPage(totalFilteredPages)}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
