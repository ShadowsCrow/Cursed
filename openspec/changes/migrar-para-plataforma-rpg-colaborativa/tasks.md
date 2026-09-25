# Tasks

## 1. Baseline e estrutura da migração

- [x] 1.1 Inventariar jornadas, campos, tabelas, catálogos, códigos E1/EQ1 e ativos legados em um manifesto versionado e verificar que cada fonte atual possui destino ou pendência explícita
- [x] 1.2 Criar fixtures sanitizadas de fichas simples e complexas, efeitos, equipamentos e habilidades legadas e verificar que os testes atuais conseguem carregá-las
- [x] 1.3 Registrar critérios mensuráveis de paridade para criação, carregamento, edição, equipamento, efeitos, importação e persistência e verificar que cada jornada possui responsável e teste planejado
- [x] 1.4 Definir a estrutura de aplicações e pacotes para frontend, API, domínio e ferramentas de migração e verificar que os ambientes atuais continuam inicializando sem mudança de comportamento
- [x] 1.5 Adicionar decisões arquiteturais executáveis e variáveis de ambiente de desenvolvimento, sem segredos reais, e verificar validação automatizada da configuração

## 2. Extração do domínio Python e contratos

- [x] 2.1 Extrair efeitos e desgaste para um pacote de domínio sem imports de Streamlit e verificar todos os testes Python existentes
- [x] 2.2 Extrair codecs e validação de equipamentos para o pacote de domínio, mantendo adaptadores legados, e verificar round-trips E1/EQ1 e casos inválidos
- [x] 2.3 Separar estado de ficha das chaves de `st.session_state` por modelos e serviços explícitos e verificar equivalência com as fixtures de ficha
- [x] 2.4 Definir modelos Pydantic para ficha, efeito, equipamento, carta, mesa e comandos iniciais e verificar geração válida de JSON Schema
- [x] 2.5 Criar a aplicação FastAPI com endpoints de saúde e documentação OpenAPI e verificar inicialização e resposta em teste de integração
- [x] 2.6 Expor leitura e gravação inicial de ficha pela API autoritativa e verificar que o payload convertido preserva todos os campos críticos da fixture complexa
- [x] 2.7 Gerar cliente TypeScript a partir do OpenAPI e verificar no CI que uma mudança incompatível no contrato torna o cliente desatualizado

## 3. Persistência e modelo multi-mesa

- [x] 3.1 Introduzir Alembic e uma migração-base reproduzível para PostgreSQL e verificar aplicação do zero e downgrade em banco descartável
- [x] 3.2 Modelar mesas, membros, sessões, personagens, propriedade, políticas e versões concorrentes e verificar restrições de integridade no banco
- [x] 3.3 Modelar equipamentos, inventário, efeitos e vínculos de origem que participam de regras e verificar consultas por personagem e mesa
- [x] 3.4 Implementar repositórios independentes de Streamlit e verificar os mesmos testes de persistência contra PostgreSQL e o ambiente local suportado
- [x] 3.5 Implementar controle otimista de concorrência e verificar que uma atualização desatualizada não substitui a versão confirmada
- [x] 3.6 Implementar exclusão recuperável e retenção configurável de personagens e verificar exclusão, ocultação normal e restauração
- [x] 3.7 Implementar configuração de módulos por mesa e verificar que ativar o grid em uma mesa não altera outra

## 4. Identidade, mesas e autorização

- [x] 4.1 Integrar autenticação e validação de token no frontend e FastAPI e verificar acesso autenticado e rejeição de token ausente, expirado ou inválido
- [x] 4.2 Implementar criação de mesa, convite/entrada, listagem de participantes e remoção e verificar a jornada completa do Narrador e jogador
- [x] 4.3 Implementar papéis contextualizados por mesa e verificar que o mesmo usuário pode ser Narrador em uma mesa e jogador em outra
- [x] 4.4 Implementar serviço central de autorização por ação, propriedade, política e visibilidade com negação por padrão e verificar matriz de allow/deny
- [x] 4.5 Implementar políticas para criar, editar e excluir personagens próprios, inclusive campos bloqueados ou sujeitos a aprovação, e verificar cada combinação configurável
- [x] 4.6 Proteger arquivos e tópicos privados com as mesmas associações de mesa e verificar que um usuário externo não consegue enumerar nem receber recursos

## 5. Fundação do frontend e design system

