// ============================================================
// TESTS UNITAIRES — MOTEUR DE DECK (IT-1)
// Couvre : création, unicité, Fisher-Yates, brisques, jokers
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import {
  creerDeck,
  creerDeckMelange,
  creerCarte,
  creerJoker,
  melangerFisherYates,
  melangerAvecGraine,
  valeurBrisque,
  compterBrisques,
  verifierUniciteIds,
  statsDeck,
} from '../../src/core/deck'
import type { Carte } from '../../src/types'

// ============================================================
// CRÉATION DU DECK
// ============================================================

describe('creerDeck', () => {
  it('doit créer exactement 132 cartes', () => {
    const deck = creerDeck()
    expect(deck.cartes).toHaveLength(132)
  })

  it('doit contenir exactement 128 cartes normales', () => {
    const deck = creerDeck()
    const normales = deck.cartes.filter(c => !c.estJoker)
    expect(normales).toHaveLength(128)
  })

  it('doit contenir exactement 4 jokers', () => {
    const deck = creerDeck()
    const jokers = deck.cartes.filter(c => c.estJoker)
    expect(jokers).toHaveLength(4)
  })

  it('doit avoir 1 joker par couleur', () => {
    const deck = creerDeck()
    const jokers = deck.cartes.filter(c => c.estJoker)
    const couleurs = new Set(jokers.map(j => j.couleur))
    expect(couleurs.size).toBe(4)
    expect(couleurs.has('spades')).toBe(true)
    expect(couleurs.has('hearts')).toBe(true)
    expect(couleurs.has('diamonds')).toBe(true)
    expect(couleurs.has('clubs')).toBe(true)
  })

  it('doit avoir 32 cartes par jeu (index 0 à 3)', () => {
    const deck = creerDeck()
    const normales = deck.cartes.filter(c => !c.estJoker)
    for (let i = 0; i < 4; i++) {
      const parJeu = normales.filter(c => c.jeuIndex === i)
      expect(parJeu).toHaveLength(32)
    }
  })

  it('doit avoir 8 cartes par rang (4 couleurs × 4 jeux = 16 par rang normaux)', () => {
    const deck = creerDeck()
    const normales = deck.cartes.filter(c => !c.estJoker)
    const rangs = ['A', '10', 'K', 'Q', 'J', '9', '8', '7']
    for (const rang of rangs) {
      const parRang = normales.filter(c => c.rang === rang)
      expect(parRang).toHaveLength(16) // 4 couleurs × 4 jeux
    }
  })

  it('doit inclure tous les 4 couleurs', () => {
    const deck = creerDeck()
    const normales = deck.cartes.filter(c => !c.estJoker)
    const couleurs = ['spades', 'hearts', 'diamonds', 'clubs']
    for (const couleur of couleurs) {
      const parCouleur = normales.filter(c => c.couleur === couleur)
      expect(parCouleur).toHaveLength(32) // 8 rangs × 4 jeux
    }
  })

  it('doit avoir une graine (timestamp)', () => {
    const avant = Date.now()
    const deck = creerDeck()
    const apres = Date.now()
    expect(deck.graine).toBeGreaterThanOrEqual(avant)
    expect(deck.graine).toBeLessThanOrEqual(apres)
  })

  it('toutes les cartes doivent être faceDown par défaut', () => {
    const deck = creerDeck()
    expect(deck.cartes.every(c => c.faceUp === false)).toBe(true)
    expect(deck.cartes.every(c => c.etat === 'faceDown')).toBe(true)
  })
})

// ============================================================
// UNICITÉ DES IDs
// ============================================================

