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
import { Badge } from "@/components/ui/badge";
import {
  MODALIDADES_CONTRATACAO,
  MODOS_DISPUTA,
  UFS,
  SITUACAO_COMPRA,
} from "@/lib/constants";
import {
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  RotateCcw,
  SlidersHorizontal,
  Save,
  Trash2,
  Bookmark,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { daysAgoISO, todayISO } from "@/lib/utils";
import type { SearchMode } from "@/types/pncp";
import { useFilterPresets } from "@/hooks/use-filter-presets";

const DATE_PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "15 dias", days: 15 },
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
];

export function SearchForm() {
  const { state, dispatch, executarBusca } = useLicitacoes();
  const { filters, loading } = state;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { presets, savePreset, deletePreset } = useFilterPresets();
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [presetName, setPresetName] = useState("");

  const activeAdvancedCount = [
    filters.codigoModoDisputa != null,
    filters.uf !== "",
    filters.cnpj !== "",
    filters.codigoMunicipioIbge !== "",
    filters.situacaoCompraId !== "",
    filters.srp !== "",
    filters.valorMinimo !== "",
    filters.valorMaximo !== "",
    filters.palavrasIncluir !== "",
    filters.palavrasExcluir !== "",
  ].filter(Boolean).length;

  function updateFilter(key: string, value: string | number | null) {
    dispatch({ type: "SET_FILTERS", payload: { [key]: value, pagina: 1 } });
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function applyDatePreset(days: number) {
    dispatch({
      type: "SET_FILTERS",
      payload: {
        dataInicial: daysAgoISO(days),
        dataFinal: todayISO(),
        pagina: 1,
      },
    });
  }

  function applyFilterPreset(presetId: string) {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    dispatch({ type: "SET_FILTERS", payload: { ...preset.filters, pagina: 1 } });
    setActivePresetId(presetId);
    setShowAdvanced(true);
    toast.success(`Preset "${preset.nome}" aplicado`);
  }

  function clearPreset() {
    dispatch({ type: "RESET" });
    setActivePresetId(null);
  }

  function handleSavePreset() {
    const name = presetName.trim();
    if (!name) {
      toast.warning("Digite um nome para o preset.");
      return;
    }
    // Save only non-default filter fields
    const toSave: Record<string, unknown> = {};
    if (filters.valorMinimo) toSave.valorMinimo = filters.valorMinimo;
    if (filters.valorMaximo) toSave.valorMaximo = filters.valorMaximo;
    if (filters.palavrasIncluir) toSave.palavrasIncluir = filters.palavrasIncluir;
    if (filters.palavrasExcluir) toSave.palavrasExcluir = filters.palavrasExcluir;
    if (filters.situacaoCompraId) toSave.situacaoCompraId = filters.situacaoCompraId;
    if (filters.srp) toSave.srp = filters.srp;
    if (filters.uf) toSave.uf = filters.uf;
    if (filters.codigoModoDisputa != null) toSave.codigoModoDisputa = filters.codigoModoDisputa;
    if (filters.codigoMunicipioIbge) toSave.codigoMunicipioIbge = filters.codigoMunicipioIbge;
    if (filters.cnpj) toSave.cnpj = filters.cnpj;
    if (filters.codigoModalidadeContratacao != null && filters.codigoModalidadeContratacao !== 6)
      toSave.codigoModalidadeContratacao = filters.codigoModalidadeContratacao;
    savePreset(name, toSave);
    setPresetName("");
    setShowSaveInput(false);
    toast.success(`Preset "${name}" salvo!`);
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

      {/* Filter presets bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Presets:</span>
        {presets.map((preset) => (
          <div key={preset.id} className="flex items-center gap-0.5">
            <Button
              type="button"
              variant={activePresetId === preset.id ? "default" : "outline"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => applyFilterPreset(preset.id)}
            >
              {preset.nome}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => {
                deletePreset(preset.id);
                if (activePresetId === preset.id) setActivePresetId(null);
                toast.info(`Preset removido`);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {activePresetId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground"
            onClick={clearPreset}
          >
            <X className="h-3 w-3" />
            Limpar preset
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {showSaveInput ? (
            <>
              <Input
                className="h-7 w-40 text-xs"
                placeholder="Nome do preset..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSavePreset();
                  }
                  if (e.key === "Escape") setShowSaveInput(false);
                }}
                autoFocus
              />
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleSavePreset}
              >
                Salvar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setShowSaveInput(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setShowSaveInput(true)}
            >
              <Save className="h-3 w-3" />
              Salvar filtros atuais
            </Button>
          )}
        </div>
      </div>

      {/* Primary filters */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
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
              <p className="text-xs text-destructive">
                {errors.codigoModalidadeContratacao}
              </p>
            )}
          </div>

          {/* Text search */}
          <div className="space-y-1.5">
            <Label htmlFor="textoBusca">Busca no Objeto</Label>
            <Input
              id="textoBusca"
              placeholder="Filtrar por palavras..."
              value={filters.textoBusca}
              onChange={(e) => updateFilter("textoBusca", e.target.value)}
            />
          </div>
        </div>

        {/* Date presets */}
        {filters.searchMode !== "proposta" && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Período:</span>
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.days}
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => applyDatePreset(preset.days)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Advanced filters toggle */}
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros avançados
          {activeAdvancedCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {activeAdvancedCount}
            </Badge>
          )}
          {showAdvanced ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="rounded-lg border bg-muted/30 p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  updateFilter(
                    "codigoModoDisputa",
                    v === "all" ? null : Number(v)
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
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
                onValueChange={(v) =>
                  updateFilter("uf", v === "all" ? "" : v)
                }
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

            {/* Situação */}
            <div className="space-y-1.5">
              <Label>Situação da Compra</Label>
              <Select
                value={filters.situacaoCompraId}
                onValueChange={(v) =>
                  updateFilter("situacaoCompraId", v === "all" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(SITUACAO_COMPRA).map(([id, nome]) => (
                    <SelectItem key={id} value={id}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SRP */}
            <div className="space-y-1.5">
              <Label>Registro de Preços (SRP)</Label>
              <Select
                value={filters.srp}
                onValueChange={(v) =>
                  updateFilter("srp", v === "all" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Somente SRP</SelectItem>
                  <SelectItem value="false">Sem SRP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Valor Mínimo */}
            <div className="space-y-1.5">
              <Label htmlFor="valorMinimo">Valor Mín. Estimado (R$)</Label>
              <Input
                id="valorMinimo"
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value={filters.valorMinimo}
                onChange={(e) => updateFilter("valorMinimo", e.target.value)}
              />
            </div>

            {/* Valor Máximo */}
            <div className="space-y-1.5">
              <Label htmlFor="valorMaximo">Valor Máx. Estimado (R$)</Label>
              <Input
                id="valorMaximo"
                type="number"
                min="0"
                step="1000"
                placeholder="Sem limite"
                value={filters.valorMaximo}
                onChange={(e) => updateFilter("valorMaximo", e.target.value)}
              />
            </div>

            {/* Palavras-chave incluir */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="palavrasIncluir">Palavras-chave (incluir)</Label>
              <Input
                id="palavrasIncluir"
                placeholder="engenharia, construção, obra, reforma..."
                value={filters.palavrasIncluir}
                onChange={(e) => updateFilter("palavrasIncluir", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separe por vírgula. Mantém itens que contenham qualquer uma das palavras.
              </p>
            </div>

            {/* Palavras-chave excluir */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="palavrasExcluir">Palavras-chave (excluir)</Label>
              <Input
                id="palavrasExcluir"
                placeholder="execução, manutenção..."
                value={filters.palavrasExcluir}
                onChange={(e) => updateFilter("palavrasExcluir", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separe por vírgula. Remove itens que contenham qualquer uma das palavras.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading} className="gap-2">
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
          className="gap-2"
          onClick={() => dispatch({ type: "RESET" })}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Limpar
        </Button>
      </div>
    </form>
  );
}
