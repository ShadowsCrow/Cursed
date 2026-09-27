# Design

## Context

Motivação em `proposal.md`; requisitos em `specs/carga-em-grade` e `specs/inventario-em-grade`. Estado atual relevante:

- **Itens:** ficam em `inventory_items` (`tipo` arma/armadura/outro, `quantidade`, `equipado`, `dados` JSON), por personagem. O equipar passa por `POST /inventario/{item}/equipar` (`live_sheet.py`).
- **Carga:** `ficha_viva.calcular_valores_derivados` soma `dados.peso` em `carga:peso`. O efeito default Sobrepeso (`cc_above`) está suspenso pela mudança `calcular-valores-da-ficha`.
- **Sala:** cenas, camadas e tokens com eventos pelo Realtime do Supabase emitidos na transação (`sala.py`). O canvas usa PixiJS.
- **Dependências de `calcular-valores-da-ficha`:** Tamanho vem do catálogo de raças (Item 2), envio de imagens (Item 3), efeitos e ícones (Itens 4 e 7). Ela ainda não foi implementada.
- **Regra:** a grade só funciona com o site; os números da grade ainda precisam de calibração.

## Goals / Non-Goals

**Goals:**
- Um único motor de grade, com a mesma resposta na tela e no servidor.
- O protótipo nasce do mesmo motor e dos mesmos componentes da versão final, para não jogar trabalho fora.
- Calibrar os números antes de reescrever `rules/sistema`.

**Non-Goals:**
- Automatizar a contagem de tempo da Exaustão por sobrecarga (rodadas e minutos seguem com o Narrador, que recebe um lembrete).
- Economia, câmbio ou preços.
- Física de empilhar itens dentro de itens (só a aljava guarda flechas, como número).

## Decisions

### D1. Motor da grade em TypeScript e Python com casos de teste compartilhados
O motor é uma função pura: recebe a grade (colunas e linhas verdes, ampliações) e os itens (dimensão, posição, rotação), e responde se a arrumação é válida, quais células são vermelhas, quem está em sobrecarga e por quê. Ele existe em TypeScript (`platform/frontend/src/app/inventory/gridEngine.ts`), para arrastar sem esperar a rede, e em Python (`cursed_platform/domain/grade.py`), que é a autoridade. Um arquivo de casos (`fixtures/grade/casos.json`) é executado pelas duas suítes, garantindo respostas iguais.
- *Alternativa:* validar só no servidor a cada movimento. Rejeitada: arrastar ficaria preso à latência.

### D2. Coordenadas absolutas e área vermelha dinâmica
- Posições são gravadas em coordenadas absolutas (coluna e linha a partir de 0).
- Colunas verdes vêm do Tamanho mais as ampliações; linhas verdes, de 2 + Força atual mais as ampliações.
- Toda célula fora das colunas ou linhas verdes é vermelha.
- O Tamanho base vem da raça vinculada ao catálogo. `personagem.tamanho`, quando informado explicitamente pelo Narrador, representa o Tamanho atual e prevalece sobre a base racial; na falta dele, usa-se a raça. Ao trocar a raça, a interface e a gravação da ficha exigem limpar ou reconfirmar esse valor explícito. Na migração para o catálogo, valores explícitos iguais à base racial podem ser limpos; divergências ficam sinalizadas para confirmação, sem inferir uma causa. Sem Tamanho válido em qualquer fonte, a grade não é calculada.
- A grade física exibida é a verde mais uma linha vermelha, estendida até cobrir qualquer item que esteja além dela (linhas ou colunas "perdidas" por redução de Força ou Tamanho).
- Assim, reduzir a Força nunca apaga posição de item: a mudança só pinta células de vermelho.

### D3. Dados dos itens
`inventory_items` ganha as colunas:
- `subtipo`: peitoral, capacete, luvas, botas, uma_mao, duas_maos, escudo, mochila, aljava, moedas ou outro;
- `largura` e `altura`;
- `coluna`, `linha` e `girado`;
- `maos` (0, 1 ou 2);
- `pilha_max`.

A mochila e a aljava guardam em `dados` a ampliação, o Requisito de Força, a capacidade de flechas e as flechas. `tipo` ganha `escudo` e `acessorio`. Item com `coluna` nula está na bandeja "Sem dimensão" ou fora da grade. As dimensões são obrigatórias em itens novos.
Arte e ícone de grade são referências independentes. O ícone de grade fica em `dados.icone_grade` para um item do inventário e em `conteudo.formato.icone_grade` para uma carta de item; o envio de imagens de `calcular-valores-da-ficha` atualiza apenas a referência escolhida.

