# Handoff — musica-da-sala

Arquivada em 2026-10-05, com tudo aprovado pelo usuário ("Tudo aprovado suba o supabase e commita"). A proposta, o design e as tarefas aqui ao lado detalham cada item. Os requisitos foram para `openspec/specs/musica-da-sala/spec.md` (nova) e `experiencia-da-mesa`.

## Itens

1. **Biblioteca de sons com licença aberta:** 17 ambientes e 29 músicas, só CC BY e CC0, com título, autor, licença, origem, duração e "repete sem emenda". O catálogo é `cursed_platform/catalogos/musicas.json` e é relido quando muda, sem reiniciar o servidor.
2. **Classificação:**
   - **Estilo de jogo** (Medieval, Moderno, Ficção científica) é a divisão principal, e uma faixa pode ter mais de um.
   - **Música:** classificada por Momento.
   - **Cenário:** é só o lugar e é opcional.
3. **Duas camadas, Ambiente e Música,** que tocam juntas, cada uma com a sua faixa, Pausar/Continuar, Parar e "Repetir".
4. **Todos ouvem o mesmo som ao mesmo tempo:** o servidor guarda o estado de cada camada. Cada navegador toca na posição esperada, inclusive quem entra no meio, e se corrige acima de 1,5 s de diferença.
5. **Troca e pausa suaves.**
6. **Aba Música:**
   - **Narrador:** "Tocando agora" e a biblioteca separada em Ambientes e Músicas, com filtros e Favoritas guardadas no navegador.
   - **Jogador:** só o que está tocando, com os créditos.
7. **Volume por camada e "Silenciar"** de cada pessoa, guardados no navegador. O botão "Ativar som" aparece enquanto o navegador não libera o áudio.

## Decisões do usuário

- **Só CC BY e CC0,** que permitem uso comercial; nada de retransmitir o YouTube.
- **Ambiente separado de música,** em duas camadas tocando juntas.
- **Estilo de jogo como divisão principal,** para outros estilos além do medieval.
- **Áudios em Opus no Ogg** (2026-10-05, `ffmpeg` autorizado pelo usuário): de 242,7 MB para 90,5 MB, com as durações conferidas e loops sem silêncio na emenda.

## Banco

- **`0026_musica_da_sala`:** tabela `room_music` (mesa e camada na chave), com RLS ligado e sem acesso para `anon` e `authenticated`.
- **Supabase de testes:** aplicada no projeto `wvfrwmplruhwfkmwjtvl` em 2026-10-05, junto da `0027` à `0030`; o Alembic está em `0030`.

## Verificação

- **Testes:** a suíte Python inteira passa (725 testes). O frontend passa em `npm test` (974 testes), no lint, no TypeScript, no build e no cliente gerado.
- **No navegador,** as faixas convertidas carregaram com a duração certa.
- **Aprovação do usuário:** é a do uso real da aba. Não há validação em mesa real.
