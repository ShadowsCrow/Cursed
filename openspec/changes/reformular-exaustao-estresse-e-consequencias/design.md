# Design: Exaustão, Estresse e Consequências

## Context

O documento atual combina quatro responsabilidades em duas trilhas numéricas: desgaste temporário, penalidades derivadas, colapsos e consequências duradouras. Exaustão Permanente fica escondida dentro do total de Exaustão, enquanto Trauma depende de rastrear a procedência de três pontos de Estresse. Estresse ainda varia por uma matriz de Novato, Veterano e Herói. Essas regras aumentam memória operacional e tornam difícil responder perguntas simples: “por que tenho esta penalidade?”, “o descanso remove isto?” e “este número representa cansaço ou um dano permanente?”.

A aplicação já consolida efeitos de três origens: gatilhos padrão do sistema, efeitos externos da ficha e efeitos de equipamentos ativos. Entretanto, esses efeitos são majoritariamente nome, descrição e imagem. O estado persistido ainda não possui trilhas de Exaustão/Estresse, histórico de alterações ou consequências estruturadas. `sections/status.py` concentra estatísticas derivadas, `sections/efeitos.py` agrega efeitos visíveis, `utils/efeitos_triggers.py` calcula gatilhos automáticos, `utils/efeitos_codec.py` serializa efeitos simples e `utils/state.py`/`utils/persist_data.py` definem o ciclo de vida da ficha.

O projeto busca maior escassez e perigo que D&D, de modo que combate e esforço sejam decisões relevantes. Ao mesmo tempo, o foco é narrativo, as mecânicas são modulares e o aplicativo deve absorver contabilidade sem tornar a regra opaca. A solução precisa preservar decisões tensas, tornar o custo compreensível e converter permanência abstrata em ficção específica.

## Goals / Non-goals

### Goals

- Manter Exaustão e Estresse como recursos temporários simples, perigosos e independentes.
- Trocar Exaustão Permanente por Ferimentos Graves ou Sequelas explícitos.
- Fazer Trauma surgir principalmente de Colapso Mental ou de uma origem expressamente traumática.
- Remover a contabilidade de “três pontos do mesmo contexto” e a matriz universal por patamar.
- Fazer cada consequência persistente responder: de onde veio, o que causa e como pode mudar.
- Dar ao esforço voluntário valor dramático: o personagem pode concluir uma ação decisiva mesmo quando isso o leva ao colapso.
- Tornar a ficha rápida para mudanças comuns, transparente antes da confirmação e rastreável depois dela.
- Preparar a integração futura com descanso, tratamento, cartas, equipamentos, habilidades e classes.
- Manter as regras jogáveis sem a aplicação; a ficha digital automatiza, mas não inventa regras ocultas.

### Non-goals

- Redesenhar por completo Descanso, Recuperação e Aprendizado nesta mudança.
- Definir todos os tratamentos, doenças, venenos, condições ou tipos de dano do sistema.
- Recalibrar todas as habilidades, magias, classes, armas e armaduras existentes.
- Implementar controle remoto da ficha pelo mestre ou sincronização entre dispositivos.
- Resolver nesta mudança Carga, natação, afundamento, erguer ou arrastar.
- Criar uma regra universal de morte que substitua danos, ferimentos e decisões ficcionais de outras fontes.

## Decisions

### 1. Preservar as escalas atuais e simplificar sua interpretação

Exaustão continuará em 0–15 e Estresse em 0–10 na primeira versão. Isso reduz o custo de migração e permite testar a reforma sem misturá-la a uma recalibração completa. A simplificação vem de faixas únicas, efeitos derivados automaticamente e separação das consequências persistentes.

As faixas serão definidas em uma única camada de domínio, usada tanto pelo painel de estado quanto pelo agregador de efeitos. A documentação continuará sendo a fonte normativa; o código reproduzirá essas regras.

### 2. Esforço voluntário resolve a ação antes do colapso

