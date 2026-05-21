// ============================================================
// MOTEUR COMBINAISONS — IT-4
// SF-10 : Détection, validation, réutilisation des 14 combis
// ============================================================

import type {
  Carte, Couleur, GameState, NomCombinaison,
  CombinaisonDisponible, AnnoncePosee, UsageCarteCombi,
} from '../types'
import { POINTS_COMBINAISON } from '../types'
import { logger } from '../utils/logger'

// ============================================================
// Helpers — accesseurs cartes
// ============================================================

/** Toutes les cartes disponibles d'un joueur (main + étalées) */
function cartesDisponibles(state: GameState, joueurId: 0 | 1): Carte[] {
  const j = state.joueurs[joueurId]
  return [...j.main, ...j.cartesEtalees]
}

/** Cartes déjà utilisées dans une combinaison de type donné pour ce joueur */
function idsDejaUtilisesPour(
  usages: UsageCarteCombi[],
  nom: NomCombinaison
): Set<string> {
  const ids = new Set<string>()
  for (const u of usages) {
    if (u.combinaisonsUtilisees.includes(nom)) ids.add(u.carteId)
  }
  return ids
}

/** Vérifie si une combinaison du même type a déjà été annoncée avec exactement ces cartes */
function memeCombiDejaAnnoncee(
  annonces: AnnoncePosee[],
  joueurId: 0 | 1,
  nom: NomCombinaison,
  cartesIds: string[]
): boolean {
  const setIds = new Set(cartesIds)
  return annonces.some(a =>
    a.joueurId === joueurId &&
    a.nom === nom &&
    a.cartesIds.length === cartesIds.length &&
    a.cartesIds.every(id => setIds.has(id))
  )
}

// ============================================================
// SF-10.1 / SF-10.2 — MARIAGES
// ============================================================

function detecterMariages(
  state: GameState,
  joueurId: 0 | 1
): CombinaisonDisponible[] {
  const cartes = cartesDisponibles(state, joueurId)
  const annonces = state.annonces ?? []
  const usages = state.usagesCartes ?? []
  const result: CombinaisonDisponible[] = []

  // Rois et Dames disponibles par couleur
  const rois:  Record<string, Carte[]> = {}
  const dames: Record<string, Carte[]> = {}

  for (const c of cartes) {
    if (c.estJoker) continue
    if (c.rang === 'K') (rois[c.couleur]  ??= []).push(c)
    if (c.rang === 'Q') (dames[c.couleur] ??= []).push(c)
  }

  const couleurs: Couleur[] = ['spades', 'hearts', 'diamonds', 'clubs']

  for (const couleur of couleurs) {
    const roisCouleur  = rois[couleur]  ?? []
    const damesCouleur = dames[couleur] ?? []
    if (!roisCouleur.length || !damesCouleur.length) continue

    const nomCombi: NomCombinaison = (state.couleurAtout && couleur === state.couleurAtout)
      ? 'mariage_atout'
      : (state.couleurAtout ? 'mariage_hors_atout' : 'mariage_atout')
    // Si atout non défini, le premier mariage posé DEVIENT mariage_atout

    // Trouver une paire Roi+Dame non déjà utilisée ensemble en mariage
    for (const roi of roisCouleur) {
      for (const dame of damesCouleur) {
        // Règle SF-10.10 : une paire (roi,dame) identique ne peut former qu'un seul mariage
        const dejaAnnonce =
          memeCombiDejaAnnoncee(annonces, joueurId, nomCombi,              [roi.id, dame.id]) ||
          memeCombiDejaAnnoncee(annonces, joueurId, 'mariage_atout',       [roi.id, dame.id]) ||
          memeCombiDejaAnnoncee(annonces, joueurId, 'mariage_hors_atout',  [roi.id, dame.id])
        if (dejaAnnonce) continue

        // Règle de réutilisation : un Roi ou une Dame déjà posé(e) dans un mariage
        // ne peut PAS être utilisé(e) dans un autre mariage.
        // (une carte étalée dans un mariage est "consommée" pour tout nouveau mariage)
        const roiDejaEnMariage = annonces.some(a =>
          a.joueurId === joueurId &&
          (a.nom === 'mariage_atout' || a.nom === 'mariage_hors_atout') &&
          a.cartesIds.includes(roi.id)
        )
        if (roiDejaEnMariage) continue

        const dameDejaEnMariage = annonces.some(a =>
          a.joueurId === joueurId &&
          (a.nom === 'mariage_atout' || a.nom === 'mariage_hors_atout') &&
          a.cartesIds.includes(dame.id)
        )
        if (dameDejaEnMariage) continue

        result.push({
          nom: nomCombi,
          points: POINTS_COMBINAISON[nomCombi],
          cartesIds: [roi.id, dame.id],
        })
        // Une seule combinaison mariage par couleur par passe
        break
      }
      // Passer au roi suivant seulement si le roi courant était bloqué
      if (result.some(r => r.nom === nomCombi && r.cartesIds[0] === roi.id)) break
    }
  }

  return result
}

