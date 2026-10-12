# Tasks

## 1. Regras

- [x] 1.1 Conferir que `rules/sistema` (Framework, Acesso e Graus de Magia, Condições e Tipos de Dano) está como o usuário aprovou em 2026-10-01, sem nomes de campos, codecs ou formatos de importação; verificar com uma busca por `CR1`, `custo_uso` e `framework.json` em `rules/sistema` sem resultado

## 2. Dados

- [x] 2.1 Criar `cursed_platform/catalogos/framework.json` com as faixas de Grau e Descansos por natureza, os custos mínimos, a regra do Custo de Uso e as listas de Tipo, Escola, Forma e Alcance (D4), e registrá-lo em `ARQUIVOS` e no `manifesto.json`; verificar com `pytest cursed_platform/tests/test_catalogos.py` cobrindo carga válida, faixas sobrepostas, faixa aberta ausente e id repetido
- [x] 2.2 Criar `fixtures/criacao/casos.json` com os casos de Grau, Descansos e Custo de Uso (limites 11/12, 79/80 de magia, 5/6 e 63/64 de habilidade, Potência 8/9, 40/41, 54, passiva permanente, Resposta Tática, Ping Pong, Ruptura em Cruz); verificar que os valores conferem com as seções 23, 24 e 27 do Framework
- [x] 2.3 Implementar `cursed_platform/domain/criacao.py` (grau, descansos, custo de uso) lendo o catálogo; verificar com `pytest` sobre `fixtures/criacao/casos.json`

## 3. Contratos e servidor

- [x] 3.1 Acrescentar os campos do Framework a `ConteudoHabilidade`/`ConteudoMagia` (D1), com `ativacao` de quatro valores, `alcance` estruturado (D1b), `ativacao_legado`, `disciplina` só em habilidade, `escola`, `forma` e `ativacao` validados pelas listas do catálogo, e sem `grau` e `descansos_minimos`; verificar com testes de validação em `cursed_platform/tests/test_cartas.py` (campo válido, opção fora da lista, chave desconhecida, Escola em habilidade, alcance em metros com fração, zero e sem distância)
- [x] 3.2 Calcular o bloco `calculados` (grau, descansos, custo de uso do Framework) nas respostas de catálogo, cartas da ficha, ofertas e apresentações, sem Descansos Mínimos para quem não é Narrador (D3); verificar com testes de API do Narrador e do jogador
- [x] 3.3 Gerar os avisos de revisão: custo abaixo do mínimo, Custo de Uso registrado diferente do Framework, passiva legada sem tipo definido; verificar com testes de `validar` que conferem o texto e o campo de cada aviso
- [x] 3.4 Mapear o catálogo de classes: "Ativa" → `ativa`, "Reação" → `reacao`, "Passiva" sem tipo e com a marcação "Passiva" (D2); verificar com `pytest cursed_platform/tests/test_cartas_catalogo.py`
- [x] 3.5 Regenerar o OpenAPI e os tipos do frontend; verificar que o build do frontend passa

## 4. Código de importação

- [x] 4.1 Implementar `cursed_platform/domain/criacao_codec.py` (codificar, decodificar, validar com os modelos da carta, descartar e comparar grau/descansos) e a linha de comando `codificar`/`decodificar` (D6); verificar com testes de ida e volta, código corrompido, campo desconhecido e grau divergente
- [x] 4.2 Fazer `rascunho_de_codigo` aceitar `CR1`, com procedência "importação CR1" e a mensagem de código não reconhecido listando os quatro formatos; verificar com testes da pré-visualização e da importação pela API

## 5. Interface

- [x] 5.1 Implementar `platform/frontend/src/app/cards/criacao.ts` com os mesmos cálculos; verificar com Vitest sobre `fixtures/criacao/casos.json`
- [x] 5.2 Acrescentar ao editor os quadros do Framework na ordem da ficha de criação, Tipo/Escola/Forma como escolhas do catálogo, Alcance como escolha com campo de metros de passo 1, Disciplina só em habilidade, rótulo "Acesso" nos requisitos, Grau e Descansos só leitura e Custo de Uso com sugestão e aviso (D8); verificar com testes do `CardEditor` para cada cenário de `editor-de-cartas`
- [x] 5.3 Manter os campos comuns e recalcular Grau e Descansos ao trocar entre Habilidade e Magia, pedindo confirmação só quando a Escola ou a Disciplina forem descartadas; verificar com o teste do cenário "Troca de Magia para Habilidade"
- [x] 5.4 Mostrar no detalhe da carta (ficha e biblioteca) os campos preenchidos, o Grau pelo nome, Disciplina nas habilidades e o rótulo "Acesso"; ajustar `cardFormat.ts`; verificar com testes de `CartasFicha` e `cardFormat` para os cenários de `visual-da-ficha`
- [x] 5.5 Mostrar na pré-visualização da importação os campos, os valores calculados e os avisos de um código `CR1`; verificar com teste do diálogo de importação
- [x] 5.6 Capturar o editor de uma magia e o detalhe de uma magia com campos do Framework, em computador e em 375 px, e obter a aprovação do usuário por comparação com os conceitos aprovados

## 6. Migração

- [x] 6.1 Escrever a migração `0022_cartas_campos_do_framework` (D3, plano de migração): remove `grau` e `descansos_minimos` dos rascunhos de habilidades e magias, move `ativacao: "passiva"` para `ativacao_legado`, mantém as versões publicadas imutáveis, registra no log as cartas alteradas e divergentes; verificar com teste da migração em banco temporário, incluindo o `downgrade`

## 7. Skill

- [x] 7.1 Atualizar a skill `arquiteto-de-magias` (`.claude/skills` e `.agents/skills`) com a seção "Código de importação" (D7) e guardar o texto em `openspec/changes/adaptar-cartas-ao-framework/skill/SKILL.md`; verificar gerando com a skill a Raízes do Brejo Faminto e importando o código pela API de pré-visualização, com Grau "Intermediária", Descansos `6` e Custo de Uso `5 PP`

## 9. Pré-visualização como revelação da carta

- [x] 9.1 Gerar pelo Codex dois conceitos da pré-visualização no estilo de revelação de carta, escolher um e guardá-lo em `arte/conceito-previa.png`, com os prompts em `arte/prompts.md`
- [x] 9.2 Reescrever o diálogo de importação como revelação (carta grande, destaques, campos, avisos e ações; só o código antes da prévia; celular em coluna; movimento reduzido), em SVG/CSS; verificar com testes do diálogo para os três cenários do requisito
- [x] 9.3 Capturar a pré-visualização em computador e em 375 px e obter a aprovação do usuário por comparação com o conceito

## 8. Verificação final

- [x] 8.1 Rodar a suíte completa (pytest, Vitest, build e e2e das cartas) e registrar o resultado
