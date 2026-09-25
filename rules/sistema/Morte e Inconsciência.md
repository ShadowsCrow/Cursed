# Morte e Inconsciência

## Chegar a 0 PV

Quando os Pontos de Vida de um personagem chegam a `0`, as regras de PV derivam o estado **Morrendo**. O jogador ativa o efeito **Inconsciente** enquanto esse estado o justificar.

Morrendo não é uma condição que uma fonte possa aplicar livremente. Ele permanece enquanto o personagem estiver com `0 PV`, a contagem não tiver terminado e nenhuma regra específica o tiver estabilizado ou encerrado.

Enquanto estiver Inconsciente, o personagem não pode realizar Ações, Movimento voluntário, Reações, Esquiva ou Bloqueio.

Inconsciente é o efeito oficial a consultar; não há um segundo registro de condição. As regras gerais estão em [Condições, Efeitos e Tipos de Dano](Condições%20e%20Tipos%20de%20Dano.md).

## Contagem de morte

Ao entrar em Morrendo, o personagem possui **três rodadas** para receber cura.

No fim de cada um de seus turnos enquanto estiver Morrendo, reduza essa contagem em `1`.

|Rodadas restantes|Estado|
|---|---|
|3 a 1|Inconsciente e Morrendo. Ainda pode ser salvo por cura.|
|0|O personagem morre.|

Não há rolagem de estabilização nessa regra. O prazo é determinado apenas pelas rodadas restantes.

## Morte imediata

### Sobredano letal

Depois de aplicar o dano final, incluindo Redução de Dano e demais efeitos aplicáveis, compare o PV restante com o PV máximo do personagem.

```text
PV atual ≤ -PV máximo: morte imediata
```

Exemplo: um personagem com `20 PV máximos` está com `4 PV` e sofre `24` de dano final.

```text
4 - 24 = -20 PV
```

Como chegou a `-20 PV`, ele morre imediatamente e não entra em Morrendo.

### Morte narrativa

O Narrador pode determinar morte imediata quando a situação torna a sobrevivência impossível, como decapitação, desintegração, esmagamento total ou uma queda sem possibilidade de interrupção.

O perigo e sua consequência devem estar claros na ficção antes da resolução, sempre que a situação permitir.

## Cura

Se o personagem receber cura e ficar com pelo menos `1 PV`, os requisitos que derivavam Morrendo deixam de valer e a contagem termina imediatamente.

O jogador desativa Inconsciente se Morrendo era a última causa que o mantinha ativo. Se outra causa ainda o justificar, Inconsciente permanece ativo.

Efeitos que restauram `0 PV`, removem apenas Inconsciente ou não restauram vida não interrompem a contagem, salvo se disserem que estabilizam ou salvam um personagem Morrendo.

## Efeitos específicos

Uma habilidade, magia ou outro efeito pode alterar a contagem, estabilizar o personagem ou produzir outra consequência ao chegar a `0 PV`, mas deve declarar isso de forma explícita. Alterar Inconsciente não altera Morrendo automaticamente; ao encerrar Morrendo, verifique se alguma outra causa ainda mantém Inconsciente ativo.
