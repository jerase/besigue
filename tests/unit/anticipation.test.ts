// ============================================================
// TESTS — Module d'anticipation IA (anticipation.ts)
// Objectif de 16 brisques + repli réaliste — fonctions pures,
// aucune intégration dans les niveaux IA à ce stade.
// ============================================================

import { describe, it, expect } from 'vitest'
import { brisquesActuellesIA, objectifBrisqueAtteignable, OBJECTIF_BRISQUES } from '../../src/core/ia/anticipation'
import { initialiserPartie } from '../../src/core/init'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { creerCarte } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

function baseState(): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({ ...state, couleurAtout: null })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [], pileRemportee: [] }
  joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [], pileRemportee: [] }
  return {
    ...base,
    joueurs,
    pioche: [],
    pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 0, cartes: [null, null] },
  }
}

describe('brisquesActuellesIA', () => {
  it('retourne 0 si la pile remportée de l\'IA est vide', () => {
    expect(brisquesActuellesIA(baseState())).toBe(0)
  })

  it('compte uniquement As et 10 dans la pile remportée de l\'IA', () => {
    const state = baseState()
    const j1 = {
      ...state.joueurs[1],
      pileRemportee: [c('spades', 'A', 0), c('hearts', '10', 0), c('clubs', 'K', 0)],
    }
    const withPile = { ...state, joueurs: [state.joueurs[0], j1] as typeof state.joueurs }
    expect(brisquesActuellesIA(withPile)).toBe(2)
  })

  it('ignore la pile remportée de l\'adversaire', () => {
    const state = baseState()
    const j0 = { ...state.joueurs[0], pileRemportee: [c('spades', 'A', 0), c('hearts', '10', 0)] }
    const withPileHumain = { ...state, joueurs: [j0, state.joueurs[1]] as typeof state.joueurs }
    expect(brisquesActuellesIA(withPileHumain)).toBe(0)
  })
})

describe('objectifBrisqueAtteignable — l\'objectif est fixé à 16', () => {
  it('OBJECTIF_BRISQUES vaut 16', () => {
    expect(OBJECTIF_BRISQUES).toBe(16)
  })

  it('mode "atteint" quand l\'IA a déjà 16 brisques ou plus', () => {
    const state = baseState()
    const seizeBrisques: Carte[] = []
    for (let i = 0; i < 8; i++) seizeBrisques.push(c('spades', 'A', i % 4))
    for (let i = 0; i < 8; i++) seizeBrisques.push(c('hearts', '10', i % 4))
    const j1 = { ...state.joueurs[1], pileRemportee: seizeBrisques }
    const withPile = { ...state, joueurs: [state.joueurs[0], j1] as typeof state.joueurs }

    const res = objectifBrisqueAtteignable(withPile)
    expect(res.actuelles).toBe(16)
    expect(res.manquantes).toBe(0)
    expect(res.mode).toBe('atteint')
  })

  it('mode "chasse" quand l\'objectif est encore mathématiquement atteignable', () => {
    const state = baseState() // 0 brisques actuelles, 32 non vues → largement atteignable
    const res = objectifBrisqueAtteignable(state)
    expect(res.actuelles).toBe(0)
    expect(res.manquantes).toBe(16)
    expect(res.brisquesNonVues).toBe(32)
    expect(res.atteignable).toBe(true)
    expect(res.mode).toBe('chasse')
  })

  it('mode "repli" quand l\'objectif devient mathématiquement hors de portée', () => {
    const state = baseState()
    // IA n'a que 2 brisques, et presque toutes les brisques restantes ont déjà
    // été vues ailleurs (jouées par l'humain) → il n'en reste plus assez.
    const j1 = { ...state.joueurs[1], pileRemportee: [c('spades', 'A', 0), c('spades', '10', 0)] }
    // Construire 29 brisques "vues" côté humain (sur les 30 restantes), n'en laissant qu'1 non vue
    const brisquesVues: Carte[] = []
    const couleurs: Couleur[] = ['hearts', 'diamonds', 'clubs']
    const rangs: Carte['rang'][] = ['A', '10']
    let count = 0
    outer:
    for (const couleur of couleurs) {
      for (const rang of rangs) {
        for (let jeu = 0; jeu < 4; jeu++) {
          if (couleur === 'clubs' && rang === '10' && jeu === 3) break outer // en laisser 1 non vue
          brisquesVues.push(c(couleur, rang, jeu))
          count++
        }
      }
    }
    // + les As/10 de pique restants (hors ceux déjà dans la pile IA)
    brisquesVues.push(c('spades', 'A', 1), c('spades', 'A', 2), c('spades', 'A', 3))
    brisquesVues.push(c('spades', '10', 1), c('spades', '10', 2), c('spades', '10', 3))

    const j0 = { ...state.joueurs[0], pileRemportee: brisquesVues }
    const withTout = { ...state, joueurs: [j0, j1] as typeof state.joueurs }

    const res = objectifBrisqueAtteignable(withTout)
    expect(res.actuelles).toBe(2)
    expect(res.manquantes).toBe(14)
    expect(res.brisquesNonVues).toBe(1) // il ne reste qu'1 brisque non vue
    expect(res.atteignable).toBe(false)
    expect(res.mode).toBe('repli')
  })
})
