"use client";

import { useState } from "react";
import { buscarContratos } from "@/lib/pncp-api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, daysAgoISO, todayISO } from "@/lib/utils";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ContratoDTO, PaginaRetorno } from "@/types/pncp";

export default function ContratosPage() {
  const [dataInicial, setDataInicial] = useState(daysAgoISO(30));
  const [dataFinal, setDataFinal] = useState(todayISO());
  const [cnpjOrgao, setCnpjOrgao] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaginaRetorno<ContratoDTO> | null>(null);
  const [pagina, setPagina] = useState(1);

  async function handleSearch(page = 1) {
    setLoading(true);
    setError(null);
    setPagina(page);
    try {
      const res = await buscarContratos({
        dataInicial,
        dataFinal,
        pagina: page,
        tamanhoPagina: 20,
        ...(cnpjOrgao ? { cnpjOrgao } : {}),
      });
      setResult(res);
      if (res.empty || res.data.length === 0) {
        toast.info("Nenhum contrato encontrado para o período.");
      } else {
        toast.success(`${res.totalRegistros} contratos encontrados.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar contratos";
      setError(message);
      toast.error("Erro na busca", { description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
        <p className="text-muted-foreground">
          Consulte contratos e empenhos publicados no PNCP.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(1);
        }}
        className="flex flex-wrap items-end gap-4"
      >
        <div className="space-y-1.5">
          <Label>Data Inicial</Label>
          <Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Data Final</Label>
          <Input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>CNPJ Órgão</Label>
          <Input placeholder="Opcional" value={cnpjOrgao} onChange={(e) => setCnpjOrgao(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </Button>
      </form>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <>
          <p className="text-sm text-muted-foreground">
            {result.totalRegistros} contratos encontrados
          </p>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Objeto</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor Global</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead>Publicação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : result.data.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            Nenhum contrato encontrado.
                          </TableCell>
                        </TableRow>
                      )
                    : result.data.map((c, idx) => (
                        <TableRow key={c.numeroControlePNCP ?? idx}>
                          <TableCell className="max-w-[300px] truncate" title={c.objetoContrato}>
                            {c.objetoContrato}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate">
                            {c.nomeRazaoSocialFornecedor}
                          </TableCell>
                          <TableCell>{c.tipoContrato?.nome}</TableCell>
                          <TableCell className="text-right">{formatCurrency(c.valorGlobal)}</TableCell>
                          <TableCell>
                            {formatDate(c.dataVigenciaInicio)} — {formatDate(c.dataVigenciaFim)}
                          </TableCell>
                          <TableCell>{formatDate(c.dataPublicacaoPncp)}</TableCell>
                        </TableRow>
                      ))}
              </TableBody>
            </Table>
          </div>
          {result.totalPaginas > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Página {result.numeroPagina} de {result.totalPaginas}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina <= 1 || loading}
                  onClick={() => handleSearch(pagina - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina >= result.totalPaginas || loading}
                  onClick={() => handleSearch(pagina + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
