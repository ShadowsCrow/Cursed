# Proposal

## Why

A Sala virou a página principal da mesa (`experiencia-da-mesa`), e agora o usuário quer melhorá-la aos poucos, item por item, vendo como cada um fica antes do próximo. Esta mudança reúne esses itens; cada novo pedido sobre a sala de jogo entra aqui como mais um item.

- **Item 1, rolador de dados:** quem quer rolar um dado hoje precisa sair da mesa e usar outra ferramenta (dados físicos, o rolador do Google, um bot), o que quebra o ritmo da cena justamente no momento de tensão.
- **Item 2, controle de zoom:** a caixa de zoom no canto do grid está grande demais, ocupa espaço do mapa e destoa do visual do sistema (botões cinza padrão do navegador).
- **Item 3, rolagem animada e rolagens da mesa:** o total aparecer só no painel tira a emoção da rolagem. O usuário quer os dados rolando pelo tabuleiro, girando e batendo nas bordas da tela antes de mostrar o resultado, como nos bons sites de RPG, e quer que cada pessoa possa ver as rolagens da mesa toda.
- **Item 10, tirar dado com o botão direito:** para corrigir a montagem só havia "Limpar", que zera tudo.
- **Item 9, Sala sempre ligada:** toda mesa nova começava com a Sala desligada, e o Narrador precisava ativá-la antes de usar; o usuário quer a Sala sempre disponível.
- **Item 8, rolagem pela ficha:** os jogadores querem rolar testes com os valores das próprias fichas (Atributo + Perícia, como em Rolagens), e o Narrador, rolar pelos personagens da cena ou sem ficha nenhuma.
- **Item 7, rolagem do histórico:** com muitas rolagens, o painel inteiro rolava e o visor e os dados saíam de vista; o histórico deve ter a própria barra de rolagem.
- **Item 6, tamanho do token:** monstros e criaturas grandes ocupam mais de uma casa, e o Narrador não tinha como mudar o tamanho do token depois de colocado.
- **Item 5, rolagens do Narrador ocultas:** o Narrador costuma rolar escondido dos jogadores. Por padrão as rolagens dele devem ficar ocultas, com a opção de mostrar.
- **Item 4, token já oculto:** o Narrador quer pôr um token já oculto dos jogadores. A chave "Colocar oculto dos jogadores" existe, mas fica no fim da aba Cena e precisa ser ligada e desligada; o usuário preferiu um botão por token.

Classificação: ferramentas da aplicação, para jogadores e Narrador. Nenhum item muda regra de `rules/sistema`.

## What Changes

**Item 1. Rolador de dados**
- Nova aba **Dados** no painel direito da Sala, logo depois de **Cena**. A ordem passa a ser: Cena, Dados, Chat, Fichas, Bolsa, Cartas, Música.
- A aba tem um rolador parecido com o do Google:
  - botões para d4, d6, d8, d10, d12, d20 e d100, cada um com a pintura do dado (pedra azul-noite com filetes dourados e o número do tipo na face da frente), gerada pelo Codex; cada toque acrescenta um dado daquele tipo à rolagem;
  - um modificador inteiro com − e +;
  - a expressão montada (por exemplo `2d6 + 1d20 + 3`), com "Limpar" e "Rolar";
  - o resultado: o total em destaque e o valor de cada dado, agrupado por tipo;
  - um histórico das últimas rolagens enquanto a Sala está aberta, com "Rolar de novo".
- Os resultados são sorteados pelo servidor, com gerador criptográfico e sem viés entre as faces (item 3).
- Cada rolagem fica guardada na mesa e chega aos outros (item 3); quem vê as rolagens dos outros é escolha de cada pessoa.

**Item 2. Controle de zoom compacto**
- A caixa de zoom fica menor e no visual do sistema: a mesma moldura escura com borda ornamentada do nome da cena, botões discretos, a porcentagem em texto pequeno e "Centralizar" como ícone (com o nome mantido para leitores de tela e como dica).
- O comportamento do zoom e do "Centralizar" não muda.

**Item 3. Rolagem animada no tabuleiro e rolagens da mesa**
- Ao rolar, dados 3D no visual do jogo (pedra azul-noite, filetes e números dourados) são lançados por cima do tabuleiro, giram, quicam e batem nas bordas da área visível, e param mostrando em cima o resultado já sorteado pelo rolador. Método dos bons sites de RPG (Dice So Nice, do Foundry VTT): a física é simulada antes e os números das faces são trocados para que a face de cima mostre o resultado sorteado.
- O resultado aparece na aba Dados quando os dados param.
- A rolagem é sorteada e guardada pelo servidor (decisão do usuário em 2026-10-03, depois de o mestre não ver a rolagem do jogador no ambiente local, que não tem tempo real). Ela chega às outras pessoas pelo aviso em tempo real da Sala ou, sem ele, pela consulta periódica da Sala, com o nome de quem rolou. Ninguém consegue forjar o resultado pelo navegador.
- Na própria aba Dados, cada pessoa escolhe:
  - **Mostrar rolagens:** só as minhas ou as de toda a mesa (as dos outros aparecem no histórico, com o nome, e rolando no tabuleiro);
  - **Animação dos dados:** ligada ou desligada (desligada por padrão para quem pede menos movimento no sistema).
- As escolhas ficam guardadas neste navegador.

