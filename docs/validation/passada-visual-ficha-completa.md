# Passada visual — ficha completa (calcular-valores-da-ficha, 9.2)

Data: 2026-09-27. As capturas foram feitas com `e2e/screenshots.mjs` sobre API e Vite locais, com banco SQLite descartável e os dados de exemplo de `semear()`, em desktop (1440 × 900) e celular (390 × 844). Arquivos em `platform/frontend/.screenshots/ficha-completa/`.

## Telas conferidas

| Captura | O que mostra |
| --- | --- |
| `06-ficha-informacoes` / `22-jogador-informacoes` | Selects de classe, arquétipo e raça, com a cor da classe junto do nome; nível só para o Narrador; Tamanho base "Médio — da raça Elfo" e Tamanho atual "Sem exceção"; conceito do arquétipo; "Enviar retrato" no cabeçalho |
| `20-troca-de-classe` | Popover de troca Feiticeiro → Druida: o arquétipo Arcano será limpo e a lista mostra as cartas que saem e as que entram |
| `18-ficha-personalidade` | Alinhamento, pecado com ícone e os nove campos com a dica de preenchimento |
| `07-ficha-atributos` | Tabela de atributos no celular |
| `19-ficha-status` | Grupo "Recursos" (PV/PP inicial, Escalas e máximos) acima do Status |
| `08-ficha-efeitos` / `17-jogador-efeitos` | Ícone padrão no lugar dos símbolos por posição; ações do jogador |
| `21-jogador-aplicar-condicao` | "Aplicar condição" do jogador: lista agrupada, prévia dos modificadores e "Substitui Ofuscado" em Cego |
| `23-ajuste-pv` | Diálogo de ajuste de PV/PP do Narrador |
| `04-biblioteca` / `14-editor-carta` | Cartas de catálogo rotuladas, painel "Ícones das condições" e editor de carta |

## Problemas encontrados

| Problema | Decisão |
| --- | --- |
| Os máximos de PV/PP e os recursos da aba Status apareciam com sinal ("Máximo +22", "+14"), como se fossem bônus | **Corrigido agora:** valores do grupo "recurso" aparecem sem sinal |
| Um campo de personalidade vazio mostrava a dica em negrito, igual a um valor gravado ("Ex: runas antigas") | **Corrigido agora:** a dica aparece esmaecida e em itálico |
| Cartas de habilidade do catálogo apareciam como "Padrão do sistema · não se edita", o que contrariava o design (o Narrador cria versões; o JSON prevalece e o editor avisa) | **Corrigido agora:** só os corpos padrão continuam bloqueados; as cartas de catálogo mostram "Catálogo do sistema" e "Editar" |
| O popover de edição abre por hover e o clique logo depois o fecha. Com mouse, "Editar" funciona passando o cursor, mas o clique fecha. O problema vem de antes desta mudança (`Popover`, usado também pelo `EditableField`) | **Acompanhar:** o comportamento é do componente base; propor manter aberto quando o clique vier logo depois do hover |
| A prévia das condições mostra os alvos em código (`ataque -2 (depende_visao)`, `teste:percepcao`) | **Acompanhar:** traduzir alvos e contextos para texto de jogo num item futuro |
| As tags das cartas de catálogo mostram o formato interno (`classe:Especialista de Combate`) | **Acompanhar:** exibir como "Classe: Especialista de Combate" na face da carta |

Depois das correções, as capturas `18`, `19` e `04` foram refeitas e conferidas. Não houve erro de navegador em nenhuma tela.
