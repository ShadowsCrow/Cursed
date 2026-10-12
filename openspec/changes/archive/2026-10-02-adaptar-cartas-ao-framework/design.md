# Design

## Context

- O conteúdo de uma carta é um JSON validado por modelos Pydantic (`ConteudoHabilidade`, `ConteudoMagia` em `cursed_platform/contracts.py`) e guardado em versões imutáveis. Hoje ele tem `ativacao` (`ativa` | `passiva`), `escola` (texto livre), `grau` (inteiro livre) e os quatro custos digitados.
- As habilidades das classes viram cartas somente leitura a partir de `classes.json` (`cursed_platform/cartas_catalogo.py`). Nenhuma habilidade do catálogo tem custos preenchidos. O campo `tipo` delas vale "Ativa" (38), "Passiva" (30), "Reação" (3), "Ritual" (2) e outros; hoje só Ativa e Passiva viram `ativacao`, e o resto vira marcação.
- Os códigos portáteis seguem `PREFIXO:base64url(zlib(json))` (`cursed_platform/domain/efeitos_codec.py`). A importação de cartas passa por `rascunho_de_codigo` (`cursed_platform/cartas.py`), que hoje só conhece efeitos e equipamentos.
- O editor recebe do servidor a validação, os problemas por campo e os avisos de revisão (`usoDosProblemas.ts`), e salva sozinho pouco depois de cada alteração.
- Já existe o padrão de casos compartilhados entre Python e TypeScript: `fixtures/grade/casos.json`, usado por `domain/grade.py` e por `gridEngine.ts`.

## Goals / Non-Goals

**Goals:**
- Uma única fonte para as tabelas do Framework (o catálogo JSON), lida pelo servidor e pelo editor.
- Cálculos de Grau, Descansos Mínimos e Custo de Uso idênticos no servidor e no editor, conferidos pelos mesmos casos.
- Um código `CR1` que a skill gera e a plataforma importa sem perda.

**Non-Goals:**
- Pontuar elementos (alcance, dano, área) automaticamente.
- Estruturar em números os demais campos textuais. Continuam texto todos, com exceção de Tipo, Escola, Forma e Alcance.

## Decisions

### D1. Campos planos no conteúdo da carta
Os campos entram como chaves planas em `ConteudoHabilidade` (herdadas por `ConteudoMagia`), no mesmo estilo de `escola`: `lancamento`, `combo`, `persistencia`, `forma`, `alvo_area`, `impactos`, `duracao`, `efeito_principal`, `efeitos_secundarios`, `efeitos_condicionais`, `teste`, `componentes`, `limitacoes`, `escalonamento`; `disciplina` só em habilidade e `escola` só em magia. Todos opcionais, texto com limite de tamanho, e `extra="forbid"` continua recusando chaves desconhecidas.
- *Alternativa:* um objeto aninhado `framework: {...}`. Rejeitada porque o editor, a validação por campo e os caminhos de problema (`dados.x`, `efeitos.0.x`) já trabalham com chaves de primeiro nível, e a âncora de cada problema ficaria mais complexa.
- O **Acesso** reaproveita `requisitos` (rótulo "Acesso" em habilidades e magias), e a **Natureza** é o `tipo` da carta, para não duplicar informação.

### D1b. Alcance estruturado
`alcance` é um objeto `{tipo, metros}`: `tipo` vem do catálogo (`pessoal`, `toque`, `arma`, `metros`), e `metros` é inteiro ≥ 1, obrigatório só quando `tipo` é `metros` e proibido nos outros casos. O editor mostra uma escolha e, para `metros`, um campo numérico de passo 1. A pontuação continua com o Narrador: a plataforma não converte metros em pontos.
- *Alternativa:* texto livre, como os demais campos. Rejeitada a pedido do usuário (2026-10-01): o alcance é lido e comparado com frequência na mesa e deve ser exato.
- A regra de pontuação do Framework (seção 6) está em faixas de 5 metros; uma distância entre faixas usa a faixa superior, como já vale para a Área (seção 7) e a Duração (seção 8). A seção 6 ainda não diz isso explicitamente (ver Open Questions).

