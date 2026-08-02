// ============================================================
// TESTS UNITAIRES — Étape 5 (Phase 1) : finManche.ts
//
// 1) Garde explicite : calculerBrisques() et appliquerFinManche()
//    doivent lever une erreur claire si state.joueurs.length !== 2,
//    car l'algorithme de brisques et la règle de victoire de partie
//    (adversaire à 0) sont des règles de duel, différées à la Phase 3.
//
// 2) Généralisation sûre de mancheTerminee() : parcours dynamique de
//    state.joueurs (concept universel « toutes les mains sont vides »,
//    qui ne dépend d'aucune règle de duel).
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  calculerBrisques,
  appliquerFinManche,
  mancheTerminee,
} from '../../src/core/finManche'
import { initialiserPartie } from '../../src/core/init'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState } from '../../src/types'

function makeState(overrides?: Partial<GameState>): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  return initialiserChampsIT4({ ...state, ...overrides })
}

/** Construit un état structurellement à N joueurs en dupliquant le joueur 0 (aucune règle N-joueurs n'est exercée, seule la structure compte). */
function avecNJoueurs(state: GameState, n: number): GameState {
  const joueurs = Array.from({ length: n }, (_, i) => ({ ...state.joueurs[0], id: i as 0 | 1 }))
  return { ...state, joueurs }
}

describe('Étape 5 — garde N-joueurs sur les règles de duel', () => {
  it('calculerBrisques() lève une erreur explicite et documentée si joueurs.length !== 2', () => {
    const state = avecNJoueurs(makeState(), 3)
    expect(() => calculerBrisques(state)).toThrow(/2 joueurs/)
    expect(() => calculerBrisques(state)).toThrow(/Phase 3/)
  })

  it('appliquerFinManche() lève une erreur explicite et documentée si joueurs.length !== 2', () => {
    const state = avecNJoueurs(makeState(), 4)
    expect(() => appliquerFinManche(state)).toThrow(/2 joueurs/)
    expect(() => appliquerFinManche(state)).toThrow(/Phase 3/)
  })

  it('calculerBrisques() lève aussi une erreur avec 1 seul joueur (structure invalide)', () => {
    const state = avecNJoueurs(makeState(), 1)
    expect(() => calculerBrisques(state)).toThrow(/2 joueurs/)
  })

  it('régression : calculerBrisques() fonctionne normalement avec 2 joueurs (comportement inchangé)', () => {
    const state = makeState()
    expect(() => calculerBrisques(state)).not.toThrow()
  })

  it('régression : appliquerFinManche() fonctionne normalement avec 2 joueurs (comportement inchangé)', () => {
    const state = makeState()
    expect(() => appliquerFinManche(state)).not.toThrow()
  })
})

describe('Étape 5 — mancheTerminee() généralisé (parcours dynamique de state.joueurs)', () => {
  it('régression : faux si des cartes restent en main (2 joueurs, phase finale)', () => {
    const state = makeState({ phase: 'finale' })
    expect(mancheTerminee(state)).toBe(false) // mains non vides par défaut à l'init
  })

  it('régression : vrai si les 2 mains et cartesEtalees sont vides et phase finale', () => {
    const state = makeState({ phase: 'finale' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [] }
    joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [] }
    expect(mancheTerminee({ ...state, joueurs })).toBe(true)
  })

  it('régression : faux si phase !== finale même si toutes les mains sont vides', () => {
    const state = makeState({ phase: 'libre' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [] }
    joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [] }
    expect(mancheTerminee({ ...state, joueurs })).toBe(false)
  })

  it('généralisation structurelle : fonctionne aussi sur un tableau à 3 joueurs (faux si un seul a encore des cartes)', () => {
    const state = avecNJoueurs(makeState({ phase: 'finale' }), 3)
    const joueurs = state.joueurs.map((j, i) =>
      i === 2 ? j : { ...j, main: [], cartesEtalees: [] }
    )
    // Le joueur d'index 2 a encore des cartes en main (héritées du joueur 0 dupliqué) → pas terminé
    expect(mancheTerminee({ ...state, joueurs })).toBe(false)
  })

  it('généralisation structurelle : vrai sur un tableau à 3 joueurs si tous ont les mains/étalées vides', () => {
    const state = avecNJoueurs(makeState({ phase: 'finale' }), 3)
    const joueurs = state.joueurs.map(j => ({ ...j, main: [], cartesEtalees: [] }))
    expect(mancheTerminee({ ...state, joueurs })).toBe(true)
  })
})
