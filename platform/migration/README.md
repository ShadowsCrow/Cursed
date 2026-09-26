# Ferramentas de migração

Este diretório contém as migrações de esquema Alembic da nova plataforma e
os conversores de dados legados. Nenhuma migração é executada ao iniciar a API.

Com `CURSED_PLATFORM_DATABASE_URL` apontando para um banco da nova plataforma:

```text
python -m alembic -c platform/migration/alembic.ini upgrade head
python -m alembic -c platform/migration/alembic.ini current
```

O downgrade `base` existe para ensaios em banco descartável. Ele remove as
tabelas da nova plataforma; não o execute em banco com dados reais.

## Acesso privado (`0007_acesso_privado`)

No PostgreSQL, as tabelas de domínio ficam com RLS ativo e sem privilégios para
`anon` e `authenticated`: clientes leem e alteram dados somente pela API. Em um
projeto Supabase, a migração também cria o bucket privado `cursed-privado` e
políticas em `storage.objects` e `realtime.messages` que aplicam as mesmas
associações de mesa de `cursed_platform/acesso_privado.py`:

| Recurso | Quem acessa |
|---|---|
| Tópico `mesa:{mesa}` e objetos `mesas/{mesa}/mesa/...` | participantes ativos |
| Tópico `mesa:{mesa}:narrador` e objetos `mesas/{mesa}/narrador/...` | Narrador da mesa |
| Tópico `mesa:{mesa}:personagem:{id}` e objetos `mesas/{mesa}/personagens/{id}/...` | quem pode ler a ficha |

Clientes não gravam no bucket privado; envios passarão pela API. Nomes fora
dessas convenções são negados. Alterar uma regra exige mudar Python e SQL
juntos; `test_acesso_privado` compara as duas implementações quando recebe um
PostgreSQL descartável:

```text
docker run -d --rm --name cursed-teste -e POSTGRES_PASSWORD=teste -p 127.0.0.1:55432:5432 postgres:16
CURSED_TEST_POSTGRES_URL=postgresql+psycopg://postgres:teste@127.0.0.1:55432/postgres \
  python -m unittest cursed_platform.tests.test_acesso_privado
```

O teste cria e remove seu próprio banco e simula o subconjunto dos esquemas
`auth`, `storage` e `realtime` usado pelas políticas.

## Tabelas legadas de fichas (`0014_procedencia_legada`)

O migrador lê `fichas`, `ficha_armas`, `ficha_armaduras`, `ficha_outros` e
`ficha_efeitos_externos` sem importar o Streamlit. A mesa deve existir no banco
novo e ser escolhida explicitamente. O identificador de origem deve permanecer
igual em todas as repetições para reconhecer registros já convertidos.

Defina `CURSED_LEGACY_DATABASE_URL` para a cópia do banco antigo e
`CURSED_PLATFORM_DATABASE_URL` para o banco novo. Primeiro execute a prévia,
que reverte a transação:

```text
python platform/migration/migrar_tabelas.py --origem-id copia-2026-09 --mesa-id ID_DA_MESA
```

Depois de revisar a prévia, repita com `--aplicar` para confirmar. A saída JSON
mostra contagens de registros convertidos e já existentes. Cada linha migrada
ganha procedência e hash em `legacy_migrations`; repetir a mesma entrada não
duplica dados. Se o conteúdo da origem mudou, o migrador interrompe a transação
e exige revisão, sem substituir alterações feitas na nova plataforma. As fichas
entram sem proprietário definido; a transferência posterior é explícita.

## JSONs históricos e catálogos (11.2)

Depois da migração das tabelas, use a mesma identidade de origem e mesa:

```text
python platform/migration/migrar_json.py --origem-id copia-2026-09 --mesa-id ID_DA_MESA
```

O comando usa `CURSED_PLATFORM_DATABASE_URL` e, se informada,
`CURSED_LEGACY_DATABASE_URL` para ler também `equipment_library` e
`effects_library`. `--fichas-dir` e `--catalogos-dir` permitem apontar para uma
cópia das fontes. A execução padrão é prévia transacional; `--aplicar` confirma
somente os destinos seguros. A saída JSON lista cada registro como `convertido`,
`existente`, `pendente` ou `rejeitado`, com motivo e destino quando existir.

Fichas históricas viram personagens sem proprietário atribuído, com inventário
e efeitos relacionais. Conteúdo válido dos catálogos vira rascunho de carta com
procedência e payload original, sem publicação automática. Custos legados
permanecem texto e revisão pendente. Classes, raças e tipos de dano não têm
entidade de destino aprovada; o relatório conserva essas entradas como
pendências e `aprovavel` permanece falso. Imagens embutidas e efeitos de item
que exigem conversão também ficam pendentes para 11.3. Nomes de ficha já
existentes na mesa exigem associação manual, evitando duplicata silenciosa.

