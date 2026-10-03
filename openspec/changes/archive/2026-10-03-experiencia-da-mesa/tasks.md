# Tarefas — experiencia-da-mesa

## 1. Item 1: barra lateral retrátil (estado e persistência)

- [x] 1.1 Criar o hook `useBarraRecolhida`, que lê e grava `cursed:mesa:barra-recolhida` no `localStorage` com `try/catch` e começa expandido sem a chave ou sem armazenamento. Verificar com testes do hook: padrão expandido, alternância persistida e armazenamento bloqueado (`getItem`/`setItem` lançando erro).

## 2. Item 1: interface

- [x] 2.1 No `WorkspaceChrome`:
  - acrescentar o botão de alternância com `aria-expanded`, `aria-controls` e o nome "Recolher barra lateral" ou "Expandir barra lateral";
  - aplicar a classe `workspace-app--barra-recolhida`;
  - pôr `hidden` no cartão "Campanha atual", no rótulo "MESA" e no `sidebarExtra` quando recolhida;
  - usar a `Marca` compacta no trilho.

  Verificar em `shells.test.tsx` que o botão alterna o estado e o nome, que o foco permanece no botão e que os blocos somem e voltam, no Narrador e no jogador.
- [x] 2.2 Manter, no trilho:
  - o nome de cada seção como nome acessível, com texto oculto visualmente;
  - a dica visível no hover e no foco;
  - `aria-current` na seção atual;
  - o anúncio "N pendente(s)".

  Verificar com testes: a navegação pelo ícone "Registro" chama `onNavigate`, o ícone atual é anunciado como página atual, o anúncio de pendências continua e o link "Campanhas" mantém `/campanhas/{id}`.
- [x] 2.3 CSS em `design/preview.css` e `tema-telas.css`:
  - coluna de 72 px quando recolhida;
  - trilho com ícones centralizados;
  - ponto de pendência no ícone;
  - balão de dica;
  - transição de `grid-template-columns`, nula sob `prefers-reduced-motion`;
  - até 760 px, sem barra nem trilho.

  Verificar com `npm run build` sem erros e, no navegador local, sem rolagem horizontal a 1280 px e a 375 px, com a barra recolhida e com ela expandida.

## 3. Item 2: Sala como página principal

- [x] 3.1 Em `tableNavigation.ts`, `defaultTableView` passa a devolver `room` para os dois papéis, e `room` vira o primeiro item da navegação de cada papel. Verificar com testes:
  - `permittedTableView` com `painel` ausente, válido (`activity`) e desconhecido;
  - `TableWorkspace` abrindo na Sala;
  - "Sala" como primeiro item da navegação e anunciada como página atual.
- [x] 3.2 Acrescentar a propriedade `palco` ao `WorkspaceChrome`. Com ela:
  - sem `CabecalhoIlustrado` nem rodapé;
  - classe `workspace-app--palco`;
  - `<h1>` oculto visualmente "Sala — {nome}".

  Os shells passam `palco` quando `view === "room"`. Verificar em `shells.test.tsx`: na Sala não há o título ilustrado "Cena compartilhada" nem o rodapé, o `<h1>` existe, e a barra superior (Sair, conexão) continua. Nas outras seções, o cabeçalho continua.

## 4. Item 2: grid em tela cheia

- [x] 4.1 Criar `enquadrar(area, mapa, margem)` em `room/viewport.ts`, que devolve a escala limitada entre os zooms mínimo e máximo e a posição centralizada. Verificar em `viewport.test.ts` estes casos:
  - mapa maior que a área;
  - mapa menor que a área;
  - proporções diferentes;
  - limites de zoom.
- [x] 4.2 No `RoomCanvas`:
  - enquadrar ao ficar pronto e ao trocar de cena;
  - reenquadrar com `ResizeObserver` enquanto a pessoa não tiver mexido no zoom ou no arraste;
  - fazer "Centralizar" chamar `enquadrar`.

  Verificar no navegador local, com o mapa de 20 por 15 centralizado e enquadrado a 1440 por 900 px, com a barra lateral expandida e com ela recolhida. Não havia teste do `RoomCanvas` com o PixiJS simulado; a parte pura (`enquadrar`) é coberta em `viewport.test.ts`.
