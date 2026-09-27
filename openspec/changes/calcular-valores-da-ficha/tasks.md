# Tasks

## 1. Decisões e regras

- [x] 1.1 Confirmar com o usuário as "Decisões provisórias" de `design.md`, atualizar proposal, specs e design com as respostas e verificar que `openspec validate calcular-valores-da-ficha` passa
- [x] 1.2 Conferir que nenhuma alteração atribuída a esta mudança toca `rules/sistema` ou implementa cálculo de carga e que o Sobrepeso legado permanece suspenso, verificando o diff dos arquivos atribuídos a esta mudança (em commit, patch ou worktree isolado), sem usar o diff global do checkout compartilhado como prova

## 2. Catálogos do sistema (dados)

- [x] 2.1 Copiar `classes.json`, `racas.json` e `efeitos_default.json` para `cursed_platform/catalogos/` (fonte de trabalho a partir daqui) com `manifesto.json` (origem, SHA-256 da origem na cópia, data), criar `listas_ficha.json` (sexo, alinhamento, pecado com ícone e `Ganancia` equivalente) e manter o Sobrepeso legado suspenso com motivo de substituição pela Sobrecarga derivada; verificar por teste o formato do manifesto e dos arquivos, e que o relatório de procedência aponta divergência com a origem sem falhar
- [x] 2.2 Implementar `cursed_platform/catalogos.py` (carga, validação, índices e recarga pela data de modificação, mantendo a última versão válida e guardando o erro), convertendo as bases `"N + atributo"` em inteiro e atributo com erro para formato inesperado, e verificar por teste que o Mago tem bases 12/2/8/5, que as 36 bases das 9 classes são convertidas, que um arquivo alterado vale sem reiniciar e que um arquivo inválido mantém a versão anterior com o erro registrado
- [x] 2.3 Fazer `domain/efeitos.py` ler o catálogo da plataforma em vez de `app_streamlit/` e verificar que a suíte de efeitos existente continua passando
- [x] 2.4 Adicionar os ícones do sistema: `padrao.webp` e `cc_above.webp` em `platform/frontend/public/icones/efeitos/`, com o PNG original do ícone padrão preservado em `docs/ativos/`, e verificar que o build do frontend inclui os dois arquivos

## 3. Banco de dados

- [x] 3.1 Criar a migração Alembic `0017_ficha_completa` (a 0016 ficou com `carga-por-espacos`) (`card_definitions.origem_sistema` com índice único por mesa, `character_cards.concedida_por`, tabela `effect_icons` com RLS e REVOKE no PostgreSQL) e verificar upgrade e downgrade em SQLite e no PostgreSQL descartável, incluindo o teste de políticas privadas
- [x] 3.2 Declarar `python-multipart` em `cursed_platform/requirements.txt` e verificar que `pip install -r` num ambiente limpo e o CI passam

## 4. Domínio: cálculo e validação

- [x] 4.1 Implementar `domain/recursos.py` (PV/PP iniciais, Escalas, máximos, fontes, ajustes do Narrador e estado não calculável com motivo) e verificar por testes os cenários da spec `calculo-de-valores-da-ficha`: Mago nível 1 e 5, efeito temporário ignorado, classe fora do catálogo e ajuste somado às fontes
- [x] 4.2 Implementar `domain/validacao_ficha.py` (limites de atributo 1–5 e perícia 0–5, nível 1–20, idade ≥ 0, listas de sexo, alinhamento e pecado com `Ganancia` equivalente, catálogo, arquétipo da classe e ajustes com origem), validando só campos alterados e produzindo avisos para os irregulares não alterados, e verificar por testes cada cenário das specs de limites e identidade
- [x] 4.3 Aplicar a validação em todos os caminhos de gravação (`gravar_ficha`, decisão de pedido, `aplicar_importacao`, migradores) com resposta `422` por campo, e verificar por testes de API que um pedido aprovado com Destreza 9 é recusado e continua pendente
- [x] 4.4 Tornar `personagem.nivel`, a exceção `personagem.tamanho` e `recursos.ajustes` exclusivos do Narrador antes da política da mesa; na troca de raça com Tamanho explícito, exigir limpar ou reconfirmar a exceção, e verificar por testes de API a recusa ao jogador e à troca silenciosa
- [x] 4.5 Na gravação, limitar o atual ao novo máximo e iniciar o atual igual ao máximo em personagem novo, registrando no mesmo evento de auditoria, e verificar pelos cenários "Subida de nível com PV gasto" e "Máximo diminui abaixo do atual"
- [x] 4.6 Fazer `domain/descanso.py` usar as Escalas calculadas e informar recurso não calculável, e verificar que os testes de descanso passam com Escala vinda da classe

