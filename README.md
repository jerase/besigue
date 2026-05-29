# 🃏 Bésigue — La version haïtienne du jeu

> Jeu implémenté par **Jacques ERASE**

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](./LICENSE)
[![Built with React](https://img.shields.io/badge/Built%20with-React%2018-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org)

---

## ⚠️ Propriété intellectuelle / Intellectual Property

**Ce projet est une œuvre originale protégée par le droit d'auteur.**

Tout le code source, les algorithmes, la conception, les règles de jeu
implémentées et la documentation sont la propriété exclusive de
**Jacques ERASE** © 2026. Toute reproduction, distribution ou
utilisation commerciale est strictement interdite sans autorisation
écrite préalable. Voir le fichier [`LICENSE`](./LICENSE) pour les
détails complets.

**This project is an original work protected by copyright.**

All source code, algorithms, design, implemented game rules, and
documentation are the exclusive property of **Jacques ERASE** © 2026.
Any reproduction, distribution, or commercial use is strictly
prohibited without prior written authorization. See [`LICENSE`](./LICENSE)
for full details.

---

## 🇭🇹 Présentation / Overview

Le **Bésigue** est un jeu de cartes d'origine française particulièrement
populaire en Haïti, où il a développé ses propres règles et traditions
au fil des générations. Cette application en est une implémentation
numérique complète, fidèle à la **version haïtienne** du jeu.

**Bésigue** is a card game of French origin particularly popular in
Haiti, where it has developed its own rules and traditions over
generations. This application is a complete digital implementation,
faithful to the **Haitian version** of the game.

---

## ✨ Fonctionnalités / Features

### Jeu / Gameplay
- 🃏 Partie complète contre une **Intelligence Artificielle** à 3 niveaux
- 🏆 Système de manches avec compteur de points (victoire à 4-0)
- ⚡ **Charles Bézigue** : victoire en bas de table (+2 points de manche)
- 🎯 **Cent Points** : victoire finale de la partie (4-0)
- 📋 14 combinaisons détectées automatiquement (mariage, quinte, bésigue, carrés…)
- 🔄 Phase libre et phase finale avec obligations de jeu
- 💾 Sauvegarde automatique et reprise de partie

### Intelligence Artificielle
- 🤖 **3 niveaux** : Facile, Intermédiaire, Difficile
- 🧠 Stratégies avancées : mémorisation des cartes vues, gestion du score de
  partie, préservation des atouts, protection des combinaisons par priorité
- 🎲 Variation de style en niveau difficile (anti-prévisibilité)
- 🃏 Stratégies pré-atout, couper le 10 et l'As, gestion des étalées

### Interface
- 📱 Responsive : desktop et mobile
- 🎨 Interface sombre élégante (Tailwind CSS)
- 📊 Jauge de pioche animée (verte → rouge)
- 🃏 Cartes étalées superposées pour mariages et bésigues
- 📜 Historique des annonces et des 20 dernières parties
- 📖 Écran des règles et tutoriel interactif

---

## 🛠️ Stack technique / Tech Stack

| Technologie | Usage |
|-------------|-------|
| React 18 | Interface utilisateur |
| TypeScript 5 | Typage statique complet |
| Tailwind CSS 4 | Styles et mise en page |
| Vite | Build et développement |
| Vitest | Suite de tests (700+ tests) |
| @testing-library/react | Tests de composants |

---

## 🚀 Installation et lancement / Setup

> **Prérequis** : Node.js 18+ et npm

```bash
# Cloner le dépôt (avec autorisation uniquement)
# Clone the repository (with authorization only)
git clone <url-du-dépôt>
cd besigue

# Installer les dépendances / Install dependencies
npm install

# Lancer en développement / Start development server
npm run dev
# → http://localhost:5173

# Lancer les tests / Run tests
npm test

# Build de production / Production build
npm run build
```

---

## 🎮 Comment jouer / How to play

### Objectif / Objective
Être le premier joueur à remporter **4 manches** avec l'adversaire à 0,
en accumulant des points via des annonces de combinaisons et des brisques
(As et 10) remportées dans les plis.

Be the first player to win **4 rounds** while the opponent has 0, by
accumulating points through combination announcements and brisques
(Aces and 10s) won in tricks.

### Déroulement / Gameplay
1. Chaque joueur reçoit 9 cartes. La pioche contient 114 cartes.
2. Le joueur ouvre le pli en jouant une carte.
3. L'adversaire répond. Le vainqueur du pli pioche une carte.
4. Après un pli gagné, le joueur peut annoncer une combinaison.
5. La manche se termine quand un joueur atteint **1 000 points**.
6. En phase finale (pioche vide), obligation de fournir la couleur.

### Combinaisons principales / Main combinations

| Combinaison | Points |
|-------------|--------|
| Mariage atout (Roi + Dame atout) | 40 pts |
| Quinte (As, 10, Roi, Dame, Valet atout) | 250 pts |
| 4 As | 100 pts |
| 4 Rois | 80 pts |
| 4 Dames | 60 pts |
| 4 Valets | 40 pts |
| Bésigue (Dame♠ + Valet♦) — 1er | 100 pts |
| Bésigue (Dame♠ + Valet♦) — suivants | 40 pts |
| Mariage hors atout | 20 pts |
| 7 d'atout | 10 pts |

---

## 📁 Structure du projet / Project Structure

```
besigue/
├── src/
│   ├── core/           # Moteur de jeu pur (logique métier)
│   │   ├── combinaisons.ts   # Détection des 14 combinaisons
│   │   ├── finManche.ts      # Calcul fin de manche, brisques, victoire
│   │   ├── ia.ts             # Intelligence artificielle (3 niveaux)
│   │   ├── init.ts           # Initialisation des parties et manches
│   │   └── pli.ts            # Règles du pli (libre et finale)
│   ├── hooks/
│   │   └── useGameEngine.ts  # Orchestrateur React de l'état du jeu
│   ├── screens/        # Écrans de l'application
│   │   ├── EcranAccueil.tsx
│   │   ├── EcranTable.tsx    # Table de jeu principale
│   │   ├── EcranFinManche.tsx
│   │   ├── EcranRegles.tsx
│   │   └── EcranTutoriel.tsx
│   ├── components/ui/  # Composants réutilisables
│   ├── types/          # Types TypeScript
│   └── utils/          # Logger, persistence localStorage
├── tests/
│   ├── unit/           # Tests unitaires (moteur de jeu, IA)
│   └── integration/    # Tests d'intégration
├── LICENSE             # Licence propriétaire
└── README.md           # Ce fichier
```

---

## 🧪 Tests / Testing

Le projet dispose d'une suite de tests complète couvrant le moteur de jeu,
les stratégies de l'IA, les règles des combinaisons et la persistence.

```bash
npm test                        # Tous les tests
npm test -- --reporter=verbose  # Mode verbeux
npm test -- tests/unit/ia_*.test.ts  # Tests IA uniquement
```

**Couverture principale :**
- ✅ Moteur de pli (phase libre et finale)
- ✅ 14 combinaisons et règles de réutilisation
- ✅ Fin de manche (brisques, en bas table, Charles Bézigue)
- ✅ Compteur de manches et victoire de partie (Cent Points)
- ✅ Intelligence artificielle (tous niveaux, toutes stratégies)
- ✅ Persistence et sauvegarde
- ✅ Phase finale (rapatriement des étalées)

---

## 📜 Licence / License

Ce projet est distribué sous **licence propriétaire**.
Voir le fichier [`LICENSE`](./LICENSE) pour les conditions complètes.

This project is distributed under a **proprietary license**.
See the [`LICENSE`](./LICENSE) file for full terms.

**En résumé / In summary :**
- ✅ Usage privé personnel toléré / Private personal use tolerated
- ✅ Consultation du code à des fins d'étude / Code viewing for study
- ❌ Redistribution interdite / Redistribution prohibited
- ❌ Usage commercial interdit / Commercial use prohibited
- ❌ Modification et œuvres dérivées interdites / Modification and derivative works prohibited

---

## 👤 Auteur / Author

**Jacques ERASE**
© 2026 — Tous droits réservés / All rights reserved

---

*Bésigue — La version haïtienne du jeu*
