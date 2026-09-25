# Tasks

## 1. Regras

- [x] 1.1 Ajustar Condições e Tipos de Dano ao fluxo de ativar/desativar o próprio efeito, e verificar que não exige instância de condição separada.
- [x] 1.2 Harmonizar Morte, Defesa, Framework e Exaustão/Estresse com esse fluxo, e verificar que condições, consequências e tipos de dano mantêm seus papéis.

## 2. Dados e domínio

- [x] 2.1 Simplificar `efeitos_default.json` para descrições e modificadores numéricos opcionais, e verificar catálogo válido, associações estáveis e Cego substituindo Ofuscado.
- [x] 2.2 Simplificar o domínio puro para resolver efeitos ativos e modificadores por alvo/contexto, e verificar ausência de dupla ativação e de inferência numérica a partir do texto.
- [x] 2.3 Ajustar vínculos de consequências para efeitos oficiais diretos, mantendo leitura do campo legado, e verificar tratamento sem perda de registros.

## 3. Compartilhamento e migração

- [x] 3.1 Preservar E1/EQ1 e permitir modificadores opcionais sem exigir E2/EQ2, e verificar round-trip de efeito e item privado.
- [x] 3.2 Retirar `app_streamlit/data/catalogs/exemplos_efeitos_estruturados.json` e testes exclusivos do modelo substituído, e verificar que nenhuma rotina de produção depende do arquivo.

## 4. Interface futura e verificação

- [x] 4.1 Registrar a futura ativação manual e aplicação nas rolagens sem modificar Streamlit, e verificar limite arquitetural por busca de arquivos alterados.
- [x] 4.2 Validar em simulação de mesa Cego, Ofuscado, efeito privado e consequência vinculada; executar suíte relevante, JSON e OpenSpec estrito.