describe('verifierUniciteIds', () => {
  it('tous les IDs doivent être uniques dans un deck neuf', () => {
    const deck = creerDeck()
    expect(verifierUniciteIds(deck)).toBe(true)
  })

  it('tous les IDs doivent rester uniques après mélange', () => {
    const deck = creerDeckMelange()
    expect(verifierUniciteIds(deck)).toBe(true)
  })

  it('détecte des IDs en doublon', () => {
    const deck = creerDeck()
    const carteDupliquee = { ...deck.cartes[0] }
    const deckCorrompu = { ...deck, cartes: [...deck.cartes, carteDupliquee] }
    expect(verifierUniciteIds(deckCorrompu)).toBe(false)
  })

  it('le format des IDs normaux est correct', () => {
    const deck = creerDeck()
    const normales = deck.cartes.filter(c => !c.estJoker)
    const formatOk = normales.every(c =>
      /^(spades|hearts|diamonds|clubs)-(A|10|K|Q|J|9|8|7)-[0-3]-\d+$/.test(c.id)
    )
    expect(formatOk).toBe(true)
  })

  it('le format des IDs jokers est correct', () => {
    const deck = creerDeck()
    const jokers = deck.cartes.filter(c => c.estJoker)
    const formatOk = jokers.every(c =>
      /^joker-(spades|hearts|diamonds|clubs)-[0-3]-\d+$/.test(c.id)
    )
    expect(formatOk).toBe(true)
  })
})

// ============================================================
// ALGORITHME FISHER-YATES
// ============================================================

describe('melangerFisherYates', () => {
  it('conserve le nombre de cartes', () => {
    const deck = creerDeck()
    const melange = melangerFisherYates(deck.cartes)
    expect(melange).toHaveLength(deck.cartes.length)
  })

  it('conserve toutes les mêmes cartes (même IDs)', () => {
    const deck = creerDeck()
    const avant = new Set(deck.cartes.map(c => c.id))
    const melange = melangerFisherYates(deck.cartes)
    const apres = new Set(melange.map(c => c.id))
    expect(apres).toEqual(avant)
  })

  it('ne modifie pas le tableau original', () => {
    const deck = creerDeck()
    const original = [...deck.cartes]
    melangerFisherYates(deck.cartes)
    expect(deck.cartes).toEqual(original)
  })

  it('produit un ordre différent avec de grande probabilité', () => {
    const deck = creerDeck()
    const melange = melangerFisherYates(deck.cartes)
    // Probabilité de garder le même ordre = 1/132! ≈ 0
    const identique = deck.cartes.every((c, i) => c.id === melange[i].id)
    expect(identique).toBe(false)
  })

  it('deux mélanges successifs donnent des ordres différents', () => {
    const deck = creerDeck()
    const m1 = melangerFisherYates(deck.cartes)
    const m2 = melangerFisherYates(deck.cartes)
    const identique = m1.every((c, i) => c.id === m2[i].id)
    expect(identique).toBe(false)
  })
})

describe('melangerAvecGraine', () => {
  it('est déterministe : même graine = même résultat', () => {
    const deck = creerDeck()
    const m1 = melangerAvecGraine(deck.cartes, 42)
    const m2 = melangerAvecGraine(deck.cartes, 42)
    expect(m1.map(c => c.id)).toEqual(m2.map(c => c.id))
  })

  it('graines différentes = résultats différents', () => {
    const deck = creerDeck()
    const m1 = melangerAvecGraine(deck.cartes, 1)
    const m2 = melangerAvecGraine(deck.cartes, 99999)
    const identique = m1.every((c, i) => c.id === m2[i].id)
    expect(identique).toBe(false)
  })

  it('conserve toutes les cartes', () => {
    const deck = creerDeck()
    const avant = new Set(deck.cartes.map(c => c.id))
    const apres = new Set(melangerAvecGraine(deck.cartes, 12345).map(c => c.id))
    expect(apres).toEqual(avant)
  })
})

// ============================================================
// VALEURS DES BRISQUES
// ============================================================