## Imagens legadas (`0015_ativos_legados`)

Depois de migrar as tabelas e aplicar o Alembic até `head`, execute a prévia
das imagens com os mesmos IDs de origem e mesa:

```text
python platform/migration/migrar_ativos.py --origem-id copia-2026-09 --mesa-id ID_DA_MESA
```

O comando exige `CURSED_PLATFORM_DATABASE_URL`. Para um ensaio local, acrescente
`--diretorio-objetos CAMINHO`. Para o Storage real, configure
`CURSED_SUPABASE_URL` e `CURSED_SUPABASE_SERVICE_ROLE_KEY` no processo, sem
versionar essas credenciais. A prévia não grava objetos ou banco; lista imagens
encontradas e rejeições. Revise o resultado e repita com `--aplicar`.

O comando também examina `--catalogos-dir` e `--icons-dir` (por padrão, os
diretórios do repositório). Se `CURSED_LEGACY_DATABASE_URL` estiver definida,
inclui as bibliotecas SQL. A saída separa `personagens` e `catalogos`. No
catálogo atual há quatro referências para três objetos distintos. Artes de
catálogo ficam em `mesas/{mesa}/narrador/legado/`, sem exposição aos jogadores.
`legacy_catalog_assets` conserva hash, formato, tamanho e procedências.

Cada imagem válida passa por decodificação, verificação de formato e hash SHA-256.
O objeto fica no bucket privado, sob `mesas/{mesa}/personagens/{personagem}/legado/`.
O banco conserva tipo, tamanho, hash e campos de origem; o JSON passa a guardar
`imagem_ativo`. Imagens iguais no mesmo personagem compartilham objeto. Repetir
o comando verifica os objetos já registrados. Uma falha de banco depois do
envio pode deixar um objeto sem referência; a chave determinística permite
repetir o comando sem sobrescrever conteúdo divergente. Não remova o banco
legado antes do relatório de equivalência e do ensaio de rollback.

A API resolve `imagem_ativo` e artes de rascunhos pelo caminho privado após
autorizar o participante. Configure `CURSED_LOCAL_OBJECTS_DIR` no ensaio local
com o mesmo diretório usado por `--diretorio-objetos`; no Supabase, a API precisa
de `CURSED_SUPABASE_URL` e `CURSED_SUPABASE_SERVICE_ROLE_KEY` somente no servidor.
O frontend carrega a imagem por uma requisição separada, sem embuti-la na ficha
ou na carta. Uma arte migrada de catálogo permanece privada no rascunho. Ao
publicar, o Narrador confirma na interface a cópia para
`mesas/{mesa}/mesa/cartas/`; o servidor verifica hash e tamanho de origem e
destino. A versão publicada guarda o caminho compartilhado e a procedência da
promoção. A ausência dessa confirmação bloqueia a publicação com arte privada.

## Campos ambíguos (11.5)

Com a mesa já migrada, execute:

```text
python platform/migration/analisar_ambiguidades.py --origem-id copia-2026-09 --mesa-id ID_DA_MESA
```

O relatório JSON identifica o caminho e valor original de cada `custo` no
catálogo de classes e nas fichas migradas, além de armaduras com `defesa` sem
`armadura`. Não altera o banco. A função `preservar_custo_legado` guarda texto
em `custo_legado`; custos de aprendizado, treino, potência e uso ficam
indefinidos se não estavam explícitos na origem. Valores não textuais ou
conflitantes exigem revisão. O relatório de equivalência deve manter essas
pendências abertas até decisão sobre o significado de cada campo.

## Equivalência antes da aprovação (11.6)

Depois de aplicar as migrações, mantenha as mesmas URLs e execute:

```text
python platform/migration/verificar_equivalencia.py --origem-id copia-2026-09 --mesa-id ID_DA_MESA
```

O relatório compara contagens por tabela, hashes de procedência, campos
críticos de ficha, inventário e efeitos, além de amostras serializadas. Também
reavalia os JSONs e catálogos sem gravar. O comando sai com código `2` se
existir diferença, registro ainda não migrado, rejeição ou pendência. Enquanto
raças, tipos de dano, imagens e decisões de conteúdo estiverem pendentes,
`aprovavel` será `false`. O relatório não substitui o ensaio de rollback nem
a aprovação do corte.
