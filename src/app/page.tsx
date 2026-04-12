import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Search,
  Filter,
  SlidersHorizontal,
  BarChart3,
  Eye,
  Bookmark,
  Bell,
  CalendarDays,
  ArrowRight,
  MousePointerClick,
  Layers,
  Star,
  ChevronRight,
} from "lucide-react";

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
      {n}
    </span>
  );
}

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-lg bg-primary/10 p-1.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[11px] font-mono font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[900px] space-y-6 px-3 py-4 pt-16 sm:px-4 sm:py-8 md:pt-8 pb-16">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="hidden sm:block rounded-lg bg-primary/10 p-2">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Como usar o PNCP Search</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Guia completo para buscar e monitorar licitações, contratos e atas do Portal Nacional de Contratações Públicas.
          </p>
        </div>
      </div>

      <Separator />

      {/* Overview */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <p className="text-sm leading-relaxed">
          O <strong>PNCP Search</strong> permite pesquisar contratações públicas do Brasil com filtros avançados,
          visualizar indicadores em tempo real e criar <strong>inscrições automáticas</strong> que rodam diariamente
          e trazem os resultados prontos para você. Use a <strong>barra lateral</strong> à esquerda para navegar
          entre a Consulta PNCP e suas Inscrições.
        </p>
      </div>

      {/* Table of Contents */}
      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold mb-2">Índice</h2>
        <ol className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
          {[
            "Tipos de Consulta",
            "Parâmetros de Busca (Camada API)",
            "Filtros Locais (Camada Cliente)",
            "Palavras-chave com Lógica Booleana",
            "Indicadores (KPIs)",
            "Tabela de Resultados",
            "Detalhes da Licitação",
            "Presets de Filtro",
            "Inscrições Automáticas",
            "Dicas e Atalhos",
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span>{i + 1}. {item}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* 1 — Search types */}
      <SectionCard icon={Layers} title="1. Tipos de Consulta">
        <p className="text-sm text-muted-foreground mb-3">
          No topo do formulário de busca há botões para escolher o tipo de consulta. Cada tipo consulta um endpoint diferente da API do PNCP:
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["Contratações (Publicação)", "Licitações publicadas recentemente."],
            ["Propostas Abertas", "Licitações com prazo de proposta em aberto."],
            ["Contratações (Atualização)", "Licitações atualizadas recentemente."],
            ["Contratos (Publicação)", "Contratos formalizados publicados."],
            ["Contratos (Atualização)", "Contratos com atualização recente."],
            ["Atas de Registro de Preço", "Atas de SRP publicadas."],
            ["Atas (Atualização)", "Atas com atualização recente."],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-lg border bg-muted/40 px-3 py-2">
              <span className="text-xs font-medium">{title}</span>
              <p className="text-[11px] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 2 — API parameters */}
      <SectionCard icon={Search} title="2. Parâmetros de Busca (Camada API)">
        <p className="text-sm text-muted-foreground mb-3">
          Esses campos são enviados diretamente à API do PNCP. Preencha-os antes de clicar em <strong>Buscar</strong>.
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <StepNumber n={1} />
            <div>
              <p className="text-sm font-medium">Período (Data Inicial / Data Final)</p>
              <p className="text-xs text-muted-foreground">
                Defina o intervalo de datas. Use os atalhos rápidos (<Kbd>7d</Kbd> <Kbd>15d</Kbd> <Kbd>30d</Kbd> <Kbd>60d</Kbd> <Kbd>90d</Kbd>)
                para preencher automaticamente.
                Para &quot;Propostas Abertas&quot; somente a Data Final é obrigatória.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={2} />
            <div>
              <p className="text-sm font-medium">Modalidade</p>
              <p className="text-xs text-muted-foreground">
                Obrigatório para contratações. Exemplos: Pregão Eletrônico, Concorrência, Dispensa, Inexigibilidade, Leilão, etc.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={3} />
            <div>
              <p className="text-sm font-medium">Filtros avançados da API <span className="text-muted-foreground font-normal">(clique em &quot;Mais Filtros&quot;)</span></p>
              <p className="text-xs text-muted-foreground">
                Expanda para ver: <strong>Modo de Disputa</strong>, <strong>UF</strong> (estado), <strong>CNPJ do Órgão</strong>,
                <strong> Código do Município (IBGE)</strong> e <strong>Código da Unidade Administrativa</strong>.
                Cada um desses reduz a consulta no servidor.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={4} />
            <div>
              <p className="text-sm font-medium">Clicar em Buscar</p>
              <p className="text-xs text-muted-foreground">
                A consulta é feita por streaming — os resultados aparecem à medida que chegam e a barra de progresso
                mostra &quot;Página X de Y&quot;.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 3 — Client-side filters */}
      <SectionCard icon={Filter} title="3. Filtros Locais (Camada Cliente)">
        <p className="text-sm text-muted-foreground mb-3">
          Após a busca, um painel de filtros aparece. Esses filtros são aplicados <strong>instantaneamente</strong> nos
          resultados já carregados, sem nova chamada à API.
        </p>
        <div className="space-y-2 text-xs">
          <div className="rounded-lg border p-3">
            <p className="font-medium text-sm mb-1">Busca por texto</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li><strong>Busca no Objeto</strong> — texto livre no nome/descrição da licitação.</li>
              <li><strong>Palavras-chave (incluir)</strong> — expressões booleanas para incluir (veja seção 4).</li>
              <li><strong>Palavras-chave (excluir)</strong> — expressões para remover resultados indesejados.</li>
            </ul>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium text-sm mb-1">Classificações (apenas contratações)</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li><strong>Situação</strong> — Divulgada, Revogada, Anulada, Suspensa.</li>
              <li><strong>SRP</strong> — Sim / Não / Todos.</li>
              <li><strong>Esfera</strong> — Federal, Estadual, Municipal, Distrital.</li>
              <li><strong>Poder</strong> — Executivo, Legislativo, Judiciário.</li>
              <li><strong>Instrumento Convocatório</strong> — tipo do instrumento.</li>
              <li><strong>Link Externo</strong> — se possui link para o sistema de origem.</li>
            </ul>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium text-sm mb-1">Órgão e Localização</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li><strong>Nome do Órgão</strong> — busca por texto na razão social.</li>
              <li><strong>Município</strong> — busca por texto no nome do município.</li>
            </ul>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium text-sm mb-1">Faixa de Valores</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li><strong>Valor Estimado Mín / Máx</strong> — filtra pelo valor estimado (R$).</li>
              <li><strong>Valor Homologado Mín / Máx</strong> — filtra pelo valor homologado (R$).</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* 4 — Boolean keywords */}
      <SectionCard icon={SlidersHorizontal} title="4. Palavras-chave com Lógica Booleana">
        <p className="text-sm text-muted-foreground mb-3">
          Os campos &quot;Incluir&quot; e &quot;Excluir&quot; aceitam expressões booleanas poderosas:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1.5 pr-3 font-medium">Sintaxe</th>
                <th className="text-left py-1.5 font-medium">Significado</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-1.5 pr-3"><Kbd>construção, reforma</Kbd></td>
                <td className="py-1.5">Vírgula = <strong>OU</strong>. Encontra qualquer um dos termos.</td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-3"><Kbd>construção AND reforma</Kbd></td>
                <td className="py-1.5"><strong>E</strong>. Ambos os termos devem estar presentes.</td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 pr-3"><Kbd>NOT manutenção</Kbd></td>
                <td className="py-1.5"><strong>NÃO</strong>. Exclui resultados com o termo.</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3"><Kbd>(obra OR reforma) AND NOT execução</Kbd></td>
                <td className="py-1.5">Parênteses para agrupar expressões complexas.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Essas expressões funcionam tanto no campo de incluir quanto no de excluir.
        </p>
      </SectionCard>

      {/* 5 — KPIs */}
      <SectionCard icon={BarChart3} title="5. Indicadores (KPIs)">
        <p className="text-sm text-muted-foreground mb-3">
          Após a busca, cards de indicadores aparecem no topo dos resultados:
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["Total na API", "Quantidade total de registros retornados pela API."],
            ["Após Filtros", "Quantidade de registros após aplicar os filtros locais."],
            ["Valor Estimado", "Soma e média dos valores estimados dos resultados filtrados."],
            ["Valor Homologado", "Soma e média dos valores homologados."],
            ["SRP", "Quantidade de licitações com Sistema de Registro de Preço (apenas contratações)."],
          ].map(([title, desc]) => (
            <div key={title} className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <BarChart3 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              <div>
                <span className="text-xs font-medium">{title}</span>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 6 — Results table */}
      <SectionCard icon={Eye} title="6. Tabela de Resultados">
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            Os resultados aparecem em uma <strong>tabela</strong> (desktop) ou <strong>cards</strong> (mobile) com as colunas:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["Objeto", "Órgão", "UF", "Modalidade", "Estimado", "Homologado", "Publicação", "Situação"].map(col => (
              <span key={col} className="rounded-full border px-2 py-0.5 text-[11px] font-medium">{col}</span>
            ))}
          </div>
          <div className="space-y-1 mt-2">
            <p><strong>Badges de status:</strong></p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 text-[11px]">Divulgada</span>
              <span className="rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 text-[11px]">Revogada</span>
              <span className="rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 text-[11px]">Anulada</span>
              <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 text-[11px]">Suspensa</span>
            </div>
          </div>
          <p className="mt-1">
            <strong>Ordenação por prioridade:</strong> clique em &quot;Ordenar por prioridade&quot; para usar o algoritmo
            que favorece itens de engenharia com palavras-chave específicas.
          </p>
          <p>
            <strong>Paginação:</strong> escolha entre 20, 50, 100 ou 200 itens por página e use os botões de navegação no rodapé.
          </p>
        </div>
      </SectionCard>

      {/* 7 — Detail view */}
      <SectionCard icon={MousePointerClick} title="7. Detalhes da Licitação">
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            Clique em qualquer linha da tabela para abrir um <strong>painel lateral</strong> com informações completas:
          </p>
          <ul className="list-disc list-inside space-y-0.5">
            <li><strong>Objeto da Compra</strong> — descrição completa.</li>
            <li><strong>Valores</strong> — estimado, homologado, SRP (Sim/Não).</li>
            <li><strong>Datas</strong> — publicação, abertura de proposta, encerramento, inclusão, última atualização.</li>
            <li><strong>Órgão/Entidade</strong> — razão social, CNPJ, unidade administrativa, município, UF, processo.</li>
            <li><strong>Amparo Legal</strong> — base legal da contratação.</li>
          </ul>
          <p className="mt-1">
            No rodapé do painel há dois botões:
          </p>
          <ul className="list-disc list-inside space-y-0.5">
            <li><strong>Expandir</strong> — abre a licitação em página completa (<code>/licitacao/cnpj/ano/sequencial</code>).</li>
            <li><strong>Sistema de Origem</strong> — abre o link externo do sistema de compras, quando disponível.</li>
          </ul>
        </div>
      </SectionCard>

      {/* 8 — Presets */}
      <SectionCard icon={Bookmark} title="8. Presets de Filtro">
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            Salve combinações de filtros para reutilizar sem precisar configurar tudo novamente.
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <StepNumber n={1} />
              <p>Configure todos os filtros desejados (API + locais).</p>
            </div>
            <div className="flex items-start gap-2">
              <StepNumber n={2} />
              <p>Clique no botão <strong>&quot;Salvar preset&quot;</strong> (ícone de disquete).</p>
            </div>
            <div className="flex items-start gap-2">
              <StepNumber n={3} />
              <p>Dê um nome ao preset (máx. 80 caracteres).</p>
            </div>
            <div className="flex items-start gap-2">
              <StepNumber n={4} />
              <p>
                Escolha a janela de datas: <strong>&quot;Sem data&quot;</strong> (salva as datas fixas) ou um intervalo
                relativo (ex: &quot;últimos 30 dias&quot;, recalculado ao aplicar).
              </p>
            </div>
            <div className="flex items-start gap-2">
              <StepNumber n={5} />
              <p>O preset aparece como botão acima do formulário. Clique para aplicar, <strong>X</strong> para excluir.</p>
            </div>
          </div>
          <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <p className="text-[11px]">
              <Star className="inline h-3 w-3 text-primary mr-1" />
              <strong>Preset padrão incluído:</strong> &quot;Engenharia 500k+&quot; — busca por construção, obra, reforma, etc.,
              com valor estimado mínimo de R$ 500.000 e exclusão de &quot;execução&quot;.
            </p>
          </div>
          <p className="text-[11px]">Os presets são salvos no <strong>localStorage</strong> do navegador e persistem entre sessões.</p>
        </div>
      </SectionCard>

      {/* 9 — Subscriptions */}
      <SectionCard icon={Bell} title="9. Inscrições Automáticas">
        <div className="space-y-3 text-xs text-muted-foreground">
          <p>
            Crie inscrições para receber resultados <strong>automaticamente todos os dias</strong>, sem precisar refazer a busca.
          </p>

          <div className="rounded-lg border p-3 space-y-2">
            <p className="font-medium text-sm text-foreground">Como criar</p>
            <div className="flex items-start gap-2">
              <StepNumber n={1} />
              <p>Configure os filtros desejados na tela de consulta.</p>
            </div>
            <div className="flex items-start gap-2">
              <StepNumber n={2} />
              <p>Clique em <strong>&quot;Inscrever-se&quot;</strong> (ícone de sino).</p>
            </div>
            <div className="flex items-start gap-2">
              <StepNumber n={3} />
              <p>Dê um nome à inscrição (ex: &quot;Engenharia SP&quot;).</p>
            </div>
            <div className="flex items-start gap-2">
              <StepNumber n={4} />
              <p>Escolha uma janela de datas relativa (ex: &quot;últimos 30 dias&quot;) — ela é recalculada a cada execução automática.</p>
            </div>
            <div className="flex items-start gap-2">
              <StepNumber n={5} />
              <p>Revise o resumo dos filtros e confirme.</p>
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-1">
            <p className="font-medium text-sm text-foreground">Como funciona</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Um <strong>worker</strong> roda automaticamente e executa todas as inscrições.</li>
              <li>A janela de datas é recalculada a cada execução (ex: sempre &quot;últimos 30 dias&quot;).</li>
              <li>Todos os filtros (API + locais) são aplicados.</li>
              <li>Os resultados são armazenados e ficam prontos ao abrir o app.</li>
            </ul>
          </div>

          <div className="rounded-lg border p-3 space-y-1">
            <p className="font-medium text-sm text-foreground">Como acessar</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Na <strong>barra lateral</strong>, em &quot;Inscrições&quot;, clique no nome da inscrição.</li>
              <li>A página mostra três abas: <strong>Contratações</strong>, <strong>Contratos</strong> e <strong>Atas</strong>.</li>
              <li>Aplique filtros locais adicionais por cima dos resultados da inscrição.</li>
              <li>Use o botão <strong>▶ (play)</strong> para disparar uma execução manual imediata.</li>
              <li>O badge de status mostra: <strong>Pendente</strong>, <strong>Pronto</strong> ou <strong>Erro</strong>.</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* 10 — Tips */}
      <SectionCard icon={Star} title="10. Dicas e Atalhos">
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {[
            "Use os atalhos de data (7d, 15d, 30d) para configurar rapidamente o período.",
            "Combine filtros de API (UF, Modalidade) com filtros locais (palavras-chave, valor) para resultados precisos.",
            "O campo \"Excluir\" é útil para remover termos genéricos como \"manutenção\" ou \"limpeza\".",
            "Ative \"Ordenar por prioridade\" se busca licitações de engenharia — o algoritmo destaca automaticamente.",
            "Crie inscrições com janela relativa (ex: 30 dias) para monitoramento contínuo sem intervenção.",
            "Os presets são locais (navegador). Exporte-os criando uma inscrição equivalente para backup na nuvem.",
            "Use o tema escuro/claro no rodapé da barra lateral conforme sua preferência.",
            "Em mobile, acesse o menu pelo ícone de hambúrguer (☰) no topo esquerdo.",
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* CTA */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5 text-center space-y-2">
        <p className="text-sm font-medium">Pronto para começar?</p>
        <p className="text-xs text-muted-foreground">
          Acesse <strong>&quot;Consulta PNCP&quot;</strong> na barra lateral para fazer sua primeira busca.
        </p>
      </div>
    </div>
  );
}
