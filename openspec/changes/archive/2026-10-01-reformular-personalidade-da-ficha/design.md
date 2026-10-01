# Design — reformular-personalidade-da-ficha

## Context

A motivação está no proposal.md. O usuário pediu uma **cópia fiel** da referência (2026-09-29). As medidas, a paleta e a tipografia estão em `referencia/medidas.md`, tiradas da imagem por varredura de pixels.

O estado atual que molda a solução:

- **Aba hoje.**
  - `CharacterSheetPage.tsx` põe o `PersonalityPanel` dentro da `MolduraSecao` (medalhão, título e subtítulo genéricos).
  - O painel é uma `detail-grid` com dois `SelectField` (alinhamento e pecado) e um `EditableField` por item de `campos_personalidade`.
  - Os dois campos mostram rótulo, valor e o gatilho "Editar", que abre um `Popover`. As permissões, a aprovação do Narrador e os avisos de valor fora da lista já funcionam neles.
  - O pecado aparece com emoji ("😡 Ira").
- **Dados.**
  - `cursed_platform/catalogos/listas_ficha.json` tem `alinhamentos`, `pecados` (com emoji) e `campos_personalidade` (`chave`, `rotulo`, `dica`, `longo`, `limite`).
  - `catalogos.py` valida, `validacao_ficha.py` aplica os limites e `catalogs.py` serve as listas (`ListasFichaResumo`).
  - `personalidade` na ficha é um `dict` livre.
- **Um só campo para a História.**
  - A etapa Personalidade da criação guiada (`CamposDasEtapas.tsx`) monta os campos pelo mesmo `campos_personalidade` e grava `personalidade.historia`.
  - O Resumo lê esse campo (`historiaDe`).
  - `modelo.ts` e `rascunho.ts` tipam a personalidade como `Record<string, string>`.
- **Peças e ferramentas que já existem:**
  - **Resumo:** folha de pergaminho com moldura em SVG/CSS, quadros em `border-image` (`quadro.svg`), `DivisorOrnado`, `RosaDosVentos` e `Pintura` opcional com máscara em degradê.
  - **Inventário:** grupos de pinturas pré-carregados, que reservam espaço e voltam ao SVG se falharem (`pinturasDaBolsa.ts`).
  - **Ferramentas:** `preparar_arte.py` (Pillow e numpy, com `remover_fundo`, `recortar_objeto` e `preparar_pinturas`), Playwright e a prévia `ProvaDaFicha` (`/preview/ficha?secao=…`).
- **Fontes locais:** Cormorant Garamond (400–700 e 500 itálico) e Alegreya Sans (400–800). A serifa da referência é mais encorpada que a Cormorant.

## Goals / Non-Goals

**Goals:**
- Cópia fiel da seção da referência na largura dela (1098 px), medida por sobreposição automática e não só a olho.
- As mesmas peças da ficha (molduras em SVG/CSS, pinturas opcionais) e o conteúdo do sistema (campos, grupos, ícones, textos dos quadros) no JSON.
- A edição continua com os mesmos `EditableField` e `SelectField`, com outra apresentação.

**Non-Goals:**
- Cópia do cabeçalho, da faixa de estado e das abas do alto da imagem. Eles são da `reformular-visual-da-ficha`; aqui só se listam as diferenças encontradas no `HANDOFF.md`.
- Pixel a pixel: o texto renderizado e as pinturas nunca serão idênticos. A meta é a mesma disposição, as mesmas proporções, cores e tipografia, e os mesmos ornamentos, dentro das tolerâncias de D0.
- Mudar o fluxo de gravação, as permissões ou a auditoria, além dos rótulos novos.

## Decisions

### D0. Gabarito medido e sobreposição automática

A fidelidade é verificada por máquina e depois pelo usuário.

1. **Gabarito** (`referencia/`): a imagem, os recortes e `medidas.md`. A tarefa 1.2 transforma as medidas em `referencia/caixas.json`. Cada âncora tem um seletor CSS da aba e a caixa esperada na referência, em px, com origem no canto da seção.
   - As âncoras são: a folha, a haste, o eyebrow, o título, a linha do título, o subtítulo, o divisor do topo, a citação, as etiquetas e a pintura do topo.
   - Em cada grupo: o quadro, o emblema, o título, o subtítulo, o divisor e, na primeira e na última linha, o ícone, o rótulo, o valor e o botão.
   - Na História: o quadro, o ícone, o título, o subtítulo, o divisor, o texto e a pintura.
   - Os seletores usam as classes da própria aba, sem atributos só de teste.