// ============================================================
// SF-10.3 — QUINTE
// Prérequis : joueur a son propre mariage_Atout actif (non cassé)
// Composition : As + 10 + Valet de la couleur d'atout
// ============================================================

function detecterQuinte(
  state: GameState,
  joueurId: 0 | 1
): CombinaisonDisponible[] {
  if (!state.couleurAtout) return []

  const mariagesActifs = state.mariagesAtoutActifs?.[joueurId] ?? []
  if (mariagesActifs.length === 0) return []  // pas de mariage_Atout actif

  const annonces = state.annonces ?? []
  if (annonces.some(a => a.joueurId === joueurId && a.nom === 'quinte')) return []

  const atout = state.couleurAtout
  const cartes = cartesDisponibles(state, joueurId)

  const as     = cartes.filter(c => !c.estJoker && c.couleur === atout && c.rang === 'A')
  const dix    = cartes.filter(c => !c.estJoker && c.couleur === atout && c.rang === '10')
  const valets = cartes.filter(c => !c.estJoker && c.couleur === atout && c.rang === 'J')

  if (!as.length || !dix.length || !valets.length) return []

  return [{
    nom: 'quinte',
    points: POINTS_COMBINAISON.quinte,
    cartesIds: [as[0].id, dix[0].id, valets[0].id],
  }]
}

// ============================================================
// SF-10 — SEPT D'ATOUT
// NOTE : Le bonus de 10 pts est accordé AUTOMATIQUEMENT dans
// appliquerPli() quand le joueur joue le 7 d'atout dans un pli.
// Le 7 d'atout reste en main — il n'est PAS annoncé ni étalé.
// Cette fonction n'est donc plus appelée.
// ============================================================

// function detecterSeptAtout supprimée : bonus automatique dans pli.ts

// ============================================================
// SF-10.4 — BÉSIGUE (Dame♠ + Valet♦)
// Règle : chaque Dame♠ et chaque Valet♦ ne peut être utilisé
// que dans UN seul bésigue. Une carte déjà dans un bésigue
// (même avec un partenaire différent) ne peut pas reformer
// un nouveau bésigue.
// ============================================================

function detecterBesigue(
  state: GameState,
  joueurId: 0 | 1
): CombinaisonDisponible[] {
  const annonces = state.annonces ?? []
  const cartes = cartesDisponibles(state, joueurId)

  // IDs de cartes déjà utilisées dans un bésigue quelconque (par ce joueur)
  const dejaEnBesigue = new Set(
    annonces
      .filter(a => a.joueurId === joueurId && a.nom === 'besigue')
      .flatMap(a => a.cartesIds)
  )

  // Candidats : Dames♠ et Valets♦ non encore utilisés dans un bésigue
  const damesP   = cartes.filter(c => !c.estJoker && c.rang === 'Q' && c.couleur === 'spades'   && !dejaEnBesigue.has(c.id))
  const valetsCa = cartes.filter(c => !c.estJoker && c.rang === 'J' && c.couleur === 'diamonds' && !dejaEnBesigue.has(c.id))

  if (damesP.length === 0 || valetsCa.length === 0) return []

  const estPremier = !state.premierBesiguePose
  return [{
    nom: 'besigue',
    points: estPremier ? 100 : POINTS_COMBINAISON.besigue,
    cartesIds: [damesP[0].id, valetsCa[0].id],
  }]
}

