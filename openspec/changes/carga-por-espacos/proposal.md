# Proposal

## Why

Na mesa, a carga por quilogramas não produz decisões: ninguém soma pesos durante a sessão, então os personagens acabam levando tudo. O usuário quer que o inventário volte a pesar na ficção. Moedas, água, tochas, armaduras e até um companheiro desmaiado devem disputar lugar, criaturas maiores devem levar mais e as menores menos, e bolsas, magias e habilidades devem ampliar o que se leva.

A resposta escolhida é um **inventário em grade no estilo Resident Evil**. Cada item tem um formato, e o jogador organiza tudo o que o personagem leva numa grade cujo tamanho vem da Força e do Tamanho. O que não cabe transborda para uma área vermelha de sobrecarga. A carga deixa de ser conta e vira um quebra-cabeça visível: o que levar, como encaixar, o que abandonar.

Classificação: **núcleo**. A carga vale para todo personagem, e esta mudança altera regras de `rules/sistema` por decisão do usuário ("não trabalhamos mais com sistema de peso", 2026-09-26).

**Exceção de princípio:** o inventário em grade **só funciona com o site**. A regra de carga passa a depender da plataforma, sem versão em papel, por decisão do usuário. É uma exceção explícita ao princípio de que a ficha digital apoia as regras sem ser obrigatória para executá-las, e vale só para o inventário.

## What Changes

### Regra — A grade representa tudo o que o personagem leva

- **BREAKING** A Capacidade de Carga em kg deixa de existir. O que o personagem leva é representado por uma **grade de células**.
- A grade não é uma mochila literal: representa **tudo o que o personagem leva**, inclusive o que está nas mãos e o que está vestido. Itens equipados continuam na grade e aparecem com **borda dourada**.
- **Tamanho da grade (a testar no protótipo antes de fixar):**
  - **linhas = 2 + Força atual**;
  - **colunas pelo Tamanho**: Minúsculo 2, Pequeno 3, Médio 4, Grande 6, Enorme 8, Colossal 10.
  - Exemplo: Médio com Força 3 tem grade 4 x 5.
- A **Força atual** vale, como hoje. Se a Força ou o Tamanho diminuírem, as linhas ou colunas perdidas **ficam vermelhas** em vez de sumir; os itens nelas passam a contar como sobrecarga. Quando o efeito termina, voltam ao normal.
- O Tamanho da raça no catálogo é a base. Um Tamanho atual informado explicitamente pelo Narrador na ficha prevalece enquanto durar a exceção; na falta dele, vale a base racial. Ao trocar a raça, o Narrador limpa ou reconfirma essa exceção para que um valor antigo não prevaleça por acidente. Se não houver nenhum dos dois, a grade informa que o Tamanho está indefinido, sem estimá-lo.
- **Ampliações:**
  - **Mochila:** só uma por vez; acrescenta linhas ou colunas e tem **Requisito de Força**.
  - **Magias e habilidades:** declaram a ampliação no próprio texto (por exemplo, "+1 coluna" ou "grade extra 2 x 2 enquanto durar").
  - Ampliações de fontes diferentes se somam; duas da mesma fonte não.
  - Quando uma ampliação termina, o que estava nela vai para a área vermelha e, se não couber, para o chão.
  - **Largar a mochila** (interação livre) leva junto para o chão, como uma pilha recuperável, os itens que estavam nas linhas ou colunas acrescentadas por ela. Os itens da grade base ficam com o personagem.

### Regra — Itens

- **A dimensão do item (largura x altura em células) é definida na criação** e registrada nele. Nunca é calculada nem estimada depois.
- **Itens podem ser girados** em 90°.
- **Tipos de item** informados na criação:
  - **Armadura:** peitoral, capacete, luvas, botas;
  - **Armas:** uma mão, duas mãos;
  - **Escudo**;
  - **Acessórios:** mochila, aljava;
  - **Outros:** itens que não podem ser equipados, mas ocupam espaço.
- **Os subtipos servem para garantir o que pode estar equipado ao mesmo tempo:** no máximo um peitoral, um capacete, um par de luvas, um par de botas, uma mochila e uma aljava.
- **Mãos (duas), definidas pelo tipo do item:**
  - arma de uma mão ocupa uma mão, então dá para usar duas armas de uma mão, ou uma arma e um escudo;
  - arma de duas mãos ocupa as duas;
  - escudo ocupa uma mão;
  - itens do tipo Outros: o Narrador define na criação se o item ocupa mão e quantas (0, 1 ou 2). Por exemplo, uma tocha ocupa 1 mão para ser usada.
