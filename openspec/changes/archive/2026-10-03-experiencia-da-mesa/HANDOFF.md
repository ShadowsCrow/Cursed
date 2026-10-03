# Handoff — experiencia-da-mesa

Arquivada em 2026-10-03, com todos os itens aprovados pelo usuário ("tá tudo aprovado"). A spec nova é `openspec/specs/experiencia-da-mesa/spec.md`. A proposta, o design e as tarefas aqui ao lado detalham cada um dos 15 itens.

## Decisões do usuário

- **A Sala é a página principal da mesa**, de página única. O grid toma a tela, numa grade infinita atrás dos controles.
- **A cena não tem bordas.** É um espaço próprio da mesa, e colunas × linhas são só a área do mapa. Os tokens podem ficar em qualquer casa até ±2000.
- **Ficha oculta e token oculto são coisas diferentes.** A ficha oculta só impede o jogador de abri-la. O token visível mostra o nome real e a foto, e é o Narrador quem decide a visibilidade: ao colocar, pela chave "Colocar oculto dos jogadores", e depois pelo olho.
- **O movimento é direto,** por arraste e sem confirmação. Saíram da aba Cena o ping por token, as coordenadas com "Mover" e o formulário "Colocar token".
- **Corpos são uma categoria própria,** com pintura humanoide gerada pelo Codex, nunca SVG.
- **Permissão de movimento (opção B):** um token sem dono só é liberado para os jogadores que o Narrador escolher.
- **Não há validação em mesa real.** A verificação foi feita por testes e pela aprovação do usuário.

## Banco

- **`0023_cena_sem_bordas`:** a restrição `ck_scene_tokens_posicao` passou a ser ±2000.
- **`0024_movimento_dos_tokens`:** acrescenta `scene_tokens.movimento_liberado`, booleano, com padrão verdadeiro.
- **Supabase de testes:** as duas foram aplicadas no projeto `wvfrwmplruhwfkmwjtvl` em 2026-10-03, com a confirmação do usuário. Não havia tokens. O Alembic está em `0024`, e a restrição e a coluna foram conferidas.

## Verificação

- **Frontend:** `npm test` passa (97 arquivos, 821 testes), assim como o lint e o build.
- **Servidor:** os testes de `test_sala.py` e das migrações `0023` e `0024` passam.

## Pendências fora desta mudança

- **Chat e Música** são só espaços reservados. Os próximos pedidos sobre a mesa vão para uma mudança nova.
