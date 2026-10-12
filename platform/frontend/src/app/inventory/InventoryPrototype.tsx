import { useMemo, useState } from "react";

import { InventoryGrid, type Destino } from "./InventoryGrid";
import { equiparOuGuardar } from "./mochila";
import {
  calcularGrade, COLUNAS_POR_TAMANHO, DIMENSAO_CRIATURA, distribuirMoedas, encontrarEspaco, LINHAS_BASE, TIPOS_MOEDA,
  type Ampliacao, type Bolsa, type ItemGrade, type RegrasGrade, type Subtipo, type Tamanho,
} from "./gridEngine";

/**
 * Protótipo de calibração (tarefa 1.3 de `carga-por-espacos`): roda sem servidor.
 * As dimensões dos kits seguem as referências aprovadas na calibração de 2026-09-27.
 */

const TAMANHOS: Array<[Tamanho, string]> = [
  ["minusculo", "Minúsculo"], ["pequeno", "Pequeno"], ["medio", "Médio"],
  ["grande", "Grande"], ["enorme", "Enorme"], ["colossal", "Colossal"],
];

const SUBTIPOS: Array<[Subtipo, string]> = [
  ["peitoral", "Armadura — peitoral"], ["capacete", "Armadura — capacete"], ["luvas", "Armadura — luvas"],
  ["botas", "Armadura — botas"], ["uma_mao", "Arma — uma mão"], ["duas_maos", "Arma — duas mãos"],
  ["escudo", "Escudo"], ["mochila", "Acessório — mochila"], ["aljava", "Acessório — aljava"], ["outro", "Outros"],
];

type Molde = Omit<ItemGrade, "id" | "coluna" | "linha" | "girado">;

const item = (nome: string, subtipo: Subtipo, largura: number, altura: number, extra: Partial<Molde> = {}): Molde => ({
  nome, subtipo, largura, altura, equipado: false, ...extra,
});

const KITS: Record<string, { rotulo: string; itens: Molde[] }> = {
  guerreiro: {
    rotulo: "Guerreiro",
    itens: [
      item("Peitoral de malha", "peitoral", 2, 3, { equipado: true, requisitoForca: 2 }),
      item("Elmo", "capacete", 1, 1, { equipado: true }),
      item("Manoplas", "luvas", 1, 1, { equipado: true }),
      item("Botas de couro", "botas", 1, 2, { equipado: true }),
      item("Espada longa", "uma_mao", 1, 3, { equipado: true }),
      item("Escudo", "escudo", 2, 2, { equipado: true }),
      item("Odre cheio", "outro", 1, 2),
      item("Tocha", "outro", 1, 2, { maos: 1 }),
      item("Provisões (3 dias)", "outro", 2, 1),
    ],
  },
  mago: {
    rotulo: "Mago",
    itens: [
      item("Mochila de viagem", "mochila", 2, 2, { equipado: true, requisitoForca: 2, ampliacao: { linhas: 1, colunas: 0 } }),
      item("Túnica reforçada", "peitoral", 2, 2, { equipado: true }),
      item("Cajado", "duas_maos", 1, 4, { equipado: true }),
      item("Grimório", "outro", 2, 2),
      item("Bolsa de componentes", "outro", 1, 1),
      item("Poções de cura (3)", "outro", 1, 1),
      item("Odre cheio", "outro", 1, 2),
      item("Provisões (3 dias)", "outro", 2, 1),
    ],
  },
  ladino: {
    rotulo: "Ladino",
    itens: [
      item("Gibão de couro", "peitoral", 2, 2, { equipado: true }),
      item("Capuz", "capacete", 1, 1, { equipado: true }),
      item("Adaga", "uma_mao", 1, 2, { equipado: true }),
      item("Adaga", "uma_mao", 1, 2, { equipado: true }),
      item("Arco curto", "duas_maos", 1, 3),
      item("Aljava (20 flechas)", "aljava", 1, 2, { equipado: true }),
      item("Ferramentas de ladrão", "outro", 1, 1),
      item("Corda", "outro", 1, 2),
    ],
  },
};

