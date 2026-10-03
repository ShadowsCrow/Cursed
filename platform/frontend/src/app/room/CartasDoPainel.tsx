import { useMemo, useState } from "react";

import type { components } from "../../api/generated/schema";
import { useAssetImage } from "../assets/useAssetImage";
import { useCartasDosPersonagens, useCatalogo } from "../cards/api";
import { ApresentarDialog, EnviarCartaDialog, NovaOfertaDialog } from "../cards/NarratorLibrary";
import { PlayerLibrary } from "../cards/PlayerLibrary";
import { ROTULO_TIPO, type CartaVersaoResumo, type TipoCarta } from "../cards/types";
import { usePersonagens } from "../characters/api";
import { useCatalogoItens, type CatalogoItens } from "../characters/sheet/catalogoApi";
import { categoriaDaCarta, ehCorpo, imagemPropria, rotuloDaCategoria } from "../characters/sheet/cartas/apresentacao";
import { arteDoMedalhao, usePintura } from "../characters/sheet/cartas/pinturasDasCartas";
import type { ApiClient } from "../characters/types";
import { IconeCategoria } from "../inventory/iconesItem";

type CartaDoPersonagem = components["schemas"]["CartaPersonagemResumo"];
type Conteudo = Record<string, unknown>;

const ESTADO_DA_CARTA: Record<CartaDoPersonagem["estado"], string> = {
  disponivel: "Disponível para aprender",
  em_aprendizado: "Em aprendizado",
  aprendida: "Aprendida",
  no_inventario: "No inventário",
  aplicada: "Aplicada",
  removida: "Removida",
};

/** Grupo do filtro: o tipo da carta, com os corpos do sistema separados dos itens (item 6). */
type GrupoDoFiltro = TipoCarta | "corpo";
const grupoDoFiltro = (tipo: TipoCarta, conteudo: Conteudo): GrupoDoFiltro => (ehCorpo(tipo, conteudo) ? "corpo" : tipo);
/** "Todas" deixa os corpos de fora: eles aparecem só com o filtro "Corpos" (pedido do usuário, 2026-10-03). */
const noFiltro = (grupo: GrupoDoFiltro, tipo: GrupoDoFiltro | null) => (tipo ? grupo === tipo : grupo !== "corpo");
const rotuloDoTipo = (tipo: TipoCarta, conteudo: Conteudo) => (ehCorpo(tipo, conteudo) ? "Corpo" : ROTULO_TIPO[tipo]);

/** Opções do filtro por tipo, na ordem em que aparecem. */
const GRUPOS_DO_FILTRO: { id: GrupoDoFiltro; rotulo: string }[] = [
  { id: "habilidade", rotulo: "Habilidades" },
  { id: "magia", rotulo: "Magias" },
  { id: "item", rotulo: "Itens" },
  { id: "corpo", rotulo: "Corpos" },
  { id: "efeito", rotulo: "Efeitos" },
];

const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
const tituloDa = (conteudo: Conteudo) => String(conteudo.titulo ?? "") || "Sem título";

