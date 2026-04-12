"use client";

import { useEffect, useState, use } from "react";
import { consultarContratacao } from "@/lib/pncp-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatDateTime, formatCnpj } from "@/lib/utils";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { SituacaoBadge } from "@/components/shared-badges";
import type { CompraDetalheDTO } from "@/types/pncp";

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
      <div className="mx-auto max-w-4xl space-y-4 p-4 pt-16 sm:p-6 md:pt-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-4 pt-16 sm:p-6 md:pt-6">
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
    <div className="mx-auto max-w-4xl space-y-6 p-4 pt-16 sm:p-6 md:pt-6">
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
