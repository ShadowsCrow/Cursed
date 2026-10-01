# Carga em grade

## Purpose

Definir a regra de carga do sistema como uma grade de células: o que o personagem leva ocupa a grade pelo formato de cada item, o tamanho da grade vem da Força e do Tamanho, e o que transborda para a área vermelha causa sobrecarga.

## Requirements

### Requirement: Grade base pela Força e pelo Tamanho
Cada personagem SHALL ter uma grade de carga com **linhas = 2 + Força atual** e **colunas pelo Tamanho**: Minúsculo 2, Pequeno 4, Médio 5, Grande 7, Enorme 9, Colossal 11 (calibrados em 2026-09-27). Abaixo da grade SHALL existir sempre uma linha extra vermelha.
O Tamanho base SHALL vir da raça vinculada ao catálogo; um Tamanho atual informado explicitamente pelo Narrador SHALL prevalecer enquanto representar uma exceção vigente. Sem nenhuma dessas fontes, o sistema SHALL informar que o Tamanho está indefinido e SHALL NOT estimá-lo. Ao trocar de raça, um Tamanho explícito anterior SHALL ser limpo ou reconfirmado pelo Narrador antes de continuar a usá-lo.

#### Scenario: Personagem Médio com Força 3
- **WHEN** um personagem Médio tem Força atual 3
- **THEN** sua grade tem 5 colunas e 5 linhas, mais uma linha vermelha

#### Scenario: Força reduzida por condição
- **WHEN** uma condição reduz a Força do personagem de 3 para 2
- **THEN** a quinta linha fica vermelha em vez de sumir, os itens nela passam a contar como sobrecarga, e ela volta a ser normal quando a condição termina

#### Scenario: Tamanho atual diferente da base racial
- **WHEN** o Narrador informa explicitamente que um personagem de raça Média está temporariamente Pequeno
- **THEN** a grade usa as colunas de Pequeno, e as colunas perdidas ficam vermelhas até a exceção terminar

#### Scenario: Troca de raça com Tamanho explícito antigo
- **WHEN** o Narrador troca a raça de um personagem que tem Tamanho atual informado explicitamente
- **THEN** a ficha exige limpar ou reconfirmar o Tamanho explícito antes de continuar a usá-lo na grade

### Requirement: A grade representa tudo o que o personagem leva
Todo item levado pelo personagem SHALL ocupar a grade, inclusive armaduras vestidas, armas empunhadas e itens nas mãos. Itens equipados SHALL permanecer na grade, marcados como equipados. Um item SHALL ser considerado levado somente quando estiver colocado na grade. Itens na bandeja (fora da grade) SHALL NOT contar na carga nem poder ser equipados; a mochila equipada é a exceção, porque não ocupa célula. Itens sem dimensão não podem ir para a grade e, portanto, não são levados nem equipados até o Narrador definir o formato.

#### Scenario: Armadura vestida
- **WHEN** o personagem veste um peitoral 2 x 3
- **THEN** o peitoral continua ocupando 6 células da grade e aparece marcado como equipado

#### Scenario: Item na bandeja
- **WHEN** o personagem recebe uma espada que ainda está fora da grade
- **THEN** ela não conta na carga e não pode ser equipada até ser colocada na grade

### Requirement: Itens com dimensão, tipo e rotação
Cada item SHALL ter dimensão (largura x altura em células) e tipo definidos na criação. Os tipos são: Armadura (peitoral, capacete, luvas, botas), Armas (uma mão, duas mãos), Escudo, Acessórios (mochila, aljava) e Outros. A dimensão SHALL NOT ser estimada depois da criação. Itens SHALL poder ser girados em 90°. Dois itens SHALL NOT ocupar a mesma célula, e nenhum item SHALL ficar fora da grade e da área vermelha.

#### Scenario: Girar uma espada
- **WHEN** o jogador gira uma espada longa 1 x 3
- **THEN** ela passa a ocupar 3 x 1 células, se houver espaço livre

#### Scenario: Sobreposição
- **WHEN** o jogador tenta colocar um item sobre células já ocupadas
- **THEN** a posição é recusada e o item volta para onde estava

### Requirement: O que pode estar equipado ao mesmo tempo
O personagem SHALL ter no máximo um peitoral, um capacete, um par de luvas, um par de botas, uma mochila e uma aljava equipados. O personagem SHALL ter duas mãos:
- arma de uma mão ocupa uma;
- arma de duas mãos ocupa as duas;
- escudo ocupa uma;
- arma versátil ocupa uma ou duas mãos, conforme o jogador a empunhe naquele momento;
- itens Outros ocupam 0, 1 ou 2 mãos, conforme definido na criação.

