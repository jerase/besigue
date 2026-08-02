// ============================================================
// TESTS UNITAIRES — Étape 7 (Phase 1) : sourceDecision()
//
// sourceDecision() remplace les branchements en dur
// (joueurActif === 0 / vainqueur === 0) dans useGameEngine.ts par
// une lecture générique de Joueur.type. C'est le point d'intégration
// prévu pour la Phase 2 (mode à distance), qui ajoutera une source
// 'distant' sans retoucher la logique d'orchestration.
// ============================================================

import { describe, it, expect } from 'vitest'
import { sourceDecision } from '../../src/hooks/useGameEngine'
import { initialiserPartie } from '../../src/core/init'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState } from '../../src/types'

function makeState(overrides?: Partial<GameState>): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  return { ...state, ...overrides }
}

describe('sourceDecision — comportement actuel (régression)', () => {
  it("siège 0 (humain, config par défaut) → 'humain-local'", () => {
    const state = makeState()
    expect(sourceDecision(state, 0)).toBe('humain-local')
  })

  it("siège 1 (ia, config par défaut) → 'ia'", () => {
    const state = makeState()
    expect(sourceDecision(state, 1)).toBe('ia')
  })
})

describe('sourceDecision — dérivation générique depuis Joueur.type', () => {
  it("un siège dont Joueur.type === 'humain' retourne toujours 'humain-local', quel que soit son index", () => {
    const state = makeState()
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[1] = { ...joueurs[1], type: 'humain' }
    expect(sourceDecision({ ...state, joueurs }, 1)).toBe('humain-local')
  })

  it("un siège dont Joueur.type === 'ia' retourne toujours 'ia', quel que soit son index", () => {
    const state = makeState()
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], type: 'ia' }
    expect(sourceDecision({ ...state, joueurs }, 0)).toBe('ia')
  })

  it("aucune source ne retourne 'distant' à ce stade (non câblé — point d'intégration Phase 2)", () => {
    const state = makeState()
    expect(sourceDecision(state, 0)).not.toBe('distant')
    expect(sourceDecision(state, 1)).not.toBe('distant')
  })
})
