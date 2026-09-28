# Tarefas — aba-resumo-da-ficha

## 1. Regras

- [x] 1.1 Confirmar que nenhuma página de `rules/sistema` muda: o Resumo só apresenta valores e a História é narrativa, sem efeito mecânico. Registrar a conferência no `HANDOFF.md` da mudança (verificação: nota escrita, `git diff rules/` vazio).

## 2. Dados do sistema

- [x] 2.1 Adicionar a História a `campos_personalidade` em `listas_ficha.json` (`longo: true`, `limite: 4000`, dica aprovada pelo usuário) e o mapa `icones_ficha` (nome gravado na ficha → ícone, com os títulos de grupo como reserva); registrar a transformação no `manifesto.json` (verificação: `test_catalogos.py` cobre o novo campo, o limite e os ícones; teste do manifesto verde).
- [x] 2.2 `catalogos.py` lê `longo` e `limite` (inteiro positivo, opcionais) e `icones_ficha` (objeto de nome para ícone; nome preenchido e único, ícone em minúsculas), com mensagens de erro de carga (verificação: testes de JSON inválido — limite `0`, negativo, texto ou booleano, `longo` não booleano, ícone vazio ou fora do formato; mapa ausente aceito). O servidor não tem a lista de nomes de atributos e perícias; um ícone desconhecido é ignorado na tela.

## 3. Servidor

- [x] 3.1 Expor `longo`, `limite` e `icones_ficha` em `CampoPersonalidadeResumo`/listas da ficha (`contracts.py`, `catalogs.py`) (verificação: `test_api_catalogos.py` confere os campos na resposta).
- [x] 3.2 `validacao_ficha.py` recusa texto de campo de personalidade acima do `limite` do JSON; 4000 aceito, 4001 recusado com o limite na mensagem; fichas antigas sem História continuam gravando (verificação: `test_validacao_ficha.py` e `test_api_validacao_ficha.py`).
- [x] 3.3 Rótulo "História" na auditoria e em `fieldLabels.ts`; campo sujeito a bloqueio e aprovação da mesa como os demais (verificação: teste de auditoria e de pedido pendente para `personalidade.historia`).
- [x] 3.4 Destino `ilustracao` em `imagens.py` (8 MB, exibição 1536 px) e alvo em `images.py` gravando `ficha.personagem.ilustracao_ativo`, com política do campo `personagem.ilustracao_ativo`, remoção e auditoria "ilustração alterada" (verificação: `test_api_imagens.py` — envio, troca sem mexer no retrato, remoção, 9 MB recusado, jogador com mesa bloqueada recusado, leitura negada a quem não lê a ficha, cópia de exibição com 1536 px no lado maior).
- [x] 3.5 Garantir que a vitrine pública do Narrador não expõe `ilustracao_ativo` (verificação: teste em `narrador`).
- [x] 3.6 Regenerar OpenAPI e cliente (`python -m cursed_platform.export_openapi`, `npm run generate:client`) (verificação: `export_openapi --check` e `npm run check:client` verdes).

## 4. Interface — dados e seletores

- [x] 4.1 `fichaAccess.ts` passa a ler `ilustracaoAtivo`; `catalogoApi.ts` expõe `longo`, `limite` e `icones_ficha` (verificação: `npm run typecheck`).
- [x] 4.2 `resumo.ts` com `periciasEmDestaque`, `atributosAgrupados`, `itensEquipados`, `habilidadesAprendidas` e `imagemCentral` (verificação: Vitest cobre o cenário da spec — Arcanismo 3, Esquiva 2, Investigação 2, Ocultismo 2, Prontidão 1, Furtividade 1 —, nenhuma perícia acima de 0, `total` nulo, mais de 5 itens, carta em aprendizado e de item excluídas, ordem por aquisição e a cadeia ilustração → retrato → arte padrão).
- [x] 4.3 Subir `useCartasDoPersonagem` para `CharacterSheetPage` sem mudar o painel de cartas (verificação: `CharacterSheetPage.test.tsx` confirma uma única busca de cartas ao alternar entre Resumo e Habilidades).

## 4A. Prova visual