// ============================================================
// SF-10.5 — CARRÉS _ATOUT (sans Joker, même couleur que l'atout)
// ============================================================

function detecterCarresAtout(
  state: GameState,
  joueurId: 0 | 1
): CombinaisonDisponible[] {
  if (!state.couleurAtout) return []
  const atout = state.couleurAtout
  const annonces = state.annonces ?? []
  const cartes = cartesDisponibles(state, joueurId)
  const result: CombinaisonDisponible[] = []

  const specs: Array<{ rang: Carte['rang']; nom: NomCombinaison }> = [
    { rang: 'A', nom: '4_as_atout'     },
    { rang: 'K', nom: '4_roi_atout'    },
    { rang: 'Q', nom: '4_dame_atout'   },
    { rang: 'J', nom: '4_valet_atout'  },
  ]

  for (const { rang, nom } of specs) {
    // Uniquement les cartes de la couleur atout, sans Joker
    const candidates = cartes.filter(c =>
      !c.estJoker && c.rang === rang && c.couleur === atout
    )
    if (candidates.length < 4) continue

    // Exclure les cartes déjà utilisées dans un carré du même rang
    // (qu'il soit atout ou normal : une carte consommée dans un carré ne peut plus
    //  participer à un autre carré du même rang)
    const nomNormal = nom.replace('_atout', '') as NomCombinaison  // '4_dame_atout' → '4_dame'
    const dejaUseesIds = new Set(
      annonces
        .filter(a => a.joueurId === joueurId && (a.nom === nom || a.nom === nomNormal))
        .flatMap(a => a.cartesIds)
    )

    const dispo = candidates.filter(c => !dejaUseesIds.has(c.id))
    if (dispo.length < 4) continue

    const quatre = dispo.slice(0, 4)
    if (!memeCombiDejaAnnoncee(annonces, joueurId, nom, quatre.map(c => c.id))) {
      result.push({ nom, points: POINTS_COMBINAISON[nom], cartesIds: quatre.map(c => c.id) })
    }
  }
  return result
}

// ============================================================
// SF-10.1 — CARRÉS NORMAUX (Joker autorisé, couleurs quelconques)
// Un carré = 4 cartes du même rang, sans restriction de couleur.
// Avec 4 jeux de 32 cartes, on peut avoir plusieurs exemplaires
// du même rang dans la même couleur.
// ============================================================

function detecterCarresNormaux(
  state: GameState,
  joueurId: 0 | 1
): CombinaisonDisponible[] {
  const annonces = state.annonces ?? []
  const cartes = cartesDisponibles(state, joueurId)
  const result: CombinaisonDisponible[] = []
  const jokers = cartes.filter(c => c.estJoker)

  const specs: Array<{ rang: Carte['rang']; nom: NomCombinaison }> = [
    { rang: 'A', nom: '4_as'    },
    { rang: 'K', nom: '4_roi'   },
    { rang: 'Q', nom: '4_dame'  },
    { rang: 'J', nom: '4_valet' },
  ]

  for (const { rang, nom } of specs) {
    const nomAtout = (nom + '_atout') as NomCombinaison

    // Cartes déjà utilisées dans un carré du même type (normal ou atout)
    const dejaUsees4Normal = new Set(
      annonces
        .filter(a => a.joueurId === joueurId && (a.nom === nom || a.nom === nomAtout))
        .flatMap(a => a.cartesIds)
    )

    // Candidats : toutes cartes du rang, non Joker, pas déjà dans ce type de carré
    const candidats = cartes.filter(c =>
      !c.estJoker && c.rang === rang && !dejaUsees4Normal.has(c.id)
    )

    let cartesCombi: Carte[] = []

    if (candidats.length >= 4) {
      // Prendre les 4 premières — pas de restriction de couleur
      cartesCombi = candidats.slice(0, 4)
    } else if (candidats.length === 3 && jokers.length > 0) {
      // 1 Joker peut compléter à 4
      const jokerDispo = jokers.find(j =>
        !annonces.some(a => a.joueurId === joueurId && a.nom === nom && a.cartesIds.includes(j.id))
      )
      if (jokerDispo) cartesCombi = [...candidats, jokerDispo]
    }

    if (cartesCombi.length < 4) continue

    const ids = cartesCombi.map(c => c.id)
    if (!memeCombiDejaAnnoncee(annonces, joueurId, nom, ids)) {
      result.push({ nom, points: POINTS_COMBINAISON[nom], cartesIds: ids })
    }
  }
  return result
}

