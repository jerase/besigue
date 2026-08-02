// ============================================================
// TESTS NON-RÉGRESSION — PRÉREQUIS MARIAGE_ATOUT (bug corrigé)
// Règle : aucune combinaison possible avant qu'un mariage_Atout
// soit étalé par l'un ou l'autre joueur.
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  detecterCombinaisonsDisponibles,
  appliquerAnnonce,
  initialiserChampsIT4,
} from '../../src/core/combinaisons'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte, creerJoker } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

// ── Helpers ───────────────────────────────────────────────────

function makeState(cartes: Carte[], joueurId: 0 | 1 = 0, extras?: Partial<GameState>): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({ ...state, ...extras })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[joueurId] = { ...joueurs[joueurId], main: cartes, cartesEtalees: [] }
  return { ...base, joueurs }
}

const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0, pos = 0) =>
  creerCarte(couleur, rang, jeu, pos)

// ============================================================
// BLOC 1 : Avant tout mariage_Atout → rien sauf mariage_Atout
// ============================================================

describe('Prérequis mariage_Atout — AVANT le premier mariage', () => {

  it('aucune annonce possible si le joueur n\'a pas de mariage_Atout et aucun posé', () => {
    // Main pleine de belles combis mais pas de mariage_Atout possible
    const state = makeState([
      c('spades', 'Q', 0, 1),    // bésigue possible
      c('diamonds', 'J', 0, 2),  // bésigue possible
      c('hearts', 'A', 0, 3),    // carré possible
      c('clubs', 'A', 0, 4),
      c('spades', 'A', 0, 5),
      c('diamonds', 'A', 0, 6),
    ], 0, { couleurAtout: null })

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis).toHaveLength(0)
  })

  it('bésigue non disponible avant le premier mariage_Atout', () => {
    const state = makeState([
      c('spades', 'Q', 0, 1),
      c('diamonds', 'J', 0, 2),
    ], 0, { couleurAtout: null })

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'besigue')).toBe(false)
  })

  it('carré de 4 As non disponible avant le premier mariage_Atout', () => {
    const state = makeState([
      c('spades', 'A', 0, 1), c('hearts', 'A', 0, 5),
      c('diamonds', 'A', 0, 9), c('clubs', 'A', 0, 13),
    ], 0, { couleurAtout: null })

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_as')).toBe(false)
  })

  it('mariage hors-atout non disponible avant le premier mariage_Atout', () => {
    // Atout défini mais aucun mariage_Atout posé → mariage hors-atout interdit
    const state = makeState([
      c('spades', 'K', 0, 1),
      c('spades', 'Q', 0, 2),
    ], 0, { couleurAtout: 'hearts' })
    // annonces vides → aucun mariage_Atout posé

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'mariage_hors_atout')).toBe(false)
  })

  it('sept d\'atout non disponible avant le premier mariage_Atout', () => {
    const state = makeState([
      c('hearts', '7', 0, 1),
    ], 0, { couleurAtout: 'hearts' })

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'sept_atout')).toBe(false)
  })

  it('quinte non disponible avant le premier mariage_Atout', () => {
    const atout: Couleur = 'hearts'
    const roi  = c(atout, 'K', 0, 1)
    const dame = c(atout, 'Q', 0, 2)
    // Simuler un mariage_Atout actif mais sans annonce enregistrée
    const state = makeState([
      roi, dame, c(atout, 'A', 0, 3), c(atout, '10', 0, 4), c(atout, 'J', 0, 5),
    ], 0, {
      couleurAtout: atout,
      mariagesAtoutActifs: [[[roi.id, dame.id]], []],
      // annonces vides → aucun mariage_Atout officiellement posé
    })

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'quinte')).toBe(false)
  })

  it('seul le mariage_Atout est proposé si le joueur en a un', () => {
    const state = makeState([
      c('hearts', 'K', 0, 1),
      c('hearts', 'Q', 0, 2),
      c('spades', 'Q', 0, 3),   // bésigue potentiel
      c('diamonds', 'J', 0, 4), // bésigue potentiel
    ], 0, { couleurAtout: null })

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.length).toBeGreaterThan(0)
    expect(combis.every(c => c.nom === 'mariage_atout')).toBe(true)
  })

  it('si le joueur n\'a pas de mariage_Atout possible, aucune combinaison n\'est proposée', () => {
    // Atout défini (par l'adversaire dans une vraie partie) mais ce joueur n'a pas de Roi+Dame atout
    const state = makeState([
      c('spades', 'Q', 0, 1),
      c('diamonds', 'J', 0, 2),
      c('hearts', 'A', 0, 3),
      c('clubs', 'K', 0, 4),
    ], 0, { couleurAtout: 'hearts' })
    // annonces vides

    const combis = detecterCombinaisonsDisponibles(state, 0)
    // Pas de Roi♥ + Dame♥ → aucun mariage_Atout possible → rien du tout
    expect(combis).toHaveLength(0)
  })
})