- [x] 4.3 CSS do palco e da Sala em `design/preview.css` e `room/room.css`:
  - `<main>` com altura da janela menos a barra superior, sem `padding` nem rolagem;
  - superfície do grid com 100% da altura;
  - até 760 px, o grid entre a barra superior e a navegação inferior.

  Verificar no navegador local que a página não rola a 1440 por 900 px nem a 375 por 812 px, e que o grid ocupa a área.

## 5. Item 2: controles por cima do grid

- [x] 5.1 Faixa de cenas do Narrador em `RoomView`, por cima do grid: cena atual, troca de cena, Ativar, criação de cena e envio do mapa. Verificar com teste em `RoomView.test.tsx`:
  - o Narrador cria e troca de cena pela faixa;
  - o jogador não vê a faixa.
- [x] 5.2 Painel lateral "Painel da cena", recolhível:
  - conteúdo: tokens, movimento por coluna e linha, `SceneStashes` e "Colocar token" (só o Narrador);
  - botão com `aria-expanded` e "Mostrar painel da cena" ou "Ocultar painel da cena";
  - estado lembrado em `cursed:mesa:painel-da-cena`, tolerando armazenamento bloqueado;
  - padrão aberto para o Narrador e fechado para o jogador.

  Verificar com testes: alternância, padrão por papel, armazenamento bloqueado, o jogador confirma o movimento pelo painel e o jogador não vê "Colocar token".
- [x] 5.3 Sinais temporários numa região `aria-live` sobre o grid, e mensagens de prévia, confirmação e erro do movimento no painel. Verificar com testes que os anúncios continuam presentes.
- [x] 5.4 Sala desativada: "Ativar sala" para o Narrador e "Abrir minha ficha" para o jogador, por um `onAbrirFicha` passado pelo `PlayerShell`. Verificar com testes que o atalho chama a navegação para `character` e que o Narrador ainda ativa o módulo.
- [x] 5.5 Telas estreitas: a faixa de cenas rolável na horizontal e o painel como gaveta de baixo. Verificar no navegador local a 375 px que não há rolagem horizontal e que o painel abre e fecha.

## 6. Item 2: grade infinita e painel por cima (pedido de 2026-10-02)

- [x] 6.1 Em `desenharCena`:
  - grade de fundo de 200 casas além de cada borda, mais fraca;
  - área da cena com fundo, mapa, linhas mais fortes e borda dourada.

  Verificar no navegador local que a grade cobre toda a área, inclusive atrás da faixa, do zoom e do painel, ao arrastar e com zoom de 40%. Verificar também que o arraste de token e o ping fora da cena continuam ignorados (a lógica `dentro` existente, coberta por leitura do código e pelo navegador).
- [x] 6.2 Painel por cima do grid à direita, com `reservaDireita` no `RoomCanvas` e `enquadrar` descontando a reserva. O enquadramento é refeito ao abrir ou fechar o painel, salvo ajuste da pessoa. O botão do painel e os controles do mapa ficam à esquerda do painel aberto. Verificar:
  - em `viewport.test.ts`, o enquadramento com reserva à direita;
  - em `RoomView.test.tsx`, que a reserva passada ao canvas é zero com o painel fechado e positiva com ele aberto;
  - no navegador, que a cena fica centralizada na parte livre.

## 7. Item 3: largura ajustável do painel (pedido de 2026-10-02)

- [x] 7.1 Criar `usePreferenciaNumerica` em `shells/usePreferenciaLocal.ts`, com o mesmo padrão tolerante. Verificar com teste: padrão, valor guardado, valor inválido e armazenamento bloqueado.
- [x] 7.2 Fazer a alça do painel no `RoomView`:
  - separador acessível;
  - arraste com prévia e confirmação ao soltar;
  - teclado (setas, Shift, Home e End);
  - dois cliques para voltar ao padrão;
  - limites;
  - `--largura-painel` no CSS e a reserva do enquadramento pela largura confirmada.

  Verificar com testes em `RoomView.test.tsx`: valor padrão anunciado, seta para a esquerda alarga e grava, Home e End vão aos limites, dois cliques voltam ao padrão e a reserva passada ao canvas acompanha a largura. No navegador local, verificar o arraste.
