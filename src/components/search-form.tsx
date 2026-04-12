"use client";

import { useState } from "react";
import { useLicitacoes, isContratacaoMode } from "@/store/licitacoes-context";
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
import { Badge } from "@/components/ui/badge";
import {
  MODALIDADES_CONTRATACAO,
  MODOS_DISPUTA,
  UFS,
  SITUACAO_COMPRA,
  STATUS_PROPOSTA,
  ESFERAS,
  PODERES,
  TIPOS_INSTRUMENTO_CONVOCATORIO,
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
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { daysAgoISO, todayISO } from "@/lib/utils";
import type { SearchMode } from "@/types/pncp";
import { useFilterPresets } from "@/hooks/use-filter-presets";
import { useSubscriptions } from "@/hooks/use-subscriptions";
import { SubscribeDialog } from "@/components/subscribe-dialog";

const DATE_PRESETS = [
  { label: "7d", days: 7 },
  { label: "15d", days: 15 },
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
];

const MODE_LABELS: Record<SearchMode, string> = {
  publicacao: "Contratações (Publicação)",
  proposta: "Propostas Abertas",
  atualizacao: "Contratações (Atualização)",
  contratos: "Contratos (Publicação)",
  contratos_atualizacao: "Contratos (Atualização)",
  atas: "Atas de Registro de Preço",
  atas_atualizacao: "Atas (Atualização)",
};

export function SearchForm() {
  const { state, dispatch, executarBusca, cancelarBusca } = useLicitacoes();
  const { filters, loading } = state;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showApiAdvanced, setShowApiAdvanced] = useState(false);
  const [showClientFilters, setShowClientFilters] = useState(true);
  const { presets, savePreset, deletePreset } = useFilterPresets();
  const { create: createSubscription } = useSubscriptions();
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetDateRange, setPresetDateRange] = useState<number | null>(null);

  const isContratacao = isContratacaoMode(filters.searchMode);
  const needsDates = filters.searchMode !== "proposta";

  const activeApiAdvancedCount = [
    filters.codigoModoDisputa != null,
    filters.uf !== "",
    filters.cnpj !== "",
    filters.codigoMunicipioIbge !== "",
    filters.codigoUnidadeAdministrativa !== "",
  ].filter(Boolean).length;

  const activeClientFilterCount = [
    filters.textoBusca !== "",
    filters.situacaoCompraId !== "",
    filters.statusProposta !== "",
    filters.srp !== "",
    filters.valorMinimo !== "",
    filters.valorMaximo !== "",
    filters.palavrasIncluir !== "",
    filters.palavrasExcluir !== "",
    filters.esferaId !== "",
    filters.poderId !== "",
    filters.tipoInstrumentoConvocatorio !== "",
    filters.municipioNome !== "",
    filters.nomeOrgao !== "",
    filters.hasLinkExterno !== "",
    filters.valorHomologadoMinimo !== "",
    filters.valorHomologadoMaximo !== "",
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
      payload: { dataInicial: daysAgoISO(days), dataFinal: todayISO(), pagina: 1 },
    });
  }

  function applyFilterPreset(presetId: string) {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    const datePart = preset.relativeDateRange
      ? { dataInicial: daysAgoISO(preset.relativeDateRange), dataFinal: todayISO() }
      : {};
    dispatch({ type: "SET_FILTERS", payload: { ...preset.filters, ...datePart, pagina: 1 } });
    setActivePresetId(presetId);
    setShowApiAdvanced(true);
    toast.success(`Preset "${preset.nome}" aplicado`);
  }

  function clearPreset() {
    dispatch({ type: "RESET" });
    setActivePresetId(null);
  }

  function handleSavePreset() {
    const name = presetName.trim();
    if (!name) { toast.warning("Digite um nome para o preset."); return; }
    const toSave: Record<string, unknown> = {};
    if (filters.valorMinimo) toSave.valorMinimo = filters.valorMinimo;
    if (filters.valorMaximo) toSave.valorMaximo = filters.valorMaximo;
    if (filters.palavrasIncluir) toSave.palavrasIncluir = filters.palavrasIncluir;
    if (filters.palavrasExcluir) toSave.palavrasExcluir = filters.palavrasExcluir;
    if (filters.situacaoCompraId) toSave.situacaoCompraId = filters.situacaoCompraId;
    if (filters.statusProposta) toSave.statusProposta = filters.statusProposta;
    if (filters.srp) toSave.srp = filters.srp;
    if (filters.uf) toSave.uf = filters.uf;
    if (filters.esferaId) toSave.esferaId = filters.esferaId;
    if (filters.poderId) toSave.poderId = filters.poderId;
    if (filters.codigoModoDisputa != null) toSave.codigoModoDisputa = filters.codigoModoDisputa;
    if (filters.codigoMunicipioIbge) toSave.codigoMunicipioIbge = filters.codigoMunicipioIbge;
    if (filters.cnpj) toSave.cnpj = filters.cnpj;
    if (filters.codigoModalidadeContratacao != null && filters.codigoModalidadeContratacao !== 6)
      toSave.codigoModalidadeContratacao = filters.codigoModalidadeContratacao;
    savePreset(name, toSave, presetDateRange ?? undefined);
    setPresetName("");
    setPresetDateRange(null);
    setShowSaveInput(false);
    toast.success(`Preset "${name}" salvo!`);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (needsDates && !filters.dataInicial) errs.dataInicial = "Obrigatória";
    if (!filters.dataFinal) errs.dataFinal = "Obrigatória";
    if (isContratacao && filters.searchMode !== "proposta" && filters.codigoModalidadeContratacao == null)
      errs.codigoModalidadeContratacao = "Obrigatória";
    if (needsDates && filters.dataInicial && filters.dataFinal && filters.dataInicial > filters.dataFinal)
      errs.dataInicial = "Inicial deve ser anterior à final";
    setErrors(errs);
    if (Object.keys(errs).length > 0) { toast.warning("Preencha os campos obrigatórios."); return false; }
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    executarBusca();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Search mode selector */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Tipo de Consulta</Label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(MODE_LABELS) as [SearchMode, string][]).map(([mode, label]) => (
            <Button
              key={mode}
              type="button"
              variant={filters.searchMode === mode ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => updateFilter("searchMode", mode)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Preset bar */}
      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Bookmark className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {presets.map((preset) => (
            <div key={preset.id} className="flex items-center">
              <Button
                type="button"
                variant={activePresetId === preset.id ? "default" : "outline"}
                size="sm"
                className="h-6 rounded-r-none px-2 text-xs"
                onClick={() => applyFilterPreset(preset.id)}
              >
                {preset.nome}
                {preset.relativeDateRange && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">{preset.relativeDateRange}d</Badge>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 rounded-l-none border-l-0 px-1 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  deletePreset(preset.id);
                  if (activePresetId === preset.id) setActivePresetId(null);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {activePresetId && (
            <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={clearPreset}>
              Limpar
            </Button>
          )}
        </div>
      )}

      {/* ═══ API Filters (server-side — sent to the PNCP API) ═══ */}
      <div className="rounded-lg border bg-card p-3 shadow-sm space-y-3">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Filter className="h-3 w-3" /> Parâmetros da API
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Date range */}
          {needsDates && (
            <div className="space-y-1">
              <Label htmlFor="dataInicial" className="text-xs">Data Inicial *</Label>
              <Input id="dataInicial" type="date" value={filters.dataInicial}
                onChange={(e) => updateFilter("dataInicial", e.target.value)}
                className={`h-8 text-sm ${errors.dataInicial ? "border-destructive" : ""}`} />
              {errors.dataInicial && <p className="text-xs text-destructive">{errors.dataInicial}</p>}
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="dataFinal" className="text-xs">Data Final *</Label>
            <Input id="dataFinal" type="date" value={filters.dataFinal}
              onChange={(e) => updateFilter("dataFinal", e.target.value)}
              className={`h-8 text-sm ${errors.dataFinal ? "border-destructive" : ""}`} />
            {errors.dataFinal && <p className="text-xs text-destructive">{errors.dataFinal}</p>}
          </div>

          {/* Modalidade (contratações only) */}
          {isContratacao && (
            <div className="space-y-1">
              <Label className="text-xs">Modalidade{filters.searchMode !== "proposta" ? " *" : ""}</Label>
              <Select
                value={filters.codigoModalidadeContratacao != null ? String(filters.codigoModalidadeContratacao) : ""}
                onValueChange={(v) => updateFilter("codigoModalidadeContratacao", v ? Number(v) : null)}
              >
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  {MODALIDADES_CONTRATACAO.map((m) => (
                    <SelectItem key={m.codigo} value={String(m.codigo)}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.codigoModalidadeContratacao && <p className="text-xs text-destructive">{errors.codigoModalidadeContratacao}</p>}
            </div>
          )}
        </div>

        {/* Date presets */}
        {needsDates && (
          <div className="flex flex-wrap items-center gap-1.5">
            <CalendarDays className="h-3 w-3 text-muted-foreground" />
            {DATE_PRESETS.map((p) => (
              <Button key={p.days} type="button" variant="outline" size="sm" className="h-5 px-1.5 text-[10px]"
                onClick={() => applyDatePreset(p.days)}>{p.label}</Button>
            ))}
          </div>
        )}

        {/* API Advanced toggle */}
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground h-6 px-1"
          onClick={() => setShowApiAdvanced(!showApiAdvanced)}>
          <SlidersHorizontal className="h-3 w-3" />
          <span className="text-[10px]">Filtros avançados da API</span>
          {activeApiAdvancedCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">{activeApiAdvancedCount}</Badge>
          )}
          {showApiAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>

        {/* API Advanced filters */}
        {showApiAdvanced && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Modo Disputa (contratações only) */}
              {isContratacao && (
                <div className="space-y-1">
                  <Label className="text-xs">Modo Disputa</Label>
                  <Select value={filters.codigoModoDisputa != null ? String(filters.codigoModoDisputa) : ""}
                    onValueChange={(v) => updateFilter("codigoModoDisputa", v === "all" ? null : Number(v))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {MODOS_DISPUTA.map((m) => <SelectItem key={m.codigo} value={String(m.codigo)}>{m.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* UF */}
              <div className="space-y-1">
                <Label className="text-xs">UF</Label>
                <Select value={filters.uf} onValueChange={(v) => updateFilter("uf", v === "all" ? "" : v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* CNPJ */}
              <div className="space-y-1">
                <Label className="text-xs">CNPJ do Órgão</Label>
                <Input placeholder="00.000.000/0000-00" value={filters.cnpj}
                  onChange={(e) => updateFilter("cnpj", e.target.value)} className="h-8 text-sm" />
              </div>
              {/* Código Município IBGE */}
              {isContratacao && (
                <div className="space-y-1">
                  <Label className="text-xs">Cód. Município IBGE</Label>
                  <Input placeholder="Ex: 3550308" value={filters.codigoMunicipioIbge}
                    onChange={(e) => updateFilter("codigoMunicipioIbge", e.target.value)} className="h-8 text-sm" />
                </div>
              )}
              {/* Código Unidade Administrativa */}
              <div className="space-y-1">
                <Label className="text-xs">Cód. Unidade Administrativa</Label>
                <Input placeholder="Ex: 150123" value={filters.codigoUnidadeAdministrativa}
                  onChange={(e) => updateFilter("codigoUnidadeAdministrativa", e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Action buttons ═══ */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={loading} size="sm" className="gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {loading ? "Buscando..." : "Buscar"}
        </Button>
        {loading && (
          <Button type="button" variant="destructive" size="sm" className="gap-1.5" onClick={cancelarBusca}>
            <X className="h-3.5 w-3.5" /> Cancelar
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" className="gap-1.5"
          onClick={() => { dispatch({ type: "RESET" }); setActivePresetId(null); }}>
          <RotateCcw className="h-3 w-3" /> Limpar
        </Button>

        <SubscribeDialog filters={filters} onCreate={createSubscription} />

        <div className="ml-auto flex items-center gap-1.5">
          {showSaveInput ? (
            <div className="flex items-center gap-1">
              <Input className="h-7 w-32 text-xs sm:w-40" placeholder="Nome do preset..."
                value={presetName} onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSavePreset(); } if (e.key === "Escape") setShowSaveInput(false); }} autoFocus />
              <Select value={presetDateRange != null ? String(presetDateRange) : "none"}
                onValueChange={(v) => setPresetDateRange(v === "none" ? null : Number(v))}>
                <SelectTrigger className="h-7 w-20 text-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem data</SelectItem>
                  {DATE_PRESETS.map((p) => (
                    <SelectItem key={p.days} value={String(p.days)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={handleSavePreset}>OK</Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowSaveInput(false)}><X className="h-3 w-3" /></Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setShowSaveInput(true)}>
              <Save className="h-3 w-3" /> Salvar preset
            </Button>
          )}
        </div>
      </div>

      {/* ═══ Client-side Filters (instant — applied on fetched results) ═══ */}
      {state.allResults.length > 0 && (
        <>
          <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setShowClientFilters(!showClientFilters)}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="text-xs">Filtros de resultado</span>
            {activeClientFilterCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">{activeClientFilterCount}</Badge>
            )}
            {showClientFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>

          {showClientFilters && (
            <div className="rounded-lg border bg-muted/30 p-3 shadow-sm space-y-3">
              {/* Text search + keywords */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Search className="h-3 w-3" /> Busca textual
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="textoBusca" className="text-xs">Busca no Objeto</Label>
                    <Input id="textoBusca" placeholder="Filtrar por palavras..." value={filters.textoBusca}
                      onChange={(e) => updateFilter("textoBusca", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Palavras-chave (incluir)</Label>
                    <Input placeholder={`engenharia, "serviço de limpeza" AND predial`} value={filters.palavrasIncluir}
                      onChange={(e) => updateFilter("palavrasIncluir", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Palavras-chave (excluir)</Label>
                    <Input placeholder={`manutenção OR "locação de veículos"`} value={filters.palavrasExcluir}
                      onChange={(e) => updateFilter("palavrasExcluir", e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Palavras-chave suportam vírgula ou OR, AND, NOT, parênteses e &quot;aspas&quot; para frase exata.
                </p>
              </div>

              {/* Selects */}
              {isContratacao && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Filter className="h-3 w-3" /> Classificação
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {/* Situação */}
                    <div className="space-y-1">
                      <Label className="text-xs">Situação</Label>
                      <Select value={filters.situacaoCompraId}
                        onValueChange={(v) => updateFilter("situacaoCompraId", v === "all" ? "" : v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {Object.entries(SITUACAO_COMPRA).map(([id, nome]) => (
                            <SelectItem key={id} value={id}>{nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Status Proposta */}
                    <div className="space-y-1">
                      <Label className="text-xs">Status Proposta</Label>
                      <Select value={filters.statusProposta}
                        onValueChange={(v) => updateFilter("statusProposta", v === "all" ? "" : v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {Object.entries(STATUS_PROPOSTA).map(([id, nome]) => (
                            <SelectItem key={id} value={id}>{nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* SRP */}
                    <div className="space-y-1">
                      <Label className="text-xs">SRP</Label>
                      <Select value={filters.srp} onValueChange={(v) => updateFilter("srp", v === "all" ? "" : v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="true">Somente SRP</SelectItem>
                          <SelectItem value="false">Sem SRP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Esfera */}
                    <div className="space-y-1">
                      <Label className="text-xs">Esfera</Label>
                      <Select value={filters.esferaId} onValueChange={(v) => updateFilter("esferaId", v === "all" ? "" : v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {ESFERAS.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Poder */}
                    <div className="space-y-1">
                      <Label className="text-xs">Poder</Label>
                      <Select value={filters.poderId} onValueChange={(v) => updateFilter("poderId", v === "all" ? "" : v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {PODERES.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Instrumento Convocatório */}
                    <div className="space-y-1">
                      <Label className="text-xs">Instrumento</Label>
                      <Select value={filters.tipoInstrumentoConvocatorio}
                        onValueChange={(v) => updateFilter("tipoInstrumentoConvocatorio", v === "all" ? "" : v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {TIPOS_INSTRUMENTO_CONVOCATORIO.map((t) => (
                            <SelectItem key={t.codigo} value={String(t.codigo)}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Link Externo */}
                    <div className="space-y-1">
                      <Label className="text-xs">Link Externo</Label>
                      <Select value={filters.hasLinkExterno} onValueChange={(v) => updateFilter("hasLinkExterno", v === "all" ? "" : v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="true">Com link</SelectItem>
                          <SelectItem value="false">Sem link</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Órgão / Município */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nome do Órgão</Label>
                  <Input placeholder="Buscar por nome..." value={filters.nomeOrgao}
                    onChange={(e) => updateFilter("nomeOrgao", e.target.value)} className="h-8 text-sm" />
                </div>
                {isContratacao && (
                  <div className="space-y-1">
                    <Label className="text-xs">Município (nome)</Label>
                    <Input placeholder="Ex: São Paulo" value={filters.municipioNome}
                      onChange={(e) => updateFilter("municipioNome", e.target.value)} className="h-8 text-sm" />
                  </div>
                )}
              </div>

              {/* Value ranges */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <SlidersHorizontal className="h-3 w-3" /> Faixa de valor
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Valor Mín. Estimado (R$)</Label>
                    <Input type="number" min="0" step="1000" placeholder="0" value={filters.valorMinimo}
                      onChange={(e) => updateFilter("valorMinimo", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor Máx. Estimado (R$)</Label>
                    <Input type="number" min="0" step="1000" placeholder="Sem limite" value={filters.valorMaximo}
                      onChange={(e) => updateFilter("valorMaximo", e.target.value)} className="h-8 text-sm" />
                  </div>
                  {isContratacao && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">Homologado Mín. (R$)</Label>
                        <Input type="number" min="0" step="1000" placeholder="0" value={filters.valorHomologadoMinimo}
                          onChange={(e) => updateFilter("valorHomologadoMinimo", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Homologado Máx. (R$)</Label>
                        <Input type="number" min="0" step="1000" placeholder="Sem limite" value={filters.valorHomologadoMaximo}
                          onChange={(e) => updateFilter("valorHomologadoMaximo", e.target.value)} className="h-8 text-sm" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </form>
  );
}
