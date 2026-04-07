// ─── Pagination Envelope ─────────────────────────────────────────────────────
export interface PaginaRetorno<T> {
  data: T[];
  totalRegistros: number;
  totalPaginas: number;
  numeroPagina: number;
  paginasRestantes: number;
  empty: boolean;
}

// ─── Shared Sub-DTOs ─────────────────────────────────────────────────────────
export interface OrgaoEntidadeDTO {
  cnpj: string;
  razaoSocial: string;
  poderId: string;
  esferaId: string;
}

export interface UnidadeOrgaoDTO {
  ufNome: string;
  codigoUnidade: string;
  ufSigla: string;
  municipioNome: string;
  nomeUnidade: string;
  codigoIbge: string;
}

export interface AmparoLegalDTO {
  codigo: number;
  nome: string;
  descricao: string;
}

export interface FonteOrcamentariaDTO {
  codigo: number;
  nome: string;
  descricao: string;
  dataInclusao: string;
}

export interface CategoriaDTO {
  id: number;
  nome: string;
}

export interface TipoContratoDTO {
  id: number;
  nome: string;
}

// ─── Contratações (Licitações) ───────────────────────────────────────────────

/** Returned by /v1/contratacoes/publicacao, /proposta, /atualizacao */
export interface CompraPublicacaoDTO {
  dataAtualizacao: string;
  tipoInstrumentoConvocatorioNome: string;
  orgaoEntidade: OrgaoEntidadeDTO;
  anoCompra: number;
  sequencialCompra: number;
  numeroCompra: string;
  processo: string;
  objetoCompra: string;
  orgaoSubRogado: OrgaoEntidadeDTO | null;
  unidadeOrgao: UnidadeOrgaoDTO;
  unidadeSubRogada: UnidadeOrgaoDTO | null;
  valorTotalHomologado: number | null;
  srp: boolean;
  dataInclusao: string;
  amparoLegal: AmparoLegalDTO;
  dataAberturaProposta: string | null;
  dataEncerramentoProposta: string | null;
  informacaoComplementar: string | null;
  linkSistemaOrigem: string | null;
  justificativaPresencial: string | null;
  dataPublicacaoPncp: string;
  modalidadeId: number;
  dataAtualizacaoGlobal: string;
  linkProcessoEletronico: string | null;
  numeroControlePNCP: string;
  modoDisputaId: number;
  tipoInstrumentoConvocatorioCodigo: number;
  valorTotalEstimado: number | null;
  modalidadeNome: string;
  modoDisputaNome: string;
  fontesOrcamentarias: FonteOrcamentariaDTO[];
  situacaoCompraId: SituacaoCompraId;
  situacaoCompraNome: string;
  usuarioNome: string;
}

/** Returned by /v1/orgaos/{cnpj}/compras/{ano}/{sequencial} */
export interface CompraDetalheDTO {
  valorTotalEstimado: number | null;
  valorTotalHomologado: number | null;
  orcamentoSigilosoCodigo: number;
  orcamentoSigilosoDescricao: string;
  numeroControlePNCP: string;
  linkSistemaOrigem: string | null;
  linkProcessoEletronico: string | null;
  anoCompra: number;
  sequencialCompra: number;
  numeroCompra: string;
  processo: string;
  orgaoEntidade: OrgaoEntidadeDTO;
  unidadeOrgao: UnidadeOrgaoDTO;
  orgaoSubRogado: OrgaoEntidadeDTO | null;
  unidadeSubRogada: UnidadeOrgaoDTO | null;
  modalidadeId: number;
  modalidadeNome: string;
  justificativaPresencial: string | null;
  modoDisputaId: number;
  modoDisputaNome: string;
  tipoInstrumentoConvocatorioCodigo: number;
  tipoInstrumentoConvocatorioNome: string;
  amparoLegal: AmparoLegalDTO;
  objetoCompra: string;
  informacaoComplementar: string | null;
  srp: boolean;
  fontesOrcamentarias: FonteOrcamentariaDTO[];
  dataPublicacaoPncp: string;
  dataAberturaProposta: string | null;
  dataEncerramentoProposta: string | null;
  situacaoCompraId: SituacaoCompraId;
  situacaoCompraNome: string;
  existeResultado: boolean;
  dataInclusao: string;
  dataAtualizacao: string;
  dataAtualizacaoGlobal: string;
  usuarioNome: string;
}

// ─── Contratos ───────────────────────────────────────────────────────────────

export interface ContratoDTO {
  numeroControlePncpCompra: string | null;
  codigoPaisFornecedor: string | null;
  dataAtualizacao: string;
  orgaoEntidade: OrgaoEntidadeDTO;
  dataAssinatura: string;
  dataVigenciaInicio: string;
  dataVigenciaFim: string;
  niFornecedor: string;
  tipoPessoa: TipoPessoa;
  processo: string;
  orgaoSubRogado: OrgaoEntidadeDTO | null;
  unidadeOrgao: UnidadeOrgaoDTO;
  unidadeSubRogada: UnidadeOrgaoDTO | null;
  nomeRazaoSocialFornecedor: string;
  informacaoComplementar: string | null;
  categoriaProcesso: CategoriaDTO;
  anoContrato: number;
  tipoContrato: TipoContratoDTO;
  numeroContratoEmpenho: string;
  sequencialContrato: number;
  dataPublicacaoPncp: string;
  niFornecedorSubContratado: string | null;
  nomeFornecedorSubContratado: string | null;
  dataAtualizacaoGlobal: string;
  numeroControlePNCP: string;
  receita: boolean;
  numeroParcelas: number;
  numeroRetificacao: number;
  tipoPessoaSubContratada: TipoPessoa | null;
  objetoContrato: string;
  valorInicial: number;
  valorParcela: number;
  valorGlobal: number;
  valorAcumulado: number;
  identificadorCipi: string | null;
  urlCipi: string | null;
  usuarioNome: string;
}

