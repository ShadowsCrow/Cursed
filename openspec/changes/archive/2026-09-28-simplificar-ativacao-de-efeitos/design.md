# Design

## Context

A aplicação atual possui uma aba de efeitos e persiste efeitos externos na ficha, mas não fornece ainda ativação manual de definições oficiais. O usuário decidiu adiar qualquer edição da interface Streamlit. A mudança anterior criou `utils/condicoes.py`, codecs E2/EQ2 e um arquivo de exemplos em `data/`, embora nenhum desses elementos seja necessário para o fluxo de mesa escolhido.

## Goals / Non-Goals

**Goals:** simplificar o modelo de núcleo; manter efeitos oficiais no catálogo existente; permitir metadados numéricos opcionais em efeitos e códigos atuais; preservar consequências persistentes e itens privados.

**Non-Goals:** implementar controles Streamlit nesta etapa; inferir restrições, duração ou dano recorrente de texto; modificar o armazenamento atual de fichas.

## Decisions

As regras publicadas em `rules/sistema` descrevem condições e consequências para jogadores e Narrador sem expor associações, metadados, codecs ou o estado da interface. Este documento concentra o contrato digital correspondente. A ficha pode facilitar o acompanhamento, mas não é pré-requisito implícito para compreender a regra.

1. A definição oficial é a unidade ativada. A mesa fornece uma lista de associações ativas; um resolvedor puro devolve os efeitos e modificadores relevantes. A origem pode ser anotada na narrativa ou no registro da consequência. Não haverá uma entidade obrigatória de aplicação de condição.
2. O catálogo conserva `associacao`, `nome`, `descricao` e categoria. `modificadores` é uma lista opcional de `{alvo, valor, quando}`. `substitui` é uma lista opcional de associações mais brandas. Somente esses números são computáveis; proibições e dano recorrente ficam na descrição até haver razão concreta para automatizá-los.
3. E1/EQ1 aceitam esses campos opcionalmente, de forma aditiva. O importador antigo continua recebendo nome, descrição e imagem. E2/EQ2 deixam de ser o caminho exigido para novos efeitos; eventuais códigos gerados experimentalmente antes da correção podem continuar decodificáveis para não causar perda de dados.
4. Consequências podem listar associações oficiais em `efeitos_vinculados`. Leituras antigas de `condicoes_vinculadas` são convertidas de forma compatível. A saída é uma referência simples ao efeito, sem instância de condição com duração independente.
5. Os exemplos de `app_streamlit/data/catalogs/exemplos_efeitos_estruturados.json` serão retirados. Testes usarão amostras locais pequenas. Os catálogos reais de efeitos não recebem registros fictícios.

## Risks / Trade-offs

- Sem automação de duração, a mesa precisa desativar Cego quando a fumaça se dispersar → a descrição e a causa permanecem visíveis para orientar essa decisão.
- A ficha Streamlit atual não oferece ainda o controle manual ideal nem incorpora metadados nos cálculos de rolagem → registrar como integração futura, sem afirmar que ela já aplica a penalidade.
- Se duas fontes sustentarem o mesmo efeito, uma desativação prematura é possível → o Narrador informa quando a última causa termina; consequências mantêm sua indicação enquanto ativas.
- O risco de combate e a escassez continuam nas regras descritas, incluindo Sangrando, e não dependem de automação para funcionar.
- A carga cognitiva diminui porque o jogador administra um efeito ativo, enquanto a aplicação futura poderá mostrar o valor calculado quando o teste exigir.

## Migration Plan

1. Atualizar regras e OpenSpec com o fluxo de ativação direta e com a distinção entre regra descrita e metadados numéricos.
2. Ajustar o catálogo e o domínio puro, preservando nomes e associações para conteúdo existente.
3. Aceitar metadados opcionais em E1/EQ1 e manter decodificação compatível de códigos experimentais E2/EQ2 já existentes.
4. Converter vínculos de consequências para referências simples de efeito e manter leitura de campos legados.
5. Retirar arquivo de exemplos de `data/`, atualizar testes e validar JSON, codecs e regras.

Uma reversão pode ignorar os novos campos opcionais sem perder nome ou descrição. Registros antigos permanecem legíveis.