// ============================================================
// BLOC 2 : Après un mariage_Atout → tout est débloqué
// ============================================================

describe('Prérequis mariage_Atout — APRÈS le premier mariage', () => {

  it('après mariage_Atout de J0 : J0 peut annoncer d\'autres combis', () => {
    const atout: Couleur = 'hearts'
    let state = makeState([
      c(atout, 'K', 0, 1), c(atout, 'Q', 0, 2),
      c('spades', 'Q', 0, 3), c('diamonds', 'J', 0, 4), // bésigue
    ], 0, { couleurAtout: atout })

    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m)

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'besigue')).toBe(true)
  })

  it('après mariage_Atout de J0 : J1 peut aussi annoncer ses combis', () => {
    const atout: Couleur = 'spades'

    // J0 a un mariage_Atout
    let state = makeState([
      c(atout, 'K', 0, 1), c(atout, 'Q', 0, 2),
    ], 0, { couleurAtout: atout })

    // Donner à J1 un bésigue + carré
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[1] = {
      ...joueurs[1],
      main: [
        c('spades', 'Q', 1, 33), c('diamonds', 'J', 1, 34), // bésigue
        c('hearts', 'A', 1, 36), c('clubs', 'A', 1, 37),
        c('diamonds', 'A', 1, 38), // carré presque
      ],
      cartesEtalees: [],
    }
    state = { ...state, joueurs }

    // J0 pose son mariage_Atout
    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m)

    // J1 peut maintenant annoncer
    const combisJ1 = detecterCombinaisonsDisponibles(state, 1)
    expect(combisJ1.some(c => c.nom === 'besigue')).toBe(true)
  })

  it('après mariage_Atout de J1 : J0 peut annoncer ses combis', () => {
    const atout: Couleur = 'diamonds'

    // J1 a un mariage_Atout
    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({
      ...base,
      couleurAtout: atout,
    })

    // Donner à J1 un mariage_Atout
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[1] = {
      ...joueurs[1],
      main: [c(atout, 'K', 0, 2), c(atout, 'Q', 0, 3)],
      cartesEtalees: [],
    }
    // Donner à J0 un bésigue
    joueurs[0] = {
      ...joueurs[0],
      main: [c('spades', 'Q', 0, 1), c('diamonds', 'J', 0, 4)],
      cartesEtalees: [],
    }
    state = { ...state, joueurs }

    // J1 pose le mariage_Atout
    const m = detecterCombinaisonsDisponibles(state, 1).find(c => c.nom === 'mariage_atout')!
    expect(m).toBeDefined()
    state = appliquerAnnonce(state, 1, m)

    // J0 peut maintenant annoncer son bésigue
    const combisJ0 = detecterCombinaisonsDisponibles(state, 0)
    expect(combisJ0.some(c => c.nom === 'besigue')).toBe(true)
  })

  it('après mariage_Atout : mariage hors-atout disponible', () => {
    const atout: Couleur = 'hearts'
    let state = makeState([
      c(atout, 'K', 0, 1), c(atout, 'Q', 0, 2),  // mariage atout
      c('spades', 'K', 0, 10), c('spades', 'Q', 0, 11), // mariage hors-atout
    ], 0, { couleurAtout: atout })

    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m)

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'mariage_hors_atout')).toBe(true)
  })

  it('après mariage_Atout : carré de 4 As disponible', () => {
    const atout: Couleur = 'clubs'
    let state = makeState([
      c(atout, 'K', 0, 1), c(atout, 'Q', 0, 2),
      c('spades', 'A', 0, 5), c('hearts', 'A', 0, 9),
      c('diamonds', 'A', 0, 13), c('clubs', 'A', 0, 17),
    ], 0, { couleurAtout: atout })

    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m)

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_as')).toBe(true)
  })

  it('après mariage_Atout : sept d\'atout N\'est PAS proposé (bonus automatique au jeu)', () => {
    const atout: Couleur = 'hearts'
    let state = makeState([
      c(atout, 'K', 0, 1), c(atout, 'Q', 0, 2),
      c(atout, '7', 0, 7),
    ], 0, { couleurAtout: atout })

    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m)

    // Le 7 d'atout reste en main — bonus +10 accordé automatiquement lors du jeu
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'sept_atout')).toBe(false)
  })

  it('après mariage_Atout : quinte disponible si mariage actif + A+10+J atout', () => {
    const atout: Couleur = 'diamonds'
    let state = makeState([
      c(atout, 'K', 0, 1), c(atout, 'Q', 0, 2),
      c(atout, 'A', 0, 3), c(atout, '10', 0, 4), c(atout, 'J', 0, 5),
    ], 0, { couleurAtout: atout })

    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m)

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'quinte')).toBe(true)
  })
})

