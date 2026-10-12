# Tasks

## 1. Regras e documentação

- [x] 1.1 Reescrever `rules/sistema/Exaustão e Estresse.md` com as trilhas, faixas, esforços, colapsos, Trauma, Ferimento Grave e Sequela especificados, e verificar por revisão textual que não restaram a matriz por patamar, a contagem de três pontos por contexto ou pontos de Exaustão Permanente como regras vigentes.
- [x] 1.2 Atualizar `rules/sistema/Descansos e Recuperação.md` e demais referências diretas nos documentos do sistema para separar recuperação das trilhas e tratamento de consequências persistentes, e verificar com `rg` que referências normativas conflitantes foram removidas sem redesenhar Descanso e Aprendizado.
- [x] 1.3 Incluir na documentação exemplos completos de último esforço, Colapso Físico com excedente, Colapso Mental com criação/intensificação de Trauma e recuperação sem cura automática, e verificar que cada exemplo pode ser resolvido sem consultar a aplicação.

## 2. Domínio mecânico e testes unitários

- [x] 2.1 Criar a camada de domínio de desgaste com limites, faixas e efeitos derivados únicos, e verificar com testes unitários todos os limites inferiores, transições de faixa, máximos e retornos após recuperação.
- [x] 2.2 Implementar a simulação e a aplicação transacional de ganhos, reduções e esforços voluntários, incluindo resolução da ação antes do colapso, e verificar com testes os casos em 8/9/10 de Estresse e 14/15 de Exaustão.
- [x] 2.3 Implementar Colapso Físico, excedente contextual, Colapso Mental e retorno a 8 de Estresse após auxílio ou fim do conflito, e verificar com testes que não existe morte, Trauma ou Ferimento Grave automático fora das origens previstas.
- [x] 2.4 Implementar criação, validação e intensificação de Trauma, Ferimento Grave e Sequela com identificadores e campos estruturados, e verificar com testes que Traumas equivalentes são intensificados em vez de duplicados.
- [x] 2.5 Implementar histórico transacional e desfazer seguro, e verificar com testes a restauração de valores, faixas e efeitos criados, além do bloqueio quando uma alteração posterior depende do evento.

> As seções 3 a 6 foram reescritas em 2026-09-27 para a plataforma nova (`cursed_platform`, `platform/api`, `platform/frontend`). As tarefas originais miravam o Streamlit, que as mudanças irmãs decidiram não alterar e que será aposentado. Ficaram fora por já estarem atendidas na plataforma: valores padrão e persistência das trilhas (ficha sem `desgaste` é lida como 0), normalização de fichas legadas (migração da plataforma), metadados opcionais em E1/EQ1 (`simplificar-ativacao-de-efeitos`), resumo visível das trilhas (faixa de estado ativo), deduplicação (faixas não entram na lista de efeitos) e histórico com desfazer seguro (auditoria e correção com detecção de conflito, estendidas aos novos comandos na tarefa 3.4).

## 3. Comandos de desgaste na plataforma

- [x] 3.1 Implementar a prévia e a confirmação de alteração de Exaustão ou Estresse pelo Narrador, com origem obrigatória, gravação na ficha e evento de auditoria; verificar com testes de API a mudança de faixa, o excedente físico que exige uma consequência contextual, o Colapso Mental que exige criar ou intensificar um Trauma e a recusa ao jogador.
- [x] 3.2 Implementar o Esforço físico e o Esforço mental pelo dono do personagem ou pelo Narrador, aplicados depois da ação, e verificar com testes de API a distribuição entre teste e Movimento, o bloqueio em 15 de Exaustão e a partir de 9 de Estresse, o último esforço até o colapso e a recusa a quem não controla o personagem.
- [x] 3.3 Implementar o encerramento do Colapso Mental pelo Narrador (Estresse volta a 8 sem remover o Trauma) e verificar com testes de API.
- [x] 3.4 Tornar `desgaste` e `consequencias` exclusivos dos comandos (o jogador não os altera pelo `PUT /ficha`) e tornar corrigíveis os eventos dos novos comandos; verificar com testes que a correção reverte trilha e Trauma juntos e é bloqueada quando houve alteração posterior.

## 4. Consequências persistentes e penalidades

- [x] 4.1 Implementar a leitura e os comandos do Narrador para criar, editar, intensificar, mitigar, iniciar tratamento, reativar, encerrar e remover Trauma, Ferimento Grave, Sequela, Aflição e Outra Consequência na ficha, com campos mínimos por categoria e justificativa obrigatória, e verificar com testes de API cada ação, a intensificação de Trauma equivalente e que reduzir as trilhas não encerra consequências.
- [x] 4.2 Fazer as penalidades numéricas das faixas entrarem nos valores derivados como fonte identificada (−1 em Defesas em Exausto), sem gravar efeitos, e verificar com testes que a fonte entra e sai com a faixa.

## 5. Interface da ficha na plataforma

