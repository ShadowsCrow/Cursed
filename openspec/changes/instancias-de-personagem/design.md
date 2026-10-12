# Design

## Contexto

Ver `proposal.md` para a motivação. O que condiciona o desenho:

- **Personagem é a unidade de tudo.** `PersonagemRegistro` (`characters`) guarda a ficha em JSON (`ficha`), `tipo`, `visibilidade`, `proprietario_id`, `procedencia` e `excluido_em` (lixeira). Inventário (`inventory_items`), efeitos aplicados (`character_effects`) e posses de cartas (`character_cards`) são linhas ligadas ao personagem. PV e PP atuais ficam em `ficha.recursos.<recurso>.atual`; os máximos são calculados.
- **Token aponta para um personagem.** `scene_tokens.personagem_id`; `sala.criar_token` recebe `personagem_id`. `RoomView.colocarPersonagem` chama `POST /sala/cenas/{cena}/tokens` com o id do personagem da lista.
- **Modo turno agrupa por ficha.** `turno.entrar` cria um participante por `personagem_id` com token na cena; `turno.incluir` dá participante próprio ao token posto depois (D8d). Com uma ficha por token, cada instância vira um participante só, pelo caminho que já existe.
- **Cópia já existe, mas para outra mesa.** `acervo.ficha_da_copia` tira o estado da história e o retrato; a rota `/personagens/copias` cria o personagem, copia o retrato para a outra mesa e chama `atualizar_cartas` (concessão das cartas de catálogo). Inventário e cartas concedidas à mão não são copiados.
- **Lista da Sala.** `usePersonagens` lê `GET /mesas/{id}/personagens` (`PersonagemResumo`); `PersonagensDosJogadores` separa os com dono dos sem dono.
- **Acervo.** `acervo.listar` filtra por tipo e mesa ativa; não há noção de instância.

## Goals / Non-Goals

**Goals:**
- Uma instância é um personagem comum para todo o resto da plataforma: ficha, Sala, modo turno, cartas, auditoria e estatísticas não precisam saber dela.
- A única marca nova é o vínculo com o modelo, usado só para listar, numerar, agrupar, filtrar e promover.
- A cópia é feita no servidor numa única transação, com o token.

**Non-Goals:**
- Sincronizar modelo e instâncias.
- Mudar a regra de grupo do modo turno (fica para tokens antigos).
- Migrar tokens já ligados a fichas de NPC.

## Decisões

### D1. Coluna `instancia_de` em `characters`

Migração `0032_instancias_de_personagem`, depois da `0031_uso_de_cartas`: `characters.instancia_de` (String(100), nula, índice), com chave estrangeira para `characters.id` e `ON DELETE SET NULL`. A lixeira não apaga linhas (só marca `excluido_em`), então o vínculo sobrevive à exclusão do modelo; a lista mostra essas instâncias sob "Modelo excluído". `PersonagemRegistro.instancia_de` e `PersonagemResumo.instancia_de` levam o valor.

*Alternativa descartada:* guardar o vínculo em `procedencia` (JSON). Não dá para indexar nem filtrar com eficiência no acervo e na lista.

### D2. Módulo `cursed_platform/instancias.py`

- `eh_modelo(personagem)`: `tipo in ("npc", "monstro")` e `instancia_de is None`.
- `proximo_numero(session, modelo)`: maior número já usado entre as instâncias do modelo na mesa, inclusive excluídas, mais 1. O número fica em `procedencia["instancia"]["numero"]`, para não depender de ler o nome.
- `criar(session, modelo, *, ator_id, correlacao_id) -> PersonagemRegistro`:
  1. `ficha = deepcopy(modelo.ficha)`; remove `desgaste` e `consequencias`; `personagem.nome = f"{nome} {numero}"`; mantém `imagem_ativo` e `ilustracao_ativo` (mesma mesa, mesmo espaço de objetos: a imagem é compartilhada, não copiada);
  2. `recursos.ajustar_atuais(ficha, recursos.calcular(ficha, catalogos.obter()), novo=True)` enche PV e PP;
  3. cria o `PersonagemRegistro` com `tipo`, `visibilidade` e `revelacao` do modelo, `proprietario_id=None`, `instancia_de=modelo.id`, `procedencia={"instancia": {"modelo_id", "numero", "criada_em"}}`;
  4. copia as linhas de `inventory_items` do modelo (ids novos, mesmos campos, inclusive equipado e posição na grade);
  5. copia as posses de `character_cards` de habilidade e magia (ids novos, mesmo `versao_id`, estado e `concedida_por`); posses de item são recriadas junto do inventário (`item_id` remapeado); posses de efeito não vêm (efeito aplicado é história);
  6. `atualizar_cartas(session, instancia, None, ficha)` concede as cartas de catálogo pela classe, como numa ficha nova; as posses copiadas no passo 5 que já sejam de catálogo são deduplicadas por `definicao_id`;
  7. auditoria `personagem.instanciado`, categoria `personagem`, com `modelo_id` e `numero`.
- `promover(session, instancia)`: `instancia_de = None`; `procedencia["instancia"]["promovida_em"]`; auditoria `personagem.promovido`.
- `fora_da_cena(session, modelo, cena)`: instâncias do modelo sem token na cena, para a limpeza.

A cópia das linhas usa funções pequenas por tabela, para a fase 3 de cartas-na-cena e outras mudanças reaproveitarem.

### D3. Colocar instancia pelo servidor