// ─── Atas de Registro de Preço ───────────────────────────────────────────────

export interface AtaRegistroPrecoDTO {
  numeroControlePNCPAta: string;
  numeroAtaRegistroPreco: string;
  anoAta: number;
  numeroControlePNCPCompra: string;
  cancelado: boolean;
  dataCancelamento: string | null;
  dataAssinatura: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  dataPublicacaoPncp: string;
  dataInclusao: string;
  dataAtualizacao: string;
  dataAtualizacaoGlobal: string;
  usuario: string;
  objetoContratacao: string;
  cnpjOrgao: string;
  nomeOrgao: string;
  cnpjOrgaoSubrogado: string | null;
  nomeOrgaoSubrogado: string | null;
  codigoUnidadeOrgao: string;
  nomeUnidadeOrgao: string;
  codigoUnidadeOrgaoSubrogado: string | null;
  nomeUnidadeOrgaoSubrogado: string | null;
}

// ─── Enums ───────────────────────────────────────────────────────────────────

export type SituacaoCompraId = "1" | "2" | "3" | "4";

export type TipoPessoa = "PJ" | "PF" | "PE";

// ─── Filter Params ───────────────────────────────────────────────────────────

export interface ContratacaoPublicacaoParams {
  dataInicial: string;
  dataFinal: string;
  codigoModalidadeContratacao: number;
  pagina: number;
  tamanhoPagina?: number;
  codigoModoDisputa?: number;
  uf?: string;
  codigoMunicipioIbge?: string;
  cnpj?: string;
  codigoUnidadeAdministrativa?: string;
}

export interface ContratacaoPropostaParams {
  dataFinal: string;
  pagina: number;
  tamanhoPagina?: number;
  codigoModalidadeContratacao?: number;
  uf?: string;
  codigoMunicipioIbge?: string;
  cnpj?: string;
  codigoUnidadeAdministrativa?: string;
}

export interface ContratacaoAtualizacaoParams {
  dataInicial: string;
  dataFinal: string;
  codigoModalidadeContratacao: number;
  pagina: number;
  tamanhoPagina?: number;
  codigoModoDisputa?: number;
  uf?: string;
  codigoMunicipioIbge?: string;
  cnpj?: string;
  codigoUnidadeAdministrativa?: string;
}

export interface ContratosParams {
  dataInicial: string;
  dataFinal: string;
  pagina: number;
  tamanhoPagina?: number;
  cnpjOrgao?: string;
  codigoUnidadeAdministrativa?: string;
  usuarioId?: number;
}

export interface ContratosAtualizacaoParams {
  dataInicial: string;
  dataFinal: string;
  pagina: number;
  tamanhoPagina?: number;
  cnpjOrgao?: string;
  codigoUnidadeAdministrativa?: string;
  usuarioId?: number;
}

export interface AtasParams {
  dataInicial: string;
  dataFinal: string;
  pagina: number;
  tamanhoPagina?: number;
  cnpj?: string;
  codigoUnidadeAdministrativa?: string;
}

export interface AtasAtualizacaoParams {
  dataInicial: string;
  dataFinal: string;
  pagina: number;
  tamanhoPagina?: number;
  cnpj?: string;
  codigoUnidadeAdministrativa?: string;
}

// ─── App-level types ─────────────────────────────────────────────────────────

export type SearchMode =
  | "publicacao"
  | "proposta"
  | "atualizacao"
  | "contratos"
  | "contratos_atualizacao"
  | "atas"
  | "atas_atualizacao";

export interface FilterState {
  searchMode: SearchMode;
  dataInicial: string;
  dataFinal: string;
  codigoModalidadeContratacao: number | null;
  codigoModoDisputa: number | null;
  uf: string;
  codigoMunicipioIbge: string;
  cnpj: string;
  textoBusca: string;
  pagina: number;
  tamanhoPagina: number;
  // Server-side API param (all endpoints)
  codigoUnidadeAdministrativa: string;
  // Extended client-side filters (contratações)
  situacaoCompraId: string;
  srp: string; // "" | "true" | "false"
  valorMinimo: string;
  valorMaximo: string;
  // Keyword filters (comma-separated, client-side OR matching on objetoCompra)
  palavrasIncluir: string;
  palavrasExcluir: string;
  // Additional client-side filters
  esferaId: string;       // "" | "F" | "E" | "M" | "D"
  poderId: string;        // "" | "E" | "L" | "J"
  tipoInstrumentoConvocatorio: string; // filter by tipoInstrumentoConvocatorioCodigo
  municipioNome: string;  // text match on unidadeOrgao.municipioNome
  nomeOrgao: string;      // text match on orgaoEntidade.razaoSocial
  hasLinkExterno: string;  // "" | "true" | "false"
  valorHomologadoMinimo: string;
  valorHomologadoMaximo: string;
}

export interface KpiData {
  totalResultados: number;
  valorTotalEstimado: number;
  valorTotalHomologado: number;
  totalPagina: number;
  srpCount: number;
}

export interface FilterPreset {
  id: string;
  nome: string;
  filters: Partial<FilterState>;
  createdAt: string;
}
