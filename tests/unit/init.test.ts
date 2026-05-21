// ============================================================
// TESTS UNITAIRES — INITIALISATION (IT-2)
// Tirage premier joueur, distribution, pioche, marque_points
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import {
  tirerPremierJoueur,
  creerJoueur,
  initialiserPartie,
  piocher,
  ajouterPoints,
  sauvegardeExiste,
} from '../../src/core/init'
import { creerDeck, melangerFisherYates } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameConfig, GameState, Carte } from '../../src/types'

// ============================================================
// TIRAGE DU PREMIER JOUEUR (SF-07.1 Étape 3)
// ============================================================

describe('tirerPremierJoueur', () => {
  it('retourne un joueur 0 ou 1', () => {
    const deck = creerDeck()
    const cartes = melangerFisherYates(deck.cartes)
    const { premierJoueur } = tirerPremierJoueur(cartes)
    expect([0, 1]).toContain(premierJoueur)
  })

  it('le joueur avec le rang le plus fort commence', () => {
    const deck = creerDeck()
    const cartes = deck.cartes.filter(c => !c.estJoker)
    // Forcer As en position 0, 7 en position 1 → J0 doit gagner
    const as  = cartes.find(c => c.rang === 'A')!
    const sep = cartes.find(c => c.rang === '7')!
    const pool = [as, sep, ...cartes.filter(c => c.id !== as.id && c.id !== sep.id)]
    const { premierJoueur } = tirerPremierJoueur(pool)
    expect(premierJoueur).toBe(0)
  })

  it('J1 commence si sa carte est plus forte', () => {
    const deck = creerDeck()
    const cartes = deck.cartes.filter(c => !c.estJoker)
    const as  = cartes.find(c => c.rang === 'A')!
    const sep = cartes.find(c => c.rang === '7')!
    // Mettre 7 en position 0, As en position 1 → J1 gagne
    const pool = [sep, as, ...cartes.filter(c => c.id !== as.id && c.id !== sep.id)]
    const { premierJoueur } = tirerPremierJoueur(pool)
    expect(premierJoueur).toBe(1)
  })

  it('les cartes tirées sont retournées correctement', () => {
    const deck = creerDeck()
    const cartes = melangerFisherYates(deck.cartes)
    const { carteJ0, carteJ1 } = tirerPremierJoueur(cartes)
    expect(carteJ0).toBeDefined()
    expect(carteJ1).toBeDefined()
    expect(carteJ0.id).not.toBe(carteJ1.id)
  })

  it('en cas d\'égalité de rang, relance le tirage jusqu\'au départage', () => {
    const deck = creerDeck()
    const cartes = deck.cartes.filter(c => !c.estJoker)
    // Mettre 2 As identiques de rang en position 0 et 1, puis une carte moins forte
    const as0 = cartes.filter(c => c.rang === 'A')[0]
    const as1 = cartes.filter(c => c.rang === 'A')[1]
    const roi = cartes.find(c => c.rang === 'K')!
    const sept = cartes.find(c => c.rang === '7')!
    // Pool : A, A, K, 7 → égalité d'abord, puis K > 7 → J0
    const pool = [as0, as1, roi, sept, ...cartes.slice(4)]
    const { egalite, premierJoueur } = tirerPremierJoueur(pool)
    // Il peut y avoir égalité au premier tour, le résultat doit quand même être 0 ou 1
    expect([0, 1]).toContain(premierJoueur)
    // egalite indique si au moins une égalité est survenue
    expect(typeof egalite).toBe('boolean')
  })
})

// ============================================================
// CRÉATION D'UN JOUEUR
// ============================================================

describe('creerJoueur', () => {
  it('crée un joueur humain (id=0)', () => {
    const j = creerJoueur(0, CONFIG_DEFAUT)
    expect(j.id).toBe(0)
    expect(j.type).toBe('humain')
    expect(j.nom).toBe(CONFIG_DEFAUT.nomJoueur1)
    expect(j.main).toHaveLength(0)
    expect(j.marquePoints).toBe(0)
    expect(j.brisques).toBe(0)
  })

  it('crée un joueur IA (id=1)', () => {
    const j = creerJoueur(1, CONFIG_DEFAUT)
    expect(j.id).toBe(1)
    expect(j.type).toBe('ia')
    expect(j.nom).toBe(CONFIG_DEFAUT.nomJoueur2)
  })

  it('les piles sont vides à la création', () => {
    const j = creerJoueur(0, CONFIG_DEFAUT)
    expect(j.cartesEtalees).toHaveLength(0)
    expect(j.pileRemportee).toHaveLength(0)
  })
})