/** Filtro por tipo: Todas e só os tipos presentes, com contagem; a opção atual fica pressionada. */
function FiltroDeTipo({ tipos, valor, onMudar }: { tipos: readonly GrupoDoFiltro[]; valor: GrupoDoFiltro | null; onMudar: (tipo: GrupoDoFiltro | null) => void }) {
  const contagem = (tipo: GrupoDoFiltro) => tipos.filter((t) => t === tipo).length;
  const presentes = GRUPOS_DO_FILTRO.filter((opcao) => contagem(opcao.id) > 0);
  if (tipos.length === 0) return null;
  return (
    <div className="cartas-painel__filtro" role="group" aria-label="Filtrar por tipo">
      <button type="button" aria-pressed={valor === null} onClick={() => onMudar(null)}>Todas <span>{tipos.filter((t) => noFiltro(t, null)).length}</span></button>
      {presentes.map((opcao) => (
        <button key={opcao.id} type="button" aria-pressed={valor === opcao.id} onClick={() => onMudar(opcao.id)}>
          {opcao.rotulo} <span>{contagem(opcao.id)}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Miniatura da arte: a imagem própria enviada pelo Narrador; sem ela, o medalhão pintado da categoria (o emblema
 * aproximado, legível em 56 px); sem nenhuma, o ícone da categoria.
 */
function MiniaturaDaCarta({ api, mesaId, tipo, conteudo, catalogo }: {
  api: ApiClient; mesaId: string; tipo: TipoCarta; conteudo: Conteudo; catalogo: CatalogoItens | undefined;
}) {
  const propria = imagemPropria(conteudo);
  const imagem = useAssetImage(api, mesaId, propria ?? "", { exibicao: true, enabled: Boolean(propria) });
  const categoria = categoriaDaCarta({ id: "", tipo, concedida_por: null, carta: { conteudo } }, catalogo);
  const pintura = arteDoMedalhao(categoria);
  const estado = usePintura(pintura);
  const fonte = imagem.data ?? (estado === "pronta" ? pintura : undefined);
  return (
    <span className="cartas-painel__miniatura" aria-hidden="true" data-arte={imagem.data ? "propria" : fonte ? "categoria" : "reserva"}>
      {fonte ? <img src={fonte} alt="" decoding="async" /> : <IconeCategoria icone={rotuloDaCategoria(categoria, catalogo).icone} tamanho={30} />}
    </span>
  );
}

type Acao = { tipo: "enviar" | "ofertar" | "apresentar"; versao: CartaVersaoResumo };

/** Narrador: cartas já publicadas, com busca e filtro por tipo, para enviar, ofertar ou apresentar. Criar e editar fica na Biblioteca. */
function CartasDoNarrador({ api, mesaId }: { api: ApiClient; mesaId: string }) {
  const catalogo = useCatalogo(api, mesaId);
  const itens = useCatalogoItens(api, mesaId);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<GrupoDoFiltro | null>(null);
  const [acao, setAcao] = useState<Acao | null>(null);
  const [aviso, setAviso] = useState("");
  const publicadas = useMemo(() => (catalogo.data ?? []).filter((d) => !d.arquivada)
    .map((d) => d.publicada).filter((v): v is CartaVersaoResumo => Boolean(v)), [catalogo.data]);
  const termo = normalizar(busca.trim());
  const buscadas = termo ? publicadas.filter((v) => normalizar(tituloDa(v.conteudo)).includes(termo)) : publicadas;
  const visiveis = buscadas.filter((v) => noFiltro(grupoDoFiltro(v.tipo, v.conteudo), tipo));

  return (
    <div className="cartas-painel">
      <label className="cartas-painel__busca">
        <span className="sr-only">Buscar cartas</span>
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cartas…" aria-label="Buscar cartas" />
      </label>
      <FiltroDeTipo tipos={buscadas.map((v) => grupoDoFiltro(v.tipo, v.conteudo))} valor={tipo} onMudar={setTipo} />
      <p role="status" className="cartas-painel__aviso">{aviso}</p>
      {catalogo.isPending && <p role="status">Carregando cartas…</p>}
      {catalogo.isError && <p role="alert">{catalogo.error.message}</p>}
      {catalogo.isSuccess && publicadas.length === 0 && <p>Nenhuma carta publicada ainda. Crie e publique na Biblioteca.</p>}
      {catalogo.isSuccess && publicadas.length > 0 && visiveis.length === 0 && <p>Nenhuma carta com esse filtro.</p>}
      <ul className="cartas-painel__lista">
        {visiveis.map((versao) => {
          const titulo = tituloDa(versao.conteudo);
          return (
            <li key={versao.id} className="cartas-painel__carta">
              <MiniaturaDaCarta api={api} mesaId={mesaId} tipo={versao.tipo} conteudo={versao.conteudo} catalogo={itens.data} />
              <div className="cartas-painel__texto">
                <span className="cartas-painel__tipo">{rotuloDoTipo(versao.tipo, versao.conteudo)}</span>
                <strong>{titulo}</strong>
                <div className="cartas-painel__acoes">
                  <button type="button" aria-label={`Enviar “${titulo}”`} onClick={() => setAcao({ tipo: "enviar", versao })}>Enviar</button>
                  <button type="button" aria-label={`Ofertar “${titulo}”`} onClick={() => setAcao({ tipo: "ofertar", versao })}>Ofertar</button>
                  <button type="button" aria-label={`Apresentar “${titulo}”`} onClick={() => setAcao({ tipo: "apresentar", versao })}>Apresentar</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {acao?.tipo === "enviar" && <EnviarCartaDialog api={api} mesaId={mesaId} versao={acao.versao}
        onEnviada={(texto) => { setAviso(texto); setAcao(null); }} onClose={() => setAcao(null)} />}
      {acao?.tipo === "ofertar" && <NovaOfertaDialog api={api} mesaId={mesaId} publicadas={publicadas}
        inicial={[acao.versao.id]} onClose={() => setAcao(null)} />}
      {acao?.tipo === "apresentar" && <ApresentarDialog api={api} mesaId={mesaId} versao={acao.versao} onClose={() => setAcao(null)} />}
    </div>
  );
}

/** Jogador: as ofertas que aguardam a escolha dele e as cartas dos próprios personagens, com filtro por tipo. */
function CartasDoJogador({ api, mesaId, userId }: { api: ApiClient; mesaId: string; userId: string }) {
  const personagens = usePersonagens(api, mesaId, false);
  const itens = useCatalogoItens(api, mesaId);
  const [tipo, setTipo] = useState<GrupoDoFiltro | null>(null);
  const proprios = (personagens.data ?? []).filter((p) => p.proprietario_id === userId);
  const consultas = useCartasDosPersonagens(api, mesaId, proprios.map((p) => p.id));
  const ativasDe = (indice: number) => (consultas[indice]?.data ?? []).filter((c) => c.estado !== "removida");
  const todosOsTipos = proprios.flatMap((_, indice) => ativasDe(indice).map((c) => grupoDoFiltro(c.tipo, c.carta.conteudo)));
  return (
    <div className="cartas-painel">
      <PlayerLibrary api={api} mesaId={mesaId} />
      {personagens.isError && <p role="alert">{personagens.error.message}</p>}
      {personagens.isSuccess && proprios.length === 0 && <p>Você ainda não tem personagem nesta mesa.</p>}
      <FiltroDeTipo tipos={todosOsTipos} valor={tipo} onMudar={setTipo} />
      {proprios.map((personagem, indice) => {
        const consulta = consultas[indice];
        const cartas = ativasDe(indice).filter((c) => noFiltro(grupoDoFiltro(c.tipo, c.carta.conteudo), tipo));
        return (
          <section key={personagem.id} className="cartas-painel__personagem" aria-label={`Cartas de ${personagem.nome}`}>
            <h3>{personagem.nome}</h3>
            {consulta?.isPending && <p role="status">Carregando cartas…</p>}
            {consulta?.isError && <p role="alert">{consulta.error.message}</p>}
            {consulta?.isSuccess && cartas.length === 0 && <p>{tipo ? "Nenhuma carta desse tipo." : "Nenhuma carta ainda."}</p>}
            <ul className="cartas-painel__lista">
              {cartas.map((carta) => (
                <li key={carta.id} className="cartas-painel__carta">
                  <MiniaturaDaCarta api={api} mesaId={mesaId} tipo={carta.tipo} conteudo={carta.carta.conteudo} catalogo={itens.data} />
                  <div className="cartas-painel__texto">
                    <span className="cartas-painel__tipo">{rotuloDoTipo(carta.tipo, carta.carta.conteudo)}</span>
                    <strong>{tituloDa(carta.carta.conteudo)}</strong>
                    <span className="cartas-painel__estado">{ESTADO_DA_CARTA[carta.estado]}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** Aba Cartas do painel da Sala. */
export function CartasDoPainel({ api, mesaId, userId, narrator }: { api: ApiClient; mesaId: string; userId: string; narrator: boolean }) {
  return narrator ? <CartasDoNarrador api={api} mesaId={mesaId} /> : <CartasDoJogador api={api} mesaId={mesaId} userId={userId} />;
}
