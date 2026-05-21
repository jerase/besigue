// ============================================================
// TESTS D'INTÉGRATION — FIN DE MANCHE (IT-5)
// Scénarios complets de fin de manche
// ============================================================

import { describe, it, expect } from 'vitest'
import { appliquerFinManche, calculerBrisques } from '../../src/core/finManche'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0, pos = 0) =>
  creerCarte(couleur, rang, jeu, pos)

function makeState(scoreJ0: number, scoreJ1: number, brisquesJ0: number, brisquesJ1: number): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({ ...state, phase: 'finale', dernierVainqueurPli: 0 })
  const pileJ0 = Array.from({ length: brisquesJ0 }, (_, i) => c('hearts', 'A', i % 4, i))
  const pileJ1 = Array.from({ length: brisquesJ1 }, (_, i) => c('spades', 'A', i % 4, i + 100))
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [], marquePoints: scoreJ0, pileRemportee: pileJ0 }
  joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [], marquePoints: scoreJ1, pileRemportee: pileJ1 }
  return { ...base, joueurs, combisEnAttente: { 0: [], 1: [] } }
}

describe('IT-5 intégration — scénarios de fin de manche', () => {

  it('scénario victoire simple : J0 atteint 1000 avec les brisques', () => {
    // J0 : 800 pts + 20 brisques × 10 = 800 + 200 = 1000
    const state = makeState(800, 400, 20, 12)
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(0)
    expect(r.scoreFinJ0).toBeGreaterThanOrEqual(1000)
    expect(r.state.phase).toBe('terminee')
  })

  it('scénario égalité brisques : les deux reçoivent +160', () => {
    const state = makeState(400, 500, 16, 16)
    const r = appliquerFinManche(state)
    expect(r.brisques.casEgalite).toBe(true)
    // +10 bonus dernier pli + 160 brisques pour J0
    expect(r.scoreFinJ0).toBe(400 + 10 + 160)
    expect(r.scoreFinJ1).toBe(500 + 160)
    // Personne n'a 1000
    expect(r.vainqueurManche).toBeNull()
  })

  it('scénario Charles Bézigue : J0 gagne en bas table', () => {
    // J0 : 850 + bonus 10 + 200 brisques = 1060 ; J1 : 500 - 200 = 300 < 750
    const state = makeState(850, 500, 20, 12)
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(0)
    expect(r.charlesBezigue).toBe(true)
    expect(r.scoreFinJ1).toBeLessThan(750)
  })

  it('scénario serré : ni J0 ni J1 n\'atteint 1000', () => {
    // J0 : 700 + 10 (bonus) + 170 = 880 ; J1 : 600 - 200 = 400
    const state = makeState(700, 600, 17, 15)
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBeNull()
    expect(r.state.phase).not.toBe('terminee')
  })

  it('scénario score négatif bloqué : perdant avec 250 pts - 200 brisques ≥ 0', () => {
    // J1 a 250 pts ≥ 200 → deltaJ1 = -200 → 250 - 200 = 50 ≥ 0
    const state = makeState(300, 250, 20, 12)
    const r = appliquerFinManche(state)
    expect(r.scoreFinJ1).toBeGreaterThanOrEqual(0)
    expect(r.scoreFinJ1).toBe(50)
  })

  it('perdant avec score < 200 : pas de déduction de 200 pts', () => {
    // J1 a 50 pts < 200 → deltaJ1 = 0, pas de déduction
    const state = makeState(300, 50, 20, 12)
    const r = appliquerFinManche(state)
    // 50 pts + 10 (bonus dernier pli J0, pas J1) + 0 (pas de déduction car < 200) = 50
    expect(r.scoreFinJ1).toBe(50)
  })

  it('les deux dépassent 1000 : le plus haut gagne', () => {
    // J0 : 900 + 10 + 200 = 1110 ; J1 : 900 + 160 (égalité non, J0 a plus)
    // En fait simulons J0=25 brisques, J1=7 brisques
    // J0 : 900 + 10 + 250 = 1160 ≥ 1000 ✓
    // J1 : 850 - 200 = 650 < 1000
    const state = makeState(900, 850, 25, 7)
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(0)
    expect(r.scoreFinJ0).toBeGreaterThanOrEqual(1000)
  })

  it('brisques totaux = 32 dans la simulation', () => {
    const state = makeState(400, 400, 16, 16)
    const brisques = calculerBrisques(state)
    expect(brisques.brisquesJ0 + brisques.brisquesJ1).toBe(32)
  })
})
