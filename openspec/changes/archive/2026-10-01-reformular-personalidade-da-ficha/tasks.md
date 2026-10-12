# Tarefas — reformular-personalidade-da-ficha

Cópia fiel da referência (`referencia/personalidade.webp`). Cada passada de interface (3 a 8) termina com o relatório de fidelidade dentro das tolerâncias (design D0) e com o lado a lado enviado ao usuário. A passada seguinte só começa depois da resposta dele.

## 1. Regras e gabarito

- [x] 1.1 Registrar no `HANDOFF.md` as decisões do usuário de 2026-09-29:
  - cópia fiel só da seção;
  - Frase marcante e Traços;
  - pecado sem emoji na linha;
  - pinturas e folha de ícones geradas por ele;
  - mudança nova;
  - a História é um único campo, da criação, da aba e do Resumo;
  - `rules/sistema` não muda.

  Verificação: `git diff rules/` só mostra `Carga.md`, a frase das moedas da `reformular-visual-da-ficha`; nada desta mudança.
- [x] 1.2 Gabarito `e2e/fixtures/referencias/personalidade/caixas.json` (com uma cópia da referência ao lado, porque o caminho da mudança muda ao arquivar): as âncoras do design D0, cada uma com seletor, região de busca, modo e limiar da tinta, e a caixa medida, em px a partir do canto da folha. A medida é a caixa de tinta, com o mesmo código que mede a tela (`e2e/fidelidade/tinta.mjs`, em canvas do Chromium). Verificação: `node e2e/fidelidade-personalidade.mjs medir --conferir` remede a referência com desvio ≤ 2 px das caixas gravadas e confere com `medidas.md`.
- [x] 1.3 Script `e2e/fidelidade-personalidade.mjs`:
  - encontra a largura de janela em que a seção mede 1098 px e fotografa a seção;
  - gera `lado-a-lado.png`, `sobreposicao.png`, `diferenca.png` e `relatorio.md` em `.screenshots/personalidade/fidelidade/`;
  - sai com erro se alguma âncora passar da tolerância.

  Verificação: rodado contra a aba atual, gera os quatro arquivos e aponta os desvios (a aba de hoje reprova, o que prova que o script mede).

## 2. Dados e servidor

- [x] 2.1 `listas_ficha.json` (design D2):
  - campos `frase` e `tracos`;
  - `icone` nos campos curtos;
  - `personalidade_topo`, `grupos_personalidade` (textos da referência palavra por palavra) e `icones_personalidade`.

  Verificação: o catálogo carrega (`test_catalogos` verde).
- [x] 2.2 `catalogos.py`: ler e validar tipos, máximo, ícones, topo e grupos (chaves reservadas, cada campo curto em um só lugar, longos fora dos grupos, ícones em `ICONES_PERSONALIDADE`). Verificação: `test_catalogos.py` com um caso válido e cada recusa (campo inexistente no grupo, campo em dois grupos, campo curto sem lugar, longo num grupo, ícone desconhecido, `maximo` num campo de texto), com uma mensagem que nomeia o campo.
- [x] 2.3 `validacao_ficha.py`: Traços (lista, máximo, vazio, limite por traço, repetido sem diferenciar maiúsculas e acentos) e Frase marcante pelo limite; texto no lugar da lista gera aviso. Verificação: `test_api_validacao_ficha.py`:
  - 7 traços recusados com a mensagem do máximo;
  - "Leal" e "leal" recusados;
  - 4 traços gravados em ordem pelo `PATCH`;
  - ficha antiga sem os campos, sem aviso.
- [x] 2.4 Contrato (`CampoPersonalidadeResumo` com `tipo`, `maximo` e `icone`; `ListasFichaResumo` com topo, grupos e ícones), `catalogs.py` e a regeneração do OpenAPI e do cliente. Verificação: `test_api_catalogos.py` confere grupos, topo e ícones; `export_openapi --check` e `npm run check:client` verdes.
- [x] 2.5 `fieldLabels.ts` com "Frase marcante" e "Traços". Verificação: `fieldLabels.test.ts` confere "Frase marcante" e "Traços", o rótulo que os pedidos de aprovação e o histórico mostram.

## 3. Passada 1 — estrutura

- [x] 3.1 Prévia `/preview/ficha?secao=personalidade` com Lion, o exemplo exato da referência, mais `vazia=1` e `papel=leitura`. Verificação: teste de renderização da prévia com os três estados (`ProvaDaFicha.test.tsx`).
- [x] 3.2 `PersonalityPanel` como folha própria (design D1), fora da `MolduraSecao`:
  - topo (haste, eyebrow, título, subtítulo, citação, etiquetas, área da pintura);
  - grupos do JSON com linhas que repartem a altura;
  - quadro História;
  - ainda sem ornamentos finais, com as caixas nas medidas de `medidas.md`.

  Verificação:
  - `PersonalityPanel.test.tsx` cobre o cenário de Lion, o campo movido de grupo no JSON, a ficha só de leitura sem "Editar" e sem quadros vazios do topo, o aviso "Vincular" no alinhamento fora da lista e "Personalidade" uma única vez;
  - o relatório de fidelidade mostra todas as caixas de quadro e de linha dentro da tolerância de posição.
