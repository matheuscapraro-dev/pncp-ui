export const MODALIDADES_CONTRATACAO = [
  { codigo: 1, nome: "Leilão - Eletrônico" },
  { codigo: 2, nome: "Diálogo Competitivo" },
  { codigo: 3, nome: "Concurso" },
  { codigo: 4, nome: "Concorrência - Eletrônica" },
  { codigo: 5, nome: "Concorrência - Presencial" },
  { codigo: 6, nome: "Pregão - Eletrônico" },
  { codigo: 7, nome: "Pregão - Presencial" },
  { codigo: 8, nome: "Dispensa de Licitação" },
  { codigo: 9, nome: "Inexigibilidade" },
  { codigo: 10, nome: "Manifestação de Interesse" },
  { codigo: 11, nome: "Pré-qualificação" },
  { codigo: 12, nome: "Credenciamento" },
  { codigo: 13, nome: "Leilão - Presencial" },
] as const;

export const MODOS_DISPUTA = [
  { codigo: 1, nome: "Aberto" },
  { codigo: 2, nome: "Fechado" },
  { codigo: 3, nome: "Aberto-Fechado" },
  { codigo: 4, nome: "Dispensa Com Disputa" },
  { codigo: 5, nome: "Não se aplica" },
  { codigo: 6, nome: "Fechado-Aberto" },
] as const;

export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
  "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

export const SITUACAO_COMPRA: Record<string, string> = {
  "1": "Divulgada",
  "2": "Revogada",
  "3": "Anulada",
  "4": "Suspensa",
};

export const DEFAULT_PAGE_SIZE = 20;
export const MIN_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE_CONTRATACOES = 50;
export const MAX_PAGE_SIZE_CONTRATOS = 500;

export const PNCP_API_BASE = "https://pncp.gov.br/api/consulta";