- [x] 4A.1 Página estática `/preview/resumo` com um personagem fictício de exemplo (Thalen Aerendir, Mago Elfo), montando a composição completa do Resumo (pergaminho com bordas gastas, molduras e cantos em SVG, título ornado, medalhões de PV/PP/Defesa, quadros laterais, imagem central com dissolução na base, faixa de História com capitular) só com componentes e tokens do tema, e uma camada opcional de cena de fundo pintada atrás da figura (com fallback em gradiente quando a arte não existe). Os componentes visuais nascem já reutilizáveis para a seção 5 (verificação: teste de renderização da página; capturas em 1440 px e 360 px sem rolagem horizontal; **aprovação do usuário** comparando com a imagem de referência, registrada no `HANDOFF.md`).
- [x] 4A.2 Prompt da cena de fundo do Resumo em `arte/prompts.md` da mudança, para o usuário gerar no ChatGPT, e entrada no `preparar_arte.py` quando a arte existir (verificação: prompt escrito; script gera o WebP quando a matriz está em `arte-original/`).
- [x] 4A.3 Mais ornamentos, a pedido do usuário (design D4a e D4b): molduras recortadas em 9 fatias, remates, crista e pingente com asas em Recursos, selo da rosa dos ventos na Identidade, cantos com folhagem e flores nas bordas da folha, volutas nos títulos; espaços para as pinturas opcionais (primeiro plano, natureza-morta, bússola) com prompts em `arte/prompts.md`, recorte e fundo transparente no `preparar_arte.py` (verificação: `ResumoVisual.test.tsx` cobre pinturas ausentes, carregadas e com falha; `test_preparar_arte.py` cobre as quatro pinturas e a remoção só do fundo ligado às bordas; capturas em 1440, 900 e 360 px sem rolagem horizontal).

## 5. Interface — aba Resumo

- [x] 5.1 Aba "Resumo" primeira e padrão em `SECTIONS`; `?secao=` e seções antigas continuam funcionando; `SheetHeader` oculto só no Resumo (verificação: testes de página — sem `secao` abre Resumo, `secao=pericias` abre Perícias, `habilidades` abre cartas, setas do teclado percorrem as abas).
- [x] 5.2 `ResumoFicha.tsx` com identidade, recursos (PV/PP atual e máximo, Defesa em destaque, Armadura e RDB menores, "—" com motivo quando não calculável), Atributos, Perícias, Equipamentos, Habilidades e História com capitular e parágrafos (verificação: testes de componente para cada quadro e cada estado vazio da spec).
- [x] 5.3 Atalhos acessíveis por teclado de cada quadro para a aba correspondente (verificação: teste de clique e Enter no atalho de Perícias muda a aba e o endereço).
- [x] 5.4 Imagem central com moldura 2:3, recorte ancorado no topo, texto alternativo com o nome e ação de enviar/trocar/remover ilustração só para quem pode editar (verificação: testes com e sem permissão; envio chama o destino `ilustracao` e invalida a ficha).
- [x] 5.5 `resumo.css` com a grade de três colunas, duas colunas intermediárias e uma coluna em celular, ornamentos em CSS/SVG com `aria-hidden`, sobre os tokens do tema (verificação: `tokens.test.ts` cobre os pares de contraste novos ≥ 4,5:1; captura em 360 px sem rolagem horizontal).
- [x] 5.6 Resumo acompanha a ficha: equipar item, receber dano e aprender carta em outra aba refletem ao voltar, sem recarregar (verificação: teste de página com invalidação das consultas).

## 6. Interface — História

- [x] 6.1 Campo longo com contador de caracteres e limite em `PersonalityPanel.tsx` e na etapa Personalidade do assistente (`CamposDasEtapas.tsx`), lendo `longo`/`limite` do JSON (verificação: testes do painel e do assistente — contador, bloqueio ao passar de 4000, quebras de linha preservadas).

## 7. Migração

- [x] 7.1 Confirmar que nenhuma ficha existente muda: sem História e sem ilustração, o Resumo mostra os estados vazios (verificação: `test_fichas_existentes_inalteradas.py` verde; teste do Resumo com ficha de `fixtures/legacy`).

## 8. Verificação

- [x] 8.1 Suítes completas: `npm run lint`, `npm run typecheck`, `npm test`, `npm run check:client`, `python -m unittest discover -s cursed_platform/tests -t .` e `export_openapi --check` verdes.
- [x] 8.2 E2E: jogador abre a ficha no Resumo, envia ilustração, escreve a História em Personalidade e vê ambas no Resumo, em desktop e em 360 px (verificação: `npm run test:e2e` verde).
- [x] 8.3 Capturas novas do Resumo (completo, vazio, celular) em `npm run capturas` e comparação lado a lado com a imagem de referência, aprovada pelo usuário (verificação: aprovação registrada no `HANDOFF.md`).
- [x] 8.5 Execução verde do workflow `platform-contract.yml` no GitHub Actions após commit e push, registrada no `HANDOFF.md`.