2. **Script `e2e/fidelidade-personalidade.mjs`:**
   - abre a prévia com o personagem Lion da referência;
   - ajusta a largura da janela por busca binária até a seção medir **1098 px**, espera as fontes e as pinturas e fotografa a seção;
   - gera, em `.screenshots/personalidade/fidelidade/`:
     - `lado-a-lado.png`;
     - `sobreposicao.png` (referência a 50% sobre a tela);
     - `diferenca.png` (modo diferença);
     - `relatorio.md`, com o desvio de cada âncora em x, y, largura e altura.
3. **Tolerâncias:**
   - posição: ±6 px;
   - largura e altura: ±8% nas caixas de texto e ±4% nos quadros;
   - pinturas: só a área reservada.
   - O mesmo cálculo roda como teste em `ficha-visual.spec.mjs`, para uma regressão futura falhar.
4. **Passadas com ponto de revisão:** a implementação segue em passadas (tarefas 3 a 7). Cada passada termina com o relatório dentro da tolerância e com o lado a lado enviado ao usuário, que pode corrigir o rumo antes da passada seguinte:
   - estrutura;
   - tipografia e cores;
   - molduras e ornamentos;
   - ícones;
   - pinturas;
   - telas estreitas.

*Alternativa descartada:* comparar só a olho com capturas soltas. Foi o que deixou diferenças de medida passarem nas outras abas e exigiu várias rodadas com o usuário.

### D1. Folha própria, fora da `MolduraSecao`

A referência não tem o cabeçalho genérico da seção. O título "Personalidade" fica no corpo da folha. Então:
- o `tabpanel` recebe `ficha-secao--personalidade`;
- dentro dele fica um `<Pergaminho as="article" className="folha-personalidade">`.

Detalhes:
- **Moldura externa:** filete dourado duplo em CSS (`box-shadow` e `border`) sobre bronze escuro e quatro **cantos de filigrana** em SVG. É um componente novo, `CantoFiligrana`, desenhado sobre `referencia/canto-superior-esquerdo.png`: ramos dourados vazados com o azul-noite da página entre eles, avançando ≈ 8 px para fora. Um só desenho, espelhado nos quatro cantos, como o `CantoDaFolha` do Resumo.
- **Pergaminho:** a textura `pergaminho.webp`, com a vinheta mais escura nas bordas (`#edd1a2`) e o centro `#f2dcb4`, como o Resumo.
- **CSS comum:** ~~o que for igual ao Resumo (textura, vinheta) sai de `resumo.css` para `molduras/folha.css`~~. Retirado (2026-09-30): a folha da Personalidade ficou com CSS próprio em `personalidade/personalidade.css` e não usa as classes do Resumo, que continua como estava.
- **Título:** "Personalidade" é o único `h2` da aba.

*Alternativa descartada:* manter a `MolduraSecao` e redesenhar só o corpo. O título ficaria duplicado, contra a referência.

### D2. Arrumação no JSON

No `listas_ficha.json`:

```json
"campos_personalidade": [
  {"chave": "frase", "rotulo": "Frase marcante", "dica": "Ex: Conhecimento é a única arma que nunca podem me tirar.", "limite": 160},
  {"chave": "tracos", "rotulo": "Traços", "dica": "Ex: Leal, Disciplinado", "tipo": "tracos", "maximo": 6, "limite": 24},
  {"chave": "coisa_favorita", "...": "...", "icone": "livro_aberto"},
  {"chave": "historia", "...": "...", "longo": true, "limite": 4000}
],
"personalidade_topo": {"citacao": "frase", "etiquetas": "tracos"},
"grupos_personalidade": [
  {"id": "essencia", "titulo": "Traços e essência", "subtitulo": "O que o move, o que acredita e o que o define.",
   "emblema": "rosa_dos_ventos", "campos": ["alinhamento", "coisa_favorita", "quando_me_veem", "vivo_para", "medo"]},
  {"id": "sombras", "titulo": "Convicções e sombras", "subtitulo": "O que teme, o que rejeita e aquilo que nunca abandona.",
   "emblema": "lua_solar", "campos": ["pecado", "odeia", "manias", "meu_lema", "valor_inquebravel", "religiao"]}
],
"icones_personalidade": {"alinhamento": "balanca", "pecado": "caveira"}
```

- **Textos:** os títulos e subtítulos são os da referência, palavra por palavra.
- **Ícones dos campos:**

  | Campo | Ícone |
  |---|---|
  | Coisa favorita | `livro_aberto` |
  | Quando me veem pensam que | `olho` |
  | Vivo para | `louros` |
  | Medo ou fobia | `aranha` |
  | O que odeia | `espadas` |
  | Manias ou hábitos | `mao` |
  | Meu lema | `ampulheta` |
  | Valor inquebrável | `estrela` |
  | Religião ou crença | `lua_estrela` |
