# Bésigue — Itération 1 : Moteur de cartes

## Stack
React 18 + TypeScript + Tailwind CSS 4 · Vite 6 · Vitest 2

## Lancer le projet

```bash
npm install
npm run dev        # http://localhost:5173
```

## Tests

```bash
npm test               # 60 tests
npm run test:watch     # mode watch
npm run test:coverage  # rapport de couverture HTML
```

## Build production

```bash
npm run build && npm run preview
```

## Ce qui est implémenté (IT-1)

### Moteur de cartes (src/core/deck.ts)
- Deck complet 132 cartes : 4 jeux x 32 cartes + 4 jokers
- Algorithme Fisher-Yates (aléatoire + déterministe avec graine LCG)
- Identifiants uniques garantis par carte
- Valeurs brisques : As=1, Dix=1, reste=0
- Comptage brisques sur pile, statistiques complètes

### Types (src/types/index.ts)
- Types Carte, Deck, Couleur, Rang, EtatCarte
- Constantes ORDRE_RANGS, VALEURS_BRISQUES, NOM_COULEUR, SYMBOLE_COULEUR

### Logger (src/utils/logger.ts)
- Log JSON structuré persisté dans localStorage
- Niveaux INFO / WARN / ERROR / DEBUG

### Composants UI
- Carte.tsx : rendu SVG inline (face, dos, joker, figures, 6 états visuels)
- DeckDisplay.tsx : affichage deck complet avec filtres par couleur

## Tests : 60 au total

| Fichier | Tests |
|---|---|
| deck.test.ts | 42 |
| types.test.ts | 12 |
| deck.integration.test.ts | 6 |

## Structure

```
src/
  core/deck.ts
  types/index.ts
  utils/logger.ts
  components/ui/Carte.tsx
  components/ui/DeckDisplay.tsx
  App.tsx
tests/
  unit/deck.test.ts
  unit/types.test.ts
  integration/deck.integration.test.ts
  setup.ts
```
