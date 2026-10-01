# Passagem de trabalho — redesenhar-informacoes-basicas

## O que a mudança faz

Classificação: **núcleo, só interface**. A aba Informações básicas passa a seguir a imagem de referência do usuário (2026-09-29):
- a folha de pergaminho do Resumo, com cabeçalho "IDENTIDADE";
- dois quadros, "Características pessoais" e "Classificação e origem", com ícone, rótulo, valor e "Editar" em cada linha;
- a faixa "Conceito do arquétipo".

Campos, permissões, consequências das trocas e avisos do servidor não mudaram.

## Decisões tomadas na implementação

- **Campos intactos (D3):** `EditableField` e `SelectField` não foram tocados. Cada um é envolvido por `.info-linha`, que acrescenta o ícone; o CSS põe os filhos que o campo já renderiza em grade (rótulo | valor | botão).
- **Tamanho base sem "Editar":** a referência mostra o botão, mas o valor vem da raça. A linha mostra "Da raça {nome}".
- **Símbolo do sexo** pelo valor gravado (`informacoes/sexo.ts`): masculino, feminino ou neutro para o resto.
- **Natureza-morta da esquerda:** reaproveita `resumo-natureza-morta.webp`, que já casa com a referência. Só a da direita e a paisagem são novas.
- **Edição alinhada à direita:** o popover de edição abre alinhado ao botão (`right: 0`), para não sair da tela no celular.
- **`Pintura` do Resumo exportada** de `ResumoVisual.tsx` e reaproveitada.
- **Prévia `/preview/ficha`:** passou a ler classes, raças e sexos dos JSON do sistema, e o Lion ganhou sexo "Masculino". Com isso a aba mostra o conceito do Antimago e o Tamanho base.

## Cuidados

- **Ordem de arquivamento:** o delta modifica "Moldura comum das seções", que só existe em `reformular-visual-da-ficha` (ainda não arquivada). Arquivar esta mudança **depois** daquela; o `openspec validate` avisa disso.
- **Trabalho paralelo:** em 2026-09-29, outra sessão redesenhava a aba Atributos (`sheet/atributos/`) no mesmo `CharacterSheetPage.tsx`. O teste "cada seção fica na moldura com o título uma única vez" falha em Atributos por causa dessa mudança, não desta. O aviso de lint em `atributos/icones.tsx` também vem de lá.

## Estado (2026-09-29)

Tarefas:
- **2.3 e 4.2 concluídas:** o usuário aprovou o visual com as duas pinturas em 2026-09-29 ("Ficou ótimo"), pelas capturas `.screenshots/visual-da-ficha/informacoes-*.png`.
- **4.3 concluída (2026-09-29):**
  - `npm test`: 77 arquivos e 571 testes; `typecheck` e `lint` sem erros; e2e completo (`node e2e/run.mjs`): 41 testes.
  - Backend: 521 testes, com 1 falha que não é desta mudança. `PrepararArteTest` acusa as saídas `atributos-*`, que a `redesenhar-aba-atributos` pôs no `preparar_arte.py` sem pôr no `ESPERADO` do teste. As saídas `informacoes-*` estão no `ESPERADO` e conferem.
- **Pronta para arquivar**, depois da `reformular-visual-da-ficha`.

## Verificação (2026-09-29)

- `IdentityPanel.test.tsx`: 23 testes (8 novos da folha: quadros e rótulos, Tamanho base sem botão, só leitura, faixa do conceito com e sem conceito, ornamentos ocultos, símbolo do sexo, pinturas que falham e que carregam), axe sem violações.
- `CharacterSheetPage.test.tsx`: novo teste da folha no lugar da moldura comum.
- `test_preparar_arte.py`: 25 testes, com `ArteDasInformacoesTest` (2).
- e2e `ficha-visual.spec.mjs`: 16 testes, com 4 novos (1440, 768, 375 e 360 px: quadros lado a lado só na tela larga, linhas sem sobreposição, 9 botões para o Narrador, edição aberta sem rolagem horizontal).
- `npm run typecheck` sem erros.

## Pinturas reais (2026-09-29)

O usuário gerou as duas pinturas; o preparo e o encaixe foram ajustados a elas.
- **Paisagem:** a matriz tem o quarto esquerdo só de papel e muito rio embaixo. Inteira no cabeçalho, o castelo ficava pequeno; com `cover`, perdia o alto, a rosa e a ponte.
  - `preparar_arte.py` ganhou `AREA_UTIL`, frações recortadas antes da proporção: `(.28, .07, 1.0, .80)`, que mantém as colinas da esquerda para o esmaecimento.
  - Na tela, a imagem tem a proporção dela (`width: auto`, até 62% da largura), encostada à direita. O esmaecimento cai sobre a própria pintura: à esquerda, à direita e embaixo.
  - Com a paisagem, o cabeçalho reserva 15,5rem de altura.
- **Natureza-morta da direita:** veio limpa, com o fundo branco removido pelo preparo.
- **Faixa do conceito entre 640 e 899 px:** pinturas menores (10rem e 8,5rem), para o texto não ficar espremido.
- **Teste:** `ArteDasInformacoesTest` confere o recorte da área útil.

## Como ver

- Prévia sem API: `/preview/ficha?secao=informacoes` (com `papel=narrador` ou `papel=leitura`).
- Capturas: `E2E_APP_URL=http://localhost:5178 node e2e/capturas-ficha.mjs`.