`POST /sala/cenas/{cena}/tokens` ganha, no corpo, `instanciar: bool = False`. Com `instanciar` e `personagem_id` de um modelo (NPC ou monstro sem `instancia_de`), a rota cria a instância com `instancias.criar` e liga o token a ela, com `rotulo` igual ao nome da instância, na mesma transação; devolve o token com `personagem_id` da instância. Com `personagem_id` de uma instância ou de um personagem de jogador, ou sem `instanciar`, o comportamento é o de hoje. A interface manda `instanciar: true` sempre que o item da lista é um modelo; o arraste do retrato passa pelo mesmo caminho (`onSoltarPersonagem` → `colocarPersonagem`).

*Alternativa descartada:* uma rota própria `POST /personagens/{id}/instancias` seguida do `POST tokens`. Duas transações; se a segunda falhar, sobra uma instância sem token.

### D4. Listas, acervo e promoção

- `GET /mesas/{id}/personagens` continua devolvendo todos (instâncias inclusive), agora com `instancia_de`. `PersonagensDosJogadores` agrupa: modelos na lista, instâncias sob o modelo (`<details>` aberto quando alguma está na cena), cada uma com "na cena", **Excluir** (`DELETE /personagens/{id}`, lixeira) e **Promover a ficha** (`POST /personagens/{id}/promocao`, só Narrador). O modelo ganha **Excluir as instâncias fora da cena** (`POST /personagens/{id}/instancias/limpeza?cena_id=`), que envia à lixeira as sem token na cena aberta e devolve quantas foram.
- "Colocar" numa instância fora da cena manda `instanciar: false` e liga o token a ela.
- Decisão do usuário (2026-10-06): a ficha que vai à lixeira leva os tokens dela de todas as cenas (`sala.remover_tokens_do_personagem`, chamado por `DELETE /personagens/{id}` e pela limpeza, com um `token.removido` no registro por token), para não sobrar token órfão; o contrário não vale: remover o token mantém a instância na lista, pronta para "Colocar" de novo. Restaurar da lixeira não devolve os tokens.
- `acervo.listar` acrescenta `PersonagemRegistro.instancia_de.is_(None)`.
- Aba Fichas da Sala, Registro, estatísticas e demais telas: nada muda; a instância é um personagem.

### D5. Modo turno

`turno.incluir` deixa de devolver o token ao grupo da ficha quando o grupo saiu todo da cena: todo token de uma ficha que já participa vira participante próprio, sem iniciativa, e o grupo antigo fica fora da barra e é pulado. Quem sai da mesa e volta rola de novo (relato do usuário, 2026-10-06). Fora isso, nada muda no domínio. `turno.entrar` cria um participante por ficha com token; com uma ficha por instância, cada uma é um participante com um token. `turno.incluir` continua tratando o token posto depois. O "×N" do grupo só aparece para tokens antigos ligados à mesma ficha.

### D6. Retrato compartilhado

`imagem_ativo` da instância aponta para o mesmo objeto do modelo, no espaço da mesma mesa. Trocar o retrato da instância pela ficha grava um objeto novo só para ela, pelo caminho que já existe. Excluir o modelo não apaga objetos.

## Impacto no jogo

- **Escassez e risco:** cada criatura passa a ter PV e PP próprios, como a mesa já jogava de cabeça. O Narrador deixa de dividir uma barra de vida entre três tokens.
- **Ritmo:** "Colocar" fica um pouco mais pesado no servidor (cópia de ficha, inventário e cartas), ainda bem abaixo de um segundo. Nada muda para o jogador.
- **Carga cognitiva:** a lista do Narrador ganha um nível (instâncias sob o modelo), mas o nome numerado no token e na barra de turno tira a ambiguidade de "qual Goblin é esse".

## Interações com outras mecânicas

- **cartas-na-cena:** a mão, o PP e as ações do turno passam a ser por instância, o que fecha de vez o caso do controle por token. Liberar o token de "Lagarto-macaco 2" para um jogador dá a ele só essa instância, pela regra de `controla_personagem`.
- **Cartas de catálogo:** `atualizar_cartas` na criação concede as de classe; a sincronização do catálogo as versiona como em qualquer ficha.
- **Lixeira:** instâncias excluídas seguem a regra de exclusão recuperável; o número delas não é reutilizado.
- **Acervo e cópia para outra campanha:** copiar uma instância para outra campanha cria um NPC ou monstro comum lá (sem `instancia_de`), pelo caminho que já existe.

## Risks / Trade-offs

- [Mesa cheia de instâncias esquecidas] → "Excluir as instâncias fora da cena" por modelo, e a lista agrupada deixa o excesso à vista.
- [Modelo editado e Narrador esperando que as instâncias mudem] → o texto da lista diz "criada a partir de Goblin em 06/10" e a proposta registra a decisão; promover e recriar é o caminho.
- [Cópia incompleta de alguma tabela ligada ao personagem] → a função de cópia é coberta por teste que compara, para uma ficha completa, inventário, posses e ficha da instância com os do modelo, campo a campo, exceto o que a spec zera.
- [Instância de ficha oculta revela o nome numerado] → a instância herda `visibilidade` e `revelacao` do modelo; o nome público segue a revelação, como hoje.

## Migration Plan

1. Migração `0032_instancias_de_personagem` (coluna, índice e FK), depois da `0031`. Descida: apaga a coluna; as instâncias viram NPCs e monstros comuns.
2. Regenerar `openapi.json` e `schema.ts`.
3. Nenhum dado migra: tokens antigos continuam ligados às fichas.
4. Supabase de testes só com autorização do usuário, anotando no `AGENTS.md`.

## Open Questions

- Grupo de iniciativa para instâncias criadas juntas (uma rolagem para criaturas idênticas, como a regra permite): decisão do usuário, fora desta mudança; aqui cada instância rola sozinha.
