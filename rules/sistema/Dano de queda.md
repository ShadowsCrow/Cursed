
A **Altura Segura** determina quantos metros um personagem pode cair sem sofrer dano.

```
Altura Segura = 3 m + Destreza (limitada a 2) - 2 m se estiver em Sobrecarga
```

A penalidade vale enquanto houver algum item na área vermelha da grade de carga; veja [Carga e Transporte](Carga.md).

A Altura Segura mínima é `0 m`.

## Dano

O personagem sofre `1 ponto de dano` para cada metro completo acima de sua Altura Segura.

```
Dano de Queda =Altura da Queda - Altura Segura
```

O resultado mínimo é zero e frações de metro são descartadas.

Exemplo:

```
Altura Segura: 3 mQueda: 6 mDano: 3
```

O RDB de armaduras, escudos e Bloqueios não reduz dano de queda.

Armaduras influenciam quedas apenas quando deixam o personagem em Sobrecarga.

Uma queda não permite Esquiva ou Bloqueio comuns. Habilidades, magias ou equipamentos só alteram a queda quando declararem isso expressamente.

Quando um ataque empurrar ou arremessar alguém de uma altura, resolva separadamente o dano do ataque e o dano da queda.

Se a queda for realmente interrompida por diferentes superfícies, calcule cada trecho separadamente.