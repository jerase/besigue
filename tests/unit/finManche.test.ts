// ============================================================
// TESTS UNITAIRES — FIN DE MANCHE (IT-5)
// SF-12, SF-13 : brisques, bonus dernier pli, victoire,
// en bas table, Charles Bézigue
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  compterBrisquesJoueur,
  calculerBrisques,
  appliquerFinManche,
  mancheTerminee,
  doitDeclenchemtPhaseFinale,
} from '../../src/core/finManche'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0, pos = 0) =>
  creerCarte(couleur, rang, jeu, pos)

function makeState(overrides?: Partial<GameState>): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  return initialiserChampsIT4({ ...state, ...overrides })
}

function setScoresEtPiles(
  state: GameState,
  scoreJ0: number,
  scoreJ1: number,
  pileJ0: Carte[],
  pileJ1: Carte[]
): GameState {
  const joueurs = [...state.joueurs] as typeof state.joueurs
  joueurs[0] = { ...joueurs[0], marquePoints: scoreJ0, pileRemportee: pileJ0 }
  joueurs[1] = { ...joueurs[1], marquePoints: scoreJ1, pileRemportee: pileJ1 }
  return { ...state, joueurs }
}

// ============================================================
// COMPTER LES BRISQUES
// ============================================================

describe('compterBrisquesJoueur', () => {
  it('0 brisque si pile vide', () => {
    const state = makeState()
    expect(compterBrisquesJoueur(state, 0)).toBe(0)
  })

  it('As et 10 comptent comme brisques', () => {
    const pile = [c('hearts','A',0,1), c('spades','10',0,2), c('clubs','K',0,3)]
    const state = setScoresEtPiles(makeState(), 0, 0, pile, [])
    expect(compterBrisquesJoueur(state, 0)).toBe(2)
  })

  it('Joker ne compte pas comme brisque', () => {
    const joker = { ...c('hearts','A',0,1), estJoker: true, rang: 'JOKER' as const }
    const state = setScoresEtPiles(makeState(), 0, 0, [joker], [])
    expect(compterBrisquesJoueur(state, 0)).toBe(0)
  })

  it('total maximum : 32 brisques (16 As + 16 Dix sur 4 jeux)', () => {
    // Tous les As et Dix de 4 jeux × 4 couleurs
    const pile: Carte[] = []
    let pos = 0
    for (let j = 0; j < 4; j++) {
      for (const couleur of ['spades','hearts','diamonds','clubs'] as Couleur[]) {
        pile.push(c(couleur, 'A', j, pos++))
        pile.push(c(couleur, '10', j, pos++))
      }
    }
    const state = setScoresEtPiles(makeState(), 0, 0, pile, [])
    expect(compterBrisquesJoueur(state, 0)).toBe(32)
  })

  it('Roi, Dame, Valet, 9, 8, 7 valent 0 brisque', () => {
    const pile = [
      c('spades','K',0,1), c('hearts','Q',0,2), c('clubs','J',0,3),
      c('diamonds','9',0,4), c('spades','8',0,5), c('hearts','7',0,6),
    ]
    const state = setScoresEtPiles(makeState(), 0, 0, pile, [])
    expect(compterBrisquesJoueur(state, 0)).toBe(0)
  })
})

// ============================================================
// CALCUL DES BRISQUES — CAS A et CAS B
// ============================================================

