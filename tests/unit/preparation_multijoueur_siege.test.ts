// ============================================================
// TESTS UNITAIRES — PRÉPARATION MULTIJOUEUR (Phase 1 — Étape 1)
//
// Ces tests valident UNIQUEMENT les types/constantes ajoutés en
// pur ajout à l'étape 1. Ils ne touchent à aucun test existant
// et ne dépendent d'aucun autre module que src/types.
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  NB_SIEGES_MIN,
  NB_SIEGES_MAX,
  SIEGES_POSSIBLES,
  estNombreSiegesValide,
  estSiegeValide,
} from '../../src/types'

describe('Constantes de sièges', () => {
  it('NB_SIEGES_MIN vaut 2 (le jeu actuel à 2 joueurs reste le minimum pris en charge)', () => {
    expect(NB_SIEGES_MIN).toBe(2)
  })

  it('NB_SIEGES_MAX vaut 4 (borne haute annoncée par le besoin produit)', () => {
    expect(NB_SIEGES_MAX).toBe(4)
  })

  it('SIEGES_POSSIBLES contient exactement les 4 sièges 0 à 3, dans l\'ordre', () => {
    expect(SIEGES_POSSIBLES).toEqual([0, 1, 2, 3])
  })
})

describe('estNombreSiegesValide', () => {
  it('accepte 2, 3 et 4 sièges', () => {
    expect(estNombreSiegesValide(2)).toBe(true)
    expect(estNombreSiegesValide(3)).toBe(true)
    expect(estNombreSiegesValide(4)).toBe(true)
  })

  it('refuse 0, 1 et 5 sièges', () => {
    expect(estNombreSiegesValide(0)).toBe(false)
    expect(estNombreSiegesValide(1)).toBe(false)
    expect(estNombreSiegesValide(5)).toBe(false)
  })

  it('refuse les nombres non entiers ou négatifs', () => {
    expect(estNombreSiegesValide(2.5)).toBe(false)
    expect(estNombreSiegesValide(-2)).toBe(false)
  })
})

describe('estSiegeValide', () => {
  it('pour une table à 2 sièges, seuls 0 et 1 sont valides', () => {
    expect(estSiegeValide(0, 2)).toBe(true)
    expect(estSiegeValide(1, 2)).toBe(true)
    expect(estSiegeValide(2, 2)).toBe(false)
    expect(estSiegeValide(3, 2)).toBe(false)
  })

  it('pour une table à 4 sièges, 0 à 3 sont valides et 4 est refusé', () => {
    expect(estSiegeValide(0, 4)).toBe(true)
    expect(estSiegeValide(3, 4)).toBe(true)
    expect(estSiegeValide(4, 4)).toBe(false)
  })

  it('refuse un siège négatif ou non entier', () => {
    expect(estSiegeValide(-1, 4)).toBe(false)
    expect(estSiegeValide(1.5, 4)).toBe(false)
  })
})
