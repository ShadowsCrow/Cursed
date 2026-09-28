# Design — aba-resumo-da-ficha

## Context

Motivação e escopo em `proposal.md`; comportamento em `specs/`.

Estado atual relevante:

- `CharacterSheetPage.tsx` define as abas em `SECTIONS`, guarda a aba em `?secao=` e abre `informacoes` por padrão. Todas as consultas (`useFichaSnapshot`, `useValoresDerivados`, `useInventario`, `useEfeitos`, `useDesgaste`, `useConsequencias`, catálogos) já são feitas no topo da página e compartilhadas pelas abas; as cartas vêm de `useCartasDoPersonagem` (`CharacterCardsPanel`).
- Acima das abas ficam `SheetHeader` (retrato, identidade, PV/PP com ajuste do Narrador e envio de retrato) e `ActiveStateStrip` (Desgaste, efeitos, Consequências e seus controles).
- Valores derivados do servidor: `atributo:*`, `pericia:*` (totais com efeitos), `recurso:pv_maximo|pp_maximo|escala_*` e `status`: `defesa:esquiva`, `defesa:armadura`, `rdb:armadura`. PV/PP atuais ficam em `ficha.recursos.{pv,pp}.atual`. Não há Iniciativa nem "Origem".
- A personalidade aceita chaves livres; `listas_ficha.json → campos_personalidade` define quais campos a aba Personalidade e a etapa Personalidade do assistente mostram (chave, rótulo, dica).
- Imagens: `PUT /mesas/{m}/imagens/{destino}` com destinos em `cursed_platform/imagens.py` (`Destino(nome, rótulo, limite_mb, lado_exibicao)`) e alvos em `platform/api/cursed_api/images.py`. O retrato grava `ficha.personagem.imagem_ativo` e tem cópia de exibição de 512 px — pequena demais para o centro do Resumo.
- Estética: tokens em `src/design/tokens.css`, componentes `src/ui/Tema.tsx` (molduras, títulos ornados, selos) e `src/ui/Arte.tsx`, fontes Cormorant Garamond (exibição) e Alegreya Sans (leitura), arte `public/arte/retrato-vazio` (1024×1536, vertical). Prova visual em `/preview/tema`.

## Goals / Non-Goals

**Goals:**
- Resumo fiel à composição da referência (imagem central, quadros laterais, faixa de História) usando só componentes e tokens do tema.
- Zero cálculo mecânico no cliente: o Resumo apenas seleciona e ordena valores prontos.
- Nenhuma consulta nova ao abrir o Resumo além das que a página já faz (a de cartas passa a ser feita na página).

**Non-Goals:**
- Reestilizar as outras abas, `SheetHeader` ou `ActiveStateStrip`.
- Gerar a ilustração por IA ou recortar/editar a imagem no navegador.

## Decisions

### D1. Resumo é uma seção como as outras, primeira e padrão
Novo item `{ id: "resumo", label: "Resumo" }` no início de `SECTIONS` e `DEFAULT_SECTION = "resumo"`. Navegação por teclado e `?secao=` continuam iguais. Os atalhos dos quadros chamam o mesmo `goTo`.
*Alternativa:* rota própria `/…/resumo`. Rejeitada: duplicaria carregamento e quebraria o "sem recarregar" da ficha viva.

### D2. `SheetHeader` fica escondido no Resumo; `ActiveStateStrip` fica
O Resumo já mostra imagem, identidade e recursos; manter o cabeçalho duplicaria tudo logo acima. Na aba Resumo, `SheetHeader` não é renderizado; nas demais, continua como está (inclusive o envio de retrato e o ajuste de PV/PP do Narrador). `ActiveStateStrip` continua visível em todas as abas, porque carrega os controles de Desgaste e Consequências usados em jogo.
*Alternativa:* cabeçalho compacto no Resumo. Rejeitada por ruído visual; o usuário pediu a referência, que não tem cabeçalho.

### D3. Componente puro + seletores testáveis
`ResumoFicha.tsx` recebe dados já carregados (ficha, valores derivados, inventário, cartas, catálogos, permissões) e callbacks (`irPara(secao)`, envio de ilustração). A lógica de seleção fica em `resumo.ts`, funções puras testadas com Vitest:
- `periciasEmDestaque(valores, grupos, 6)`: filtra `pericia:*` com `total > 0`, ordena por total desc. e, no empate, pela posição em `GRUPOS_PERICIAS` (que já segue o livro).
- `atributosAgrupados(valores, GRUPOS_ATRIBUTOS)`.
- `itensEquipados(inventario, 5)` → `{ visiveis, restantes }`.
- `habilidadesAprendidas(cartas, 4)`: `tipo ∈ {habilidade, magia}` e `estado = "aprendida"`, ordenadas por `adquirida_em`.
- `imagemCentral(info)`: ilustração → retrato → arte padrão.
Valores sem total (`total === null`) aparecem como "—" com o `motivo` do servidor.