// ============================================================
// BLOC 3 : Règle "le mariage_Atout débloque pour LES DEUX"
// ============================================================

describe('Prérequis mariage_Atout — débloquage symétrique', () => {

  it('J0 pose mariage_Atout → J1 peut annocer immédiatement après', () => {
    const atout: Couleur = 'clubs'
    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout })

    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [c(atout, 'K', 0, 1), c(atout, 'Q', 0, 2)], cartesEtalees: [] }
    joueurs[1] = { ...joueurs[1], main: [c('spades', 'Q', 1, 33), c('diamonds', 'J', 1, 34)], cartesEtalees: [] }
    state = { ...state, joueurs }

    // Avant : J1 ne peut rien annoncer
    expect(detecterCombinaisonsDisponibles(state, 1)).toHaveLength(0)

    // J0 pose le mariage_Atout
    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m)

    // Après : J1 peut annocer le bésigue
    const combisJ1 = detecterCombinaisonsDisponibles(state, 1)
    expect(combisJ1.some(c => c.nom === 'besigue')).toBe(true)
  })

  it('avant mariage_Atout : ni J0 ni J1 ne peuvent annocer (sauf le mariage)', () => {
    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: null })

    const joueurs = [...state.joueurs] as typeof state.joueurs
    // J0 a plein de combis
    joueurs[0] = {
      ...joueurs[0],
      main: [
        c('spades', 'Q', 0, 1), c('diamonds', 'J', 0, 2),
        c('hearts', 'A', 0, 3), c('clubs', 'A', 0, 4),
        c('spades', 'A', 0, 5), c('diamonds', 'A', 0, 6),
      ],
      cartesEtalees: [],
    }
    // J1 aussi
    joueurs[1] = {
      ...joueurs[1],
      main: [
        c('hearts', 'K', 1, 33), c('hearts', 'Q', 1, 35),
        c('spades', 'K', 1, 34), c('spades', 'Q', 1, 36),
      ],
      cartesEtalees: [],
    }
    state = { ...state, joueurs }

    // Aucune annonce pour J0 (pas de mariage_Atout possible)
    const combisJ0 = detecterCombinaisonsDisponibles(state, 0)
    expect(combisJ0).toHaveLength(0)

    // J1 a des mariages potentiels → seuls mariage_Atout proposés
    const combisJ1 = detecterCombinaisonsDisponibles(state, 1)
    expect(combisJ1.every(c => c.nom === 'mariage_atout')).toBe(true)
  })

  it('séquence complète : J1 pose mariage_Atout, J0 annonce bésigue au tour suivant', () => {
    const atout: Couleur = 'hearts'
    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout })

    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [c('spades', 'Q', 0, 1), c('diamonds', 'J', 0, 4)], cartesEtalees: [] }
    joueurs[1] = { ...joueurs[1], main: [c(atout, 'K', 0, 2), c(atout, 'Q', 0, 3)], cartesEtalees: [] }
    state = { ...state, joueurs }

    // Vérifier que J0 ne peut pas annoncer avant
    expect(detecterCombinaisonsDisponibles(state, 0)).toHaveLength(0)

    // J1 pose son mariage_Atout
    const m = detecterCombinaisonsDisponibles(state, 1).find(c => c.nom === 'mariage_atout')!
    expect(m).toBeDefined()
    state = appliquerAnnonce(state, 1, m)

    // Maintenant J0 peut annoncer son bésigue
    const combisJ0 = detecterCombinaisonsDisponibles(state, 0)
    expect(combisJ0.some(c => c.nom === 'besigue')).toBe(true)

    // Et son score est toujours 0 (il n'a pas encore annoncé)
    expect(state.joueurs[0].marquePoints).toBe(0)

    // J0 annonce son bésigue
    const b = combisJ0.find(c => c.nom === 'besigue')!
    state = appliquerAnnonce(state, 0, b)
    expect(state.joueurs[0].marquePoints).toBe(100) // premier bésigue
  })
})

