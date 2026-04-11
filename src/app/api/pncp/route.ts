import { NextRequest, NextResponse } from "next/server";

const PNCP_BASE = "https://pncp.gov.br/api/consulta";

/**
 * Proxy for the PNCP Consulta API.
 * Avoids CORS issues by forwarding requests server-side.
 *
 * Usage: /api/pncp?endpoint=v1/contratacoes/publicacao&dataInicial=2025-01-01&...
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const endpoint = searchParams.get("endpoint");
  if (!endpoint) {
    return NextResponse.json(
      { error: "Parâmetro 'endpoint' é obrigatório." },
      { status: 400 }
    );
  }

  // Validate endpoint to prevent SSRF — only allow v1/ paths
  if (!endpoint.startsWith("v1/")) {
    return NextResponse.json(
      { error: "Endpoint inválido." },
      { status: 400 }
    );
  }

  const upstream = new URL(`${PNCP_BASE}/${endpoint}`);
  for (const [key, value] of searchParams.entries()) {
    if (key !== "endpoint" && value !== "") {
      upstream.searchParams.set(key, value);
    }
  }

  try {
    const resp = await fetch(upstream.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });

    // 204 No Content — return empty pagination envelope
    if (resp.status === 204) {
      return NextResponse.json({
        data: [],
        totalRegistros: 0,
        totalPaginas: 0,
        numeroPagina: 0,
        paginasRestantes: 0,
        empty: true,
      });
    }

    const body = await resp.text();

    // Guard against empty body from upstream
    if (!body || body.trim() === "") {
      return NextResponse.json({
        data: [],
        totalRegistros: 0,
        totalPaginas: 0,
        numeroPagina: 0,
        paginasRestantes: 0,
        empty: true,
      });
    }

    return new NextResponse(body, {
      status: resp.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao consultar PNCP";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
