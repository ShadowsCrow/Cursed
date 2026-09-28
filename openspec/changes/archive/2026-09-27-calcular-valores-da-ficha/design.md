# Design

## Context

Motivação e escopo estão em `proposal.md`; requisitos em `specs/`. Estado atual que molda a abordagem:

- **Ficha:** gravada inteira por `PUT /mesas/{m}/personagens/{p}/ficha` (`platform/api/cursed_api/sheets.py`), normalizada por `FichaDraft` (`cursed_platform/domain/ficha.py`). `personagem`, `personalidade`, `atributos` e `pericias` são dicionários livres; seções desconhecidas vão para `extras`, onde hoje mora `recursos`. Jogadores passam por `policies.avaliar_campos` (campos bloqueados e campos que exigem aprovação). Não há validação de domínio dos valores.
- **Valores derivados:** `ficha_viva.calcular_valores_derivados` já produz total e fontes para atributos, perícias e Defesa (esquiva e armadura), exibidos por `DerivedValueGroup`. É o mecanismo a estender.
- **Recursos:** PV e PP só aparecem quando a ficha traz `recursos.pv|pp = {atual, maximo, escala}` (decisão 7.1 da migração). `domain/descanso.py` lê a `escala` dali.
- **Catálogos:** `cursed_platform/domain/efeitos.py` lê `efeitos_default.json` de dentro de `app_streamlit/`. Classes e raças nunca chegaram à plataforma (pendências da migração 11.2).
- **Cartas:** definições por mesa (`card_definitions`), versões imutáveis, posse em `character_cards` com `origem` e ciclo em `cartas_ciclo.py`. A concessão com `excecao_aprendizado` cria habilidade já "aprendida".
- **Imagens:** leitura por `GET /mesas/{m}/ativos?caminho=` após `AutorizadorRecursos`; escrita só existe no servidor, pela interface `ArmazenamentoObjetos` (`ler`/`gravar`, local ou Supabase). O bucket `cursed-privado` só tem política de leitura para usuários. Pillow já valida imagens em `migracao_ativos.py`. `python-multipart` está instalado no ambiente, mas não declarado nas dependências.
- **Efeitos aplicados:** `EfeitoAplicadoRegistro` com `associacao` e `conteudo` JSON, sem campo de ícone. Aplicar efeito é `Acao.APLICAR_EFEITO`, reservada ao Narrador.
- **Carga:** o sistema não usa mais peso; `rules/sistema/Carga.md` ainda descreve kg. Nada de carga entra aqui.

## Goals / Non-Goals

**Goals:**
- Um único ponto de cálculo e um único ponto de validação da ficha, usados por todos os caminhos de gravação (edição, aprovação de pedido, importação, migração).
- Catálogos do sistema em JSON na plataforma, independentes de `app_streamlit/` e editáveis sem mexer em código.
- Envio de imagens intermediado pela API, sem abrir escrita no bucket para clientes.
- Mudanças de banco aditivas, com migração de dados em prévia antes de aplicar.

**Non-Goals:**
- Edição de catálogo do sistema por mesa ou por um editor dentro do sistema (classes, raças, efeitos default, listas). O usuário edita o JSON.
- Remoção física de imagens substituídas (ficam no armazenamento; limpeza é trabalho futuro).
- Mudanças no aplicativo Streamlit.

## Decisions

### D1. Catálogos do sistema como JSON parametrizável, com a cópia da plataforma como fonte
`classes.json`, `racas.json` e `efeitos_default.json` são copiados para `cursed_platform/catalogos/`. A partir da cópia, **esses arquivos são a fonte de trabalho** (decisão de 2026-09-27): o conteúdo de classes, raças e efeitos ainda está em desenvolvimento e o usuário o edita diretamente no JSON, sem editor dentro do sistema. A cópia do Streamlit fica congelada. As listas fixas da ficha (sexo, alinhamento e pecado com ícone, e a grafia equivalente `Ganancia`) vão para `listas_ficha.json` no mesmo diretório, em vez de ficarem em constantes no código.
- `manifesto.json` registra a procedência de cada arquivo copiado: origem, SHA-256 da origem no momento da cópia e data. Não há teste de igualdade com `app_streamlit/`: a divergência é esperada. Um comando de relatório mostra se a origem mudou desde a cópia, só como informação.
- `cursed_platform/catalogos.py` carrega, valida e indexa os catálogos (bases convertidas de `"12 + vigor"` para inteiro e atributo, com erro se o formato fugir de `N + atributo`). Frontend e backend leem listas e catálogos só por ele (pelas rotas de D6), sem duplicar valores.
- **Recarga sem reiniciar:** o módulo guarda a data de modificação de cada arquivo e o relê quando ela muda. Se o JSON novo for inválido, mantém a última versão válida, registra o erro no log e o expõe ao Narrador (`GET /catalogos/estado`). Se não houver versão válida ao subir, o servidor não sobe e mostra o erro.
- *Alternativa:* tabelas no banco. Rejeitada agora: os catálogos são do sistema, iguais para todas as mesas, e a edição é feita no arquivo. Quando houver edição dentro do sistema, a migração para tabelas parte desse formato.
- Efeitos cuja regra não vigora recebem `"suspenso": {"motivo": ...}` no catálogo da plataforma. O Sobrepeso legado permanece suspenso definitivamente: a Sobrecarga de `carga-por-espacos` é derivada da grade e não usa o registro antigo como efeito aplicável. A listagem e o disparo ignoram suspensos.

