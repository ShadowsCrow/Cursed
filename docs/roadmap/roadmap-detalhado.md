# Roadmap detalhado do Cursed

Mapeamento de 2026-09-30. Não altera código, regras nem mudanças OpenSpec. Imagem: `roadmap-cursed-v3.png`.

Princípios do projeto que valem para todas as etapas:
- as regras de mesa (`rules/sistema`) só mudam por decisão do usuário; a plataforma as representa e nunca infere valores ausentes;
- conteúdo do sistema fica em JSON, não no código;
- verificação por testes automatizados e aprovação do usuário (nada de validação em jogo real);
- cada etapa vira uma mudança OpenSpec, com tarefas `[x]` só quando verificadas.

## Estado atual

| Área | Situação |
|---|---|
| Ficha (Resumo, Atributos, Perícias, Cartas, Inventário, Personalidade) | Quase pronta; faltam pinturas, aprovações e suítes finais |
| Raças | 9 raças com deslocamento, tamanho e altura; todas as habilidades são placeholder |
| Classes | 9 classes; Ocultista, Virtuoso e Furioso 100% placeholder; Feiticeiro 3 de 4; Especialista e Gatuno 5 cada |
| Cálculos da ficha | Só PV, PP e escalas |
| Jogo (rolagem, turnos, combate, nível) | Não existe |
| Sala | Tokens, movimento e presença em tempo real |
| Infra | CI com Postgres 16, observabilidade, paridade parcial com o Streamlit |

## Etapa 1 — Fechar a ficha

**Objetivo:** base limpa e mudanças arquivadas.
- Integrar as pinturas e obter aprovação em `redesenhar-aba-atributos` (3 tarefas abertas) e `redesenhar-aba-cartas` (5 abertas, incluindo o grimório do detalhe).
- Concluir `reformular-personalidade-da-ficha` (cerca de 9 abertas).
- Rodar as suítes completas uma vez no fim.
- Um commit por mudança, separando os arquivos compartilhados entre as sessões paralelas.
- Arquivar as mudanças e corrigir o `AGENTS.md` (ele diz 36 de 40 na `reformular-visual-da-ficha`; o `HANDOFF.md` diz 40 de 40).

**Depende de:** aprovação visual do usuário.

## Etapa 2 — Decisões de regra (em paralelo)

**Objetivo:** destravar o conteúdo sem bloquear o desenvolvimento.
- Raças: bônus, traços passivos, escolhas de criação, identidade de cada uma.
- Classes: habilidades, nível de aquisição (campo próprio ou só no texto), mutações, cartas iniciais do Mago.
- Como se ganha XP ou marco.
- Fechar a revisão de Descanso e refinar o combate (itens do `Roadmap.md` do livro).

**Depende de:** o usuário. É o maior risco do plano.

## Etapa 3 — Números da ficha

**Objetivo:** o que uma rolagem precisa somar.
- Deslocamento (fecha a divergência D3), Bônus de Proficiência, Iniciativa, Esquiva, Bloqueio, Defesa e RDB.
- Capacidade de carga.
- Cálculo no servidor, em `domain/recursos.py`, com as fontes visíveis, como já é feito com PV e PP.

**Depende de:** regras já escritas no livro (não precisa das decisões da etapa 2).

## Etapa 4 — Raças e classes

**Objetivo:** todo personagem receber algo real ao escolher raça e classe.
- Preencher `racas.json` e `classes.json`; a concessão como cartas já existe.
- Completar primeiro as classes vazias, depois Especialista e Gatuno.
- Mutações do Mago e listas relacionadas.
- Companheiros e montarias, que Druida, Ocultista e Cavaleiro exigem.
- A etapa Raça do assistente passa a listar habilidades reais.

**Depende de:** etapa 2. **Extra:** a skill `eval-driven-game-development` serve para comparar custo e equilíbrio entre classes.

## Etapa 5 — Criação completa

**Objetivo:** o assistente seguir todo o capítulo "Criação de Personagem".
- Vantagens e Desvantagens: 5 pontos, até +3 por desvantagens; catálogo (hoje só duas vantagens e uma desvantagem escritas).
- Acesso e as 8 Escolas de Magia, com os graus.
- Novas etapas no assistente e na Conferência.

**Depende de:** etapas 2 e 3.

## Etapa 6 — Equipamentos

**Objetivo:** armas e armaduras com regra, não só campo livre.
- Catálogo do sistema: categorias e perfis de armadura, penalidades de Esquiva, Destreza, Furtividade e Deslocamento.
- Requisito de Força, empunhadura, alcance e proficiência de arma.
- Escudos e acessórios.

**Depende de:** etapa 3 (Defesa e Esquiva). Pré-requisito do combate.

## Etapa 7 — Rolagens e turnos

**Objetivo:** a mesa jogar dentro da plataforma.
- Rolagem d20 com atributo e perícia, vantagem e desvantagem, resultados crítico e falha automática.
- Iniciativa com desempate, surpresa, ordem de turnos.
- Ações do turno: Padrão, Movimento, Bônus, Livre e Reação.
- Registro de eventos da mesa (rolagens, ações, mudanças), com visibilidade do Narrador.

**Depende de:** etapa 3. Pode andar antes da etapa 4.

## Etapa 8 — Combate no grid

**Objetivo:** resolver um conflito na sala.
- Deslocamento, terreno difícil, espaços ocupados, alcance e ataque de oportunidade.
- Defesa (Esquiva, Bloqueio, Cobertura), dano, cura, vulnerabilidade e resistência.
- Morrendo, sobredano letal, morte narrativa e o Amuleto da Sorte.
- Condições derivadas de Exaustão e Estresse, dano de queda.
- Combos e Reação por Persistência.

**Depende de:** etapas 6 e 7.

## Etapa 9 — Cartas em jogo e progressão

**Objetivo:** usar as cartas e evoluir.
- Custo de uso em PP, persistência e ação de consumir itens (adiada por decisão do usuário).
- Nível, PV e PP recalculados, Bônus de Proficiência por marco.
- Pontos de Evolução, aprendizado de cartas com PP investido e descansos mínimos.

**Depende de:** etapas 2 (XP), 4 e 8.

## Etapa 10 — Narrador e infraestrutura

**Objetivo:** operar a plataforma sem o Streamlit.
- Cenas, encontros, bestiário e fichas de monstros.
- Login com Google (falta configurar o provedor no Supabase).
- Implantação, backup do banco, plano de corte e desligamento do Streamlit.
- Fechar as divergências abertas do relatório de paridade (D2 a D6).
- Desempenho e reconexão com vários jogadores na mesma sala.

**Depende de:** etapa 8 para o bestiário. O restante pode andar em paralelo.

## Riscos

1. **Decisões de regra (etapa 2):** se atrasarem, as etapas 3, 6 e 7 continuam, porque não dependem de conteúdo.
2. **Livro ainda em revisão:** codificar combate antes de fechar a regra provoca retrabalho.
3. **Árvore de trabalho misturada:** várias mudanças sem commit; fechar a etapa 1 primeiro.
4. **Sem validação em jogo real (decisão do usuário):** o equilíbrio só pode ser checado por simulação e testes.

## Rotas paralelas possíveis

- Etapas 3, 6 e 7 não dependem do conteúdo de classes e raças.
- Etapa 10 (infraestrutura) pode andar a qualquer momento.
- A etapa 2 deve começar já, porque é a que espera pelo usuário.