Ao assumir Exaustão ou Estresse voluntariamente, o personagem recebe o benefício declarado e resolve a ação; só então o recurso é aplicado e um eventual colapso ocorre. Isso transforma o limite em escolha dramática, não em armadilha de ordem de operações. Ganhos involuntários continuam tendo aplicação imediata.

Estresse 9 bloqueia novo esforço voluntário, mas um personagem em 8 pode assumir até 2 pontos e apostar tudo em uma ação final. Exaustão 14 permite um último esforço físico. Um personagem já em colapso não pode usar essa opção.

### 3. Colapso e permanência são eventos diferentes

Chegar ao máximo causa Colapso Físico ou Mental. O colapso é um estado derivado e temporário; não é armazenado como uma penalidade permanente.

- Colapso Físico incapacita até auxílio ou recuperação aplicável. Ultrapassar o limite gera no máximo uma consequência física contextual por evento, sem morte automática.
- Colapso Mental exige uma manifestação coerente com a cena, cria ou intensifica um Trauma e retorna o Estresse a 8 após auxílio ou o fim do conflito imediato.

Uma fonte pode declarar diretamente Ferimento Grave, Sequela, Trauma, condição de morte ou outra consequência. Quando isso ocorrer, sua consequência específica substitui qualquer consequência genérica duplicada do mesmo evento.

### 4. Consequências persistentes são efeitos nomeados

“Exaustão Permanente” deixa de existir como número. As três categorias persistentes iniciais serão:

- **Trauma:** consequência psicológica com origem, gatilho, manifestação e tratamento. Seu comportamento padrão cria uma escolha na primeira exposição relevante de cada cena: receber 1 de Estresse para agir normalmente ou aceitar uma complicação coerente. Apoio e preparação podem neutralizar o custo quando a ficção justificar.
- **Ferimento Grave:** consequência física específica e tratável, com limitação, estabilização e recuperação próprias.
- **Sequela:** consequência duradoura e rara, sempre específica, que pode admitir adaptação, mitigação ou remoção excepcional.

Um descanso reduz trilhas somente conforme a regra do descanso. Ele não apaga consequências persistentes. Tratamento e recuperação futura operarão sobre o estado do efeito, sem converter novamente a consequência em pontos de uma trilha.

### 5. Três ciclos de vida de efeito

O agregador de efeitos tratará cada efeito segundo um ciclo de vida explícito:

| Ciclo | Fonte de verdade | Exemplos | Encerramento |
|---|---|---|---|
| Derivado | Estado atual calculado | Cansado, Abalado, Colapso | Quando a condição calculada deixa de valer |
| Vinculado | Origem ativa | Armadura equipada, habilidade sustentada | Quando a origem é desativada |
| Aplicado | Instância persistida | Trauma, Ferimento Grave, Sequela, maldição | Pela regra própria ou ação administrativa rastreável |

Essa distinção impede duplicação: uma penalidade de faixa nunca é copiada para a lista persistente, e desequipar uma armadura não apaga um Trauma que ela tenha causado anteriormente.

### 6. Modelo de dados aditivo

O estado da ficha ganhará estruturas equivalentes a:

```yaml
desgaste:
  exaustao: 0
  estresse: 0
efeitos_aplicados:
  - id: efeito-estavel
    categoria: trauma | ferimento_grave | sequela | outro
    nome: "Medo do Abismo"
    descricao: "..."
    origem:
      tipo: sistema | mestre | arma | armadura | magia | habilidade | classe | outro
      id: "opcional"
      nome: "Encontro no poço"
    gatilho: "opcional"
    consequencia: "..."
    tratamento:
      estado: ativo | mitigado | em_tratamento | encerrado
      progresso: 0
      objetivo: null
      regra: "..."
    imagem: null
historico_desgaste:
  - id: evento-estavel
    ordem: 1
    origem: {}
    antes: {}
    depois: {}
    efeitos_afetados: []
    justificativa: null
```

`efeitos_externos` continuará legível para preservar fichas e bibliotecas atuais. `efeitos_aplicados` será a fonte de consequências persistentes criadas pelo novo sistema. A camada de apresentação normalizará ambos para exibição, sem sobrescrever registros legados. Campos desconhecidos deverão ser tolerados no carregamento.