- **Validação no carregamento** (`catalogos.py`):
  - `alinhamento` e `pecado` são chaves reservadas;
  - todo campo curto está em exatamente um lugar (um grupo ou o topo), e os longos ficam fora dos grupos;
  - `tipo` é `texto` (padrão) ou `tracos`, e `maximo` só vale em `tracos`;
  - `icone` e `emblema` pertencem a `ICONES_PERSONALIDADE`. Um teste confere que o frontend tem um desenho para cada nome.
- **Contrato:**
  - `CampoPersonalidadeResumo` ganha `tipo`, `maximo` e `icone`;
  - `ListasFichaResumo` ganha `personalidade_topo`, `grupos_personalidade` e `icones_personalidade`, com padrão vazio.
- **Textos da interface:** "QUEM É {NOME}", "Personalidade", "Traços, valores e marcas que definem o personagem." e "O passado que moldou o presente." são da interface, não do sistema. Ficam no componente, com o texto exato da referência.

*Alternativa descartada:* um campo `grupo` em cada item. Esse caminho espalha a ordem e não cobre alinhamento e pecado.

### D3. Traços

- **Formato:** `personalidade.tracos` é uma lista de strings.
- **Validação:** `validacao_ficha.py` recusa quantidade acima do máximo, traço vazio ou acima do limite e repetição. A repetição é comparada sem maiúsculas e acentos (`unicodedata.normalize("NFKD")`).
  - Um texto no lugar da lista gera aviso, sem conversão.
- **Gravação:** a lista viaja no mesmo `saveCampos([{ path: "personalidade.tracos", value: [...] }])`. O teste de API confirma que o `PATCH` aceita lista nesse caminho.
- **`TracosField`:** as etiquetas em leitura e o "Editar", que abre um `Popover` com:
  - o campo e o botão "Adicionar" (Enter também adiciona);
  - "Remover {traço}" em cada etiqueta;
  - o contador "N de 6";
  - Salvar e Cancelar;
  - a mesma validação do servidor, e o erro do servidor em `role="alert"`.
- **Na criação guiada:** o mesmo editor, em linha, com `personalidade: Record<string, string | string[]>`. A conferência junta os traços com " · ".
- **Etiquetas:** pílulas com fundo `#e3c18a`, borda de 1,5 px `#a07a45`, raio 6, altura 32, Alegreya Sans 600 a 15 px e texto `#583e12`.

### D4. Grupos e linhas, medidos

- **Grade dos grupos:** `grid-template-columns: 1fr 1fr` com `gap` de 20 px. Os dois quadros esticam até a mesma altura.
- **Linhas:**
  - dentro de cada quadro, `grid-template-rows: auto repeat(var(--linhas), 1fr)`: as linhas **preenchem a altura**, como na referência (passo de ≈ 67 px com 5 linhas e ≈ 58 px com 6);
  - cada linha é uma grade `[ícone 44px] [rótulo 7rem–8.2rem] [valor 1fr] [botão 84px]`, com o `gap` e o recuo medidos (`medidas.md`, Grupos).
- **Separadores:** um `::before` com filete de 1 px, um ponto de 3 px na ponta esquerda e um tique de seta em SVG inline como `background`.
- **Quadro do grupo:** filete fino, duplo no alto, feito com `border-image` de um SVG novo (`molduras/quadro-fino.svg`, 9 fatias) desenhado sobre `referencia/quadro-grupo-canto.png`: a mesma técnica do `quadro.svg`, com volutas finas nos cantos.
- **Cabeçalho do grupo:**
  - o emblema de 71 px à esquerda;
  - o título em serifa 700 de 24 px e o subtítulo de 15 px;
  - um divisor com pontos nas pontas.
- **Mesmos componentes, sem alteração:** a `redesenhar-informacoes-basicas`, aprovada pelo usuário, montou linhas iguais sem mexer no `EditableField` nem no `SelectField`. Cada campo fica dentro de uma `Linha` (ícone + campo), e o CSS da aba dispõe `.editable-field` em grade (rótulo | valor | ação) e estiliza o gatilho `.popover__trigger.text-action` como botão com o lápis em máscara SVG. A Personalidade segue a mesma técnica (`.personalidade-linha`), com as medidas desta referência.
  - A marcação e o `aria-label` "Editar {rótulo}" não mudam, e as outras sessões que usam esses componentes não são afetadas.
  - O gatilho vira o botão medido: 84 × 36 px, fundo `#f4e3c2`, borda `#c9af84`, raio 6, lápis preenchido de 16 px e "Editar" em serifa de 16 px.