- **Armadura e RDB vêm só do peitoral e do escudo.** O peitoral corresponde à armadura atual de `Equipamentos.md` (categoria, perfil, Armadura, RDB, penalidades e Requisito de Força). Capacete, luvas e botas não dão Armadura nem RDB; só carregam efeitos.
- **Acessórios:**
  - a **mochila não ocupa célula**: equipada, ela aumenta o tamanho da grade;
  - a **aljava tem tamanho fixo na grade**, mesmo vazia, e guarda a **quantidade de flechas** como informação: as flechas dentro dela não ocupam células próprias.
- **Pilhas:** itens do tipo Outros podem empilhar numa célula até o **limite definido na criação** do item (por exemplo, 3 poções). Os demais tipos não empilham.
- **Moedas:**
  - são padrão do sistema, em **quatro tipos**: cobre, prata, ouro e platina;
  - uma pilha de moedas **pode misturar tipos**;
  - o Narrador define nas **configurações da mesa** quantas moedas cabem numa pilha (uma célula);
  - não há câmbio entre tipos; ele não está nas regras e não será inferido.
- Um peso aproximado pode existir como descrição, sem efeito nas regras.

### Regra — Acesso em combate

- **Equipado ou empunhado:** acesso imediato.
- **Demais itens da grade:** pegar custa Ação de Movimento numa Cena de Disputa.
- Reorganizar a grade é livre fora de cenas de tensão. Largar a mochila é interação livre.

### Regra — Sobrecarga

- **Um só nível:** qualquer item na **área vermelha** (uma linha extra abaixo da grade, mais as linhas ou colunas perdidas) ativa a sobrecarga.
- Consequências, um meio-termo entre a Carga Excedente e o Excesso Crítico atuais, puxando para o mais pesado (aprovadas pelo usuário):

| Efeito | Sobrecarga |
|---|---|
| Deslocamento | metade |
| Esquiva | -4 |
| Correr | não pode |
| Saltar, escalar, nadar | não pode normalmente |
| Altura Segura | -2 m |
| Exaustão | +1 a cada 10 rodadas consecutivas agindo ou se movendo, ou 30 minutos viajando |

- Em água profunda, a sobrecarga equivale a **Afundando**, regra que já existe.
- Se um item não cabe nem na área vermelha, não pode ser levado: precisa ser largado, arrastado ou dividido com outro personagem.

### Regra — Carregar uma criatura

- Uma criatura carregada ocupa a grade como uma carga, com dimensão pelo Tamanho: **Minúsculo 2 x 3, Pequeno 3 x 4, Médio 4 x 5, Grande 5 x 7**.
- O equipamento da criatura carregada continua no inventário dela e não é somado.
- Com ajuda, cada carregador leva metade da criatura (metade da altura, arredondada para cima) na própria grade: Minúsculo 2 x 2, Pequeno 3 x 2, Médio 4 x 3, Grande 5 x 4.
- Se a criatura não couber nem com a área vermelha, só pode ser arrastada: 1 m por ação inteira.
- **Soltar** é interação livre.

### Plataforma

- **Grade interativa:**
  - arrastar, girar e soltar itens com mouse, toque e teclado (selecionar, mover com setas, girar com uma tecla), com anúncio para leitor de tela;
  - área vermelha destacada;
  - itens equipados com borda dourada e marcador "equipado", já que a cor sozinha não basta.
- **Servidor como autoridade:** a posição, a rotação e a sobreposição de cada item são validadas no servidor. A arrumação é enviada como um todo, e um rascunho local protege contra queda de conexão no meio da organização.
- **Sobrecarga automática:** vira um efeito que entra e sai sozinho, com origem visível e ícone próprio, e aplica suas consequências aos valores derivados.
- **Criação de item:**
  - tipo, subtipo, dimensão com prévia na grade e girar;
  - limite de pilha (só Outros);
  - Requisito de Força e ampliação (mochilas);
  - capacidade de flechas (aljava);
  - mãos ocupadas ao usar (0, 1 ou 2), definidas pelo Narrador nos itens do tipo Outros;
  - validação do que pode estar equipado ao mesmo tempo (um de cada peça, mãos ocupadas pelo tipo da arma e do escudo);
  - **duas imagens**: a arte do item e o **ícone de grade**, na proporção da dimensão. Sem ícone de grade, a arte é encaixada no formato com a moldura dourada; sem arte, uma silhueta com o nome.
