# Spec Delta

## Purpose

Define uma transição verificável da aplicação Streamlit e dos formatos legados para a plataforma colaborativa sem perda silenciosa de dados ou interrupção irreversível.

## ADDED Requirements

### Requirement: Migração repetível e identificável
Cada execução de migração SHALL identificar origem, versão e resultado dos registros convertidos e SHALL evitar duplicação quando repetida sobre a mesma entrada.

#### Scenario: Migração é executada novamente
- **WHEN** a mesma ficha legada já convertida é encontrada
- **THEN** o sistema reconhece sua procedência e não cria uma segunda cópia silenciosa

### Requirement: Validação de equivalência
O processo SHALL comparar contagens, campos críticos e amostras serializadas antes de considerar um conjunto migrado como válido.

#### Scenario: Equipamento não foi convertido
- **WHEN** a validação encontra diferença entre origem e destino
- **THEN** a migração é marcada como incompleta e o sistema apresenta o item ou campo divergente

### Requirement: Dados ambíguos exigem revisão
Campos legados cujo significado não possa ser determinado com segurança SHALL ser preservados e sinalizados para revisão, sem inferência mecânica arbitrária.

#### Scenario: Habilidade possui somente o campo legado custo
- **WHEN** não existe informação suficiente para separar custos
- **THEN** o valor original é preservado, os novos campos permanecem indefinidos e a entrada recebe pendência de revisão

### Requirement: Ativos externos ao payload
Retratos, ícones e artes migrados SHALL ser armazenados como ativos referenciados e SHALL manter hash ou metadados que permitam verificar integridade e procedência.

#### Scenario: Efeito legado contém imagem Base64
- **WHEN** o efeito é convertido
- **THEN** a imagem válida é armazenada separadamente e a nova entidade referencia o ativo resultante

### Requirement: Convivência e corte controlado
Streamlit e a nova plataforma SHALL poder coexistir durante a validação, e a retirada da interface antiga MUST ocorrer somente após paridade dos fluxos críticos, migração verificada e plano de reversão testado.

#### Scenario: Critério de paridade falha
- **WHEN** um fluxo crítico ainda não passa sua validação
- **THEN** o corte definitivo é bloqueado e a interface anterior permanece disponível conforme o plano de convivência

### Requirement: Compatibilidade portátil
Os formatos portáteis legados suportados SHALL continuar importáveis durante o período de transição, com validação e conversão para o modelo versionado atual.

#### Scenario: Usuário importa código EQ1 válido
- **WHEN** confirma a importação após a pré-visualização
- **THEN** o sistema cria a representação atual equivalente e registra a procedência do formato legado