describe('calculerBrisques', () => {

  // CAS B — Égalité
  it('CAS B : égalité brisques → chacun reçoit +160 si score ≥ 200', () => {
    const brisques = Array.from({length: 16}, (_, i) => c('hearts', 'A', i % 4, i))
    const state = setScoresEtPiles(makeState(), 300, 400, brisques, brisques)
    const r = calculerBrisques(state)
    expect(r.casEgalite).toBe(true)
    expect(r.deltaJ0).toBe(160)
    expect(r.deltaJ1).toBe(160)
  })

  it('CAS B : égalité brisques → 0 si score < 200', () => {
    const brisques = Array.from({length: 16}, (_, i) => c('spades', 'A', i % 4, i))
    const state = setScoresEtPiles(makeState(), 100, 150, brisques, brisques)
    const r = calculerBrisques(state)
    expect(r.casEgalite).toBe(true)
    expect(r.deltaJ0).toBe(0)
    expect(r.deltaJ1).toBe(0)
  })

  it('CAS B : égalité — J0 < 200 ne reçoit pas le bonus, J1 ≥ 200 oui', () => {
    const brisques = Array.from({length: 16}, (_, i) => c('clubs', 'A', i % 4, i))
    const state = setScoresEtPiles(makeState(), 150, 250, brisques, brisques)
    const r = calculerBrisques(state)
    expect(r.casEgalite).toBe(true)
    expect(r.deltaJ0).toBe(0)    // score < 200
    expect(r.deltaJ1).toBe(160)  // score ≥ 200
  })

  // CAS A — Un joueur a plus de brisques
  it('CAS A : J0 a plus de brisques → J0 reçoit brisques × 10, J1 perd 200', () => {
    const pileJ0 = Array.from({length: 20}, (_, i) => c('hearts', 'A', i % 4, i))   // 20 brisques
    const pileJ1 = Array.from({length: 12}, (_, i) => c('spades', 'A', i % 4, i+20)) // 12 brisques
    const state = setScoresEtPiles(makeState(), 300, 300, pileJ0, pileJ1)
    const r = calculerBrisques(state)
    expect(r.casEgalite).toBe(false)
    expect(r.gagnantBrisques).toBe(0)
    expect(r.deltaJ0).toBe(200)   // 20 × 10
    expect(r.deltaJ1).toBe(-200)
  })

  it('CAS A : J1 a plus de brisques → J1 reçoit brisques × 10, J0 perd 200', () => {
    const pileJ0 = Array.from({length: 10}, (_, i) => c('hearts', 'A', i % 4, i))   // 10 brisques
    const pileJ1 = Array.from({length: 22}, (_, i) => c('spades', 'A', i % 4, i+10)) // 22 brisques
    const state = setScoresEtPiles(makeState(), 400, 350, pileJ0, pileJ1)
    const r = calculerBrisques(state)
    expect(r.gagnantBrisques).toBe(1)
    expect(r.deltaJ1).toBe(220)   // 22 × 10
    expect(r.deltaJ0).toBe(-200)
  })

  it('CAS A : perdant avec score < 200 ne perd pas 200 pts', () => {
    const pileJ0 = Array.from({length: 20}, (_, i) => c('hearts', 'A', i % 4, i))
    const pileJ1 = Array.from({length: 12}, (_, i) => c('spades', 'A', i % 4, i+20))
    const state = setScoresEtPiles(makeState(), 300, 150, pileJ0, pileJ1)
    const r = calculerBrisques(state)
    // J1 perdant avec score < 200 → deltaJ1 = 0 (pas de -200)
    expect(r.deltaJ1).toBe(0)
    expect(r.deltaJ0).toBe(200)  // gagnant avec score ≥ 200
  })

  it('CAS A : gagnant avec score < 200 ne reçoit pas les brisques × 10', () => {
    const pileJ0 = Array.from({length: 20}, (_, i) => c('hearts', 'A', i % 4, i))
    const pileJ1 = Array.from({length: 12}, (_, i) => c('spades', 'A', i % 4, i+20))
    const state = setScoresEtPiles(makeState(), 100, 100, pileJ0, pileJ1)
    const r = calculerBrisques(state)
    // Gagnant J0 avec score < 200 → deltaJ0 = 0
    expect(r.deltaJ0).toBe(0)
    expect(r.deltaJ1).toBe(0)  // perdant aussi < 200
  })

  it('total brisques J0 + J1 = somme réelle', () => {
    const pileJ0 = Array.from({length: 17}, (_, i) => c('hearts', 'A', i % 4, i))
    const pileJ1 = Array.from({length: 15}, (_, i) => c('spades', 'A', i % 4, i+20))
    const state = setScoresEtPiles(makeState(), 300, 300, pileJ0, pileJ1)
    const r = calculerBrisques(state)
    expect(r.brisquesJ0).toBe(17)
    expect(r.brisquesJ1).toBe(15)
  })
})

