# Proposta — aba-resumo-da-ficha

## Why

Ao abrir a ficha, o jogador cai direto em "Informações básicas", um painel de campos. Não existe um lugar que mostre **quem é o personagem de relance**: rosto, história, no que é bom e o que carrega. Isso enfraquece a identidade do personagem, que é o objetivo principal das regras, e obriga a navegar por várias abas para lembrar o essencial antes de uma cena. A imagem de referência enviada pelo usuário (ficha em pergaminho com ilustração de corpo inteiro ao centro e quadros ornados nas laterais) mostra o que se quer: uma página de apresentação bonita, que muda sozinha conforme a ficha.

Classificação: **núcleo, apenas interface e dados da ficha**. Nenhuma regra de mesa, limite ou catálogo muda. A aba só apresenta valores que a ficha e o servidor já calculam; o único dado novo é narrativo (História) ou visual (ilustração).

## What Changes

- **Nova aba "Resumo"**, primeira da ficha e aberta por padrão, só de leitura, no estilo da referência: pergaminho, molduras douradas, título ornado, sobre os tokens e componentes da primeira fatia da nova estética.
  - **Centro:** a **ilustração do personagem** (imagem de corpo inteiro, vertical); sem ela, o retrato; sem os dois, a arte `retrato-vazio`.
  - **Identidade** (canto superior esquerdo): nome, classe, arquétipo, raça e nível.
  - **Recursos** (canto superior direito): medalhões de PV e PP (atual e máximo) e de Defesa (Esquiva), com Defesa (Armadura) e RDB em plaquetas menores.
  - **Atributos** (esquerda): os nove atributos nos três grupos do livro, com o valor total calculado.
  - **Perícias** (direita): as **seis de maior valor total**, ignorando as de valor `0`, desempate pela ordem do livro.
  - **Equipamentos** (esquerda): os itens equipados, com arte ou ícone.
  - **Habilidades** (direita): as cartas de habilidade e magia **aprendidas**, com arte e nome.
  - **História** (faixa inferior): o texto da nova História, com letra capitular.
  - Cada quadro tem um atalho para a aba onde aquele conteúdo é consultado e editado. Listas longas mostram "e mais N".
- **Novo campo `História`** na personalidade: texto livre, opcional, sem efeito mecânico, editado na aba Personalidade e registrado no histórico como os demais campos narrativos.
- **Novo ponto de envio "ilustração do personagem"**, separado do retrato do cabeçalho, com as mesmas permissões do retrato e cópia de exibição maior. O envio e a troca ficam sob a imagem, na própria aba Resumo, para quem pode editar a ficha.
- Links antigos com `?secao=...` continuam abrindo a aba pedida; sem `secao`, abre o Resumo.

## Capabilities

### New Capabilities
- `resumo-da-ficha`: a aba Resumo — composição, o que cada quadro mostra, seleção de perícias, equipamentos e habilidades, estados vazios, atualização com a ficha, atalhos, acessibilidade e layout no celular.

### Modified Capabilities
- `ficha-viva`: as seções modulares passam a incluir o Resumo como seção inicial.
- `identidade-e-personalidade-do-personagem`: novo campo narrativo História.
- `envio-de-imagens`: novo ponto de envio "ilustração do personagem", com limite de tamanho próprio.

## Non-goals

- Editar valores dentro do Resumo (além do envio da ilustração): a edição continua nas abas.
- Exportar ou imprimir o Resumo como imagem ou PDF.
- Escolha manual de quais perícias, itens ou habilidades destacar.
- Campo "Origem" da referência: a ficha não o modela e esta mudança não o cria.
- "Iniciativa" e outros valores que o servidor ainda não calcula: nada é inferido no cliente.
- Novo visual das demais abas, da mesa, da sala ou das telas fora da ficha.
- Resumo para NPCs e monstros na vitrine pública do Narrador (a aba existe na ficha deles como em qualquer ficha, mas a vitrine pública não muda).

## Impact

- **Frontend:** `platform/frontend/src/app/characters/sheet/CharacterSheetPage.tsx` (nova seção e padrão), novo componente de Resumo e CSS próprio sobre `src/design/tokens.css` e `src/ui/Tema.tsx`; `PersonalityPanel.tsx` (campo História); `ImageUpload` reutilizado com o novo destino; `fichaAccess.ts`.
- **API:** `platform/api/cursed_api/images.py` (destino `ilustracao` → `ficha.personagem.ilustracao_ativo`), `cursed_platform/imagens.py` (limite e cópia de exibição), `contracts.py` (literal de destino); OpenAPI e cliente gerado.
- **Dados:** `cursed_platform/catalogos/listas_ficha.json` ganha o campo História (rótulo e dica) e o manifesto é atualizado; validação de tamanho do texto em `validacao_ficha.py`; rótulo no `fieldLabels.ts` e na auditoria.
- **Sem migração:** fichas existentes ficam sem História e sem ilustração, e o Resumo mostra os estados vazios.