### D2. Tipo no campo `ativacao`, com quatro valores
`ativacao` passa a aceitar `ativa`, `reacao`, `passiva_condicional` e `passiva_permanente`. O nome do campo fica, para não mexer nas cartas de efeito nem no restante do código que já lê `ativacao`.
- Cartas existentes com `passiva`: a migração move o valor para `ativacao_legado: "passiva"` e deixa `ativacao` vazio. A validação gera o aviso de revisão "Defina se a passiva é condicional ou permanente", que aparece junto do campo Tipo, sem bloquear a publicação. Não há como inferir qual das duas sem decisão do Narrador.
- Catálogo de classes: "Ativa" vira `ativa`, "Reação" vira `reacao`. "Passiva" continua sem tipo definido e ganha a marcação "Passiva", como já acontece hoje com "Ritual". Definir qual passiva é permanente fica para o usuário, em `classes.json`, fora desta mudança.

### D3. Grau e Descansos derivados na leitura, nunca guardados
`grau` e `descansos_minimos` saem do conteúdo aceito. O servidor calcula os dois a partir de `custo_aprendizado` e do tipo da carta e os devolve num bloco `calculados` junto do conteúdo (`grau`, `descansos_minimos`, `custo_uso_framework`). Isso vale para a resposta do catálogo, das cartas da ficha, das ofertas e das apresentações, e respeita a regra de que Descansos Mínimos só vão para o Narrador.
- *Alternativa:* calcular ao salvar e gravar no conteúdo. Rejeitada porque as versões são imutáveis: uma correção futura das faixas no catálogo deixaria cartas antigas com valores velhos.
- `custo_uso` continua no conteúdo, mas só quando o Narrador o registra. O valor efetivo mostrado é `custo_uso ?? custo_uso_framework`. Quando os dois existem e diferem, a validação devolve um aviso no campo Custo de Uso.

### D4. Catálogo `framework.json`
Novo arquivo em `cursed_platform/catalogos/`, registrado em `ARQUIVOS` (`catalogos.py`) e em `manifesto.json` com origem `rules/sistema` (data 2026-10-01). Conteúdo:
- `faixas` por natureza (`habilidade`, `magia`): lista de `{grau, minimo, maximo|null, descansos}` com os valores das seções 23 e 24;
- `custo_minimo` por natureza (6 e 12);
- `custo_uso`: `{divisor: 80, minimo: 1}` e a regra de passiva permanente = 0;
- `tipos`, `escolas`, `formas` e `alcances`: listas de `{id, rotulo}`.

A carga valida faixas contíguas e sem sobreposição, a última faixa aberta, e ids únicos. O servidor expõe o catálogo ao frontend pelo endpoint de catálogos que já existe (`catalogs.py`).

### D5. Cálculo puro em Python e em TypeScript, com casos compartilhados
`cursed_platform/domain/criacao.py` e `platform/frontend/src/app/cards/criacao.ts` implementam as mesmas funções puras: `grau(natureza, custo)`, `descansos(natureza, custo)`, `custoDeUso(potencia, tipo)`. As duas leem as tabelas do catálogo. `fixtures/criacao/casos.json` lista entradas e saídas esperadas, incluindo os casos-limite (11 e 12 PP de magia, 79 e 80, Potência 8 e 9, 40 e 41, passiva permanente) e as criações calculadas no Framework (Resposta Tática, Ping Pong, Ruptura em Cruz). Os testes dos dois lados leem o mesmo arquivo.
- *Por que duplicar:* o editor precisa mostrar o Grau enquanto o Narrador digita, sem esperar o salvamento automático. O servidor continua a autoridade. Os casos compartilhados impedem divergência.

### D6. Código `CR1`
Novo `cursed_platform/domain/criacao_codec.py`, reaproveitando `_encode_payload` e `_decode_payload` do codec de efeitos (movidos para um módulo comum ou importados). O conteúdo é o próprio rascunho da carta (`tipo` mais os campos aceitos por `ConteudoHabilidade`/`ConteudoMagia`), com duas tolerâncias: `grau` e `descansos_minimos` são aceitos, descartados e comparados com o cálculo para gerar aviso. `rascunho_de_codigo` passa a reconhecer o prefixo `CR1`, e a mensagem de código não reconhecido passa a listar os quatro formatos.

