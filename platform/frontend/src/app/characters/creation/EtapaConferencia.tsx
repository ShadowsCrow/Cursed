import type { ClasseCatalogo, ListasFicha } from "../sheet/catalogoApi";
import { acharPorNome } from "../sheet/catalogoApi";
import type { ValorDerivadoResumo } from "../types";
import { lerAltura } from "./altura";
import { Resumo } from "./CamposDasEtapas";
import { FORA_DO_ASSISTENTE, avisosDaConferencia, definicao, etapaDoCampo } from "./etapas";
import { NOMES_ATRIBUTOS, NOMES_PERICIAS, exibir, type EstadoAssistente, type EtapaId } from "./modelo";
import type { PreviaCriacao, ProblemaCampo } from "./api";

const ORDEM_RECURSOS = ["recurso:pv_maximo", "recurso:escala_pv", "recurso:pp_maximo", "recurso:escala_pp"];

function ValorCalculado({ valor }: { valor: ValorDerivadoResumo }) {
  return (
    <div className="previa__valor">
      <dt>{valor.rotulo}</dt>
      {valor.calculavel && valor.total != null ? (
        <dd>
          <strong>{valor.total}</strong>
          <small>{valor.fontes.map((f) => `${f.descricao} ${f.valor}`).join(" + ")}</small>
        </dd>
      ) : (
        <dd><strong>Não calculável</strong><small>{valor.motivo ?? "Falta uma entrada."}</small></dd>
      )}
    </div>
  );
}

export function EtapaConferencia({ estado, classes, listas, previa, carregando, erroPrevia, problemas, onEditar }: {
  estado: EstadoAssistente;
  classes: ClasseCatalogo[] | undefined;
  listas: ListasFicha | undefined;
  previa: PreviaCriacao | undefined;
  carregando: boolean;
  erroPrevia: string | null;
  problemas: ProblemaCampo[];
  onEditar: (etapa: EtapaId) => void;
}) {
  const p = estado.ficha.personagem;
  const porEtapa = (etapa: EtapaId) => problemas.filter((pr) => etapaDoCampo(pr.campo) === etapa).map((pr) => pr.mensagem);
  const avisos = avisosDaConferencia(estado);
  const classe = acharPorNome(classes, p.classe);
  const valores = new Map((previa?.valores ?? []).map((v) => [v.chave, v]));
  const distribuidos = (categoria: "atributos" | "pericias") => {
    const nomes = categoria === "atributos" ? NOMES_ATRIBUTOS : NOMES_PERICIAS;
    return nomes
      .map((nome) => [nome, estado.ficha[categoria][nome]] as const)
      .filter(([, valor]) => categoria === "atributos" || (valor ?? 0) > 0)
      .map(([nome, valor]) => `${exibir(nome)} ${valor ?? "—"}`)
      .join(", ") || "Todas em 0";
  };
  const personalidade = Object.entries(estado.ficha.personalidade).filter(([, v]) => v.trim());
  const rotuloCampo = (chave: string) =>
    ({ alinhamento: "Alinhamento", pecado: "Pecado Capital" } as Record<string, string>)[chave]
    ?? listas?.campos_personalidade.find((c) => c.chave === chave)?.rotulo ?? chave;
  const semEtapa = porEtapa("conferencia");

  return (
    <div className="assistente__campos">
      <section className="previa" aria-label="PV, PP e Escalas calculados pelo servidor" aria-busy={carregando}>
        <h3 className="assistente__subtitulo">PV, PP e Escalas no nível 1</h3>
        {carregando && <p role="status">Calculando PV e PP…</p>}
        {erroPrevia && <p className="campo-erro" role="alert">Erro: {erroPrevia} A criação continua possível; o servidor valida ao criar.</p>}
        {previa && (
          <dl className="previa__valores">
            {ORDEM_RECURSOS.map((chave) => valores.get(chave)).filter((v): v is ValorDerivadoResumo => !!v)
              .map((valor) => <ValorCalculado key={valor.chave} valor={valor} />)}
          </dl>
        )}
      </section>

      {avisos.length > 0 && (
        <section className="avisos" aria-label="Avisos">
          <h3 className="assistente__subtitulo">Avisos (não impedem a criação)</h3>
          <ul>{avisos.map((aviso) => <li key={aviso}>Aviso: {aviso}</li>)}</ul>
        </section>
      )}
      {semEtapa.length > 0 && <ul className="resumo__problemas">{semEtapa.map((m) => <li key={m} className="campo-erro">Erro: {m}</li>)}</ul>}

      <Resumo titulo={definicao("identidade").titulo} onEditar={() => onEditar("identidade")} problemas={porEtapa("identidade")}>
        <dl className="assistente__dados">
          <div><dt>Nome</dt><dd>{p.nome.trim() || "—"}</dd></div>
          <div><dt>Idade</dt><dd>{p.idade.trim() || "não informada"}</dd></div>
          <div><dt>Sexo</dt><dd>{p.sexo || "não informado"}</dd></div>
          <div><dt>Nível</dt><dd>1</dd></div>
        </dl>
      </Resumo>
      <Resumo titulo={definicao("raca").titulo} onEditar={() => onEditar("raca")} problemas={porEtapa("raca")}>
        <p>{[
          p.raca || "—",
          p.fora_da_media && p.tamanho ? `${p.tamanho} (fora da média, ${p.fora_da_media === "acima" ? "mais alto" : "mais baixo"})` : null,
          lerAltura(p.altura).vazia ? "altura não informada" : `${p.altura.trim().replace(".", ",")} m`,
        ].filter(Boolean).join(" · ")}</p>
      </Resumo>
      <Resumo titulo={definicao("classe").titulo} onEditar={() => onEditar("classe")} problemas={porEtapa("classe")}>
        <p>{classe?.nome ?? (p.classe || "—")}{p.arquetipo ? ` · ${p.arquetipo}` : ""}</p>
      </Resumo>
      <Resumo titulo={definicao("atributos").titulo} onEditar={() => onEditar("atributos")} problemas={porEtapa("atributos")}>
        <p>{distribuidos("atributos")}</p>
      </Resumo>
      <Resumo titulo={definicao("pericias").titulo} onEditar={() => onEditar("pericias")} problemas={porEtapa("pericias")}>
        <p>{distribuidos("pericias")}</p>
      </Resumo>
      <Resumo titulo={definicao("personalidade").titulo} onEditar={() => onEditar("personalidade")} problemas={porEtapa("personalidade")}>
        {personalidade.length > 0
          ? <dl className="assistente__dados">{personalidade.map(([chave, valor]) => <div key={chave}><dt>{rotuloCampo(chave)}</dt><dd>{valor}</dd></div>)}</dl>
          : <p>Em branco.</p>}
      </Resumo>

      <p className="assistente__nota">{FORA_DO_ASSISTENTE}</p>
    </div>
  );
}
