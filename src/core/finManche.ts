// ============================================================
// MOTEUR DE FIN DE MANCHE — IT-5
// SF-12, SF-13 : brisques, bonus dernier pli, victoire
// ============================================================

import { initialiserPartie } from './init'
import type { GameState, GameConfig, Couleur } from '../types'
import { VALEURS_BRISQUES } from '../types'
import { logger } from '../utils/logger'

// ============================================================
// SF-13.1 — Compter les brisques (As + 10) dans une pile
// ============================================================

export function compterBrisquesJoueur(state: GameState, joueurId: 0 | 1): number {
  return state.joueurs[joueurId].pileRemportee.filter(
    c => !c.estJoker && (c.rang === 'A' || c.rang === '10')
  ).length
}

// ============================================================
// SF-13.2 — Résultat brisques
// ============================================================

export interface ResultatBrisques {
  brisquesJ0: number
  brisquesJ1: number
  casEgalite: boolean
  gagnantBrisques: 0 | 1 | null  // null si égalité
  deltaJ0: number   // points ajoutés/retirés à J0
  deltaJ1: number   // points ajoutés/retirés à J1
}

export function calculerBrisques(state: GameState): ResultatBrisques {
  const brisquesJ0 = compterBrisquesJoueur(state, 0)
  const brisquesJ1 = compterBrisquesJoueur(state, 1)
  const scoreJ0 = state.joueurs[0].marquePoints
  const scoreJ1 = state.joueurs[1].marquePoints

  logger.info('BRISQUES', `J0: ${brisquesJ0}, J1: ${brisquesJ1}`, { scoreJ0, scoreJ1 })

  // CAS B — Égalité
  if (brisquesJ0 === brisquesJ1) {
    const deltaJ0 = scoreJ0 >= 200 ? 160 : 0
    const deltaJ1 = scoreJ1 >= 200 ? 160 : 0
    logger.info('BRISQUES', `CAS B égalité → J0+${deltaJ0}, J1+${deltaJ1}`)
    return { brisquesJ0, brisquesJ1, casEgalite: true, gagnantBrisques: null, deltaJ0, deltaJ1 }
  }

  // CAS A — Un joueur a plus de brisques
  const gagnantBrisques: 0 | 1 = brisquesJ0 > brisquesJ1 ? 0 : 1
  const perdantBrisques: 0 | 1 = gagnantBrisques === 0 ? 1 : 0
  const brisquesGagnant = gagnantBrisques === 0 ? brisquesJ0 : brisquesJ1
  const scoreGagnant = state.joueurs[gagnantBrisques].marquePoints
  const scorePerdant = state.joueurs[perdantBrisques].marquePoints

  const deltaGagnant = scoreGagnant >= 200 ? brisquesGagnant * 10 : 0
  const deltaPerdant = scorePerdant >= 200 ? -200 : 0

  const deltaJ0 = gagnantBrisques === 0 ? deltaGagnant : deltaPerdant
  const deltaJ1 = gagnantBrisques === 1 ? deltaGagnant : deltaPerdant

  logger.info('BRISQUES', `CAS A → gagnant J${gagnantBrisques}, J0:${deltaJ0}, J1:${deltaJ1}`)
  return { brisquesJ0, brisquesJ1, casEgalite: false, gagnantBrisques, deltaJ0, deltaJ1 }
}

// ============================================================
// SF-12.4 + SF-13 — Appliquer fin de manche complète
// ============================================================

export interface ResultatManche {
  state: GameState
  brisques: ResultatBrisques
  bonusDernierPli: 0 | 1 | null
  vainqueurManche: 0 | 1 | null   // null si personne n'a atteint 1000
  enBasTable: boolean              // adversaire < 750 quand gagnant ≥ 1000
  charlesBezigue: boolean
  scoreFinJ0: number
  scoreFinJ1: number
  // Compteur de manches après cette manche
  compteurManches: [number, number]
  // Victoire finale de la partie (4-0)
  vainqueurPartie: 0 | 1 | null
  centPoints: boolean              // victoire 4-0 en incluant un Charles Bézigue
}

