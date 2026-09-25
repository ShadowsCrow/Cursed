# Validação da ativação direta de efeitos

Esta validação é uma **simulação automatizada de mesa**, não um playtest com jogadores.

|Roteiro|Decisão da mesa|Resultado verificado|
|---|---|---|
|Lia fica Cega pela fumaça|Ativar Cego; atacar usando visão ou audição|`-4` só no ataque visual; a descrição continua acessível para o restante da regra.|
|Cego e Ofuscado juntos|Manter ambos até cada causa terminar|O ataque visual usa `-4`; após desativar Cego, usa `-2` de Ofuscado.|
|Recompensa privada|Importar EQ1 com efeito incorporado|O bônus opcional `+2` viaja com o item, sem cadastro oficial.|
|Ferimento Grave|Manter Imobilizado enquanto o ferimento justificar|A consequência indica o efeito; tratamento concluído retira seu vínculo, sem apagar outra causa.|

O fluxo exige apenas ativar ou desativar o efeito e consultar sua descrição. O cálculo puro aceita metadados numéricos quando alvo e contexto coincidem. Sangrando e outras regras sem metadados permanecem resolvidas pela descrição.

Verificações executadas: `41` testes passaram; os três JSON reais de efeitos são válidos; o arquivo extra de exemplos foi removido; ambas as mudanças OpenSpec foram validadas com `--strict`.

A interface Streamlit atual não foi editada nesta mudança. Ela ainda precisa de um controle de ativação manual de efeitos oficiais e de consumir os modificadores nas rolagens quando a interface futura for trabalhada. A árvore Git já contém alterações anteriores em arquivos de interface e persistência, que foram preservadas.
