# Proposal

## Why

O Narrador cria magias e habilidades pelo Framework de Criação, revisado em 2026-10-01 com a aprovação do usuário. A carta da plataforma, porém, guarda só título, texto livre, ativação e os quatro custos. Alcance, área, duração, teste, componentes, limitações e os demais campos do Framework ficam misturados na descrição, e o jogador não encontra de relance o que a magia faz. Grau, Descansos Mínimos e Custo de Uso são digitados à mão e podem contradizer as tabelas. O Grau ainda é um número, que se confunde com o Círculo das escolas. Além disso, quem cria uma magia com a skill `arquiteto-de-magias` precisa redigitar campo a campo no editor, porque não existe um código de importação para criações.

Agora é o momento porque o Framework acabou de mudar (Custo de Uso crescente, duração e área pela força do efeito, Círculo em vez de "Grau de Acesso") e o conteúdo do livro (magias, combos, mutações, transformações) ainda vai ser migrado para o catálogo. Sem os campos estruturados, essa migração ficaria presa a texto livre.

Classificação: **ferramenta exclusiva do Narrador** (criação e edição de cartas), com efeito visível para o jogador na leitura das cartas.

## What Changes

- Cartas de habilidade e magia ganham os campos do Framework: Escola (magias) ou Disciplina (habilidades), Tipo, Lançamento, Combo, Persistência, Alcance (Pessoal, Toque, Alcance da arma ou metros de 1 em 1), Forma, Alvo ou Área, Impactos, Duração, Efeito Principal, Efeitos Secundários, Efeitos Condicionais, Teste, Componentes, Limitações e Escalonamento. O Acesso usa o campo Requisitos que a carta já tem, e a Natureza é o próprio tipo da carta.
- O Tipo passa a ter quatro opções: Ativa, Reação, Passiva condicional e Passiva permanente. O valor "passiva" das cartas existentes vira "Passiva condicional" ou "Passiva permanente" só por decisão do Narrador; até lá, a carta fica marcada para revisão.
- A Escola de uma magia passa a ser escolhida entre as oito escolas de `Escolas de Magia.md`.
- **BREAKING:** o Grau deixa de ser um número digitado. Ele passa a ser Básica, Simples, Intermediária, Avançada, Especialista, Mestra ou Lendária, calculado pelo Custo de Aprendizado e pela natureza da criação. Os Descansos Mínimos também passam a ser calculados.
- O Custo de Uso passa a ser calculado pela Potência de Uso (`Potência² ÷ 80`, arredondado para cima, mínimo `1 PP`; `0 PP` para passivas permanentes). O Narrador pode registrar outro valor, e a carta mostra um aviso com o valor do Framework.
- As tabelas do Framework usadas nesses cálculos (faixas de grau e descansos por natureza, custos mínimos, fórmula do Custo de Uso, lista das escolas) passam a ficar num catálogo JSON do sistema, como os demais catálogos.
- O detalhe da carta na ficha e na biblioteca mostra os campos preenchidos, e o editor de cartas ganha os campos novos.
- Novo código de importação de criações, com o prefixo `CR1`, no mesmo padrão dos códigos `E1`, `E2`, `EQ1` e `EQ2`. A importação de cartas existente o aceita, com a mesma pré-visualização e validação.
- A skill `arquiteto-de-magias` passa a terminar cada criação calculada com o código `CR1`, gerado pelo codificador do próprio projeto.

## Non-goals

- Não calcula a pontuação da criação (quanto vale cada elemento). Isso continua com o Narrador e com a skill, porque exige julgamento e analogias.
- Não altera as regras de `rules/sistema`, já revisadas e aprovadas antes desta mudança.
- Não implementa o contador de aprendizado (PP investido e descansos dedicados por criação) nem o gasto automático de PP ao usar uma carta.
- Não migra o conteúdo do livro (magias, combos, mutações, transformações) para o catálogo; isso será outra mudança, que dependerá desta.
- Não recalcula os custos das habilidades das classes em `classes.json`: os valores definidos pelo usuário continuam valendo.
- Não altera os códigos `E1`, `E2`, `EQ1` e `EQ2` nem cria exportação de cartas pela interface.

## Capabilities

### New Capabilities
- `criacoes-do-framework`: os campos do Framework numa carta de habilidade ou magia, os valores calculados pelas tabelas (Grau, Descansos Mínimos, Custo de Uso), as tabelas no catálogo JSON, os avisos de divergência e o código de importação `CR1` gerado pela skill.

### Modified Capabilities
- `cartas-de-conteudo`: os campos mecânicos passam a incluir os calculados, e a importação portátil passa a aceitar o código `CR1`.
- `editor-de-cartas`: o editor mostra os campos do Framework e os valores calculados, sem permitir digitar Grau e Descansos Mínimos.
- `visual-da-ficha`: o detalhe da carta mostra os campos do Framework preenchidos e o Grau pelo nome.

## Impact

- **Dados e contratos:** `cursed_platform/contracts.py` (`ConteudoHabilidade`, `ConteudoMagia`), `cursed_platform/cartas.py` (validação, avisos, `rascunho_de_codigo`), novo codec em `cursed_platform/domain/`, novo catálogo em `cursed_platform/catalogos/` e seu registro em `catalogos.py` e `manifesto.json`.
- **API:** pré-visualização e importação de cartas aceitam `CR1`; o esquema OpenAPI e os tipos gerados do frontend mudam.
- **Interface:** `CardEditor.tsx`, `camposDoEditor.tsx`, `usoDosProblemas.ts`, `cardFormat.ts`, `dadosDoGrimorio.tsx` e o diálogo de importação da biblioteca do Narrador.
- **Migração:** cartas existentes com `grau` numérico e `ativacao: "passiva"` (Supabase de testes).
- **Skill:** `.claude/skills/arquiteto-de-magias/SKILL.md` e a cópia em `.agents/skills/`.