### D4. Arrumação gravada de uma vez
`PUT /mesas/{m}/personagens/{p}/inventario/arrumacao` recebe a lista completa de posições, rotações e itens equipados, mais a `versao_esperada` do personagem. O servidor roda o motor, as regras de equipar (um de cada peça, mãos, Requisito de Força) e grava tudo ou nada. O cliente guarda um rascunho em `localStorage` durante a arrumação e o reenvia ao reconectar. Em conflito de versão, mostra a grade atual e descarta o rascunho com aviso.

### D5. Moedas
Uma pilha de moedas é um item de subtipo `moedas`, com `dados = {cobre, prata, ouro, platina}` e 1 x 1. A tabela `mesas` ganha `moedas_por_pilha`. O servidor reorganiza o conteúdo das pilhas quando o total muda e informa quantas células são necessárias. O jogador decide onde elas ficam.

### D6. Sobrecarga como efeito derivado
Calculada pelo motor e injetada como efeito derivado "Sobrecarga", como as faixas de desgaste. Ela aplica: metade do deslocamento, -4 em Esquiva e as marcas "não pode Correr, saltar, escalar, nadar normalmente" e "Altura Segura -2 m", que aparecem no detalhe dos valores. Enquanto durar, a ficha mostra um lembrete da Exaustão por tempo. "Metade do deslocamento" depende do Deslocamento derivado da raça; sem ele, a ficha mostra a regra em texto. O ícone é o do fardo acorrentado (`cc_above`), reaproveitado como ativo visual. O efeito default antigo Sobrepeso continua suspenso e não participa do cálculo.

### D7. Carregar criatura: corpos como itens padrão
- **Revisado em 2026-09-27 por decisão do usuário.** Carregar alguém não é uma ação sobre o token. Cada mesa tem sempre oito cartas de item padrão, publicadas e criadas pelo sistema: um corpo inteiro e um "com ajuda" por Tamanho, com as dimensões da regra (Minúsculo 2 x 3 e 2 x 2, Pequeno 3 x 4 e 3 x 2, Médio 4 x 5 e 4 x 3, Grande 5 x 7 e 5 x 4). O corpo com ajuda tem metade da altura, arredondada para cima.
- Os corpos ficam com o Narrador. Quando um jogador quer carregar alguém, o Narrador concede o corpo adequado ao personagem, pelo fluxo normal de concessão de carta de item. O corpo é um item do tipo Outros, não empilha e não ocupa mãos; ocupa a grade e pode causar sobrecarga como qualquer item. Soltar é largá-lo no chão.
- O equipamento da criatura carregada continua no inventário dela: o corpo é genérico e não carrega nada.
- Sem token acompanhando: mover os tokens segue manual. `character_carries` e `scene_tokens.acompanha_token_id` saem da migração 0016, que ainda não foi aplicada em ambiente compartilhado.
- As cartas padrão são garantidas ao abrir o catálogo da mesa e ao listar a biblioteca, sem duplicar; o Narrador não as edita nem arquiva.

### D8. Chão, baú e trocas
- **Revisado na implementação (tarefa 3.2).** Os efeitos vinculados a equipamento apontam para o item pela chave composta (mesa, personagem, item). Um dono nulo ou trocável em `inventory_items` quebraria esse vínculo. Por isso o item que sai de um personagem vira um **retrato** dele, incluindo os efeitos vinculados, guardado em `scene_stash_items`. Quando alguém o pega, ele é recriado no novo dono com os efeitos. `inventory_items` continua sempre pertencendo a um personagem.
- **Chão e baú:** `scene_stashes (id, mesa_id, cena_id, tipo chão|baú, colunas, linhas, versao)` guardam `scene_stash_items`. Pegar e largar são transações com versão dos dois lados. Na disputa pelo mesmo item, vence o primeiro pedido confirmado.
- **Trocas:** usam `item_offers (item_id, de, para, estado)`. Aceitar retira o item de quem oferece (retrato) e o recria em quem recebe, na posição escolhida.
- **Tempo real:** eventos pelo mesmo mecanismo da sala. As grades de personagem são privadas (tópico do personagem); chão e baú, públicos na cena.

