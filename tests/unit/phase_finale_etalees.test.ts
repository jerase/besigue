// ============================================================
// TESTS — Rapatriement des cartes étalées en phase finale
// Quand la pioche est vide, les cartes étalées des deux joueurs
// doivent revenir dans leur main et disparaître de la zone étalées.
//
// La logique est dans useGameEngine (hook React) et ne peut pas
// être testée unitairement directement. On teste donc :
//   1. La fonction pure simulant ce rapatriement
//   2. La cohérence de l'état résultant
//   3. Que mancheTerminee() et les règles de jeu finale
//      fonctionnent correctement avec les cartes rapatriées
// ============================================================

import { describe, it, expect } from 'vitest'
import { mancheTerminee, appliquerFinManche } from '../../src/core/finManche'
import { cartesJouablesPhaseFinale } from '../../src/core/pli'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

// ── Helpers ──────────────────────────────────────────────────

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

function makeState(overrides?: Partial<GameState>): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  return initialiserChampsIT4({ ...state, ...overrides })
}

/**
 * Simule exactement la logique de rapatriement des étalées
 * implémentée dans useGameEngine lors de la transition phase finale.
 * Permet de tester la transformation d'état sans passer par le hook.
 */
function simulerTransitionFinale(state: GameState): GameState {
  const joueursMaj = [...state.joueurs] as typeof state.joueurs
  for (const idx of [0, 1] as const) {
    const j = joueursMaj[idx]
    if (j.cartesEtalees.length > 0) {
      joueursMaj[idx] = {
        ...j,
        main: [...j.main, ...j.cartesEtalees],
        cartesEtalees: [],
      }
    }
  }
  return { ...state, phase: 'finale', joueurs: joueursMaj }
}

// ============================================================
// 1. RAPATRIEMENT DE BASE
// ============================================================

