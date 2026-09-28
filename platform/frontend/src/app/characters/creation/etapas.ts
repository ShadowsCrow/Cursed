import type { ClasseCatalogo, RacaCatalogo } from "../sheet/catalogoApi";
import { problemaDeAltura, type FaixaAltura } from "./altura";
import { acharPorNome } from "../sheet/catalogoApi";
import { avaliar, mensagemDeLimite, problemas, type Categoria } from "./distribuicao";
import { NOMES_ATRIBUTOS, NOMES_PERICIAS, lerIdade, type EstadoAssistente, type EtapaId } from "./modelo";

/**
 * Textos de orientação de cada etapa (design D6). Apresentam, sem definir, o capítulo
 * "Criação de Personagem" do livro; qualquer divergência com `rules/sistema` é defeito daqui.
 * A tabela etapa → seção do livro está no HANDOFF da mudança.
 */
export interface DefinicaoEtapa {
  id: EtapaId;
  titulo: string;
  /** Seção do livro que a etapa representa. */
  fonte: string;
  orientacao: string[];
}

export const DEFINICOES: DefinicaoEtapa[] = [
  {
    id: "conceito",
    titulo: "Conceito",
    fonte: "Criação de Personagem, 1. Conversa de campanha",
    orientacao: [
      "Antes dos números, converse com o Narrador sobre a campanha: o tom da história, onde ela começa, quais raças e classes estão disponíveis e se há regras próprias da mesa.",
      "Depois descreva, em poucas frases, quem você pretende interpretar, o que o personagem sabe fazer e por que participará da história. O conceito pode mudar durante as próximas etapas para se ajustar às regras e ao grupo.",
      "Esta etapa só orienta: nada é gravado aqui. Leve o conceito na cabeça (ou num papel) para as próximas escolhas.",
    ],
  },
  {
    id: "identidade",
    titulo: "Identidade",
    fonte: "Criação de Personagem, 2. Identidade e origem",
    orientacao: [
      "Registre as informações básicas do personagem. O nome é obrigatório; idade e sexo são opcionais.",
      "Você não escolhe o nível: todo personagem novo começa no nível 1. Se a campanha começar acima disso, o Narrador aplica os níveis depois, na ficha.",
      "Aparência, origem, ocupação e motivação não têm campo próprio na ficha: combine-os com o Narrador. Uma origem narrativa não concede bônus sozinha.",
    ],
  },
  {
    id: "raca",
    titulo: "Raça",
    fonte: "Criação de Personagem, 3. Raça (Altura e Tamanho fora da média)",
    orientacao: [
      "Escolha uma raça permitida pela campanha. Ela define o Tamanho do personagem e seu Deslocamento, que substitui o valor geral de 9 metros. O Tamanho também define quantas colunas tem a grade de carga.",
      "Habilidades raciais marcadas como placeholder não concedem efeitos até serem escritas, por isso não aparecem aqui.",
      "Escolha também a altura. Na média, ela fica no intervalo típico da raça. Fora da média, mais alto ou mais baixo, o Tamanho passa um passo acima ou abaixo do da raça e a altura fica na faixa desse Tamanho; o Deslocamento continua o da raça.",
    ],
  },
  {
    id: "classe",
    titulo: "Classe e arquétipo",
    fonte: "Criação de Personagem, 4. Classe e arquétipo",
    orientacao: [
      "Escolha uma classe e um de seus arquétipos. A classe determina as bases de PV e PP e as bases das Escalas de PV e PP; o arquétipo é uma especialização dentro dela.",
      "As habilidades listadas são as que o personagem recebe já aprendidas ao ser criado. Habilidades que indicam um nível específico só chegam quando o personagem alcançar esse nível.",
      "Não presuma Proficiência ou Acesso pelo nome da classe ou do arquétipo: eles precisam estar declarados nas regras.",
    ],
  },
  {
    id: "atributos",
    titulo: "Atributos",
    fonte: "Criação de Personagem, 5. Atributos; Atributos e Perícias",
    orientacao: [
      "Distribua os nove Atributos: um recebe 3, quatro recebem 2 e os quatro restantes recebem 1, somando 15 pontos.",
      "Vigor soma no PV e na Escala de PV; Propósito soma no PP e na Escala de PP. Nenhuma escolha narrativa altera um Atributo sem que uma regra conceda o ajuste.",
    ],
  },
  {
    id: "pericias",
    titulo: "Perícias",
    fonte: "Criação de Personagem, 6. Perícias; Atributos e Perícias",
    orientacao: [
      "Distribua as Perícias: uma recebe 3 (sua especialização), três recebem 2 (hobbies ou práticas frequentes) e quatro recebem 1 (experiências anteriores), somando 13 pontos. Todas as demais ficam em 0.",
      "Especialização, hobby e experiência são só orientação narrativa: não concedem efeito mecânico. A origem e o conceito ajudam a explicar as escolhas.",
    ],
  },
  {
    id: "personalidade",
    titulo: "Personalidade",
    fonte: "Criação de Personagem, 14. Personalidade, vínculos e objetivos",
    orientacao: [
      "Conclua o personagem com o que pode aparecer em jogo: convicções, medos, o que ele ama e o que odeia. Todos os campos são opcionais.",
      "Esses elementos não concedem bônus. Eles orientam decisões, ajudam o Narrador a preparar cenas e podem justificar oportunidades futuras.",
    ],
  },
  {
    id: "conferencia",
    titulo: "Conferência",
    fonte: "Criação de Personagem, 7. PV, PP e Escalas; 15. Conferência final",
    orientacao: [
      "Confira as escolhas antes de criar. PV, PP e suas Escalas abaixo são calculados pelo servidor com as bases da classe, Vigor e Propósito, como a ficha fará.",
      "O personagem só passa a existir quando você concluir. Depois, a conferência final continua com o Narrador.",
    ],
  },
];