- [x] 3.3 Linhas no padrão das Informações básicas (`Linha` com ícone + `EditableField`/`SelectField` sem alteração, disposição e botão "Editar" em CSS da aba); pecado exibido só pelo nome. Verificação:
  - `PersonalityPanel.test.tsx` salva um campo pela linha ("Vivo para") e confere o `aria-label` "Editar Vivo para";
  - teste do pecado "Orgulho" sem emoji na linha e com emoji nas opções;
  - `EditableField.test.tsx` e `IdentityPanel.test.tsx` seguem verdes, sem mudança nesses componentes.
- [x] 3.4 **Ponto de revisão 1:** lado a lado e sobreposição enviados ao usuário. Verificação: a resposta dele fica registrada no `HANDOFF.md`.

## 4. Passada 2 — tipografia e cores

- [x] 4.1 Prova de serifa: o título, os valores, a citação e a História em Cormorant Garamond e em EB Garamond (OFL, local em `public/fonts`, com a licença), num token `--fonte-folha` só desta aba. Verificação: dois relatórios de fidelidade e as duas sobreposições enviadas ao usuário; a escolha dele registrada no `HANDOFF.md`, e a fonte descartada removida do repositório.
- [x] 4.2 Tamanhos, pesos, espaçamentos, entrelinhas e a paleta de `medidas.md` aplicados ao texto, às etiquetas e ao botão "Editar". Verificação:
  - relatório com todas as âncoras de texto dentro da tolerância de posição e de tamanho;
  - teste automatizado de contraste ≥ 4,5:1 para rótulos, valores, vazio e etiquetas sobre o pergaminho.
- [x] 4.3 **Ponto de revisão 2:** envio ao usuário. Verificação: resposta registrada no `HANDOFF.md`.

## 5. Passada 3 — molduras e ornamentos

- ~~5.1 Extrair o CSS comum da folha do Resumo para `molduras/folha.css` e a `Pintura` para `ui/Pintura.tsx`~~: retirada com a aprovação do usuário (2026-09-30). A folha da Personalidade não usa as classes do Resumo e tem cantos próprios, então a extração só mexeria no Resumo sem ganho.
- [x] 5.2 Moldura externa com filete duplo e `CantoFiligrana` em SVG (sobre `referencia/canto-superior-esquerdo.png`), vazado com o azul-noite e avançando para fora. Verificação: teste de que o ornamento é `aria-hidden`; sobreposição dos cantos enviada no ponto de revisão.
- [x] 5.3 `molduras/quadro-fino.svg` (9 fatias, com volutas finas nos cantos) nos grupos e na citação; filete dourado duplo e `CantoFiligrana` pequeno na História; filigrana d'água no canto da História. Verificação: relatório com os quadros dentro de 4% de tamanho; nenhuma moldura é imagem (`grep` por `.png`/`.webp` no CSS da aba só encontra pinturas e ícones).
- [x] 5.4 `HasteTitulo`, o filete do eyebrow, a linha do título (seta e ponto), o divisor do topo (ponto e losango), os divisores dos grupos, os separadores das linhas (ponto e tique), o divisor da História (losango ornado) e as aspas em SVG. Verificação: teste de componente sem ornamentos na árvore de acessibilidade; lado a lado ampliado dessas peças no ponto de revisão.
- [x] 5.5 **Ponto de revisão 3:** envio ao usuário, com recortes ampliados de cantos e divisores ao lado dos da referência. Verificação: resposta registrada no `HANDOFF.md`.

## 6. Passada 4 — ícones

- [x] 6.1 Silhuetas provisórias em SVG (`personalidade/icones.tsx`) para os 14 nomes de `ICONES_PERSONALIDADE`. Verificação:
  - teste que compara a lista TS (`nomesDosIcones.ts`) com `ICONES_PERSONALIDADE` (`test_catalogos.py`, porque o Vite não importa o `.py`) e confere que todo ícone do JSON tem desenho (`icones.test.tsx`);
  - todo ícone `aria-hidden` e sem foco.