export function appliquerFinManche(
  state: GameState,
  finAnticipee = false  // true = seuil atteint via annonces, cartes encore en main
): ResultatManche {
  let newState = { ...state }

  // 1. Bonus dernier pli (+10 pts)
  // Ignoré en fin anticipée (seuil atteint via annonces, pas de dernier pli significatif)
  const bonusDernierPli = finAnticipee ? null : newState.dernierVainqueurPli
  if (!finAnticipee && bonusDernierPli !== null) {
    const joueursMaj = [...newState.joueurs] as typeof newState.joueurs
    const nouveauScore = Math.max(0, joueursMaj[bonusDernierPli].marquePoints + 10)
    joueursMaj[bonusDernierPli] = { ...joueursMaj[bonusDernierPli], marquePoints: nouveauScore }
    newState = { ...newState, joueurs: joueursMaj, bonusDernierPli }
    logger.info('FIN_MANCHE', `Bonus dernier pli +10 → J${bonusDernierPli}`)
  }

  // 2 & 3. Calcul et application des brisques
  // Ignorés en fin anticipée : les marques reflètent déjà le score réel
  // (seul les annonces ont compté, pas les brisques en pile)
  let brisques: ResultatBrisques
  let scoreJ0ApresB: number
  let scoreJ1ApresB: number

  if (finAnticipee) {
    // Fin anticipée : scores = marquePoints actuels, brisques neutres
    brisques = {
      brisquesJ0: newState.joueurs[0].pileRemportee.filter(c => VALEURS_BRISQUES[c.rang] > 0).length,
      brisquesJ1: newState.joueurs[1].pileRemportee.filter(c => VALEURS_BRISQUES[c.rang] > 0).length,
      deltaJ0: 0,
      deltaJ1: 0,
      gagnantBrisques: null,
      casEgalite: false,
    }
    scoreJ0ApresB = newState.joueurs[0].marquePoints
    scoreJ1ApresB = newState.joueurs[1].marquePoints
    logger.info('FIN_MANCHE', `Fin anticipée — scores directs: J0=${scoreJ0ApresB}, J1=${scoreJ1ApresB}`)
  } else {
    brisques = calculerBrisques(newState)
    const joueursMaj2 = [...newState.joueurs] as typeof newState.joueurs
    scoreJ0ApresB = Math.max(0, joueursMaj2[0].marquePoints + brisques.deltaJ0)
    scoreJ1ApresB = Math.max(0, joueursMaj2[1].marquePoints + brisques.deltaJ1)
    joueursMaj2[0] = { ...joueursMaj2[0], marquePoints: scoreJ0ApresB, brisques: brisques.brisquesJ0 }
    joueursMaj2[1] = { ...joueursMaj2[1], marquePoints: scoreJ1ApresB, brisques: brisques.brisquesJ1 }
    newState = { ...newState, joueurs: joueursMaj2 }
    logger.info('FIN_MANCHE', `Scores finaux: J0=${scoreJ0ApresB}, J1=${scoreJ1ApresB}`)
  }

  // 4. Vérifier qui atteint 1000 pts (victoire de manche)
  const seuil = 1000
  const j0Gagne = scoreJ0ApresB >= seuil
  const j1Gagne = scoreJ1ApresB >= seuil
  let vainqueurManche: 0 | 1 | null = null

  if (j0Gagne && j1Gagne) {
    vainqueurManche = scoreJ0ApresB >= scoreJ1ApresB ? 0 : 1
  } else if (j0Gagne) {
    vainqueurManche = 0
  } else if (j1Gagne) {
    vainqueurManche = 1
  }

  // 5. "En bas table" : adversaire < 750 quand le vainqueur atteint 1000
  let enBasTable = false
  if (vainqueurManche !== null) {
    const scorePerdant = vainqueurManche === 0 ? scoreJ1ApresB : scoreJ0ApresB
    enBasTable = scorePerdant < 750
  }

  // Charles Bézigue de manche = victoire en bas de table
  const charlesBezigue = enBasTable

  // 6. Mettre à jour le compteur de manches
  //    Vainqueur de manche : +1 (ou +2 si en bas de table)
  //    Adversaire : remis à 0
  const compteurManches: [number, number] = [...(newState.compteurManches ?? [0, 0])] as [number, number]

  if (vainqueurManche !== null) {
    const adversaire: 0 | 1 = vainqueurManche === 0 ? 1 : 0
    const gain = enBasTable ? 2 : 1
    compteurManches[vainqueurManche] = compteurManches[vainqueurManche] + gain
    compteurManches[adversaire] = 0
    logger.info('FIN_MANCHE', `Compteur manches → J0:${compteurManches[0]}, J1:${compteurManches[1]} (gain=${gain})`)
  }

  newState = { ...newState, compteurManches }

  // 7. Vérifier la victoire de la partie (4 manches avec l'adversaire à 0)
  const SEUIL_PARTIE = 4
  let vainqueurPartie: 0 | 1 | null = null

  if (compteurManches[0] >= SEUIL_PARTIE && compteurManches[1] === 0) {
    vainqueurPartie = 0
  } else if (compteurManches[1] >= SEUIL_PARTIE && compteurManches[0] === 0) {
    vainqueurPartie = 1
  }

  // "Cent points" = victoire finale de la partie (4-0)
  const centPoints = vainqueurPartie !== null

  if (vainqueurPartie !== null) {
    newState = { ...newState, phase: 'terminee' }
    logger.info('FIN_MANCHE', `Victoire de partie → J${vainqueurPartie} (centPoints=${centPoints})`, {
      enBasTable, charlesBezigue, compteurManches,
    })
  } else if (vainqueurManche !== null) {
    // Manche gagnée mais pas encore la partie : on continue
    logger.info('FIN_MANCHE', `Manche gagnée par J${vainqueurManche}, partie continue`, { compteurManches })
  }

  return {
    state: newState,
    brisques,
    bonusDernierPli,
    vainqueurManche,
    enBasTable,
    charlesBezigue,
    scoreFinJ0: scoreJ0ApresB,
    scoreFinJ1: scoreJ1ApresB,
    compteurManches,
    vainqueurPartie,
    centPoints,
  }
}

