# Proposal

## Why

A aba **Música** da Sala é só um espaço reservado. Hoje, para pôr música na sessão, o Narrador precisa de outra ferramenta (bot do Discord, YouTube aberto em outra aba, arquivo próprio), e cada jogador ouve uma coisa diferente ou nada. O usuário quer que o Narrador escolha uma música dentro da Sala e que todos ouçam a mesma música, ao mesmo tempo, sem ninguém baixar nada e sem propaganda.

Pesquisa feita com o usuário em 2026-10-03:
- Retransmitir o YouTube do Narrador para os jogadores viola os Termos do YouTube (retransmissão e contorno de anúncios); fica fora.
- Bibliotecas públicas com licença aberta servem ao propósito. Como o sistema é de uso aberto, mas pode ter funções pagas no futuro, a biblioteca usa **só faixas CC BY e CC0**, que permitem uso comercial (decisão do usuário). Ficam de fora as licenças "sem fins comerciais" (Tabletop Audio, API do Jamendo, API do Freesound).
- O usuário quer as faixas classificadas, para o Narrador saber o tipo de música que vai tocar (por exemplo, "Ambiente · Medieval" ou "Combate · Medieval").
- Um teste fora do sistema, com 7 faixas (Kevin MacLeod/Incompetech, CC BY 4.0; OpenGameArt, CC0), aprovou o caminho; o usuário pediu para pôr na aba Música para ver o uso real.
- Vendo o uso real, o usuário pediu para separar **ambiente** de **música**, e escolheu duas camadas que tocam juntas: um som ambiente de fundo e uma música por cima, cada uma com seus controles e volume. Também classificou "Cathedral in the Forest" como música, não ambiente.

Classificação: ferramenta da aplicação, para o Narrador e os jogadores. Não muda regra de `rules/sistema`.

## What Changes

- **Biblioteca da mesa:** a plataforma traz uma biblioteca de sons pronta, só com faixas CC BY e CC0, em dois tipos:
  - **Ambiente:** som de fundo em repetição, classificado só por **Cenário**;
  - **Música:** classificada por **Momento** e **Cenário**.
  Cada faixa tem título, autor, licença, link da licença, link de origem e duração, e a marca "repete sem emenda" nas faixas feitas para repetir. As listas fixas são:
  - **Momentos:** Exploração / Viagem, Combate, Chefe / Épico, Tensão / Suspense, Mistério, Terror, Taverna / Festa, Descanso / Calmo, Drama / Tristeza. Com a camada Ambiente, o Momento "Ambiente" virou "Exploração / Viagem";
  - **Cenários:** Medieval, Masmorra / Caverna, Floresta / Natureza, Cidade / Vila, Sobrenatural / Sombrio.
  A primeira versão traz 17 ambientes e 29 músicas aprovados pelo usuário. A divisão principal é o **Estilo de jogo** (Medieval, Moderno, Ficção científica), pedido do usuário para outros estilos de jogo, com a mesma clareza da divisão entre ambiente e música. O Cenário passou a ser só o lugar (Cidade / Vila, Interior, Natureza, Masmorra / Caverna, Sobrenatural / Sombrio, Nave / Estação) e é opcional. As listas de Estilos, Momentos e Cenários ficam no catálogo.
- **Duas camadas:** Ambiente e Música tocam ao mesmo tempo, cada uma com a sua faixa.
- **Aba Música do Narrador:** o bloco "Tocando agora" tem um quadro por camada, cada um com Pausar/Continuar, Parar, a chave "Repetir" e o volume. A biblioteca é separada em Ambientes, com filtro por Cenário, e Músicas, com filtros por Momento e Cenário combináveis; opções sem faixa ficam desativadas. Cada faixa da lista tem os rótulos, o crédito e "Tocar".
- **Favoritas:** estrela em cada faixa e filtro "Favoritas" junto aos outros filtros da biblioteca, guardados neste navegador (pedido do usuário).
- **Todos ouvem juntos:** o servidor guarda, por camada, o que a mesa está ouvindo: a faixa, se toca ou está pausada, a posição e o momento da última mudança, e "Repetir". Cada navegador toca a faixa na posição certa, inclusive quem entra no meio da música, e corrige sozinho se sair do compasso. A mudança chega pelo aviso em tempo real da Sala ou, sem ele, pela consulta periódica.
- **Troca suave:** ao trocar de faixa, a anterior some aos poucos enquanto a nova entra; pausar e continuar também são suaves.
- **Aba Música do jogador:** "Tocando agora" com as duas camadas, as faixas, os rótulos e os créditos, sem controles de tocar.
- **Volume de cada um:** cada pessoa (Narrador incluído) tem um volume para o ambiente e outro para a música, e um "Silenciar" que cala os dois, guardados neste navegador.
- **Ativar som:** o navegador só toca som depois de um gesto da pessoa. O primeiro clique em qualquer lugar da Sala já libera o som; enquanto não liberar e houver música tocando, a aba Música mostra o botão "Ativar som".
- **Créditos:** o crédito de cada faixa (autor, licença com link e origem) aparece na lista e no "Tocando agora", como a licença CC BY exige.
- A música continua tocando com qualquer aba do painel aberta e com o painel recolhido.

## Capabilities

### New Capabilities
- `musica-da-sala`: biblioteca de sons com licença aberta, separada em ambientes (por Cenário) e músicas (por Momento e Cenário), e duas camadas (Ambiente e Música) escolhidas pelo Narrador e tocadas juntas, em sincronia para todos.

### Modified Capabilities
- `experiencia-da-mesa`: a aba Música deixa de ser espaço reservado e passa a ser a música da mesa.

## Impact

- Banco: tabela nova com o estado de cada camada de cada mesa (migração `0026`), com RLS ligado e sem acesso direto de `anon`/`authenticated`, como as outras tabelas da Sala. Precisa ser aplicada no Supabase de testes.
- API: `GET /musicas` (biblioteca), `GET /mesas/{mesa_id}/sala/musica` (estado das duas camadas, para quem é da mesa) e `PUT /mesas/{mesa_id}/sala/musica/{camada}` (só o Narrador). Aviso `sala.musica` no tópico da mesa.
- Frontend: aba Música, tocador da mesa no `RoomView`, cliente da API regenerado.
- Arquivos de áudio: 46 faixas, servidas pelo frontend em `public/musica/`, em cerca de 232 MB nos formatos originais (MP3, OGG, WAV e FLAC). É grande demais para versionar assim: antes do commit, a conversão para um formato menor depende de instalar o `ffmpeg` (pendente de autorização do usuário).
