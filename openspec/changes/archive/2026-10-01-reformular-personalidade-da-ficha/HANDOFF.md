# Passagem de trabalho — reformular-personalidade-da-ficha

## O que a mudança faz

É uma cópia fiel da imagem de referência da aba Personalidade que o usuário enviou (`referencia/personalidade.webp`). Traz dois campos narrativos novos, Frase marcante e Traços, e a arrumação da aba passa a vir do `listas_ficha.json`.

Classificação: **núcleo**, com interface e dados narrativos, sem efeito mecânico.

## Decisões do usuário (2026-09-29; não reabrir sem pedir)

1. **Cópia fiel:** "quero uma cópia fiel dessa página, planeje bem como vamos atingir o resultado".
   - Vale só para a seção Personalidade, da moldura dourada para baixo.
   - O cabeçalho, a faixa e as abas do alto da imagem ficam como estão (são da `reformular-visual-da-ficha`). As diferenças encontradas só são listadas aqui (tarefa 9.2).
2. **Campos novos:** "Frase marcante" (citação no topo) e "Traços" (etiquetas, até 6).
3. **Pecado:** a linha mostra só o nome. Nas palavras do usuário: "o ícone é sobre o tema do campo, que no caso é pecado; agora, ao selecionar, não precisa mais mostrar o emoji". O emoji continua nas opções de escolha.
4. **Pinturas:** prompts nesta mudança (`arte/prompts.md`), e o usuário gera.
5. **Ícones:** recortados da própria referência, por sugestão do usuário (2026-09-30: "se vc consegue cortar os símbolos dos ícones, não é só tu fazer isso, salvar e usar?"). A folha gerada no ChatGPT deixou de ser necessária. As silhuetas em SVG ficam como reserva.
6. **Mudança nova,** separada da `reformular-visual-da-ficha`.
7. **A História é um campo só** (`personalidade.historia`): o jogador escreve na etapa Personalidade da criação, edita na aba Personalidade, e o Resumo mostra o texto.

## Regras

`rules/sistema` não muda: a Frase marcante e os Traços são campos da ficha digital, sem regra de mesa.

## Cuidados

- **Árvore de trabalho misturada:** a branch `feature/retrato-refinamento` tem alterações sem commit da `reformular-visual-da-ficha` e de outros pedidos. Os commits precisam ser separados.
- Após mudar a API, rodar `.venv/Scripts/python.exe -m cursed_platform.export_openapi` e `npm run generate:client` (em `platform/frontend`).
- Os testes do backend usam `unittest`: `.venv/Scripts/python.exe -m unittest`.
- Molduras só em SVG/CSS. As imagens servem só para as pinturas e os ícones.

## Como medir

- **Gabarito:** `platform/frontend/e2e/fixtures/referencias/personalidade/`, com a cópia da referência e o `caixas.json` (caixa de tinta de cada âncora, relativa ao canto da folha). `node e2e/fidelidade-personalidade.mjs medir [--conferir]` remede a referência.
- **Comparação:** `E2E_APP_URL=http://localhost:5183 node e2e/fidelidade-personalidade.mjs`. Gera o lado a lado, a sobreposição, a diferença e `relatorio.md` em `.screenshots/personalidade/fidelidade/`.
- **Depuração:** `node e2e/fidelidade/caixas-dom.mjs` lista as caixas do DOM ao lado das da referência. Use quando a tinta de uma peça sai da região de busca e a medida fica parcial.
- **Regiões:** algumas regiões foram estreitadas para não pegar peças vizinhas da referência (o castiçal junto das etiquetas, a voluta do quadro junto do último botão). O quadro "Convicções e sombras" é medido em duas âncoras, porque a base da pintura cai sobre a borda de cima dele.
- **Prévia de trabalho:** `personalidade-preview` no `.claude/launch.json`, na porta 5183.

## Decisões de implementação