### D2. Dados na ficha
- `personagem`: `nivel` (int 1–20), `classe`, `arquetipo`, `raca` (nomes do catálogo, mantendo o formato legado), `tamanho` (somente exceção atual informada pelo Narrador para a grade; a base vem da raça), `idade`, `sexo`, `imagem_ativo`.
- `personalidade`: as chaves da ficha original (`alinhamento`, `pecado`, `coisa_favorita`, `odeia`, `quando_me_veem`, `manias`, `vivo_para`, `meu_lema`, `medo`, `valor_inquebravel`, `religiao`). Assim as fichas migradas aparecem sem conversão.
- `recursos`: `{pv: {atual}, pp: {atual}, ajustes: [{alvo, valor, origem, justificativa, autor_id, em}]}`. Máximos e Escalas **não são gravados**: são calculados na leitura. Valores `maximo`/`escala` legados em `recursos` são ignorados pelo cálculo e mostrados como divergência quando diferirem.
- *Alternativa:* gravar máximos calculados. Rejeitada: cria duas fontes de verdade e exige recálculo em lote quando o catálogo mudar.

### D3. Cálculo em módulo de domínio puro
`cursed_platform/domain/recursos.py` recebe ficha e catálogo e devolve PV inicial, PV máximo, Escala de PV e os equivalentes de PP, cada um com fontes (`classe`, `atributo`, `nivel`, `ajuste_narrador`) ou com `calculavel=False` e o motivo. O valor permanente do atributo é `valores + ajustes` da ficha, sem efeitos. O resultado entra em `GET /valores-derivados` num grupo novo `recurso`, para reaproveitar `DerivedValueGroup`. O contrato `ValorDerivadoResumo` ganha `calculavel`, `motivo` e `total` opcional; `FonteValorResumo.tipo` ganha `classe`, `nivel` e `ajuste_narrador`. `descanso.py` passa a ler as Escalas desse módulo.

### D4. Validação central e campos exclusivos do Narrador
`cursed_platform/domain/validacao_ficha.py` expõe `validar_ficha(anterior, nova, catalogos) -> list[ErroCampo]`. As regras são: limites de atributo e perícia, nível, idade, listas fixas, catálogo, arquétipo da classe e formato dos ajustes. **Só valida campos que mudaram**: fichas antigas irregulares continuam graváveis nos outros campos, e as irregularidades aparecem como avisos na leitura (`GET /ficha` ganha `avisos`). Erros viram `422` com o caminho do campo. A validação roda em `gravar_ficha`, na decisão de pedido, em `aplicar_importacao` e nos migradores.
- **Escopo (decisão de 2026-09-27):** a recusa vale só para fichas do tipo `personagem`. NPC e monstro não são recusados por limites nem por catálogo; `verificar` continua produzindo os avisos deles.
- `personagem.nivel` e `recursos.ajustes` entram numa lista fixa de campos exclusivos do Narrador, avaliada antes da política da mesa: o jogador recebe `403` mesmo que a mesa libere edição.
- `personagem.tamanho`, quando usado como exceção à raça, também é exclusivo do Narrador. Uma troca de `personagem.raca` com `tamanho` preenchido exige que o mesmo comando limpe o campo ou registre sua reconfirmação; o servidor recusa uma troca silenciosa que mantenha a exceção antiga.
- Na mesma transação da gravação: quando um máximo recalculado ficar abaixo do atual, o atual é limitado; num personagem novo, o atual nasce igual ao máximo. Os dois ajustes entram no evento de auditoria da gravação.
- *Alternativa:* validar no modelo Pydantic do contrato. Rejeitada: o contrato não conhece o catálogo nem a ficha anterior, e recusaria fichas legadas inteiras.

