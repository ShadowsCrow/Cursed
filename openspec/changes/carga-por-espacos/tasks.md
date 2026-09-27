# Tasks

## 1. Motor da grade e protótipo

- [x] 1.1 Implementar o motor da grade em TypeScript (`gridEngine.ts`: grade verde por Força e Tamanho, ampliações, rotação, sobreposição, área vermelha dinâmica, sobrecarga, mãos e um de cada peça) e verificar com testes Vitest a partir de `fixtures/grade/casos.json`
- [x] 1.2 Criar os componentes de grade (células, itens com dimensão e rotação, borda dourada e marcador de equipado, área vermelha) com arrastar e soltar por mouse e toque e pelo teclado (setas, girar, confirmar, cancelar) com anúncio para leitor de tela, e verificar com testes de componente e axe
- [x] 1.3 Criar a rota `/preview/inventario` (sem servidor) com controles de Força, Tamanho e mochila, kits prontos (guerreiro, mago, ladino, carregar companheiro), criação de item livre e exportação dos números, e verificar abrindo no navegador em desktop e em 400 px

## 2. Calibração e regras

- [x] 2.1 Calibrar com o usuário no protótipo: linhas, colunas, dimensões típicas por tipo, mochilas (ampliação e Requisito de Força), aljava e moedas por pilha padrão, e registrar os números aprovados em `docs/regras/calibracao-carga-em-grade.md`
- [x] 2.2 Reescrever `Carga.md` e `Apêndice — Carga e Transporte.md` para a grade com os números aprovados e verificar que não restam kg nem Capacidade de Carga por peso
- [x] 2.3 Atualizar `Equipamentos.md` (Dimensão no lugar de Peso, peitoral, capacete/luvas/botas só com efeitos, escudo, mochila, aljava, mãos por tipo), `Criação de Personagem.md`, `Dano de queda.md` e `Apêndice — Dano de Queda.md`, e verificar com busca que "peso" só aparece como descrição

## 3. Motor no servidor e banco

- [x] 3.1 Implementar `cursed_platform/domain/grade.py` com o mesmo comportamento e verificar que os casos de `fixtures/grade/casos.json` passam também na suíte Python
- [x] 3.2 Criar a migração Alembic (colunas de grade em `inventory_items`, `mesas.moedas_por_pilha`, `scene_stashes`, `scene_stash_items`, `item_offers`, com RLS e REVOKE no PostgreSQL) e verificar upgrade e downgrade em SQLite e PostgreSQL descartável

## 4. Domínio e API

- [x] 4.1 Implementar `PUT /inventario/arrumacao` (motor, regras de equipar, Requisito de Força, versão, tudo ou nada) e verificar por testes de API sobreposição, segundo capacete, mãos excedidas e conflito de versão
- [x] 4.2 Ampliar a criação e a edição de item e de cartas de item com tipo, subtipo, dimensão, mãos, pilha, dados de mochila e aljava e ícone de grade, com dimensão obrigatória, e verificar por testes de API e contrato
- [x] 4.3 Implementar moedas (configuração `moedas_por_pilha`, reorganização das pilhas, dividir e juntar, excedente para o vermelho) e verificar por testes o cenário de moedas mistas e de redução do limite
- [x] 4.4 Calcular a Sobrecarga como efeito derivado com as consequências e o lembrete de Exaustão, sem reativar o Sobrepeso legado, e verificar por testes que o efeito entra e sai com a área vermelha
- [x] 4.5 Implementar largar a mochila (itens das linhas dela vão para o chão como pilha recuperável) e o fim de ampliações (para o vermelho ou para o chão), e verificar por testes
- [x] 4.6 Integrar o Tamanho base do catálogo de raças com o Tamanho atual informado pelo Narrador, exigindo limpar ou reconfirmar a exceção na troca de raça e sinalizando divergências na migração; verificar por testes de API que não há prioridade acidental de um valor antigo
- [x] 4.7 Considerar levado só o item colocado na grade (bandeja não conta nem se equipa, item sem formato não se equipa, redefinir formato que tira da grade desequipa) e registrar no histórico cada item colocado ou retirado da bandeja; verificar nos motores TypeScript e Python, na API e na interface
- [x] 4.8 Permitir marcar arma de uma mão como versátil e alternar a empunhadura entre uma e duas mãos (validação de mãos no servidor, recusa para arma comum, registro no histórico), e verificar nos motores TypeScript e Python, na API e na interface

## 5. Interface da ficha

- [x] 5.1 Substituir o painel de inventário pela grade (com a bandeja "Sem dimensão", o rascunho local e o reenvio ao reconectar) e verificar com testes de componente e um cenário Playwright de arrumar, girar e equipar
- [x] 5.2 Criação de item com prévia da dimensão, girar e as duas imagens, com aviso de proporção do ícone e as alternativas sem imagem, e verificar por testes
- [x] 5.3 Pilha de moedas com total por tipo, dividir e juntar, e configuração da mesa para o Narrador, verificando por testes
- [x] 5.4 Mostrar o "(i)" com a regra de levantar, empurrar e arrastar no resumo da grade (mouse, foco e toque, cabendo no celular), na ficha e no protótipo, e verificar por teste de componente

## 6. Sala

- [x] 6.1 Garantir em cada mesa as oito cartas padrão de corpo (inteiro e com ajuda por Tamanho, metade da altura arredondada para cima), protegidas contra edição e arquivamento, e remover `character_carries` e `acompanha_token_id` da migração 0016; verificar por testes de API que não duplicam, que a concessão leva o corpo à grade e por um cenário Playwright
- [x] 6.2 Implementar chão e baú da cena com arrastar para a própria grade e disputa resolvida pelo primeiro pedido confirmado, e verificar por teste de concorrência em PostgreSQL
- [x] 6.3 Implementar ofertas de item entre personagens (oferecer, aceitar escolhendo a posição, recusar) com eventos em tempo real, e verificar por testes

## 7. Migração de dados

- [x] 7.1 Migrar os itens existentes para a bandeja "Sem dimensão", com o peso antigo na descrição e sem conversão, e verificar por teste que a repetição não duplica e que nenhum item recebe dimensão sozinho
- [x] 7.2 Atualizar `armas_lib.json` e as cartas de item existentes para o formato novo (tipo e dimensão pendentes de definição pelo Narrador) e verificar a importação

## 8. Verificação

- [x] 8.1 Rodar as suítes Python e frontend, lint, typecheck, build, `check:client`, Playwright e o CI, e verificar tudo verde
- [x] 8.2 Fazer uma passada visual com capturas da grade em desktop e celular (vazia, cheia, em sobrecarga, carregando alguém) e registrar ajustes
- [x] 8.3 Aplicar a migração no Supabase de testes e verificar RLS e ausência de exposição das tabelas novas

## 9. Validação de mesa

- [x] 9.1 Preparar um roteiro em `docs/validation/` com saque disputado, fuga largando a mochila, companheiro desmaiado, troca de armas em combate e reorganização no acampamento
- [ ] 9.2 Realizar a validação de mesa e registrar diversão, clareza, ritmo, tempo gasto organizando e decisões geradas, com cada problema recebendo a decisão de corrigir agora, acompanhar ou rejeitar
