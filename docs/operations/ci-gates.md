# Gates de CI da plataforma

Em 2026-09-26, o workflow `.github/workflows/platform-contract.yml` cobre compilação Python, migrações, segurança de recursos privados, suíte Python, contrato OpenAPI, cliente gerado, incompatibilidade do contrato, typecheck, lint, build, Vitest e Playwright. O job usa PostgreSQL 16 e instala Chromium.

## Ensaio local de falhas intencionais

Cada falha abaixo foi inserida temporariamente; o arquivo afetado foi restaurado imediatamente após o comando. Todos os comandos retornaram código diferente de zero e identificaram a falha correspondente:

| Gate | Falha provocada | Resultado |
| --- | --- | --- |
| Compilação Python | Sintaxe inválida em módulo temporário | Código 1 |
| Lint | Variável não utilizada em `src/` | Código 1 |
| Typecheck | String atribuída a `number` em `src/` | Código 2, TS2322 |
| Build | Mesmo erro de tipo impedindo a compilação de produção | Código 2, TS2322 |
| Vitest | Asserção falsa em teste temporário | Código 1 |
| Contrato OpenAPI | Alteração do JSON exportado | Código 1, contrato desatualizado |
| Cliente gerado | Alteração do TypeScript gerado | Código 1, cliente desatualizado |
| Migrações | Caso de falha temporário no módulo de migração | Código 1 |
| Segurança | Caso de falha temporário no módulo de recursos privados | Código 1 |
| Suíte Python | Caso de falha temporário descoberto por `unittest discover` | Código 1 |
| Playwright | Caso de falha temporário no arquivo de cenários | Código 1 |

Após a restauração, `check:client`, `probe:incompatible`, typecheck, lint, build, 208 testes Vitest, verificação OpenAPI e os módulos de migração e segurança passaram. A execução local desses módulos teve 10 testes PostgreSQL ignorados porque o serviço não estava ativo nesse momento; a execução anterior da suíte com PostgreSQL descartável passou com 146 testes. Playwright passou com 3 cenários. `probe:incompatible` é um ensaio positivo: remove temporariamente uma operação do contrato em memória e confirma que o cliente ficaria desatualizado.

## Execução integral local

Na retomada de 2026-09-26, a mesma sequência de comandos passou com PostgreSQL 16 em contêiner descartável: compilação Python, 3 testes de migração, 17 testes de segurança, 146 testes Python e contrato OpenAPI. O contêiner foi removido ao terminar. No frontend, passaram cliente gerado, sonda de incompatibilidade, typecheck, lint, build, 208 testes Vitest e 3 cenários Playwright. `npm ci --ignore-scripts` passou em diretório temporário criado somente com `package.json` e `package-lock.json`, confirmando a instalação reproduzível.

O `npm ci` diretamente no diretório de trabalho encontrou uma biblioteca nativa travada por servidores Vite já abertos e interrompeu a substituição de `node_modules`. As dependências locais foram restauradas com `npm install --no-save --ignore-scripts --package-lock=false`; os gates de frontend e Playwright passaram novamente depois da restauração. O ambiente do GitHub Actions começa sem esses servidores.

Os ensaios confirmam que os comandos locais detectam falhas e passam no estado atual.

## Execução no GitHub Actions

- Execução 36223237553 (commit `9b9a145`): falhou na suíte Python completa. `test_legacy_fixtures` importa o código do Streamlit, que não estava instalado no CI (localmente a `.venv` já o tinha). O gate detectou uma falha real.
- Correção: o workflow instala `cursed_platform/requirements.txt` e `.workspace/requirements.txt` juntos.
- Execução 36223323292: todas as etapas concluídas com sucesso em 2 min 54 s. Rodaram compilação, migrações, segurança, suíte Python com PostgreSQL, OpenAPI, cliente, sonda de incompatibilidade, typecheck, lint, build, Vitest e Playwright.

A tarefa 12.1 foi concluída com essa observação.
