# Handoff — melhorias-da-sala

Arquivada em 2026-10-03, com todos os itens aprovados pelo usuário ("tudo aprovado fechar tudo"). A proposta, o design e as tarefas aqui ao lado detalham cada um dos 10 itens. Os requisitos foram para `openspec/specs/rolador-de-dados/spec.md` (nova), `experiencia-da-mesa` e `persistencia-de-mesa`.

## Itens

1. **Rolador de dados** na aba Dados, logo depois de Cena, parecido com o do Google. Os dados são pintados pelo Codex no estilo do jogo, com o número do tipo na face. "Limpar" zera também o visor.
2. **Controle de zoom compacto**, na moldura do sistema, com "Centralizar" em forma de ícone.
3. **Dados 3D rolando no tabuleiro,** pelo método do Dice So Nice: o arremesso é simulado antes e os números das faces são trocados para a face de cima mostrar o valor sorteado. Usa `three` e `cannon-es`, carregados só na primeira rolagem animada. As rolagens são sorteadas e guardadas pelo servidor e chegam aos outros pelo Realtime ou pela consulta periódica. Na aba, as opções "Mostrar rolagens" e "Animação dos dados".
4. **"Colocar oculto" por token** (olho cortado). A chave geral "Colocar oculto dos jogadores" saiu.
5. **As rolagens do Narrador saem ocultas por padrão,** com a chave "Rolar oculto dos jogadores" para mostrar. O servidor não entrega as ocultas aos jogadores.
6. **Tamanho do token,** sempre quadrado de 1×1 a 10×10, pelo menu do botão direito sobre o token. No painel fica o mesmo controle, como caminho pelo teclado.
7. **Histórico com barra de rolagem própria.** As opções da aba ficam num bloco que abre e fecha.
8. **Rolagem pela ficha:** faixa compacta de retratos com "Sem ficha", e Atributo + Perícia que o servidor soma da própria ficha. O jogador vê as fichas dele; o Narrador, as da cena. Escolher um modificador sem dado montado põe 1d20.
9. **A Sala está sempre ligada.** Saíram o módulo, as rotas `/modulos` e a tela "Sala desativada".
10. **Botão direito no dado tira um** (Delete ou Backspace pelo teclado).

## Decisões do usuário

- **Imagens pelo Codex,** com fundo transparente e o número na face. Os números dos dados 3D usam a Cormorant com algarismos alinhados (`lnum`).
- **Rolagem pelo servidor,** depois de o mestre não ver a rolagem do jogador no ambiente local, que não tem Realtime.
- **Opções na própria aba Dados,** sem página de configurações.
- **Atributo + Perícia,** como na regra de Rolagens.
- **Não há validação em mesa real.** A verificação foi feita por testes, pelo navegador e pela aprovação do usuário.

## Banco

- **`0025_rolagens_de_dados`:** cria a tabela `dice_rolls` (com `oculta`, `personagem_id` e `termos`), com RLS ligado e sem acesso para `anon` e `authenticated`.
- **Supabase de testes:** aplicada no projeto `wvfrwmplruhwfkmwjtvl` em 2026-10-03, a pedido do usuário. O Alembic está em `0025`; colunas, RLS e privilégios foram conferidos.
- **Banco local da 5195:** recebe a `0025` ao reiniciar o ambiente.

## Verificação

- **Frontend:** `npm test` passa (104 arquivos, 874 testes), assim como o lint, o TypeScript, o build e `check:client`.
- **Servidor:** a suíte Python inteira passa (617 testes), e `export_openapi --check` está em dia.

## Pendências fora desta mudança

- **Chat e Música** continuam espaços reservados. As rolagens guardadas no servidor já servem para o registro e o chat no futuro.
- **Limpeza de `dice_rolls`:** a tabela não é limpa; definir quanto guardar quando houver chat e registro.
