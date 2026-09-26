# Observabilidade operacional da plataforma

A API em desenvolvimento e produção emite uma linha JSON em stderr para cada
comando HTTP. Ela contém método, rota parametrizada, status e duração em
milissegundos. Respostas 409 são classificadas como `conflito`; falhas 500 ou
exceções, como `erro`. A emissão Realtime registra `realtime_falha` quando a
consulta ou envio falha e propaga a exceção para desfazer a transação.

Os comandos de migração registram `migracao` com etapa, aplicação e contagens
de convertidos, existentes, pendentes, rejeitados ou divergências. Os eventos
não incluem payloads de ficha, nomes de personagem, IDs de mesa, caminhos de
objetos, tokens ou mensagens de exceção. A instrumentação HTTP fica desligada
no ambiente `test` para manter a saída da suíte estável; testes próprios
verificam a emissão em `development`.

Para uma consulta mínima, exporte as linhas stderr da API e dos migradores
para um arquivo JSONL e execute:

```text
python platform/migration/consultar_operacao.py CAMINHO_DO_LOG.jsonl
```

A consulta retorna contagens por evento, p95 de latência de comandos, volume
por rota e os últimos dez resultados de migração. Linhas não JSON são
ignoradas. Consulte `conflito` para concorrência, `erro` para falhas de comando,
`realtime_falha` para transporte e `migracao` antes de aprovar o corte.
