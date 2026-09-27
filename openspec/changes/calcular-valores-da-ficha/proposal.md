# Proposal

## Why

A ficha da plataforma nova ainda não substitui a ficha original na mesa. Faltam coisas que a ficha do Streamlit oferecia: classes, arquétipos e raças escolhidos de catálogo, envio de imagens e efeitos default à mão. Regras do sistema também deixaram de ser respeitadas: valores definidos por fórmula, como PV, PP e Escalas, são preenchidos à mão, e os limites de Atributos e Perícias não são verificados. O resultado são fichas desatualizadas ou fora das regras, tempo de cena gasto com conta e consulta a códigos, e números em que a mesa não pode confiar sem conferir.

A ficha deve fazer o que a original fazia, aplicar as regras escritas e mostrar de onde vem cada valor.

Classificação: **núcleo**. Os itens representam regras que valem para todo personagem, sem depender de módulos opcionais. A aplicação representa as regras de `rules/sistema` e não as altera.

Esta proposta é incremental: cada item pedido pelo usuário entra na lista abaixo antes de ser detalhado em specs, design e tarefas.

## What Changes

### Item 1 — PV, PP e Escalas calculados automaticamente

Validação do sistema antigo (2026-09-26): a ficha do Streamlit **não tinha PV, PP nem nível**. Ela salvava personagem, personalidade, atributos, perícias, armas, armaduras, outros e efeitos externos (`sections/resumo.py`). `classes.json` traz `PV`, `Escala_PV`, `PP` e `Escala_PP` em todas as 9 classes (as 36 fórmulas seguem o padrão `N + Vigor` ou `N + Propósito`), mas nenhum código do Streamlit lê esses campos; a classe servia só para cor, arquétipos e habilidades. Na plataforma nova, a decisão 7.1 do design da migração deixou PV e PP sem fórmula: a ficha só exibe `recursos` quando já existem, e não há campo de nível nem forma de registrar PV ou PP. Portanto este item é comportamento novo, derivado das regras, e não uma recuperação da ficha original.

- Adicionar à ficha o **nível** do personagem, de `1` a `20`, definido pelo Narrador, conforme `Progressão e Proficiência.md`.
- Ao criar o personagem, iniciar PV e PP atuais iguais aos máximos, conforme `Criação de Personagem.md`.

- Calcular PV inicial, Escala de PV, PP inicial e Escala de PP a partir das bases da classe e dos valores permanentes de Vigor e Propósito, conforme `Criação de Personagem.md`.
- Calcular PV máximo e PP máximo pelo nível, conforme `Progressão e Proficiência.md`:
  - `PV máximo = PV inicial + (nível - 1) x Escala de PV`
  - `PP máximo = PP inicial + piso(nível / 2) x Escala de PP`
- Recalcular automaticamente quando mudarem classe, nível, Vigor ou Propósito permanentes. Efeitos temporários não alteram os máximos, salvo regra expressa.
- Preservar os valores atuais: o aumento do máximo não recupera PV ou PP gastos. Quando o máximo diminuir, o atual é limitado ao novo máximo.
- Tornar a classe, com suas quatro bases, um dado disponível à plataforma, a partir do catálogo existente (`app_streamlit/data/catalogs/classes.json`). As bases são convertidas sem inferir valores ausentes. Classe sem base registrada deixa o valor como **não calculável**, em vez de estimá-lo.
- Mostrar cada valor com suas fontes (base da classe, atributo, nível), seguindo o requisito "Automação explicável" da ficha viva.
- Permitir que o Narrador registre um ajuste com origem e justificativa quando uma regra específica de raça, classe ou campanha prevalecer. O ajuste aparece como fonte adicional e fica no registro de auditoria.
- Corrigir o nome do recurso na interface de **"Pontos de Poder"** para **"Pontos de Propósito"**, como está nas regras.

### Item 2 — Classes, arquétipos e raças do sistema original

Na ficha original (`app_streamlit/app/sections/info_basica.py` e `habilidades.py`), classe, arquétipo e raça eram escolhidos de catálogos. Na plataforma nova são campos de texto livre, e a migração de dados deixou `classes.json` e `racas.json` como pendências explícitas. Sem esses catálogos, a ficha não sabe o que a classe ou a raça significam, e o Item 1 não tem de onde tirar as bases.