// ============================================================
// SF-12.1 — Détecter si la phase finale doit se déclencher
// ============================================================

export function doitDeclenchemtPhaseFinale(state: GameState): boolean {
  return state.pioche.length === 0 && state.phase === 'libre'
}

// ============================================================
// SF-12 — Vérifier si la manche est terminée (plus de cartes)
// ============================================================

export function mancheTerminee(state: GameState): boolean {
  const j0 = state.joueurs[0]
  const j1 = state.joueurs[1]
  return j0.main.length === 0 && j0.cartesEtalees.length === 0
      && j1.main.length === 0 && j1.cartesEtalees.length === 0
      && state.phase === 'finale'
}

// ============================================================
// Initialiser une nouvelle manche (conserver les scores)
// ============================================================

export function initialiserNouvelleManche(
  state: GameState,
  config: GameConfig,
  vainqueurManche: 0 | 1 | null
): GameState {
  const { state: newState } = initialiserPartie(config)

  // Règle scores de jeu (marquePoints) :
  //   - Manche avec vainqueur (≥ 1000 pts) → remise à 0 pour la nouvelle manche
  //   - Manche sans vainqueur (< 1000 pts) → les scores accumulés sont conservés
  const scoreJ0 = vainqueurManche !== null ? 0 : state.joueurs[0].marquePoints
  const scoreJ1 = vainqueurManche !== null ? 0 : state.joueurs[1].marquePoints

  const joueursMaj = [...newState.joueurs] as typeof newState.joueurs
  joueursMaj[0] = { ...joueursMaj[0], marquePoints: scoreJ0 }
  joueursMaj[1] = { ...joueursMaj[1], marquePoints: scoreJ1 }

  // Flag premier bésigue :
  //   - Manche avec vainqueur (≥ 1000 pts) → remis à false (nouveau départ)
  //   - Manche sans vainqueur (< 1000 pts) → conservé (le 1er bésigue reste posé)
  const premierBesiguePose = vainqueurManche !== null ? false : state.premierBesiguePose

  logger.info('INIT_MANCHE', `Nouvelle manche — scores: J0=${scoreJ0}, J1=${scoreJ1}`, {
    vainqueurManche,
    mancheNumero: state.mancheNumero + 1,
    premierBesiguePose,
  })

  return {
    ...newState,
    joueurs: joueursMaj,
    mancheNumero: state.mancheNumero + 1,
    compteurManches: state.compteurManches,
    premierBesiguePose,
  }
}
