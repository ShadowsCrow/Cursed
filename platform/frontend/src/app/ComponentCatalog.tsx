import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";

import { CommandPreviewDemo } from "./connectivity/CommandPreviewDemo";
import { ConnectivityBadge } from "./connectivity/ConnectivityBadge";
import { Confirmation } from "../ui/primitives/Confirmation";
import { Dialog } from "../ui/primitives/Dialog";
import { Menu } from "../ui/primitives/Menu";
import { Popover } from "../ui/primitives/Popover";
import { SidePanel } from "../ui/primitives/SidePanel";
import { Tooltip } from "../ui/primitives/Tooltip";
import { ContentCard, EffectIcon, EquipmentSlot, Glyph, Portrait, ResourceBar } from "../ui/Display";
import { EmblemaSimples, Marca, Moldura, Pergaminho, Selo, TituloOrnado } from "../ui/Tema";
import { AlternanciaSegmentada, Avatar, Icone, MolduraOrnamentada, PontosDeValor, type NomeIcone } from "../ui/Ornamentos";

function CatalogSection({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="panel panel--wide catalog-section">
      <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{description && <p>{description}</p>}</div></div>
      <div className="catalog-grid">{children}</div>
    </section>
  );
}

const ICONES: NomeIcone[] = ["livro", "pessoas", "busto", "rosa", "coroa", "pergaminho", "olho", "copiar", "porta", "lapis", "mais", "seta", "menu", "fechar", "sair"];

function NavegacaoCatalog() {
  const [lado, setLado] = useState<"narrando" | "jogando">("narrando");
  return (
    <CatalogSection eyebrow="NAVEGAÇÃO INICIAL" title="Moldura ornamentada, avatar, alternância, pontos e ícones" description="Mesma moldura SVG do Resumo da ficha (painel e quadro; noite, sangue, vazio e pergaminho); seleção também por aria-pressed/aria-current.">
      <MolduraOrnamentada className="catalog-item" tipo="painel" role="group" aria-label="Moldura ornamentada painel"><strong>Painel</strong><p>Conteúdo de uma seção.</p></MolduraOrnamentada>
      <MolduraOrnamentada className="catalog-item" role="group" aria-label="Moldura ornamentada quadro"><strong>Quadro</strong><p>Seções internas e itens.</p></MolduraOrnamentada>
      <MolduraOrnamentada className="catalog-item" selecionada role="group" aria-label="Moldura ornamentada selecionada"><strong>Selecionada</strong><p>Item atual da lista.</p></MolduraOrnamentada>
      <MolduraOrnamentada className="catalog-item" tipo="painel" fundo="pergaminho" role="group" aria-label="Moldura ornamentada em pergaminho">
        <PontosDeValor rotulo="Força" valor={2} />
        <PontosDeValor rotulo="Inteligência" valor={3} tom="arcano" />
        <PontosDeValor rotulo="Carisma" valor={7} tom="ouro" />
        <PontosDeValor rotulo="Vigor" valor={null} />
      </MolduraOrnamentada>
      <div className="catalog-item">
        <AlternanciaSegmentada rotulo="Exemplo de alternância" valor={lado} onChange={setLado}
          opcoes={[{ id: "narrando", rotulo: "Narrando", contagem: 2 }, { id: "jogando", rotulo: "Jogando", contagem: 1 }]} />
      </div>
      <div className="catalog-item" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <Avatar nome="Corvo Negro" tamanho={56} />
        <Avatar nome="Ana" tamanho={40} />
        <Avatar nome="Foto quebrada" src="/arte/nao-existe.webp" tamanho={40} />
      </div>
      <div className="catalog-item" style={{ display: "flex", flexWrap: "wrap", gap: ".8rem", color: "var(--ouro-300)" }}>
        {ICONES.map((nome) => <span key={nome} title={nome}><Icone nome={nome} tamanho={28} /></span>)}
      </div>
    </CatalogSection>
  );
}