- [x] 5.1 Adicionar à faixa de estado ativo o controle do Narrador para aumentar ou reduzir cada trilha com origem e prévia antes de confirmar, e verificar com testes de componente que uma alteração comum exige iniciar e confirmar e que mudança de faixa e colapso são anunciados em texto.
- [x] 5.2 Adicionar o Esforço físico e mental para quem controla o personagem, com distribuição dos pontos e aviso de colapso, e verificar com testes de componente os bloqueios e o último esforço.
- [x] 5.3 Adicionar o fluxo de Colapso Mental (manifestação e Trauma novo ou equivalente) e o encerramento do colapso, e verificar com testes de componente os caminhos de Trauma novo, Trauma equivalente e cancelamento antes de confirmar.
- [x] 5.4 Adicionar o painel de consequências persistentes com categoria, origem, gatilho, efeito atual, intensidade e tratamento, e as ações do Narrador com justificativa, e verificar com testes de componente os campos mínimos e as ações.

## 6. Verificação integrada

- [x] 6.1 Executar as suítes Python e do frontend, corrigir regressões e registrar os comandos usados e a quantidade de testes aprovados.
  - `python -m unittest discover -s cursed_platform/tests -t .`: 398 testes, OK (16 pulados), incluindo os 32 de `test_api_desgaste.py`.
  - `python -m cursed_platform.export_openapi --check` e `npm run check:client`: contrato e cliente atualizados.
  - `npm run typecheck`, `npm run lint -- --max-warnings 0` e `npm run build`: sem erros nem avisos.
  - `npm test`: 54 arquivos, 362 testes aprovados (inclui `WearControls.test.tsx` e `ConsequencesPanel.test.tsx`).
  - `npm run test:e2e`: 6 aprovados. Regressão corrigida: a semente das capturas criava a personagem pelo jogador já com `desgaste`, agora exclusivo do Narrador; o valor passou para a atualização feita pelo Narrador.
- [x] 6.2 Verificar no navegador, com a plataforma local, ficha sem desgaste registrado, todas as transições de faixa, os dois colapsos, esforço, consequência aplicada, correção pelo histórico e leitura pelo jogador.
  - Plataforma local com os dados das capturas. Verificados:
    - Narrador: Exaustão 9 → 8 (Exausto → Cansado) com prévia; 8 → 15 (Colapso Físico); excedente em 15 bloqueado até registrar a consequência física (Debilidade Extrema); Estresse 5 → 10 com manifestação e Trauma novo; fim do Colapso Mental (10 → 8, Trauma mantido); iniciar tratamento com justificativa obrigatória; Defesas com a fonte "Exausto (Exaustão) −1".
    - Jogador: sem controles do Narrador, painel de consequências só leitura, Esforço mental 5 → 7 (Pressionado → Abalado) com +2 no teste.
    - Ficha sem desgaste: 0/15 e 0/10, "não registrado", sem chave gravada.
    - Prévias de 0 ao máximo nas duas trilhas mostram as dez faixas nos limites certos.
  - Problemas encontrados e corrigidos:
    - A correção pelo histórico aceitava desfazer um evento antigo de desgaste mesmo com um evento posterior dependente (o excedente só existe em 15). Agora só o mais recente não desfeito é revertido direto; o anterior pede desfazer o posterior primeiro ou uma correção manual (teste `test_evento_com_dependente_posterior_nao_e_desfeito_direto`).
    - Depois de uma correção, o Registro usava a versão antiga do personagem e a segunda correção seguida falhava; a correção passou a atualizar personagens e ficha em cache.
    - Textos de auditoria sem concordância de gênero ("Debilidade Extrema criado"); a prévia do Colapso Físico repetia o texto da faixa.
  - A janela do navegador não redesenhava, então não houve captura de tela; a verificação usou o conteúdo da página e as ações reais dos diálogos.
- [x] 6.3 Fazer uma revisão cruzada entre documentação, especificações e textos da interface, e verificar que limites, nomes de faixas, penalidades e regras de colapso são idênticos nas três fontes.
  - Limites (0–15 e 0–10), nomes e intervalos das dez faixas conferidos por script entre `rules/sistema/Exaustão e Estresse.md`, a spec `desgaste-e-consequencias` e `cursed_platform/domain/desgaste.py`, que alimenta os textos da interface.
  - Colapso Físico e Colapso Mental estavam resumidos no domínio e, no caso do Colapso Mental, também na spec ("auxílio" sem "pertinente"). Ambos foram alinhados ao texto das regras.
  - Textos próprios da interface conferidos com as regras: excedente sem morte automática, retorno a 8 mantendo o Trauma, manifestações sugeridas, esforço uma vez por ação sem afetar dano, cura, Defesa ou CD, e as quatro situações de tratamento.

## 7. Validação de mesa

- [x] 7.1 Preparar um roteiro curto de validação de mesa cobrindo marcha até Colapso Físico, último esforço em combate, pressão social até Colapso Mental, Trauma recorrente, apoio de aliado e descanso posterior, e verificar que o roteiro registra decisões, consultas e tempo gasto em administração.
- [x] 7.2 Executar ao menos uma simulação de mesa com o roteiro, registrar problemas de clareza, agência, tensão, diversão e carga operacional, e verificar que cada problema observado recebe uma decisão de corrigir agora, acompanhar em teste futuro ou rejeitar com justificativa.
