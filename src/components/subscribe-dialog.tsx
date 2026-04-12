"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { FilterState } from "@/types/pncp";
import type { SubscriptionFilters } from "@/types/subscription";

interface SubscribeDialogProps {
  filters: FilterState;
  onCreate: (nome: string, filters: SubscriptionFilters) => Promise<unknown>;
}

function computeDiasRetroativos(dataInicial: string, dataFinal: string): number {
  const ini = new Date(dataInicial);
  const fin = new Date(dataFinal);
  const diff = Math.ceil((fin.getTime() - ini.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
}

function filtersToSubscription(f: FilterState): SubscriptionFilters {
  return {
    searchMode: f.searchMode,
    diasRetroativos: computeDiasRetroativos(f.dataInicial, f.dataFinal),
    codigoModalidadeContratacao: f.codigoModalidadeContratacao,
    codigoModoDisputa: f.codigoModoDisputa,
    uf: f.uf,
    codigoMunicipioIbge: f.codigoMunicipioIbge,
    cnpj: f.cnpj,
    codigoUnidadeAdministrativa: f.codigoUnidadeAdministrativa,
    situacaoCompraId: f.situacaoCompraId,
    statusProposta: f.statusProposta,
    srp: f.srp,
    valorMinimo: f.valorMinimo,
    valorMaximo: f.valorMaximo,
    palavrasIncluir: f.palavrasIncluir,
    palavrasExcluir: f.palavrasExcluir,
    esferaId: f.esferaId,
    poderId: f.poderId,
    tipoInstrumentoConvocatorio: f.tipoInstrumentoConvocatorio,
    municipioNome: f.municipioNome,
    nomeOrgao: f.nomeOrgao,
    hasLinkExterno: f.hasLinkExterno,
    valorHomologadoMinimo: f.valorHomologadoMinimo,
    valorHomologadoMaximo: f.valorHomologadoMaximo,
  };
}

export function SubscribeDialog({ filters, onCreate }: SubscribeDialogProps) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);

  const dias = computeDiasRetroativos(filters.dataInicial, filters.dataFinal);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Dê um nome para a inscrição.");
      return;
    }

    setSaving(true);
    try {
      await onCreate(nome.trim(), filtersToSubscription(filters));
      toast.success("Inscrição criada!", {
        description: "O worker atualizará os resultados diariamente.",
      });
      setNome("");
      setOpen(false);
    } catch (err) {
      toast.error("Erro ao criar inscrição", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Bell className="h-3.5 w-3.5" />
          Inscrever-se
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle>Inscrever-se nesta busca</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 px-1">
          <p className="text-sm text-muted-foreground">
            Os filtros atuais serão salvos. Um worker buscará automaticamente os
            resultados <strong>1 vez por dia</strong>, sempre considerando os
            últimos <strong>{dias} dias</strong> a partir da data de execução
            (janela móvel). Você poderá ver os resultados instantaneamente ao
            abrir o app.
          </p>

          <div className="rounded-md border bg-muted/50 p-3 text-xs space-y-1.5">
            <p>
              <strong>Modo:</strong> {filters.searchMode}
            </p>
            <p>
              <strong>Janela móvel:</strong> últimos {dias} dias (recalculado a cada execução)
            </p>
            {filters.palavrasIncluir && (
              <p>
                <strong>Incluir:</strong> {filters.palavrasIncluir}
              </p>
            )}
            {filters.palavrasExcluir && (
              <p>
                <strong>Excluir:</strong> {filters.palavrasExcluir}
              </p>
            )}
            {filters.valorMinimo && (
              <p>
                <strong>Valor mín:</strong> R$ {Number(filters.valorMinimo).toLocaleString("pt-BR")}
              </p>
            )}
            {filters.uf && (
              <p>
                <strong>UF:</strong> {filters.uf}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-nome">Nome da inscrição</Label>
            <Input
              id="sub-nome"
              placeholder="Ex: Engenharia 500k+ SP"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={80}
              autoFocus
            />
          </div>

          <Button type="submit" disabled={saving} className="w-full gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {saving ? "Salvando..." : "Criar inscrição"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