function PrimitivesCatalog() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <CatalogSection eyebrow="PRIMITIVAS ACESSÍVEIS" title="Diálogo, painel, confirmação, popover, tooltip e menu" description="Foco preso e devolvido ao gatilho, Esc fecha, e navegação por teclado, toque e leitor de tela.">
      <div className="catalog-item">
        <button type="button" className="button button--secondary" onClick={() => setDialogOpen(true)}>Abrir diálogo</button>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Aplicar efeito" description="Escolha o alvo e a duração do efeito.">
          <label>Alvo <input type="text" /></label>
          <button type="button" className="button button--primary" onClick={() => setDialogOpen(false)}>Aplicar</button>
        </Dialog>
      </div>
      <div className="catalog-item">
        <button type="button" className="button button--secondary" onClick={() => setPanelOpen(true)}>Abrir painel lateral</button>
        <SidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Inventário">
          <p className="body-copy">Itens possuídos aparecerão aqui.</p>
        </SidePanel>
      </div>
      <div className="catalog-item">
        <button type="button" className="button button--secondary" onClick={() => setConfirmOpen(true)}>Excluir personagem</button>
        <Confirmation
          open={confirmOpen}
          title="Excluir personagem?"
          description="Esta ação pode ser desfeita durante o período de retenção."
          confirmLabel="Excluir"
          tone="danger"
          onConfirm={() => setConfirmOpen(false)}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
      <div className="catalog-item">
        <Popover label="Detalhes do exemplo" triggerContent={<span>Popover de exemplo</span>} triggerClassName="button button--ghost">
          <p className="body-copy">Conteúdo completo, acessível por hover, foco, clique e toque.</p>
        </Popover>
      </div>
      <div className="catalog-item">
        <Tooltip label="Texto curto de apoio">
          <button type="button" className="button button--ghost">Tooltip de exemplo</button>
        </Tooltip>
      </div>
      <div className="catalog-item">
        <Menu
          label="Ações do personagem"
          triggerContent={<span>Menu de exemplo</span>}
          triggerClassName="button button--ghost"
          items={[
            { id: "equip", label: "Equipar", onSelect: () => {} },
            { id: "unequip", label: "Desequipar", onSelect: () => {} },
            { id: "discard", label: "Descartar", onSelect: () => {} },
          ]}
        />
      </div>
    </CatalogSection>
  );
}

function PortraitCatalog() {
  return (
    <CatalogSection eyebrow="RETRATO" title="Com e sem imagem">
      <div className="catalog-item catalog-item--center">
        <Portrait name="Ari Teste" hue="violet" size="large" />
        <small>Sem imagem (iniciais ilustrativas)</small>
      </div>
      <div className="catalog-item catalog-item--center">
        <Portrait
          name="Mira Voss"
          hue="copper"
          size="large"
          imageUrl="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Crect width='160' height='160' fill='%23705888'/%3E%3Ccircle cx='80' cy='60' r='34' fill='%23f3efe8'/%3E%3Crect x='30' y='104' width='100' height='60' rx='24' fill='%23f3efe8'/%3E%3C/svg%3E"
        />
        <small>Com imagem (ilustrativa)</small>
      </div>
    </CatalogSection>
  );
}

function ResourceBarCatalog() {
  return (
    <CatalogSection eyebrow="BARRA DE RECURSO" title="Cheia, parcial, vazia e acima do máximo">
      <div className="catalog-item catalog-item--wide"><ResourceBar label="Pontos de Vida (cheia)" current={24} max={24} kind="life" /></div>
      <div className="catalog-item catalog-item--wide"><ResourceBar label="Pontos de Propósito (parcial)" current={7} max={12} kind="power" /></div>
      <div className="catalog-item catalog-item--wide"><ResourceBar label="Foco (vazio)" current={0} max={4} kind="focus" /></div>
      <div className="catalog-item catalog-item--wide"><ResourceBar label="Pontos de Vida (acima do máximo)" current={30} max={24} kind="life" /></div>
    </CatalogSection>
  );
}