- Levar para a plataforma os catálogos de classes (nome, cor, quatro bases de PV/PP, habilidades e arquétipos) e de raças (nome, deslocamento, tamanho e habilidades). A origem são `app_streamlit/data/catalogs/classes.json` e `racas.json`, com procedência registrada e sem inferir campos ausentes.
- O Tamanho da raça é a base da grade de `carga-por-espacos`. Um Tamanho atual informado pelo Narrador na ficha é uma exceção explícita; na troca de raça, ele precisa ser limpo ou reconfirmado, para não ocultar sem querer a nova base racial.
- Na ficha, escolher classe, arquétipo (entre os da classe escolhida) e raça a partir do catálogo, em vez de texto livre. Mostrar o conceito do arquétipo e a cor da classe como na ficha original.
- Transformar as habilidades da classe, do arquétipo e da raça em cartas de habilidade da mesa, concedidas já aprendidas ao escolher a classe, o arquétipo ou a raça, como habilidades automáticas. Habilidades marcadas como placeholder não viram carta, conforme `Criação de Personagem.md`. Hoje as 9 raças só têm habilidade placeholder.
- Fichas existentes com classe, arquétipo ou raça em texto que não corresponda ao catálogo continuam legíveis. O valor fica sinalizado para o Narrador vincular, sem troca automática.
- A troca de classe, arquétipo ou raça recalcula os valores que dependem dela (Item 1).

### Item 3 — Envio de imagens

O sistema original deixava carregar imagens: retrato do personagem (`sections/retrato.py`, PNG/JPG/WEBP) e imagem de efeitos externos (`forjador.py`), guardadas como Base64 na ficha e em itens e efeitos. A plataforma nova só exibe imagens que vieram da migração. Nenhuma tela tem envio de arquivo, a API de ativos só faz leitura e o bucket privado não aceita gravação por usuários. Sem isso, um personagem novo não tem retrato, e cartas, efeitos e mapas de cena não recebem arte.

- Permitir enviar e trocar imagem nos pontos que a ficha original tinha: retrato do personagem e imagem de efeitos externos. Estender aos itens, que também tinham imagem nas fichas migradas. Para um item do inventário ou carta de item, a arte e o ícone de grade são referências independentes, como exige `carga-por-espacos`.
- Permitir enviar a arte das cartas no editor do Narrador. Hoje só existe a arte migrada e a promoção dela ao publicar.
- Permitir enviar o mapa de uma cena da sala. A cena já tem referência de mapa (`mapa_objeto`), mas nada para preenchê-la.
- Guardar as imagens no bucket privado, nos caminhos de visibilidade já definidos (mesa, narrador, personagem), e nunca como Base64 dentro da ficha.
- Validar formato, tamanho e integridade no servidor, como a migração de ativos já faz, com mensagem clara quando a imagem for recusada.
- Respeitar as permissões atuais: o jogador troca o retrato e as imagens do próprio personagem quando a política da mesa permitir a edição; cartas, mapas e conteúdo do Narrador são só do Narrador.
- Registrar a troca de imagem no histórico de auditoria, sem gravar a imagem no evento.

### Item 4 — Efeitos default disponíveis na mesa

Os efeitos default (`efeitos_default.json`: as 17 condições de `Condições e Tipos de Dano.md` e o Sobrepeso) já são lidos pelo servidor. Na mesa, porém, o Narrador precisa digitar o código de associação (por exemplo `condicao_derrubado`) num campo de texto para aplicar um deles. Nenhuma rota lista o catálogo, e o Sobrepeso, que no sistema original ligava sozinho pela capacidade de carga (gatilho `cc_above`), não dispara mais. Como são padrão do sistema, esses efeitos devem estar à mão sem que ninguém precise conhecê-los por código.

