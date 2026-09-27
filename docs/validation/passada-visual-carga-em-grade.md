# Passada visual — carga em grade (carga-por-espacos 8.2)

Data: 2026-09-27. Ambiente: API e interface locais com SQLite descartável, Chromium do Playwright, movimento
reduzido, interface em português. Capturas em `.screenshots/grade/`, em desktop (1440 x 900) e celular (390 x 844).

| Estado | Personagem | Capturas | Observação |
| --- | --- | --- | --- |
| Vazia | Iara (Média, Força 3): grade 4 x 5 e linha vermelha | `desktop-1-vazia.png`, `celular-1-vazia.png` | Grade e linha vermelha legíveis; bolsa de moedas vazia abaixo |
| Carregando alguém | Iara com o "Corpo Médio" (4 x 5) | `desktop-2-carregando-alguem.png`, `celular-2-carregando-alguem.png` | O corpo ocupa as 20 células verdes; estado Normal |
| Cheia | Lia (Média, Força 1) com o "Corpo Médio (com ajuda)" (4 x 3) | `desktop-3-cheia.png`, `celular-3-cheia.png` | As 12 células verdes ocupadas |
| Em sobrecarga | Lia com a Lâmina Rúnica girada na linha vermelha | `desktop-4-sobrecarga.png`, `celular-4-sobrecarga.png` | Selo "Sobrecarga" na grade, efeito com ícone na faixa de estado, item com contorno tracejado vermelho |

Nenhuma captura tem rolagem horizontal, e o navegador não registrou erros.

## Ajustes

| Ajuste | Decisão |
| --- | --- |
| Em sobrecarga, o resumo dizia "15 de 12 células", sem explicar o excesso | Corrigido: o resumo acrescenta quantas células ocupadas estão na área vermelha (teste em `InventoryGrid.test.tsx`) |
| No desktop, a grade ocupa pouco espaço numa página larga | Acompanhar na validação de mesa; o tamanho da célula favorece o celular |
| Os corpos aparecem só com o nome, sem ícone | Esperado: corpos genéricos, decisão de 2026-09-27; o Narrador pode definir um ícone de grade depois |
| O cabeçalho ainda diz "Pontos de Poder" | Fora desta mudança: correção prevista em `calcular-valores-da-ficha` (Item 1) |
