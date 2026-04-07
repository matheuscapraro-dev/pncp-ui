import type { CompraPublicacaoDTO } from "@/types/pncp";

/**
 * Priority scoring stub.
 * TODO: Define actual scoring parameters based on business rules.
 * Higher score = higher priority.
 */
export function calcularPrioridade(compra: CompraPublicacaoDTO): number {
  let score = 0;

  // Placeholder criteria — will be refined later
  if (compra.valorTotalEstimado != null && compra.valorTotalEstimado > 0) {
    score += Math.min(compra.valorTotalEstimado / 1_000_000, 10);
  }

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

  return Math.round(score * 100) / 100;
}