A soma SHALL NOT passar de duas mãos.

#### Scenario: Arma e escudo
- **WHEN** o personagem empunha uma espada de uma mão e um escudo
- **THEN** as duas mãos ficam ocupadas e ele não pode empunhar outro item que ocupe mão

#### Scenario: Arma versátil com as duas mãos
- **WHEN** o personagem empunha uma espada versátil com as duas mãos
- **THEN** ela ocupa as duas mãos; ao voltar a empunhá-la com uma mão, a outra mão fica livre

#### Scenario: Arma versátil com a outra mão ocupada
- **WHEN** o personagem tenta empunhar com as duas mãos uma arma versátil equipada enquanto empunha um escudo
- **THEN** o sistema recusa e pede para soltar o que ocupa a outra mão

#### Scenario: Segundo capacete
- **WHEN** o personagem tenta equipar um capacete já tendo outro equipado
- **THEN** o sistema recusa e pede para desequipar o primeiro

### Requirement: Armadura e RDB do peitoral e do escudo
A Armadura e o RDB do personagem SHALL vir somente do peitoral e do escudo equipados. O peitoral SHALL seguir as regras atuais de armadura (categoria, perfil, Armadura, RDB, penalidades e Requisito de Força). Capacete, luvas e botas SHALL apenas carregar efeitos.

#### Scenario: Capacete com efeito
- **WHEN** o personagem equipa um capacete que concede um efeito
- **THEN** o efeito se aplica, e a Armadura e o RDB continuam vindo só do peitoral e do escudo

### Requirement: Ampliações da grade
A grade SHALL ser ampliada por:
- **mochila equipada**: não ocupa célula, acrescenta linhas ou colunas e tem Requisito de Força;
- **magias e habilidades**: declaram a ampliação no próprio texto.

Ampliações de fontes diferentes SHALL se somar; duas da mesma fonte SHALL NOT. Quando uma ampliação termina, os itens nela SHALL ir para a área vermelha e, se não couberem, para o chão. Largar a mochila é interação livre e SHALL levar para o chão, como uma pilha recuperável, os itens das linhas ou colunas que ela acrescentava.

#### Scenario: Mochila sem Força suficiente
- **WHEN** um personagem com Força 1 tenta equipar uma mochila com Requisito de Força 3
- **THEN** o sistema recusa e informa o requisito

#### Scenario: Fuga largando a mochila
- **WHEN** o personagem larga a mochila que acrescentava uma linha
- **THEN** os itens daquela linha vão para o chão junto com a mochila, e os da grade base continuam com ele

### Requirement: Aljava e flechas
A aljava SHALL ter tamanho fixo na grade, mesmo vazia, e SHALL registrar a quantidade de flechas que guarda até sua capacidade. As flechas guardadas SHALL NOT ocupar células próprias.

#### Scenario: Aljava com flechas
- **WHEN** o personagem guarda 20 flechas numa aljava de capacidade 20
- **THEN** a aljava ocupa só as próprias células e mostra 20 flechas

### Requirement: Pilhas e moedas
Itens do tipo Outros SHALL poder empilhar numa célula até o limite definido na criação. Os demais tipos SHALL NOT empilhar. As moedas são padrão do sistema em **três tipos: cobre, prata e ouro** (a platina deixou de existir por decisão do usuário em 2026-09-28). Uma pilha de moedas SHALL poder misturar tipos até o limite de moedas por pilha definido nas configurações da campanha. O sistema SHALL NOT converter moedas entre tipos.

#### Scenario: Moedas mistas
- **WHEN** a mesa define 100 moedas por pilha e o personagem tem 40 de cobre, 95 de prata e 12 de ouro
- **THEN** as 147 moedas ocupam 2 células, e o total por tipo continua visível

#### Scenario: Platina não existe
- **WHEN** o Narrador ou o jogador tenta registrar moedas de platina
- **THEN** não há esse tipo de moeda, e só cobre, prata e ouro podem ser registrados