O módulo tem uma linha de comando para a skill: `python -m cursed_platform.domain.criacao_codec codificar <arquivo.json>` imprime o código ou os problemas de validação, e `decodificar <código>` imprime o JSON. A codificação valida o conteúdo com os mesmos modelos da importação, então a skill nunca entrega um código que a plataforma recusaria.

### D7. Skill
A skill passa a ter uma seção final "Código de importação": escrever o JSON da criação num arquivo do scratchpad, rodar a linha de comando de D6 com o Python do projeto (`.venv`) e colar o código na resposta. Pela regra do `AGENTS.md`, as skills fora de `openspec-*` não são versionadas; a skill é atualizada na máquina (`.claude/skills` e `.agents/skills`), e a mudança registra o texto novo em `skill/SKILL.md` dentro da própria pasta da mudança, como registro.

### D8. Editor e detalhe
- `CamposDeHabilidade` ganha os quadros novos na ordem do Framework. Tipo, Escola e Forma viram `CampoEscolha` com as opções do catálogo; os demais, `CampoTexto` (os de efeito, com área de texto).
- Os quadros Grau e Descansos Mínimos passam a ser só leitura, com o valor calculado por D5. O Custo de Uso mostra o calculado como sugestão (placeholder) e aceita outro valor.
- `dadosDoGrimorio.tsx` mostra os campos preenchidos depois de Escola/Disciplina e Grau, e o Grau pelo nome. `cardFormat.ts` troca "Grau 3" pelo nome.
- O resultado visual do editor e do detalhe precisa da aprovação do usuário por comparação com o conceito aprovado, como nas mudanças anteriores.

## Impacto no jogo

- **Escassez:** o Custo de Uso calculado pela fórmula nova torna visível ao Narrador quando uma criação forte custaria pouco; o aviso de divergência não impede custos maiores, como a Punição Divina (3 PP).
- **Risco de combate e ritmo:** nenhum efeito direto; a mudança muda a apresentação e a consistência dos números, não as regras.
- **Carga cognitiva:** o Narrador deixa de consultar as tabelas de grau, descansos e custo; o jogador lê alcance, área, duração e teste em quadros separados em vez de procurar no texto.

## Risks / Trade-offs

- [Muitos campos tornam o editor longo] → os campos de efeito usam área de texto recolhida quando vazia; os quadros seguem a mesma grade de duas colunas já aprovada.
- [Cálculo duplicado diverge entre Python e TypeScript] → casos compartilhados em `fixtures/criacao/casos.json`, testados nos dois lados.
- [Cartas antigas com `grau` e `descansos_minimos` digitados à mão perdem esses valores] → eles passam a ser calculados; cartas sem Custo de Aprendizado ficam com Grau indefinido, que é o comportamento correto. Os rascunhos perdem as chaves; as versões publicadas as mantêm, ignoradas. A migração registra no log os rascunhos alterados e os Descansos Mínimos que divergiam do cálculo.
- [Mudança de esquema quebra o cliente gerado] → regenerar o OpenAPI e os tipos do frontend na mesma tarefa da mudança de contrato.

## Open Questions

- Acrescentar à seção 6 do Framework a frase "uma distância entre duas faixas usa a faixa superior", como nas seções 7 e 8. É mudança de regra e depende do usuário; não altera esta implementação, que não pontua o alcance.

## Migration Plan

1. Migração Alembic `0022_cartas_campos_do_framework`, depois da `0021` (ainda não aplicada no Supabase de testes): nos **rascunhos** de habilidade e magia, remove `grau` e `descansos_minimos` do conteúdo e move `ativacao: "passiva"` para `ativacao_legado`. As **versões publicadas** não mudam: são imutáveis por requisito (`cartas-de-conteudo`) e por gatilho no banco (`card_versions_no_update`). Nelas, `grau` e `descansos_minimos` antigos ficam guardados e são ignorados: a plataforma mostra só os valores calculados. Decisão tomada na implementação, ao encontrar o gatilho.
2. O catálogo `framework.json` entra junto, porque o servidor não carrega sem ele.
3. Reversão: o `downgrade` devolve `passiva` a `ativacao`, mas não restaura `grau` e `descansos_minimos`, que passam a ser calculados. A migração registra no log as cartas alteradas e as que tinham valores divergentes do cálculo. Um campo de backup dentro do conteúdo foi descartado porque os modelos recusam chaves desconhecidas.