### D4. Layout em grade CSS com áreas nomeadas
Desktop (≥ 1100 px): três colunas `laterais | imagem | laterais` — esquerda: identidade, Atributos, Equipamentos; direita: recursos, Perícias, Habilidades; História ocupa a linha inteira abaixo. Entre 768 e 1100 px: imagem no topo em largura total, quadros em duas colunas. Abaixo de 768 px: uma coluna na ordem da spec. A imagem usa `object-fit: cover` com `object-position: top center` (corpo inteiro mantém o rosto) e proporção 2:3. Ornamentos (cantos, divisores, estrelas, medalhões) em CSS/SVG inline com `aria-hidden`, como decidido na primeira fatia (nada de moldura em imagem). Medalhões de PV/PP/Defesa usam as cores semânticas já existentes (vida, poder) e o selo de `Tema.tsx`. A cor da classe do catálogo (`cor`) aparece como detalhe nos estandartes laterais, sempre com o nome escrito ao lado.

### D4a. Molduras recortadas e ornamentos (pedido do usuário após a primeira prova)
O usuário achou a primeira prova pouco ornamentada: a referência tem quadros com contorno recortado ("chanfrado"), peças deslocadas para fora da caixa e muitos detalhes. Técnicas adotadas, todas em SVG e sem imagem, mantendo a decisão da primeira fatia:
- **Moldura em 9 fatias:** cada quadro usa `border-image` com um SVG (`resumo/molduras/quadro.svg` e `quadro-destaque.svg`) que traz chanfros com mordida côncava, linhas duplas e volutas nos cantos; com `fill`, a silhueta do quadro segue o recorte, e `border-image-outset` deixa os enfeites dos cantos saírem da caixa. A sombra usa `filter: drop-shadow` para acompanhar o contorno. Os SVG foram gerados uma vez por um script de apoio e ficam versionados; os enfeites cabem inteiros na fatia do canto para não esticar.
- **Peças deslocadas:** remate em flor sobre cada quadro; crista em arco apontado sobre Recursos; pingente com asas pendurado sob Recursos (Defesa (Armadura) e RDB); selo circular com a rosa dos ventos saindo pelo canto da Identidade; volutas ao lado dos títulos.
- **Folha:** cantos grandes com folhagem, flores no meio das bordas laterais, estandartes, placa do título e fecho.

*Alternativa:* molduras pintadas em imagem. Rejeitada: perdem nitidez ao esticar e contrariam a decisão da primeira fatia.

### D4b. Pinturas opcionais da cena
Quatro pinturas geradas pelo usuário no ChatGPT (guia em `arte/prompts.md`), todas opcionais: cena de fundo atrás da figura, primeiro plano de pedras e arbustos aos pés da figura, natureza-morta no canto inferior esquerdo e bússola no canto inferior direito. As três últimas são pedidas sobre fundo de pergaminho liso (o ChatGPT não garante transparência) e `preparar_arte.py` troca esse fundo por transparência: mede a cor do fundo no canto liso da matriz, apaga só a área de cor próxima **ligada às bordas** (o mostrador claro da bússola e o pergaminho enrolado ficam) e suaviza a borda. A primeira ideia, desenhar com `mix-blend-mode: multiply`, foi abandonada ao ver as imagens geradas: o fundo veio num bege mais escuro que o pergaminho da ficha e deixaria um retângulo visível. Os quadros laterais ficam acima das pinturas, e a vegetação do primeiro plano aparece entre eles. Cada pintura some se o arquivo faltar; a natureza-morta e a bússola avisam quando carregam, para a faixa da História abrir espaço, e sem a bússola fica a rosa dos ventos em SVG. `preparar_arte.py` recorta e converte as que existirem (`ARTES_DO_RESUMO`). Abaixo de 1100 px, natureza-morta e bússola não aparecem.

### D5. Ícones dos quadros vêm de dados, não de código
Atributos e perícias ganham ícone opcional no JSON de dados do sistema (`listas_ficha.json`, mapa `icones_ficha` de nome gravado na ficha para ícone, com os títulos de grupo — Talentos, Técnicas, Conhecimentos — como reserva). Os ícones são desenhos SVG próprios do Resumo (`resumo/ornamentos.tsx`); um nome de ícone desconhecido é ignorado. Sem ícone, o quadro mostra só nome e valor. Assim o usuário ajusta os ícones sem mudar código (memória: dados do sistema em JSON).
*Alternativa:* mapa fixo no componente. Rejeitada pela regra de dados parametrizáveis.

### D6. História como campo de personalidade longo, definido no JSON
`campos_personalidade` ganha a entrada `{ "chave": "historia", "rotulo": "História", "dica": "…", "longo": true, "limite": 4000 }`. `catalogos.py` passa a ler `longo` (padrão `false`) e `limite` (padrão sem limite, inteiro positivo quando presente); o contrato `CampoPersonalidadeResumo` expõe os dois. `validacao_ficha.py` recusa texto acima do `limite` de qualquer campo que o declare. `PersonalityPanel` e a etapa Personalidade do assistente já iteram a lista; só passam a usar área de texto maior e contador quando `longo`. Valor gravado em `personalidade.historia`. O manifesto registra a transformação ("campo História, aprovado pelo usuário em 2026-09-28"), e o rótulo "História" entra em `fieldLabels.ts` e na auditoria.
*Alternativa:* `personagem.historia` fora da personalidade. Rejeitada: exigiria outro caminho de edição, dica e validação, quando a personalidade já resolve tudo isso por dados.

