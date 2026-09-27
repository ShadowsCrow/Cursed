# Conferência de escopo — calcular-valores-da-ficha (tarefa 1.2)

Data: 2026-09-27. Esta mudança e `carga-por-espacos` estão no mesmo checkout, ainda sem commit. Por isso a conferência não usou o diff global: ela partiu dos arquivos atribuídos a esta mudança.

## Método

- **Atribuição:** o primeiro arquivo criado por esta mudança foi `cursed_platform/catalogos/manifesto.json`, às 03:47 de 2026-09-27. Os arquivos da mudança são os criados ou editados a partir desse momento. Os novos estão listados na passagem de trabalho (`openspec/changes/calcular-valores-da-ficha/HANDOFF.md`).
- **`rules/sistema`:** `find rules/sistema -newer cursed_platform/catalogos/manifesto.json` não devolveu nenhum arquivo. As seis alterações pendentes em `rules/sistema` (`Carga.md`, `Apêndice — Carga e Transporte.md`, `Equipamentos.md`, `Criação de Personagem.md`, `Dano de queda.md` e `Apêndice — Dano de Queda.md`) são de 03:05–03:06, da reescrita do livro em `carga-por-espacos`.
- **Carga:** nenhum módulo novo desta mudança calcula peso, capacidade ou Sobrecarga. As duas edições desta mudança em arquivos de carga foram:
  - `cursed_platform/inventario_grade.py`: o Tamanho da raça passa a vir do catálogo da plataforma;
  - `InventoryGridPanel.tsx`: espaço para enviar a arte e o ícone de grade do item.

  As menções a peso nesses arquivos já existiam e pertencem a `carga-por-espacos`.
- **Sobrepeso legado:** permanece em `efeitos_default.json` com `suspenso.motivo`. Está fora da lista de efeitos default e não se aplica, nem pelo Narrador (422, com o motivo) nem pelo jogador (403). Testes: `test_catalogos`, `test_api_catalogos` e `test_api_efeitos_default`. O ícone `cc_above` é só um ativo visual reaproveitado pela Sobrecarga derivada.

## Resultado

Nenhuma alteração atribuída a esta mudança toca `rules/sistema` ou implementa cálculo de carga, e o Sobrepeso legado continua suspenso.