- **Linhas como nas Informações básicas:** o `EditableField` e o `SelectField` não mudaram. Cada campo fica dentro de uma linha com o ícone, e o CSS da aba faz a disposição e o botão "Editar".
- **Coluna dos rótulos medida:** na referência, ela tem a largura da linha mais larga depois da quebra ("QUANDO ME VEEM" à esquerda, "RELIGIÃO OU CRENÇA" à direita). O CSS não encolhe uma caixa até o texto quebrado, então `useLarguraDosRotulos` mede as caixas das linhas e passa `--rotulo`.
- **Altura das linhas:** o quadro de 6 linhas (58 px cada) define a altura dos dois. O outro estica, mas as linhas dele param em 66,75 px (`max-height` na área), como na referência.
- **Lápis da citação e das etiquetas fora do desenho:** a referência não tem esses botões. Para quem edita, só o lápis, fora do quadro, sobre a pintura.
- **`tipo` opcional no contrato:** com o padrão "texto", ele ficava obrigatório no cliente gerado e quebrava fixtures de outras sessões.
- **Testes antigos da Personalidade:** saíram do `IdentityPanel.test.tsx` para o `PersonalityPanel.test.tsx`, já com o pecado sem emoji. No `CharacterSheetPage.test.tsx`, a Personalidade deixou o teste da moldura comum e ganhou um caso de folha própria.

## Pontos de revisão

- **1, estrutura (2026-09-29):** aprovada pelo usuário. Só os louros ("Vivo para") e a aranha ("Medo ou fobia") não ficaram bons nos ícones provisórios em SVG; foram redesenhados. Ele pediu uma skill de SVG:
  - No catálogo de skills do claude.ai, nada. No diretório de plugins, só o Supericons, que busca ícones prontos.
  - A `ui-ux-pro-max` instalada só recomenda ícones prontos (Phosphor), sem técnica de desenho.
  - Online (skills.sh, mcpmarket, claudemarketplaces), só skills comunitárias de pouco uso, como `svg-specialist`, `icon-designer`, `svg-icon-maker` e `linyaosky/svg-skill`, que ensinam o básico de caminhos e otimização. Nenhuma foi instalada; seria código de terceiros no projeto e depende da decisão do usuário.
  - Os louros agora são gerados por geometria: curva em U, pares de folhas pontudas (cúbicas) a cerca de 30° da haste e X embaixo. A aranha ganhou cabeça com palpos, abdômen oval e patas em curva. A comparação ampliada está em `.screenshots/personalidade/revisao-1/icones-louros-aranha.png`.
- **3, 4 e 5, ornamentos, ícones e pinturas (2026-09-30):** o usuário viu a página inteira ao lado da referência (`.screenshots/personalidade/revisao-5/`) e aprovou: "Ficou ótimo". Não pediu refinar o canto nem a filigrana.
- **Avisos de outras sessões (2026-09-29):** a de Perícias apontou um import que sobrou no `IdentityPanel.test.tsx` (a remoção anterior não pegou por causa do CRLF) e a aba rolando em 320 px (a citação e os divisores tinham largura fixa, e os lápis ficavam fora do desenho). As duas foram corrigidas, e o `ficha-visual.spec.mjs` passou inteiro contra a prévia (16 de 16). Depois ela apontou o `test_fichas_existentes_inalteradas`, que compara os catálogos com o HEAD: o teste passou a aceitar as mudanças aprovadas no `listas_ficha.json` (Frase marcante, Traços, ícones dos campos e a arrumação da aba). A suíte completa do backend passou: 534 testes, 16 pulados.
- **2, tipografia (2026-09-29):** o usuário seguiu com `/opsx:apply` depois de ver as imagens (`.screenshots/personalidade/revisao-2/`), sem pedir mudanças.
- **Fonte (passada 2, 2026-09-29):** o usuário autorizou baixar a EB Garamond e deixou a escolha comigo ("vc toma a decisão").
  - **Proporção:** o Cormorant tinha menos erro médio de proporção largura/altura (9,2% contra 14,9%).
  - **Visual:** a EB Garamond é bem mais parecida no peso do traço, na altura das letras e no desenho (`.screenshots/personalidade/revisao-1/fontes.png`).
  - **Escolha:** a EB Garamond (OFL, `public/fonts/eb-garamond-*.woff2` e `OFL-eb-garamond.txt`), no token `--fonte-folha`, só nesta folha. A diferença de proporção se corrige com espaçamento: a letra da referência é condensada (-0,05em nos valores e títulos grandes, -0,02em nos títulos dos quadros).
  - **Rótulos, eyebrow e "Editar":** ficaram mais encorpados (Alegreya Sans 800, EB Garamond 600).
