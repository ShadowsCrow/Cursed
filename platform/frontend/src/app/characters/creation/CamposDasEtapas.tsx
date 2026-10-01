import { useId, useState, type ReactNode } from "react";

import type { ClasseCatalogo, ListasFicha, RacaCatalogo } from "../sheet/catalogoApi";
import { acharPorNome } from "../sheet/catalogoApi";
import { contarCaracteres } from "../sheet/fichaAccess";
import { GRUPOS_ATRIBUTOS, GRUPOS_PERICIAS } from "../sheet/sheetCatalog";
import {
  DISTRIBUICAO, LIMITES, TOTAL_PADRAO, VALORES_PADRAO, avaliar, mensagemSemVaga, problemas, textoFaltam, vagaPara,
  valorEfetivo, type Categoria, type Valores,
} from "./distribuicao";
import { intervaloAplicavel, tamanhoVizinho, textoIntervalo, type FaixaAltura, type ForaDaMedia } from "./altura";
import type { Erros } from "./etapas";
import { NOMES_ATRIBUTOS, NOMES_PERICIAS, exibir, type FichaRascunho, type ValorPersonalidade } from "./modelo";
import { lerTracos } from "../sheet/personalidade/tracos";
import { EditorDeTracos } from "../sheet/personalidade/TracosField";


const NAO_INFORMADO = "não informado";

function idCampo(caminho: string) {
  return `campo-${caminho.replace(/[^\w-]+/g, "-")}`;
}

/** Mensagem de erro presa ao campo; o texto sempre diz o problema (não só a cor). */
export function ErroDoCampo({ caminho, erros }: { caminho: string; erros: Erros }) {
  const mensagem = erros[caminho];
  if (!mensagem) return null;
  return <p id={`${idCampo(caminho)}-erro`} className="campo-erro">Erro: {mensagem}</p>;
}

function atributosDeErro(caminho: string, erros: Erros) {
  return erros[caminho]
    ? { "aria-invalid": true as const, "aria-describedby": `${idCampo(caminho)}-erro` }
    : {};
}

// ------------------------------------------------------------------ Conceito