- **Valores:**
  - serifa 600 de 19 px em `#272517`;
  - o vazio fica em itálico `#726752`: "Não informado" para quem só lê e a dica do JSON para quem edita;
  - até três linhas, com `title` para o texto inteiro.
- **Pecado:** o valor é só o nome ("Ira"). O emoji do JSON continua nas opções do editor e da criação guiada (decisão do usuário, 2026-09-29).

### D5. Topo e História, medidos

- **Topo:** uma grade de duas áreas (título à esquerda, citação e etiquetas no meio) e a pintura em `position: absolute`, que encosta no canto de cima à direita, dentro da moldura.
  - A citação começa a 461 px da borda da seção, como na referência. A grade reserva à direita a largura da pintura (≈ 33%) para ela não cobrir a citação.
- **Peças do topo:**
  - `HasteTitulo`: haste vertical em SVG, com um medalhão de cruz e pontas em lança, desenhada sobre `referencia/canto-superior-esquerdo.png`;
  - eyebrow com filete embaixo;
  - linha sob o título, com seta e ponto;
  - divisor do topo, com floreio de ponto e losango.
- **Citação:**
  - quadro de filete duplo com volutas nos cantos da esquerda. Do lado direito, ele se funde à pintura: o filete de cima segue até ela e o da direita esmaece;
  - aspas em SVG, destacadas à esquerda, e a frase em itálico de 21 px, centralizada, em duas linhas na largura da referência;
  - sem frase, quem edita vê o quadro com a dica e o "Editar", e quem só lê não vê o quadro.
- **Quadro História:**
  - filete dourado duplo com os cantos de filigrana pequenos (`CantoFiligrana` em escala de 30 px);
  - ícone do livro, título de 36 px e subtítulo;
  - divisor com losango ornado no meio;
  - texto em serifa de 19 px, com parágrafos (`paragrafosDaHistoria`), limitado a ≈ 50% da largura para não entrar na pintura;
  - filigrana d'água em SVG no canto de baixo à esquerda, com opacidade baixa;
  - o "Editar" fica no canto do cabeçalho do quadro. Sem texto, quem edita vê "A história de {nome} ainda não foi escrita." e o botão "Escrever a história".
- **Altura mínima:** a do exemplo da referência (240 px). Um texto maior aumenta o quadro e a pintura continua ancorada embaixo à direita.

### D6. Pinturas

Duas pinturas novas, geradas pelo usuário com os prompts de `arte/prompts.md`. Os prompts pedem para **anexar os recortes da referência** (`recorte-escrivaninha.png`, `recorte-historia.png`) e recriar a mesma cena em alta resolução, com a área da esquerda livre para esmaecer.

- **Preparo:** as duas entram em `preparar_pinturas` (`personalidade-escrivaninha`: 16:9, 1280 × 720; `personalidade-historia`: 2:1, 1280 × 640), sem remover o fundo.
- **Máscara:** o esmaecimento para o pergaminho é feito em CSS (`mask-image` em degradê à esquerda e embaixo), como a `resumo-natureza-morta`.
- **Carregamento:** `pinturasDaPersonalidade.ts` pré-carrega o grupo, no mesmo padrão de `pinturasDaBolsa.ts`.
  - A área de cada pintura é reservada pelo layout (`aspect-ratio`), e nada se move quando ela chega.
  - Se a pintura falhar, entram no lugar uma `RosaDosVentos` grande e esmaecida (topo) e um `DivisorOrnado` com a pena (História), em SVG.
- `aria-hidden` e `pointer-events: none`.

### D7. Ícones: recortados da própria referência, usados como máscara

Revisado em 2026-09-30, por sugestão do usuário: as 14 silhuetas (2 emblemas, o livro da História e 11 ícones de linha) são recortadas da própria imagem de referência, e não de uma folha gerada no ChatGPT. O desenho fica idêntico ao da referência. O plano original está abaixo, e a folha e o prompt dela deixaram de ser necessários.

- **Folha:** grade de 4 × 4 com os ícones em sépia escura sobre fundo liso claro, na ordem do prompt.
- **Preparo** (`preparar_icones_personalidade` em `preparar_arte.py`):
  - divide a grade em células;
  - transforma a luminância em alfa (tinta escura = opaco) e recorta rente ao desenho;
  - centraliza num quadrado de 160 px;
  - salva `public/arte/personalidade/icones/<nome>.webp`.