// ============================================================
// APPLIQUER FIN DE MANCHE
// ============================================================

describe('appliquerFinManche', () => {

  it('bonus dernier pli +10 au vainqueur du dernier pli', () => {
    const state = setScoresEtPiles(makeState(), 400, 300, [], [])
    const stateAvecBonus = { ...state, dernierVainqueurPli: 0 as const }
    const r = appliquerFinManche(stateAvecBonus)
    // J0 reçoit +10 du dernier pli (avant le calcul des brisques)
    expect(r.bonusDernierPli).toBe(0)
  })

  it('pas de bonus dernier pli si null', () => {
    const state = { ...setScoresEtPiles(makeState(), 400, 300, [], []), dernierVainqueurPli: null }
    const r = appliquerFinManche(state)
    expect(r.bonusDernierPli).toBeNull()
  })

  it('vainqueur détecté quand score ≥ 1000', () => {
    const pileJ0 = Array.from({length: 20}, (_, i) => c('hearts', 'A', i % 4, i))
    const pileJ1 = Array.from({length: 12}, (_, i) => c('spades', 'A', i % 4, i+20))
    // J0 a 700 pts + 200 brisques (20×10) = 900 < 1000 → pas encore
    const state = setScoresEtPiles(makeState(), 700, 300, pileJ0, pileJ1)
    const r = appliquerFinManche(state)
    // 700 + 200 (brisques) = 900, pas encore 1000
    expect(r.vainqueurManche).toBeNull()
  })

  it('vainqueur J0 quand score final ≥ 1000', () => {
    const pileJ0 = Array.from({length: 20}, (_, i) => c('hearts', 'A', i % 4, i))
    const pileJ1 = Array.from({length: 12}, (_, i) => c('spades', 'A', i % 4, i+20))
    // J0 : 800 + 200 brisques = 1000 ✓
    const state = setScoresEtPiles(makeState(), 800, 400, pileJ0, pileJ1)
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(0)
  })

  it('vainqueur J1 quand score final ≥ 1000', () => {
    const pileJ0 = Array.from({length: 10}, (_, i) => c('hearts', 'A', i % 4, i))
    const pileJ1 = Array.from({length: 22}, (_, i) => c('spades', 'A', i % 4, i+10))
    // J1 : 800 + 220 brisques = 1020 ≥ 1000 ✓
    const state = setScoresEtPiles(makeState(), 500, 800, pileJ0, pileJ1)
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(1)
  })

  it('état passe à "terminee" seulement quand la partie est gagnée (4-0), pas à chaque manche', () => {
    const pileJ0 = Array.from({length: 25}, (_, i) => c('hearts', 'A', i % 4, i))
    const pileJ1 = Array.from({length: 7}, (_, i) => c('spades', 'A', i % 4, i+25))
    const state = setScoresEtPiles(makeState(), 900, 200, pileJ0, pileJ1)
    const r = appliquerFinManche(state)
    // Vainqueur de manche trouvé, mais la partie n'est pas terminée (compteur [1,0], pas [4,0])
    expect(r.vainqueurManche).toBe(0)
    expect(r.vainqueurPartie).toBeNull()
    expect(r.state.phase).not.toBe('terminee') // la partie continue
  })

  it('score négatif bloqué à 0 (SF-19.4)', () => {
    const pileJ0 = Array.from({length: 20}, (_, i) => c('hearts', 'A', i % 4, i))
    const pileJ1 = Array.from({length: 12}, (_, i) => c('spades', 'A', i % 4, i+20))
    // J1 a 100 pts et perd 200 → devrait être 0, pas -100
    const state = setScoresEtPiles(makeState(), 300, 100, pileJ0, pileJ1)
    const r = appliquerFinManche(state)
    expect(r.scoreFinJ1).toBeGreaterThanOrEqual(0)
  })
})