- Listar os efeitos default na API e na tela de aplicar efeito, agrupados como nas regras (abertura e mobilidade, sentidos e comunicação, capacidade, exposição e controle, sistêmicos), com nome, descrição e modificadores visíveis antes de aplicar.
- Aplicar um efeito default escolhendo-o da lista, sem digitar código. O Narrador aplica em qualquer personagem; o jogador aplica e encerra efeitos default no próprio personagem quando a política da mesa permitir que ele edite a ficha.
- Respeitar a substituição declarada no catálogo (por exemplo, Cego substitui Ofuscado) e mostrar essa relação ao aplicar.
- **Sobrepeso (`cc_above`) é legado e não volta a ser aplicado.** No sistema original, ele ligava pelo peso carregado. O usuário informou em 2026-09-26 que o sistema não trabalha mais com peso. Esta mudança mantém o registro antigo suspenso para preservar a procedência, sem listá-lo nem dispará-lo. `carga-por-espacos` introduz a **Sobrecarga derivada, em um só nível**, quando houver item na área vermelha. O código `cc_above` identifica apenas o ativo visual reaproveitado; não reativa a regra antiga. Nenhum cálculo de carga entra nesta mudança.
- Levar o catálogo de efeitos default para os dados da plataforma, com procedência, para que ele não dependa da pasta `app_streamlit/`, que será aposentada.

### Item 5 — Limites de Atributos e Perícias

As regras definem limites que a ficha original respeitava e a plataforma nova não verifica. Em `Criação de Personagem.md`, a distribuição inicial dá a todo Atributo pelo menos `1`. Em `Progressão e Proficiência.md`, "o limite normal de um Atributo é `5`" e o limite comum de uma Perícia também é `5`. A ficha original travava o Atributo base entre `1` e `5` (`sections/atributos.py`). Na plataforma nova, a tela só confere se o valor é inteiro, e o servidor aceita qualquer valor em `atributos` e `pericias`. Hoje é possível salvar Força `0` ou `9` sem aviso.

- Validar no servidor, em toda gravação da ficha (edição direta, pedido de alteração aprovado, importação e migração), que o valor base de cada Atributo fica entre `1` e `5`.
- Validar que o valor base de cada Perícia fica entre `0` e `5`, conforme as regras. A ficha original permitia até `10`; vale a regra atual.
- Valores acima do limite só por ajuste com origem declarada (bônus temporário ou regra específica), nunca no valor base. O total mostra base e ajustes separados, como a aba de atributos já faz.
- Mostrar os limites na tela antes de salvar (campo com mínimo e máximo e mensagem junto ao campo), e não só depois da recusa do servidor.
- Fichas existentes com valores fora dos limites continuam legíveis e ficam sinalizadas para o Narrador corrigir. Nenhum valor é alterado automaticamente.

### Item 6 — Informações básicas e personalidade completas

A ficha original (`sections/info_basica.py` e `sections/personalidade.py`) tinha campos que a plataforma nova não mostra, e usava listas fixas onde a plataforma aceita texto livre. As informações básicas da plataforma só têm nome, raça, classe e arquétipo, todos em texto. A personalidade só tem alinhamento, pecado e lema, também em texto. As fichas migradas preservam esses dados, mas a tela não os exibe nem permite editá-los.

- Informações básicas:
  - **Idade**: número inteiro, mínimo `0`.
  - **Sexo**: lista fixa `Masculino`, `Feminino`, `Outro`, podendo ficar vazio.
  - **Raça**: escolhida da lista de `racas.json`, conforme o Item 2, e não mais em texto livre.
- Personalidade:
  - **Alinhamento**: lista fixa de 9 opções (`Leal | Bom`, `Neutro | Bom`, `Caótico | Bom`, `Leal | Neutro`, `Neutro | Neutro`, `Caótico | Neutro`, `Leal | Mal`, `Neutro | Mal`, `Caótico | Mal`).
  - **Pecado Capital**: lista fixa de 7 opções (Ira, Gula, Ganância, Luxúria, Inveja, Preguiça, Orgulho), cada uma com seu ícone, como na ficha original.
  - **Campos de texto**: Coisa favorita, O que odeia, Quando me veem pensam que, Manias ou hábitos, Vivo para, Meu lema, Medo ou fobia, Valor inquebrável e Religião ou crença, com os exemplos da ficha original como dica de preenchimento.