export function EtapaConceito() {
  return (
    <div className="assistente__bloco">
      <h3 className="assistente__subtitulo">Perguntas para o seu conceito</h3>
      <ul className="assistente__lista">
        <li>Quem você pretende interpretar?</li>
        <li>O que o personagem sabe fazer?</li>
        <li>Por que ele participará desta história?</li>
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ Identidade

export function EtapaIdentidade({ ficha, erros, sexos, onChange }: {
  ficha: FichaRascunho;
  erros: Erros;
  sexos: string[] | undefined;
  onChange: (campo: "nome" | "idade" | "sexo", valor: string) => void;
}) {
  const p = ficha.personagem;
  return (
    <div className="assistente__campos">
      <label htmlFor={idCampo("personagem.nome")}>Nome (obrigatório)</label>
      <input id={idCampo("personagem.nome")} value={p.nome} autoComplete="off" required
        onChange={(e) => onChange("nome", e.target.value)} {...atributosDeErro("personagem.nome", erros)} />
      <ErroDoCampo caminho="personagem.nome" erros={erros} />

      <label htmlFor={idCampo("personagem.idade")}>Idade (opcional)</label>
      <input id={idCampo("personagem.idade")} value={p.idade} inputMode="numeric" autoComplete="off"
        onChange={(e) => onChange("idade", e.target.value)} {...atributosDeErro("personagem.idade", erros)} />
      <ErroDoCampo caminho="personagem.idade" erros={erros} />

      <label htmlFor={idCampo("personagem.sexo")}>Sexo (opcional)</label>
      <select id={idCampo("personagem.sexo")} value={p.sexo} onChange={(e) => onChange("sexo", e.target.value)}>
        <option value="">Não informado</option>
        {(sexos ?? []).map((sexo) => <option key={sexo} value={sexo}>{sexo}</option>)}
      </select>
    </div>
  );
}

// ------------------------------------------------------------------ Raça

function Habilidades({ titulo, nomes, vazio }: { titulo: string; nomes: string[]; vazio: string }) {
  return (
    <div className="assistente__habilidades">
      <h3>{titulo}</h3>
      {nomes.length > 0 ? <ul>{nomes.map((nome) => <li key={nome}>{nome}</li>)}</ul> : <p>{vazio}</p>}
    </div>
  );
}

export function EtapaRaca({ racas, ficha, faixas, erros, onEscolher, onAltura, onForaDaMedia }: {
  racas: RacaCatalogo[] | undefined;
  ficha: FichaRascunho;
  faixas: FaixaAltura[];
  erros: Erros;
  onEscolher: (raca: string) => void;
  onAltura: (altura: string) => void;
  onForaDaMedia: (direcao: ForaDaMedia) => void;
}) {
  const p = ficha.personagem;
  const escolhida = acharPorNome(racas, p.raca);
  const acima = escolhida ? tamanhoVizinho(faixas, escolhida.tamanho, "acima") : null;
  const abaixo = escolhida ? tamanhoVizinho(faixas, escolhida.tamanho, "abaixo") : null;
  const intervalo = intervaloAplicavel(escolhida, p.fora_da_media, faixas);
  const foraComTamanho = Boolean(p.fora_da_media && p.tamanho);
  const idAltura = idCampo("personagem.altura");
  return (
    <div className="assistente__campos">
      <fieldset className="opcoes" {...atributosDeErro("personagem.raca", erros)}>
        <legend>Raça</legend>
        <div className="opcoes__grade">
          {(racas ?? []).map((raca) => (
            <label key={raca.nome} className="opcao-cartao">
              <input type="radio" name="raca" value={raca.nome} checked={escolhida?.nome === raca.nome} onChange={() => onEscolher(raca.nome)} />
              <span className="opcao-cartao__nome">{raca.nome}</span>
              <small>{raca.tamanho ?? `Tamanho ${NAO_INFORMADO}`} · {raca.deslocamento != null ? `${raca.deslocamento} m` : `Deslocamento ${NAO_INFORMADO}`}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <ErroDoCampo caminho="personagem.raca" erros={erros} />
      {escolhida && (
        <section className="assistente__detalhe" aria-label={`O que a raça ${escolhida.nome} significa`}>
          <dl className="assistente__dados">
            <div><dt>Tamanho</dt><dd>{foraComTamanho ? `${p.tamanho} (fora da média; ${escolhida.tamanho} na raça)` : escolhida.tamanho ?? NAO_INFORMADO}</dd></div>
            <div><dt>Deslocamento</dt><dd>{escolhida.deslocamento != null ? `${escolhida.deslocamento} metros` : NAO_INFORMADO}</dd></div>
            <div><dt>Altura típica</dt><dd>{escolhida.altura ? textoIntervalo(escolhida.altura) : NAO_INFORMADO}</dd></div>
          </dl>
          <Habilidades titulo="Habilidades raciais recebidas" nomes={escolhida.habilidades.map((h) => h.nome)}
            vazio="Não há habilidades registradas para esta raça no catálogo." />
        </section>
      )}
      {escolhida && (
        <fieldset className="opcoes" {...atributosDeErro("personagem.tamanho", erros)}>
          <legend>Altura</legend>
          <div className="opcoes__lista" role="radiogroup" aria-label="Estatura">
            <label className="opcao-cartao opcao-cartao--larga">
              <input type="radio" name="estatura" checked={!p.fora_da_media} onChange={() => onForaDaMedia("")} />
              <span className="opcao-cartao__nome">Na média da raça</span>
              <small>{escolhida.tamanho}{escolhida.altura ? `, ${textoIntervalo(escolhida.altura)}` : ""}</small>
            </label>
            {acima && (
              <label className="opcao-cartao opcao-cartao--larga">
                <input type="radio" name="estatura" checked={p.fora_da_media === "acima"} onChange={() => onForaDaMedia("acima")} />
                <span className="opcao-cartao__nome">Mais alto que a média</span>
                <small>Passa a {acima.tamanho}, {textoIntervalo(acima)}</small>
              </label>
            )}
            {abaixo && (
              <label className="opcao-cartao opcao-cartao--larga">
                <input type="radio" name="estatura" checked={p.fora_da_media === "abaixo"} onChange={() => onForaDaMedia("abaixo")} />
                <span className="opcao-cartao__nome">Mais baixo que a média</span>
                <small>Passa a {abaixo.tamanho}, {textoIntervalo(abaixo)}</small>
              </label>
            )}
          </div>
          {faixas.length === 0 && <p className="campo-aviso">As faixas de altura por Tamanho não estão nos dados do sistema: por enquanto, só a média.</p>}
          {faixas.length > 0 && !acima && <p className="campo-aviso">Não há Tamanho acima de {escolhida.tamanho}.</p>}
          {faixas.length > 0 && !abaixo && <p className="campo-aviso">Não há Tamanho abaixo de {escolhida.tamanho}.</p>}
          {foraComTamanho && (
            <p className="campo-aviso" role="status">
              Fora da média, o Tamanho passa a {p.tamanho} e vale para todas as regras de Tamanho, como a grade de carga.
              O Deslocamento continua {escolhida.deslocamento != null ? `${escolhida.deslocamento} m` : "o da raça"}.
            </p>
          )}
          <label htmlFor={idAltura}>Altura em metros (opcional)</label>
          <input id={idAltura} value={p.altura} inputMode="decimal" autoComplete="off" placeholder="ex.: 1,75"
            onChange={(e) => onAltura(e.target.value)}
            aria-invalid={erros["personagem.altura"] ? true : undefined}
            aria-describedby={erros["personagem.altura"] ? `${idAltura}-erro ${idAltura}-intervalo` : `${idAltura}-intervalo`} />
          <p id={`${idAltura}-intervalo`} className="campo-aviso">
            {intervalo ? `Vai ${textoIntervalo(intervalo)} (${intervalo.tamanho}).` : "Intervalo de altura não informado para esta raça."}
          </p>
          <ErroDoCampo caminho="personagem.altura" erros={erros} />
        </fieldset>
      )}
      <ErroDoCampo caminho="personagem.tamanho" erros={erros} />
    </div>
  );
}

// ------------------------------------------------------------------ Classe e arquétipo

const ATRIBUTO_DA_BASE: Record<string, string> = { vigor: "Vigor", proposito: "Propósito" };

function Base({ rotulo, base }: { rotulo: string; base: ClasseCatalogo["pv"] }) {
  return (
    <div>
      <dt>{rotulo}</dt>
      <dd>{base ? <><strong>{base.valor}</strong> + {ATRIBUTO_DA_BASE[base.atributo] ?? base.atributo}</> : NAO_INFORMADO}</dd>
    </div>
  );
}

export function EtapaClasse({ classes, classe, arquetipo, erros, aviso, onClasse, onArquetipo }: {
  classes: ClasseCatalogo[] | undefined;
  classe: string;
  arquetipo: string;
  erros: Erros;
  aviso: string | null;
  onClasse: (classe: string) => void;
  onArquetipo: (arquetipo: string) => void;
}) {
  const escolhida = acharPorNome(classes, classe);
  const arquetipoEscolhido = escolhida ? acharPorNome(escolhida.arquetipos, arquetipo) : undefined;
  return (
    <div className="assistente__campos">
      <fieldset className="opcoes" {...atributosDeErro("personagem.classe", erros)}>
        <legend>Classe</legend>
        <div className="opcoes__grade">
          {(classes ?? []).map((c) => (
            <label key={c.nome} className="opcao-cartao">
              <input type="radio" name="classe" value={c.nome} checked={escolhida?.nome === c.nome} onChange={() => onClasse(c.nome)} />
              <span className="opcao-cartao__nome">
                {c.cor && <span className="opcao-cartao__cor" style={{ background: c.cor }} aria-hidden="true" />}
                {c.nome}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <ErroDoCampo caminho="personagem.classe" erros={erros} />

      {escolhida && (
        <section className="assistente__detalhe" aria-label={`O que a classe ${escolhida.nome} significa`}>
          <dl className="assistente__dados">
            <Base rotulo="PV base" base={escolhida.pv} />
            <Base rotulo="Escala de PV" base={escolhida.escala_pv} />
            <Base rotulo="PP base" base={escolhida.pp} />
            <Base rotulo="Escala de PP" base={escolhida.escala_pp} />
          </dl>
          <Habilidades titulo={`Habilidades de ${escolhida.nome} recebidas`} nomes={escolhida.habilidades.map((h) => h.nome)}
            vazio="Não há habilidades registradas para esta classe no catálogo." />
        </section>
      )}

      {escolhida && (
        <fieldset className="opcoes" {...atributosDeErro("personagem.arquetipo", erros)}>
          <legend>Arquétipo de {escolhida.nome}</legend>
          {aviso && <p className="campo-aviso" role="status">{aviso}</p>}
          <div className="opcoes__lista">
            {escolhida.arquetipos.map((a) => (
              <label key={a.nome} className="opcao-cartao opcao-cartao--larga">
                <input type="radio" name="arquetipo" value={a.nome} checked={arquetipoEscolhido?.nome === a.nome} onChange={() => onArquetipo(a.nome)} />
                <span className="opcao-cartao__nome">{a.nome}</span>
                <small>{a.conceito || `Conceito ${NAO_INFORMADO}.`}</small>
                {a.habilidades.length > 0 && <small>Habilidades recebidas: {a.habilidades.map((h) => h.nome).join(", ")}</small>}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <ErroDoCampo caminho="personagem.arquetipo" erros={erros} />
    </div>
  );
}

// ------------------------------------------------------------------ Atributos e Perícias

function Contadores({ categoria, valores, nomes }: { categoria: Categoria; valores: Valores; nomes: string[] }) {
  const estado = avaliar(categoria, nomes, valores);
  const alvo = DISTRIBUICAO[categoria];
  return (
    <div className="contadores" role="status" aria-live="polite" aria-atomic="true">
      <span className="sr-only">Distribuição padrão: </span>
      {VALORES_PADRAO.map((valor) => (
        <span key={valor} className={`contador ${estado.faltam[valor] === 0 ? "contador--completo" : ""}`.trim()}>
          <strong>{textoFaltam(estado.faltam[valor], valor)}</strong>
          <small>{alvo[valor]} no total</small>
        </span>
      ))}
    </div>
  );
}

export function EtapaDistribuicao({ categoria, valores, foraDoPadrao, erros, onValor, onForaDoPadrao }: {
  categoria: Categoria;
  valores: Valores;
  foraDoPadrao: boolean;
  erros: Erros;
  onValor: (nome: string, valor: number | undefined) => void;
  onForaDoPadrao: (fora: boolean) => void;
}) {
  const grupos = categoria === "atributos" ? GRUPOS_ATRIBUTOS : GRUPOS_PERICIAS;
  const nomes = categoria === "atributos" ? NOMES_ATRIBUTOS : NOMES_PERICIAS;
  const opcoes = categoria === "atributos" ? [1, 2, 3] : [0, 1, 2, 3];
  const [recusas, setRecusas] = useState<Record<string, string>>({});
  const idSaida = useId();
  const estado = avaliar(categoria, nomes, valores);
  const rotulo = categoria === "atributos" ? "Atributos" : "Perícias";

  function escolher(nome: string, valor: number) {
    const vaga = vagaPara(categoria, nomes, valores, nome, valor);
    if (!vaga.cabe) {
      setRecusas({ [nome]: mensagemSemVaga(categoria, valor, vaga.ocupadoPor.map(exibir)) });
      return;
    }
    setRecusas({});
    onValor(nome, valor);
  }

  return (
    <div className="assistente__campos">
      {foraDoPadrao ? (
        <p className="campo-aviso" role="status">
          Sem a distribuição padrão: os contadores são só informativos e valem os limites de {LIMITES[categoria].minimo} a {LIMITES[categoria].maximo}.
          A Conferência vai lembrar que os {rotulo} não seguem a distribuição do livro ({TOTAL_PADRAO[categoria]} pontos).
        </p>
      ) : null}
      <Contadores categoria={categoria} valores={valores} nomes={nomes} />
      {erros[categoria] && <p id={`${idCampo(categoria)}-erro`} className="campo-erro">Erro: {erros[categoria]}</p>}
      {!foraDoPadrao && !erros[categoria] && estado.excedentes.length > 0 && (
        <p className="campo-erro">Erro: {problemas(categoria, estado).join(" ")}</p>
      )}

      {grupos.map((grupo) => (
        <fieldset key={grupo.titulo} className="distribuicao">
          <legend>{grupo.titulo}</legend>
          {grupo.nomes.map((nome) => {
            const caminho = `${categoria}.valores.${nome}`;
            const atual = valorEfetivo(categoria, valores, nome);
            return (
              <div key={nome} className="distribuicao__linha">
                {foraDoPadrao ? (
                  <>
                    <label htmlFor={idCampo(caminho)} className="distribuicao__nome">{exibir(nome)}</label>
                    <input id={idCampo(caminho)} className="distribuicao__numero" type="number" inputMode="numeric" step={1}
                      value={valores[nome] ?? ""} {...atributosDeErro(caminho, erros)}
                      onChange={(e) => onValor(nome, e.target.value === "" ? undefined : Number(e.target.value))} />
                  </>
                ) : (
                  <fieldset className="valores" aria-describedby={recusas[nome] ? `${idCampo(caminho)}-recusa` : erros[caminho] ? `${idCampo(caminho)}-erro` : undefined}>
                    <legend className="distribuicao__nome">{exibir(nome)}</legend>
                    <div className="valores__opcoes">
                      {opcoes.map((valor) => (
                        <label key={valor} className="valor">
                          <input type="radio" name={`${categoria}-${nome}`} value={valor} checked={atual === valor} onChange={() => escolher(nome, valor)} />
                          <span>{valor}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
                {recusas[nome] && <p id={`${idCampo(caminho)}-recusa`} className="campo-erro" role="alert">{recusas[nome]}</p>}
                <ErroDoCampo caminho={caminho} erros={erros} />
              </div>
            );
          })}
        </fieldset>
      ))}

      <div className="assistente__saida">
        <input id={idSaida} type="checkbox" checked={foraDoPadrao} onChange={(e) => { setRecusas({}); onForaDoPadrao(e.target.checked); }} />
        <label htmlFor={idSaida}>Seguir sem a distribuição padrão (campanha com regra própria)</label>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Personalidade

export function EtapaPersonalidade({ listas, valores, onChange }: {
  listas: ListasFicha | undefined;
  valores: Record<string, ValorPersonalidade>;
  onChange: (chave: string, valor: ValorPersonalidade) => void;
}) {
  const valor = (chave: string) => { const v = valores[chave]; return typeof v === "string" ? v : ""; };
  return (
    <div className="assistente__campos">
      <label htmlFor={idCampo("personalidade.alinhamento")}>Alinhamento</label>
      <select id={idCampo("personalidade.alinhamento")} value={valor("alinhamento")} onChange={(e) => onChange("alinhamento", e.target.value)}>
        <option value="">Não informado</option>
        {(listas?.alinhamentos ?? []).map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <label htmlFor={idCampo("personalidade.pecado")}>Pecado Capital</label>
      <select id={idCampo("personalidade.pecado")} value={valor("pecado")} onChange={(e) => onChange("pecado", e.target.value)}>
        <option value="">Não informado</option>
        {(listas?.pecados ?? []).map((p) => <option key={p.nome} value={p.nome}>{`${p.icone} ${p.nome}`.trim()}</option>)}
      </select>
      {(listas?.campos_personalidade ?? []).map((campo) => {
        const id = idCampo(`personalidade.${campo.chave}`);
        // Traços: o mesmo editor de etiquetas da ficha, aberto na própria etapa (reformular-personalidade-da-ficha, D3).
        if (campo.tipo === "tracos") {
          return (
            <div key={campo.chave} className="assistente__campo">
              <EditorDeTracos id={id} rotulo={`${campo.rotulo} (até ${campo.maximo ?? 6})`} valor={lerTracos(valores[campo.chave])}
                maximo={campo.maximo ?? 6} limite={campo.limite} dica={campo.dica} onChange={(tracos) => onChange(campo.chave, tracos)} />
            </div>
          );
        }
        const caracteres = contarCaracteres(valor(campo.chave));
        const passou = typeof campo.limite === "number" && caracteres > campo.limite;
        return (
          <div key={campo.chave} className={`assistente__campo ${campo.longo ? "assistente__campo--longo" : ""}`.trim()}>
            <label htmlFor={id}>{campo.rotulo}{campo.longo ? " (opcional)" : ""}</label>
            <textarea id={id} rows={campo.longo ? 8 : 2} value={valor(campo.chave)} placeholder={campo.dica}
              aria-describedby={typeof campo.limite === "number" ? `${id}-contador` : undefined} aria-invalid={passou || undefined}
              onChange={(e) => onChange(campo.chave, e.target.value)} />
            {typeof campo.limite === "number" && (
              <small id={`${id}-contador`} className={passou ? "campo-erro" : "campo-aviso"}>
                {caracteres.toLocaleString("pt-BR")} de {campo.limite.toLocaleString("pt-BR")} caracteres{passou ? " — encurte o texto para criar o personagem." : ""}
              </small>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ utilidades da Conferência

export function Resumo({ titulo, onEditar, children, problemas: lista }: { titulo: string; onEditar: () => void; children: ReactNode; problemas?: string[] }) {
  return (
    <section className="resumo" aria-label={`Resumo: ${titulo}`}>
      <div className="resumo__cabeca">
        <h3>{titulo}</h3>
        <button type="button" className="button button--ghost" onClick={onEditar}>Editar {titulo.toLowerCase()}</button>
      </div>
      {children}
      {lista && lista.length > 0 && (
        <ul className="resumo__problemas">
          {lista.map((p) => <li key={p} className="campo-erro">Erro: {p}</li>)}
        </ul>
      )}
    </section>
  );
}