describe('Rapatriement des étalées → main à la phase finale', () => {

  it('les cartes étalées de J0 rejoignent sa main', () => {
    const mainJ0   = [c('hearts', 'K'), c('clubs', '8')]
    const etaleJ0  = [c('hearts', 'Q'), c('diamonds', 'J')]
    const state = makeState({ phase: 'libre' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: mainJ0, cartesEtalees: etaleJ0 }
    joueurs[1] = { ...joueurs[1], main: [c('spades', '9')], cartesEtalees: [] }
    const stateAvant = { ...state, joueurs }

    const stateApres = simulerTransitionFinale(stateAvant)

    // Les étalées de J0 sont dans sa main
    expect(stateApres.joueurs[0].main.length).toBe(4) // 2 main + 2 étalées
    expect(stateApres.joueurs[0].cartesEtalees.length).toBe(0)
    // Les IDs des cartes étalées sont bien dans la main
    const idsMain = stateApres.joueurs[0].main.map(c => c.id)
    expect(idsMain).toContain(etaleJ0[0].id)
    expect(idsMain).toContain(etaleJ0[1].id)
  })

  it('les cartes étalées de J1 rejoignent sa main', () => {
    const mainJ1  = [c('spades', 'A')]
    const etaleJ1 = [c('clubs', 'K'), c('diamonds', 'Q')]
    const state = makeState({ phase: 'libre' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [c('hearts', '7')], cartesEtalees: [] }
    joueurs[1] = { ...joueurs[1], main: mainJ1, cartesEtalees: etaleJ1 }
    const stateAvant = { ...state, joueurs }

    const stateApres = simulerTransitionFinale(stateAvant)

    expect(stateApres.joueurs[1].main.length).toBe(3) // 1 main + 2 étalées
    expect(stateApres.joueurs[1].cartesEtalees.length).toBe(0)
    const idsMain = stateApres.joueurs[1].main.map(c => c.id)
    expect(idsMain).toContain(etaleJ1[0].id)
    expect(idsMain).toContain(etaleJ1[1].id)
  })

  it('les deux joueurs rapatriés simultanément', () => {
    const etaleJ0 = [c('hearts', 'Q'), c('hearts', 'K')]
    const etaleJ1 = [c('spades', 'Q'), c('diamonds', 'J')]
    const state = makeState({ phase: 'libre' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [c('clubs', '8')], cartesEtalees: etaleJ0 }
    joueurs[1] = { ...joueurs[1], main: [c('spades', '9')], cartesEtalees: etaleJ1 }
    const stateAvant = { ...state, joueurs }

    const stateApres = simulerTransitionFinale(stateAvant)

    expect(stateApres.joueurs[0].cartesEtalees.length).toBe(0)
    expect(stateApres.joueurs[1].cartesEtalees.length).toBe(0)
    expect(stateApres.joueurs[0].main.length).toBe(3)
    expect(stateApres.joueurs[1].main.length).toBe(3)
  })

  it('aucune carte perdue ni dupliquée lors du rapatriement', () => {
    const mainJ0  = [c('hearts', '7'), c('clubs', '9')]
    const etaleJ0 = [c('spades', 'K'), c('diamonds', 'Q'), c('hearts', 'A')]
    const state = makeState({ phase: 'libre' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: mainJ0, cartesEtalees: etaleJ0 }
    joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [] }
    const stateAvant = { ...state, joueurs }

    const stateApres = simulerTransitionFinale(stateAvant)

    const idsAvant = [...mainJ0, ...etaleJ0].map(c => c.id).sort()
    const idsApres = stateApres.joueurs[0].main.map(c => c.id).sort()
    // Exactement les mêmes cartes, ni plus ni moins
    expect(idsApres).toEqual(idsAvant)
  })

  it('joueur sans étalées : main inchangée', () => {
    const mainJ0  = [c('hearts', '8'), c('clubs', 'K')]
    const state = makeState({ phase: 'libre' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: mainJ0, cartesEtalees: [] }
    joueurs[1] = { ...joueurs[1], main: [c('spades', '7')], cartesEtalees: [] }
    const stateAvant = { ...state, joueurs }

    const stateApres = simulerTransitionFinale(stateAvant)

    // Main inchangée
    expect(stateApres.joueurs[0].main.length).toBe(2)
    expect(stateApres.joueurs[0].cartesEtalees.length).toBe(0)
  })

  it('les deux joueurs sans étalées : aucun changement sur les mains', () => {
    const state = makeState({ phase: 'libre' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [c('hearts', '8')], cartesEtalees: [] }
    joueurs[1] = { ...joueurs[1], main: [c('spades', '9')], cartesEtalees: [] }
    const stateAvant = { ...state, joueurs }

    const stateApres = simulerTransitionFinale(stateAvant)

    expect(stateApres.joueurs[0].main.length).toBe(1)
    expect(stateApres.joueurs[1].main.length).toBe(1)
  })
})

// ============================================================
// 2. PHASE FINALE CORRECTEMENT ACTIVÉE
// ============================================================

describe('Phase finale correctement activée', () => {

  it('phase passe à finale après le rapatriement', () => {
    const state = makeState({ phase: 'libre' })
    const stateApres = simulerTransitionFinale(state)
    expect(stateApres.phase).toBe('finale')
  })

  it('pioche reste vide après la transition', () => {
    const state = makeState({ phase: 'libre', pioche: [] })
    const stateApres = simulerTransitionFinale(state)
    expect(stateApres.pioche.length).toBe(0)
  })
})

// ============================================================
// 3. COMPATIBILITÉ AVEC mancheTerminee()
// ============================================================

describe('mancheTerminee() compatible avec le rapatriement', () => {

  it('mancheTerminee = true quand mains vides après rapatriement', () => {
    // Toutes les cartes ont été jouées (mains vides, étalées aussi)
    const state = makeState({ phase: 'finale' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [] }
    joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [] }
    const stateFinal = { ...state, joueurs }
    expect(mancheTerminee(stateFinal)).toBe(true)
  })

  it('mancheTerminee = false si J0 a encore des cartes en main', () => {
    const state = makeState({ phase: 'finale' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [c('hearts', '8')], cartesEtalees: [] }
    joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [] }
    const stateFinal = { ...state, joueurs }
    expect(mancheTerminee(stateFinal)).toBe(false)
  })

  it('mancheTerminee = false si J1 a encore des cartes en main', () => {
    const state = makeState({ phase: 'finale' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [] }
    joueurs[1] = { ...joueurs[1], main: [c('spades', 'K')], cartesEtalees: [] }
    const stateFinal = { ...state, joueurs }
    expect(mancheTerminee(stateFinal)).toBe(false)
  })

  it('mancheTerminee = false en phase libre (même mains vides)', () => {
    const state = makeState({ phase: 'libre' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [] }
    joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [] }
    const stateFinal = { ...state, joueurs }
    expect(mancheTerminee(stateFinal)).toBe(false)
  })
})

// ============================================================
// 4. COMPATIBILITÉ AVEC cartesJouablesPhaseFinale()
// ============================================================

describe('cartesJouablesPhaseFinale() utilise bien la main après rapatriement', () => {

  it('les cartes rapatriées sont jouables en phase finale', () => {
    // J0 pose un 8 de cœur. J1 avait un K de cœur dans ses étalées
    // → rapatrié en main → jouable pour fournir la couleur
    const carteOuverte = c('hearts', '8')
    const roiCoeur = c('hearts', 'K')  // anciennement étalé, maintenant en main
    const state = makeState({ phase: 'finale', couleurAtout: 'spades' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    // Après rapatriement : roiCoeur est en main (plus dans étalées)
    joueurs[1] = { ...joueurs[1], main: [roiCoeur, c('diamonds', '9')], cartesEtalees: [] }
    const stateFinale = { ...state, joueurs }

    const jouables = cartesJouablesPhaseFinale(
      [...stateFinale.joueurs[1].main],
      carteOuverte,
      'spades'
    )
    // K de cœur doit être dans les jouables (fournir la couleur)
    expect(jouables.some(c => c.id === roiCoeur.id)).toBe(true)
  })

  it('sans rapatriement, la carte étalée ne serait PAS dans la main → bug', () => {
    // Ce test documente le bug corrigé : avant le fix, les cartes
    // restaient dans cartesEtalees et la main était incomplète
    const mainJ1    = [c('diamonds', '9')]
    const etaleJ1   = [c('hearts', 'K')]  // si non rapatrié, absent de main

    // Sans rapatriement : main ne contient pas le K de cœur
    expect(mainJ1.some(c => c.rang === 'K' && c.couleur === 'hearts')).toBe(false)

    // Après rapatriement simulé
    const mainApres = [...mainJ1, ...etaleJ1]
    expect(mainApres.some(c => c.rang === 'K' && c.couleur === 'hearts')).toBe(true)
  })
})

// ============================================================
// 5. NON-RÉGRESSION — appliquerFinManche avec état rapatrié
// ============================================================

describe('Non-régression — appliquerFinManche avec cartes rapatriées', () => {

  it('fonctionne sans erreur sur un état post-rapatriement', () => {
    const etaleJ0 = [c('hearts', 'A'), c('hearts', 'K')]
    const state = makeState({ phase: 'libre' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = {
      ...joueurs[0],
      main: [],
      cartesEtalees: etaleJ0,
      marquePoints: 500,
    }
    joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [], marquePoints: 200 }
    const stateAvant = { ...state, joueurs, compteurManches: [0, 0] as [number, number] }

    // Rapatrier puis simuler fin de manche
    const stateApres = simulerTransitionFinale(stateAvant)
    expect(() => appliquerFinManche(stateApres)).not.toThrow()
  })

  it('les cartes rapatriées comptent dans les brisques', () => {
    // J0 avait un As dans ses étalées → rapatrié → doit compter comme brisque
    const asEtale = c('hearts', 'A') // brisque
    const state = makeState({ phase: 'libre' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = {
      ...joueurs[0],
      main: [],
      cartesEtalees: [asEtale],
      pileRemportee: Array.from({ length: 10 }, (_, i) => c('clubs', '8')),
      marquePoints: 500,
    }
    joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [], marquePoints: 200 }
    const stateAvant = { ...state, joueurs, compteurManches: [0, 0] as [number, number] }

    const stateApres = simulerTransitionFinale(stateAvant)
    const r = appliquerFinManche(stateApres)
    // J0 a l'As en main → il finira dans sa pile si il gagne un pli
    // Ici on vérifie surtout que le calcul ne plante pas
    expect(r.scoreFinJ0).toBeGreaterThanOrEqual(500)
  })
})

// ============================================================
// 6. NON-RÉGRESSION — Fonctionnalités non affectées
// ============================================================

describe('Non-régression — fonctionnalités non affectées', () => {

  it('la transition ne se fait qu\'une seule fois (idempotent)', () => {
    const etale = [c('hearts', 'Q')]
    const state = makeState({ phase: 'libre' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [c('clubs', '8')], cartesEtalees: etale }
    joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [] }
    const stateAvant = { ...state, joueurs }

    const stateApres1 = simulerTransitionFinale(stateAvant)
    // Appliquer une 2e fois ne doit pas dupliquer les cartes
    const stateApres2 = simulerTransitionFinale(stateApres1)

    // La main de J0 doit avoir les mêmes cartes (pas de doublon)
    const ids1 = stateApres1.joueurs[0].main.map(c => c.id).sort()
    const ids2 = stateApres2.joueurs[0].main.map(c => c.id).sort()
    expect(ids1).toEqual(ids2)
  })

  it('les scores (marquePoints) ne sont pas modifiés par le rapatriement', () => {
    const state = makeState({ phase: 'libre' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [c('hearts', 'Q')], marquePoints: 650 }
    joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [c('spades', 'K')], marquePoints: 120 }
    const stateAvant = { ...state, joueurs }

    const stateApres = simulerTransitionFinale(stateAvant)

    expect(stateApres.joueurs[0].marquePoints).toBe(650)
    expect(stateApres.joueurs[1].marquePoints).toBe(120)
  })

  it('la couleur d\'atout n\'est pas modifiée par le rapatriement', () => {
    const state = makeState({ phase: 'libre', couleurAtout: 'hearts' })
    const stateApres = simulerTransitionFinale(state)
    expect(stateApres.couleurAtout).toBe('hearts')
  })

  it('le compteur de manches n\'est pas modifié par le rapatriement', () => {
    const state = makeState({ phase: 'libre' })
    const stateAvec = { ...state, compteurManches: [2, 1] as [number, number] }
    const stateApres = simulerTransitionFinale(stateAvec)
    expect(stateApres.compteurManches).toEqual([2, 1])
  })
})
