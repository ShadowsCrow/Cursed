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

## 3. Estado, dados e migração

- [ ] 3.1 Adicionar os valores padrão de desgaste, efeitos aplicados e histórico ao estado da ficha em `utils/state.py`, e verificar que uma ficha nova inicia com Exaustão 0, Estresse 0 e listas vazias.
- [ ] 3.2 Estender `utils/persist_data.py` para salvar e carregar os novos campos de forma tolerante, e verificar por teste de ida e volta que valores, origens, tratamento e histórico são preservados.
- [ ] 3.3 Implementar normalização aditiva de fichas antigas, preservando `efeitos_externos` e campos desconhecidos reconhecíveis, e verificar carregando uma amostra legada sem trilhas nem efeitos estruturados.
- [ ] 3.4 Estender a normalização/codec de efeitos apenas onde necessário para metadados opcionais, mantendo efeitos legados de nome, descrição e imagem utilizáveis, e verificar importação e exibição dos formatos anterior e novo.

## 4. Agregação de efeitos

- [ ] 4.1 Integrar faixas de Exaustão e Estresse como efeitos derivados no agregador, e verificar que mudanças de faixa entram e saem automaticamente sem criar registros persistidos duplicados.
- [ ] 4.2 Integrar efeitos aplicados ao painel junto de efeitos externos e vinculados a equipamentos, identificando ciclo de vida e origem, e verificar que desequipar uma origem vinculada não remove consequências aplicadas anteriormente.
- [ ] 4.3 Implementar deduplicação estável por identificador e origem, e verificar com um cenário contendo simultaneamente efeito derivado, vinculado, externo legado e Trauma aplicado com nomes semelhantes.

## 5. Interface da ficha

- [ ] 5.1 Adicionar ao painel de estado os resumos de Exaustão e Estresse com valor/máximo, faixa, consequências e próximo limiar, e verificar visualmente que todas as informações permanecem compreensíveis sem depender de cor.
- [ ] 5.2 Adicionar controles rápidos de ganho e redução com origem e prévia transacional antes da confirmação, e verificar que uma alteração comum exige no máximo iniciar e confirmar, enquanto mudanças de faixa e colapsos são anunciados corretamente.
- [ ] 5.3 Adicionar o fluxo de Colapso Mental para escolher uma manifestação válida e criar ou intensificar o Trauma relacionado, e verificar os caminhos de novo Trauma, Trauma equivalente e cancelamento antes de confirmar.
- [ ] 5.4 Adicionar ao painel de efeitos as ações do mestre para criar, editar, intensificar, mitigar, encerrar e remover consequências aplicadas, e verificar que cada ação exige os campos mínimos e gera histórico com justificativa.
- [ ] 5.5 Adicionar consulta de histórico e ação de desfazer quando segura, e verificar visualmente a ordem dos eventos, suas origens e a mensagem explicativa quando o desfazer for bloqueado.

## 6. Verificação integrada

- [ ] 6.1 Executar a suíte de testes do domínio e persistência a partir do ambiente do projeto, corrigir regressões e registrar no resultado da implementação o comando usado e a quantidade de testes aprovados.
- [ ] 6.2 Iniciar a aplicação por `app_streamlit/app/ficha.py` e verificar manualmente ficha nova, ficha legada, salvamento/reabertura, todas as transições de faixa, ambos os colapsos, efeito de equipamento, efeito externo legado e consequência aplicada.
- [ ] 6.3 Fazer uma revisão cruzada entre documentação, especificações e textos da interface, e verificar que limites, nomes de faixas, penalidades e regras de colapso são idênticos nas três fontes.

## 7. Validação de mesa

- [x] 7.1 Preparar um roteiro curto de validação de mesa cobrindo marcha até Colapso Físico, último esforço em combate, pressão social até Colapso Mental, Trauma recorrente, apoio de aliado e descanso posterior, e verificar que o roteiro registra decisões, consultas e tempo gasto em administração.
- [x] 7.2 Executar ao menos uma simulação de mesa com o roteiro, registrar problemas de clareza, agência, tensão, diversão e carga operacional, e verificar que cada problema observado recebe uma decisão de corrigir agora, acompanhar em teste futuro ou rejeitar com justificativa.
