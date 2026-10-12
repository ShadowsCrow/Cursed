# Manifesto de inventário legado

Versão do manifesto: `1.0`

Este documento é a fonte versionada para rastrear cada fonte da aplicação
Streamlit durante a migração. Um item só pode avançar para o corte quando tiver
um destino implementado e validado ou uma pendência explicitamente aprovada.

## Jornadas atuais

| Jornada | Entrada atual | Destino na plataforma | Estado |
| --- | --- | --- | --- |
| Criar e editar ficha | `app_streamlit/app/ficha.py` e `app_streamlit/app/sections/` | API autoritativa de personagens e ficha React | Pendente — tarefas 2.6 e 6.1–6.4 |
| Carregar fichas salvas | `core/carregar_fichas_salvas.py` e `core/db.py` | Repositório de personagens e migrador | Pendente — tarefas 3.4 e 11.1 |
| Persistir ficha | `core/persist_data.py` e `core/db.py` | Comandos da API e PostgreSQL | Pendente — tarefas 2.6 e 3.1–3.5 |
| Equipar e desequipar | `app/sections/armas.py`, `armadura.py`, `equipamento_tabs.py` | Comando de inventário e ficha viva | Pendente — tarefas 2.2, 6.6 |
| Aplicar e visualizar efeitos | `core/efeitos.py`, `app/sections/efeitos.py` | Pacote de domínio e comandos de efeitos | Pendente — tarefas 2.1, 6.5, 8.3 |
| Importar conteúdo portátil | `equip_import.py`, `efeitos_import.py` | Diálogo React e conversor de compatibilidade | Pendente — tarefas 6.8 e 11.4 |
| Criar conteúdo de mestre | `app/forjador.py` | Editor de cartas versionadas | Pendente — tarefas 9.1–9.3 |

## Dados e tabelas

| Fonte | Campos ou conteúdo relevante | Destino | Estado |
| --- | --- | --- | --- |
| `app_meta` | versão de esquema e da aplicação | metadados Alembic e execução de migração | Pendente — 3.1, 11.1 |
| `fichas` | `nome`, personagem, personalidade, atributos, perícias, datas | `characters` com conteúdo estruturado e versão | Pendente — 3.2, 11.1 |
| `ficha_armas` | arma, ordem e payload | itens/inventário por personagem | Pendente — 3.3, 11.1 |
| `ficha_armaduras` | armadura, ordem e payload | itens/inventário por personagem | Pendente — 3.3, 11.1 |
| `ficha_outros` | outros itens, ordem e payload | itens/inventário por personagem | Pendente — 3.3, 11.1 |
| `ficha_efeitos_externos` | efeitos aplicados, ordem e payload | efeitos com origem e duração | Pendente — 3.3, 11.1 |
| `equipment_library` | tipo, hash e JSON de equipamento | definições/versionamento de cartas | Pendente — 9.1, 11.2 |
| `effects_library` | hash e JSON de efeitos | definições de efeito e procedência | Pendente — 3.3, 11.2 |
| SQLite local | banco em `%LOCALAPPDATA%/Cursed/cursed.db` ou `.local/cursed.db` | origem identificada pelo migrador idempotente | Pendente — 11.1 |
| PostgreSQL atual opcional | mesmo esquema SQLAlchemy legado | origem identificada pelo migrador idempotente | Pendente — 11.1 |

## Catálogos, formatos e ativos

| Fonte | Conteúdo | Destino | Estado |
| --- | --- | --- | --- |
| `data/catalogs/classes.json` | classes, arquétipos e habilidades legadas | cartas versionadas; custos especializados permanecem indefinidos sem revisão | Pendente — 9.1–9.2, 11.2, 11.5 |
| `data/catalogs/racas.json` | raças | conteúdo de ficha/catálogo | Pendente — 11.2 |
| `data/catalogs/tipos_dano.json` | tipos de dano | catálogo de conteúdo | Pendente — 11.2 |
| `data/catalogs/reserva_habilidades.json` | reserva de habilidades | catálogo de conteúdo | Pendente — 11.2 |
| `data/catalogs/armas_lib.json` | biblioteca de armas | cartas de item versionadas | Pendente — 9.1, 11.2 |
| `data/catalogs/efeitos_default.json` | condições e efeitos padrão | definições de efeito | Pendente — 2.1, 11.2 |
| `data/catalogs/efeitos_externos.json` e `_lib.json` | efeitos externos | definições de efeito com procedência | Pendente — 2.1, 11.2 |
| `E1:` | efeito portátil comprimido | importador de compatibilidade e entidade atual | Pendente — 2.2, 11.4 |
| `EQ1:` | equipamento portátil comprimido | importador de compatibilidade e entidade atual | Pendente — 2.2, 11.4 |
| formatos experimentais E2/EQ2 | compatibilidade de leitura já existente | mantidos como entrada até decisão de retirada | Pendente explícita — 11.4 |
| `data/assets/effects-icons/` | ícones PNG de efeitos | armazenamento de ativos com hash | Pendente — 11.3 |
| retratos Base64 em payloads históricos | imagem embutida | armazenamento de objetos com metadados | Pendente — 11.3 |
| `storage/legacy-sheets/fichas/*.json` | exportações históricas de ficha | fixtures e entrada do migrador | Pendente — 1.2, 11.2 |

## Pendências de significado que não podem ser inferidas

| Campo ou fonte | Tratamento obrigatório |
| --- | --- |
| `custo` legado de habilidade ou magia | Preservar o valor original; não preencher `custo_aprendizado`, `potencia_uso`, `custo_uso` ou `custo_adicional` sem cálculo/revisão validado. |
| imagens Base64 inválidas | Registrar rejeição e procedência; não criar ativo corrupto. |
| payloads E1/EQ1 inválidos | Registrar pendência com erro de validação; não criar entidade parcial. |
| dados sem `table_id` | Exigir seleção ou associação explícita de mesa durante a migração; não atribuir mesa por inferência. |