- [x] 6.2 Ícones recortados da própria referência (decisão do usuário, 2026-09-30, no lugar da folha gerada no ChatGPT): `preparar_icones_da_personalidade` em `preparar_arte.py` corta os 14 símbolos num quadrado do tamanho em que aparecem lá (48, 80 ou 56 px), amplia 4× com suavização e transforma a luminância em alfa (o pergaminho some, as manchas claras também). Saída: `public/arte/personalidade/icones/<nome>.webp`. Verificação: `test_preparar_arte.py` (`IconesDaPersonalidadeTest`) com máscara sintética (tinta opaca, pergaminho e mancha transparentes, região sem desenho recusada) e os 14 arquivos da referência inteiros dentro do quadrado.
- [x] 6.3 Ícones como máscara com a cor do tema, pré-carregados em grupo (`mascarasDosIcones.ts`), no tamanho da referência e sem mudar o espaço do layout, com as silhuetas SVG como reserva. Verificação: `mascarasDosIcones.test.tsx` (máscaras carregadas → máscara de 48 px com margem de -4 px; alguma falha → SVG); relatório de fidelidade com os ícones e emblemas dentro da tolerância (41 de 43 âncoras).
- [x] 6.4 **Ponto de revisão 4:** os 14 ícones recortados ao lado dos da referência. Verificação: aprovação registrada no `HANDOFF.md`.

## 7. Passada 5 — pinturas

- [x] 7.1 Prompts de `personalidade-escrivaninha` e `personalidade-historia` em `arte/prompts.md` (anexos `recorte-escrivaninha.png` e `recorte-historia.png`) e as entradas em `preparar_pinturas`. Verificação: `test_preparar_arte.py` gera os dois WebP quando as matrizes estão em `arte-original/`.
- [x] 7.2 Pinturas numa área de tamanho fixo reservada pelo layout (posição absoluta, sem depender do carregamento), com máscara em degradê e o ornamento em SVG no lugar quando a pintura falha. O pré-carregamento em grupo previsto (`pinturasDaPersonalidade.ts`) não foi necessário: a área já é fixa e nada se move quando a imagem chega. Verificação:
  - `PersonalityPanel.test.tsx` (a pintura que falha dá lugar ao ornamento, sem imagem quebrada);
  - `personalidade-visual.spec.mjs`: com as pinturas bloqueadas, as mesmas posições das linhas e nenhuma imagem quebrada; com as pinturas, nenhuma pintura sobre a citação, as etiquetas, o título ou o texto da História em 360, 768, 1280 e 1440 px (em 768, a do topo fica atrás só esmaecida).
- [x] 7.3 Trocar pelas pinturas geradas pelo usuário. Verificação: **ponto de revisão 5** com o relatório completo; aprovação registrada no `HANDOFF.md`.

## 8. Passada 6 — Traços, criação guiada e telas estreitas

- [x] 8.1 `TracosField` (design D3), em popover na aba e em linha na criação guiada. Verificação: teste com os quatro traços de Lion, a recusa do sétimo, a recusa de "leal" repetido, a remoção e a gravação em ordem; sem permissão, só as etiquetas.
- [x] 8.2 `EtapaPersonalidade`:
  - Frase marcante e Traços;
  - `modelo.ts` e `rascunho.ts` com `string | string[]`;
  - `EtapaConferencia` junta os traços com " · ";
  - a História continua na etapa.

  Verificação: `EtapaPersonalidade.test.tsx` e `AssistenteCriacao.test.tsx` com os traços no rascunho recarregado; um teste de conclusão confere que a História escrita na criação chega em `personalidade.historia` da ficha criada.
- [x] 8.3 História compartilhada. Verificação: `HistoriaCompartilhada.test.tsx` monta a página da ficha, salva a História na aba, abre o Resumo e vê o texto (arquivo próprio, para não mexer no fake compartilhado do `CharacterSheetPage.test.tsx`).
- [x] 8.4 Disposições de D9 (1000–1097, 640–999 e abaixo de 640 px). Verificação:
  - e2e sem rolagem horizontal em 360, 768, 1280 e 1440 px;
  - nenhuma pintura sobre texto;
  - um valor de 200 caracteres a 1280 px não sai da linha;
  - **ponto de revisão 6** com as capturas das quatro larguras (aprovadas pelo usuário em 2026-09-30).

## 9. Verificação final

- [x] 9.1 Teste de fidelidade no e2e (`personalidade-visual.spec.mjs`, que roda o script de fidelidade e exige saída sem falhas), para travar regressões. As duas âncoras em que a própria referência é incoerente (espaçamento entre as colunas; "Leal|Bom" sem espaços) têm tolerância própria no gabarito, com a nota do porquê. Verificação: o teste passa na versão aprovada e falhou com o título deslocado em 10 px (conferido em 2026-09-30 e revertido).
- [x] 9.2 Diferenças do cabeçalho, da faixa e das abas em relação ao alto da referência, listadas no `HANDOFF.md` para decisão do usuário, sem mudança de código. Verificação: lista registrada.
- [x] 9.3 Suítes completas verdes: backend (`unittest`), `npm test`, `typecheck`, `lint`, `check:client`, `export_openapi --check` e e2e completa. Verificação: execuções registradas no `HANDOFF.md`.