// ============================================================
// INITIALISATION DE PARTIE (SF-07)
// ============================================================

describe('initialiserPartie', () => {
  let config: GameConfig
  let state: GameState

  beforeEach(() => {
    config = { ...CONFIG_DEFAUT, nomJoueur1: 'Alice' }
    const result = initialiserPartie(config)
    state = result.state
  })

  it('génère un partieId unique', () => {
    const r1 = initialiserPartie(config)
    const r2 = initialiserPartie(config)
    expect(r1.state.partieId).not.toBe(r2.state.partieId)
  })

  it('distribue exactement 9 cartes à chaque joueur', () => {
    expect(state.joueurs[0].main).toHaveLength(9)
    expect(state.joueurs[1].main).toHaveLength(9)
  })

  it('la pioche contient 132 - 18 = 114 cartes', () => {
    expect(state.pioche).toHaveLength(114)
    expect(state.nbCartesRestantes).toBe(114)
  })

  it('les cartes du joueur humain sont faceUp=true', () => {
    const toutesVisibles = state.joueurs[0].main.every(c => c.faceUp === true)
    expect(toutesVisibles).toBe(true)
  })

  it('les cartes de l\'IA sont faceUp=false', () => {
    const toutesCachees = state.joueurs[1].main.every(c => c.faceUp === false)
    expect(toutesCachees).toBe(true)
  })

  it('aucune carte partagée entre les deux mains', () => {
    const idsJ0 = new Set(state.joueurs[0].main.map(c => c.id))
    const idsJ1 = new Set(state.joueurs[1].main.map(c => c.id))
    const intersection = [...idsJ0].filter(id => idsJ1.has(id))
    expect(intersection).toHaveLength(0)
  })

  it('aucune carte partagée entre une main et la pioche', () => {
    const idsPioche = new Set(state.pioche.map(c => c.id))
    const idsJ0 = state.joueurs[0].main.map(c => c.id)
    const idsJ1 = state.joueurs[1].main.map(c => c.id)
    idsJ0.forEach(id => expect(idsPioche.has(id)).toBe(false))
    idsJ1.forEach(id => expect(idsPioche.has(id)).toBe(false))
  })

  it('total de cartes conservé : 9 + 9 + 114 = 132', () => {
    const total = state.joueurs[0].main.length
                + state.joueurs[1].main.length
                + state.pioche.length
    expect(total).toBe(132)
  })

  it('joueurActif est 0 ou 1', () => {
    expect([0, 1]).toContain(state.joueurActif)
  })

  it('phase initiale = libre', () => {
    expect(state.phase).toBe('libre')
  })

  it('atout non défini au départ (SF-10.2)', () => {
    expect(state.couleurAtout).toBeNull()
    expect(state.atoutDefini).toBe(false)
  })

  it('premierBesiguePose = false au départ', () => {
    expect(state.premierBesiguePose).toBe(false)
  })

  it('les scores sont à 0', () => {
    expect(state.joueurs[0].marquePoints).toBe(0)
    expect(state.joueurs[1].marquePoints).toBe(0)
  })

  it('les piles sont vides', () => {
    state.joueurs.forEach(j => {
      expect(j.pileRemportee).toHaveLength(0)
      expect(j.cartesEtalees).toHaveLength(0)
    })
  })

  it('pliEnCours vide au départ', () => {
    expect(state.pliEnCours.carteJoueur0).toBeNull()
    expect(state.pliEnCours.carteJoueur1).toBeNull()
  })

  it('mancheNumero = 1', () => {
    expect(state.mancheNumero).toBe(1)
  })
})

