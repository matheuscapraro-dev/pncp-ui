/**
 * Client-side filter logic for the subscription worker.
 * Mirrors the applyFilters function from licitacoes-context.tsx.
 */

import { compileBooleanExpr } from "./boolean-filter.js";
import type { SubscriptionFilters } from "./types.js";

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isContratacaoMode(m: string): boolean {
  return m === "publicacao" || m === "proposta" || m === "atualizacao";
}

function isContratoMode(m: string): boolean {
  return m === "contratos" || m === "contratos_atualizacao";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyFilters(allResults: any[], f: SubscriptionFilters): any[] {
  const mode = f.searchMode;

  const incMatcher = compileBooleanExpr(f.palavrasIncluir);
  const excMatcher = compileBooleanExpr(f.palavrasExcluir);

  if (isContratacaoMode(mode)) {
    let items = allResults;

    if (f.situacaoCompraId) items = items.filter((c) => String(c.situacaoCompraId) === f.situacaoCompraId);
    if (f.statusProposta) {
      const now = new Date();
      items = items.filter((c) => {
        if (f.statusProposta === "encerrada") return String(c.situacaoCompraId) !== "1";
        if (!c.dataEncerramentoProposta) return false;
        const enc = new Date(c.dataEncerramentoProposta);
        if (f.statusProposta === "a_receber") return enc >= now && String(c.situacaoCompraId) === "1";
        if (f.statusProposta === "em_julgamento") return enc < now && String(c.situacaoCompraId) === "1";
        return true;
      });
    }
    if (f.srp === "true") items = items.filter((c) => c.srp);
    else if (f.srp === "false") items = items.filter((c) => !c.srp);
    if (f.esferaId) items = items.filter((c) => c.orgaoEntidade?.esferaId === f.esferaId);
    if (f.poderId) items = items.filter((c) => c.orgaoEntidade?.poderId === f.poderId);
    if (f.tipoInstrumentoConvocatorio) {
      const cod = Number(f.tipoInstrumentoConvocatorio);
      items = items.filter((c) => c.tipoInstrumentoConvocatorioCodigo === cod);
    }
    if (f.municipioNome) {
      const m = f.municipioNome.toLowerCase().trim();
      items = items.filter((c) => c.unidadeOrgao?.municipioNome?.toLowerCase().includes(m));
    }
    if (f.nomeOrgao) {
      const n = f.nomeOrgao.toLowerCase().trim();
      items = items.filter((c) => c.orgaoEntidade?.razaoSocial?.toLowerCase().includes(n));
    }
    if (f.hasLinkExterno === "true") items = items.filter((c) => !!c.linkSistemaOrigem);
    else if (f.hasLinkExterno === "false") items = items.filter((c) => !c.linkSistemaOrigem);

    if (incMatcher) items = items.filter((c) => incMatcher(normalizeText(c.objetoCompra ?? "")));
    if (excMatcher) items = items.filter((c) => !excMatcher(normalizeText(c.objetoCompra ?? "")));

    const vMin = f.valorMinimo ? parseFloat(f.valorMinimo) : null;
    const vMax = f.valorMaximo ? parseFloat(f.valorMaximo) : null;
    if (vMin != null && !isNaN(vMin)) items = items.filter((c) => (c.valorTotalEstimado ?? 0) >= vMin);
    if (vMax != null && !isNaN(vMax)) items = items.filter((c) => (c.valorTotalEstimado ?? 0) <= vMax);

    const hMin = f.valorHomologadoMinimo ? parseFloat(f.valorHomologadoMinimo) : null;
    const hMax = f.valorHomologadoMaximo ? parseFloat(f.valorHomologadoMaximo) : null;
    if (hMin != null && !isNaN(hMin)) items = items.filter((c) => (c.valorTotalHomologado ?? 0) >= hMin);
    if (hMax != null && !isNaN(hMax)) items = items.filter((c) => (c.valorTotalHomologado ?? 0) <= hMax);

    return items;
  }

  if (isContratoMode(mode)) {
    let items = allResults;

    if (f.nomeOrgao) {
      const n = f.nomeOrgao.toLowerCase().trim();
      items = items.filter((c) => c.orgaoEntidade?.razaoSocial?.toLowerCase().includes(n));
    }
    const vMin = f.valorMinimo ? parseFloat(f.valorMinimo) : null;
    const vMax = f.valorMaximo ? parseFloat(f.valorMaximo) : null;
    if (vMin != null && !isNaN(vMin)) items = items.filter((c) => (c.valorInicial ?? 0) >= vMin);
    if (vMax != null && !isNaN(vMax)) items = items.filter((c) => (c.valorInicial ?? 0) <= vMax);
    if (incMatcher) items = items.filter((c) => incMatcher(normalizeText(c.objetoContrato ?? "")));
    if (excMatcher) items = items.filter((c) => !excMatcher(normalizeText(c.objetoContrato ?? "")));
    return items;
  }

  // Atas
  {
    let items = allResults;
    if (f.nomeOrgao) {
      const n = f.nomeOrgao.toLowerCase().trim();
      items = items.filter((c) => c.nomeOrgao?.toLowerCase().includes(n));
    }
    if (incMatcher) items = items.filter((c) => incMatcher(normalizeText(c.objetoContratacao ?? "")));
    if (excMatcher) items = items.filter((c) => !excMatcher(normalizeText(c.objetoContratacao ?? "")));
    return items;
  }
}
