# Design

> Registro de desenho original. A mudança `simplificar-ativacao-de-efeitos` substitui as camadas de aplicação de condição e a exigência de E2/EQ2. Consulte sua especificação e as regras em `rules/sistema` para o desenho vigente.

## Context

Ver [proposal.md](proposal.md#why) para a motivação. Hoje `Condições e Tipos de Dano.md` mantém uma tabela plana, enquanto `Morte e Inconsciência.md`, `Defesa.md`, o framework de criações e a reforma de Exaustão/Estresse interpretam alguns desses termos de formas diferentes.

Há quatro diferenças de ciclo de vida relevantes:

- Cego e Paralisado são palavras-chave mecânicas aplicadas por uma fonte e encerradas por prazo, resistência ou remoção.
- Morrendo é derivado de PV e possui regras próprias de contagem.
- Desarmar resolve um evento sobre um objeto e não deixa necessariamente um estado no personagem.
- Trauma, Ferimento Grave e Sequela são registros persistentes que não desaparecem ao reduzir uma trilha.

A mudança `reformular-exaustao-estresse-e-consequencias` já introduziu um núcleo Python independente de interface em `utils/desgaste.py` e consolidou a separação entre trilhas e consequências. Esta mudança deve estender esse modelo, sem criar um segundo motor incompatível. A aplicação atual usa Streamlit, mas foi retirada do escopo de alterações: documentação, domínio e dados portáveis não podem depender desse framework.

O subsistema de efeitos atual possui três caminhos parcialmente duplicados. `app_streamlit/data/catalogs/efeitos_default.json` descreve efeitos oficiais por `associacao`; `app_streamlit/app/forjador.py` gera códigos `E1` e `EQ1` com codec próprio; e `app_streamlit/core/effect_codec.py`/`app_streamlit/core/efeitos_codec.py` decodificam ou codificam efeitos externos textuais. O forjador permite distribuir um item autocontido a um único jogador, característica que precisa ser preservada, mas hoje nome, descrição e imagem não são suficientes para cálculo automático.

## Goals / Non-Goals

**Goals:**

- Oferecer um vocabulário pequeno e previsível para controle, sentidos, mobilidade e incapacidade.
- Manter consequências abertas o suficiente para ferimentos, traumas, doenças e maldições específicos da narrativa.
- Permitir que cada efeito explique origem, duração, encerramento e tratamento sem consulta cruzada desnecessária.
- Reduzir duplicação de penalidades quando condições se sobrepõem.
- Produzir um modelo de domínio e dados utilizável por ficha física, testes e qualquer interface futura.
- Fazer uma condição ativar seu efeito mecânico sem um segundo controle manual.
- Preservar efeitos e equipamentos autocontidos que o Narrador distribui individualmente.
- Oferecer contratos e codecs versionados, declarativos e retrocompatíveis.
- Preparar entradas bem definidas para a futura reforma de Descanso e Recuperação.

**Non-Goals:**

- Escolher a tecnologia que substituirá Streamlit.
- Persistir ou exibir condições na aplicação atual.
- Alterar `app_streamlit/app/forjador.py` ou sua interface atual; ele será um consumidor futuro dos contratos puros.
- Oferecer sigilo criptográfico ou impedir o reenvio de um código compartilhado.
- Definir durações universais para fontes que aplicam condições.
- Definir tempos universais de tratamento para consequências.
- Alterar a matemática geral de dano, Defesas ou morte imediata.
- Reavaliar o custo de todas as criações; apenas mapear termos afetados e atualizar os pontos diretamente incompatíveis.

## Decisions

### 1. Classificar natureza e ciclo de vida separadamente

“O que o efeito é” e “por que ele continua ativo” serão dimensões distintas:

|Natureza|Finalidade|
|---|---|
|Condição|Palavra-chave mecânica fechada e reutilizável.|
|Consequência|Registro aberto, persistente e específico à ficção.|
|Estado derivado|Resultado calculado por outro subsistema, como Morrendo ou Colapso.|
|Resultado imediato|Evento resolvido no momento, como Desarmar.|
|Relação/modificador|Interação parametrizada, como Vulnerabilidade a Fogo.|

|Ciclo de vida|Fonte de verdade|
|---|---|
|Derivado|Permanece enquanto a regra que o calcula for verdadeira.|
|Vinculado|Permanece enquanto sua origem estiver ativa.|
|Aplicado|Possui uma instância com duração, encerramento ou tratamento próprios.|

Uma condição pode ser vinculada a uma fumaça ou aplicada por três turnos. Uma consequência é normalmente aplicada, mas pode vincular condições enquanto estiver em determinado estado. Separar essas dimensões evita transformar duração em taxonomia.

**Alternativa rejeitada:** manter todos os fenômenos numa única lista de condições. Isso simplifica o título da tabela, mas exige exceções para tratamento, progressão, estados derivados e resultados instantâneos.

### 2. Condições fechadas; consequências abertas

Condições serão alteradas apenas no núcleo porque criações, classes e inimigos precisam confiar no mesmo significado. Uma habilidade pode se chamar “Petrificação”, mas deve compor condições e efeitos explícitos em vez de inventar uma definição local de Petrificado.

Consequências precisam permanecer abertas porque o valor narrativo está na especificidade: “Tornozelo Esmagado” produz mais ficção que “Ferimento 2”. Elas usam categorias e campos comuns, mas não nomes universais.

**Alternativa rejeitada:** uma tabela fechada de ferimentos e traumas. Ela facilita geração aleatória, mas reduz contexto, cria consultas e entra em conflito com a autoridade do Narrador. Tabelas de exemplos poderão existir como módulos opcionais no futuro.

### 3. Separar definição, aplicação e resolução

O domínio terá três camadas, sem dois estados independentes para “condição ligada” e “efeito ligado”:

1. **Definição de efeito:** regra reutilizável, oficial ou incorporada, com descrição e operações declarativas.
2. **Aplicação:** instância que informa alvo, origem, ativação, duração e encerramento.
3. **Efeito resolvido:** resultado calculado a partir das aplicações válidas, deduplicado e composto com outros efeitos.

Uma condição padronizada é uma aplicação especializada que referencia exatamente uma associação oficial. Enquanto houver ao menos uma aplicação de Cego, o resolvedor inclui o efeito `condicao_cego`; quando a última termina, ele o retira. A apresentação pode ser ocultada, mas não existe um botão mecânico separado capaz de deixar condição e efeito divergentes.

**Alternativa rejeitada:** persistir simultaneamente `cego: true` e um efeito Cego ativo. Dois campos mutáveis criariam estados contraditórios e exigiriam sincronização pela interface.

### 4. `app_streamlit/data/catalogs/efeitos_default.json` será o catálogo oficial e retrocompatível

O catálogo existente será a fonte canônica das regras reutilizáveis do sistema, eliminando a necessidade de um `app_streamlit/data/catalogs/condicoes.json` paralelo. Entradas antigas continuam válidas como efeitos descritivos; entradas estruturadas acrescentam `categoria`, `versao` e `operacoes`:

```json
{
  "associacao": "condicao_cego",
  "versao": 2,
  "categoria": "condicao",
  "nome": "Cego",
  "descricao": "Não enxerga e sofre restrições em ações visuais.",
  "operacoes": [
    {"tipo": "restricao", "alvo": "sentido:visao", "modo": "indisponivel"},
    {"tipo": "falha_automatica", "alvo": "teste:exclusivamente_visual"},
    {"tipo": "modificador", "alvo": "ataque:depende_visao", "valor": -4},
    {"tipo": "modificador", "alvo": "defesa:depende_visao", "valor": -4}
  ]
}
```

O vocabulário inicial será fechado e declarativo: `modificador`, `restricao`, `falha_automatica`, `alteracao_recurso` e `consumir_aplicacao`. Eventos como fim do turno ou próximo ataque válido pertencem à ativação/gatilho da operação, não a código executável. Campos desconhecidos podem ser preservados em leitura compatível, mas operações desconhecidas são rejeitadas em validação estrita.

Sobrepeso será migrado como primeiro efeito sistêmico estruturado, mantendo sua associação `cc_above`. Os efeitos das condições usarão associações `condicao_<id>`, permitindo que armas, habilidades, consequências e códigos compartilhados reutilizem as mesmas regras.

**Alternativa rejeitada:** duplicar descrições e operações em um catálogo de condições e outro de efeitos. A duplicação tornaria incerto qual arquivo governa o cálculo.

### 5. Efeitos oficiais são referenciados; efeitos privados são incorporados

O compartilhamento continuará oferecendo duas estratégias:

- `default`: guarda uma associação oficial e resolve a definição no catálogo local;
- `externo`: incorpora nome, descrição, imagem opcional, ativação e operações suficientes para o receptor usar o conteúdo sem alterar seu catálogo global.

`E1` e `EQ1` continuam sendo aceitos como formatos legados descritivos. `E2` representa um efeito estruturado e `EQ2` representa equipamento capaz de misturar referências default e efeitos incorporados estruturados. Os novos codecs serão centralizados em módulos puros; formatos recebidos são dados, nunca Python, expressões avaliáveis ou nomes de funções a executar.

O conteúdo importado é exclusivo por distribuição: somente quem receber e importar o código o terá na ficha. O formato não pretende impedir cópia ou reenvio. Uma interface futura deverá pré-visualizar todos os campos e pedir confirmação antes de importar, mas essa interface não faz parte desta mudança.

**Alternativa rejeitada:** inserir efeitos personalizados importados em `efeitos_default.json`. Isso contaminaria o catálogo oficial, criaria conflitos de identificador e distribuiria conteúdo privado para outras fichas.

### 6. Lista de condições revisada

A lista de núcleo será:

- abertura e mobilidade: Surpreso, Derrubado, Agarrado, Imobilizado e Contido;
- sentidos e comunicação: Ofuscado, Cego, Silenciado e Invisível;
- capacidade: Sem Reação, Atordoado, Paralisado, Incapacitado e Inconsciente;
- exposição, controle e dano contínuo: Exposto, Controlado e Sangrando.

Atordoado preenche o espaço entre Sem Reação e Paralisado: ainda permite uma escolha no turno, mas reduz a economia de ações. Sangrando fornece o alvo normativo para “parar sangramento” já usado pelo framework; causa perda fixa de `1 PV` no fim do turno e não aumenta por aplicações sobrepostas. Casos mais graves devem ser Ferimentos Graves ou Aflições que modifiquem expressamente esse funcionamento.

No framework de criações, **Atordoado vale `+4` pontos de Controle**: restringe aproximadamente metade do turno e remove Reações, mas ainda preserva uma decisão relevante. **Sangrando não recebe um segundo custo fixo apenas pelo nome da condição**; seu custo é calculado como dano recorrente de `1 PV` pela duração ou critério de encerramento declarado. Se uma criação também dificultar estabilização, impedir tratamento ou intensificar a hemorragia, esses elementos são avaliados separadamente.

Os nomes “Completamente Incapacitado” e “Completamente Controlado” serão aliases de migração, não novos estados. A palavra “completamente” deixa de carregar uma distinção que o sistema não utiliza.

### 7. Aplicações, não apenas marcadores booleanos

Uma criatura pode receber a mesma condição de mais de uma fonte. Por isso, o estado lógico “está Cego” será derivado de aplicações independentes equivalentes a:

```yaml
id: aplicacao-estavel
condicao_id: cego
efeito_associacao: condicao_cego
origem:
  tipo: magia
  id: nevoa-negra
  nome: Névoa Negra
alvo_id: personagem
duracao:
  tipo: turnos | cena | enquanto_origem | ate_evento
  valor: 2
encerramento: "Fim do segundo turno"
resistencia: null
parametros: {}
```

O efeito mecânico da condição é calculado uma vez; as aplicações respondem quando ela termina. Em ficha física, basta anotar condição, fonte e encerramento em uma linha. Uma interface futura poderá ocultar as instâncias normalmente e expandi-las quando houver sobreposição.

**Alternativa rejeitada:** guardar apenas `cego: true`. Ela perde a origem e remove a condição cedo demais quando uma de várias fontes termina.

### 8. Restrições usam composição, não soma cega

Condições não aplicam automaticamente outras condições menores. Contido possui Movimento `0`, mas não cria outra instância de Imobilizado. Ao coexistirem, proibições idênticas são contabilizadas uma vez e penalidades sobre o mesmo aspecto usam a condição mais severa quando uma substitui a outra, como Cego sobre Ofuscado.

Essa regra diminui consultas e evita que uma cadeia de controle produza penalidades numéricas não intencionais. Fontes ainda podem declarar condições distintas quando precisarem de encerramentos independentes.

### 9. Resultados e estados especiais permanecem em seus subsistemas

- Desarmar faz o objeto cair e termina como resolução; recuperar o objeto depende da posição e das ações disponíveis.
- Morrendo continua sendo derivado ao chegar a `0 PV` e encerra conforme Morte e Inconsciência.
- Vulnerabilidade é uma relação de dano parametrizada por tipo, fonte ou “todos os danos”.
- Tipos de dano continuam sem aplicar condições automaticamente.

Isso preserva a matemática existente e evita que a revisão de condições se transforme numa reforma de dano ou morte.

### 10. Consequências usam categorias mínimas e progressão própria

O modelo de consequência estenderá o formato já introduzido em `utils/desgaste.py`:

```yaml
id: consequencia-estavel
categoria: trauma | ferimento_grave | sequela | aflicao | outro
nome: "Tornozelo Esmagado"
descricao: "..."
origem: {}
manifestacao: "..."
gatilho: null
estado: ativo | mitigado | em_tratamento | encerrado
tratamento:
  regra: "..."
  progresso: 0
progressao:
  intensidade: 1
  estagio: null
condicoes_vinculadas: []
```

Não haverá progressão universal. Traumas podem intensificar, Ferimentos podem estabilizar e Aflições podem avançar por estágios, mas cada fonte define os gatilhos aplicáveis. Se não houver progressão declarada, o efeito permanece estável.

### 11. Aflição representa um processo, não um tipo de dano

Aflição cobre doença, intoxicação, veneno persistente, corrupção e maldição progressiva. A exposição inicial pode causar dano, exigir resistência e criar a Aflição; esses resultados são separados. Remover um sintoma não cura o processo, e curar o processo remove apenas condições cuja única origem era aquela Aflição.

Esse desenho permite campanhas que ignorem doenças complexas e campanhas que ativem módulos detalhados sem alterar o núcleo das condições.

### 12. Controle de agência exige autorização explícita

Controlado mantém o papel mecânico atual, mas fontes não podem presumir ações diretamente autodestrutivas. Remover agência por longos períodos é uma consequência narrativa de alto impacto e precisa declarar esse alcance, comunicar o risco e estar vinculada a uma fonte expressa.

Esta proteção não torna o sistema menos perigoso: ela torna o perigo legível e permite que o jogador tome decisões informadas antes de perder controle do personagem.

### 13. Núcleo independente de interface

Regras, identificadores, exemplos, codecs e testes serão implementados em documentação e módulos de domínio puros. Nenhum componente de `app_streamlit/app/ficha.py`, `app_streamlit/app/sections/*`, `app_streamlit/app/forjador.py` ou estado Streamlit será alterado. Uma interface futura atuará como adaptador: apresentará dados e enviará decisões ao domínio, sem duplicar definições de condições ou codecs.

O catálogo estruturado usará JSON simples e identificadores sem referência a widgets, páginas ou sessão. O resolvedor puro receberá definições e aplicações e retornará efeitos ativos, operações compostas, origens e avisos; ele não lerá `st.session_state`. A documentação continuará normativa para que a aplicação não seja obrigatória.

### 14. Impacto sobre a experiência

- **Escassez:** Sangrando e consequências persistentes mantêm custo após o combate, mas a recuperação deixa de depender de interpretações improvisadas.
- **Risco de combate:** condições severas continuam perigosas; distinguir Incapacitado, Inconsciente e Morrendo reduz mortes causadas por confusão de termos.
- **Ritmo narrativo:** resultados imediatos não deixam marcadores desnecessários; consequências importantes permanecem como ganchos de tratamento e identidade.
- **Carga cognitiva:** a lista ganha Atordoado e Sangrando, porém perde exceções conceituais e duplicação. Rastrear múltiplas origens adiciona escrita somente quando ela muda o encerramento.
- **Diversão e agência:** Atordoado preserva uma escolha; Controlado recebe limites claros; consequências apresentam caminhos de mudança em vez de punições anônimas.
- **Transparência digital:** a ficha futura poderá mostrar qual condição ativou cada operação e quais origens ainda a mantêm, sem pedir ao jogador que replique a regra manualmente.
- **Personalização:** códigos autocontidos preservam itens e efeitos singulares criados pelo Narrador sem promovê-los a conteúdo global.

## Risks / Trade-offs

- **Rastrear aplicações por origem pode aumentar anotações** → Na ficha física, registrar detalhes somente quando houver fontes sobrepostas; uma interface futura poderá agrupar automaticamente.
- **Lista fechada pode parecer limitar criatividade** → Permitir nomes ficcionais, combinações de condições e efeitos adicionais explícitos; apenas a palavra-chave permanece estável.
- **Sangrando fixo em 1 PV pode ser leve ou severo conforme a escala** → Usá-lo como piso previsível; hemorragias excepcionais serão consequências que declaram sua diferença.
- **Aflições podem recriar subsistemas complexos** → Progressão é opcional e modular; o núcleo exige apenas campos e separação entre exposição, processo e sintoma.
- **Aliases podem perpetuar termos antigos** → Aceitá-los apenas na migração e exigir nomes atuais em conteúdo novo.
- **Duas mudanças ativas tratam consequências** → Reutilizar o modelo do núcleo de desgaste e validar os documentos em conjunto antes de arquivar qualquer uma.
- **A futura revisão de Descanso pode exigir novos estados de tratamento** → Manter o conjunto atual pequeno e extensível; novos estados exigirão mudança explícita, não campo informal.
- **Efeitos estruturados recebidos podem tentar declarar operações perigosas ou inválidas** → Usar vocabulário fechado, validação estrita e dados declarativos sem avaliação de código.
- **O catálogo local pode não conhecer uma associação default recebida** → Rejeitar ou apresentar a referência como ausente; somente efeitos externos incorporados são autocontidos.
- **E1/EQ1 não possuem semântica mecânica suficiente** → Mantê-los como conteúdo descritivo e reservar automação para E2/EQ2, sem inferir operações a partir de texto.
- **O forjador atual continua emitindo apenas formatos legados** → Entregar codec e contrato puros agora e registrar sua adaptação visual para uma futura interface, respeitando a decisão de não ampliar Streamlit.

## Migration Plan

1. Reescrever a seção de condições do documento normativo, mantendo os tipos de dano e sua matemática fora da reforma.
2. Atualizar Morte e Inconsciência para classificar Morrendo como derivado e preservar Inconsciente como condição vinculada ao estado.
3. Atualizar Defesa e o framework de criações para os nomes atuais, Desarmar como resultado e Atordoado/Sangrando como opções padronizadas.
4. Revisar referências em documentos e dados estruturados; aplicar aliases apenas onde conteúdo legado ainda não puder ser migrado imediatamente.
5. Evoluir `efeitos_default.json`, preservando entradas descritivas e cadastrando operações e associações oficiais das condições.
6. Centralizar codecs puros, manter leitura de E1/EQ1 e adicionar E2/EQ2 com validação declarativa e efeitos incorporados autocontidos.
7. Implementar resolução pura de efeitos e condições por aplicação e origem, reutilizando o núcleo de desgaste para consequências, sem tocar na aplicação Streamlit ou no forjador atual.
8. Adicionar testes para catálogo, codecs, operações, sobreposição, encerramento, aliases, condições vinculadas e referências default ausentes.
9. Executar simulações de mesa de controle, sangramento, múltiplas origens, Aflição, tratamento narrativo e equipamento privado importado.
10. Validar conjuntamente esta mudança e a reforma de Exaustão/Estresse para eliminar requisitos contraditórios.

Rollback documental pode restaurar os nomes antigos, mantendo aliases. E1/EQ1 nunca serão reescritos. Dados estruturados novos não deverão sobrescrever registros legados; se a mudança for revertida, campos desconhecidos poderão ser preservados sem uso até uma migração posterior.

## Open Questions

- A revisão futura de Descanso e Recuperação definirá quais atividades avançam tratamento e em qual ritmo.
- Uma futura tecnologia de ficha decidirá armazenamento, sincronização e visualização; o contrato de domínio não depende dessa escolha.
- Catálogos opcionais de exemplos de Ferimentos, Traumas e Aflições poderão ser propostos como módulos após playtests do núcleo aberto.