- [x] 7.3 Até 760 px, a alça fica oculta e o painel continua como gaveta. Verificar no navegador local a 375 px.

## 8. Item 4: abas do painel, fichas, cartas e chão embaixo (pedidos de 2026-10-02)

- [x] 8.1 Fazer as abas do painel (Cena, Chat, Fichas e Cartas), com teclado, aba lembrada, "Recolher painel" e "Abrir painel" no grid. Verificar com testes: troca de aba, `aria-selected`, setas, aba lembrada, recolher e reabrir na mesma aba.
- [x] 8.2 Fazer o Chat como espaço reservado. Verificar com teste que mostra o aviso e que o campo e o botão estão desativados.
- [x] 8.3 Fazer as Fichas:
  - faixa de retratos com setas;
  - os próprios personagens primeiro;
  - resumo do escolhido;
  - "Abrir ficha completa" numa janela flutuante.

  Verificar com testes: lista e ordem, setas, seleção anunciada, resumo carregado do personagem escolhido, abrir e fechar a janela e mesa sem personagens.
- [x] 8.4 Fazer as Cartas:
  - Narrador: publicadas, busca e Enviar, Ofertar (já com a carta) e Apresentar, exportando os diálogos da Biblioteca;
  - jogador: cartas dos próprios personagens e ofertas pendentes.

  Verificar com testes: busca, abertura de cada diálogo com a carta, oferta com a carta pré-marcada, jogador sem catálogo nem ações.
- [x] 8.5 Mover o chão e os baús para o menu retrátil embaixo do grid, com o estado lembrado e os controles subindo quando aberto. Verificar com testes (o botão "Chão e baús" com `aria-expanded`, o conteúdo e o estado lembrado) e no navegador.

## 9. Item 5: ajustes do painel (pedidos de 2026-10-02)

- [x] 9.1 Mover a gestão de cenas para o topo da aba Cena, deixando só o nome da cena sobre o grid. Verificar com testes que o Narrador troca e cria cena pelo grupo "Cenas" da aba, que o grupo não está sobre o grid e que o jogador não o vê.
- [x] 9.2 Fazer o filtro por tipo na aba Cartas, para o Narrador e para o jogador. Verificar com testes: opções presentes com contagem, filtro com `aria-pressed`, filtro somado à busca.
- [x] 9.3 Fazer a miniatura da arte nas cartas da aba e a grade de colunas. Verificar com testes que a miniatura usa a imagem própria quando há e a pintura da categoria quando não há, e, no navegador, duas colunas com o painel no máximo.

## 10. Item 6: corpos separados dos itens (pedido de 2026-10-02)

- [x] 10.1 Criar `ehCorpo` em `cartas/apresentacao.ts` e fazer `categoriaDaCarta` devolver a categoria própria `corpos` (rótulo "Corpos", ícone humanoide). Verificar com testes de apresentação: um corpo é Corpos, um item comum etiquetado só "corpo" continua na categoria dele e uma magia não é corpo.
- [x] 10.2 Fazer o filtro Corpos na aba Cartas, para o Narrador e para o jogador. A miniatura mostra a figura humanoide ou a pintura própria de corpos, nunca a de Criaturas. Verificar com testes: contagem separada de Itens e Corpos, filtro só de corpos, ícone humanoide sem pintura e `cartas-arte-corpos` quando houver.

## 11. Item 7: cena sem bordas (decisão do usuário em 2026-10-02)

