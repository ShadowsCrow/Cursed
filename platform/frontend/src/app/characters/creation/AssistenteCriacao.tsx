import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import { IlustracaoDeEtapa } from "../../../ui/Arte";
import { Moldura, Pergaminho, TituloOrnado } from "../../../ui/Tema";
import { acharPorNome, useClasses, useListasFicha, useRacas } from "../sheet/catalogoApi";
import type { ApiClient } from "../types";
import { tamanhoVizinho, type ForaDaMedia } from "./altura";
import { ErroDeCriacao, useCriarPelaFicha, usePreviaCriacao } from "./api";
import {
  EtapaClasse, EtapaConceito, EtapaDistribuicao, EtapaIdentidade, EtapaPersonalidade, EtapaRaca,
} from "./CamposDasEtapas";
import { EtapaConferencia } from "./EtapaConferencia";
import { DEFINICOES, definicao, validarEtapa, type Erros } from "./etapas";
import { ETAPAS, ehEtapa, estadoInicial, indiceDa, montarFicha, type EstadoAssistente, type EtapaId } from "./modelo";
import { armazenamentoLocal, descartarRascunho, gravarRascunho, lerRascunho, resumoDoRascunho } from "./rascunho";

export interface AssistenteCriacaoProps {
  api: ApiClient;
  mesaId: string;
  userId: string;
  /** Chamado com o id do personagem criado. */
  onCriado: (personagemId: string) => void;
  onSair: () => void;
  /** Armazenamento do rascunho; `null` simula o navegador que bloqueia o `localStorage`. */
  armazenamento?: Storage | null;
}

const ATRASO_GRAVACAO_MS = 250;

/**
 * Assistente de criação de personagem (spec criacao-guiada-de-personagem). O estado vive no
 * cliente até a Conferência, que faz um único `POST` com a ficha montada (design D2); a etapa
 * atual fica em `?etapa=` para o botão Voltar do navegador e para recarregar a página.
 */
