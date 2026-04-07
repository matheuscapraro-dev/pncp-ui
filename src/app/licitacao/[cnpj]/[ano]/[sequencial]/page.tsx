"use client";

import { useEffect, useState, use } from "react";
import { consultarContratacao } from "@/lib/pncp-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatDateTime, formatCnpj } from "@/lib/utils";
import { ArrowLeft, ExternalLink, CircleCheck, CircleX, Ban, CirclePause } from "lucide-react";
import Link from "next/link";
import type { CompraDetalheDTO, SituacaoCompraId } from "@/types/pncp";

const SITUACAO_CONFIG: Record<
  string,
  { label: string; icon: typeof CircleCheck; className: string }
> = {
  "1": {
    label: "Divulgada",
    icon: CircleCheck,
    className:
      "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  "2": {
    label: "Revogada",
    icon: CircleX,
    className:
      "border-red-500/40 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-400",
  },
  "3": {
    label: "Anulada",
    icon: Ban,
    className:
      "border-orange-500/40 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-400",
  },
  "4": {
    label: "Suspensa",
    icon: CirclePause,
    className:
      "border-amber-500/40 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400",
  },
};

function SituacaoBadge({ id }: { id: SituacaoCompraId | string }) {
  const config = SITUACAO_CONFIG[id] ?? {
    label: id,
    icon: CircleCheck,
    className: "border-gray-500/40 bg-gray-50 text-gray-700 dark:border-gray-500/30 dark:bg-gray-950/40 dark:text-gray-400",
  };
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`gap-1 font-medium ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export default function LicitacaoDetalhePage({
  params,
}: {
  params: Promise<{ cnpj: string; ano: string; sequencial: string }>;
}) {
  const { cnpj, ano, sequencial } = use(params);
  const [data, setData] = useState<CompraDetalheDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    consultarContratacao(cnpj, Number(ano), Number(sequencial))
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [cnpj, ano, sequencial]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
        </Link>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error || "Contratação não encontrada."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">
            Contratação {data.numeroControlePNCP}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.modalidadeNome} — {data.modoDisputaNome}
          </p>
        </div>
        <div className="ml-auto">
          <SituacaoBadge id={data.situacaoCompraId} />
        </div>
      </div>

      {/* Objeto */}
      <Card>
        <CardHeader>
          <CardTitle>Objeto da Compra</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm">
          {data.objetoCompra}
          {data.informacaoComplementar && (
            <>
              <Separator className="my-3" />
              <p className="text-muted-foreground">{data.informacaoComplementar}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Valores e Datas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Valores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Valor Total Estimado" value={formatCurrency(data.valorTotalEstimado)} />
            <Row label="Valor Total Homologado" value={formatCurrency(data.valorTotalHomologado)} />
            <Row label="Orçamento Sigiloso" value={data.orcamentoSigilosoDescricao} />
            <Row label="SRP" value={data.srp ? "Sim" : "Não"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Publicação PNCP" value={formatDateTime(data.dataPublicacaoPncp)} />
            <Row label="Abertura Proposta" value={formatDateTime(data.dataAberturaProposta)} />
            <Row label="Encerramento Proposta" value={formatDateTime(data.dataEncerramentoProposta)} />
            <Row label="Inclusão" value={formatDateTime(data.dataInclusao)} />
            <Row label="Última Atualização" value={formatDateTime(data.dataAtualizacao)} />
          </CardContent>
        </Card>
      </div>

      {/* Órgão */}
      <Card>
        <CardHeader>
          <CardTitle>Órgão / Entidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Razão Social" value={data.orgaoEntidade?.razaoSocial} />
          <Row label="CNPJ" value={formatCnpj(data.orgaoEntidade?.cnpj ?? "")} />
          <Row label="Unidade" value={data.unidadeOrgao?.nomeUnidade} />
          <Row
            label="Localização"
            value={`${data.unidadeOrgao?.municipioNome} — ${data.unidadeOrgao?.ufSigla}`}
          />
          <Row label="Processo" value={data.processo} />
        </CardContent>
      </Card>

      {/* Legal */}
      <Card>
        <CardHeader>
          <CardTitle>Amparo Legal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Nome" value={data.amparoLegal?.nome} />
          <Row label="Descrição" value={data.amparoLegal?.descricao} />
        </CardContent>
      </Card>

      {/* Links */}
      <div className="flex flex-wrap gap-2">
        {data.linkSistemaOrigem && (
          <a href={data.linkSistemaOrigem} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1 h-3 w-3" /> Sistema de Origem
            </Button>
          </a>
        )}
        {data.linkProcessoEletronico && (
          <a href={data.linkProcessoEletronico} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1 h-3 w-3" /> Processo Eletrônico
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}
