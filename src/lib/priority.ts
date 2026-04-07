import type { CompraPublicacaoDTO } from "@/types/pncp";

const ENGINEERING_KEYWORDS = [
  "engenharia", "construcao", "obra", "reforma", "pavimentacao",
  "ampliacao", "edificacao", "projeto", "infraestrutura", "saneamento",
];

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Priority scoring for procurement items.
 * Higher score = higher priority.
 */
export function calcularPrioridade(compra: CompraPublicacaoDTO): number {
  let score = 0;

  // Value component: up to 10 points based on estimated value
  if (compra.valorTotalEstimado != null && compra.valorTotalEstimado > 0) {
    score += Math.min(compra.valorTotalEstimado / 1_000_000, 10);
  }

  // Deadline urgency: closer deadlines score higher
  if (compra.dataEncerramentoProposta) {
    const days = Math.max(
      0,
      (new Date(compra.dataEncerramentoProposta).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    );
    if (days > 0 && days <= 7) score += 5;
    else if (days > 7 && days <= 30) score += 3;
    else if (days > 30) score += 1;
  }

  // Engineering bonus: +3 if objeto matches engineering keywords
  if (compra.objetoCompra) {
    const obj = normalize(compra.objetoCompra);
    if (ENGINEERING_KEYWORDS.some((kw) => obj.includes(kw))) {
      score += 3;
    }
  }

  // High-value bonus: +2 if estimated value >= R$500k
  if (compra.valorTotalEstimado != null && compra.valorTotalEstimado >= 500_000) {
    score += 2;
  }

  // Active bonus: +1 if Divulgada (situação 1)
  if (String(compra.situacaoCompraId) === "1") {
    score += 1;
  }

  // External link bonus: +0.5 if linkSistemaOrigem exists
  if (compra.linkSistemaOrigem) {
    score += 0.5;
  }

  return Math.round(score * 100) / 100;
}