function EffectIconCatalog() {
  return (
    <CatalogSection eyebrow="ÍCONE DE EFEITO" title="Detalhe completo por hover, foco, clique e toque">
      <div className="catalog-item catalog-item--center effect-strip">
        <EffectIcon name="Véu Protetor" symbol="✧" description="Reduz o dano recebido pelo alvo." origin="Mira Voss" duration="3 rodadas" endCondition="Termina ao final do combate" />
        <EffectIcon name="Vigília" symbol="◈" tone="gold" description="Atenção constante a perigos próximos." origin="Talento de Ari Teste" />
        <EffectIcon name="Passo Leve" symbol="◇" tone="teal" description="Movimento silencioso, sem chance de tropeço." />
        <span className="effect-strip__hint">Foque, toque ou clique para ver os detalhes completos</span>
      </div>
    </CatalogSection>
  );
}

function EquipmentSlotCatalog() {
  return (
    <CatalogSection eyebrow="SLOT DE EQUIPAMENTO" title="Vazio, ocupado e desabilitado">
      <div className="catalog-item catalog-item--wide">
        <EquipmentSlot category="ARMA" state="ocupado" item="Lâmina da Vigília" detail="Efeito aplicado enquanto equipada" icon="sword" onAction={() => {}} />
      </div>
      <div className="catalog-item catalog-item--wide">
        <EquipmentSlot category="ARMADURA" state="vazio" icon="shield" onAction={() => {}} />
      </div>
      <div className="catalog-item catalog-item--wide">
        <EquipmentSlot category="AMULETO" state="desabilitado" item="Amuleto selado" icon="star" disabledReason="Bloqueado pelo Narrador" />
      </div>
    </CatalogSection>
  );
}

function CardCatalog() {
  return (
    <CatalogSection eyebrow="CARTA BASE" title="Habilidade, magia, item e efeito" description="Custos exibidos como campos separados apenas quando informados.">
      <ContentCard
        kind="HABILIDADE"
        type="habilidade"
        title="Vigília Inabalável"
        description="Uma promessa feita ao grupo se torna atenção constante aos perigos da estrada."
        meta="Disponível para aprendizado"
        emblem="✧"
        costs={[{ label: "Custo de aprendizado", value: "2 pontos de habilidade (ilustrativo)" }, { label: "Custo de uso", value: "1 Ponto de Poder (ilustrativo)" }]}
      />
      <ContentCard
        kind="MAGIA"
        type="magia"
        title="Véu Protetor"
        description="Um manto de energia protege um aliado no momento de maior necessidade."
        meta="Aprendida"
        emblem="✦"
        costs={[{ label: "Custo de aprendizado", value: "3 pontos de magia (ilustrativo)" }, { label: "Custo de uso", value: "2 Pontos de Propósito (ilustrativo)" }]}
      />
      <ContentCard
        kind="ITEM"
        type="item"
        title="Lâmina da Vigília"
        description="Uma arma marcada por histórias de guardiões que nunca abandonaram seu posto."
        meta="Possuída · equipada"
        emblem="⚔"
      />
      <ContentCard
        kind="EFEITO"
        type="efeito"
        title="Vigília"
        description="Atenção constante a perigos próximos, concedida por um talento."
        meta="Ativo · sem custo de manutenção"
        emblem="◈"
      />
    </CatalogSection>
  );
}

function ConnectivityCatalog() {
  return (
    <CatalogSection eyebrow="CONECTIVIDADE" title="Estado de conexão e prévia local vs. confirmação remota" description="Dados simulados: nenhuma escrita real acontece nesta página.">
      <div className="catalog-item catalog-item--wide">
        <p><ConnectivityBadge /></p>
        <small>Reflete o estado real do navegador (navigator.onLine e os eventos online/offline).</small>
      </div>
      <div className="catalog-item catalog-item--wide">
        <CommandPreviewDemo />
      </div>
    </CatalogSection>
  );
}