- Validar as listas fixas no servidor, e não só na tela.
- Fichas existentes com valor fora da lista (por exemplo, um alinhamento escrito à mão) continuam legíveis e ficam sinalizadas para correção, sem troca automática.
- Os novos campos seguem as permissões de edição da mesa e o registro de auditoria, como os demais campos da ficha.

### Item 7 — Ícones de efeitos

Os efeitos têm ícones próprios no estilo visual do jogo: quadro quadrado de cantos arredondados, moldura dourada e pintura escura e luminosa. O ícone do Sobrepeso (`cc_above`), um fardo acorrentado sobre uma figura curvada, está em `app_streamlit/data/assets/effects-icons/default/cc_above.png`. A plataforma nova não exibe nenhum desses ícones: cada efeito recebe um símbolo decorativo escolhido pela posição na lista (`EffectsPanel.tsx`), então o mesmo efeito pode aparecer com símbolos diferentes e não é reconhecível de relance.

- Mostrar o ícone de cada efeito na faixa de estado ativo, no painel de efeitos e na lista de aplicação (Item 4), no lugar dos símbolos decorativos.
- **Ícone padrão:** efeito sem ícone próprio mostra o ícone padrão de interrogação, na mesma moldura dourada sobre fundo azul-noite. O usuário forneceu a imagem (PNG de 1254 x 1254) em 2026-09-26, e ela precisa ser incorporada ao repositório como ativo do sistema.
- **Ícones do catálogo:** as 17 condições começam com o ícone padrão até receberem ícones próprios. O ícone `cc_above.png` é preservado como ativo e reaproveitado pela Sobrecarga derivada de `carga-por-espacos`; isso não reativa o Sobrepeso.
- **Envio pelo Narrador:** o Narrador pode enviar o ícone que quiser para um efeito, tanto os efeitos personalizados da mesa quanto os efeitos default, usando o envio de imagens do Item 3. Sem ícone enviado, vale o do catálogo e, na falta dele, o padrão.
- O ícone enviado pelo Narrador para um efeito default vale só na mesa dele e não altera o catálogo do sistema.
- O ícone é complementar: o nome do efeito continua disponível como texto para leitores de tela e no detalhe do efeito.

## Non-goals

- Alterar fórmulas, bases de classe ou tabelas de progressão de `rules/sistema`.
- Registrar dano, cura e gasto de PV/PP durante a sessão. É um fluxo relacionado, a propor em outro item ou mudança.
- Definir como se ganha experiência ou quando o personagem sobe de nível. O nível continua sendo definido pelo Narrador.
- Calcular automaticamente os demais valores (Bônus de Proficiência, Pontos de Evolução, deslocamento) antes de cada um ser pedido e registrado como item desta proposta. A Defesa já é calculada pela plataforma.
- Qualquer regra ou cálculo de carga, peso ou capacidade. O sistema não trabalha mais com peso, e a regra vigente de carga ainda precisa ser escrita em `rules/sistema`.
- Controlar a concessão de habilidades pelo nível. O catálogo não tem o nível de cada habilidade em campo próprio; as indicações de nível estão dentro do texto e são tratadas como progressões da própria habilidade.
- Reescrever ou completar o texto das habilidades de classe, arquétipo ou raça do catálogo original.
- Alterar o aplicativo Streamlit.
- Editar classes, raças, efeitos default ou listas da ficha dentro da aplicação. O usuário edita o JSON diretamente (decisão de 2026-09-27).
- Dar efeito mecânico a alinhamento, pecado capital ou demais campos de personalidade; eles continuam narrativos, como na ficha original.
- Editar imagens no navegador (recorte, filtros) ou gerá-las automaticamente.
- Produzir os ícones próprios das 17 condições; até existirem, elas usam o ícone padrão.
- Alterar condições, modificadores ou substituições do catálogo de efeitos default; ele continua espelhando `Condições e Tipos de Dano.md`.

## Capabilities

### New Capabilities