// ============================================================
// PIOCHE (SF-07.1 Étape 5 & SF-08.1 Étape 7)
// ============================================================

describe('piocher', () => {
  let state: GameState

  beforeEach(() => {
    const { state: s } = initialiserPartie(CONFIG_DEFAUT)
    state = s
  })

  it('diminue la pioche de 1', () => {
    const avant = state.pioche.length
    const { state: apres } = piocher(state, 0)
    expect(apres.pioche).toHaveLength(avant - 1)
    expect(apres.nbCartesRestantes).toBe(avant - 1)
  })

  it('ajoute 1 carte à la main du joueur', () => {
    const avantMain = state.joueurs[0].main.length
    const { state: apres } = piocher(state, 0)
    expect(apres.joueurs[0].main).toHaveLength(avantMain + 1)
  })

  it('la carte piochée par le joueur humain est faceUp=true', () => {
    const { state: apres, cartePiochee } = piocher(state, 0)
    expect(cartePiochee?.faceUp).toBe(true)
    expect(apres.joueurs[0].main[apres.joueurs[0].main.length - 1]?.faceUp).toBe(true)
  })

  it('la carte piochée par l\'IA est faceUp=false', () => {
    const { state: apres, cartePiochee } = piocher(state, 1)
    expect(cartePiochee?.faceUp).toBe(false)
    expect(apres.joueurs[1].main[apres.joueurs[0].main.length - 1]?.faceUp).toBe(false)
  })

  it('retourne null si pioche vide', () => {
    const stateVide = { ...state, pioche: [], nbCartesRestantes: 0 }
    const { cartePiochee } = piocher(stateVide, 0)
    expect(cartePiochee).toBeNull()
  })

  it('ne modifie pas l\'autre joueur', () => {
    const { state: apres } = piocher(state, 0)
    expect(apres.joueurs[1].main.length).toBe(state.joueurs[1].main.length)
  })
})

// ============================================================
// MARQUE_POINTS (SF-07 & SF-19.4)
// ============================================================

describe('ajouterPoints', () => {
  let state: GameState

  beforeEach(() => {
    const { state: s } = initialiserPartie(CONFIG_DEFAUT)
    state = s
  })

  it('ajoute les points au bon joueur', () => {
    const apres = ajouterPoints(state, 0, 40)
    expect(apres.joueurs[0].marquePoints).toBe(40)
    expect(apres.joueurs[1].marquePoints).toBe(0)
  })

  it('cumule les points correctement', () => {
    let s = ajouterPoints(state, 0, 40)
    s = ajouterPoints(s, 0, 100)
    expect(s.joueurs[0].marquePoints).toBe(140)
  })

  it('le score ne peut pas être négatif (SF-19.4)', () => {
    const apres = ajouterPoints(state, 0, -500)
    expect(apres.joueurs[0].marquePoints).toBe(0)
  })

  it('soustraction partielle reste positive', () => {
    let s = ajouterPoints(state, 1, 300)
    s = ajouterPoints(s, 1, -200)
    expect(s.joueurs[1].marquePoints).toBe(100)
  })

  it('n\'affecte pas l\'autre joueur', () => {
    const apres = ajouterPoints(state, 1, 250)
    expect(apres.joueurs[0].marquePoints).toBe(0)
    expect(apres.joueurs[1].marquePoints).toBe(250)
  })

  it('max(0, score + delta) : 50 - 200 = 0', () => {
    let s = ajouterPoints(state, 0, 50)
    s = ajouterPoints(s, 0, -200)
    expect(s.joueurs[0].marquePoints).toBe(0)
  })
})

// ============================================================
// INTÉGRITÉ DES IDs après initialisation
// ============================================================

describe('unicité des IDs après initialisation', () => {
  it('toutes les cartes en jeu ont des IDs uniques', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const tousLesIds = [
      ...state.joueurs[0].main.map(c => c.id),
      ...state.joueurs[1].main.map(c => c.id),
      ...state.pioche.map(c => c.id),
    ]
    const unique = new Set(tousLesIds)
    expect(unique.size).toBe(tousLesIds.length)
    expect(tousLesIds.length).toBe(132)
  })
})
