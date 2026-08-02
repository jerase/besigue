// ============================================================
// TESTS — Module de mémorisation IA (memoire.ts)
// Comptage de cartes par déduction/élimination — fonctions pures,
// aucune intégration dans les niveaux IA à ce stade.
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  cartesNonVues, quantiteNonVue, jokersNonVus, brisquesNonVuesRestantes,
  brisquesJoueesParCouleur, combinaisonEncoreAtteignable,
} from '../../src/core/ia/memoire'
import { initialiserPartie } from '../../src/core/init'
import { initialiserNouvelleManche } from '../../src/core/finManche'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { creerCarte, creerJoker } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

/** Base propre : deck vidé, aucune carte connue nulle part (univers plein à 4). */
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

describe('cartesNonVues — univers de départ', () => {
  it('renvoie 4 exemplaires non vus pour chaque rang/couleur sur un état vide', () => {
    const state = baseState()
    expect(quantiteNonVue(state, 'A', 'spades')).toBe(4)
    expect(quantiteNonVue(state, '10', 'hearts')).toBe(4)
    expect(quantiteNonVue(state, 'K', 'clubs')).toBe(4)
  })

  it('retourne 36 entrées (8 rangs × 4 couleurs + 4 Jokers)', () => {
    const state = baseState()
    expect(cartesNonVues(state)).toHaveLength(36)
  })

  it('un Joker par couleur au départ (1, pas 4, car il n\'y en a qu\'un par couleur dans le deck)', () => {
    const state = baseState()
    expect(quantiteNonVue(state, 'JOKER', 'spades')).toBe(1)
    expect(jokersNonVus(state)).toBe(4)
  })
})

describe('cartesNonVues — déduction par élimination', () => {
  it('déduit correctement en soustrayant pileRemportee des deux joueurs', () => {
    const state = baseState()
    const j0 = { ...state.joueurs[0], pileRemportee: [c('spades', 'A', 0), c('spades', 'A', 1)] }
    const withPiles = { ...state, joueurs: [j0, state.joueurs[1]] as typeof state.joueurs }
    expect(quantiteNonVue(withPiles, 'A', 'spades')).toBe(2)
  })

  it('déduit en soustrayant les cartes étalées des deux joueurs', () => {
    const state = baseState()
    const j1 = { ...state.joueurs[1], cartesEtalees: [c('hearts', 'K', 0)] }
    const withEtalees = { ...state, joueurs: [state.joueurs[0], j1] as typeof state.joueurs }
    expect(quantiteNonVue(withEtalees, 'K', 'hearts')).toBe(3)
  })

  it('déduit en soustrayant les cartes du pli en cours (non résolu)', () => {
    const state = baseState()
    const withPli = {
      ...state,
      pliEnCours: { carteJoueur0: c('diamonds', 'Q', 0), carteJoueur1: null, joueurOuvreur: 0 as const, cartes: [c('diamonds', 'Q', 0), null] },
    }
    expect(quantiteNonVue(withPli, 'Q', 'diamonds')).toBe(3)
  })

  it('déduit en soustrayant la main du joueur qui "sait" (IA par défaut)', () => {
    const state = baseState()
    const j1 = { ...state.joueurs[1], main: [c('clubs', 'J', 0), c('clubs', 'J', 1)] }
    const withMain = { ...state, joueurs: [state.joueurs[0], j1] as typeof state.joueurs }
    expect(quantiteNonVue(withMain, 'J', 'clubs', 1)).toBe(2)
  })

  it('ne soustrait PAS la main adverse — elle reste dans le reliquat non vu', () => {
    const state = baseState()
    const j0 = { ...state.joueurs[0], main: [c('spades', '9', 0)] }
    const withMainHumain = { ...state, joueurs: [j0, state.joueurs[1]] as typeof state.joueurs }
    // Du point de vue de l'IA (joueurId=1 par défaut) : la main humaine n'est pas connue
    expect(quantiteNonVue(withMainHumain, '9', 'spades', 1)).toBe(4)
  })

  it('cumule correctement plusieurs sources à la fois', () => {
    const state = baseState()
    const j0 = { ...state.joueurs[0], pileRemportee: [c('hearts', 'A', 0)] }
    const j1 = {
      ...state.joueurs[1],
      cartesEtalees: [c('hearts', 'A', 1)],
      main: [c('hearts', 'A', 2)],
    }
    const combine = { ...state, joueurs: [j0, j1] as typeof state.joueurs }
    expect(quantiteNonVue(combine, 'A', 'hearts', 1)).toBe(1)
  })

  it('comptabilise les Jokers : un Joker vu fait baisser le compte de sa couleur', () => {
    const state = baseState()
    const jokerPique = creerJoker('spades', 0, _pos++)
    const j1 = { ...state.joueurs[1], main: [jokerPique] }
    const withJoker = { ...state, joueurs: [state.joueurs[0], j1] as typeof state.joueurs }
    expect(quantiteNonVue(withJoker, 'JOKER', 'spades', 1)).toBe(0)
    expect(jokersNonVus(withJoker, 1)).toBe(3)
  })

  it('un Joker vu ne fait pas baisser le compte des rangs normaux de sa couleur', () => {
    const state = baseState()
    const jokerPique = creerJoker('spades', 0, _pos++)
    const j1 = { ...state.joueurs[1], main: [jokerPique] }
    const withJoker = { ...state, joueurs: [state.joueurs[0], j1] as typeof state.joueurs }
    expect(quantiteNonVue(withJoker, '7', 'spades', 1)).toBe(4)
  })

  it('ne descend jamais en dessous de 0 (garde-fou)', () => {
    const state = baseState()
    // 5 As de pique "vus" (impossible en jeu réel, teste juste le clamp)
    const j0 = {
      ...state.joueurs[0],
      pileRemportee: [c('spades', 'A', 0), c('spades', 'A', 1), c('spades', 'A', 2), c('spades', 'A', 3)],
    }
    const j1 = { ...state.joueurs[1], main: [c('spades', 'A', 0)] } // id dupliqué volontairement pour le test de clamp
    const state2 = { ...state, joueurs: [j0, j1] as typeof state.joueurs }
    expect(quantiteNonVue(state2, 'A', 'spades', 1)).toBe(0)
  })
})

