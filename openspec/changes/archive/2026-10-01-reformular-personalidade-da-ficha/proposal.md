# Proposta — reformular-personalidade-da-ficha

## Why

A Personalidade é onde o personagem deixa de ser um conjunto de números. Hoje, porém, ela é uma grade de campos iguais dentro da moldura genérica da seção, sem hierarquia: o jogador não vê de relance quem o personagem é, e a História fica perdida entre campos curtos. O Resumo e o Inventário já ganharam a estética ornamentada aprovada pelo usuário. Agora a Personalidade deve seguir a imagem de referência que ele enviou em 2026-09-29.

Classificação: **núcleo** (interface da ficha e dois campos narrativos novos, sem efeito mecânico).

## What Changes

- **Cópia fiel da referência** (pedido do usuário, 2026-09-29):
  - a imagem, os recortes e uma ficha de medidas, paleta e tipografia ficam em `referencia/`, como gabarito;
  - a aba é comparada por sobreposição automática com a referência, na largura dela, com tolerâncias definidas;
  - o trabalho segue em passadas (estrutura, tipografia, molduras, ícones, pinturas e telas estreitas), cada uma com o lado a lado enviado ao usuário.
- **Aba Personalidade redesenhada** segundo a referência do usuário, com a técnica do Resumo e do Inventário: pergaminho com moldura dourada em SVG/CSS, ornamentos em SVG e pinturas opcionais que somem sem deixar imagem quebrada.
  - **Topo:** "QUEM É {NOME}", o título "Personalidade", um subtítulo, o quadro da Frase marcante, as etiquetas de Traços e a pintura da escrivaninha (vela, esfera armilar e janela com a lua) à direita.
  - **Duas colunas:** "Traços e essência" e "Convicções e sombras", cada uma num quadro com emblema, título e subtítulo. Cada campo vira uma linha com ícone, rótulo, valor e o botão "Editar".
  - **História:** quadro próprio, largo, com a pintura da pena, dos livros e da vela à direita.
- **Dois campos narrativos novos** (decisão do usuário, 2026-09-29):
  - **Frase marcante:** texto curto, mostrado como citação no topo.
  - **Traços:** até 6 palavras curtas, mostradas como etiquetas.
  - Os dois aparecem também na criação guiada e na conferência.
- **Arrumação no JSON:** os grupos da página, o ícone de cada campo e o lugar da frase e dos traços ficam no `listas_ficha.json`, como os demais dados da personalidade. Nada disso fica fixo no código.
- **Pecado sem emoji na linha:** o valor mostra só o nome, porque a linha já tem o ícone do tema do campo. O emoji continua nas opções de escolha (decisão do usuário, 2026-09-29).
- **Pinturas:** prompts em `arte/prompts.md` desta mudança, com os recortes da referência como anexo. O usuário gera as imagens, e o `preparar_arte.py` as prepara. Até elas chegarem, a folha fica completa com ornamentos em SVG.
- **Ícones gravados:** as 14 silhuetas (2 emblemas, o livro da História e 11 ícones de linha) são recortadas da própria referência pelo `preparar_arte.py`, ampliadas e transformadas em máscaras que pegam a cor do tema (revisado em 2026-09-30, por sugestão do usuário). Silhuetas em SVG ficam como reserva.

## Non-goals

- Nenhum efeito mecânico dos campos de personalidade, novos ou antigos.
- Não muda o Resumo, a não ser que ele continua a ler a História do mesmo campo. A Frase marcante e os Traços não entram no Resumo nesta mudança.
- Não redesenha as outras abas (Informações básicas, Atributos etc.). O cabeçalho, a faixa e a barra de abas continuam os da `reformular-visual-da-ficha`.
- Não muda a edição por superfície flutuante ("Editar" abre o editor do campo), nem as regras de permissão, de aprovação e de histórico.
- Não altera o livro de regras (`rules/sistema`): os campos são da ficha digital e não têm regra de mesa.
- Sem migração de dados: as fichas existentes ficam com os dois campos novos vazios.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `identidade-e-personalidade-do-personagem`:
  - o pecado escolhido aparece sem o emoji;
  - os campos narrativos ganham a Frase marcante e os Traços;
  - a arrumação da aba (grupos, ícones e lugares) passa a vir do JSON;
  - um requisito novo descreve a aba Personalidade ornamentada.

## Impact

- **Dados:** `cursed_platform/catalogos/listas_ficha.json` (campos novos, ícones, grupos e lugares); `catalogos.py` (leitura e validação); `contracts.py` (`CampoPersonalidadeResumo`, `ListasFichaResumo`); `domain/validacao_ficha.py` (etiquetas); rótulos do histórico; OpenAPI e cliente gerado.
- **Interface:**
  - `PersonalityPanel.tsx` reescrito e `CharacterSheetPage.tsx` sem a `MolduraSecao` nessa aba;
  - um editor de etiquetas novo;
  - ícones das linhas em SVG, junto de `resumo/ornamentos.tsx`;
  - `CamposDasEtapas.tsx` e `EtapaConferencia.tsx` na criação guiada;
  - a prévia `/preview/ficha?secao=personalidade`.
- **Artes:** `preparar_arte.py` (duas pinturas e a folha de ícones) e `public/arte/personalidade/`. Possível fonte nova (EB Garamond, OFL) em `public/fonts`, só se vencer a comparação.
- **Testes:**
  - `test_catalogos`, `test_api_catalogos` e a validação da ficha;
  - testes de componente da aba e da criação;
  - `test_preparar_arte`;
  - o e2e visual da ficha, com o teste de fidelidade e o script `e2e/fidelidade-personalidade.mjs`.
- **Depende de** `reformular-visual-da-ficha` (cabeçalho, abas, `MolduraSecao`), que ainda não foi arquivada. Esta mudança não altera os requisitos dela.