export function AssistenteCriacao({ api, mesaId, userId, onCriado, onSair, armazenamento: armazenamentoProp }: AssistenteCriacaoProps) {
  const armazenamento = useMemo(() => (armazenamentoProp === undefined ? armazenamentoLocal() : armazenamentoProp), [armazenamentoProp]);
  const [parametros, setParametros] = useSearchParams();
  const [salvo] = useState(() => lerRascunho(armazenamento, mesaId, userId));
  const retomarDireto = parametros.has("etapa") || parametros.get("retomar") === "1";
  const [decidindo, setDecidindo] = useState(salvo !== null && !retomarDireto);
  const [estado, setEstado] = useState<EstadoAssistente>(() => (salvo && retomarDireto ? salvo : estadoInicial()));
  const [tentou, setTentou] = useState<Partial<Record<EtapaId, boolean>>>({});
  const [avisoClasse, setAvisoClasse] = useState<string | null>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  const classes = useClasses(api, mesaId);
  const racas = useRacas(api, mesaId);
  const listas = useListasFicha(api, mesaId);
  const faixas = useMemo(() => listas.data?.faixas_de_altura ?? [], [listas.data]);
  const contexto = { classes: classes.data, racas: racas.data, faixas };

  const ficha = useMemo(() => montarFicha(estado.ficha), [estado.ficha]);
  const criar = useCriarPelaFicha(api, mesaId);

  // ---------------------------------------------------------------- navegação

  const valida = (etapa: EtapaId, alvo: EstadoAssistente = estado) =>
    Object.keys(validarEtapa(etapa, alvo, contexto)).length === 0;

  /** Etapas já alcançadas e com todas as anteriores válidas podem ser abertas pela lista. */
  function acessivel(etapa: EtapaId, alvo: EstadoAssistente = estado): boolean {
    const indice = indiceDa(etapa);
    return indice <= indiceDa(alvo.alcancada) && ETAPAS.slice(0, indice).every((anterior) => valida(anterior, alvo));
  }

  function irPara(etapa: EtapaId) {
    criar.reset();
    setEstado((atual) => ({ ...atual, etapa }));
    setParametros({ etapa });
  }

  // A URL manda (botão Voltar do navegador, link direto), se a etapa for acessível; senão, fica a
  // última etapa do estado e a URL é corrigida.
  const etapaNaUrl = parametros.get("etapa");
  const etapa: EtapaId = ehEtapa(etapaNaUrl) && acessivel(etapaNaUrl) ? etapaNaUrl : estado.etapa;
  useEffect(() => {
    if (!decidindo && etapaNaUrl !== etapa) setParametros({ etapa }, { replace: true });
  }, [decidindo, etapaNaUrl, etapa, setParametros]);

  const previa = usePreviaCriacao(api, mesaId, ficha, etapa === "conferencia" && !decidindo);

  // Foco no título a cada troca de etapa (não ao abrir a rota).
  const etapaAnterior = useRef<EtapaId | null>(null);
  useEffect(() => {
    if (decidindo) return;
    if (etapaAnterior.current !== null && etapaAnterior.current !== etapa) tituloRef.current?.focus();
    etapaAnterior.current = etapa;
  }, [etapa, decidindo]);

  // Rascunho: grava com pequeno atraso a cada alteração, só depois de o jogador começar.
  useEffect(() => {
    if (decidindo || criar.isSuccess) return;
    if (JSON.stringify(estado) === JSON.stringify(estadoInicial())) return;
    const tempo = window.setTimeout(() => gravarRascunho(armazenamento, mesaId, userId, { ...estado, etapa }), ATRASO_GRAVACAO_MS);
    return () => window.clearTimeout(tempo);
  }, [estado, etapa, decidindo, armazenamento, mesaId, userId, criar.isSuccess]);

  function avancar() {
    const erros = validarEtapa(etapa, estado, contexto);
    if (Object.keys(erros).length > 0) {
      setTentou((t) => ({ ...t, [etapa]: true }));
      return;
    }
    const proxima = ETAPAS[indiceDa(etapa) + 1];
    if (!proxima) return;
    setEstado((atual) => ({
      ...atual,
      etapa: proxima,
      alcancada: indiceDa(proxima) > indiceDa(atual.alcancada) ? proxima : atual.alcancada,
    }));
    setParametros({ etapa: proxima });
  }

  function voltar() {
    const anterior = ETAPAS[indiceDa(etapa) - 1];
    if (anterior) irPara(anterior);
  }

  // ---------------------------------------------------------------- alterações

  function alterarFicha(mudar: (f: EstadoAssistente["ficha"]) => EstadoAssistente["ficha"]) {
    setEstado((atual) => ({ ...atual, ficha: mudar(atual.ficha) }));
  }

  /** Fora da média, o Tamanho é o vizinho da raça; sem vizinho nessa direção, volta à média. */
  function comEstatura(personagem: EstadoAssistente["ficha"]["personagem"], raca: string, direcao: ForaDaMedia) {
    const vizinho = direcao ? tamanhoVizinho(faixas, acharPorNome(racas.data, raca)?.tamanho, direcao) : null;
    const fora: ForaDaMedia = vizinho ? direcao : "";
    return { ...personagem, raca, fora_da_media: fora, tamanho: vizinho?.tamanho ?? "" };
  }

  function escolherRaca(raca: string) {
    alterarFicha((f) => ({ ...f, personagem: comEstatura(f.personagem, raca, f.personagem.fora_da_media) }));
  }

  function escolherEstatura(direcao: ForaDaMedia) {
    alterarFicha((f) => ({ ...f, personagem: comEstatura(f.personagem, f.personagem.raca, direcao) }));
  }

  function escolherClasse(nome: string) {
    const nova = acharPorNome(classes.data, nome);
    const arquetipo = estado.ficha.personagem.arquetipo;
    const pertence = !arquetipo || Boolean(nova && acharPorNome(nova.arquetipos, arquetipo));
    setAvisoClasse(pertence ? null : `O arquétipo ${arquetipo} não pertence a ${nome}: escolha um arquétipo de ${nome}.`);
    alterarFicha((f) => ({ ...f, personagem: { ...f.personagem, classe: nome, arquetipo: pertence ? f.personagem.arquetipo : "" } }));
  }

  function sair() {
    if (JSON.stringify(estado) !== JSON.stringify(estadoInicial())) gravarRascunho(armazenamento, mesaId, userId, { ...estado, etapa });
    onSair();
  }

  // Trava síncrona: dois cliques antes de o estado "Criando…" renderizar não gravam duas vezes.
  const enviando = useRef(false);
  function concluir() {
    if (enviando.current) return;
    enviando.current = true;
    criar.mutate(ficha, {
      onSuccess: (dados) => {
        descartarRascunho(armazenamento, mesaId, userId);
        onCriado(dados.personagem_id);
      },
      onError: () => { enviando.current = false; },
    });
  }

  function descartarEComecar() {
    descartarRascunho(armazenamento, mesaId, userId);
    setEstado(estadoInicial());
    setDecidindo(false);
    setParametros({ etapa: "conceito" }, { replace: true });
  }

  function retomar() {
    if (salvo) setEstado(salvo);
    setDecidindo(false);
    setParametros({ etapa: salvo?.etapa ?? "conceito" }, { replace: true });
  }

  // ---------------------------------------------------------------- renderização

  if (decidindo && salvo) {
    const resumo = resumoDoRascunho(salvo);
    return (
      <section className="assistente assistente--retomada" aria-label="Rascunho de personagem">
        <Moldura variante="pergaminho">
          <Pergaminho className="assistente__folha-conteudo">
            <TituloOrnado nivel={2}>Você tem um rascunho</TituloOrnado>
            <p>{resumo.nome ? `${resumo.nome}, ` : "Um personagem sem nome, "}parado na etapa {resumo.etapa} de {resumo.total} ({definicao(salvo.etapa).titulo}).</p>
            <div className="assistente__acoes">
              <button type="button" className="button button--primary" onClick={retomar}>Continuar rascunho</button>
              <button type="button" className="button button--ghost" onClick={descartarEComecar}>Descartar e começar de novo</button>
            </div>
          </Pergaminho>
        </Moldura>
      </section>
    );
  }

  const indice = indiceDa(etapa);
  const def = definicao(etapa);
  const erros: Erros = tentou[etapa] ? validarEtapa(etapa, estado, contexto) : {};
  const problemasServidor = criar.error instanceof ErroDeCriacao && criar.error.problemas.length
    ? criar.error.problemas
    : previa.data?.problemas ?? [];
  const bloqueado = problemasServidor.length > 0 || criar.isPending;
  const carregandoCatalogo = classes.isPending || racas.isPending || listas.isPending;

  return (
    <section className="assistente" aria-label="Assistente de criação de personagem">
      <p className="sr-only" role="status" aria-live="polite">Etapa {indice + 1} de {ETAPAS.length}: {def.titulo}</p>
      <nav className="assistente__etapas" aria-label="Etapas da criação">
        <p className="assistente__progresso" aria-hidden="true">Etapa {indice + 1} de {ETAPAS.length}</p>
        <div className="assistente__barra" aria-hidden="true"><span style={{ width: `${((indice + 1) / ETAPAS.length) * 100}%` }} /></div>
        <ol>
          {DEFINICOES.map((d, i) => {
            const pode = acessivel(d.id);
            return (
              <li key={d.id} className={`assistente__etapa ${d.id === etapa ? "assistente__etapa--atual" : ""} ${i < indiceDa(estado.alcancada) ? "assistente__etapa--feita" : ""}`.trim()}>
                <button type="button" aria-current={d.id === etapa ? "step" : undefined} aria-disabled={!pode || undefined}
                  onClick={() => { if (pode && d.id !== etapa) irPara(d.id); }}>
                  <span className="assistente__numero" aria-hidden="true">{i + 1}</span>
                  <span>{d.titulo}</span>
                  {!pode && <span className="sr-only"> (ainda não disponível)</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <Moldura variante="pergaminho" className="assistente__folha">
        <IlustracaoDeEtapa etapa={etapa}>
          <span className="assistente__sobre-arte" aria-hidden="true">Etapa {indice + 1} de {ETAPAS.length}</span>
        </IlustracaoDeEtapa>
        <Pergaminho className="assistente__folha-conteudo" key={etapa}>
          <TituloOrnado ref={tituloRef} tabIndex={-1} nivel={2} id="assistente-titulo">{def.titulo}</TituloOrnado>
          <div className="assistente__orientacao">
            {def.orientacao.map((paragrafo) => <p key={paragrafo}>{paragrafo}</p>)}
            <p className="assistente__fonte">No livro: {def.fonte}.</p>
          </div>

          {carregandoCatalogo && etapa !== "conceito" && <p role="status">Carregando os dados do sistema…</p>}
          {etapa === "conceito" && <EtapaConceito />}
          {etapa === "identidade" && (
            <EtapaIdentidade ficha={estado.ficha} erros={erros} sexos={listas.data?.sexos}
              onChange={(campo, valor) => alterarFicha((f) => ({ ...f, personagem: { ...f.personagem, [campo]: valor } }))} />
          )}
          {etapa === "raca" && (
            <EtapaRaca racas={racas.data} ficha={estado.ficha} faixas={faixas} erros={erros}
              onEscolher={escolherRaca} onForaDaMedia={escolherEstatura}
              onAltura={(altura) => alterarFicha((f) => ({ ...f, personagem: { ...f.personagem, altura } }))} />
          )}
          {etapa === "classe" && (
            <EtapaClasse classes={classes.data} classe={estado.ficha.personagem.classe} arquetipo={estado.ficha.personagem.arquetipo}
              erros={erros} aviso={avisoClasse} onClasse={escolherClasse}
              onArquetipo={(arquetipo) => { setAvisoClasse(null); alterarFicha((f) => ({ ...f, personagem: { ...f.personagem, arquetipo } })); }} />
          )}
          {(etapa === "atributos" || etapa === "pericias") && (
            <EtapaDistribuicao categoria={etapa} valores={estado.ficha[etapa]} foraDoPadrao={estado.foraDoPadrao[etapa]} erros={erros}
              onValor={(nome, valor) => alterarFicha((f) => ({ ...f, [etapa]: { ...f[etapa], [nome]: valor } }))}
              onForaDoPadrao={(fora) => setEstado((atual) => ({ ...atual, foraDoPadrao: { ...atual.foraDoPadrao, [etapa]: fora } }))} />
          )}
          {etapa === "personalidade" && (
            <EtapaPersonalidade listas={listas.data} valores={estado.ficha.personalidade}
              onChange={(chave, valor) => alterarFicha((f) => ({ ...f, personalidade: { ...f.personalidade, [chave]: valor } }))} />
          )}
          {etapa === "conferencia" && (
            <EtapaConferencia estado={estado} classes={classes.data} listas={listas.data}
              previa={previa.data} carregando={previa.isFetching} erroPrevia={previa.isError ? previa.error.message : null}
              problemas={problemasServidor} onEditar={irPara} />
          )}

          {Object.keys(erros).length > 0 && (
            <p className="campo-erro assistente__bloqueio" role="alert">Revise o que está indicado acima para avançar.</p>
          )}
          {criar.isError && (
            <p className="campo-erro" role="alert">Erro: {criar.error.message} Suas escolhas foram mantidas; tente de novo.</p>
          )}

          <div className="assistente__acoes">
            {indice > 0 && <button type="button" className="button button--ghost" onClick={voltar}>Voltar</button>}
            {etapa !== "conferencia"
              ? <button type="button" className="button button--primary" onClick={avancar}>Avançar</button>
              : <button type="button" className="button button--primary" onClick={concluir} disabled={bloqueado}>
                  {criar.isPending ? "Criando…" : "Criar personagem"}
                </button>}
            <button type="button" className="button button--ghost assistente__sair" onClick={sair}>{armazenamento ? "Sair e guardar rascunho" : "Sair"}</button>
          </div>
        </Pergaminho>
      </Moldura>
    </section>
  );
}