- **Paleta:** foi para `personalidade/paleta.ts`, aplicada como variáveis CSS pelo componente, porque o Vitest esvazia o CSS e o teste de contraste precisa ler as cores. O rótulo (#7a562d → #76532c) e o vazio (#726752 → #635a47) saíram um pouco mais escuros que a mediana da imagem, para ter 4,5:1 na borda mais escura do pergaminho.
- **Vazio em itálico:** o `SelectField` não marca o valor vazio (o `EditableField` marca). A linha ganhou `personalidade-linha--vazia`, e o componente compartilhado não mudou.
- **Tolerância:** 38 de 45 âncoras passam.
  - A posição do último valor da direita fica em 7 px. A referência não é coerente: a folga entre rótulo e valor é maior na coluna da direita, e uma regra só não acerta as duas.
  - Também passam da tolerância a largura de "Leal | Bom" (a referência quase não tem espaço em volta da barra), o "Não informado" em itálico, a haste (canto, passada 3) e os ícones e emblemas (passada 4).
- **Ornamentos (passada 3, 2026-09-29):** todos em `personalidade/ornamentos.tsx` e `personalidade/quadro-fino.svg`.
  - **`CantoFiligrana`:** redesenhado sobre o canto da referência ampliado 6×, com o canal de azul-noite entre dois filetes, o nó de dois laços, a lança com a conta e um cacho em cada ponta. O mesmo desenho, menor e com bronze, vai nos cantos da História.
  - **Quadros dos grupos:** moldura fina em 9 fatias sobre o padding (`border-image` com a borda real de 1 px), com curva, espiral e bolinhas nos cantos. Na citação, ela fica num `::before` que esmaece à direita, onde a referência entra na pintura.
  - **Divisores:** o do topo tem seta, ponto e lente. Os separadores das linhas têm ponto, tique de seta e linha. O da História tem floreios e o losango ornado. Os pontos das pontas ficam no divisor dos grupos.
  - **Resto:** aspas em SVG e filigrana d'água no canto da História.
  - **Tarefa 5.1 (extrair o CSS comum do Resumo):** ficou aberta. A folha da Personalidade não usa as classes do Resumo e trocou os cantos, então a extração só mexeria no Resumo sem ganho. O cancelamento foi proposto ao usuário no ponto de revisão 3.
- **Ícones recortados (2026-09-30):**
  - **Preparo:** `preparar_icones_da_personalidade` corta cada símbolo num quadrado do tamanho em que ele aparece na referência (48 px nas linhas, 80 nos emblemas, 56 no livro da História). Depois amplia 4× com suavização e converte a luminância em alfa, com uma curva em S que apaga as manchas do papel.
  - **Saída:** `public/arte/personalidade/icones/*.webp`, sem perda. Ela roda no `main()` do script, fora do `preparar()`, porque o teste do preparo completo confere a lista exata das saídas das matrizes.
  - **Tela:** a máscara aparece no tamanho da referência, com margem negativa para o espaço do layout não mudar. Com as máscaras, os ícones e os emblemas passaram a bater, e o relatório ficou em 41 de 43 âncoras. As duas que falham são o espaçamento entre as colunas.
  - **Portas:** a prévia de trabalho passou a ser a 5189, que o usuário abriu; a 5183 caiu com o reinício da sessão.
- **Pinturas pelo Codex (2026-09-30):** o usuário definiu que a geração de imagens do projeto passa a ser feita por mim, pelo Codex CLI dele, logado no ChatGPT Plus e sem chave de API ("esse será o modus operandi").
  - **Como rodar:** `codex exec --skip-git-repo-check -m gpt-5.6-sol -s read-only -i <recorte> - < prompt.txt`, com "Use $imagegen" no prompt. O modelo padrão do `config.toml` dele (`gpt-6-sol`) não funciona com conta ChatGPT.
  - **Onde ficam:** as imagens saem em `~/.codex/generated_images/` e são copiadas para `arte-original/personalidade-escrivaninha.png` e `personalidade-historia.png`. O `preparar_arte.py` (`ARTES_DA_PERSONALIDADE`) grava os WebP em `public/arte/personalidade/`.
  - **Escrivaninha:** saiu fiel na primeira tentativa.
  - **História:** foi gerada duas vezes. A primeira deixou a metade esquerda vazia e a cena saiu pequena. A segunda preenche o quadro como o recorte, e o esmaecimento do CSS caiu para 12%. O prompt revisado está em `arte/prompts.md`.
- **Ajustes pedidos depois da aprovação (2026-09-30):**
  - **Pintura da História "mal inserida":** sobrava pergaminho entre a pintura e a moldura, e a borda de baixo saía reta. Agora a cena encosta no filete de dentro em cima, embaixo e à direita, com 484 px de largura, e esmaece à esquerda até 34%. A área no gabarito foi revisada.
  - **Editores:** o editor dos Traços estava sem estilo, e ganhou `personalidade/tracos.css`. O da Frase marcante herdava o centro da citação. A borda da folha cruzava o editor aberto, e o bloco agora sobe (`z-index: 4`) quando há editor aberto.

## Diferenças no alto da página (tarefa 9.2, só registro)

Comparação do cabeçalho, da faixa de estado e das abas com o alto da referência, a 1122 px (`.screenshots/personalidade/`). Essas peças são da `reformular-visual-da-ficha` e não foram alteradas aqui; fica para decisão do usuário.

1. **Moldura do cabeçalho:** a referência tem filete dourado simples com cantos em voluta arredondada. A tela tem cantos com pontas de lança e um cabeçalho mais alto.
2. **Faixa de estado:**
   - Na referência, cada placa (Exaustão, Estresse, Esforço) fica solta sobre o fundo. Na tela, as placas estão dentro de um contêiner com borda.
   - Os ícones também diferem: na referência, sol dourado e cérebro; na tela, ampulheta e balão.
3. **Barra de abas:**
   - Na referência, as dez abas cabem numa linha, dentro de uma barra com borda arredondada, com fonte menor e a aba ativa com borda dourada. Na tela, a barra não tem contêiner, a fonte é maior e, a 1122 px, as últimas abas ficam na rolagem.
   - Na referência, a última aba se chama "Habilidades e cartas"; na plataforma, por decisão anterior do usuário, ela se chama só "Cartas".
4. **Espaçamento:** a referência é mais compacta entre o cabeçalho, a faixa e as abas.
5. **Retrato:** a referência mostra "Trocar retrato" e "Remover retrato" com um retrato enviado. A prévia não tem retrato e mostra "Enviar retrato": é diferença de dado, não de desenho.

## Verificação (2026-09-30)

- Backend: `.venv/Scripts/python.exe -m unittest discover -s cursed_platform/tests -t .` → 543 testes, OK (16 pulados).
- Frontend: `npm test` → 89 arquivos, 662 testes. `typecheck`, `check:client` e `export_openapi --check` sem erros. O `lint` só acusa `e2e/_captura-tmp.mjs`, arquivo temporário de outra sessão.
- e2e: `node e2e/run.mjs` → 79 testes, com os 7 de `personalidade-visual.spec.mjs`.

## Estado

Concluída (2026-09-30): 33 tarefas feitas e a 5.1 retirada.
- **5.1 (extrair o CSS comum do Resumo):** retirada com a aprovação do usuário.
- **8.4 (telas estreitas):** capturas em 360, 768, 1280 e 1440 px (`.screenshots/personalidade/larguras/`) aprovadas pelo usuário.
- **Arquivamento:** depende da `reformular-visual-da-ficha` (cabeçalho, abas, `MolduraSecao`); arquivar depois dela.