export function definicao(etapa: EtapaId): DefinicaoEtapa {
  const achada = DEFINICOES.find((d) => d.id === etapa);
  if (!achada) throw new Error(`Etapa desconhecida: ${etapa}`);
  return achada;
}

/** Etapas do livro que a plataforma ainda não modela: combinadas com o Narrador fora do assistente. */
export const FORA_DO_ASSISTENTE = "Vantagens e Desvantagens, equipamento inicial, Acessos e Escola de Especialização ainda não fazem parte do assistente: combine-os com o Narrador depois de criar o personagem.";

export interface ContextoValidacao {
  classes?: ClasseCatalogo[];
  racas?: RacaCatalogo[];
  faixas?: FaixaAltura[];
}

/** Mensagens por campo (`personagem.nome`, `atributos.valores.Vigor`…) que impedem avançar. */
export type Erros = Record<string, string>;

function validarDistribuicao(categoria: Categoria, estado: EstadoAssistente): Erros {
  const nomes = categoria === "atributos" ? NOMES_ATRIBUTOS : NOMES_PERICIAS;
  const situacao = avaliar(categoria, nomes, estado.ficha[categoria]);
  const erros: Erros = {};
  for (const { nome } of situacao.foraDoLimite) erros[`${categoria}.valores.${nome}`] = mensagemDeLimite(categoria);
  if (categoria === "atributos") {
    for (const nome of situacao.semValor) erros[`atributos.valores.${nome}`] = "Escolha um valor para este Atributo.";
  }
  if (estado.foraDoPadrao[categoria]) {
    if (Object.keys(erros).length) erros[categoria] = "Corrija os valores indicados: os limites valem mesmo sem a distribuição padrão.";
    return erros;
  }
  if (!situacao.fecha) erros[categoria] = problemas(categoria, situacao).join(" ") || "A distribuição ainda não fechou.";
  return erros;
}