- [x] 5.1 Criar aplicação React/TypeScript com Vite, rotas tipadas, cache remoto e tratamento global de erro e verificar build, lint e teste inicial
- [x] 5.2 Criar shells distintos para Narrador e jogador com navegação responsiva e verificar acesso por papel em desktop e viewport móvel
- [x] 5.3 Definir tokens visuais do Cursed para cor, tipografia, superfície, espaçamento, elevação, movimento e estados e verificar uma página de referência dos tokens
- [x] 5.4 Implementar primitivas acessíveis de diálogo, painel lateral, popover, tooltip, menu e confirmação e verificar teclado, foco, toque e leitor de tela automatizado
- [x] 5.5 Criar componentes de retrato, barras de recurso, ícone de efeito, slot de equipamento e carta base e verificar seus estados em catálogo visual isolado
- [x] 5.6 Implementar estado de conectividade e distinção entre prévia local e confirmação remota e verificar falha de comando simulada

## 6. Gestão de personagens e ficha viva

- [x] 6.1 Implementar lista, criação, abertura, transferência e exclusão recuperável de personagens e verificar permissões de jogador e Narrador ponta a ponta
- [x] 6.2 Implementar cabeçalho visual da ficha com retrato, identidade, PV, PP e recursos relevantes e verificar carregamento com dados completos e ausentes
- [x] 6.3 Implementar navegação modular para informações básicas, personalidade, atributos, perícias, habilidades, equipamentos, inventário, status e efeitos e verificar preservação do contexto ao alternar seções
- [x] 6.4 Implementar modo de leitura como padrão e edição contextual autorizada e verificar que usuários sem permissão não recebem controles nem conseguem enviar o comando correspondente
- [x] 6.5 Implementar efeitos ativos como ícones com detalhes por hover, foco, clique e toque e verificar acessibilidade e conteúdo completo
- [x] 6.6 Implementar inventário e equipamento como estados visuais distintos, incluindo equipar e desequipar, e verificar atualização dos efeitos e valores derivados
- [x] 6.7 Implementar explicação das fontes de valores derivados e verificar um caso com contribuição simultânea de atributo, equipamento e efeito
- [x] 6.8 Implementar importação de efeito, equipamento e conteúdo portátil em diálogo com pré-visualização e verificar sucesso, cancelamento e erro sem mutação parcial
- [x] 6.9 Validar a ficha nova contra as jornadas de paridade e registrar divergências restantes sem alterar o livro de regras

## 7. Auditoria de alterações

- [x] 7.1 Modelar eventos semânticos append-only com ator, alvo, mesa, sessão, categoria, origem, correlação, resumo e visibilidade e verificar integridade e índices de consulta
- [x] 7.2 Integrar auditoria transacional aos comandos de personagem, inventário, efeito e permissão e verificar que falhas não deixam evento sem alteração nem alteração sem evento
- [x] 7.3 Consolidar edições intermediárias em uma única ação confirmada e verificar que digitação, foco e prévias não poluem o log
- [x] 7.4 Criar timeline do Narrador com filtros por sessão, ator, personagem, categoria e relevância e verificar combinações de filtros
- [x] 7.5 Implementar correção/restauração como novo comando vinculado ao evento anterior e verificar preservação de ambos os registros
- [x] 7.6 Sanitizar eventos conforme visibilidade e verificar que jogadores não descobrem NPCs, cartas ou detalhes ocultos por API, realtime ou interface

## 8. Ferramentas do Narrador

- [x] 8.1 Implementar criação e administração de personagens, NPCs e monstros ocultos e verificar ausência total desses recursos para jogadores não autorizados
- [x] 8.2 Implementar visibilidade granular de entidade e verificar revelação somente de nome público e imagem sem atributos ou anotações privadas
- [x] 8.3 Implementar comando de aplicação, ajuste, suspensão e encerramento de efeitos e verificar origem, duração, recálculo e auditoria
- [x] 8.4 Implementar preparação de descanso com seleção de alvos, parâmetros e pré-visualização e verificar que cancelar não modifica dados
- [x] 8.5 Implementar confirmação transacional de descanso usando as regras de domínio vigentes e verificar resultados por personagem e evento de auditoria
- [ ] 8.6 Realizar validação de mesa dos fluxos de efeito e descanso com Narrador e jogadores e registrar resultados sem consolidar mudanças de regra não aprovadas

## 9. Catálogo e sistema de cartas

- [ ] 9.1 Modelar definições, versões imutáveis, ativos, tags e procedência de cartas e verificar publicação e criação de nova versão
- [ ] 9.2 Modelar campos específicos de habilidade, magia e item, preservando custos separados, e verificar que `custo` legado não preenche campos especializados por inferência
- [ ] 9.3 Implementar editor e pré-visualização de cartas para o Narrador e verificar rascunho, validação e publicação
- [ ] 9.4 Implementar concessão direta com destino por tipo e exceção explícita de aprendizado e verificar posse e auditoria
- [ ] 9.5 Implementar ofertas independentes por destinatário com candidatos, limite de escolhas e validade e verificar limites mínimos/máximos e concorrência
- [ ] 9.6 Implementar seleção de habilidade ou magia como disponibilidade para aprendizado e verificar que ela não aparece como aprendida sem completar o fluxo ou receber exceção
- [ ] 9.7 Implementar ciclos de aprendizado, item/inventário, efeito e apresentação temporária separadamente e verificar suas transições permitidas e rejeitadas
- [ ] 9.8 Criar interface animada e acessível de oferta, escolha e apresentação de cartas e verificar teclado, toque, movimento reduzido e confirmação
- [ ] 9.9 Implementar migração explícita de instâncias para nova versão de carta e verificar prévia de diferenças, autorização e histórico
- [ ] 9.10 Realizar validação de mesa do fluxo de oferta e escolha e registrar clareza, ritmo, carga cognitiva e impacto sobre a percepção de evolução

