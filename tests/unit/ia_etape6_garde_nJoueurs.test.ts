// ============================================================
// TESTS UNITAIRES — Étape 6 (Phase 1) : garde N-joueurs sur l'IA
//
// choisirCarteIA() et choisirAnnonceIA() sont les deux seuls points
// d'entrée publics du module core/ia/*. Les 10 fichiers internes
// (mémoire, minimax, tables de décision, stratégies) supposent tous
// un adversaire unique et fixe au siège 0. Cette garde empêche
// d'invoquer silencieusement cette IA de duel dans un contexte à
// N joueurs, tant que la Phase 3 n'a pas généralisé ces modules.
// ============================================================

import { describe, it, expect } from 'vitest'
import { choisirCarteIA, choisirAnnonceIA } from '../../src/core/ia'
import { detecterCombinaisonsDisponibles } from '../../src/core/combinaisons'
import { initialiserPartie } from '../../src/core/init'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, NiveauIA } from '../../src/types'

function makeState(overrides?: Partial<GameState>): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  return initialiserChampsIT4({ ...state, ...overrides })
}

/** Construit un état structurellement à N joueurs en dupliquant le joueur 1 (aucune règle N-joueurs n'est exercée, seule la structure compte). */
function avecNJoueurs(state: GameState, n: number): GameState {
  const joueurs = Array.from({ length: n }, (_, i) => ({ ...state.joueurs[1], id: i as 0 | 1 }))
  return { ...state, joueurs }
}

const niveaux: NiveauIA[] = ['facile', 'intermediaire', 'difficile']

describe('Étape 6 — garde N-joueurs sur choisirCarteIA', () => {
  niveaux.forEach(niveau => {
    it(`niveau ${niveau} — lève une erreur explicite et documentée si joueurs.length !== 2 (3 joueurs)`, () => {
      const state = avecNJoueurs(makeState(), 3)
      expect(() => choisirCarteIA(state, niveau)).toThrow(/2 joueurs/)
      expect(() => choisirCarteIA(state, niveau)).toThrow(/Phase 3/)
    })

    it(`niveau ${niveau} — lève une erreur explicite avec 4 joueurs`, () => {
      const state = avecNJoueurs(makeState(), 4)
      expect(() => choisirCarteIA(state, niveau)).toThrow(/2 joueurs/)
    })

    it(`niveau ${niveau} — régression : fonctionne normalement avec 2 joueurs (comportement inchangé)`, () => {
      const state = makeState()
      expect(() => choisirCarteIA(state, niveau)).not.toThrow()
    })
  })
})

describe('Étape 6 — garde N-joueurs sur choisirAnnonceIA', () => {
  niveaux.forEach(niveau => {
    it(`niveau ${niveau} — lève une erreur explicite et documentée si joueurs.length !== 2 (3 joueurs)`, () => {
      const state = avecNJoueurs(makeState(), 3)
      expect(() => choisirAnnonceIA([], state, niveau)).toThrow(/2 joueurs/)
      expect(() => choisirAnnonceIA([], state, niveau)).toThrow(/Phase 3/)
    })

    it(`niveau ${niveau} — régression : fonctionne normalement avec 2 joueurs (comportement inchangé)`, () => {
      const state = makeState()
      const combis = detecterCombinaisonsDisponibles(state, 1)
      expect(() => choisirAnnonceIA(combis, state, niveau)).not.toThrow()
    })
  })
})