- [x] 11.1 Servidor: limite de sanidade de ±2000 em `sala._dentro` e nos contratos de token. Verificar com testes em `test_sala.py`: mover para (35, −4) numa cena 20×15 é aceito; 5000 é recusado com 422; criar token em (−10, 40) é aceito.
- [x] 11.2 Migração `0023_cena_sem_bordas` trocando a restrição do banco. Verificar com `alembic upgrade head` no SQLite local, um token negativo gravado pelo teste e a descida recusada com token negativo.
- [x] 11.3 Grade com `TilingSprite`, mapa sem moldura, enquadramento por mapa e tokens, arraste e ping sem limite, campos aceitando negativos e anúncio sem +1. Verificar com testes de `enquadrar` (retângulo de interesse e caso vazio) e de `RoomView` (campos sem `min`/`max` da cena), e no navegador sem quadrado.
- [x] 11.4 Aplicar a migração `0023` no Supabase de testes, só depois da confirmação do usuário. Aplicada em 2026-10-03, com a confirmação dele; restrição conferida no banco.

## 12. Item 8: abas Bolsa e Música (pedido de 2026-10-02)

- [x] 12.1 Extrair `FaixaDeRetratos` e usá-la nas Fichas. Verificar que os testes das Fichas continuam passando.
- [x] 12.2 Fazer a aba Bolsa: faixa de retratos (todos para o Narrador, só os próprios para o jogador) e a `InventoryGridPanel` do escolhido. Verificar com testes: lista por papel, troca de personagem e mesa sem personagens.
- [x] 12.3 Fazer a aba Música como espaço reservado e as abas com ícone, nome e dica, só com o ícone no painel estreito. Verificar com testes: ordem das seis abas, nomes acessíveis e aviso da Música.

## 13. Item 9: tokens da cena (pedido de 2026-10-02)

- [x] 13.1 Fazer o movimento direto (soltar ou "Mover", com prévia otimista, recusa e restauração). Verificar com testes do `RoomView`: soltar move sem confirmar; falha restaura a posição e anuncia; "Mover" pelo painel.
- [x] 13.2 Fazer a lista de personagens dos jogadores na aba Cena (Narrador), com "Colocar" e arraste para o grid, e as marcas "na cena". Verificar com testes: só o Narrador vê; "Colocar" cria o token com `personagem_id`, rótulo e camada da mesa; soltar no grid cria na casa; "na cena" marcado.
- [x] 13.3 Fazer os tokens redondos com retrato e aro, e os sem personagem com iniciais. Verificar com teste de que os retratos chegam ao canvas por token, e no navegador.

## 14. Item 10: NPCs e monstros (pedido de 2026-10-02)

- [x] 14.1 Fazer a lista "NPCs e monstros" na aba Cena (Narrador), com tipo, "oculto", "na cena", "Colocar" e arraste. Verificar com testes: separação das duas listas, marcas e criação do token com `personagem_id`.

## 15. Item 11: retirar token e aba Cena enxuta (pedidos de 2026-10-02)

- [x] 15.1 Botão "Retirar" por token para o Narrador, com a versão e o anúncio de erro. Verificar com testes: retirar chama o DELETE com a versão; o jogador não tem o botão; a recusa é anunciada.
- [x] 15.2 Tirar da aba Cena o ping por token, os campos de coordenada com "Mover" e o formulário "Colocar token". Verificar com testes que eles não aparecem e que o movimento por arraste continua (incluindo a falha que restaura a posição).

## 16. Item 12: ocultar tokens, tamanho do mapa e arraste de primeira (pedidos de 2026-10-02)

- [x] 16.1 Corrigir o arraste de primeira: ouvintes estáveis, arraste em referência e seleção por clique sem arrastar. Verificado no navegador (arrastar Lion sem selecionar antes moveu na hora); testes do `RoomView` passando.
- [x] 16.2 Fazer o botão de ocultar e mostrar por token, o token translúcido no grid e a marca na lista. Verificar com testes: chamada à visibilidade com `oculto` e versão, `aria-pressed`, marca "oculto" e o jogador sem o botão.
- [x] 16.3 Fazer a rota `area-do-mapa` no servidor. Verificar com testes em `test_sala.py`: o Narrador muda a área, o jogador recebe 403, limites de 1 a 200 (422) e tokens intactos.
- [x] 16.4 Fazer o controle de tamanho do mapa na aba Cena, com "Manter proporção". Verificar com testes: a proporção ajusta a outra medida, soltar a barra chama a rota (ver 17.5), o jogador não vê o controle.