/** Mochilas de referência aprovadas na calibração de 2026-09-27. */
const MOCHILAS: Array<{ nome: string; largura: number; altura: number; linhas: number; colunas: number; requisitoForca: number }> = [
  { nome: "Bolsa de cintura", largura: 1, altura: 1, linhas: 0, colunas: 1, requisitoForca: 0 },
  { nome: "Mochila de viagem", largura: 2, altura: 2, linhas: 1, colunas: 0, requisitoForca: 2 },
  { nome: "Mochila de expedição", largura: 2, altura: 3, linhas: 2, colunas: 0, requisitoForca: 3 },
  { nome: "Cesto de carga", largura: 3, altura: 3, linhas: 2, colunas: 1, requisitoForca: 4 },
];

const REGRAS_INICIAIS: RegrasGrade = { linhasBase: LINHAS_BASE, colunasPorTamanho: { ...COLUNAS_POR_TAMANHO } };

let contador = 0;
const novoId = () => `item-${(contador += 1)}`;

function colocarTodos(moldes: Molde[], existentes: ItemGrade[], contexto: { forca: number; tamanho: Tamanho; regras: RegrasGrade; ampliacoes: Ampliacao[] }) {
  const resultado = [...existentes];
  const semLugar: string[] = [];
  for (const molde of moldes) {
    const novo: ItemGrade = { ...molde, id: novoId(), coluna: null, linha: null, girado: false };
    const grade = calcularGrade(contexto, [...resultado, novo]);
    const lugar = molde.subtipo === "mochila" && molde.equipado ? null : encontrarEspaco(grade, resultado, novo);
    if (lugar) Object.assign(novo, lugar);
    else if (!(molde.subtipo === "mochila" && molde.equipado)) semLugar.push(molde.nome);
    resultado.push(novo);
  }
  return { itens: resultado, semLugar };
}

