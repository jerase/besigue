// ============================================================
// TESTS — Table de correspondance : valeur espérée des brisques
// par couleur (tableBrisques.ts)
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  calculerValeurEspereeBrisque,
  calculerTableBrisques,
  couleursLesPlusSuresAOuvrir,
} from '../../src/core/ia/tableBrisques'
import { initialiserPartie } from '../../src/core/init'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { creerCarte } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

function baseState(couleurAtout: Couleur | null = null): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({ ...state, couleurAtout })
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

// ============================================================
// calculerValeurEspereeBrisque — entrée indépendante par couleur
// ============================================================

describe('calculerValeurEspereeBrisque', () => {
  it('vaut 0 si aucune carte non vue de cette couleur (pioche+main adverse vides)', () => {
    const state = baseState(null)
    state.pioche = []
    state.joueurs[0].main = []
    // Toutes les brisques spades déjà vues (étalées côté IA) → 0 non vue
    state.joueurs[1].cartesEtalees = [
      c('spades', 'A', 0), c('spades', 'A', 1), c('spades', 'A', 2), c('spades', 'A', 3),
      c('spades', '10', 0), c('spades', '10', 1), c('spades', '10', 2), c('spades', '10', 3),
    ]
    expect(calculerValeurEspereeBrisque(state, 'spades', 1)).toBe(0)
  })

  it('vaut 0 si la main adverse est vide, même si des brisques restent non vues', () => {
    const state = baseState(null)
    state.pioche = Array.from({ length: 10 }, (_, i) => c('clubs', '7', i % 4))
    state.joueurs[0].main = [] // aucune carte adverse → proba en main adverse = 0
    // rien vu en hearts → 8 non vues, mais main adverse vide
    expect(calculerValeurEspereeBrisque(state, 'hearts', 1)).toBe(0)
  })

  it('augmente avec la taille de la main adverse (à reliquat non vu égal)', () => {
    const state = baseState(null)
    state.pioche = Array.from({ length: 10 }, (_, i) => c('clubs', '7', i % 4))
    state.joueurs[0].main = Array.from({ length: 2 }, (_, i) => c('clubs', '8', i % 4))
    const avecPetiteMain = calculerValeurEspereeBrisque(state, 'hearts', 1)

    const state2 = baseState(null)
    state2.pioche = Array.from({ length: 10 }, (_, i) => c('clubs', '7', i % 4))
    state2.joueurs[0].main = Array.from({ length: 8 }, (_, i) => c('clubs', '8', i % 4))
    const avecGrandeMain = calculerValeurEspereeBrisque(state2, 'hearts', 1)

    expect(avecGrandeMain).toBeGreaterThan(avecPetiteMain)
  })

  it('diminue avec le nombre de brisques de cette couleur déjà vues (jouées/étalées)', () => {
    const state = baseState(null)
    state.pioche = Array.from({ length: 10 }, (_, i) => c('clubs', '7', i % 4))
    state.joueurs[0].main = Array.from({ length: 4 }, (_, i) => c('clubs', '8', i % 4))
    const sansRienVu = calculerValeurEspereeBrisque(state, 'hearts', 1)

    const state2 = baseState(null)
    state2.pioche = Array.from({ length: 10 }, (_, i) => c('clubs', '7', i % 4))
    state2.joueurs[0].main = Array.from({ length: 4 }, (_, i) => c('clubs', '8', i % 4))
    state2.joueurs[1].cartesEtalees = [c('hearts', 'A', 0), c('hearts', '10', 0)]
    const avecDeuxVues = calculerValeurEspereeBrisque(state2, 'hearts', 1)

    expect(avecDeuxVues).toBeLessThan(sansRienVu)
  })

  it('deux couleurs indépendantes : modifier hearts ne change pas la ligne diamonds', () => {
    const state = baseState(null)
    state.pioche = Array.from({ length: 10 }, (_, i) => c('clubs', '7', i % 4))
    state.joueurs[0].main = Array.from({ length: 4 }, (_, i) => c('clubs', '8', i % 4))
    const diamondsAvant = calculerValeurEspereeBrisque(state, 'diamonds', 1)

    state.joueurs[1].cartesEtalees = [c('hearts', 'A', 0)] // ne concerne que hearts
    const diamondsApres = calculerValeurEspereeBrisque(state, 'diamonds', 1)

    expect(diamondsApres).toBe(diamondsAvant)
  })
})

// ============================================================
// calculerTableBrisques — table à plat, 4 entrées
// ============================================================

describe('calculerTableBrisques', () => {
  it('retourne exactement les 4 couleurs', () => {
    const state = baseState(null)
    const table = calculerTableBrisques(state, 1)
    expect(Object.keys(table).sort()).toEqual(['clubs', 'diamonds', 'hearts', 'spades'])
  })
})

// ============================================================
// couleursLesPlusSuresAOuvrir
// ============================================================

describe('couleursLesPlusSuresAOuvrir', () => {
  it('retourne un tableau vide si aucune couleur candidate', () => {
    const state = baseState(null)
    expect(couleursLesPlusSuresAOuvrir(state, [], 1)).toEqual([])
  })

  it('retient la couleur à la valeur espérée minimale (la plus sûre), pas la première de la liste', () => {
    const state = baseState(null)
    state.pioche = Array.from({ length: 10 }, (_, i) => c('clubs', '7', i % 4))
    state.joueurs[0].main = Array.from({ length: 4 }, (_, i) => c('clubs', '8', i % 4))
    // diamonds listée en premier, mais hearts est la plus sûre (brisques déjà vues)
    state.joueurs[1].cartesEtalees = [c('hearts', 'A', 0), c('hearts', '10', 0)]

    const resultat = couleursLesPlusSuresAOuvrir(state, ['diamonds', 'hearts'], 1)
    expect(resultat).toEqual(['hearts'])
  })

  it('égalité entre plusieurs couleurs → toutes retournées (pas d\'arbitrage arbitraire)', () => {
    const state = baseState(null)
    state.pioche = []
    state.joueurs[0].main = [] // proba = 0 partout → toutes les couleurs à égalité (0)
    const resultat = couleursLesPlusSuresAOuvrir(state, ['spades', 'hearts', 'diamonds'], 1)
    expect(resultat.sort()).toEqual(['diamonds', 'hearts', 'spades'])
  })
})
