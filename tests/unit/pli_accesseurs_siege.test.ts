// ============================================================
// TESTS UNITAIRES — Accesseurs génériques par siège (Phase 1 — Étape 3d)
//
// Vérifie carteDuSiege() et pliEstComplet(), qui remplacent désormais
// les lectures en dur de carteJoueur0/carteJoueur1 dans useGameEngine.ts.
// ============================================================

import { describe, it, expect } from 'vitest'
import { carteDuSiege, pliEstComplet } from '../../src/core/pli'
import { creerCarte } from '../../src/core/deck'

const carteTest = creerCarte('hearts', 'A', 0, 1)

describe('carteDuSiege', () => {
  it('retourne la carte présente au siège demandé', () => {
    expect(carteDuSiege({ cartes: [carteTest, null] }, 0)?.id).toBe(carteTest.id)
  })

  it('retourne null si le siège demandé est vide', () => {
    expect(carteDuSiege({ cartes: [carteTest, null] }, 1)).toBeNull()
  })
})

describe('pliEstComplet', () => {
  it('est faux quand aucune carte n\'a été jouée', () => {
    expect(pliEstComplet({ cartes: [null, null] })).toBe(false)
  })

  it('est faux quand un seul siège a joué', () => {
    expect(pliEstComplet({ cartes: [carteTest, null] })).toBe(false)
  })

  it('est vrai quand les deux sièges ont joué', () => {
    expect(pliEstComplet({ cartes: [carteTest, carteTest] })).toBe(true)
  })
})
