# Proposta

## Por quê

Na aba Cartas da Sala, "Todas" mostra os oito corpos do sistema misturados às habilidades, magias e itens, e eles ocupam boa parte da lista. Pedido do usuário em 2026-10-03: "Não vamos deixar os corpos na lista de 'todos' não. Só quando clicar em 'corpos'."

## O que muda

- **"Todas" sem corpos:** a opção "Todas" do filtro de tipo da aba Cartas deixa de mostrar as cartas de corpo, e a contagem dela não as inclui.
- **Corpos só no filtro próprio:** as cartas de corpo aparecem só com o filtro "Corpos", que continua com a contagem dele.
- **Para os dois papéis:** vale para o Narrador (catálogo) e para o jogador (cartas dos próprios personagens), que usam o mesmo filtro.
- **Busca:** a busca do Narrador continua se somando ao filtro. Com "Todas", um corpo não aparece nem quando o título bate com a busca; o chip "Corpos", com a contagem, mostra onde eles estão.

## Capacidades

### Capacidades novas
Nenhuma.

### Capacidades modificadas
- `experiencia-da-mesa`: o requisito "Cartas no painel da Sala" passa a excluir os corpos de "Todas".

## Impacto

- **Código:** `platform/frontend/src/app/room/CartasDoPainel.tsx` (filtro e contagem) e `CartasDoPainel.test.tsx`.
- **Sem impacto:** servidor, API e banco não mudam, e a Biblioteca e a ficha também não.