### Requirement: Sobrecarga em um só nível
Qualquer item na área vermelha SHALL colocar o personagem em sobrecarga, que causa:
- metade do deslocamento;
- -4 em Esquiva;
- não pode Correr;
- não pode saltar, escalar nem nadar normalmente;
- -2 m na Altura Segura;
- +1 de Exaustão a cada 10 rodadas consecutivas agindo ou se movendo, ou a cada 30 minutos viajando.

Em água profunda, a sobrecarga SHALL equivaler a Afundando. Um item que não cabe nem na área vermelha SHALL NOT ser levado.

#### Scenario: Tesouro transborda
- **WHEN** o personagem guarda moedas e uma delas fica numa célula vermelha
- **THEN** ele entra em sobrecarga com todas as consequências, até tirar o item do vermelho

### Requirement: Carregar uma criatura
Uma criatura carregada SHALL ocupar a grade de quem carrega com dimensão pelo Tamanho: Minúsculo 2 x 3, Pequeno 3 x 4, Médio 4 x 5, Grande 5 x 7. O equipamento da criatura SHALL continuar no inventário dela. Com ajuda, cada carregador SHALL levar metade da altura da criatura, arredondada para cima. Uma criatura que não cabe nem com a área vermelha SHALL só poder ser arrastada, 1 m por ação inteira. Soltar é interação livre.

#### Scenario: Levar um companheiro desmaiado
- **WHEN** um personagem Médio de Força 3 carrega um companheiro Médio
- **THEN** o companheiro ocupa 20 das 25 células verdes, e o que não couber vai para a área vermelha ou precisa ser largado

#### Scenario: Força insuficiente
- **WHEN** um personagem Médio de Força 1 tenta carregar um companheiro Médio
- **THEN** o sistema informa que ele não cabe e que só é possível arrastar ou carregar com ajuda

### Requirement: Acesso em combate
Numa Cena de Disputa, itens equipados ou empunhados SHALL ter acesso imediato, e pegar qualquer outro item da grade SHALL custar Ação de Movimento. Reorganizar a grade SHALL ser livre fora de cenas de tensão.

#### Scenario: Poção guardada em combate
- **WHEN** o personagem quer beber uma poção que não está empunhada durante um combate
- **THEN** pegá-la custa uma Ação de Movimento

### Requirement: Levantar, empurrar e arrastar pela grade e pelo Narrador
O que cabe na grade, inclusive na área vermelha, SHALL ser erguido e levado sem teste. Sustentar algo que não cabe SHALL exigir `1d20 + Força + Esportes` contra CD 18 (CD 22 em condições desfavoráveis), por até o início do próximo turno, com deslocamento máximo de 1 m e sem Correr. Empurrar ou arrastar SHALL usar a ação inteira e mover o objeto até 1 m, com teste de Força + Esportes (CD 18 ou 22) só quando o Narrador pedir. O Narrador SHALL decidir quando um objeto é pesado demais para uma pessoa. Em trabalho em equipe, quem faz o teste SHALL receber +1 por ajudante, até +3. A plataforma não calcula esses testes.

#### Scenario: Estátua que não cabe na grade
- **WHEN** o personagem tenta erguer uma estátua que não cabe na grade nem na área vermelha
- **THEN** ele faz `1d20 + Força + Esportes` contra CD 18 e, com sucesso, sustenta a estátua até o início do próximo turno

#### Scenario: Carroça com dois ajudantes
- **WHEN** três personagens arrastam uma carroça atolada
- **THEN** um deles faz o teste com +2

### Requirement: Água profunda pelo arrasto do equipamento
Em água profunda, o personagem SHALL nadar normalmente sem Sobrecarga e sem arrasto. Vestir peitoral de categoria Pesada ou empunhar escudo SHALL causar Natação prejudicada (-2 nos testes de natação, deslocamento aquático pela metade, sem Correr). Estar em Sobrecarga SHALL causar Afundando; Sobrecarga com peitoral pesado ou escudo empunhado SHALL causar Afundamento Crítico. Escudo guardado na grade SHALL NOT causar arrasto. Equipamentos Hidrodinâmicos SHALL NOT causar arrasto, e Flutuantes SHALL NOT causar Sobrecarga na água.

#### Scenario: Escudo guardado
- **WHEN** o personagem nada com o escudo guardado na grade e sem nada na área vermelha
- **THEN** ele nada normalmente

#### Scenario: Largar o fardo na água
- **WHEN** um personagem em Afundamento Crítico, de peitoral pesado, larga o fardo que estava na área vermelha
- **THEN** a Sobrecarga termina e ele passa para Natação prejudicada
