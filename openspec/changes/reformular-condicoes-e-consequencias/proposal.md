# Proposal

> Esta proposta foi corrigida durante a implementação pela mudança `simplificar-ativacao-de-efeitos`. As decisões de aplicações separadas de condição e E2/EQ2 como caminho principal abaixo são histórico; as especificações e regras atuais seguem a ativação direta do efeito.

## Why

A lista atual reúne sob “Condições” fenômenos com ciclos de vida diferentes, enquanto o subsistema digital de efeitos registra principalmente nome, descrição e imagem, sem representar mecanicamente essas regras. Isso dificulta determinar duração, acúmulo, encerramento e recuperação, e obriga jogador e Narrador a sincronizarem manualmente a condição ficcional com o efeito exibido na ficha.

Esta é uma mudança de **núcleo**. Condições padronizadas precisam ser previsíveis em qualquer mesa e produzir efeitos mecânicos transparentes; consequências permanecem abertas para preservar ficção, identidade e autoridade do Narrador. O compartilhamento de efeitos e equipamentos exclusivos continua sendo uma ferramenta do Narrador.

## What Changes

- Distinguir definição de efeito, aplicação de condição e consequência persistente: uma condição ativa automaticamente seu efeito mecânico predefinido, sem exigir um segundo controle manual.
- Evoluir `app_streamlit/data/catalogs/efeitos_default.json` de catálogo apenas descritivo para catálogo estruturado e retrocompatível, com associação estável, categoria e operações mecânicas declarativas.
- Pré-cadastrar no catálogo default o efeito de cada condição padronizada; a condição registra origem e encerramento, enquanto o efeito define as alterações calculáveis.
- Preservar duas formas de distribuição: efeitos default oficiais referenciados por associação e efeitos externos privados incorporados integralmente a códigos compartilháveis.
- Preservar leitura e importação dos formatos `E1` e `EQ1`; introduzir contratos versionados `E2` e `EQ2` para operações, ativações e referências estruturadas, sem executar código arbitrário recebido.
- Manter uma lista fechada de condições padronizadas; fontes podem combiná-las com dano, consequências e efeitos adicionais, mas não redefinir silenciosamente uma palavra-chave.
- Exigir que toda aplicação de condição informe origem, duração ou critério de encerramento e, quando aplicável, resistência, escape e parâmetros.
- Rastrear fontes sobrepostas sem duplicar o efeito mecânico; a condição e seu efeito permanecem ativos enquanto ao menos uma aplicação continuar válida.
- Adicionar **Atordoado** e **Sangrando** à lista padronizada.
- **BREAKING** Substituir **Completamente Incapacitado** por **Incapacitado** e **Completamente Controlado** por **Controlado**, com aliases de leitura para conteúdo legado.
- **BREAKING** Tratar **Desarmado** como resultado imediato, **Morrendo** como estado derivado e **Vulnerabilidade** como relação de dano obrigatoriamente parametrizada, não como condições livres.
- Definir consequências abertas nas categorias Trauma, Ferimento Grave, Sequela, Aflição e Outra Consequência, capazes de aplicar condições e, por elas, ativar efeitos default.
- Manter tipos de dano como identificadores consultados por outras regras; nenhum tipo causa condição ou consequência automaticamente.
- Implementar documentação, dados, codecs e domínio puros independentes de interface, sem modificar a aplicação atual em Streamlit.

## Non-goals

- Redesenhar Descanso e Recuperação, Aprendizado, PP ou Descansos Mínimos.
- Definir tempos universais de tratamento para consequências.
- Rebalancear tipos de dano, RDB, Resistência, Vulnerabilidade, Imunidade ou todo o sistema de dano.
- Recalcular integralmente todas as magias, habilidades, classes e equipamentos não afetados.
- Implementar ou reformular agora a interface Streamlit de `app_streamlit/app/ficha.py`, `app_streamlit/app/sections/*` ou `app_streamlit/app/forjador.py`.
- Criar controle de acesso, criptografia ou impedir que um jogador repasse um código recebido; “exclusivo” significa conteúdo distribuído individualmente e armazenado apenas por quem o importar.
- Permitir scripts ou código executável em efeitos compartilhados.
- Criar tabelas fechadas de ferimentos, traumas, doenças, venenos ou maldições.

## Capabilities

### New Capabilities

- `condicoes-padronizadas`: Vocabulário fechado de condições, aplicações por origem e ativação automática de efeitos mecânicos estruturados, incluindo compatibilidade e distribuição de efeitos default ou incorporados.
- `consequencias-persistentes`: Estrutura aberta para Traumas, Ferimentos Graves, Sequelas, Aflições e outras consequências ligadas à ficção, incluindo progressão, tratamento e condições vinculadas.

### Modified Capabilities

Nenhuma. O projeto ainda não possui especificações duráveis arquivadas para estas regras.

## Impact

- Documentos principais: `rules/sistema/Condições e Tipos de Dano.md`, `Morte e Inconsciência.md`, `Defesa.md`, `Exaustão e Estresse.md` e `Framework de Criação, Aprendizado e Uso de Magias e Habilidades.md`.
- Dados: `app_streamlit/data/catalogs/efeitos_default.json` passa a guardar efeitos estruturados; efeitos externos e equipamentos continuam podendo carregar conteúdo privado incorporado.
- Domínio e intercâmbio: normalização e resolução pura de efeitos e condições, além de codecs retrocompatíveis para `E1`/`EQ1` e novos contratos `E2`/`EQ2`.
- Conteúdo: migração de referências a Desarmado, Morrendo, Vulnerável, Completamente Incapacitado e Completamente Controlado.
- Interface futura: o forjador deverá usar os codecs centrais e permitir autoria estruturada, mas não será alterado nesta mudança.
- Regras futuras: Descanso e Recuperação poderá distinguir encerramento de condição, desativação de efeito e tratamento de consequência; Aprendizado e PP permanece fora do escopo.
- Verificação: testes de schema, codec, composição, origens sobrepostas, segurança declarativa, consequências vinculadas e simulações de mesa.
