// ============================================================
// TESTS D'INTÉGRATION — INITIALISATION PARTIE (IT-2)
// Scénarios complets : init → pioche → scores
// ============================================================

import { describe, it, expect } from 'vitest'
import { initialiserPartie, piocher, ajouterPoints } from '../../src/core/init'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameConfig } from '../../src/types'

describe('Intégration IT-2 — Cycle init → pioche × 2', () => {
  it('après 2 pioches (J0 puis J1), les mains ont 10 cartes et la pioche 112', () => {
    const { state: s0 } = initialiserPartie(CONFIG_DEFAUT)
    const { state: s1 } = piocher(s0, 0)
    const { state: s2 } = piocher(s1, 1)

    expect(s2.joueurs[0].main).toHaveLength(10)
    expect(s2.joueurs[1].main).toHaveLength(10)
    expect(s2.pioche).toHaveLength(112)
    expect(s2.pioche.length).toBe(112)

    // Intégrité : toujours 132 cartes en tout
    const total = s2.joueurs[0].main.length + s2.joueurs[1].main.length + s2.pioche.length
    expect(total).toBe(132)
  })

  it('la pioche s\'épuise progressivement sans doublons', () => {
    let { state } = initialiserPartie(CONFIG_DEFAUT)
    const cartesVues = new Set<string>()

    // Piocher toutes les cartes pour J0 (114 fois)
    while (state.pioche.length > 0) {
      const avant = state.pioche.length
      const result = piocher(state, 0)
      state = result.state
      expect(state.pioche.length).toBe(avant - 1)
      if (result.cartePiochee) {
        expect(cartesVues.has(result.cartePiochee.id)).toBe(false)
        cartesVues.add(result.cartePiochee.id)
      }
    }

    expect(state.pioche).toHaveLength(0)
    expect(state.pioche.length).toBe(0)
  })
})

describe('Intégration IT-2 — Scores & marque_points', () => {
  it('simulation d\'une manche avec annonces et brisques', () => {
    const config: GameConfig = { ...CONFIG_DEFAUT, nomJoueur1: 'Alice', nomJoueur2: 'IA' }
    let { state } = initialiserPartie(config)

    // Alice annonce un mariage atout (+40)
    state = ajouterPoints(state, 0, 40)
    // Alice annonce un bésigue premier (+100)
    state = ajouterPoints(state, 0, 100)
    // IA annonce un mariage hors atout (+20)
    state = ajouterPoints(state, 1, 20)
    // IA annonce une quinte (+250)
    state = ajouterPoints(state, 1, 250)

    expect(state.joueurs[0].marquePoints).toBe(140)
    expect(state.joueurs[1].marquePoints).toBe(270)
  })

  it('seuil de victoire : aucun des deux ne dépasse 1000 dans cet exemple', () => {
    let { state } = initialiserPartie(CONFIG_DEFAUT)
    state = ajouterPoints(state, 0, 999)
    expect(state.joueurs[0].marquePoints).toBe(999)
    expect(state.joueurs[0].marquePoints < CONFIG_DEFAUT.seuilVictoire).toBe(true)
  })

  it('simulation victoire : J0 atteint 1000 pts', () => {
    let { state } = initialiserPartie(CONFIG_DEFAUT)
    state = ajouterPoints(state, 0, 1000)
    expect(state.joueurs[0].marquePoints).toBeGreaterThanOrEqual(CONFIG_DEFAUT.seuilVictoire)
  })

  it('règle "en bas table" : J1 < 750 quand J0 atteint 1000', () => {
    let { state } = initialiserPartie(CONFIG_DEFAUT)
    state = ajouterPoints(state, 0, 1000)
    state = ajouterPoints(state, 1, 600)

    const j0Score = state.joueurs[0].marquePoints
    const j1Score = state.joueurs[1].marquePoints
    const enBasTable = j0Score >= 1000 && j1Score < 750
    expect(enBasTable).toBe(true)
  })
})

describe('Intégration IT-2 — Multi-manche (scores cumulés)', () => {
  it('les scores se cumulent entre manches simulées', () => {
    // Simuler fin de manche 1 : J0=450, J1=320
    const config = CONFIG_DEFAUT
    let { state } = initialiserPartie(config)
    state = ajouterPoints(state, 0, 450)
    state = ajouterPoints(state, 1, 320)

    const scoreFinM1J0 = state.joueurs[0].marquePoints
    const scoreFinM1J1 = state.joueurs[1].marquePoints

    // Simuler manche 2 : on repart des scores de manche 1
    // (En IT-5, initialiserManche() préservera les marquePoints)
    let { state: s2 } = initialiserPartie(config)
    // Inject scores from previous round
    s2 = ajouterPoints(s2, 0, scoreFinM1J0)
    s2 = ajouterPoints(s2, 1, scoreFinM1J1)

    // Manche 2 : J0 gagne encore 600 pts
    s2 = ajouterPoints(s2, 0, 600)

    expect(s2.joueurs[0].marquePoints).toBe(1050) // 450 + 600
    expect(s2.joueurs[0].marquePoints).toBeGreaterThanOrEqual(config.seuilVictoire)
  })
})

describe('Intégration IT-2 — Navigation écrans (logique hook)', () => {
  it('la config est bien transmise à l\'état de jeu', () => {
    const config: GameConfig = {
      ...CONFIG_DEFAUT,
      nomJoueur1: 'René',
      niveauIA: 'difficile',
    }
    const { state } = initialiserPartie(config)
    expect(state.joueurs[0].nom).toBe('René')
    expect(state.joueurs[1].type).toBe('ia')
    expect(state.joueurs[0].type).toBe('humain')
  })

  it('plusieurs parties successives ont des IDs différents', () => {
    const ids = Array.from({ length: 5 }, () => initialiserPartie(CONFIG_DEFAUT).state.partieId)
    const unique = new Set(ids)
    expect(unique.size).toBe(5)
  })
})