## 5. Domínio: cartas de classe e efeitos default

- [x] 5.1 Implementar a materialização idempotente das cartas de habilidade de classe, arquétipo e raça por mesa (sem placeholders, custos vazios, tags de origem, `origem_sistema` pela chave do nome da habilidade) e verificar por teste que repetir a materialização não duplica cartas e que nenhuma carta de raça é criada hoje
- [x] 5.2 Implementar a concessão com `excecao_aprendizado` e a remoção por `concedida_por` na troca de classe, arquétipo ou raça, com auditoria, e verificar por teste que cartas de oferta não são removidas
- [x] 5.3 Implementar a substituição de condições (Cego encerra Ofuscado) na mesma transação com dois eventos de auditoria e verificar por teste
- [x] 5.4 Adicionar `Acao.APLICAR_EFEITO_PADRAO_PROPRIO` (dono, edição permitida, somente efeito default) para aplicar e encerrar, e verificar por testes de autorização os quatro cenários da spec `efeitos-default-na-mesa`
- [x] 5.5 Implementar a resolução de ícone (mesa → catálogo → padrão) e verificar por teste que remover o ícone da mesa volta ao do catálogo ou ao padrão, e que outra mesa não é afetada
- [x] 5.6 Implementar a sincronização das cartas de catálogo com o JSON na recarga e na subida do servidor (JSON prevalece: nova versão mesmo com edição do Narrador, posses `concedida_por` movidas para a nova versão, habilidade nova concedida, removida arquivada e retirada, auditoria com autor "sistema") e verificar por teste os cenários "Texto de habilidade corrigido no JSON", "Edição do Narrador substituída" e "Conferência repetida", e que cartas de oferta não são tocadas

## 6. API e contrato

- [x] 6.1 Expor `GET /mesas/{m}/catalogos/classes`, `/catalogos/racas`, `/catalogos/listas-ficha`, `/catalogos/efeitos-default` (sem suspensos) e `/catalogos/estado` (versão carregada e último erro, só Narrador), e verificar por teste de API que o Sobrepeso não aparece, que não participantes não acessam e que o erro de recarga aparece ao Narrador
- [x] 6.2 Estender `GET /valores-derivados` com o grupo `recurso` (`calculavel`, `motivo`, fontes `classe`, `nivel` e `ajuste_narrador`), `GET /ficha` com `avisos`, e criar o comando de ajuste de PV/PP do Narrador, verificando por testes de API
- [x] 6.3 Implementar `PUT`/`DELETE /mesas/{m}/imagens/{destino}` para retrato, arte de item, ícone de grade de item ou carta de item, efeito, arte de carta, mapa e ícone de efeito (autorização por destino e alvo, limites respectivos 5/5/5/5/8/15/5 MB, referências independentes para arte e ícone de grade, caminho por visibilidade, versão de exibição WEBP, auditoria sem conteúdo) e verificar por testes os cenários da spec `envio-de-imagens`, incluindo troca isolada do ícone, extensão falsa, arquivo grande e retrato de personagem oculto
- [x] 6.4 Adicionar `icone` a `EfeitoResumo`, exportar o OpenAPI e regenerar o cliente, verificando `npm run check:client` e a comparação `export_openapi --check`

## 7. Interface

