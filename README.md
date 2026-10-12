# Cursed

Aplicativo Streamlit para criar e gerenciar fichas de personagem do sistema Cursed RPG.

O projeto agora esta orientado a execucao web. Existem dois fluxos suportados:

- desenvolvimento local com Python
- execucao completa com Docker Compose e Postgres

## Rodar localmente com Python

1. Crie o ambiente virtual:
```powershell
py -3 -m venv .venv
```

2. Instale as dependencias:
```powershell
.venv\Scripts\python.exe -m pip install -r .workspace\requirements.txt
```

3. Rode o app:
```powershell
.workspace\scripts\run_local.bat
```

O app fica disponivel em `http://127.0.0.1:8501`.

Se `CURSED_DATABASE_URL` nao estiver definida, o app usa SQLite local automaticamente.

## Rodar com Docker Compose

1. Copie o arquivo de ambiente:
```powershell
Copy-Item .workspace\.env.example .workspace\.env
```

2. Suba os servicos:
```powershell
docker compose -f .workspace\docker-compose.yml --env-file .workspace\.env up --build
```

3. Acesse a aplicacao:
```text
http://localhost:8501
```

O `.workspace/docker-compose.yml` sobe dois servicos:

- `app`: container do Streamlit
- `db`: Postgres 16 como banco interno do projeto

Os dados do banco ficam persistidos no volume Docker `cursed_postgres_data`.

## Banco de dados

O app escolhe o banco nesta ordem:

1. `CURSED_DATABASE_URL`, se estiver definida
2. SQLite local, como fallback para desenvolvimento

Exemplo de URL Postgres usada no Compose:

```text
postgresql+psycopg://cursed:cursed@db:5432/cursed
```

## Arquivos principais

- `.workspace/Dockerfile`: imagem da aplicacao web
- `.workspace/docker-compose.yml`: stack local com app + Postgres
- `app_streamlit/.streamlit/config.toml`: configuracao do Streamlit para ambiente containerizado
- `.workspace/.env.example`: variaveis base de ambiente
- `.workspace/scripts/run_local.bat`: lançador local da aplicação
- `app_streamlit/app/ficha.py`: entrada da ficha de personagem
- `app_streamlit/app/forjador.py`: entrada do forjador de códigos
- `app_streamlit/app/sections/`: componentes da interface
- `app_streamlit/core/db.py`: inicialização do banco e migrações
- `app_streamlit/core/`: domínio, persistência, codecs e caminhos compartilhados
- `app_streamlit/data/catalogs/`: catálogos estruturados usados pela aplicação
- `rules/sistema/`: livro de regras destinado à mesa
- `app_streamlit/data/assets/`: imagens e demais ativos estáticos
- `app_streamlit/storage/legacy-sheets/`: fichas JSON históricas preservadas

## Atualizacao

No modelo web, a atualizacao acontece no servidor:

1. voce altera o codigo
2. gera nova imagem ou faz novo deploy
3. reinicia a aplicacao
4. os usuarios acessam a mesma URL e recebem a versao nova

Como o banco fica separado do container da aplicacao, os dados persistem entre deploys.