export function InventoryPrototype() {
  const [forca, setForca] = useState(3);
  const [tamanho, setTamanho] = useState<Tamanho>("medio");
  const [regras, setRegras] = useState<RegrasGrade>(REGRAS_INICIAIS);
  const [mochileiro, setMochileiro] = useState(false);
  const [bolso, setBolso] = useState(false);
  const [itens, setItens] = useState<ItemGrade[]>([]);
  const [aviso, setAviso] = useState("");
  const [bolsa, setBolsa] = useState<Bolsa>({ cobre: 0, prata: 0, ouro: 0 });
  const [porPilha, setPorPilha] = useState(100);
  const [mochila, setMochila] = useState(MOCHILAS[1] ?? MOCHILAS[0]!);
  const [novo, setNovo] = useState({ nome: "", subtipo: "outro" as Subtipo, largura: 1, altura: 1, maos: 0, versatil: false, ampliacaoLinhas: 1, ampliacaoColunas: 0, requisitoForca: 0 });

  const ampliacoes = useMemo(() => {
    const lista: Ampliacao[] = [];
    if (mochileiro) lista.push({ fonte: "habilidade", rotulo: "Mochileiro", linhas: 0, colunas: 1 });
    if (bolso) lista.push({ fonte: "magia", rotulo: "Bolso Dimensional", linhas: 2, colunas: 0 });
    return lista;
  }, [mochileiro, bolso]);
  const parametros = useMemo(() => ({ forca, tamanho, regras, ampliacoes }), [forca, tamanho, regras, ampliacoes]);

  function adicionar(moldes: Molde[], substituir = false) {
    const { itens: resultado, semLugar } = colocarTodos(moldes, substituir ? [] : itens, parametros);
    setItens(resultado);
    setAviso(semLugar.length ? `Sem lugar na grade: ${semLugar.join(", ")}. Ficaram fora da grade.` : "");
  }

  function mover(id: string, destino: Destino) {
    setItens((lista) => lista.map((i) => (i.id === id ? { ...i, ...destino } : i)));
  }

  function equipar(id: string, equipado: boolean) {
    const proximo = equiparOuGuardar(parametros, itens, id, equipado);
    setItens(proximo);
    const mochila = proximo.find((i) => i.id === id);
    if (!equipado && mochila?.subtipo === "mochila") {
      setAviso(mochila.coluna === null
        ? `${mochila.nome} ficou fora da grade, esperando ser colocada ou equipada.`
        : `${mochila.nome} foi para a grade como item carregado.`);
    }
  }

  function adicionarMochila() {
    const jaEquipada = itens.some((i) => i.subtipo === "mochila" && i.equipado);
    adicionar([item(mochila.nome, "mochila", mochila.largura, mochila.altura, {
      equipado: !jaEquipada && forca >= mochila.requisitoForca,
      ampliacao: { linhas: mochila.linhas, colunas: mochila.colunas },
      ...(mochila.requisitoForca ? { requisitoForca: mochila.requisitoForca } : {}),
    })]);
    const motivo = jaEquipada ? "só uma mochila fica equipada por vez"
      : forca < mochila.requisitoForca ? `exige Força ${mochila.requisitoForca}` : null;
    if (motivo) {
      const novo = { ...item(mochila.nome, "mochila", mochila.largura, mochila.altura), id: "teste", coluna: null, linha: null, girado: false };
      const cabe = encontrarEspaco(calcularGrade(parametros, itens), itens, novo) !== null;
      setAviso(cabe
        ? `${mochila.nome} foi para a grade como item carregado: ${motivo}.`
        : `${mochila.nome} ficou fora da grade, esperando ser colocada ou equipada: ${motivo}.`);
    }
  }

  function aplicarMoedas() {
    const pilhas = distribuirMoedas(bolsa, porPilha);
    const semMoedas = itens.filter((i) => i.subtipo !== "moedas");
    const moldes = pilhas.map((p) => item(
      `Moedas (${TIPOS_MOEDA.filter((t) => p[t] > 0).map((t) => `${p[t]} ${t}`).join(", ")})`, "moedas", 1, 1,
    ));
    const { itens: resultado, semLugar } = colocarTodos(moldes, semMoedas, parametros);
    setItens(resultado);
    setAviso(`${pilhas.length} pilha(s) de moedas.${semLugar.length ? " Algumas ficaram fora da grade." : ""}`);
  }

  const numeros = JSON.stringify({ linhasBase: regras.linhasBase, colunasPorTamanho: regras.colunasPorTamanho, moedasPorPilha: porPilha }, null, 2);

  return (
    <main className="screen-content prototipo-inventario">
      <div className="page-intro">
        <span className="eyebrow">PROTÓTIPO · CARGA EM GRADE</span>
        <h1>Teste do inventário</h1>
        <p>Monte kits, arraste, gire e veja quando a carga transborda para o vermelho. Nada aqui é salvo. Os kits usam as dimensões de referência aprovadas.</p>
      </div>

      <div className="prototipo-inventario__layout">
        <aside className="prototipo-inventario__controles">
          <fieldset>
            <legend>Personagem</legend>
            <label>Força atual
              <input type="number" min={0} max={10} value={forca} onChange={(e) => setForca(Number(e.target.value))} />
            </label>
            <label>Tamanho
              <select value={tamanho} onChange={(e) => setTamanho(e.target.value as Tamanho)}>
                {TAMANHOS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
              </select>
            </label>
            <label className="prototipo-inventario__check">
              <input type="checkbox" checked={mochileiro} onChange={(e) => setMochileiro(e.target.checked)} /> Habilidade "Mochileiro" (+1 coluna)
            </label>
            <label className="prototipo-inventario__check">
              <input type="checkbox" checked={bolso} onChange={(e) => setBolso(e.target.checked)} /> Magia "Bolso Dimensional" (+2 linhas)
            </label>
          </fieldset>

          <fieldset>
            <legend>Kits</legend>
            <div className="prototipo-inventario__botoes">
              {Object.entries(KITS).map(([chave, kit]) => (
                <button key={chave} type="button" className="button button--secondary" onClick={() => adicionar(kit.itens, true)}>{kit.rotulo}</button>
              ))}
              <button type="button" className="button button--ghost" onClick={() => { setItens([]); setAviso(""); }}>Esvaziar</button>
            </div>
            <label>Carregar companheiro desmaiado
              <select defaultValue="" onChange={(e) => {
                const [t, modo] = e.target.value.split(":") as [keyof typeof DIMENSAO_CRIATURA, string];
                if (!t) return;
                const d = DIMENSAO_CRIATURA[t];
                const rotulo = TAMANHOS.find(([v]) => v === t)?.[1];
                // Com ajuda, cada carregador leva metade da altura, arredondada para cima.
                adicionar([modo === "ajuda"
                  ? item(`Corpo ${rotulo} (com ajuda)`, "criatura", d.largura, Math.ceil(d.altura / 2))
                  : item(`Corpo ${rotulo}`, "criatura", d.largura, d.altura)]);
                e.target.value = "";
              }}>
                <option value="">Escolha o tamanho…</option>
                {Object.keys(DIMENSAO_CRIATURA).flatMap((t) => {
                  const rotulo = TAMANHOS.find(([v]) => v === t)?.[1];
                  return [
                    <option key={t} value={`${t}:inteiro`}>{rotulo}</option>,
                    <option key={`${t}-ajuda`} value={`${t}:ajuda`}>{rotulo} (com ajuda)</option>,
                  ];
                })}
              </select>
            </label>
          </fieldset>

          <fieldset>
            <legend>Mochila</legend>
            <label>Modelo
              <select value={mochila.nome} onChange={(e) => setMochila(MOCHILAS.find((m) => m.nome === e.target.value) ?? mochila)}>
                {MOCHILAS.map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
              </select>
            </label>
            <div className="prototipo-inventario__linha">
              <label>Linhas a mais <input type="number" min={0} max={4} value={mochila.linhas}
                onChange={(e) => setMochila({ ...mochila, linhas: Math.max(0, Number(e.target.value)) })} /></label>
              <label>Colunas a mais <input type="number" min={0} max={4} value={mochila.colunas}
                onChange={(e) => setMochila({ ...mochila, colunas: Math.max(0, Number(e.target.value)) })} /></label>
              <label>Requisito de Força <input type="number" min={0} max={10} value={mochila.requisitoForca}
                onChange={(e) => setMochila({ ...mochila, requisitoForca: Math.max(0, Number(e.target.value)) })} /></label>
            </div>
            <div className="prototipo-inventario__linha">
              <label>Largura <input type="number" min={1} max={8} value={mochila.largura}
                onChange={(e) => setMochila({ ...mochila, largura: Math.max(1, Number(e.target.value)) })} /></label>
              <label>Altura <input type="number" min={1} max={8} value={mochila.altura}
                onChange={(e) => setMochila({ ...mochila, altura: Math.max(1, Number(e.target.value)) })} /></label>
            </div>
            <p className="preview-note">Equipada, a mochila não ocupa célula e amplia a grade. Desequipada, ocupa o tamanho dela.</p>
            <button type="button" className="button button--secondary" onClick={adicionarMochila}>Adicionar mochila</button>
          </fieldset>

          <fieldset>
            <legend>Criar item</legend>
            <label>Nome <input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></label>
            <label>Tipo
              <select value={novo.subtipo} onChange={(e) => setNovo({ ...novo, subtipo: e.target.value as Subtipo })}>
                {SUBTIPOS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
              </select>
            </label>
            <div className="prototipo-inventario__linha">
              <label>Largura <input type="number" min={1} max={8} value={novo.largura} onChange={(e) => setNovo({ ...novo, largura: Number(e.target.value) })} /></label>
              <label>Altura <input type="number" min={1} max={8} value={novo.altura} onChange={(e) => setNovo({ ...novo, altura: Number(e.target.value) })} /></label>
            </div>
            {novo.subtipo === "outro" && (
              <label>Ocupa mãos
                <select value={novo.maos} onChange={(e) => setNovo({ ...novo, maos: Number(e.target.value) })}>
                  <option value={0}>Nenhuma</option><option value={1}>1 mão</option><option value={2}>2 mãos</option>
                </select>
              </label>
            )}
            {novo.subtipo === "uma_mao" && (
              <label className="prototipo-inventario__check">
                <input type="checkbox" checked={novo.versatil} onChange={(e) => setNovo({ ...novo, versatil: e.target.checked })} />
                Versátil (alterna entre uma e duas mãos)
              </label>
            )}
            {novo.subtipo === "mochila" && (
              <div className="prototipo-inventario__linha">
                <label>Amplia linhas <input type="number" min={0} max={4} value={novo.ampliacaoLinhas} onChange={(e) => setNovo({ ...novo, ampliacaoLinhas: Number(e.target.value) })} /></label>
                <label>Amplia colunas <input type="number" min={0} max={4} value={novo.ampliacaoColunas} onChange={(e) => setNovo({ ...novo, ampliacaoColunas: Number(e.target.value) })} /></label>
                <label>Requisito de Força <input type="number" min={0} max={10} value={novo.requisitoForca} onChange={(e) => setNovo({ ...novo, requisitoForca: Number(e.target.value) })} /></label>
              </div>
            )}
            <button type="button" className="button button--primary" disabled={!novo.nome.trim()} onClick={() => {
              adicionar([item(novo.nome.trim(), novo.subtipo, novo.largura, novo.altura, {
                ...(novo.subtipo === "outro" ? { maos: novo.maos as 0 | 1 | 2 } : {}),
                ...(novo.subtipo === "uma_mao" && novo.versatil ? { versatil: true, maos: 1 as const } : {}),
                ...(novo.subtipo === "mochila" ? { ampliacao: { linhas: novo.ampliacaoLinhas, colunas: novo.ampliacaoColunas }, requisitoForca: novo.requisitoForca || undefined } : {}),
              })]);
              setNovo({ ...novo, nome: "" });
            }}>Adicionar</button>
          </fieldset>

          <fieldset>
            <legend>Moedas</legend>
            <div className="prototipo-inventario__linha">
              {TIPOS_MOEDA.map((tipo) => (
                <label key={tipo}>{tipo[0]?.toUpperCase()}{tipo.slice(1)}
                  <input type="number" min={0} value={bolsa[tipo]} onChange={(e) => setBolsa({ ...bolsa, [tipo]: Number(e.target.value) })} />
                </label>
              ))}
            </div>
            <label>Moedas por pilha (mesa) <input type="number" min={1} value={porPilha} onChange={(e) => setPorPilha(Math.max(1, Number(e.target.value)))} /></label>
            <button type="button" className="button button--secondary" onClick={aplicarMoedas}>Colocar moedas</button>
          </fieldset>

          <fieldset>
            <legend>Números da regra (calibração)</legend>
            <label>Linhas base (linhas = base + Força)
              <input type="number" min={0} max={8} value={regras.linhasBase} onChange={(e) => setRegras({ ...regras, linhasBase: Number(e.target.value) })} />
            </label>
            <div className="prototipo-inventario__linha">
              {TAMANHOS.map(([valor, rotulo]) => (
                <label key={valor}>{rotulo}
                  <input type="number" min={1} max={12} value={regras.colunasPorTamanho[valor]}
                    onChange={(e) => setRegras({ ...regras, colunasPorTamanho: { ...regras.colunasPorTamanho, [valor]: Number(e.target.value) } })} />
                </label>
              ))}
            </div>
            <details>
              <summary>Exportar números</summary>
              <pre className="prototipo-inventario__numeros">{numeros}</pre>
            </details>
          </fieldset>
        </aside>

        <div className="prototipo-inventario__grade">
          {aviso && <p className="prototipo-inventario__aviso" role="alert">{aviso}</p>}
          <InventoryGrid
            rotulo="Inventário do personagem de teste"
            parametros={parametros}
            itens={itens}
            onMover={mover}
            onEquipar={equipar}
            onRetirar={(id) => setItens((lista) => lista.map((i) => (i.id === id ? { ...i, coluna: null, linha: null } : i)))}
            onLargar={(id) => {
              const nome = itens.find((i) => i.id === id)?.nome ?? "Item";
              setItens((lista) => lista.filter((i) => i.id !== id));
              setAviso(`${nome} foi largado no chão.`);
            }}
            onEmpunhar={(id, maos) => setItens((lista) => lista.map((i) => (i.id === id ? { ...i, maos } : i)))}
          />
        </div>
      </div>
    </main>
  );
}
