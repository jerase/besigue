// ============================================================
// TESTS D'INTÉGRATION — DECK COMPLET (IT-1)
// Scénarios métier de bout en bout
// ============================================================

import { describe, it, expect } from 'vitest'
import { creerDeck, creerDeckMelange, melangerFisherYates, compterBrisques, verifierUniciteIds, statsDeck } from '../../src/core/deck'

describe('Intégration - cycle de vie du deck', () => {
  it("création → mélange → vérification intégrité complète", () => {
    const deck = creerDeck()

    // 1. Avant mélange
    expect(deck.cartes).toHaveLength(132)
    expect(verifierUniciteIds(deck)).toBe(true)

    // 2. Après mélange
    const melange = melangerFisherYates(deck.cartes)
    const deckMelange = { ...deck, cartes: melange }
    expect(deckMelange.cartes).toHaveLength(132)
    expect(verifierUniciteIds(deckMelange)).toBe(true)

    // 3. Stats inchangées après mélange
    const stats = statsDeck(deckMelange)
    expect(stats.total).toBe(132)
    expect(stats.jokers).toBe(4)
    expect(stats.brisquesTotal).toBe(32)
  })

  it("distribution simulée de 9 cartes × 2 joueurs", () => {
    const deck = creerDeckMelange()
    const mainJ1 = deck.cartes.slice(0, 9)
    const mainJ2 = deck.cartes.slice(9, 18)
    const pioche = deck.cartes.slice(18)

    expect(mainJ1).toHaveLength(9)
    expect(mainJ2).toHaveLength(9)
    expect(pioche).toHaveLength(114) // 132 - 18

    // Aucune carte partagée entre les mains
    const idsJ1 = new Set(mainJ1.map(c => c.id))
    const idsJ2 = new Set(mainJ2.map(c => c.id))
    const intersection = [...idsJ1].filter(id => idsJ2.has(id))
    expect(intersection).toHaveLength(0)

    // La pioche ne contient pas de cartes des mains
    const idsPioche = new Set(pioche.map(c => c.id))
    const doublon1 = [...idsJ1].filter(id => idsPioche.has(id))
    const doublon2 = [...idsJ2].filter(id => idsPioche.has(id))
    expect(doublon1).toHaveLength(0)
    expect(doublon2).toHaveLength(0)

    // Total conservé
    expect(mainJ1.length + mainJ2.length + pioche.length).toBe(132)
  })

  it("comptage brisques cohérent : total deck = somme piles simulées", () => {
    const deck = creerDeckMelange()

    // Simulation : J1 gagne les 66 premières cartes, J2 les 66 suivantes
    const pileJ1 = deck.cartes.slice(0, 66)
    const pileJ2 = deck.cartes.slice(66)

    const brisquesJ1 = compterBrisques(pileJ1)
    const brisquesJ2 = compterBrisques(pileJ2)

    expect(brisquesJ1 + brisquesJ2).toBe(32)
  })

  it("plusieurs mélanges successifs préservent l'intégrité", () => {
    let cartes = creerDeck().cartes
    for (let i = 0; i < 10; i++) {
      cartes = melangerFisherYates(cartes)
    }
    const deck = { cartes, graine: Date.now() }
    expect(deck.cartes).toHaveLength(132)
    expect(verifierUniciteIds(deck)).toBe(true)
    expect(compterBrisques(deck.cartes)).toBe(32)
  })
})

describe('Intégration - scénario brisques selon SF-13', () => {
  it("CAS A - un joueur a plus de brisques", () => {
    // Simuler : J1 = 17 brisques, J2 = 15 brisques
    const deck = creerDeck()
    const normales = deck.cartes.filter(c => !c.estJoker)
    const brisques = normales.filter(c => c.rang === 'A' || c.rang === '10') // 32 cartes

    const pileJ1 = brisques.slice(0, 17)
    const pileJ2 = brisques.slice(17, 32)

    expect(compterBrisques(pileJ1)).toBe(17)
    expect(compterBrisques(pileJ2)).toBe(15)
    expect(compterBrisques(pileJ1) + compterBrisques(pileJ2)).toBe(32)
  })

  it("CAS B - égalité de brisques (16-16)", () => {
    const deck = creerDeck()
    const brisques = deck.cartes.filter(c => c.rang === 'A' || c.rang === '10')
    expect(brisques).toHaveLength(32)

    const pileJ1 = brisques.slice(0, 16)
    const pileJ2 = brisques.slice(16, 32)

    expect(compterBrisques(pileJ1)).toBe(16)
    expect(compterBrisques(pileJ2)).toBe(16)
  })
})