### D5. Habilidades de catálogo como cartas por mesa
- **Materialização:** na primeira vez que uma classe, arquétipo ou raça é usada numa mesa, o servidor cria e publica as cartas de habilidade correspondentes no catálogo da mesa (`titulo`, `texto`, `ativacao` a partir de `tipo`, custos vazios, tags `classe:<nome>`/`arquetipo:<nome>`/`raca:<nome>`). É idempotente por uma nova coluna `card_definitions.origem_sistema` (ex.: `classes/Druida/habilidades/Forma Selvagem`, pela chave do nome e não pela posição, para que reordenar o JSON não troque cartas), única por mesa. Placeholders são ignorados.
- **Concessão:** ao gravar classe, arquétipo ou raça, o servidor concede as cartas com `excecao_aprendizado=True`. A nova coluna `character_cards.concedida_por` (ex.: `classe:Druida`) permite remover só as cartas da escolha anterior numa troca. Cartas obtidas por oferta ficam intocadas.
- **Sincronização com o JSON — o JSON sempre prevalece** (decisão de 2026-09-27). Quando o catálogo é recarregado (D1) ou o servidor sobe, cada mesa com cartas materializadas é conferida:
  - habilidade com texto ou ativação diferente → nova versão publicada com o conteúdo do JSON, mesmo que o Narrador tenha editado a carta; as posses com `concedida_por` passam para a nova versão;
  - habilidade nova → carta materializada e concedida aos personagens daquela classe, arquétipo ou raça;
  - habilidade removida → carta arquivada e posses com `concedida_por` removidas.
  Cada operação entra na auditoria com autor "sistema". A conferência compara o conteúdo, e por isso repetir não gera versões. O editor da carta avisa o Narrador de que a edição será substituída na próxima atualização do JSON.
- *Alternativa:* uma biblioteca global de cartas do sistema. Rejeitada: o modelo de cartas é por mesa (visibilidade, versões, auditoria), e duplicar o texto por mesa custa pouco.
- Suposição registrada: o catálogo não traz nível por habilidade; indicações de nível no texto são progressões da própria habilidade. A concessão não depende do nível.

### D6. Efeitos default: listagem, aplicação e permissão do jogador
- As rotas ficam em `/mesas/{m}/catalogos/...`: o catálogo é igual para todas as mesas, mas só participantes consultam, e a lista de efeitos traz o ícone resolvido daquela mesa.
- `GET /catalogos/efeitos-default` (qualquer participante) devolve grupos, nome, descrição, modificadores, substituições e ícone resolvido, sem suspensos. `GET /catalogos/classes`, `GET /catalogos/racas` e `GET /catalogos/listas-ficha` servem as listas da ficha. `GET /catalogos/estado` informa ao Narrador a versão carregada e o último erro de recarga.
- Aplicação continua em `aplicar_efeito` do Narrador. Para o jogador, uma nova ação `Acao.APLICAR_EFEITO_PADRAO_PROPRIO` exige ser dono do personagem, mesa com `permitir_edicao_propria` e efeito default (com `associacao` do catálogo); modificadores e texto vêm só do catálogo. O encerramento segue a mesma regra.
- A substituição é aplicada no domínio: ao aplicar Cego, Ofuscado ativo é encerrado na mesma transação, com dois eventos de auditoria.