- [x] 7.1 Trocar "Pontos de Poder" por "Pontos de Propósito" em toda a interface e nos testes e verificar com busca no código que o termo antigo não aparece mais em `platform/frontend/src`
- [x] 7.2 Aba Informações: selects de classe, arquétipo filtrado e raça; idade, sexo e nível (só Narrador); Tamanho base com origem racial e exceção atual do Narrador, com limpeza ou reconfirmação na troca de raça; conceito do arquétipo; cor da classe com o nome escrito; aviso e ação "vincular" para valores fora do catálogo. Verificar por testes de componente e axe
- [x] 7.3 Aba Personalidade: selects de alinhamento e pecado com ícone e os nove campos de texto com as dicas da ficha original, verificando por teste que uma ficha migrada mostra os valores antigos
- [x] 7.4 Atributos e perícias: mínimo e máximo nos campos, erro junto ao campo e salvar desabilitado com valor inválido, verificando por teste o cenário "Jogador digita valor inválido"
- [x] 7.5 Cabeçalho e recursos: PV/PP com detalhe das fontes, estado não calculável com motivo, aviso de nível definido pela migração e diálogo de ajuste do Narrador com origem e justificativa, verificando por testes de componente
- [x] 7.6 Cartas de classe: exibir na ficha as cartas concedidas com a origem e pedir confirmação na troca de classe listando cartas que saem e entram, avisar no editor de uma carta de catálogo que o JSON prevalece e mostrar ao Narrador o erro de recarga do catálogo, verificando por teste
- [x] 7.7 Efeitos: lista agrupada de efeitos default com prévia e aviso de substituição, sem campo de código; ação para o jogador no próprio personagem quando permitido; ícones estáveis com nome acessível no lugar dos símbolos por posição, verificando por testes e axe
- [x] 7.8 Componente de envio de imagem reutilizado em retrato, item, efeito, editor de cartas, cena da sala e ícones de efeito, com mensagem de recusa legível, verificando por testes de componente e por um cenário Playwright de troca de retrato

## 8. Migração de dados

- [x] 8.1 Implementar `platform/migration/completar_fichas.py` (prévia padrão e `--aplicar`, por mesa): nível 1 onde faltar, PV/PP atuais iguais aos máximos, vínculo de classe, arquétipo e raça por nome normalizado, Tamanho explícito coincidente com a raça limpo e divergente sinalizado para confirmação, sinalização dos que não vinculam, materialização e concessão das cartas de classe. Verificar por teste que a repetição não duplica nada nem escolhe o motivo de uma divergência de Tamanho
- [x] 8.2 Resolver as pendências de classes e raças de `migracao_json` usando o catálogo e reexecutar o relatório de equivalência, verificando que ele deixa de bloquear por essas pendências
- [x] 8.3 Ensaiar a migração com cópia dos dados locais em PostgreSQL descartável, registrar contagens e tempo em `docs/migration/` e verificar o rollback

## 9. Verificação

- [x] 9.1 Rodar a suíte Python, os testes do frontend, lint, typecheck, build, `check:client` e Playwright, e verificar a execução verde no GitHub Actions
- [x] 9.2 Fazer uma passada visual com capturas (`npm run capturas`) em desktop e celular das abas Informações, Personalidade, Atributos, Efeitos e do envio de imagem, e registrar problemas encontrados
- [x] 9.3 Aplicar a `0017` no projeto Supabase de testes e verificar RLS e ausência de exposição das tabelas novas

## 10. Validação de mesa

- [x] 10.1 Preparar um roteiro curto em `docs/validation/` cobrindo criação de personagem com classe e cálculo de PV/PP, subida de nível, condição aplicada pelo jogador, troca de arquétipo e envio de retrato e ícone
- [ ] 10.2 Realizar a validação de mesa com Narrador e jogadores e registrar clareza, ritmo, carga cognitiva e confiança nos números, com cada problema recebendo a decisão de corrigir agora, acompanhar ou rejeitar
