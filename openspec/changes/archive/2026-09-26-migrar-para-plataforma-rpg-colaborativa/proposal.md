# Proposal

## Why

A interface Streamlit atual consegue representar e persistir partes da ficha, mas não sustenta a experiência de uma mesa de RPG compartilhada: a ficha ainda se comporta majoritariamente como formulário, não existem identidades e permissões por mesa, o Narrador não acompanha alterações dos jogadores e não há uma sala persistente em tempo real. A nova plataforma deve tornar regras, consequências, equipamentos e evolução legíveis durante o jogo, preservando a autoridade do Narrador e a agência dos jogadores.

## What Changes

- **Núcleo:** introduzir contas, mesas persistentes, participação com papéis por mesa e autorização por recurso e ação.
- **Núcleo:** permitir que jogadores criem e administrem personagens próprios nas mesas conforme as permissões configuradas pelo Narrador.
- **Núcleo:** substituir a experiência de formulário por uma ficha primariamente visual, modular e orientada ao estado de jogo, com edição contextual, retrato, recursos, equipamentos, inventário, habilidades e efeitos ativos.
- **Núcleo:** registrar alterações semânticas realizadas por jogadores, Narradores e automações em uma linha do tempo auditável, sem transformar cada tecla ou autosave em um evento.
- **Núcleo:** introduzir um catálogo versionado de cartas para habilidades, magias e itens, com concessão direta, apresentação temporária e ofertas nas quais o Narrador define quantas opções cada jogador pode escolher.
- **Núcleo:** distinguir carta oferecida, opção disponível para aprendizado, criação em aprendizado e criação aprendida; selecionar uma magia ou habilidade não a aprende automaticamente, salvo concessão explícita do Narrador ou regra aplicável.
- **Ferramenta exclusiva do Narrador:** permitir controle de descansos, aplicação de efeitos, entidades ocultas e visibilidade seletiva de informações.
- **Módulo opcional:** introduzir uma sala compartilhada com presença e grid em tempo real, preservando no banco o estado confirmado e recuperando-o após reconexão.
- **Núcleo técnico:** expor a lógica de domínio Python por uma API autoritativa e adotar um frontend React/TypeScript, PostgreSQL, autenticação, armazenamento de arquivos e transporte realtime.
- **Núcleo técnico:** migrar incrementalmente os dados atuais de SQLite/JSON e manter os códigos portáteis de importação como compatibilidade secundária, não como fluxo principal dentro de uma mesa.
- **BREAKING:** após paridade funcional, validação da migração e período de convivência, o frontend Streamlit deixará de ser a entrada principal da aplicação.

## Non-goals

- Alterar as regras de mesa de descanso, carga, combate, condições, progressão ou criação de habilidades que ainda estão em revisão.
- Transformar o Cursed em um videogame de ação ou exigir sincronização de alta frequência.
- Implementar marketplace público, monetização, moderação de comunidade ou publicação pública de cartas nesta mudança.
- Implementar geração procedural de mapas, iluminação dinâmica avançada, voz, vídeo ou chat completo.
- Adotar event sourcing integral, CRDT ou infraestrutura Redis antes de existir uma necessidade comprovada.
- Tornar a aplicação obrigatória para jogar; esta mudança cria suporte digital, mas não resolve essa decisão de produto.

## Capabilities

### New Capabilities

- `acesso-e-mesas`: autenticação, criação de mesas, participação, papéis e permissões contextualizadas por mesa.
- `persistencia-de-mesa`: armazenamento e retomada do estado confirmado de mesas, sessões e recursos compartilhados.
- `gestao-de-personagens`: criação, acesso, edição e exclusão de personagens conforme propriedade e permissões do Narrador.
- `ficha-viva`: experiência visual e modular da ficha, incluindo recursos, efeitos, equipamentos, inventário, habilidades e edição contextual.
- `auditoria-de-alteracoes`: registro semântico, consulta e correção rastreável das alterações relevantes.
- `cartas-de-conteudo`: catálogo versionado e ciclos de oferta, seleção, concessão, aprendizado, posse e apresentação de habilidades, magias e itens.
- `ferramentas-do-narrador`: descansos, efeitos, fichas ocultas, monstros, NPCs e controle de visibilidade.
- `sala-e-grid-em-tempo-real`: presença, interação compartilhada, grid, reconexão e separação entre atualizações efêmeras e estado persistente.
- `migracao-da-plataforma`: convivência, conversão, validação e retirada controlada da aplicação Streamlit e dos formatos legados.

### Modified Capabilities

Nenhuma. O projeto ainda não possui especificações principais publicadas em `openspec/specs`.

## Impact

- Criação de um frontend React/TypeScript separado da interface Streamlit.
- Extração da lógica reutilizável de `app_streamlit/core` para um domínio Python independente de Streamlit e exposição por FastAPI.
- Evolução do modelo SQLAlchemy e adoção de migrações reproduzíveis para PostgreSQL, mantendo SQLite apenas onde a estratégia de desenvolvimento ou migração exigir.
- Introdução de autenticação, armazenamento de retratos e artes, autorização por mesa, canais realtime privados e políticas verificáveis.
- Conversão dos catálogos em `app_streamlit/data/catalogs`, das fichas persistidas e dos códigos `E1`/`EQ1` para entidades versionadas com procedência.
- Ampliação dos testes Python existentes e criação de testes de componentes, contratos de API, permissões, migração e jornadas ponta a ponta.
- Implantação gradual com Streamlit e a nova plataforma coexistindo até que dados e comportamentos críticos alcancem paridade validada.
