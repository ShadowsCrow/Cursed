# Proposal

## Why

Hoje vários tokens podem apontar para uma única ficha de NPC ou monstro. Três Lagartos-macacos postos a partir da mesma ficha dividem PV, PP, desgaste, efeitos e cartas, e no modo turno viram um "grupo da ficha" com participantes de token próprio. Isso contraria a mesa: cada criatura em cena tem a própria vida e os próprios recursos. Foi também a raiz do bug de 2026-10-06, em que liberar um token dava ao jogador a vez de todos os tokens daquela ficha.

O usuário aprovou (2026-10-06) o desenho de **modelo e instâncias**: a ficha do Narrador é o modelo e nunca entra na cena; cada "Colocar" cria uma instância independente, com ficha, PV, PP, token e participante próprios. Decisões dele: colocar é um por um (sem pedir quantos), a instância é independente depois de criada, e pode ser promovida a ficha normal quando vira um NPC recorrente.

Classificação: ferramenta da aplicação, exclusiva do Narrador. Não muda nenhuma regra de `rules/sistema`.

## What Changes

**Modelo e instância**
- Toda ficha de NPC ou monstro da mesa é um **modelo**. Colocar um modelo na cena (pelo botão "Colocar", pelo arraste do retrato ou pelo "Colocar oculto") cria uma **instância**: uma cópia completa e independente da ficha, com nome numerado ("Lagarto-macaco 1", "Lagarto-macaco 2"…), PV e PP cheios, e um token ligado a ela.
- A cópia leva a ficha inteira, inclusive atributos, perícias, classe, retrato, equipamento e cartas de habilidade e magia já aprendidas. Zera o que é história: desgaste, consequências e efeitos aplicados.
- A instância guarda de qual modelo veio. Editar o modelo depois **não** mexe nas instâncias já criadas.
- Personagens de jogadores continuam entrando na cena como eles mesmos, sem instância.
- Cada instância é um participante próprio no modo turno e rola a iniciativa sozinha. O "grupo da ficha" do modo turno fica só para tokens antigos ligados a uma mesma ficha.

**Onde as instâncias aparecem**
- Na sub-aba Personagens da aba Cena, a lista "NPCs e monstros" mostra os modelos; as instâncias de cada modelo ficam agrupadas sob ele, com "na cena" quando têm token, e com **Excluir** (lixeira recuperável) e **Promover a ficha**.
- O acervo (seção Personagens, coleções NPCs e Monstros) **não** lista instâncias: só modelos e fichas promovidas.
- Na aba Fichas da Sala e nas demais telas que mostram os personagens da cena, a instância aparece como um personagem normal, com o nome numerado.

**Promover**
- "Promover a ficha" transforma a instância numa ficha normal da mesa: ela deixa de apontar para o modelo, passa a aparecer no acervo e vira, ela própria, um modelo para novas instâncias. O nome fica como está, e o Narrador o renomeia pela ficha se quiser.

**Limpeza**
- Retirar o token da cena não apaga a instância: ela continua na lista, sem "na cena", para voltar à cena depois com o mesmo estado. O Narrador exclui pela lista, e a sub-aba oferece **Excluir as instâncias fora da cena** de um modelo.

## Capabilities

### New Capabilities
- `instancias-de-personagem`: criar uma instância ao colocar um modelo na cena, a cópia e a numeração, o vínculo com o modelo, a independência, a promoção e a limpeza.

### Modified Capabilities
- `experiencia-da-mesa`: "NPCs e monstros na cena" passa a criar instâncias ao colocar, e a lista agrupa as instâncias sob o modelo.
- `acervo-de-personagens`: as coleções NPCs e Monstros não listam instâncias.
- `modo-de-turno`: quem sai da mesa e volta rola de novo. Um token posto depois de o grupo da ficha sair da cena entra como participante próprio, sem a iniciativa antiga (relato do usuário, 2026-10-06: o Lagarto-macaco recolocado vinha com o dado já rolado).

## Impact

- **Banco:** migração `0032_instancias_de_personagem`, depois da `0031_uso_de_cartas` de `cartas-na-cena` (que precisa ser aplicada antes): coluna `characters.instancia_de` com índice.
- **Servidor:** módulo novo `cursed_platform/instancias.py` (cópia, numeração, promoção); `sala.criar_token` e a rota de criar token passam a instanciar modelos; `acervo.listar` e a lista de personagens da mesa filtram ou marcam instâncias; rotas de promover e de excluir instâncias fora da cena; `PersonagemResumo` ganha `instancia_de`.
- **Frontend:** `PersonagensDosJogadores` (agrupamento, Excluir, Promover, limpeza); `RoomView` (colocar cria instância e seleciona o token dela); `usePersonagens` com o campo novo; acervo sem instâncias.
- **Modo turno:** sem mudança de regra; cada instância entra como participante próprio porque é uma ficha própria.
- **Dependência:** `cartas-na-cena` arquivada antes, pela ordem das migrações.

## Non-goals

- Não pede quantidade ao colocar: um token por vez (decisão do usuário).
- Não sincroniza o modelo com as instâncias depois de criadas.
- Não cria instâncias de personagens de jogadores.
- Não decide o grupo de iniciativa para instâncias criadas juntas (regra que permite uma rolagem para criaturas idênticas); fica como decisão do usuário para uma mudança futura, e por ora cada instância rola sozinha.
- Não muda nenhuma regra de `rules/sistema`.
