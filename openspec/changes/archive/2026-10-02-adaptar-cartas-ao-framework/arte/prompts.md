# Prompts das artes (adaptar-cartas-ao-framework)

## Conceito da pré-visualização da importação

Gerados pelo Codex ($imagegen, gpt-5.6-sol) em 2026-10-01, com a captura da pré-visualização antiga anexada (`referencia.png`). Escolhido: variante A (`conceito-previa.png`), carta grande à esquerda e painel à direita. A variante B (`conceito-previa-alternativo.png`) deixava a carta pequena e o painel apertado.

### Variante A

```text
Use $imagegen to generate exactly ONE image, and nothing else (do not write code, do not edit files).

Create a high-fidelity UI concept (screen mockup, 1536x1024, landscape) for a web app of a dark-fantasy tabletop RPG called "Cursed". The attached image is the CURRENT screen: a plain modal "Importar carta por código" that previews a spell card. Redesign ONLY this import preview as a card REVEAL, in the spirit of the Pokémon TCG Pocket app card reveal: the imported card is the hero of the screen.

Layout (variant A):
- Full dark overlay over the app, deep navy/black with a soft radial golden-orange glow and drifting embers/sparkles behind the card, like a booster pack reveal.
- LEFT/CENTER: the card, large (about 60% of the height), slightly tilted in 3D with a subtle holographic foil sheen sweeping diagonally. Keep the SAME card design as the reference: ornate gold frame, painted banner on top (purple night scene with a round gold medallion holding a blue flame), parchment body with type "MAGIA", title "Lume de Brasa", short text. Under the card, a soft reflection/shadow on the floor.
- RIGHT: a tall ornate panel (dark leather with thin gold filigree corners) titled "Prévia da importação" with a small seal "CR1". Inside: a row of 3 big medallion badges: "GRAU Básica", "CUSTO DE USO 1 PP", "POTÊNCIA 6"; below, a two-column list of small labeled rows with gold line icons: Escola Elemental, Tipo Ativa, Alcance Pessoal, Forma Aura, Duração "Até uma hora, Concentração", Teste "Automático", Componentes "Verbal e somático", Descansos mínimos 3, Custo de aprendizado 16 PP. A thin green note "Código válido · nenhum aviso".
- BOTTOM RIGHT: primary button with red wax-seal style "Criar rascunho" and a ghost button "Cancelar". A small collapsed field at the top of the panel: "Código colado · Trocar código".
- All text in Brazilian Portuguese, crisp and legible, serif display font like Cormorant Garamond for titles.
- Rich ornamental density (gold filigree, pieces breaking out of boxes), no plain boxes. No logos, no Pokémon characters.

When done, reply only with the absolute path of the generated image file.
```

### Variante B

Igual à A, com a carta centralizada no alto, o painel abaixo dela e os botões no centro.