### D7. Envio de imagens pela API
- `PUT /mesas/{m}/imagens/{destino}` com `multipart/form-data` (arquivo, referência do alvo e `versao_esperada`) e `DELETE` equivalente. Destinos: `retrato`, `item` (arte do item de inventário), `icone-grade` (item de inventário ou carta de item), `efeito`, `carta` (arte da carta), `mapa` e `icone-efeito`. `python-multipart` entra em `cursed_platform/requirements.txt`.
- O servidor autoriza por destino e alvo: dono do personagem com edição permitida para item de inventário, ou Narrador para carta de item. Valida com as rotinas de `migracao_ativos.py` (assinatura, formato, limite de pixels) e com o limite de bytes do destino (5/5/5/5/8/15/5 MB, na ordem acima). Depois grava pelo `ArmazenamentoObjetos` em caminho por visibilidade: `personagens/{p}/imagens/`, `narrador/cartas/`, `mesa/mapas/` e `mesa/icones-efeitos/`, com nome pelo hash do conteúdo. Arte e ícone de grade têm referências independentes (`imagem_ativo` e `icone_grade` no formato do item); trocar ou remover uma não altera a outra. Por fim atualiza só a referência do ponto escolhido e registra a auditoria sem o conteúdo.
- **Versão de exibição:** para retrato, item, efeito e ícone, o servidor gera com Pillow uma cópia WEBP com o maior lado de 256 px (512 px para retrato) ao lado da original. A leitura usa a versão de exibição quando existe.
- *Alternativa:* envio direto do navegador ao Supabase com políticas de escrita por caminho. Rejeitada: espalharia autorização e validação entre RLS e API, e o volume (até 15 MB) cabe no servidor.

### D8. Ícones de efeitos
- Ativos do sistema em `platform/frontend/public/icones/efeitos/`: `padrao.webp` (a partir do PNG do usuário, com a original preservada em `docs/ativos/`) e `cc_above.webp`. O catálogo referencia o ícone por nome.
- Nova tabela `effect_icons (mesa_id, associacao, objeto, atualizado_em)` para ícones da mesa. Ícone de efeito personalizado fica em `conteudo.imagem_ativo` do efeito.
- O servidor resolve a precedência (mesa → catálogo → padrão) e devolve em `EfeitoResumo.icone = {origem, caminho}`. O frontend troca os símbolos por posição por `<img alt="">` com o nome do efeito como texto acessível.

### D9. Interface
- **Aba Informações:** selects de classe, arquétipo (filtrado) e raça, idade, sexo, nível (só o Narrador edita), conceito do arquétipo e cor da classe no cabeçalho (com o nome sempre escrito). Valores fora do catálogo aparecem com aviso e ação "vincular". O Tamanho base da raça aparece com sua origem; o Narrador pode informar uma exceção atual e, ao trocar a raça, deve limpá-la ou reconfirmá-la.
- **Aba Personalidade:** selects de alinhamento e pecado (com ícone) e os nove campos de texto, com as dicas da ficha original.
- **Atributos e perícias:** `min`/`max` nos campos, erro junto ao campo e salvar desabilitado.
- **Cabeçalho:** "Pontos de Propósito"; PV/PP com detalhe das fontes; estado "não calculável" com o motivo; ajuste do Narrador em diálogo com origem e justificativa.
- **Efeitos:** lista agrupada de efeitos default com prévia e aviso de substituição; botão para o jogador no próprio personagem quando permitido.
- **Imagens:** um componente de envio reutilizado no retrato, itens, efeitos, editor de cartas, cenas da sala e ícones.

### D10. Efeito no jogo
- **Escassez e risco:** PV e PP máximos corretos e visíveis tornam a escassez honesta. A mesa passa a ver quanto falta de verdade, sem máximos esquecidos após subir de nível.
- **Ritmo narrativo:** condições aplicadas por lista e pelo próprio jogador cortam a pausa para achar códigos ou pedir ao Narrador. Cartas de classe prontas evitam consultar o catálogo na cena.
- **Carga cognitiva:** o Narrador deixa de fazer contas de PV e PP e de conferir limites de atributos. As fontes visíveis mantêm o entendimento sem exigir conferência.
- **Interações:** o descanso usa as Escalas calculadas; o limite do atual acompanha o descanso; as condições entram no cálculo de valores derivados como os demais efeitos; as cartas de classe convivem com ofertas e aprendizado.

## Risks / Trade-offs