- [x] 16.5 Separar ficha oculta de token oculto no servidor: `token_visivel` sem a ficha, `token_para` com o nome público e sem o vínculo, auditoria do Narrador quando a ficha está oculta; e a marca "ficha oculta" na lista de NPCs. Verificar com `test_sala` (NPC de ficha oculta visível como "Criatura desconhecida", sem `personagem_id`, sem o nome e com 403 ao mover), com a suíte do servidor e com os testes da interface.

- [x] 16.6 Revisão (decisões do usuário): o token visível mostra o nome real e a foto (rota `GET …/tokens/{id}/retrato`, `tipo_personagem` no token), a ficha oculta só tira o vínculo com a ficha, e a chave "Colocar oculto dos jogadores" decide a visibilidade ao colocar. Verificado com `test_sala` (nome real, sem `personagem_id`, tipo e 404 da rota para NPC sem foto e para token oculto), com os testes do `RoomView` (retrato pela rota e `oculto: true` com a chave) e no servidor local.

- [x] 16.7 Sala atualizada sem recarregar: reconsulta a cada 1 s sem tempo real e a cada 15 s com tempo real. Verificado com testes do `RoomView` (intervalos e o token ocultado sumindo do jogador depois de 1 s, com relógio simulado).

## 17. Itens 13 e 14: permissão de movimento e seções retráteis (pedidos de 2026-10-03)

- [x] 17.1 Seções retráteis na aba Cena (`SecaoRetratil`). Verificado com teste do `RoomView`: abre e fecha pelo título, mostra a quantidade e fica lembrada.
- [x] 17.2 Migração `0024_movimento_dos_tokens`, regra em `pode_controlar`, padrão na criação e rotas `movimento-permitido` e `permissoes`. Verificar com testes em `test_sala.py` e de migração.
- [x] 17.3 Interface: cadeado por token (com a marca "bloqueado"), escolha de jogadores para token sem dono (diálogo só com jogadores) e ações em lote no topo de "Tokens da cena". Verificado com testes do `RoomView`: bloquear com versão, diálogo e controladores, os três modos, recusa anunciada, jogador sem os controles.
- [x] 17.4 Aplicar a `0024` no Supabase de testes, junto da `0023`, só com a confirmação do usuário. Aplicada em 2026-10-03; coluna e versão do Alembic (`0024`) conferidas.

- [x] 17.5 Refinos do item 12: tamanho do mapa por barras aplicadas ao soltar, com uma barra quando há proporção e duas sem ela. Amostra do mapa no quadro de envio, ou quadro vazio. Verificado com testes do `RoomView`.
- [x] 17.6 Item 15: seção "Tokens" do Narrador com a barra de colocar e as seções internas (jogadores, NPCs e monstros, tokens da cena). O jogador fica só com "Tokens da cena". Verificado com testes do `RoomView`.

## 18. Verificação

- [x] 18.1 Rodar `npm test`, `npm run lint` e `npm run build` no frontend, todos passando. Verificado em 2026-10-03: 97 arquivos e 821 testes, lint sem avisos, build concluído.
- [x] 18.2 Capturar as telas abaixo e obter a aprovação visual do usuário (aprovado por ele em 2026-10-03: "tá tudo aprovado"):
  - a mesa do Narrador e a do jogador, com a barra lateral expandida e com ela recolhida;
  - a Sala do Narrador e a do jogador, com o painel aberto e com ele fechado, a 1440 px e a 375 px.

## 19. Próximos itens

- [x] 19.1 Acrescentar a esta mudança os próximos pedidos do usuário sobre a experiência da mesa. Os itens 1 a 15 foram acrescentados e implementados; o usuário encerrou a mudança em 2026-10-03, e os próximos pedidos vão para uma mudança nova.