// ============================================================
// POINT D'ENTRÉE — Toutes les combinaisons disponibles
// ============================================================

/**
 * Règle fondamentale (SF-10.2) :
 * Le mariage_Atout est le PRÉREQUIS GLOBAL à toute annonce.
 * Aucune combinaison (y compris les mariages hors-atout, bésigue, carrés…)
 * ne peut être annoncée tant qu'aucun des deux joueurs n'a étalé un mariage_Atout.
 *
 * Dès qu'un mariage_Atout est posé (par l'un ou l'autre joueur),
 * les deux joueurs peuvent annoncer n'importe quelle combinaison valide.
 *
 * Exception : le mariage_Atout lui-même peut toujours être proposé
 * (c'est la seule combinaison autorisée avant qu'un atout soit défini).
 */
export function detecterCombinaisonsDisponibles(
  state: GameState,
  joueurId: 0 | 1
): CombinaisonDisponible[] {
  const annonces = state.annonces ?? []

  // Vérifier si un mariage_Atout a déjà été annoncé (par l'un ou l'autre joueur)
  const mariageAtoutExiste = annonces.some(a => a.nom === 'mariage_atout')

  if (!mariageAtoutExiste) {
    // Avant le premier mariage_Atout : seuls les candidats au mariage_Atout sont proposés.
    // Un mariage hors-atout n'est pas possible ici car l'atout n'est pas défini.
    const mariages = detecterMariages(state, joueurId)
    // Ne garder QUE ceux qui sont un mariage_atout (le premier mariage pose l'atout)
    const candidatsAtout = mariages.filter(c => c.nom === 'mariage_atout')
    logger.debug('COMBI', `J${joueurId} : pas de mariage_Atout posé → ${candidatsAtout.length} candidat(s) mariage_atout uniquement`)
    return candidatsAtout
  }

  // Après le premier mariage_Atout : toutes les combinaisons sont accessibles
  const combis: CombinaisonDisponible[] = [
    ...detecterMariages(state, joueurId),
    ...detecterQuinte(state, joueurId),
    // sept_atout : bonus automatique dans appliquerPli(), pas une annonce manuelle
    ...detecterBesigue(state, joueurId),
    ...detecterCarresAtout(state, joueurId),
    ...detecterCarresNormaux(state, joueurId),
  ]

  logger.debug('COMBI', `J${joueurId} : ${combis.length} combinaisons disponibles`,
    combis.map(c => c.nom))
  return combis
}

// ============================================================
// APPLIQUER UNE ANNONCE sur le GameState
// ============================================================