**Item 4. Colocar token já oculto**
- Em cada personagem das listas "Personagens dos jogadores" e "NPCs e monstros", ao lado de "Colocar", um botão "Colocar oculto" (olho cortado) põe o token já oculto dos jogadores.
- Sai a chave geral "Colocar oculto dos jogadores" (pedido do usuário): "Colocar" e o arraste põem o token visível.

**Item 5. Rolagens ocultas do Narrador**
- Por padrão, as rolagens do Narrador saem ocultas dos jogadores: o servidor não as entrega a eles. Na aba Dados, só o Narrador tem a chave "Rolar oculto dos jogadores", ligada por padrão e guardada no navegador; desligando, ele rola para a mesa. As ocultas levam a marca "oculta" no visor e no histórico dele.

**Item 6. Tamanho do token**
- O Narrador muda quantas casas o token ocupa, sempre quadrado (1×1 a 10×10), pelo menu do botão direito sobre o token no grid (pedido do usuário) e, pelo teclado, no controle "Tamanho" que aparece ao escolher o token na lista "Tokens da cena". Rota nova `POST /mesas/{mesa_id}/sala/tokens/{token_id}/tamanho`, só para o Narrador, com versão conferida. O grid já desenha qualquer tamanho.

**Item 7. Histórico com rolagem própria**
- Em tela larga e alta, o histórico ocupa o espaço que sobra no painel da aba Dados e só ele rola; nas outras, tem altura máxima com rolagem própria. Para sobrar espaço, as opções da aba vão para um bloco "Opções" que abre e fecha (fechado por padrão), o visor fica mais compacto e cada item do histórico ocupa três linhas.

**Item 8. Rolagem pela ficha**
- No topo da aba Dados, a faixa de retratos compacta, com "Sem ficha": o jogador vê as fichas dele; o Narrador, as fichas dos personagens com token na cena. Com uma ficha escolhida, seletores de Atributo e Perícia com os valores da ficha; escolher um deles sem dado monta 1d20.
- O servidor soma os totais da própria ficha (o navegador só diz quais) e guarda a ficha e as parcelas na rolagem; o jogador só rola pelas próprias fichas.

**Item 9. Sala sempre ligada**
- A Sala deixa de ser módulo opcional: as rotas da Sala, das rolagens e do chão e baús não exigem mais o módulo; saem as rotas `GET` e `PUT /mesas/{mesa_id}/modulos` e o campo `modulo_ativo` do snapshot; sai a tela "Sala desativada". A tabela genérica de módulos fica para outros módulos opcionais. Sem migração.

**Item 10. Tirar dado com o botão direito**
- Clique esquerdo no dado acrescenta; botão direito tira um daquele tipo (sem o menu do navegador); pelo teclado, Delete ou Backspace com o foco no dado. A dica do botão explica.

## Non-goals

- Registrar rolagens no chat (o chat ainda é um espaço reservado) e mostrar, ao abrir a Sala, o histórico guardado de antes.
- Outras permissões da mesa sobre quem vê o quê, além das rolagens ocultas do Narrador (item 5).
- Som dos dados.
- Página de configurações da plataforma (decisão do usuário: as opções ficam na aba Dados).
- Rolar a partir da ficha (Atributo + Perícia), comparar com CD ou com Defesa.
- Vantagem, desvantagem, críticos naturais ou qualquer leitura mecânica do resultado; a revisão de críticos está em aberto nas regras.
- Expressões digitadas à mão e dados com faces arbitrárias.
- Guardar o histórico no servidor ou entre visitas à Sala.
- Mudar os passos do zoom, o enquadramento ou a posição dos controles do mapa.

## Capabilities

### New Capabilities
- `rolador-de-dados`: o rolador da aba Dados da Sala: montagem da rolagem, modificador, resultado, histórico, aleatoriedade sem viés, rolagem animada no tabuleiro, rolagens da mesa em tempo real e as opções de cada pessoa.

### Modified Capabilities
- `persistencia-de-mesa`: "Módulos configuráveis por mesa" deixa claro que a Sala não é módulo opcional.
- `experiencia-da-mesa`: sai o requisito "Sala desativada como página principal"; o requisito "Abas do painel da Sala" ganha a aba Dados entre Cena e Chat; "NPCs e monstros na cena" ganha o botão "Colocar oculto" por token e perde a chave geral; "Seção Tokens na aba Cena" deixa de ter a chave; requisitos novos descrevem o controle de zoom compacto e o tamanho do token.

## Impact

- Frontend apenas: `platform/frontend/src/app/room/abasDoPainel.ts` (nova aba), `RoomView.tsx` (conteúdo da aba), um componente novo em `platform/frontend/src/app/room/` com a lógica de rolagem separada e testada, `RoomCanvas.tsx` (controle de zoom), estilos em `room.css`, ícones de dado e de centralizar em `src/ui/Display.tsx`, e as pinturas dos dados (`arte-original/dados-*.png` → `public/arte/sala/dados-*.webp`, por `preparar_arte.py`).
- Item 3: módulo novo de dados 3D em `platform/frontend/src/app/room/dados3d/`, carregado só na primeira rolagem animada; dependências novas `three` (MIT) e `cannon-es` (MIT). Textura de pedra dos dados pintada pelo Codex. Backend: tabela `dice_rolls` (migração `0025_rolagens_de_dados`, com `oculta`, `personagem_id` e `termos`), módulo `cursed_platform/rolagens.py`, rotas `POST` e `GET /mesas/{mesa_id}/sala/rolagens` e aviso `sala.rolagem` pelo Realtime, como os demais da Sala.
- Quem tinha uma aba guardada no navegador continua nela; os ids das abas existentes não mudam.