describe('valeurBrisque', () => {
  it("l'As vaut 1 brisque", () => {
    const as = creerCarte('spades', 'A', 0, 0)
    expect(valeurBrisque(as)).toBe(1)
  })

  it("le Dix vaut 1 brisque", () => {
    const dix = creerCarte('hearts', '10', 0, 1)
    expect(valeurBrisque(dix)).toBe(1)
  })

  it("le Roi vaut 0 brisque", () => {
    const roi = creerCarte('diamonds', 'K', 0, 2)
    expect(valeurBrisque(roi)).toBe(0)
  })

  it("la Dame vaut 0 brisque", () => {
    const dame = creerCarte('clubs', 'Q', 0, 3)
    expect(valeurBrisque(dame)).toBe(0)
  })

  it("le Valet vaut 0 brisque", () => {
    const valet = creerCarte('spades', 'J', 0, 4)
    expect(valeurBrisque(valet)).toBe(0)
  })

  it("le 9 vaut 0 brisque", () => {
    expect(valeurBrisque(creerCarte('hearts', '9', 0, 5))).toBe(0)
  })

  it("le 8 vaut 0 brisque", () => {
    expect(valeurBrisque(creerCarte('diamonds', '8', 0, 6))).toBe(0)
  })

  it("le 7 vaut 0 brisque", () => {
    expect(valeurBrisque(creerCarte('clubs', '7', 0, 7))).toBe(0)
  })

  it("le Joker vaut 0 brisque", () => {
    const joker = creerJoker('spades', 0, 128)
    expect(valeurBrisque(joker)).toBe(0)
  })
})

describe('compterBrisques', () => {
  it("compte 0 brisque pour une pile vide", () => {
    expect(compterBrisques([])).toBe(0)
  })

  it("compte correctement dans une pile mixte", () => {
    const pile: Carte[] = [
      creerCarte('spades', 'A', 0, 0),   // 1
      creerCarte('hearts', '10', 0, 1),  // 1
      creerCarte('diamonds', 'K', 0, 2), // 0
      creerCarte('clubs', 'Q', 0, 3),    // 0
      creerCarte('spades', '7', 0, 4),   // 0
      creerJoker('hearts', 0, 100),      // 0
    ]
    expect(compterBrisques(pile)).toBe(2)
  })

  it("total brisques deck complet = 32 (16 As + 16 Dix)", () => {
    const deck = creerDeck()
    expect(compterBrisques(deck.cartes)).toBe(32)
  })
})

// ============================================================
// STATISTIQUES DU DECK
// ============================================================

describe('statsDeck', () => {
  let deck: ReturnType<typeof creerDeck>
  beforeEach(() => { deck = creerDeck() })

  it('total = 132', () => {
    expect(statsDeck(deck).total).toBe(132)
  })

  it('normales = 128', () => {
    expect(statsDeck(deck).normales).toBe(128)
  })

  it('jokers = 4', () => {
    expect(statsDeck(deck).jokers).toBe(4)
  })

  it('brisquesTotal = 32', () => {
    expect(statsDeck(deck).brisquesTotal).toBe(32)
  })

  it('32 cartes par couleur', () => {
    const stats = statsDeck(deck)
    expect(stats.parCouleur.spades).toBe(32)
    expect(stats.parCouleur.hearts).toBe(32)
    expect(stats.parCouleur.diamonds).toBe(32)
    expect(stats.parCouleur.clubs).toBe(32)
  })

  it('16 cartes par rang (4 couleurs × 4 jeux)', () => {
    const stats = statsDeck(deck)
    for (const rang of ['A', '10', 'K', 'Q', 'J', '9', '8', '7']) {
      expect(stats.parRang[rang]).toBe(16)
    }
  })
})

// ============================================================
// CRÉATION DE CARTES INDIVIDUELLES
// ============================================================

describe('creerCarte', () => {
  it("crée une carte avec les bons attributs", () => {
    const carte = creerCarte('hearts', 'A', 2, 50)
    expect(carte.couleur).toBe('hearts')
    expect(carte.rang).toBe('A')
    expect(carte.jeuIndex).toBe(2)
    expect(carte.estJoker).toBe(false)
    expect(carte.faceUp).toBe(false)
    expect(carte.etat).toBe('faceDown')
    expect(carte.id).toBe('hearts-A-2-50')
  })
})

describe('creerJoker', () => {
  it("crée un joker avec rang JOKER", () => {
    const joker = creerJoker('diamonds', 1, 100)
    expect(joker.rang).toBe('JOKER')
    expect(joker.estJoker).toBe(true)
    expect(joker.couleur).toBe('diamonds')
    expect(joker.id).toBe('joker-diamonds-1-100')
  })
})