// ============================================================
// RÈGLE "EN BAS TABLE" ET "CHARLES BÉZIGUE"
// ============================================================

describe('Victoire "en bas table" — Charles Bézigue', () => {

  it('en bas table si adversaire < 750 quand gagnant ≥ 1000', () => {
    const pileJ0 = Array.from({length: 25}, (_, i) => c('hearts', 'A', i % 4, i))
    const pileJ1 = Array.from({length: 7},  (_, i) => c('spades', 'A', i % 4, i+25))
    // J0 : 900 + 250 = 1150 ≥ 1000 ✓ ; J1 : 600 (< 750)
    const state = setScoresEtPiles(makeState(), 900, 600, pileJ0, pileJ1)
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(0)
    expect(r.enBasTable).toBe(true)
    expect(r.charlesBezigue).toBe(true)
  })

  it('PAS en bas table si adversaire ≥ 750 après brisques', () => {
    // J0 : 900 + 10 (bonus) + 250 (25×10) = 1160 ≥ 1000 ✓
    // J1 : 980 - 200 = 780 ≥ 750 → PAS en bas table
    const pileJ0 = Array.from({length: 25}, (_, i) => c('hearts', 'A', i % 4, i))
    const pileJ1 = Array.from({length: 7},  (_, i) => c('spades', 'A', i % 4, i+25))
    const state = setScoresEtPiles(makeState(), 900, 980, pileJ0, pileJ1)
    const r = appliquerFinManche(state)
    expect(r.enBasTable).toBe(false)
    expect(r.charlesBezigue).toBe(false)
  })

  it('en bas table exactement à la frontière : adversaire = 749', () => {
    const pileJ0 = Array.from({length: 25}, (_, i) => c('hearts', 'A', i % 4, i))
    const pileJ1 = Array.from({length: 7},  (_, i) => c('spades', 'A', i % 4, i+25))
    const state = setScoresEtPiles(makeState(), 900, 749, pileJ0, pileJ1)
    const r = appliquerFinManche(state)
    expect(r.enBasTable).toBe(true)
  })

  it('pas en bas table quand adversaire finit exactement à 750', () => {
    // J1 doit finir à exactement 750 : score initial 950 - 200 brisques = 750 ≥ 750
    const pileJ0 = Array.from({length: 25}, (_, i) => c('hearts', 'A', i % 4, i))
    const pileJ1 = Array.from({length: 7},  (_, i) => c('spades', 'A', i % 4, i+25))
    const state = setScoresEtPiles(makeState(), 900, 950, pileJ0, pileJ1)
    const r = appliquerFinManche(state)
    // J1 finit à 950 - 200 = 750 → exactement 750 → PAS en bas table
    expect(r.enBasTable).toBe(false)
  })

  it('pas de Charles Bézigue si personne n\'a gagné', () => {
    const state = setScoresEtPiles(makeState(), 400, 400, [], [])
    const r = appliquerFinManche(state)
    expect(r.charlesBezigue).toBe(false)
    expect(r.vainqueurManche).toBeNull()
  })
})

// ============================================================
// DÉTECTION FIN DE MANCHE
// ============================================================

describe('mancheTerminee', () => {
  it('manche terminée si plus de cartes et phase finale', () => {
    const state = makeState({ phase: 'finale' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [] }
    joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [] }
    expect(mancheTerminee({ ...state, joueurs })).toBe(true)
  })

  it('manche non terminée si des cartes restent', () => {
    const state = makeState({ phase: 'finale' })
    expect(mancheTerminee(state)).toBe(false)
  })

  it('manche non terminée en phase libre (même sans cartes)', () => {
    const state = makeState({ phase: 'libre' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [] }
    joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [] }
    expect(mancheTerminee({ ...state, joueurs })).toBe(false)
  })
})

// ============================================================
// DÉCLENCHEMENT DE LA PHASE FINALE
// ============================================================

