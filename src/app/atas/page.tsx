"use client";

import { useState } from "react";
import { buscarAtas } from "@/lib/pncp-api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, daysAgoISO, todayISO } from "@/lib/utils";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AtaRegistroPrecoDTO, PaginaRetorno } from "@/types/pncp";

export default function AtasPage() {
  const [dataInicial, setDataInicial] = useState(daysAgoISO(30));
  const [dataFinal, setDataFinal] = useState(todayISO());
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaginaRetorno<AtaRegistroPrecoDTO> | null>(null);
  const [pagina, setPagina] = useState(1);

  async function handleSearch(page = 1) {
    setLoading(true);
    setError(null);
    setPagina(page);
    try {
      const res = await buscarAtas({
        dataInicial,
        dataFinal,
        pagina: page,
        tamanhoPagina: 20,
        ...(cnpj ? { cnpj } : {}),
      });
      setResult(res);
      if (res.empty || res.data.length === 0) {
        toast.info("Nenhuma ata encontrada para o período.");
      } else {
        toast.success(`${res.totalRegistros} atas encontradas.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar atas";
      setError(message);
      toast.error("Erro na busca", { description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Atas de Registro de Preço</h1>
        <p className="text-muted-foreground">
          Consulte atas de registro de preço por período de vigência.
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
          <Input placeholder="Opcional" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
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
            {result.totalRegistros} atas encontradas
          </p>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Objeto</TableHead>
                  <TableHead>Órgão</TableHead>
                  <TableHead>Nº Ata</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead>Publicação</TableHead>
                  <TableHead>Status</TableHead>
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
                            Nenhuma ata encontrada.
                          </TableCell>
                        </TableRow>
                      )
                    : result.data.map((a, idx) => (
                        <TableRow key={a.numeroControlePNCPAta ?? idx}>
                          <TableCell className="max-w-[300px] truncate" title={a.objetoContratacao}>
                            {a.objetoContratacao}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate">{a.nomeOrgao}</TableCell>
                          <TableCell>{a.numeroAtaRegistroPreco}</TableCell>
                          <TableCell>
                            {formatDate(a.vigenciaInicio)} — {formatDate(a.vigenciaFim)}
                          </TableCell>
                          <TableCell>{formatDate(a.dataPublicacaoPncp)}</TableCell>
                          <TableCell>
                            <Badge variant={a.cancelado ? "destructive" : "default"}>
                              {a.cancelado ? "Cancelada" : "Ativa"}
                            </Badge>
                          </TableCell>
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