const catalogQueryClient = new QueryClient();

/**
 * Catálogo visual isolado dos componentes de fundação (primitivas, retrato,
 * barra de recurso, ícone de efeito, slot de equipamento, carta base e
 * conectividade) em todos os seus estados, com dados fictícios e sem API.
 */
function TemaCatalog() {
  return (
    <CatalogSection eyebrow="TEMA" title="Moldura, pergaminho, título ornado, selo e marca" description="Ornamentos são decorativos: ocultos do leitor de tela, sem foco e sem clique.">
      <div className="catalog-item">
        <span className="catalog-label">Moldura sobre a noite</span>
        <Moldura className="catalogo-tema__moldura" aria-label="Exemplo de moldura noturna" role="group">
          <TituloOrnado nivel={3} sobretitulo="Campanha atual">O Véu de Aram</TituloOrnado>
          <p className="body-copy">Conteúdo na paleta noturna.</p>
        </Moldura>
      </div>
      <div className="catalog-item">
        <span className="catalog-label">Pergaminho dentro de moldura</span>
        <Moldura variante="pergaminho">
          <Pergaminho className="catalogo-tema__pergaminho" role="group" aria-label="Exemplo de pergaminho">
            <TituloOrnado nivel={3} sobretitulo="Etapa 5 de 8">Atributos</TituloOrnado>
            <label>Nome<input defaultValue="Lia Andarilha" /></label>
            <p className="campo-erro" role="alert">Erro: o nome é obrigatório.</p>
            <button type="button" className="button button--primary">Avançar</button>{" "}
            <button type="button" className="button button--ghost" disabled>Indisponível</button>
          </Pergaminho>
        </Moldura>
      </div>
      <div className="catalog-item">
        <span className="catalog-label">Selos (noite)</span>
        <div className="tag-row"><Selo>Destaque</Selo><Selo tom="sangue">Ativo</Selo><Selo tom="noite">Neutro</Selo></div>
        <span className="catalog-label">Selos (pergaminho)</span>
        <Pergaminho className="catalogo-tema__pergaminho"><div className="tag-row"><Selo>Destaque</Selo><Selo tom="sangue">Ativo</Selo></div></Pergaminho>
      </div>
      <div className="catalog-item">
        <span className="catalog-label">Marca detalhada, compacta e simplificada</span>
        <Marca />
        <Marca compacta subtitulo={null} tamanho={32} />
        <span className="catalogo-tema__emblema"><EmblemaSimples tamanho={16} /><EmblemaSimples tamanho={32} /></span>
      </div>
    </CatalogSection>
  );
}

export function ComponentCatalog() {
  return (
    <QueryClientProvider client={catalogQueryClient}>
      <div className="preview-content-standalone">
        <div className="demo-ribbon"><Glyph name="eye" size={15} /><span>Catálogo isolado de componentes, com dados fictícios. Nenhuma alteração é salva.</span><Link to="/preview">Voltar à prévia da mesa <Glyph name="arrow" size={14} /></Link></div>
        <main id="main-content" className="preview-content">
          <div className="screen-content">
            <div className="page-intro"><span className="eyebrow">DESIGN SYSTEM · CATÁLOGO</span><h1>Componentes em todos os estados</h1><p>Cada componente de fundação do frontend, isolado dos dados reais da mesa.</p></div>
            <TemaCatalog />
            <NavegacaoCatalog />
            <PrimitivesCatalog />
            <PortraitCatalog />
            <ResourceBarCatalog />
            <EffectIconCatalog />
            <EquipmentSlotCatalog />
            <CardCatalog />
            <ConnectivityCatalog />
          </div>
        </main>
      </div>
    </QueryClientProvider>
  );
}