describe('doitDeclenchemtPhaseFinale', () => {
  it('déclenche la phase finale : pioche vide et phase encore "libre"', () => {
    const state = makeState({ phase: 'libre', pioche: [] })
    expect(doitDeclenchemtPhaseFinale(state)).toBe(true)
  })

  it('ne déclenche pas si la pioche contient encore des cartes', () => {
    const state = makeState({ phase: 'libre', pioche: [c('hearts', '7')] })
    expect(doitDeclenchemtPhaseFinale(state)).toBe(false)
  })

  it('ne redéclenche pas si la phase est déjà "finale"', () => {
    const state = makeState({ phase: 'finale', pioche: [] })
    expect(doitDeclenchemtPhaseFinale(state)).toBe(false)
  })

  it('ne déclenche pas si la phase est "terminee" même pioche vide', () => {
    const state = makeState({ phase: 'terminee', pioche: [] })
    expect(doitDeclenchemtPhaseFinale(state)).toBe(false)
  })
})

// ============================================================
// RÉGRESSION — BUG "IA RÉFLÉCHIT" BLOCAGE FIN DE MANCHE
// Scénario : phase finale, le joueur pose sa dernière carte,
// le pli est résolu, les mains sont vides. L'engine appelait
// choisirCarteIA() sur une main vide → carte=undefined → blocage.
// La correction détecte les mains vides AVANT le tour de l'IA
// et déclenche appliquerFinManche directement.
// ============================================================

describe('Régression — mains vides en phase finale (bug IA bloquée)', () => {
  function makeEtatMansVides(scoreJ0: number, scoreJ1: number): GameState {
    const state = makeState({ phase: 'finale', dernierVainqueurPli: 1 })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    // Les deux joueurs ont joué leur dernière carte : mains et étalées vides
    joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [], marquePoints: scoreJ0 }
    joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [], marquePoints: scoreJ1 }
    return { ...state, joueurs }
  }

  it('mancheTerminee() retourne true quand les deux mains sont vides en phase finale', () => {
    const state = makeEtatMansVides(490, 10)
    expect(mancheTerminee(state)).toBe(true)
  })

  it('appliquerFinManche() fonctionne correctement sur un état mains vides', () => {
    const state = makeEtatMansVides(490, 10)
    expect(() => appliquerFinManche(state)).not.toThrow()
  })

  it('appliquerFinManche() identifie le bon vainqueur même sans cartes', () => {
    // J0 a plus de points via les brisques finales
    const s = makeEtatMansVides(800, 100)
    const joueurs = [...s.joueurs] as typeof s.joueurs
    // Ajouter des brisques pour J0 pour dépasser 1000
    joueurs[0] = { ...joueurs[0], pileRemportee: Array.from({ length: 20 }, (_, i) => c('hearts', 'A', i % 4, i)) }
    joueurs[1] = { ...joueurs[1], pileRemportee: [] }
    const state = { ...s, joueurs }
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(0)
  })

  it('avec mains vides et aucun joueur à 1000 → vainqueurManche null (pas de blocage)', () => {
    // Personne n'atteint 1000 même après brisques
    const state = makeEtatMansVides(200, 100)
    const r = appliquerFinManche(state)
    // Le résultat doit être calculé sans erreur
    expect(r).toBeDefined()
    expect(r.scoreFinJ0).toBeGreaterThanOrEqual(200)
    expect(r.scoreFinJ1).toBeGreaterThanOrEqual(100)
  })

  it('mancheTerminee() retourne false si seulement J1 a la main vide', () => {
    const state = makeState({ phase: 'finale' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [] }
    // J0 a encore des cartes — pas terminé
    expect(mancheTerminee({ ...state, joueurs })).toBe(false)
  })

  it('mancheTerminee() retourne false si seulement J0 a la main vide', () => {
    const state = makeState({ phase: 'finale' })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [] }
    // J1 a encore des cartes — pas terminé
    expect(mancheTerminee({ ...state, joueurs })).toBe(false)
  })
})