### D7. Novo destino de imagem `ilustracao`
`Destino("ilustracao", "ilustração", 8, 1536)` em `imagens.py`; em `images.py`, alvo `ilustracao` igual ao do retrato, mas gravando `ficha.personagem.ilustracao_ativo` e checando o campo `personagem.ilustracao_ativo` na política (bloqueio/aprovação pela mesa). Mesmo espaço privado do personagem, mesma auditoria ("ilustração alterada"), mesmo `ImageUpload` no cliente com `destino="ilustracao"`. A leitura usa `useAssetImage(..., { exibicao: true })`. A vitrine pública do Narrador (`narrador.py`) não expõe a ilustração.
*Alternativa:* aumentar a cópia de exibição do retrato. Rejeitada pelo usuário (imagem própria do resumo).

### D8. Cartas carregadas na página
`useCartasDoPersonagem` sobe para `CharacterSheetPage` (mesma chave de consulta `["cartas-personagem", mesa, personagem]`), para o Resumo e o painel de cartas compartilharem o cache. O painel continua chamando o mesmo hook; o React Query deduplica.

## Impacto no jogo

- **Escassez e risco de combate:** nenhum; nenhum número muda. PV, PP e Defesa atuais ficam mais visíveis, o que ajuda a perceber o risco antes de entrar em combate.
- **Ritmo narrativo:** positivo; História e ilustração ficam à vista no início de cada sessão, reforçando identidade sem consulta extra.
- **Carga cognitiva:** menor para consulta rápida (uma tela com o essencial). O corte em seis perícias pode esconder uma perícia baixa relevante na cena; o atalho "ver todas" mitiga.

## Interações com outras mecânicas

- **Efeitos e Desgaste:** afetam atributos, perícias e Defesa pelo servidor; o Resumo só mostra os totais. Os controles continuam na faixa `ActiveStateStrip`.
- **Grade de carga:** o quadro de Equipamentos lê o campo `equipado` do inventário; não mostra a grade.
- **Cartas:** só `aprendida` entra; `em_aprendizado` não, para não sugerir uma habilidade ainda inutilizável.
- **Criação guiada:** a História aparece na etapa Personalidade pelo mesmo JSON; a Conferência já lista os campos de personalidade preenchidos.
- **Mudança `navegacao-inicial-e-perfil`** (planejada): a vitrine de Personagens pode reaproveitar o Resumo depois; nada nesta mudança depende dela.

## Arquivos e dados que mudam

- Dados: `cursed_platform/catalogos/listas_ficha.json` (campo História, `longo`/`limite`, `icones_ficha`), `manifesto.json`.
- Servidor: `catalogos.py`, `contracts.py` (`CampoPersonalidadeResumo`, literal do destino, listas de ícones), `platform/api/cursed_api/catalogs.py`, `domain/validacao_ficha.py`, `imagens.py`, `platform/api/cursed_api/images.py`, rótulos da auditoria. OpenAPI e cliente gerado.
- Cliente: `CharacterSheetPage.tsx`, novos `sheet/ResumoFicha.tsx`, `sheet/resumo.ts`, `sheet/resumo.css`; `PersonalityPanel.tsx`, `creation/CamposDasEtapas.tsx`, `fichaAccess.ts` (`ilustracaoAtivo`), `fieldLabels.ts`, `catalogoApi.ts`.
- **Migração:** nenhuma. Fichas sem `historia` ou `ilustracao_ativo` continuam válidas; `test_fichas_existentes_inalteradas.py` deve continuar verde.

## Risks / Trade-offs

- [Imagens enviadas em proporções variadas (paisagem, quadrada) ficam mal recortadas na moldura 2:3] → recorte ancorado no topo e aviso junto ao envio: "use imagem vertical de corpo inteiro, 2:3"; sem editor de recorte nesta mudança.
- [Ornamentos em SVG pesam no celular] → reaproveitar os de `Tema.tsx`; medir com as capturas e manter a página sem imagens decorativas além da arte já existente.
- [Nomes de perícia longos ("Conhecimento urbano", "Lidar com animais") quebram o quadro estreito] → reticências com o nome completo acessível e teste em 360 px.
- [Esconder `SheetHeader` no Resumo tira o envio de retrato e o ajuste de PV/PP dessa aba] → continuam a um clique nas outras abas; o atalho do quadro de recursos leva a Status.
- [Contraste do dourado sobre pergaminho em textos pequenos] → valores e rótulos usam a cor de texto escura já aprovada (`#2b1d10`, ≥ 7,8:1); dourado só em ornamentos e títulos grandes; `tokens.test.ts` cobre as novas combinações.

## Migration Plan

Sem migração de dados. Implantação normal (servidor com o novo destino e o JSON atualizado antes do cliente, já que o cliente gerado depende do contrato). Reverter é remover a aba e o destino: fichas que ganharam `historia` ou `ilustracao_ativo` continuam válidas, pois a personalidade aceita chaves livres e o campo de imagem é só uma referência.