Eventos de histórico serão transacionais: um evento conhece os valores antes/depois e os identificadores de efeitos que criou ou modificou. Isso torna possível desfazer com segurança a última operação. O histórico pode ser limitado a uma quantidade documentada de eventos para evitar crescimento irrestrito, desde que o limite preserve as operações recentes necessárias à administração.

### 7. Regras em camada de domínio compartilhada

Faixas, limites, prévias e transições não ficarão codificados diretamente nos componentes visuais. Uma camada de domínio deverá:

- normalizar valores e fichas antigas;
- calcular faixa e penalidades;
- simular uma alteração antes de aplicá-la;
- aplicar a alteração como uma transação;
- criar, intensificar ou encerrar efeitos persistentes;
- validar e desfazer a última transação segura;
- produzir uma representação normalizada para o agregador de efeitos.

Isso evita que Status, Efeitos e persistência interpretem a mesma regra de maneiras diferentes e facilita testes sem iniciar a interface.

### 8. Interface prioriza consulta e alterações comuns

O painel de estado mostrará cada trilha com número atual/máximo, faixa, penalidades ativas e próximo limiar. Controles rápidos permitirão adicionar ou reduzir pontos e registrar origem. A confirmação mostrará uma prévia explícita de mudanças de faixa, colapso e efeitos persistentes.

O painel de efeitos continuará agregando efeitos, mas seus cartões passarão a indicar ciclo de vida e origem. Efeitos aplicados terão ações administrativas para editar, intensificar, mitigar, encerrar ou remover. Cor será apoio visual, nunca a única forma de comunicar estado.

A operação comum deverá exigir no máximo uma ação para iniciar e uma para confirmar. Formulários completos aparecem somente quando a transação cria ou altera uma consequência persistente.

### 9. Integração futura com descanso e conteúdo criado

A futura reforma de Descanso e Recuperação chamará as mesmas transações de domínio: primeiro exibirá uma prévia das alterações nas trilhas e, separadamente, qualquer progresso de tratamento permitido. Isso impede que reduzir Estresse apague Trauma ou que zerar Exaustão cure fraturas.

Cartas, equipamentos, habilidades e classes poderão fornecer uma origem estruturada e uma intenção de efeito. O criador de objetos continuará podendo fornecer efeitos vinculados, enquanto uma ação expressamente causadora de Trauma ou Ferimento Grave criará uma instância aplicada. O mestre mantém autoridade para criar e impor conteúdo; o framework de criação não é exposto como mecânica do jogador.

### 10. Revisão de 2026-09-27: implementação na plataforma nova

As decisões 6 a 8 foram escritas para o Streamlit. A implementação da ficha passou para a plataforma nova (`cursed_platform`, `platform/api`, `platform/frontend`), e as mudanças irmãs decidiram não alterar a interface Streamlit. Esta decisão substitui 6 e 8 onde houver conflito:

- **Dados:** a ficha guarda `desgaste = {exaustao, estresse}` e `consequencias` (lista de consequências persistentes no formato normalizado pelo domínio). Ficha sem essas chaves é lida como 0 e lista vazia; nada é gravado só para inicializar. Efeitos da tabela `character_effects` continuam sendo os efeitos ativáveis (default, externos e vinculados a equipamento); consequências não são copiadas para lá.
- **Histórico e desfazer:** não há `historico_desgaste` na ficha. Cada comando registra um evento de auditoria com as mudanças completas de `desgaste` e `consequencias`, e a correção de eventos da plataforma reverte o evento quando os valores atuais ainda são os que ele gravou; caso contrário, recusa e orienta a correção manual. Isso cumpre "Histórico e desfazer seguro" sem um segundo histórico.
- **Autoridade:** o Narrador aplica ganhos e reduções de fontes externas, decide a consequência do excedente físico, encerra o Colapso Mental e administra consequências. Quem controla o personagem (dono ou Narrador) usa o Esforço voluntário e, se ele levar ao Colapso Mental, registra a manifestação e o Trauma, que o Narrador pode editar depois. `desgaste` e `consequencias` deixam de ser alteráveis pelo jogador no `PUT /ficha`.
- **Penalidades:** as faixas continuam derivadas do valor atual. Só a parte calculável pela ficha entra nos valores derivados (−1 em Defesas em Exausto); penalidades em testes e Movimento seguem como texto da faixa, porque a plataforma não calcula testes nem Movimento.
- **Interface:** a faixa de estado ativo já mostra valor/máximo, faixa, penalidade e próximo limiar; ela ganha os controles de alteração com prévia e de esforço. Consequências ganham um painel próprio na ficha.