export function appliquerAnnonce(
  state: GameState,
  joueurId: 0 | 1,
  combi: CombinaisonDisponible
): GameState {
  const joueur = state.joueurs[joueurId]
  const annonces = state.annonces ?? []
  const usages = state.usagesCartes ?? []
  let newState = { ...state }

  logger.info('ANNONCE', `J${joueurId} annonce ${combi.nom} (+${combi.points})`, combi.cartesIds)

  // 1. Ajouter à l'historique
  const nouvelleAnnonce: AnnoncePosee = {
    nom: combi.nom,
    points: combi.points,
    cartesIds: combi.cartesIds,
    joueurId,
    mancheNumero: state.mancheNumero,
  }
  newState = { ...newState, annonces: [...annonces, nouvelleAnnonce] }

  // 2. Ajouter les points
  const joueursMaj = [...newState.joueurs] as typeof newState.joueurs
  joueursMaj[joueurId] = {
    ...joueursMaj[joueurId],
    marquePoints: joueursMaj[joueurId].marquePoints + combi.points,
  }

  // 3. Étaler les cartes (déplacer main → cartesEtalees si pas déjà étalées)
  const mainSansEtalees = joueur.main.filter(c => !combi.cartesIds.includes(c.id))
  const dejaEtalees = joueur.cartesEtalees.map(c => c.id)
  const nouvellesEtalees = combi.cartesIds
    .filter(id => !dejaEtalees.includes(id))
    .map(id => {
      const c = joueur.main.find(c => c.id === id) ?? joueur.cartesEtalees.find(c => c.id === id)!
      return { ...c, faceUp: true, etat: 'faceUp' as const }
    })

  joueursMaj[joueurId] = {
    ...joueursMaj[joueurId],
    main: mainSansEtalees,
    cartesEtalees: [...joueur.cartesEtalees, ...nouvellesEtalees],
  }
  newState = { ...newState, joueurs: joueursMaj }

  // 4. Mettre à jour les usages
  const newUsages = [...usages]
  for (const carteId of combi.cartesIds) {
    const existing = newUsages.find(u => u.carteId === carteId)
    if (existing) {
      existing.combinaisonsUtilisees.push(combi.nom)
    } else {
      newUsages.push({ carteId, combinaisonsUtilisees: [combi.nom] })
    }
  }
  newState = { ...newState, usagesCartes: newUsages }

  // 5. Gérer mariage_Atout dynamique
  if (combi.nom === 'mariage_atout') {
    const [roiId, dameId] = combi.cartesIds
    // Définir l'atout si pas encore fait
    if (!newState.couleurAtout) {
      const roi = [...joueursMaj[joueurId].main, ...joueursMaj[joueurId].cartesEtalees]
        .find(c => c.id === roiId) ??
        state.joueurs[joueurId].cartesEtalees.find(c => c.id === roiId)!
      if (roi) {
        newState = { ...newState, couleurAtout: roi.couleur, atoutDefini: true }
        logger.info('ATOUT', `Atout défini : ${roi.couleur} par J${joueurId}`)
      }
    }
    // Enregistrer le mariage_Atout actif
    const mariages = { ...(newState.mariagesAtoutActifs ?? { 0: [], 1: [] }) }
    mariages[joueurId] = [...(mariages[joueurId] ?? []), [roiId, dameId]]
    newState = { ...newState, mariagesAtoutActifs: mariages }
  }

  // 6. Mettre à jour le flag premierBesiguePose
  if (combi.nom === 'besigue' && !state.premierBesiguePose) {
    newState = { ...newState, premierBesiguePose: true }
  }

  return newState
}

// ============================================================
// GÉRER LA CASSURE DU MARIAGE_ATOUT (SF-10.2)
// Appelé quand un joueur joue une carte qui était dans un mariage_Atout actif
// ============================================================

export function gererCassureMariageAtout(
  state: GameState,
  joueurId: 0 | 1,
  carteJoueeId: string
): GameState {
  const mariages = state.mariagesAtoutActifs ?? { 0: [], 1: [] }
  const mariagesJoueur = mariages[joueurId] ?? []

  // Trouver les mariages qui contiennent cette carte
  const mariagesAvecCarte = mariagesJoueur.filter(m => m.includes(carteJoueeId))
  if (mariagesAvecCarte.length === 0) return state

  // Retirer ces mariages de la liste des actifs
  const mariagesRestants = mariagesJoueur.filter(m => !m.includes(carteJoueeId))
  const newMariages = { ...mariages, [joueurId]: mariagesRestants }

  logger.info('ATOUT', `Mariage_Atout cassé pour J${joueurId} en jouant ${carteJoueeId}`)
  return { ...state, mariagesAtoutActifs: newMariages }
}

// ============================================================
// INITIALISER les champs IT-4 dans le GameState
// ============================================================

export function initialiserChampsIT4(state: GameState): GameState {
  return {
    ...state,
    annonces: [],
    usagesCartes: [],
    mariagesAtoutActifs: { 0: [], 1: [] },
  }
}
