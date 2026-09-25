# Mecânicas Únicas do Sistema

Este capítulo reúne estruturas que podem ser usadas na criação de magias, habilidades, criaturas, objetos e interações com o cenário. Elas não concedem capacidades por si próprias: uma regra precisa indicar quem pode utilizá-las e quais efeitos produzem.

## Combos

Um **Combo** é uma sequência registrada de etapas. Quando o usuário completa a sequência na ordem correta, produz o efeito final descrito pelo Combo.

Cada Combo deve informar:

- sua sequência de etapas;
- seu Custo de Uso;
- o efeito produzido ao completar a sequência;
- os alvos permitidos;
- qualquer limite por turno, rodada ou cena.

### Início e custo

O usuário declara o Combo antes de tentar sua primeira etapa e paga seu Custo de Uso nesse momento. Ele só pode manter um Combo ativo por vez.

Iniciar outro Combo encerra o anterior. O custo já pago não é recuperado.

### Avanço

Uma etapa só é registrada quando sua ação correspondente é bem-sucedida:

- **Ataque Leve:** o ataque precisa atingir;
- **Ataque Pesado:** o ataque ou manobra precisa atingir;
- **Bloqueio:** o usuário precisa Bloquear o ataque;
- **Esquiva:** o usuário precisa evitar o ataque com Esquiva;
- **outra etapa:** deve cumprir o teste ou requisito definido pelo próprio Combo.

Uma tentativa que falha não avança nem reinicia a sequência. O usuário pode tentar novamente em uma oportunidade posterior.

Ataques Leves e Pesados só possuem diferenças quando uma arma, habilidade ou outra regra as definir. O Combo não concede essas manobras automaticamente.

### Conclusão

O efeito final acontece imediatamente após a última etapa ser resolvida. Concluir o Combo não exige uma ação adicional, salvo quando sua descrição disser o contrário.

As etapas podem envolver alvos diferentes. Quando o efeito final exigir um alvo e o Combo não definir outro critério, use o último alvo envolvido na sequência.

### Fintas

Uma **Finta** pode simular uma etapa quando o Combo permitir. Ela exige a ação, o teste e os demais custos indicados, mas não causa o dano ou efeito normal da etapa simulada.

A Finta existe para avançar a sequência; seu uso precisa ser declarado antes da rolagem.

### Interrupção

O progresso de um Combo é perdido quando:

- o usuário o abandona voluntariamente;
- o usuário inicia outro Combo;
- o usuário fica Inconsciente ou Incapacitado;
- a cena ou o conflito termina;
- uma condição específica do Combo determina sua interrupção.

Falhar em uma etapa, trocar de alvo ou passar um turno sem avançar não encerra o Combo automaticamente.

### Combos fora de combate

Uma criação pode usar Combos para interações com o mundo, como realizar uma sequência de gestos, operar um mecanismo ou preparar um ritual. Nesse caso, substitua as etapas de combate pelos testes e interações definidos na criação. As regras de declaração, avanço, conclusão e interrupção continuam válidas.

## Reação por Persistência

Uma **Reação por Persistência** acumula ocorrências de um evento e produz um efeito quando alcança um limite. Ela representa consequências de repetição, como uma defesa que aprende o padrão de um atacante, uma barreira que se rompe após vários impactos ou um artefato que desperta após sucessivas interações.

Apesar do nome, essa mecânica é automática e não gasta a Reação da criatura, salvo quando sua descrição disser expressamente o contrário.

### Elementos obrigatórios

Toda Reação por Persistência deve informar:

- o **evento contado**;
- o **limite** de ocorrências necessário;
- quem ou o que mantém o contador;
- o **efeito** produzido ao atingir o limite;
- quando o contador diminui, reinicia ou desaparece;
- se o efeito pode acontecer mais de uma vez.

### Contagem e resolução

Quando o evento contado acontece, resolva primeiro esse evento por completo. Depois, aumente o contador em `1`.

Ao alcançar o limite, resolva o efeito da Reação por Persistência e reinicie o contador em `0`, salvo quando sua descrição determinar que a mecânica termina ou conserva parte da contagem.

Uma mesma ocorrência não pode aumentar duas vezes o mesmo contador. O efeito produzido também não alimenta o próprio contador, salvo autorização expressa.

### Origem e alvo

Por padrão, mantenha um contador separado para cada combinação de origem e alvo. Ataques de criaturas diferentes, por exemplo, não se somam contra a mesma defesa, a menos que a regra diga que o contador é coletivo.

Se a descrição não indicar outro momento de encerramento, o contador desaparece no fim da cena. Em combate, ele também volta a `0` quando passa uma rodada completa sem que o evento contado aconteça.

### Uso em criações

Combos e Reações por Persistência seguem os custos, modificadores e limites do [Framework de Criação, Aprendizado e Uso de Magias e Habilidades](Framework%20de%20Criação,%20Aprendizado%20e%20Uso%20de%20Magias%20e%20Habilidades.md).

A mecânica de contagem não substitui o custo de seus efeitos. Dano, cura, condições, duração, alcance, área e demais componentes continuam sendo calculados normalmente.