- **Moedas:** pilha com total por tipo, dividir e juntar, e configuração "moedas por pilha" na mesa.
- **Corpos como itens padrão:** cada mesa tem sempre criados oito itens genéricos de corpo, um inteiro e um "com ajuda" (meio corpo) por Tamanho, com as dimensões da regra. Os corpos ficam com o Narrador: quando um jogador quer carregar alguém, o Narrador envia o corpo adequado ao personagem, como qualquer carta de item. Soltar o corpo é largá-lo no chão. Não há ação de carregar sobre o token, e o token do carregado não acompanha o de quem carrega; mover os tokens segue manual. Decisão do usuário em 2026-09-27.
- **Chão e baú da cena:** grades compartilhadas na sala de onde os jogadores arrastam o saque para a própria grade, e para onde vão os itens largados.
- **Troca entre personagens:** oferecer um item a outro personagem, que aceita e escolhe onde encaixá-lo.
- **O Narrador vê todas as grades.**
- **Protótipo:** antes de fixar os números, uma página interativa de teste permite escolher Força e Tamanho, montar kits e ajustar dimensões. Vem como primeira etapa da implementação.

### Documentos de regra alcançados

- **`Carga.md`:** reescrito para a grade.
- **`Apêndice — Carga e Transporte.md`:** exemplos refeitos.
- **`Criação de Personagem.md`:** Capacidade de Carga, equipamento inicial, checklist e exemplo.
- **`Equipamentos.md`:**
  - `Peso` passa a `Dimensão`;
  - "armadura" passa a "peitoral";
  - capacete, luvas e botas só com efeitos;
  - escudo, mochila e aljava;
  - mãos ocupadas pelo tipo do item.
- **`Dano de queda.md` e `Apêndice — Dano de Queda.md`:** faixas de carga substituídas pela sobrecarga (-2 m).
- **Exaustão por Excesso Crítico:** substituída pela linha de Exaustão da sobrecarga.

## Non-goals

- Criar câmbio entre moedas, economia ou riqueza inicial.
- Redesenhar Armadura, RDB, penalidades ou Requisito de Força do peitoral e do escudo.
- Definir efeitos de capacetes, luvas e botas; cada peça declara os seus.
- Oferecer versão em papel da regra de carga.
- Converter kg em dimensões nas fichas existentes.

## Capabilities

### New Capabilities

- `carga-em-grade`: Regra de carga em grade: tamanho pela Força e pelo Tamanho, ampliações, itens com dimensão e tipo, pilhas e moedas, acesso em combate, sobrecarga em nível único e carregar criaturas (metade da altura, para cima, com ajuda).
- `inventario-em-grade`: Inventário interativo da plataforma: grade com arrastar, girar e teclado, validação no servidor, sobrecarga automática, criação de item com tipo, dimensão e duas imagens, moedas, corpos genéricos como itens padrão, chão e baú da cena, trocas e protótipo de calibração.

### Modified Capabilities

Nenhuma arquivada. Interage com `calcular-valores-da-ficha`:
- o Tamanho base vem do catálogo de raças (Item 2), com exceção explícita do Narrador para o Tamanho atual;
- o envio de imagens (Item 3) atende arte e ícone de grade como pontos independentes;
- a sobrecarga automática substitui o Sobrepeso suspenso (Item 4);
- os ícones de efeito (Item 7) incluem o de sobrecarga.

## Impact

- **Regras:** os documentos listados acima.
- **Dados:**
  - itens das fichas (`armas`, `armaduras`, `outros`) ganham tipo, dimensão, posição, rotação e estado equipado;
  - `armas_lib.json` (uma arma com peso);
  - cartas de item (`CardEditor.tsx` tem campo de peso);
  - configuração da mesa (moedas por pilha);
  - `efeitos_default.json` (Sobrepeso substituído).
- **Domínio:** `ficha_viva.calcular_valores_derivados` deixa de somar `carga:peso` e passa a calcular a grade, a sobrecarga e suas consequências.
- **API e interface:** inventário (`InventoryPanel.tsx`), editor de item e de cartas, itens padrão de corpo na biblioteca, sala (chão e baú, trocas em tempo real) e valores derivados.
- **Migração:** itens sem dimensão ficam numa bandeja "Sem dimensão", fora da grade, até o Narrador defini-la. Nada é convertido de kg.

## Questões em aberto

- Números da grade (linhas = 2 + Força, colunas pelo Tamanho) e dimensões típicas de cada tipo de item: calibrar no protótipo. Uma conta rápida mostra que um guerreiro Médio de Força 3 com peitoral 2 x 3, capacete 2 x 2, luvas, botas, espada e escudo já enche as 20 células; a grade ou as peças precisam de ajuste.
- Tamanho da aljava na grade e sua capacidade de flechas; ampliação e Requisito de Força de cada mochila.
- Valor padrão de "moedas por pilha" numa mesa nova.
