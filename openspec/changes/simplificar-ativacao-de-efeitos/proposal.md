# Proposal

## Why

O fluxo de mesa desejado é direto: o Narrador descreve a situação, e o jogador ativa ou desativa o efeito correspondente na ficha. A implementação anterior criou registros separados de condição, aplicações por origem e uma camada de resolução que aumentam o trabalho sem gerar decisões proporcionais.

Esta é uma correção de **núcleo** à mudança `reformular-condicoes-e-consequencias` ainda não arquivada.

## What Changes

- **BREAKING:** uma condição padronizada passa a ser o próprio efeito oficial ativo; não há uma segunda aplicação técnica obrigatória.
- O efeito conserva sua descrição como regra principal e pode declarar modificadores numéricos opcionais, com contexto de rolagem e substituição simples para evitar soma indevida.
- A ativação e o encerramento de efeitos temporários são decisões da mesa registradas diretamente na ficha. Origens e prazos podem ser anotados em texto quando forem úteis.
- Consequências persistentes continuam com tratamento próprio; podem indicar efeitos oficiais enquanto relevantes, sem instâncias independentes de condição.
- Preservar o compartilhamento E1/EQ1 e permitir metadados opcionais nesses formatos; retirar a necessidade de E2/EQ2 para esta evolução.
- Remover o arquivo `app_streamlit/data/catalogs/exemplos_efeitos_estruturados.json`; exemplos de teste ficam nos próprios testes, e dados reais permanecem nos catálogos existentes.

## Capabilities

### New Capabilities

- `ativacao-direta-de-efeitos`: fluxo de ativação, metadados opcionais de rolagem, sobreposição e compartilhamento compatível.

### Modified Capabilities

Nenhuma especificação principal existe ainda em `openspec/specs/`; esta mudança corrige uma mudança ativa anterior.

## Non-goals

- Alterar a interface Streamlit atual, conforme decisão do projeto.
- Criar uma biblioteca adicional de efeitos ou definir a tecnologia da ficha futura.
- Automatizar todos os resultados narrativos, restrições, dano recorrente ou duração.
- Reformar Descanso, Aprendizado, PP ou a matemática dos tipos de dano.

## Impact

Regras em `rules/sistema`, catálogo oficial em `app_streamlit/data/catalogs`, domínio puro em `app_streamlit/core/efeitos.py` e `app_streamlit/core/desgaste.py`, codecs E1/EQ1 e testes. Os três catálogos reais de efeitos mantêm seus papéis atuais.