describe('brisquesNonVuesRestantes', () => {
  it('retourne 32 sur un état totalement vide (8 As + 8 dix, ×4 couleurs)', () => {
    const state = baseState()
    expect(brisquesNonVuesRestantes(state)).toBe(32)
  })

  it('diminue correctement quand des brisques sont jouées', () => {
    const state = baseState()
    const j0 = { ...state.joueurs[0], pileRemportee: [c('spades', 'A', 0), c('hearts', '10', 0)] }
    const withBrisques = { ...state, joueurs: [j0, state.joueurs[1]] as typeof state.joueurs }
    expect(brisquesNonVuesRestantes(withBrisques)).toBe(30)
  })

  it('ne compte pas les rangs non-brisques (K/Q/J/9/8/7)', () => {
    const state = baseState()
    const j0 = { ...state.joueurs[0], pileRemportee: [c('spades', 'K', 0), c('hearts', 'Q', 0)] }
    const withNonBrisques = { ...state, joueurs: [j0, state.joueurs[1]] as typeof state.joueurs }
    expect(brisquesNonVuesRestantes(withNonBrisques)).toBe(32)
  })
})

describe('brisquesJoueesParCouleur', () => {
  it('compte uniquement les brisques réellement jouées (pas la main IA)', () => {
    const state = baseState()
    const j0 = { ...state.joueurs[0], pileRemportee: [c('spades', 'A', 0), c('spades', '10', 0)] }
    const j1 = { ...state.joueurs[1], main: [c('spades', 'A', 1)] } // en main IA → pas "joué"
    const withMix = { ...state, joueurs: [j0, j1] as typeof state.joueurs }
    const compte = brisquesJoueesParCouleur(withMix)
    expect(compte.spades).toBe(2)
    expect(compte.hearts).toBe(0)
  })

  it('compte les brisques étalées et celles du pli en cours', () => {
    const state = baseState()
    const j1 = { ...state.joueurs[1], cartesEtalees: [c('clubs', 'A', 0)] }
    const withEtalee = {
      ...state,
      joueurs: [state.joueurs[0], j1] as typeof state.joueurs,
      pliEnCours: { carteJoueur0: c('clubs', '10', 0), carteJoueur1: null, joueurOuvreur: 0 as const, cartes: [c('clubs', '10', 0), null] },
    }
    expect(brisquesJoueesParCouleur(withEtalee).clubs).toBe(2)
  })

  it('retourne 0 pour toutes les couleurs sur un état vide', () => {
    const state = baseState()
    const compte = brisquesJoueesParCouleur(state)
    expect(compte.spades).toBe(0)
    expect(compte.hearts).toBe(0)
    expect(compte.diamonds).toBe(0)
    expect(compte.clubs).toBe(0)
  })
})

