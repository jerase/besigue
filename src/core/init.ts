// ============================================================
// MOTEUR D'INITIALISATION — IT-2
// Tirage premier joueur, distribution, pioche, état initial
// ============================================================

import type {
  Carte, GameConfig, GameState, Joueur, PliEnCours, ResultatTirage,
} from '../types'
import { ORDRE_RANGS } from '../types'
import { creerDeckMelange, melangerFisherYates } from './deck'
import { logger } from '../utils/logger'

const NB_CARTES_INITIALES = 9

// ============================================================
// TIRAGE DU PREMIER JOUEUR (SF-07.1 Étape 3)
// Chaque joueur tire une carte, rang le plus fort commence.
// En cas d'égalité, on retire jusqu'au départage.
// ============================================================

export function tirerPremierJoueur(cartes: Carte[]): ResultatTirage {
  let pool = [...cartes]
  let tentative = 0
  const MAX_TENTATIVES = 20

  while (tentative < MAX_TENTATIVES) {
    const carteJ0 = pool[0]
    const carteJ1 = pool[1]

    const rangJ0 = carteJ0.estJoker ? -1 : ORDRE_RANGS[carteJ0.rang]
    const rangJ1 = carteJ1.estJoker ? -1 : ORDRE_RANGS[carteJ1.rang]

    if (rangJ0 !== rangJ1) {
      const premierJoueur: 0 | 1 = rangJ0 > rangJ1 ? 0 : 1
      logger.info('INIT', `Premier joueur : J${premierJoueur}`, {
        carteJ0: carteJ0.id, carteJ1: carteJ1.id, tentative,
      })
      return {
        premierJoueur,
        carteJ0,
        carteJ1,
        egalite: tentative > 0,
      }
    }

    // Égalité → réinsérer ces cartes et remélanger
    logger.debug('INIT', 'Égalité tirage, nouveau tirage', { rang: carteJ0.rang })
    pool = melangerFisherYates(pool.slice(2))
    tentative++
  }

  // Fallback ultra-rare : J0 commence
  logger.warn('INIT', 'Tirage : max tentatives atteint, J0 désigné par défaut')
  return {
    premierJoueur: 0,
    carteJ0: pool[0],
    carteJ1: pool[1],
    egalite: true,
  }
}

// ============================================================
// CRÉER UN JOUEUR VIDE
// ============================================================

export function creerJoueur(id: 0 | 1, config: GameConfig): Joueur {
  return {
    id,
    nom: id === 0 ? config.nomJoueur1 : config.nomJoueur2,
    type: id === 0 ? 'humain' : config.typeJoueur2,
    main: [],
    cartesEtalees: [],
    pileRemportee: [],
    marquePoints: 0,
    brisques: 0,
  }
}

// ============================================================
// INITIALISER UNE PARTIE COMPLÈTE (SF-07.1)
// ============================================================

export function initialiserPartie(config: GameConfig): {
  state: GameState
  history: []
} {
  const partieId = `partie_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  logger.nouvellePartie(partieId)
  logger.info('INIT', 'Initialisation partie', { config, partieId })

  // Étape 1 & 2 — Créer et mélanger le deck
  const deck = creerDeckMelange()
  logger.info('INIT', `Deck créé : ${deck.cartes.length} cartes`, { graine: deck.graine })

  // Étape 3 — Tirage du premier joueur
  const tirage = tirerPremierJoueur(deck.cartes)

  // Remettre les cartes tirées et remélanger
  const cartesApresTirage = melangerFisherYates(deck.cartes)

  // Étape 3 — Distribution : 9 cartes par joueur
  const joueur0 = creerJoueur(0, config)
  const joueur1 = creerJoueur(1, config)

  // Distribution alternée depuis le dessus du deck
  for (let i = 0; i < NB_CARTES_INITIALES; i++) {
    const carteJ0 = { ...cartesApresTirage[i * 2],     faceUp: true,  etat: 'faceUp'  as const }
    const carteJ1 = { ...cartesApresTirage[i * 2 + 1], faceUp: false, etat: 'faceDown' as const }
    joueur0.main.push(carteJ0)
    joueur1.main.push(carteJ1)
  }

  // Étape 5 — Pioche = cartes restantes
  const pioche: Carte[] = cartesApresTirage.slice(NB_CARTES_INITIALES * 2).map(c => ({
    ...c, faceUp: false, etat: 'faceDown' as const,
  }))

  logger.info('INIT', 'Distribution effectuée', {
    mainJ0: joueur0.main.length,
    mainJ1: joueur1.main.length,
    pioche: pioche.length,
    premierJoueur: tirage.premierJoueur,
  })

  const pliEnCours: PliEnCours = {
    carteJoueur0: null,
    carteJoueur1: null,
    joueurOuvreur: tirage.premierJoueur,
  }

  const state: GameState = {
    partieId,
    phase: 'libre',
    mancheNumero: 1,
    joueurs: [joueur0, joueur1],
    pioche,
    nbCartesRestantes: pioche.length,
    pliEnCours,
    joueurActif: tirage.premierJoueur,
    dernierVainqueurPli: null,
    couleurAtout: null,
    atoutDefini: false,
    premierBesiguePose: false,
    bonusDernierPli: null,
    annonces: [],
    usagesCartes: [],
    mariagesAtoutActifs: { 0: [], 1: [] },
    combisEnAttente: { 0: [], 1: [] },
  }

  return { state, history: [] }
}

// ============================================================
// PIOCHE — tirer 1 carte pour un joueur
// ============================================================

export function piocher(
  state: GameState,
  joueurId: 0 | 1
): { state: GameState; cartePiochee: Carte | null } {
  if (state.pioche.length === 0) {
    logger.warn('PIOCHE', 'Pioche vide')
    return { state, cartePiochee: null }
  }

  const [cartePiochee, ...piocheRestante] = state.pioche
  const estHumain = state.joueurs[joueurId].type === 'humain'
  const carteVisible: Carte = {
    ...cartePiochee,
    faceUp: estHumain,
    etat: estHumain ? 'faceUp' : 'faceDown',
  }

  const nouvelleMain = [...state.joueurs[joueurId].main, carteVisible]
  const joueursMaj = [...state.joueurs] as [Joueur, Joueur]
  joueursMaj[joueurId] = { ...joueursMaj[joueurId], main: nouvelleMain }

  logger.debug('PIOCHE', `J${joueurId} pioche`, { carteId: cartePiochee.id })

  return {
    state: {
      ...state,
      joueurs: joueursMaj,
      pioche: piocheRestante,
      nbCartesRestantes: piocheRestante.length,
    },
    cartePiochee: carteVisible,
  }
}

// ============================================================
// AJOUTER DES POINTS AU MARQUE_POINTS (jamais négatif)
// ============================================================

export function ajouterPoints(
  state: GameState,
  joueurId: 0 | 1,
  points: number
): GameState {
  const joueursMaj = [...state.joueurs] as [Joueur, Joueur]
  const nouveauScore = Math.max(0, joueursMaj[joueurId].marquePoints + points)
  joueursMaj[joueurId] = { ...joueursMaj[joueurId], marquePoints: nouveauScore }
  logger.info('SCORE', `J${joueurId} : ${state.joueurs[joueurId].marquePoints} → ${nouveauScore} (+${points})`)
  return { ...state, joueurs: joueursMaj }
}

// ============================================================
// VÉRIFIER SI UNE SAUVEGARDE EXISTE
// ============================================================

export function sauvegardeExiste(): boolean {
  try {
    return localStorage.getItem('besigue_save') !== null
  } catch {
    return false
  }
}
