"use client";

import { useState } from "react";
import { useLicitacoes } from "@/store/licitacoes-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MODALIDADES_CONTRATACAO, MODOS_DISPUTA, UFS } from "@/lib/constants";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { SearchMode } from "@/types/pncp";

export function SearchForm() {
  const { state, dispatch, executarBusca } = useLicitacoes();
  const { filters, loading } = state;
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateFilter(key: string, value: string | number | null) {
    dispatch({ type: "SET_FILTERS", payload: { [key]: value, pagina: 1 } });
    // Clear field-level error on change
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (filters.searchMode !== "proposta" && !filters.dataInicial) {
      errs.dataInicial = "Data inicial é obrigatória";
    }
    if (!filters.dataFinal) {
      errs.dataFinal = "Data final é obrigatória";
    }
    if (
      filters.searchMode !== "proposta" &&
      filters.codigoModalidadeContratacao == null
    ) {
      errs.codigoModalidadeContratacao = "Modalidade é obrigatória";
    }
    if (
      filters.searchMode !== "proposta" &&
      filters.dataInicial &&
      filters.dataFinal &&
      filters.dataInicial > filters.dataFinal
    ) {
      errs.dataInicial = "Data inicial deve ser anterior à data final";
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.warning("Preencha os campos obrigatórios antes de buscar.");
      return false;
    }
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    executarBusca({ pagina: 1 });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Search mode tabs */}
      <Tabs
        value={filters.searchMode}
        onValueChange={(v) => updateFilter("searchMode", v as SearchMode)}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="publicacao">Por Publicação</TabsTrigger>
          <TabsTrigger value="proposta">Propostas Abertas</TabsTrigger>
          <TabsTrigger value="atualizacao">Por Atualização</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Date range */}
        {filters.searchMode !== "proposta" && (
          <div className="space-y-1.5">
            <Label htmlFor="dataInicial">Data Inicial *</Label>
            <Input
              id="dataInicial"
              type="date"
              value={filters.dataInicial}
              onChange={(e) => updateFilter("dataInicial", e.target.value)}
              className={errors.dataInicial ? "border-destructive" : ""}
            />
            {errors.dataInicial && (
              <p className="text-xs text-destructive">{errors.dataInicial}</p>
            )}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="dataFinal">Data Final *</Label>
          <Input
            id="dataFinal"
            type="date"
            value={filters.dataFinal}
            onChange={(e) => updateFilter("dataFinal", e.target.value)}
            className={errors.dataFinal ? "border-destructive" : ""}
          />
          {errors.dataFinal && (
            <p className="text-xs text-destructive">{errors.dataFinal}</p>
          )}
        </div>

        {/* Modalidade */}
        <div className="space-y-1.5">
          <Label>
            Modalidade{filters.searchMode !== "proposta" ? " *" : ""}
          </Label>
          <Select
            value={
              filters.codigoModalidadeContratacao != null
                ? String(filters.codigoModalidadeContratacao)
                : ""
            }
            onValueChange={(v) =>
              updateFilter(
                "codigoModalidadeContratacao",
                v ? Number(v) : null
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              {MODALIDADES_CONTRATACAO.map((m) => (
                <SelectItem key={m.codigo} value={String(m.codigo)}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.codigoModalidadeContratacao && (
            <p className="text-xs text-destructive">{errors.codigoModalidadeContratacao}</p>
          )}
        </div>

        {/* Modo Disputa */}
        <div className="space-y-1.5">
          <Label>Modo Disputa</Label>
          <Select
            value={
              filters.codigoModoDisputa != null
                ? String(filters.codigoModoDisputa)
                : ""
            }
            onValueChange={(v) =>
              updateFilter("codigoModoDisputa", v ? Number(v) : null)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              {MODOS_DISPUTA.map((m) => (
                <SelectItem key={m.codigo} value={String(m.codigo)}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* UF */}
        <div className="space-y-1.5">
          <Label>UF</Label>
          <Select
            value={filters.uf}
            onValueChange={(v) => updateFilter("uf", v === "all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {UFS.map((uf) => (
                <SelectItem key={uf} value={uf}>
                  {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* CNPJ */}
        <div className="space-y-1.5">
          <Label htmlFor="cnpj">CNPJ do Órgão</Label>
          <Input
            id="cnpj"
            placeholder="00.000.000/0000-00"
            value={filters.cnpj}
            onChange={(e) => updateFilter("cnpj", e.target.value)}
          />
        </div>

        {/* Município IBGE */}
        <div className="space-y-1.5">
          <Label htmlFor="municipio">Cód. Município IBGE</Label>
          <Input
            id="municipio"
            placeholder="Ex: 3550308"
            value={filters.codigoMunicipioIbge}
            onChange={(e) =>
              updateFilter("codigoMunicipioIbge", e.target.value)
            }
          />
        </div>

        {/* Text search */}
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="textoBusca">Busca no Objeto</Label>
          <Input
            id="textoBusca"
            placeholder="Filtrar por palavras no objeto..."
            value={filters.textoBusca}
            onChange={(e) => updateFilter("textoBusca", e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {loading ? "Buscando..." : "Buscar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => dispatch({ type: "RESET" })}
        >
          Limpar
        </Button>
      </div>
    </form>
  );
}