// ============================================================
// NON-RÉGRESSION — BUG carte déjà utilisée dans un mariage
// Un Roi ou Dame déjà posé dans un mariage ne peut pas
// reformer un autre mariage (même si encore dans cartesEtalees)
// ============================================================

describe('Non-régression — réutilisation cartes dans mariages', () => {

  it('un Roi déjà dans un mariage_hors_atout ne peut PAS reformer un autre mariage', () => {
    const atout: Couleur = 'hearts'
    const roiS0  = c('spades', 'K', 0, 10)  // déjà dans un mariage
    const dameS0 = c('spades', 'Q', 0, 11)  // déjà dans un mariage
    const dameS1 = c('spades', 'Q', 1, 43)  // en main — sans Roi libre → pas de nouveau mariage

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout })
    // Injecter annonces APRÈS initialiserChampsIT4 (sinon elles seraient écrasées)
    state = {
      ...state,
      annonces: [
        { nom: 'mariage_atout' as const, points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1 as const, mancheNumero: 1 },
        { nom: 'mariage_hors_atout' as const, points: 20, cartesIds: [roiS0.id, dameS0.id], joueurId: 0 as const, mancheNumero: 1 },
      ],
    }
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [dameS1], cartesEtalees: [roiS0, dameS0] }
    state = { ...state, joueurs }

    const combis = detecterCombinaisonsDisponibles(state, 0)
    // Pas de nouveau mariage♠ possible : le seul Roi♠ est déjà consommé
    expect(combis.some(c => c.nom === 'mariage_hors_atout')).toBe(false)
  })

  it('une Dame déjà dans un mariage ne peut PAS reformer un autre mariage', () => {
    const atout: Couleur = 'hearts'
    const roiS0  = c('spades', 'K', 0, 10)  // en main — libre
    const roiS1  = c('spades', 'K', 1, 42)  // en main — libre
    const dameS0 = c('spades', 'Q', 0, 11)  // déjà dans un mariage

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout })
    state = {
      ...state,
      annonces: [
        { nom: 'mariage_atout' as const, points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1 as const, mancheNumero: 1 },
        { nom: 'mariage_hors_atout' as const, points: 20, cartesIds: [roiS1.id, dameS0.id], joueurId: 0 as const, mancheNumero: 1 },
      ],
    }

    // J0 a roiS0 libre en main et dameS0 dans étalées. Dame consommée → pas de nouveau mariage.
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = {
      ...joueurs[0],
      main: [roiS0],
      cartesEtalees: [roiS1, dameS0],
    }
    state = { ...state, joueurs }

    const combis = detecterCombinaisonsDisponibles(state, 0)
    // dameS0 consommée → impossible de faire un mariage avec roiS0 + dameS0
    expect(combis.some(c => c.nom === 'mariage_hors_atout')).toBe(false)
  })

  it('avec un Roi libre et une Dame libre (non consommés), le mariage est bien proposé', () => {
    const atout: Couleur = 'hearts'
    const roiS0  = c('spades', 'K', 0, 10)  // consommé
    const dameS0 = c('spades', 'Q', 0, 11)  // consommée
    const roiS1  = c('spades', 'K', 1, 42)  // libre ✓
    const dameS1 = c('spades', 'Q', 1, 43)  // libre ✓

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout })
    state = {
      ...state,
      annonces: [
        { nom: 'mariage_atout' as const, points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1 as const, mancheNumero: 1 },
        { nom: 'mariage_hors_atout' as const, points: 20, cartesIds: [roiS0.id, dameS0.id], joueurId: 0 as const, mancheNumero: 1 },
      ],
    }

    // J0 a un Roi et Dame frais (jeu1) non consommés → mariage possible
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = {
      ...joueurs[0],
      main: [roiS1, dameS1],
      cartesEtalees: [roiS0, dameS0],
    }
    state = { ...state, joueurs }

    const combis = detecterCombinaisonsDisponibles(state, 0)
    // roiS1+dameS1 non consommés → nouveau mariage♠ valide
    expect(combis.some(c => c.nom === 'mariage_hors_atout')).toBe(true)
    const m = combis.find(c => c.nom === 'mariage_hors_atout')!
    expect(m.cartesIds).toContain(roiS1.id)
    expect(m.cartesIds).toContain(dameS1.id)
  })

  it('scénario du bug : mariage posé → même cartes reproposées → INTERDIT', () => {
    // Reproduction exacte du bug signalé :
    // J0 pose un mariage♠ avec Roi♠ + Dame♠ (jeu0)
    // Au tour suivant, l'app NE doit PAS reproposer le même mariage
    const atout: Couleur = 'hearts'
    const roiS = c('spades', 'K', 0, 10)
    const dameS = c('spades', 'Q', 0, 11)
    const joker = creerJoker('spades', 0, 128)
    const dameH = c('hearts', 'Q', 0, 7)
    const dameC = c('clubs',  'Q', 0, 15)

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout })
    state = {
      ...state,
      annonces: [
        { nom: 'mariage_atout' as const, points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1 as const, mancheNumero: 1 },
        { nom: 'mariage_hors_atout' as const, points: 20, cartesIds: [roiS.id, dameS.id], joueurId: 0 as const, mancheNumero: 1 },
      ],
    }

    // Main actuelle de J0 : roiS et dameS sont étalés
    // J0 a aussi 3 Dames + 1 Joker (carré dame disponible)
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = {
      ...joueurs[0],
      main: [dameH, dameC, joker],         // 3 dames (♥, ♣) + joker = carré possible
      cartesEtalees: [roiS, dameS],         // mariage♠ étalé
    }
    state = { ...state, joueurs }

    const combis = detecterCombinaisonsDisponibles(state, 0)

    // BUG CORRIGÉ : le mariage♠ ne doit plus être proposé
    const mariagesSpades = combis.filter(c =>
      (c.nom === 'mariage_hors_atout') &&
      (c.cartesIds.includes(roiS.id) || c.cartesIds.includes(dameS.id))
    )
    expect(mariagesSpades).toHaveLength(0)

    // Le carré dame (dameS étalée + dameH + dameC + joker) doit être proposé
    expect(combis.some(c => c.nom === '4_dame')).toBe(true)
  })
})