### D9. Protótipo dentro da plataforma
Uma rota `/preview/inventario`, disponível em desenvolvimento e na prévia, sem servidor. Ela usa o motor TypeScript e os mesmos componentes de grade da versão final, com controles de Força, Tamanho, mochila, kits prontos, criação de item livre e a opção de exportar os números escolhidos. Os kits de partida usam dimensões provisórias, marcadas como tal.

### D10. Efeito no jogo
- **Escassez:** espaço vira recurso visível; o saque disputa lugar com provisões e armaduras, e carregar um companheiro custa quase tudo.
- **Risco de combate:** a sobrecarga pesada (metade do deslocamento, -4 em Esquiva) torna perigoso lutar carregado, e largar a mochila vira escolha tática.
- **Ritmo narrativo:** organizar é livre fora da tensão, como a sala segura do Resident Evil. Em combate, só o que está equipado é imediato.
- **Carga cognitiva:** zero contas. O custo passa a ser organizar, que é a parte divertida.
- **Interações:** Esquiva e deslocamento (valores derivados), Dano de Queda (Altura Segura), Exaustão, Carga Aquática (Afundando), armaduras (peitoral), Requisito de Força, sala e tokens.

### D11. Só é levado o que está na grade
- **Decisão do usuário em 2026-09-27.** A bandeja "Fora da grade" guarda itens que o personagem tem, mas não leva: eles não contam na carga e não se equipam. A mochila equipada é a exceção, porque não ocupa célula.
- Itens sem dimensão também não se equipam até o Narrador definir o formato e o jogador colocá-los na grade. Os que já estavam equipados continuam assim até alguém mexer. Redefinir o formato de um item equipado que sai da grade o desequipa.
- A arrumação registra no histórico cada item colocado na grade e cada item retirado para a bandeja; mover dentro da grade não gera evento.

## Risks / Trade-offs

- [Motor duplicado divergir] → Casos compartilhados executados nas duas suítes, e o CI falha se divergirem.
- [Grade apertada demais ou folgada demais] → Calibração no protótipo antes de escrever a regra; números centralizados num só lugar.
- [Arrastar em celular e acessibilidade] → Seleção por toque e teclado como caminho principal, arrastar como atalho; teste com leitor de tela.
- [Perda de arrumação por conexão] → Rascunho local e envio único com versão.
- [Disputa de saque em tempo real] → Transação com versão e mensagem clara para quem perdeu.
- [Dependência da outra mudança] → O protótipo e o motor não dependem dela. A integração com a ficha espera o catálogo de raças e o envio de imagens; até lá, o Tamanho é informado pelo Narrador na ficha. Com o catálogo, esse valor só permanece como exceção explícita e deve ser revisto na troca de raça.
- [Regra só funciona com o site] → Decisão do usuário. Se a plataforma cair, a mesa segue com a última grade exibida, e o Narrador arbitra.

## Migration Plan

1. **Protótipo e motor** (sem migração de banco); calibração com o usuário; números registrados em `docs/`.
2. **Reescrita de regras:**
   - `Carga.md` e `Apêndice — Carga e Transporte.md`;
   - `Criação de Personagem.md`;
   - `Equipamentos.md`;
   - `Dano de queda.md` e `Apêndice — Dano de Queda.md`;
   - catálogo de efeitos: Sobrepeso legado mantido suspenso; Sobrecarga derivada da grade usa o ativo visual `cc_above`.
3. **Migração Alembic** (próxima revisão livre, depois das de `calcular-valores-da-ficha`):
   - colunas novas de grade em `inventory_items` (o dono continua sendo sempre um personagem);
   - `scene_stash_items` para os retratos de itens no chão e no baú;
   - `mesas.moedas_por_pilha`;
   - `scene_stashes` e `item_offers`, com RLS e REVOKE.
   - Downgrade remove tudo.
4. **Migração de dados:** itens existentes ficam sem dimensão e sem posição (bandeja), e o peso antigo vai para a descrição. Nada é convertido.
5. **Backend, contrato e frontend.**
6. **Rollback:** reverter o deploy e a migração. A bandeja preserva os itens, e o peso antigo continua em `dados`.

Arquivos e dados que precisam de migração: `inventory_items`, `mesas`, `scene_tokens`, fichas com `peso`, `armas_lib.json`, cartas de item (campo peso), `efeitos_default.json` e os seis documentos de regra.

## Open Questions

- Valor padrão de "moedas por pilha" numa mesa nova. É definido na calibração e não muda o desenho.