- `calculo-de-valores-da-ficha`: Cálculo automático e explicável dos valores da ficha definidos por fórmula nas regras, com entradas, fontes, recálculo, estado não calculável e ajuste do Narrador. Começa com PV, PP e Escalas e recebe os próximos itens.
- `envio-de-imagens`: Envio, troca e remoção de imagens de retrato, itens, efeitos, cartas e mapas de cena, com validação no servidor, armazenamento privado por visibilidade, permissões e auditoria.
- `efeitos-default-na-mesa`: Catálogo de efeitos default listado e aplicável por escolha, com substituições e dados próprios da plataforma.
- `limites-de-atributos-e-pericias`: Validação no servidor e na tela dos limites de valor base de Atributos (1 a 5) e Perícias (0 a 5), ajustes acima do limite só com origem, e sinalização de fichas existentes fora dos limites.
- `identidade-e-personalidade-do-personagem`: Campos de informações básicas (idade, sexo, raça de catálogo) e de personalidade (alinhamento, pecado capital e campos narrativos), com listas fixas validadas no servidor e sinalização de valores fora da lista.
- `icones-de-efeitos`: Ícone estável por efeito na ficha e na mesa, com precedência entre ícone enviado pelo Narrador (por mesa), ícone do catálogo e ícone padrão de interrogação.
- `catalogo-de-classes-e-racas`: Classes, arquétipos e raças como catálogo da plataforma, com escolha na ficha, exibição de habilidades, vínculo de fichas antigas e procedência do catálogo original.

### Modified Capabilities

Nenhuma arquivada. Esta mudança depende do requisito "Automação explicável" da capacidade `ficha-viva`, ainda em andamento na mudança `migrar-para-plataforma-rpg-colaborativa`.

## Impact

- Domínio: novo cálculo em `cursed_platform` ao lado de `ficha_viva.calcular_valores_derivados`, que já apresenta total e fontes.
- Dados: catálogos de classes, arquétipos e raças na plataforma, migrados de `classes.json` e `racas.json`. Isso resolve as pendências de classes e raças da migração (tarefa 11.2 de `migrar-para-plataforma-rpg-colaborativa`). Fichas existentes com valores manuais divergentes, ou com classe e raça em texto fora do catálogo, precisam de tratamento de migração.
- API e contrato: valores calculados e suas fontes na leitura da ficha, e comando de ajuste do Narrador. Cliente TypeScript regenerado.
- Interface: cabeçalho da ficha (PV/PP com fontes, cor da classe), escolha de classe, arquétipo e raça no lugar dos campos de texto, exibição de habilidades, aba de atributos, textos de recurso e testes que usam "Pontos de Poder".
- Armazenamento: nova permissão de gravação controlada no bucket `cursed-privado`, ou envio intermediado pela API; hoje só há política de leitura (migração `0007_acesso_privado`). Reaproveita a validação de `cursed_platform/migracao_ativos.py` (Pillow).
- Efeitos: nova rota de leitura do catálogo default, tela "Aplicar efeito" em `EffectsPanel.tsx` e `cursed_platform/domain/efeitos.py`, que hoje lê `app_streamlit/data/catalogs/efeitos_default.json`.
- Validação da ficha: `FichaContrato` (hoje `atributos` e `pericias` são `dict[str, Any]` sem regra), os caminhos de gravação (edição, aprovação de pedido, importação, migração) e `AttributeTable.tsx`.
- Ficha: abas "Informações" e "Personalidade" de `CharacterSheetPage.tsx`, `fichaAccess.ts` e o contrato da ficha para os novos campos e listas.
- Ativos do sistema: ícone padrão e `cc_above.png` passam a ser ativos da plataforma, fora de `app_streamlit/`. Componentes `EffectsPanel.tsx`, `ActiveStateStrip.tsx` e `EffectIcon`.
- Descanso: `domain/descanso.py` passa a ler Escalas calculadas em vez de valores digitados.

## Decisões confirmadas