describe('Réinitialisation entre manches', () => {
  it(
    'la mémorisation repart de zéro à chaque nouvelle manche ' +
    '(memoire.ts est sans état : tout est recalculé depuis le GameState, ' +
    'et initialiserNouvelleManche() reconstruit un deck neuf à chaque manche)',
    () => {
      // Manche 1 : on simule un état "avancé" où beaucoup de cartes ont été vues
      const state1 = baseState()
      const j0M1 = {
        ...state1.joueurs[0],
        pileRemportee: [c('spades', 'A', 0), c('spades', 'A', 1), c('hearts', '10', 0)],
      }
      const mancheAvancee = { ...state1, joueurs: [j0M1, state1.joueurs[1]] as typeof state1.joueurs }
      expect(quantiteNonVue(mancheAvancee, 'A', 'spades')).toBe(2)
      expect(brisquesNonVuesRestantes(mancheAvancee)).toBe(29)

      // Nouvelle manche : initialiserNouvelleManche() redistribue un deck complet neuf
      const nouvelleManche = initialiserNouvelleManche(mancheAvancee, CONFIG_DEFAUT, 0)

      // La mémorisation, recalculée sur ce nouvel état, repart bien de l'univers complet
      // (aux cartes de la main IA près, qui sont "connues" mais pas "jouées")
      expect(brisquesNonVuesRestantes(nouvelleManche)).toBe(32 - brisquesActuellesEnMain(nouvelleManche))
      expect(nouvelleManche.joueurs[0].pileRemportee).toHaveLength(0)
      expect(nouvelleManche.joueurs[1].pileRemportee).toHaveLength(0)
    }
  )
})

/** Nombre de brisques présentes dans la main de l'IA (donc soustraites du "non vu" mais pas encore "gagnées"). */
function brisquesActuellesEnMain(state: GameState): number {
  return state.joueurs[1].main.filter(c => c.rang === 'A' || c.rang === '10').length
}

describe('combinaisonEncoreAtteignable', () => {
  it('carré atout : atteignable si assez d\'exemplaires restent non vus', () => {
    const state = baseState()
    // 3 As de pique en main IA, atout = pique → il reste 1 exemplaire non vu (univers=4, 3 en main)
    const j1 = { ...state.joueurs[1], main: [c('spades', 'A', 0), c('spades', 'A', 1), c('spades', 'A', 2)] }
    const withMain = { ...state, joueurs: [state.joueurs[0], j1] as typeof state.joueurs, couleurAtout: 'spades' as Couleur }
    expect(combinaisonEncoreAtteignable(
      withMain,
      { rang: 'A', couleur: 'spades', quantiteRequise: 4, quantitePresente: 3 }
    )).toBe(true)
  })

  it('carré atout : inatteignable si le dernier exemplaire a déjà été vu ailleurs', () => {
    const state = baseState()
    const j0 = { ...state.joueurs[0], pileRemportee: [c('spades', 'A', 3)] } // le 4e As♠ déjà capturé par l'humain
    const j1 = { ...state.joueurs[1], main: [c('spades', 'A', 0), c('spades', 'A', 1), c('spades', 'A', 2)] }
    const withTout = { ...state, joueurs: [j0, j1] as typeof state.joueurs, couleurAtout: 'spades' as Couleur }
    expect(combinaisonEncoreAtteignable(
      withTout,
      { rang: 'A', couleur: 'spades', quantiteRequise: 4, quantitePresente: 3 }
    )).toBe(false)
  })

  it('carré normal (toutes couleurs) : atteignable si le total non vu suffit', () => {
    const state = baseState()
    const j1 = { ...state.joueurs[1], main: [c('spades', 'K', 0), c('hearts', 'K', 0), c('diamonds', 'K', 0)] }
    const withMain = { ...state, joueurs: [state.joueurs[0], j1] as typeof state.joueurs }
    expect(combinaisonEncoreAtteignable(
      withMain,
      { rang: 'K', quantiteRequise: 4, quantitePresente: 3 }
    )).toBe(true)
  })

  it('quantité déjà atteinte → toujours vrai, quel que soit le reliquat', () => {
    const state = baseState()
    expect(combinaisonEncoreAtteignable(
      state,
      { rang: 'A', couleur: 'clubs', quantiteRequise: 4, quantitePresente: 4 }
    )).toBe(true)
  })
})
