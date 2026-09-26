# Revisão de acessibilidade da plataforma

Data: 2026-09-26. Escopo: ficha do jogador, oferta de cartas, diálogo de descanso e sala com grid. Ambiente automatizado: Chromium headless pelo Playwright 1.63.0, interface em português, movimento reduzido, banco SQLite descartável e identidades separadas de Narrador e jogador.

| Critério | Evidência | Estado |
| --- | --- | --- |
| Rótulos, papéis e relações detectáveis | `e2e/platform.spec.mjs` usa consultas por papel e nome; axe-core 4.13.0 nas quatro superfícies, regras WCAG 2.0/2.1 A e AA e WCAG 2.2 AA, com zero violações detectadas. | Passou no escopo automatizado |
| Escolha de cartas por teclado | Foco na carta, Enter e Espaço selecionam; confirmação conclui a oferta. | Passou no Chromium |
| Diálogo de descanso | Foco entra no diálogo; Escape fecha e devolve o foco ao botão de abertura. | Passou no Chromium |
| Grid sem arraste | A lista de tokens expõe nome e coordenadas; Enter seleciona e os campos de destino permitem confirmar movimento. | Passou no Chromium |
| Toque em detalhe de efeito | Toque abre a descrição completa. A revisão encontrou e corrigiu a sequência `touchstart` + clique sintetizado que antes fechava o conteúdo imediatamente. | Passou no Chromium com emulação de toque |
| Reflow da ficha | Largura de 320 px sem rolagem horizontal da página. | Passou no Chromium |
| Leitor de tela | Percorrer estrutura, ouvir nomes/estados e concluir as quatro jornadas com leitor de tela e navegador reais. | Pendente de execução |
| Inspeção manual adicional | Ordem de Tab e Shift+Tab, foco visível, zoom de 200% e 400%, contraste, espaçamento de texto, tamanhos de alvo e recuperação de erros. | Pendente de execução |

Reprodução: em `platform/frontend`, executar `npm.cmd run test:e2e` no Windows após instalar o Chromium do Playwright. O teste sobe API e interface locais e remove o banco temporário. A automação cobre estados concretos e não constitui declaração geral de conformidade WCAG. A tarefa 12.3 permanece aberta até a verificação manual com leitor de tela e dos itens adicionais.

## Roteiro manual pendente

Usar uma mesa com Narrador e jogador de teste. Registrar navegador, versão, sistema operacional, leitor de tela e versão, data, resultado por jornada e palavras anunciadas quando houver dúvida sobre nome ou estado.

1. Na ficha do jogador, percorrer títulos, abas, recursos e efeitos pela estrutura do leitor de tela; abrir e fechar o detalhe de um efeito por teclado e por toque. Confirmar que nome, origem, duração e condição de encerramento são anunciados quando presentes.
2. Na oferta de cartas, navegar pelas opções com Tab e Shift+Tab, escolher com Enter e Espaço, revisar a contagem anunciada e cancelar ou confirmar. Reabrir a página e conferir o estado final.
3. No diálogo de descanso, confirmar título anunciado, foco inicial dentro do diálogo, fundo indisponível, saída por Escape e retorno ao botão de abertura. Provocar erro de validação e conferir mensagem e recuperação.
4. No grid, localizar a cena e os tokens pela navegação estrutural, selecionar um token, mover pelos campos de coordenadas e confirmar. Conferir anúncio da nova posição e ausência de token oculto na visão do jogador.
5. Repetir as jornadas com zoom de 200% e 400% e verificar reflow, foco visível, contraste, alvos de toque, espaçamento de texto e ausência de movimento obrigatório. Anotar qualquer bloqueio antes de marcar a tarefa concluída.