- [Jogador aplica condição indevida ao próprio personagem] → Só efeitos default, só no próprio personagem, com política da mesa e histórico; o Narrador encerra a qualquer momento.
- [Troca de classe no meio da sessão remove cartas em uso] → A tela confirma listando as cartas que saem e entram; as cartas de oferta não são tocadas; a troca fica no histórico e pode ser corrigida.
- [Fichas antigas irregulares bloqueando gravações] → Validação só dos campos alterados; irregularidades viram avisos na leitura.
- [Catálogo da plataforma divergir da origem] → Esperado: a cópia é a fonte de trabalho. O manifesto guarda o hash da origem na cópia, e o relatório de procedência mostra a diferença sem bloquear.
- [JSON editado com erro derruba a mesa] → A recarga mantém a última versão válida e mostra o erro ao Narrador; só a subida sem nenhuma versão válida falha.
- [Sincronização sobrescreve edição do Narrador numa carta de catálogo] → Decisão do usuário: o JSON prevalece. O editor avisa antes, e a versão anterior continua no histórico.
- [Imagens substituídas acumulam no armazenamento] → Nome por hash evita duplicatas. A limpeza de órfãos fica como trabalho futuro registrado.
- [Upload grande pesa no servidor] → Limite de bytes checado antes de decodificar; limite de pixels contra bombas de descompressão já existente.
- [Ajuste sem limite numérico] → Todo ajuste exige origem e fica visível nas fontes; o Narrador é responsável pelo valor.
- [Nível 1 em fichas migradas mostra números baixos para personagens avançados] → Decisão do usuário. O aviso "nível definido pela migração" aparece até o Narrador confirmar o nível.

## Migration Plan

1. **Alembic `0017_ficha_completa` (a 0016 ficou com `carga-por-espacos`):** `card_definitions.origem_sistema` (+ índice único por mesa), `character_cards.concedida_por`, tabela `effect_icons` com RLS e `REVOKE` para `anon`/`authenticated` no PostgreSQL, como as demais. Downgrade remove os três.
2. **Catálogos:** copiar os três JSON com manifesto e criar `listas_ficha.json`; `domain/efeitos.py` passa a ler de `cursed_platform/catalogos/`.
3. **Backend e contrato:** exportar OpenAPI e regenerar o cliente TypeScript.
4. **Migração de dados** (`platform/migration/completar_fichas.py`, prévia por padrão e `--aplicar`, por mesa):
   - nível `1` onde faltar e PV/PP atuais iguais aos máximos calculados;
   - `Ganancia` lido como `Ganância`;
   - classe, arquétipo e raça vinculados quando o nome coincide exatamente (após normalizar maiúsculas e espaços), senão mantidos e sinalizados; Tamanho explícito igual à base racial pode ser limpo, e divergência fica sinalizada para confirmação do Narrador, sem inferir o motivo;
   - materialização e concessão das cartas de classe;
   - pendências de classes e raças de `migracao_json` resolvidas, com o relatório de equivalência reexecutado.
5. **Frontend** por último. As telas novas só aparecem com o contrato novo.
6. **Rollback:** reverter o deploy e a `0017`. Os dados da ficha são aditivos (campos novos ignorados pela versão anterior); cartas materializadas ficam como cartas comuns da mesa.

Arquivos e dados que precisam de migração: fichas (`characters.ficha`), `card_definitions`, `character_cards`, `effect_icons`, `app_streamlit/data/catalogs/*.json` (copiados), `app_streamlit/data/assets/effects-icons/default/cc_above.png` e o ícone padrão do usuário.

## Decisões confirmadas (2026-09-27)

Eram provisórias; o usuário confirmou todas, com as correções indicadas:
- Catálogo de classes, raças e efeitos é do sistema, igual para todas as mesas, e **parametrizável por JSON**: o usuário edita os arquivos de `cursed_platform/catalogos/` diretamente, eles valem sem reiniciar o servidor e o JSON prevalece sobre as cartas materializadas (D1, D5). Não haverá editor de catálogo dentro do sistema.
- Valor permanente de Atributo = valor base + ajuste da ficha; efeitos nunca contam. A ficha já grava base (`valores`) e ajuste (`ajustes`) separados dos efeitos.
- `maximo`/`escala` antigos em `recursos` são ignorados pelo cálculo e mostrados como divergência.
- A biblioteca `efeitos_externos_lib.json` fica fora.
- A distribuição inicial de pontos (15 em Atributos, 13 em Perícias) não é validada; só os limites.
- O ajuste de Atributo e Perícia não tem limite numérico; o ajuste de PV/PP exige origem.
- `Ganancia` é aceita e exibida como `Ganância`.
- Listas de sexo, alinhamento e pecado são do sistema, em `listas_ficha.json`, sem ajuste por mesa.
- Ícones, retratos e imagens de itens ganham versão reduzida de exibição.
- Ícone enviado pelo Narrador para efeito default vale só na mesa dele.

## Open Questions

- A calibração de `carga-por-espacos` define os números finais da grade e a redação da regra. O Sobrepeso legado continua suspenso; o campo de peso antigo não participa de cálculos nesta mudança.
