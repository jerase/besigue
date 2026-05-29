// ============================================================
// TESTS — Fin anticipée (seuil atteint via annonces, cartes en main)
//
// Quand finAnticipee=true :
//   - Pas de bonus dernier pli
//   - Pas de calcul de brisques (deltaJ0=0, deltaJ1=0)
//   - scoreFinJ0/J1 = marquePoints actuels
//   - enBasTable basé sur les marques seules (pas brisques)
//   - Compteur de manches et vainqueur calculés normalement
//
// Non-régression finAnticipee=false (comportement existant) :
//   - Bonus dernier pli appliqué
//   - Brisques calculées et appliquées
//   - enBasTable basé sur scores + brisques
// ============================================================

import { describe, it, expect } from 'vitest'
import { appliquerFinManche } from '../../src/core/finManche'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

// ── Helpers ──────────────────────────────────────────────────

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

function makeState(opts: {
  scoreJ0: number
  scoreJ1: number
  pileJ0?: Carte[]   // brisques en pile remportée J0
  pileJ1?: Carte[]
  dernier?: 0 | 1    // vainqueur dernier pli
  compteurManches?: [number, number]
  mainJ0?: Carte[]   // cartes encore en main (fin anticipée)
  mainJ1?: Carte[]
}): GameState {
  const {
    scoreJ0, scoreJ1,
    pileJ0 = [], pileJ1 = [],
    dernier = null,
    compteurManches = [0, 0],
    mainJ0 = [], mainJ1 = [],
  } = opts

  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({
    ...state,
    phase: 'finale',
    dernierVainqueurPli: dernier,
    compteurManches,
  })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = {
    ...joueurs[0], main: mainJ0, cartesEtalees: [],
    marquePoints: scoreJ0, pileRemportee: pileJ0,
  }
  joueurs[1] = {
    ...joueurs[1], main: mainJ1, cartesEtalees: [],
    marquePoints: scoreJ1, pileRemportee: pileJ1,
  }
  return { ...base, joueurs }
}

// ============================================================
// 1. FIN ANTICIPÉE — PAS DE BRISQUES, PAS DE BONUS
// ============================================================

describe('finAnticipee=true — brisques ignorées, scores directs', () => {

  it('scoreFinJ0 = marquePoints J0 (brisques non ajoutées)', () => {
    // J0 a 20 As en pile (=20 brisques×10 = 200 pts potentiels)
    // mais finAnticipee → non comptées
    const pile = Array.from({ length: 20 }, (_, i) => c('hearts', 'A', i % 4))
    const state = makeState({ scoreJ0: 1000, scoreJ1: 400, pileJ0: pile })
    const r = appliquerFinManche(state, true)
    expect(r.scoreFinJ0).toBe(1000)  // pas de + brisques
    expect(r.brisques.deltaJ0).toBe(0)
    expect(r.brisques.deltaJ1).toBe(0)
  })

  it('scoreFinJ1 = marquePoints J1 (brisques non ajoutées)', () => {
    const pile = Array.from({ length: 15 }, (_, i) => c('spades', '10', i % 4))
    const state = makeState({ scoreJ0: 300, scoreJ1: 1050, pileJ1: pile })
    const r = appliquerFinManche(state, true)
    expect(r.scoreFinJ1).toBe(1050)
    expect(r.brisques.deltaJ1).toBe(0)
  })

  it('bonus dernier pli non appliqué', () => {
    // J0 a gagné le dernier pli → +10 normalement, mais finAnticipee l'ignore
    const state = makeState({ scoreJ0: 1000, scoreJ1: 400, dernier: 0 })
    const r = appliquerFinManche(state, true)
    expect(r.bonusDernierPli).toBeNull()  // pas de bonus
    expect(r.scoreFinJ0).toBe(1000)       // pas de +10
  })

  it('brisques neutrales : deltaJ0=0, deltaJ1=0', () => {
    const state = makeState({ scoreJ0: 1000, scoreJ1: 500 })
    const r = appliquerFinManche(state, true)
    expect(r.brisques.deltaJ0).toBe(0)
    expect(r.brisques.deltaJ1).toBe(0)
  })

  it('brisques.brisquesJ0 reflète la pile réelle (informatif)', () => {
    // Le comptage de brisques en pile est conservé pour info
    // mais ne modifie pas le score
    const pile = Array.from({ length: 5 }, (_, i) => c('hearts', 'A', i))
    const state = makeState({ scoreJ0: 1000, scoreJ1: 300, pileJ0: pile })
    const r = appliquerFinManche(state, true)
    expect(r.brisques.brisquesJ0).toBe(5) // As en pile comptés
    expect(r.scoreFinJ0).toBe(1000)       // mais score non modifié
  })
})

// ============================================================
// 2. EN BAS TABLE — BASÉ SUR LES MARQUES SEULES
// ============================================================

