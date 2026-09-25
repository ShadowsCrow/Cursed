# Plataforma colaborativa

Este diretório reserva a estrutura da aplicação que substituirá gradualmente a
entrada Streamlit. O código existente em `app_streamlit/` permanece a entrada
atual até os critérios de paridade e corte serem aprovados.

| Diretório | Responsabilidade |
| --- | --- |
| `cursed_platform/domain` | regras Python, modelos puros e codecs sem dependência de Streamlit |
| `api/cursed_api` | FastAPI, comandos autoritativos, autenticação e consultas |
| `migration` | leitura de fontes legadas, conversão, relatórios e rollback |
| `frontend` | React/TypeScript, design system e clientes gerados a partir de OpenAPI |
| `cursed_platform/tests` | validações compartilhadas de configuração e integração da plataforma |

As dependências entre camadas seguem `frontend -> api -> domain`; ferramentas
de `migration` podem depender do domínio, mas o domínio não pode depender de
API, frontend, banco ou Streamlit.

A configuração compartilhada fica em `cursed_platform/config.py`, fora deste
layout para não colidir com o módulo padrão `platform` do Python.

## Limite de compatibilidade

Durante a coexistência, `app_streamlit/` fica congelado: ele não recebe
alterações nem passa a importar a nova plataforma. A API nova deve depender de
`cursed_platform.domain`; a equivalência com o legado é verificada por suites
separadas de testes e pelas fixtures sanitizadas.

## API em desenvolvimento

Instale as dependências com `python -m pip install -r cursed_platform/requirements.txt`.
Configure as variáveis do exemplo em `.workspace/.env.example` e execute, na raiz
do repositório, `python -m uvicorn cursed_api.entrypoint:app --app-dir platform/api`.
O endpoint `/health` verifica que o processo responde; `/docs` e `/openapi.json`
publicam o contrato HTTP. A verificação de saúde ainda não testa a conexão com
o banco de dados.

Depois de aplicar a migração de esquema descrita em `migration/README.md`,
as rotas `/mesas` criam, listam e administram mesas e convites. As rotas de
personagens criam fichas próprias, leem e gravam `/ficha` e fazem exclusão
recuperável com `versao_esperada`. `GET/PUT /mesas/{mesa_id}/politicas` permite
consultar e configurar as permissões de criação, edição e exclusão, campos
bloqueados e campos sujeitos à aprovação (somente o Narrador configura).
Uma edição que exige aprovação retorna HTTP 202 sem alterar a ficha; o Narrador
consulta `/mesas/{mesa_id}/solicitacoes` e decide em
`POST /mesas/{mesa_id}/solicitacoes/{pedido_id}/decisao`. Aprovação de proposta
desatualizada retorna conflito, sem sobrescrever a versão atual.

As rotas exigem token de usuário do Supabase; a verificação da identidade usa
`CURSED_SUPABASE_URL` e `CURSED_SUPABASE_PUBLISHABLE_KEY`. A gravação verifica
mesa, participação, propriedade ou papel de Narrador, política de edição e
versão esperada. Auditoria e outros fluxos da ficha são etapas posteriores.