export function validarEtapa(etapa: EtapaId, estado: EstadoAssistente, contexto: ContextoValidacao): Erros {
  const p = estado.ficha.personagem;
  const erros: Erros = {};
  switch (etapa) {
    case "identidade": {
      if (!p.nome.trim()) erros["personagem.nome"] = "Informe o nome do personagem: ele é obrigatório.";
      const idade = lerIdade(p.idade);
      if (!idade.vazia && idade.valor === null) erros["personagem.idade"] = "A idade precisa ser um número inteiro.";
      else if (!idade.vazia && idade.valor !== null && idade.valor < 0) erros["personagem.idade"] = "A idade não pode ser negativa.";
      break;
    }
    case "raca": {
      const raca = acharPorNome(contexto.racas, p.raca);
      if (!p.raca) erros["personagem.raca"] = "Escolha a raça do personagem.";
      else if (contexto.racas && !raca) erros["personagem.raca"] = `A raça "${p.raca}" não está no catálogo: escolha outra.`;
      if (p.fora_da_media && !p.tamanho) erros["personagem.tamanho"] = "Não há Tamanho nessa direção para esta raça: escolha a outra ou fique na média.";
      const altura = problemaDeAltura(p.altura, raca, p.fora_da_media, contexto.faixas ?? []);
      if (altura) erros["personagem.altura"] = altura;
      break;
    }
    case "classe": {
      const classe = contexto.classes ? acharPorNome(contexto.classes, p.classe) : undefined;
      if (!p.classe) erros["personagem.classe"] = "Escolha a classe do personagem.";
      else if (contexto.classes && !classe) erros["personagem.classe"] = `A classe "${p.classe}" não está no catálogo: escolha outra.`;
      if (!p.arquetipo) erros["personagem.arquetipo"] = p.classe ? `Escolha um arquétipo de ${p.classe}.` : "Escolha a classe e depois um de seus arquétipos.";
      else if (classe && !acharPorNome(classe.arquetipos, p.arquetipo)) erros["personagem.arquetipo"] = `O arquétipo "${p.arquetipo}" não pertence à classe ${classe.nome}: escolha outro.`;
      break;
    }
    case "atributos":
      return validarDistribuicao("atributos", estado);
    case "pericias":
      return validarDistribuicao("pericias", estado);
    default:
      break;
  }
  return erros;
}

/** Etapa de cada campo devolvido pelo servidor, para o atalho da Conferência. */
export function etapaDoCampo(campo: string): EtapaId {
  if (campo.startsWith("atributos")) return "atributos";
  if (campo.startsWith("pericias")) return "pericias";
  if (campo.startsWith("personalidade")) return "personalidade";
  if (["personagem.raca", "personagem.tamanho", "personagem.altura"].includes(campo)) return "raca";
  if (campo === "personagem.classe" || campo === "personagem.arquetipo") return "classe";
  if (campo.startsWith("personagem")) return "identidade";
  return "conferencia";
}

export function avisosDaConferencia(estado: EstadoAssistente): string[] {
  const avisos: string[] = [];
  if (estado.foraDoPadrao.atributos) avisos.push("Os Atributos não seguem a distribuição do livro (um 3, quatro 2 e quatro 1).");
  if (estado.foraDoPadrao.pericias) avisos.push("As Perícias não seguem a distribuição do livro (uma 3, três 2 e quatro 1).");
  const p = estado.ficha.personagem;
  const vazios = [!p.idade.trim() && "idade", !p.sexo && "sexo"].filter(Boolean);
  if (vazios.length) avisos.push(`Campos opcionais em branco na Identidade: ${vazios.join(" e ")}.`);
  if (!Object.values(estado.ficha.personalidade).some((v) => v.trim())) avisos.push("A Personalidade ficou em branco; ela pode ser preenchida depois, na ficha.");
  return avisos;
}