## 10. Sala e grid em tempo real

- [ ] 10.1 Configurar canais privados e presença por mesa e verificar entrada autorizada, revogação de participação e expiração de presença
- [ ] 10.2 Modelar cenas, mapas, tokens, camadas, controle e versões e verificar integridade e filtros de visibilidade
- [ ] 10.3 Implementar comandos autoritativos para criar, posicionar, mover e remover tokens e verificar rejeição de ações sem controle
- [ ] 10.4 Implementar canvas PixiJS com pan, zoom, grid e tokens e verificar interação e desempenho com uma cena representativa
- [ ] 10.5 Transmitir cursor, ping e prévia de arraste como eventos efêmeros e verificar que cancelamento ou perda desses eventos não altera o banco
- [ ] 10.6 Emitir atualizações persistentes após commit e verificar que dois clientes convergem para a mesma versão confirmada
- [ ] 10.7 Implementar snapshot autorizado na entrada e reconexão e verificar recuperação após alterações ocorridas durante desconexão
- [ ] 10.8 Implementar camadas e tokens ocultos do Narrador e verificar ausência de payload secreto nos clientes dos jogadores
- [ ] 10.9 Testar falha de rede durante movimento e verificar aviso, restauração visual e inexistência de estado falso confirmado

## 11. Migração de dados e ativos

- [ ] 11.1 Implementar migrador idempotente das tabelas atuais de fichas, equipamentos e efeitos e verificar repetição sem duplicação
- [ ] 11.2 Implementar migrador dos JSONs históricos e catálogos e verificar relatório de registros convertidos, rejeitados e pendentes
- [ ] 11.3 Extrair imagens Base64 para armazenamento de objetos com hash e metadados e verificar integridade e deduplicação
- [ ] 11.4 Converter códigos E1/EQ1 para entidades versionadas preservando importação de compatibilidade e verificar fixtures válidas e inválidas
- [ ] 11.5 Sinalizar campos ambíguos, especialmente custos de habilidades e magias, e verificar que nenhum valor mecânico é inventado
- [ ] 11.6 Criar relatório de equivalência com contagens, campos críticos e amostras serializadas e verificar que divergências bloqueiam aprovação da migração
- [ ] 11.7 Executar ensaio de migração sobre uma cópia dos dados e documentar duração, divergências, correções e procedimento de rollback

## 12. Verificação, implantação e corte

- [ ] 12.1 Integrar lint, typecheck, testes Python, frontend, contratos, migrações e segurança no CI e verificar falha intencional de cada gate
- [ ] 12.2 Criar testes Playwright com contextos separados de Narrador e jogador para mesa, ficha, auditoria, cartas, segredos e reconexão e verificar execução repetível
- [ ] 12.3 Executar revisão de acessibilidade da ficha, cartas, modais e grid e verificar ausência de bloqueadores para teclado, toque e leitores de tela
- [ ] 12.4 Executar teste de autorização negativo cobrindo recursos de outra mesa, personagens alheios, arquivos e canais privados e verificar negação sem vazamento de metadados
- [ ] 12.5 Instrumentar erros, latência de comandos, conflitos, falhas realtime e resultados de migração e verificar dashboards ou consultas operacionais mínimas
- [ ] 12.6 Implantar a nova plataforma para uma mesa piloto por feature flag e verificar jornadas críticas sem desativar o Streamlit
- [ ] 12.7 Realizar sessão piloto e registrar feedback sobre ficha, efeitos, equipamentos, log, cartas, ritmo narrativo e carga do Narrador
- [ ] 12.8 Corrigir bloqueadores encontrados e repetir critérios de paridade, migração e segurança até aprovação registrada
- [ ] 12.9 Ensaiar congelamento de escrita, migração incremental final e rollback e verificar tempos e integridade em ambiente equivalente ao produtivo
- [ ] 12.10 Executar corte controlado por mesa somente após aprovação, preservar backup verificado e confirmar que o Streamlit permanece recuperável durante a janela definida
- [ ] 12.11 Retirar o Streamlit como entrada principal após o período de observação e verificar que documentação, scripts e implantação apontam para a nova plataforma
