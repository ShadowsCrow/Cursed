# Passagem de trabalho — calcular-valores-da-ficha

Estado em 2026-09-27. Progresso no `tasks.md`: **38/40**. Commitado e enviado em `feature/retrato-refinamento` (commits `a69bce2` e seguinte), junto com `carga-por-espacos`; CI verde na execução 36305495934.

## Pendências (dependem de ação externa)

- **3.2 e 9.1:** concluídas; CI verde em 2026-09-27. O primeiro push falhou porque o hash de procedência dos catálogos dependia do fim de linha (CRLF no Windows, LF no CI); agora `catalogos.hash_de_texto` ignora essa diferença.
- **9.3:** aplicar a `0017` no projeto Supabase de testes e conferir RLS e `REVOKE` em `effect_icons`. Precisa de autorização do usuário.
- **10.2:** sessão de mesa com o roteiro `docs/validation/roteiro-mesa-ficha-completa.md`.

## Decisões de 2026-09-27 (refletidas em proposal, design e specs)

- Classes, raças, efeitos default e listas da ficha ficam **parametrizáveis por JSON** em `cursed_platform/catalogos/`, a fonte de trabalho. A alteração vale sem reiniciar; JSON inválido mantém a última versão válida e o erro aparece ao Narrador. O JSON **prevalece** sobre as cartas de habilidade materializadas. Não há editor de catálogo no sistema.
- Limites e catálogo **só recusam fichas do tipo personagem**; NPC e monstro recebem só avisos.
- Rotas de catálogo em `/mesas/{m}/catalogos/...`.

## Onde está cada parte

- **Catálogo:** `cursed_platform/catalogos.py` (+ `catalogos/*.json`, `manifesto.json`); relatório de procedência: `python -m cursed_platform.catalogos`.
- **Domínio:** `domain/recursos.py`, `domain/validacao_ficha.py`, `policies.py` (campos exclusivos do Narrador, `tamanho_raca`, marca `nivel_pela_migracao`), `domain/descanso.py` com Escalas calculadas.
- **Cartas de catálogo:** `cartas_catalogo.py`; sincronização em `platform/api/cursed_api/sincronizacao.py`, que roda ao subir e a cada 5 s quando o JSON muda.
- **Efeitos:** substituição em `narrador.aplicar_efeito_substituindo`; `Acao.APLICAR_EFEITO_PADRAO_PROPRIO`; ícones em `icones_efeitos.py`.
- **Imagens:** `cursed_platform/imagens.py` e `platform/api/cursed_api/images.py`. A arte e o ícone de carta ficam em `narrador/cartas/` até a publicação, que os copia para a mesa.
- **Migração:** `0017_ficha_completa`, `completar_fichas.py` (domínio e comando). As classes e raças do migrador de JSON agora são cobertas pelo catálogo. Ensaio: `docs/migration/ensaio-2026-09-27.md`.
- **Interface:** `IdentityPanel`, `PersonalityPanel`, `SelectField`, `ResourcesStatus`, `EffectImage`, `ImageUpload`, `EffectIconsPanel` e `CatalogStatusNotice`.
- **Registros:** `docs/validation/escopo-calcular-valores-da-ficha.md` (1.2) e `passada-visual-ficha-completa.md` (9.2, com três itens a acompanhar).

## Cuidados

- Após mudar a API: `.venv/Scripts/python.exe -m cursed_platform.export_openapi` e, em `platform/frontend`, `npm run generate:client`.
- PostgreSQL de teste: contêiner `cursed-test-pg-grade` (porta 55432), `CURSED_TEST_POSTGRES_URL=postgresql+psycopg://postgres:teste@127.0.0.1:55432/postgres`.
- O seed E2E (`e2e/screenshots.mjs`) cria personagens com classe e raça do catálogo; o nível é definido pelo Narrador.
- Heredocs longos com aspas quebram no Bash deste ambiente: use um script em arquivo.