- **Tela:** `<span class="icone-personalidade">` com `mask-image: url(...)` e `background-color: currentColor`. A cor vem do tema (`#5a3816`), e o traço gravado da imagem fica preservado.
- **Provisórios:** até a folha chegar, ou se ela falhar ao carregar (pré-carregamento do grupo), entram silhuetas simples em SVG, desenhadas por mim em `personalidade/icones.tsx`, com os mesmos nomes. Elas também servem de fallback permanente.
- **Vetorizar ou não:** a máscara em alta resolução foi preferida a vetorizar, porque não precisa de dependência nova e preserva o traço gravado. A 40 px, uma máscara de 160 px fica nítida em telas 2×.

### D8. Tipografia

- **Sem serifa:** Alegreya Sans (eyebrow, rótulos e etiquetas) bate com a referência.
- **Serifa:** a da referência é mais encorpada. A tarefa 4.1 renderiza o título, os valores e a citação com Cormorant Garamond e com **EB Garamond** (OFL, servida localmente em `public/fonts`, como as outras) e compara as duas pela sobreposição.
  - A escolhida vira um token só desta folha, `--fonte-folha`. Assim, as outras telas não mudam sem decisão.
- **Tamanhos:** em `rem`, iguais aos px de `medidas.md` na base de 16 px.

### D9. Larguras diferentes da referência

A referência define só a largura de 1098 px. Nas outras larguras:
- **Acima de 1098 px:** a folha acompanha a largura da aba, como as outras seções. As colunas crescem, e as medidas fixas (ícone, rótulo, botão, tipografia) não mudam.
- **De 1000 a 1097 px:** a mesma disposição.
- **De 640 a 999 px:**
  - a pintura do topo diminui para 40% da altura e fica atrás da citação, com opacidade de 0,35, sem cobrir texto (verificado);
  - os grupos continuam lado a lado enquanto cada quadro tiver pelo menos 22rem; abaixo disso, ficam empilhados.
- **Abaixo de 640 px:**
  - tudo em coluna;
  - cada linha passa a ter o rótulo sobre o valor, com o ícone à esquerda e o "Editar" à direita;
  - a pintura da História some;
  - os cantos de filigrana encolhem para 56 px.

### D10. Prévia

`ProvaDaFicha` (`/preview/ficha?secao=personalidade`) monta a aba com **Lion**, o exemplo exato da referência:
- a frase e os quatro traços;
- os valores das linhas, com o pecado vazio;
- a História de duas linhas.

Os parâmetros `vazia=1` e `papel=leitor` mostram os outros estados. É a página que o script de fidelidade fotografa.

## Impacto no jogo

- **Escassez e risco de combate:** nenhum. Os campos são narrativos.
- **Ritmo narrativo:** a Frase marcante e os Traços dão à mesa, de relance, a voz e o temperamento do personagem, o que ajuda o Narrador a improvisar reações. A História ganha destaque próprio.
- **Carga cognitiva:** menor. Os dois grupos respondem a perguntas diferentes, e os ícones permitem achar um campo sem ler todos os rótulos.
- **Interações com outras mecânicas:** nenhuma regra de mesa lê esses campos. O Resumo continua lendo a História do mesmo campo.

## Risks / Trade-offs

- [A fonte do projeto não reproduz a serifa da referência] → prova com duas famílias e escolha pela sobreposição e pelo usuário (D8), com token só desta folha.
- [A folha de ícones gerada vem desalinhada ou com fundo sujo] → o preparo recusa a célula sem desenho ou com mais de um objeto (`ValueError` com a posição), e os SVG provisórios cobrem até uma nova geração.
- [Pinturas geradas com composição diferente do recorte] → os prompts anexam o recorte; a área reservada e a máscara são do layout, então uma pintura diferente não move nada.
- [A extração do CSS comum altera o Resumo] → aliases e a comparação das capturas do Resumo antes e depois.
- [Valores longos (fichas migradas) quebram a linha medida] → até três linhas com `title`; a linha cresce e as outras do quadro continuam repartindo a altura.
- [A tolerância do relatório esconder diferenças de ornamento] → as âncoras medem caixas, e os ornamentos passam pelo lado a lado e pela aprovação do usuário em cada passada.

## Migration Plan

1. JSON, catálogo, contrato, validação e rótulos; OpenAPI e cliente regenerados.
2. Gabarito (`caixas.json`) e script de fidelidade antes da primeira linha de CSS da aba.
3. Passadas de interface com os pontos de revisão.
4. As fichas existentes não mudam, e os campos novos começam vazios. Não há revisão Alembic.
5. **Reversão:** o frontend antigo ignora `frase` e `tracos`. O `personalidade` livre não quebra nada.
