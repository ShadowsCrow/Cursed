# Proposal

## Why

Exaustão e Estresse têm alto valor narrativo, mas atualmente combinam trilhas recuperáveis, consequências permanentes e matrizes de penalidades que exigem rastreamento redundante. A revisão transforma o desgaste em escolhas legíveis e perigosas, enquanto Traumas, Ferimentos Graves e Sequelas passam a registrar consequências concretas, persistentes e ligadas à ficção.

Esta é uma mudança de **núcleo**: suas regras se aplicam aos personagens independentemente dos módulos opcionais da campanha. A ficha digital deve apoiar o núcleo com automação transparente, sem tornar a aplicação obrigatória para compreender ou executar as regras.

## What Changes

- Preservar inicialmente Exaustão em `0–15` e Estresse em `0–10`, mantendo compatibilidade com custos e habilidades já escritos.
- Padronizar as faixas de desgaste e remover a matriz de Estresse baseada nas categorias Novato, Veterano e Herói.
- Fazer as faixas produzirem efeitos temporários derivados, recalculados automaticamente quando o valor da trilha mudar.
- **BREAKING** Remover Exaustão Permanente como pontos incorporados à trilha de Exaustão.
- Introduzir Traumas, Ferimentos Graves e Sequelas como efeitos persistentes separados, com origem, gatilhos, consequências e recuperação explícitos.
- Fazer o Colapso Mental criar um Trauma relacionado à sua causa e permitir que fontes excepcionalmente traumáticas apliquem Trauma diretamente.
- Fazer o Colapso Físico e o excesso além do limite produzirem consequências físicas adequadas à fonte, em vez de converter automaticamente um ponto adicional de Exaustão em morte.
- Distinguir efeitos derivados, vinculados a uma fonte e aplicados persistentemente.
- Permitir que armas, armaduras, magias, habilidades, classes, regras do sistema e decisões do Narrador sejam origens rastreáveis de efeitos.
- Tornar o registro digital de Exaustão, Estresse e consequências transparente: valor, faixa, efeito, próxima faixa, origem, prévia da alteração, histórico e possibilidade de correção.
- Definir pontos de integração para que a revisão futura de descansos reduza trilhas e trate efeitos persistentes como operações independentes.

## Non-goals

- Redesenhar nesta mudança os valores completos, qualidades ou atividades de Descanso Curto e Descanso Longo.
- Redesenhar Carga, slots, natação, levantamento ou transporte.
- Revisar todas as condições e tipos de dano.
- Implementar o fluxo completo de descanso, aprendizado ou tratamento na interface antes de suas respectivas revisões.
- Recalibrar todas as habilidades e magias; somente referências incompatíveis com a remoção de Exaustão Permanente ou com os novos Colapsos serão migradas.

## Capabilities

### New Capabilities

- `desgaste-e-consequencias`: Regras de Exaustão, Estresse, Colapsos, Traumas, Ferimentos Graves, Sequelas e sua integração futura com descanso.
- `registro-transparente-de-efeitos`: Comportamento observável da ficha para registrar, explicar, rastrear e administrar trilhas e efeitos de origens distintas.

### Modified Capabilities

Nenhuma. O projeto ainda não possui especificações duráveis anteriores.

## Impact

- Documentos principais: `rules/sistema/Exaustão e Estresse.md` e referências em `Descansos e Recuperação.md`, `Condições e Tipos de Dano.md`, `Carga.md`, `Criação de Personagem.md` e regras que apliquem Exaustão Permanente ou Colapso.
- Aplicação: estado e persistência da ficha, seção de status, seção de efeitos, gatilhos derivados e representação das origens dos efeitos.
- Dados: catálogo de efeitos padrão e futura compatibilidade com efeitos provenientes de equipamentos, cartas e habilidades de classe.
- Compatibilidade: fichas antigas sem as novas trilhas ou metadados de efeitos devem receber valores padrão sem perder os efeitos externos existentes.
- Verificação: validação documental, testes de transição de faixas, persistência, origem, ausência de duplicação e um playtest focado em esforço, Colapso e recuperação.