describe('finAnticipee=true — enBasTable basé sur marquePoints seuls', () => {

  it('enBasTable=true si adversaire < 750 selon marques (sans brisques)', () => {
    // J0 = 1000, J1 = 600 → J1 < 750 → en bas table
    // Si on ajoutait les brisques de J1 (ex: 20 As = 200 pts) → J1 = 800 → pas en bas table
    const pileJ1 = Array.from({ length: 20 }, (_, i) => c('spades', 'A', i % 4))
    const state = makeState({ scoreJ0: 1000, scoreJ1: 600, pileJ1 })
    const r = appliquerFinManche(state, true)
    // Sans brisques : J1 reste à 600 < 750 → en bas table
    expect(r.enBasTable).toBe(true)
    expect(r.charlesBezigue).toBe(true)
  })

  it('enBasTable=false si adversaire ≥ 750 selon marques', () => {
    // J0 = 1000, J1 = 800 → J1 ≥ 750 → pas en bas table
    const state = makeState({ scoreJ0: 1000, scoreJ1: 800 })
    const r = appliquerFinManche(state, true)
    expect(r.enBasTable).toBe(false)
  })

  it('cas limite : adversaire = 749 → en bas table', () => {
    const state = makeState({ scoreJ0: 1000, scoreJ1: 749 })
    const r = appliquerFinManche(state, true)
    expect(r.enBasTable).toBe(true)
  })

  it('cas limite : adversaire = 750 → pas en bas table', () => {
    const state = makeState({ scoreJ0: 1000, scoreJ1: 750 })
    const r = appliquerFinManche(state, true)
    expect(r.enBasTable).toBe(false)
  })

  it('brisques élevées en pile ne faussent plus enBasTable', () => {
    // Bug corrigé : avant ce fix, les brisques de J1 pouvaient le faire
    // dépasser 750 et cacher un "en bas table" réel
    const pileJ1 = Array.from({ length: 16 }, (_, i) => c('hearts', 'A', i % 4))
    // 16 As = 16 brisques → delta = 160 pts potentiels
    // J1 = 600, avec brisques → 760 ≥ 750 → faux positif (bug)
    // J1 = 600 sans brisques → 600 < 750 → en bas table (correct)
    const state = makeState({ scoreJ0: 1000, scoreJ1: 600, pileJ1 })
    const r = appliquerFinManche(state, true)
    expect(r.enBasTable).toBe(true)   // correct : 600 < 750
    expect(r.scoreFinJ1).toBe(600)    // score non modifié par brisques
  })
})

// ============================================================
// 3. VAINQUEUR DE MANCHE — CALCULÉ NORMALEMENT
// ============================================================

describe('finAnticipee=true — vainqueurManche correct', () => {

  it('J0 vainqueur si marquePoints J0 ≥ 1000', () => {
    const state = makeState({ scoreJ0: 1000, scoreJ1: 400 })
    const r = appliquerFinManche(state, true)
    expect(r.vainqueurManche).toBe(0)
  })

  it('J1 vainqueur si marquePoints J1 ≥ 1000', () => {
    const state = makeState({ scoreJ0: 300, scoreJ1: 1200 })
    const r = appliquerFinManche(state, true)
    expect(r.vainqueurManche).toBe(1)
  })

  it('compteur de manches incrémenté correctement', () => {
    const state = makeState({ scoreJ0: 1000, scoreJ1: 400, compteurManches: [1, 0] })
    const r = appliquerFinManche(state, true)
    expect(r.compteurManches[0]).toBe(2)
    expect(r.compteurManches[1]).toBe(0)
  })

  it('Charles Bézigue : +2 au compteur si en bas table', () => {
    const state = makeState({ scoreJ0: 1000, scoreJ1: 400, compteurManches: [1, 0] })
    const r = appliquerFinManche(state, true)
    expect(r.enBasTable).toBe(true)
    expect(r.compteurManches[0]).toBe(3) // 1 + 2
  })

  it('victoire de partie si compteur atteint 4-0', () => {
    const state = makeState({ scoreJ0: 1000, scoreJ1: 400, compteurManches: [3, 0] })
    const r = appliquerFinManche(state, true)
    expect(r.vainqueurPartie).toBe(0)
    expect(r.centPoints).toBe(true)
  })
})

// ============================================================
// 4. NON-RÉGRESSION — finAnticipee=false (comportement existant)
// ============================================================

describe('Non-régression — finAnticipee=false (comportement existant)', () => {

  it('brisques calculées et appliquées au score', () => {
    // J0 a 10 As en pile (brisques) → delta positif
    const pileJ0 = Array.from({ length: 10 }, (_, i) => c('hearts', 'A', i % 4))
    const pileJ1 = Array.from({ length: 2 }, (_, i) => c('spades', 'A', i))
    const state = makeState({ scoreJ0: 850, scoreJ1: 300, pileJ0, pileJ1 })
    const r = appliquerFinManche(state, false)
    // J0 gagne les brisques (10 > 2) → delta positif pour J0
    expect(r.brisques.deltaJ0).toBeGreaterThan(0)
    expect(r.scoreFinJ0).toBeGreaterThan(850)
  })

  it('bonus dernier pli appliqué', () => {
    const state = makeState({ scoreJ0: 900, scoreJ1: 300, dernier: 0 })
    const r = appliquerFinManche(state, false)
    expect(r.bonusDernierPli).toBe(0)
    expect(r.scoreFinJ0).toBeGreaterThanOrEqual(910) // 900 + 10 bonus
  })

  it('enBasTable basé sur scores + brisques', () => {
    // J0 = 800 + 20 As brisques = peut dépasser 1000
    // J1 = 600 + brisques (si J1 a brisques, peut dépasser 750)
    const pileJ0 = Array.from({ length: 20 }, (_, i) => c('hearts', 'A', i % 4))
    const pileJ1 = Array.from({ length: 2 }, (_, i) => c('spades', 'A', i))
    const state = makeState({ scoreJ0: 800, scoreJ1: 600, pileJ0, pileJ1 })
    const r = appliquerFinManche(state, false)
    // Comportement existant : scores + brisques
    expect(r.scoreFinJ0).toBeGreaterThan(800)
    expect(r.scoreFinJ1).toBeGreaterThan(600)
  })

  it('appel sans paramètre = finAnticipee=false (défaut)', () => {
    const state = makeState({ scoreJ0: 900, scoreJ1: 300, dernier: 0 })
    const r = appliquerFinManche(state) // sans paramètre
    // Comportement existant préservé
    expect(r.bonusDernierPli).toBe(0) // bonus appliqué
  })
})
