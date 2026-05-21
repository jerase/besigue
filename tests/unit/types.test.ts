// ============================================================
// TESTS UNITAIRES — TYPES ET CONSTANTES (IT-1)
// ============================================================

import { describe, it, expect } from 'vitest'
import { ORDRE_RANGS, VALEURS_BRISQUES, NOM_COULEUR, NOM_RANG, SYMBOLE_COULEUR } from '../../src/types'

describe('ORDRE_RANGS', () => {
  it("As est le rang le plus fort", () => {
    expect(ORDRE_RANGS['A']).toBeGreaterThan(ORDRE_RANGS['10'])
    expect(ORDRE_RANGS['A']).toBeGreaterThan(ORDRE_RANGS['K'])
    expect(ORDRE_RANGS['A']).toBeGreaterThan(ORDRE_RANGS['Q'])
    expect(ORDRE_RANGS['A']).toBeGreaterThan(ORDRE_RANGS['J'])
    expect(ORDRE_RANGS['A']).toBeGreaterThan(ORDRE_RANGS['9'])
    expect(ORDRE_RANGS['A']).toBeGreaterThan(ORDRE_RANGS['8'])
    expect(ORDRE_RANGS['A']).toBeGreaterThan(ORDRE_RANGS['7'])
  })

  it("ordre décroissant : As > 10 > Roi > Dame > Valet > 9 > 8 > 7", () => {
    const ordre = ['A', '10', 'K', 'Q', 'J', '9', '8', '7'] as const
    for (let i = 0; i < ordre.length - 1; i++) {
      expect(ORDRE_RANGS[ordre[i]]).toBeGreaterThan(ORDRE_RANGS[ordre[i + 1]])
    }
  })

  it("7 est le rang le plus faible (hors Joker)", () => {
    const rangs = ['A', '10', 'K', 'Q', 'J', '9', '8'] as const
    rangs.forEach(r => {
      expect(ORDRE_RANGS['7']).toBeLessThan(ORDRE_RANGS[r])
    })
  })

  it("Joker a un rang inférieur à tout", () => {
    const rangs = ['A', '10', 'K', 'Q', 'J', '9', '8', '7'] as const
    rangs.forEach(r => {
      expect(ORDRE_RANGS['JOKER']).toBeLessThan(ORDRE_RANGS[r])
    })
  })

  it("contient tous les 9 rangs", () => {
    const rangsAttendus = ['A', '10', 'K', 'Q', 'J', '9', '8', '7', 'JOKER']
    rangsAttendus.forEach(r => {
      expect(ORDRE_RANGS).toHaveProperty(r)
    })
  })
})

describe('VALEURS_BRISQUES', () => {
  it("As = 1 brisque", () => {
    expect(VALEURS_BRISQUES['A']).toBe(1)
  })

  it("Dix = 1 brisque", () => {
    expect(VALEURS_BRISQUES['10']).toBe(1)
  })

  it("Roi, Dame, Valet, 9, 8, 7, Joker = 0 brisque", () => {
    const zeros = ['K', 'Q', 'J', '9', '8', '7', 'JOKER'] as const
    zeros.forEach(r => {
      expect(VALEURS_BRISQUES[r]).toBe(0)
    })
  })

  it("seuls As et 10 ont une valeur brisque", () => {
    const avecValeur = Object.entries(VALEURS_BRISQUES).filter(([, v]) => v > 0)
    expect(avecValeur).toHaveLength(2)
    const rangs = avecValeur.map(([r]) => r)
    expect(rangs).toContain('A')
    expect(rangs).toContain('10')
  })
})

describe('NOM_COULEUR', () => {
  it("contient les 4 couleurs en français", () => {
    expect(NOM_COULEUR.spades).toContain('Pique')
    expect(NOM_COULEUR.hearts).toContain('Cœur')
    expect(NOM_COULEUR.diamonds).toContain('Carreau')
    expect(NOM_COULEUR.clubs).toContain('Trèfle')
  })
})

describe('SYMBOLE_COULEUR', () => {
  it("contient les symboles Unicode corrects", () => {
    expect(SYMBOLE_COULEUR.spades).toBe('♠')
    expect(SYMBOLE_COULEUR.hearts).toBe('♥')
    expect(SYMBOLE_COULEUR.diamonds).toBe('♦')
    expect(SYMBOLE_COULEUR.clubs).toBe('♣')
  })
})

describe('NOM_RANG', () => {
  it("contient tous les rangs en français", () => {
    expect(NOM_RANG['A']).toBe('As')
    expect(NOM_RANG['K']).toBe('Roi')
    expect(NOM_RANG['Q']).toBe('Dame')
    expect(NOM_RANG['J']).toBe('Valet')
    expect(NOM_RANG['JOKER']).toBe('Joker')
  })
})
