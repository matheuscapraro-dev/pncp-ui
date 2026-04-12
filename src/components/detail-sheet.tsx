"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatDateTime, formatCnpj } from "@/lib/utils";
import {
  ExternalLink,
  Maximize2,
} from "lucide-react";
import Link from "next/link";
import { SituacaoBadge, SrpBadge } from "@/components/shared-badges";
import type { CompraPublicacaoDTO } from "@/types/pncp";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

function buildDetailHref(c: CompraPublicacaoDTO) {
  const cnpj = c.orgaoEntidade?.cnpj?.replace(/\D/g, "");
  return `/licitacao/${cnpj}/${c.anoCompra}/${c.sequencialCompra}`;
}

// ─── Main component ──────────────────────────────────────────────────────────

interface DetailSheetProps {
  item: CompraPublicacaoDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetailSheet({ item, open, onOpenChange }: DetailSheetProps) {
  if (!item) return null;

  const href = buildDetailHref(item);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[520px] sm:max-w-[520px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 flex-shrink-0 border-b">
          <div className="flex items-start justify-between gap-2 pr-6">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-bold leading-snug line-clamp-2">
                {item.objetoCompra}
              </SheetTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.modalidadeNome} — {item.modoDisputaNome}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <SituacaoBadge id={item.situacaoCompraId} />
            <SrpBadge srp={item.srp} />
            {item.unidadeOrgao?.ufSigla && (
              <Badge variant="outline" className="font-mono text-xs">
                {item.unidadeOrgao.ufSigla}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            {/* Objeto */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Objeto da Compra</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">
                {item.objetoCompra}
                {item.informacaoComplementar && (
                  <>
                    <Separator className="my-3" />
                    <p className="text-muted-foreground">{item.informacaoComplementar}</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Valores */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Valores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Valor Total Estimado" value={formatCurrency(item.valorTotalEstimado)} />
                <Row label="Valor Total Homologado" value={formatCurrency(item.valorTotalHomologado)} />
                <Row label="SRP" value={item.srp ? "Sim" : "Não"} />
              </CardContent>
            </Card>

            {/* Datas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Datas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Publicação PNCP" value={formatDateTime(item.dataPublicacaoPncp)} />
                <Row label="Abertura Proposta" value={formatDateTime(item.dataAberturaProposta)} />
                <Row label="Encerramento Proposta" value={formatDateTime(item.dataEncerramentoProposta)} />
                <Row label="Inclusão" value={formatDateTime(item.dataInclusao)} />
                <Row label="Última Atualização" value={formatDateTime(item.dataAtualizacao)} />
              </CardContent>
            </Card>

            {/* Órgão */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Órgão / Entidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Razão Social" value={item.orgaoEntidade?.razaoSocial} />
                <Row label="CNPJ" value={formatCnpj(item.orgaoEntidade?.cnpj ?? "")} />
                <Row label="Unidade" value={item.unidadeOrgao?.nomeUnidade} />
                <Row
                  label="Localização"
                  value={
                    item.unidadeOrgao?.municipioNome && item.unidadeOrgao?.ufSigla
                      ? `${item.unidadeOrgao.municipioNome} — ${item.unidadeOrgao.ufSigla}`
                      : undefined
                  }
                />
                <Row label="Processo" value={item.processo} />
              </CardContent>
            </Card>

            {/* Amparo Legal */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Amparo Legal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Nome" value={item.amparoLegal?.nome} />
                <Row label="Descrição" value={item.amparoLegal?.descricao} />
              </CardContent>
            </Card>

            {/* Número de controle */}
            <Card>
              <CardContent className="pt-4 space-y-2 text-sm">
                <Row label="Nº Controle PNCP" value={item.numeroControlePNCP} />
                <Row label="Nº Compra" value={item.numeroCompra} />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="flex-shrink-0 border-t p-3 flex flex-wrap gap-2">
          <Link href={href}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Maximize2 className="h-3.5 w-3.5" />
              Expandir
            </Button>
          </Link>
          {item.linkSistemaOrigem && (
            <a href={item.linkSistemaOrigem} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Sistema de Origem
              </Button>
            </a>
          )}
          {item.linkProcessoEletronico && (
            <a href={item.linkProcessoEletronico} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Processo Eletrônico
              </Button>
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
