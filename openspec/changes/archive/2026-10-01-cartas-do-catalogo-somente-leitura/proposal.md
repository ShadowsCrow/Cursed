# Proposal

## Why

As habilidades de classe, arquétipo e raça viram cartas na biblioteca da mesa, e hoje o Narrador pode editá-las pelo lápis. Mas o JSON do catálogo prevalece: o que ele muda no título, no texto ou na ativação é apagado na próxima conferência, e os custos que preencher se perdem quando o texto daquela habilidade muda no JSON. O Narrador faz um trabalho que o sistema desfaz sem avisar na hora, e a mesma habilidade pode ter custos diferentes em cada mesa sem que o livro diga isso.

Em 2026-09-30 o usuário decidiu que essas cartas não se editam na mesa: a fonte delas é só o JSON do catálogo, inclusive para os custos.

Classificação: ferramenta exclusiva do Narrador (biblioteca da mesa) e dados do catálogo do sistema. Nenhuma regra de mesa muda.

## What Changes

- As cartas do catálogo do sistema (as que têm `origem_sistema`) deixam de ser editáveis: a biblioteca não mostra o lápis nelas, e a API recusa salvar rascunho ou publicar versão nelas, como já faz com os corpos padrão.
- Custo de Aprendizado, Descansos Mínimos, Potência de Uso e Custo de Uso passam a poder vir do JSON de classes e raças, por habilidade, como campos opcionais. Sem o campo, a carta continua com o valor indefinido; nada é inferido do campo legado `custo`.
- A conferência com o JSON passa a comparar também esses quatro custos: mudar um custo no JSON gera nova versão da carta, como já acontece com o texto.
- O editor deixa de mostrar o aviso "o JSON do catálogo prevalece", que não tem mais caso de uso.

## Non-goals

- Não preencher custos no JSON: os valores atuais continuam indefinidos até o usuário escrevê-los no arquivo.
- Não criar editor de catálogo dentro da aplicação.
- Não mudar cartas criadas pelo Narrador, cartas importadas nem os corpos padrão (já não editáveis).
- Não mudar concessão, oferta, envio nem apresentação dessas cartas.

## Capabilities

### New Capabilities

(nenhuma)

### Modified Capabilities

- `catalogo-de-classes-e-racas`: o requisito "JSON prevalece sobre as cartas de catálogo" passa a proibir a edição dessas cartas na mesa e a incluir os quatro custos no que vem do JSON e no que a conferência compara.

## Impact

- API: `platform/api/cursed_api/cards.py` (recusa de edição).
- Domínio: `cursed_platform/catalogos.py` (leitura dos custos), `cursed_platform/cartas_catalogo.py` (conteúdo e comparação).
- Interface: `platform/frontend/src/app/cards/NarratorLibrary.tsx` e `CardEditor.tsx`.
- Dados: `cursed_platform/catalogos/classes.json` e `racas.json` aceitam os quatro campos opcionais; nenhum arquivo muda nesta mudança.
- Sem migração de banco: as versões já publicadas continuam no histórico.