- **2026-09-26 — Cálculo de PV e PP segue a regra, do nível 1 aos demais.**
  - Nível 1 (`Criação de Personagem.md`): PV inicial = base de PV da classe + Vigor; PP inicial = base de PP da classe + Propósito; Escala de PV = base de Escala de PV + Vigor; Escala de PP = base de Escala de PP + Propósito.
  - Níveis seguintes (`Progressão e Proficiência.md`): a cada nível alcançado, o PV máximo aumenta uma Escala de PV; nos níveis pares, o PP máximo aumenta uma Escala de PP. Equivale a `PV máximo = PV inicial + (nível - 1) x Escala de PV` e `PP máximo = PP inicial + piso(nível / 2) x Escala de PP`.
  - Verificação de aceite: Mago com Vigor 3 e Propósito 2 tem PV 15, PP 10, Escala de PV 5 e Escala de PP 7 no nível 1; no nível 5, PV máximo 35 e PP máximo 24.

- **2026-09-26 — `classes.json` é a fonte oficial das bases de classe.** `app_streamlit/data/catalogs/classes.json` define, para cada classe, o PV e o PP iniciais (`PV`, `PP`) e como eles escalam (`Escala_PV`, `Escala_PP`). `rules/sistema` não tem documento de classes, e não é preciso escrevê-lo antes de implementar. A migração do catálogo preserva esses valores exatamente, com procedência.

- **2026-09-26 — Respostas do usuário antes do design.**
  - Fichas migradas começam no nível `1`, com PV e PP atuais iguais aos máximos; o Narrador corrige o nível depois.
  - Habilidades de classe, arquétipo e raça viram cartas de habilidade da mesa.
  - Narrador e jogador aplicam condições default; o jogador só no próprio personagem e conforme a política de edição da mesa.
  - Limites de imagem: retrato, item, efeito e ícone até 5 MB; arte de carta até 8 MB; mapa até 15 MB; PNG, JPG e WEBP.
- **2026-09-26 — O sistema não trabalha mais com peso.** Nenhuma regra ou cálculo de carga entra nesta mudança; a calibração e a redação da carga pertencem a `carga-por-espacos`.

- **2026-09-27 — Decisões provisórias do design confirmadas, com correções.**
  - Classes, raças, efeitos default e as listas de sexo, alinhamento e pecado ficam **parametrizáveis por JSON**, porque muito desse conteúdo ainda está em desenvolvimento. A cópia em `cursed_platform/catalogos/` é a fonte de trabalho até classes e raças ficarem prontas; a do Streamlit fica congelada, e a divergência entre as duas é esperada.
  - A alteração salva no JSON vale sem reiniciar o servidor. JSON inválido mantém a última versão válida e mostra o erro ao Narrador.
  - O JSON sempre prevalece sobre as cartas de habilidade materializadas nas mesas, inclusive sobre edições do Narrador.
  - Não haverá editor de catálogo dentro do sistema: o usuário edita o JSON diretamente.
  - Confirmados sem alteração: valor permanente = base + ajuste da ficha, sem efeitos (a ficha já separa os dois); `maximo`/`escala` antigos ignorados pelo cálculo e mostrados como divergência; só limites validados, sem conferir a distribuição inicial; ajuste de Atributo e Perícia sem limite numérico e ajuste de PV/PP com origem; `Ganancia` aceita e exibida como `Ganância`; versão reduzida WEBP para exibição; ícone do Narrador para efeito default vale só na mesa dele; `efeitos_externos_lib.json` fora.

- **2026-09-27 — Limites e catálogo só para personagens de jogador.** As regras definem o limite de Atributo e Perícia para personagens e nada dizem sobre criaturas. O servidor recusa valores fora dos limites, classe, arquétipo, raça e listas fora do catálogo só em fichas do tipo personagem. NPCs e monstros ficam livres (um lobo pode ter Vigor 6 e raça "Lobo"); as irregularidades deles aparecem apenas como avisos informativos.

## Questões em aberto

- A redação final de `rules/sistema/Carga.md` e os números da grade dependem da calibração em `carga-por-espacos`; esta mudança mantém o Sobrepeso legado suspenso em qualquer ordem de implantação.
- Outras partes da ficha original ainda ausentes na plataforma são candidatas a novos itens: cálculo de deslocamento e RDB (`app_streamlit/app/sections/status.py`). O Tamanho base da raça já pertence ao Item 2. Antes de adotar qualquer fórmula antiga, é preciso conferi-la com as regras atuais, porque a ficha original segue regras que já mudaram (peso, por exemplo).
