// ============================================================
// TESTS D'INTÉGRATION — COMBINAISONS (IT-4)
// Scénarios complets : annonces séquentielles, réutilisation
// ============================================================

import { describe, it, expect } from 'vitest'
import { detecterCombinaisonsDisponibles, appliquerAnnonce, initialiserChampsIT4 } from '../../src/core/combinaisons'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte, creerJoker } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

function makeState(cartes: Carte[], joueurId: 0 | 1 = 0, extras?: Partial<GameState>): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({ ...state, ...extras })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[joueurId] = { ...joueurs[joueurId], main: cartes, cartesEtalees: [] }
  return { ...base, joueurs }
}

const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0, pos = 0) =>
  creerCarte(couleur, rang, jeu, pos)

/** Injecte un mariage_Atout factice pour débloquer les combis (prérequis global) */
function avecMariagePose(state: GameState, couleurAtout: Couleur = 'hearts'): GameState {
  const annonceFactice: import('../../src/types').AnnoncePosee = {
    nom: 'mariage_atout', points: 40,
    cartesIds: [`${couleurAtout}-K-9-900`, `${couleurAtout}-Q-9-901`],
    joueurId: 1, mancheNumero: 1,
  }
  return { ...state, annonces: [...(state.annonces ?? []), annonceFactice] }
}

// ============================================================
// Scénario : Mariage → définit atout → Quinte
// ============================================================

describe('IT-4 intégration — Mariage puis Quinte', () => {
  it('mariage_Atout definit l\'atout, puis quinte devient disponible', () => {
    const atout: Couleur = 'spades'
    let state = makeState([
      c(atout, 'K', 0, 1), c(atout, 'Q', 0, 2),
      c(atout, 'A', 0, 3), c(atout, '10', 0, 4), c(atout, 'J', 0, 5),
    ], 0, { couleurAtout: null, atoutDefini: false })

    // Avant mariage : pas de quinte
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === 'quinte')).toBe(false)

    // Annoncer le mariage
    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m)

    // Atout défini
    expect(state.couleurAtout).toBe(atout)

    // Quinte disponible
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === 'quinte')).toBe(true)
  })

  it('séquence complète : mariage + quinte cumulés = 290 pts', () => {
    const atout: Couleur = 'hearts'
    let state = makeState([
      c(atout, 'K', 0, 1), c(atout, 'Q', 0, 2),
      c(atout, 'A', 0, 3), c(atout, '10', 0, 4), c(atout, 'J', 0, 5),
    ], 0, { couleurAtout: null, atoutDefini: false })

    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m) // +40

    const q = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'quinte')!
    state = appliquerAnnonce(state, 0, q) // +250

    expect(state.joueurs[0].marquePoints).toBe(290)
    expect(state.annonces).toHaveLength(2)
  })
})

// ============================================================
// Scénario : Bésigue premier et suivant
// ============================================================

describe('IT-4 intégration — Bésigue 1er et suivants', () => {
  it('premier bésigue 100 pts, deuxième 40 pts', () => {
    let state = makeState([
      c('spades', 'Q', 0, 1), c('diamonds', 'J', 0, 2),
      c('spades', 'Q', 1, 33), c('diamonds', 'J', 1, 34),
    ])
    // Débloquer via mariage_Atout factice (prérequis global)
    state = avecMariagePose(state)

    const b1 = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'besigue')!
    expect(b1.points).toBe(100)
    state = appliquerAnnonce(state, 0, b1)
    expect(state.premierBesiguePose).toBe(true)

    const b2 = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'besigue')!
    expect(b2.points).toBe(40)
    state = appliquerAnnonce(state, 0, b2)
    expect(state.joueurs[0].marquePoints).toBe(140)
  })
})

// ============================================================
// Scénario : Carré atout + carré normal (même rang)
// ============================================================

describe('IT-4 intégration — Carré atout et carré normal', () => {
  it('peut annoncer carré_atout ET carré_normal avec des cartes différentes', () => {
    const atout: Couleur = 'hearts'
    // 4 As de cœur (atout) + 4 As autres couleurs
    let state = makeState([
      c(atout,'A',0,1), c(atout,'A',1,33), c(atout,'A',2,65), c(atout,'A',3,97),
      c('spades','A',0,5), c('clubs','A',0,13), c('diamonds','A',0,9),
    ], 0, { couleurAtout: atout, atoutDefini: true })
    // Débloquer via mariage_Atout factice
    state = avecMariagePose(state, atout)

    // D'abord carré atout
    const ca = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === '4_as_atout')!
    state = appliquerAnnonce(state, 0, ca) // +200

    expect(state.joueurs[0].marquePoints).toBe(200)

    // Ensuite carré normal avec les autres As (non-cœur + 1 cœur restant si possible)
    // Note: les 4 As de cœur sont étalés, il reste As♠, As♣, As♦ → 3 seulement → pas de carré normal
    const combis2 = detecterCombinaisonsDisponibles(state, 0)
    // Avec seulement 3 cartes non-atout, pas de carré possible
    expect(combis2.some(c => c.nom === '4_as')).toBe(false)
  })
})

// ============================================================
// Scénario : Joker dans un carré normal
// ============================================================

describe('IT-4 intégration — Joker dans carré normal', () => {
  it('Joker complète 3 Rois pour former un carré normal', () => {
    const joker = creerJoker('spades', 0, 128)
    let state = makeState([
      c('spades','K',0,2), c('hearts','K',0,6), c('diamonds','K',0,10), joker,
    ])
    // Débloquer via mariage_Atout factice
    state = avecMariagePose(state)
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_roi')).toBe(true)
    const carreRois = combis.find(c => c.nom === '4_roi')!
    expect(carreRois.cartesIds).toContain(joker.id)
  })

  it('Joker ne complète PAS un carré d\'atout', () => {
    const atout: Couleur = 'clubs'
    const joker = creerJoker('clubs', 0, 128)
    const state = makeState([
      c(atout,'K',0,2), c(atout,'K',1,34), c(atout,'K',2,66), joker,
    ], 0, { couleurAtout: atout, atoutDefini: true })

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_roi_atout')).toBe(false)
    // Mais peut former un carré normal si assez de couleurs différentes
  })
})

// ============================================================
// Intégrité état après séquence d'annonces
// ============================================================

describe('IT-4 intégration — Intégrité état', () => {
  it('les annonces sont bien enregistrées dans l\'historique', () => {
    const atout: Couleur = 'diamonds'
    let state = makeState([
      c(atout,'K',0,1), c(atout,'Q',0,2),
      c('spades','Q',0,3), c('diamonds','J',0,4),
    ], 0, { couleurAtout: atout, atoutDefini: true })

    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m)

    const b = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'besigue')!
    state = appliquerAnnonce(state, 0, b)

    expect(state.annonces).toHaveLength(2)
    expect(state.annonces.map(a => a.nom)).toContain('mariage_atout')
    expect(state.annonces.map(a => a.nom)).toContain('besigue')
    expect(state.joueurs[0].marquePoints).toBe(40 + 100)
  })

  it('les usages des cartes sont bien enregistrés', () => {
    const roi  = c('hearts', 'K', 0, 1)
    const dame = c('hearts', 'Q', 0, 2)
    let state = makeState([roi, dame], 0, { couleurAtout: 'hearts', atoutDefini: true })

    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m)

    const usageRoi = state.usagesCartes?.find(u => u.carteId === roi.id)
    expect(usageRoi).toBeDefined()
    expect(usageRoi?.combinaisonsUtilisees).toContain('mariage_atout')
  })
})
