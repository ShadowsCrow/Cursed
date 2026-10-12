# Design

## Context

A mudança arquivada `calcular-valores-da-ficha` (D5) materializa cada habilidade do catálogo como carta publicada da mesa, identificada por `card_definitions.origem_sistema`, com custos vazios. A conferência (`cartas_catalogo.materializar`) compara título, texto, ativação, tags e custo legado; se algo difere, publica o conteúdo do JSON por cima. A API só bloqueava a edição dos corpos padrão (`corpos.eh_padrao`). O envio de imagem para essas cartas já era recusado (`images.py`).

## Goals / Non-Goals

**Goals:**
- Uma só fonte para as cartas do catálogo: o JSON, inclusive os custos.
- Nenhuma edição na mesa que o sistema desfaça depois.

**Non-Goals:**
- Preencher custos no JSON, criar editor de catálogo ou mudar outras cartas (ver proposta).

## Decisions

- **D1 — Recusa no servidor, não só na tela.** `_editavel` em `cards.py` passa a recusar também `origem_sistema`, com `409` e a mensagem "As cartas do catálogo do sistema não se editam: mude o JSON de classes e raças.". Salvar rascunho e publicar usam essa guarda, então a tela e qualquer outro cliente ficam no mesmo limite.
- **D2 — Custos opcionais no JSON, com os nomes da carta.** Cada habilidade aceita `custo_aprendizado`, `descansos_minimos`, `potencia_uso` e `custo_uso`, inteiros ≥ 0, os mesmos nomes do conteúdo da carta (`cartas.CUSTOS`). Valor em outro formato torna o arquivo inválido, e a recarga mantém a última versão válida (comportamento já existente). O campo legado `custo` continua só como texto histórico.
- **D3 — A conferência compara os custos.** `_comparavel` passa a incluir os quatro custos; mudar um custo no JSON gera nova versão e move as posses concedidas, como com o texto. Cartas já materializadas sem custo continuam iguais enquanto o JSON não trouxer custo, então a primeira conferência depois da mudança não cria versões.
- **D4 — Interface.** A biblioteca mostra o lápis só em cartas que não são corpo padrão nem do catálogo do sistema. O aviso "o JSON do catálogo prevalece" do editor sai, porque o editor não abre mais para essas cartas.

## Risks / Trade-offs

- [Mesas cujo Narrador já editou uma carta do catálogo] → A versão editada continua vigente até a próxima mudança daquela habilidade no JSON, como antes. Nada é apagado; o histórico mantém as versões.
- [Custos iguais para todas as mesas] → É a intenção: o livro de regras e o catálogo definem o custo, não cada mesa. Exceções continuam possíveis pela concessão como aprendida.
- Impacto de jogo: nenhum sobre escassez, combate ou ritmo; reduz carga do Narrador, que não precisa (nem pode) manter custos por mesa.