## Risks / Trade-offs

- **Escalas preservadas podem continuar granulares demais.** Mitigação: medir uso real após a separação; uma futura mudança pode recalibrar números sem reabrir a arquitetura.
- **Permitir a ação antes do colapso reduz a punição imediata.** Em troca, cria decisões memoráveis e mantém o colapso como custo certo. O bloqueio em 9 de Estresse e a incapacidade no máximo evitam repetição abusiva.
- **Traumas estruturados exigem julgamento do mestre.** Modelos e campos claros reduzem arbitrariedade, mas a consequência continua propositalmente contextual para servir à narrativa.
- **O novo modelo pode fragmentar efeitos legados e novos.** A normalização para apresentação e a compatibilidade aditiva evitam migração destrutiva; uma consolidação total pode ocorrer em mudança posterior.
- **Histórico e desfazer aumentam o estado persistido.** Eventos compactos, identificadores estáveis e retenção limitada reduzem tamanho e complexidade.
- **Muitos detalhes na ficha podem recriar a complexidade removida.** A tela principal mostrará apenas resumo e ações frequentes; origem, tratamento e histórico ficam disponíveis sob expansão.
- **Consequência contextual no excedente físico pode variar entre mesas.** Exemplos e a regra de uma consequência por evento limitam severidade sem eliminar a autoridade narrativa.
- **Remover morte automática pode parecer reduzir a letalidade.** A letalidade migra para fontes e situações explicitamente letais, tornando o perigo mais legível e ficcionalmente justificável.

## Migration Plan

> Os passos 3 a 8 abaixo refletem o plano original para o Streamlit; a decisão 10 e as seções 3 a 6 de `tasks.md` descrevem o plano vigente na plataforma nova.

1. Atualizar a documentação normativa de Exaustão e Estresse e ajustar referências em Descansos e Recuperação, sem redesenhar o restante do descanso.
2. Adicionar funções de domínio e testes para faixas, esforço, colapsos, efeitos aplicados, prévia, histórico e desfazer.
3. Adicionar valores padrão ao estado e à persistência. Fichas antigas recebem Exaustão 0, Estresse 0, lista de efeitos aplicados vazia e histórico vazio.
4. Manter `efeitos_externos` e o formato E1 existentes legíveis. Nenhum efeito legado será removido ou regravado compulsoriamente.
5. Integrar efeitos derivados e aplicados ao agregador existente, com deduplicação por identificador e ciclo de vida.
6. Adicionar os controles e resumos à ficha, incluindo prévia e confirmação.
7. Verificar manualmente carregamento de ficha antiga, salvamento/reabertura, mudança de todas as faixas, os dois colapsos, criação/intensificação de Trauma e desfazer.
8. Caso seja necessário rollback, ocultar os novos controles e ignorar os novos campos na interface antiga; os campos aditivos permanecem no arquivo e os dados legados continuam intactos.

## Open Questions

- A reforma futura de Descanso definirá duração, qualidade e ritmo exatos do tratamento de cada categoria persistente.
- Uma mudança posterior decidirá se o histórico completo deve ser exportável como diário narrativo ou manter apenas uma janela administrativa recente.
- A integração futura entre ficha do mestre e fichas dos jogadores definirá permissões e sincronização; esta mudança pressupõe administração local.
