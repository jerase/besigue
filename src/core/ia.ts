// ============================================================
// MOTEUR IA — IT-6 (amélioré)
// SF-14 : Facile / Intermédiaire / Difficile
// ============================================================

import type { Carte, GameState, NiveauIA, Couleur, CombinaisonDisponible } from '../types'
import { ORDRE_RANGS, VALEURS_BRISQUES } from '../types'
import { cartesJouablesPhaseFinale, resoudrePli } from './pli'
import { detecterCombinaisonsDisponibles } from './combinaisons'
import { logger } from '../utils/logger'

// ============================================================
// Délais de réflexion simulés (SF-14.2)
// ============================================================

export const DELAIS_IA: Record<NiveauIA, [number, number]> = {
  facile:        [500,  1000],
  intermediaire: [1000, 1500],
  difficile:     [1500, 2500],
}

export function delaiSimule(niveau: NiveauIA): number {
  const [min, max] = DELAIS_IA[niveau]
  return Math.floor(Math.random() * (max - min) + min)
}

// ============================================================
// Point d'entrée — choisir la carte que l'IA va jouer
// ============================================================

export function choisirCarteIA(state: GameState, niveau: NiveauIA): Carte | null {
  const ia = state.joueurs[1]
  let candidats = [...ia.main, ...ia.cartesEtalees]

  if (candidats.length === 0) return null

  // En phase finale : filtrer selon les obligations (couleur/coupe)
  if (state.phase === 'finale') {
    const carteOuverte = state.pliEnCours.carteJoueur0
    const jouables = cartesJouablesPhaseFinale(candidats, carteOuverte, state.couleurAtout)
    candidats = jouables.length > 0 ? jouables : candidats
  }

  logger.debug('IA', `Niveau ${niveau}, ${candidats.length} candidats`)

  switch (niveau) {
    case 'facile':        return iaFacile(candidats)
    case 'intermediaire': return iaIntermediaire(candidats, state)
    case 'difficile':     return iaDifficile(candidats, state)
  }
}

// ============================================================
// Choisir quelle annonce faire (partagé entre niveaux)
// ============================================================

export function choisirAnnonceIA(
  combis: CombinaisonDisponible[],
  state: GameState,
  niveau: NiveauIA
): CombinaisonDisponible {
  if (combis.length === 1) return combis[0]

  switch (niveau) {
    case 'facile':
      // Aléatoire
      return combis[Math.floor(Math.random() * combis.length)]

    case 'intermediaire':
      // Prendre la plus rentable en points
      return combis.reduce((a, b) => b.points > a.points ? b : a)

    case 'difficile':
      return choisirAnnonceStrategique(combis, state)
  }
}

// ============================================================
// FACILE — Aléatoire pur (SF-14.1)
// ============================================================

function iaFacile(candidats: Carte[]): Carte {
  const idx = Math.floor(Math.random() * candidats.length)
  logger.debug('IA', `Facile → ${candidats[idx].rang}${candidats[idx].couleur}`)
  return candidats[idx]
}

// ============================================================
// INTERMÉDIAIRE — Heuristique améliorée (IT-6)
// ============================================================

function iaIntermediaire(candidats: Carte[], state: GameState): Carte {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout

  // Identifier les cartes utiles aux combis en main
  const cartesUtiles = cartesUtilesAuxCombis(state, 1)

  if (carteOuverte) {
    const brisqueDansPli = valeurBrisque(carteOuverte) > 0

    if (brisqueDansPli) {
      // Gagner avec la carte la plus faible possible
      const gagnants = candidatsGagnants(candidats, carteOuverte, couleurAtout, 1)
      if (gagnants.length > 0) return carteAvecRangMinimal(gagnants)
    }

    // Pli sans brisque → se défausser intelligemment
    // Priorité : défausser non-brisque, non-utile, rang minimal
    const defausse = candidats
      .filter(c => VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id))
    if (defausse.length > 0) return carteAvecRangMinimal(defausse)

    const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
    return carteAvecRangMinimal(sansBrisques.length > 0 ? sansBrisques : candidats)
  }

  // Ouverture : éviter brisques ET cartes utiles aux combis
  const sansValeur = candidats.filter(c =>
    VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id)
  )
  if (sansValeur.length > 0) return carteAvecRangMinimal(sansValeur)

  const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
  return carteAvecRangMinimal(sansBrisques.length > 0 ? sansBrisques : candidats)
}

// ============================================================
// DIFFICILE — Stratégique (IT-6)
// Comptage des cartes, préservation combis, contrôle atout
// ============================================================

function iaDifficile(candidats: Carte[], state: GameState): Carte {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout
  const ia = state.joueurs[1]
  const humain = state.joueurs[0]

  // Cartes déjà jouées (comptage complet)
  const dejaJouees = new Set([
    ...ia.pileRemportee.map(c => c.id),
    ...humain.pileRemportee.map(c => c.id),
    ...ia.cartesEtalees.map(c => c.id),
    ...humain.cartesEtalees.map(c => c.id),
  ])

  // Cartes utiles aux combis de l'IA
  const cartesUtiles = cartesUtilesAuxCombis(state, 1)

  // Brisques estimées restantes chez l'adversaire
  const brisquesHumain = humain.pileRemportee.filter(c => valeurBrisque(c) > 0).length
  const totalBrisquesJouees = ia.pileRemportee.filter(c => valeurBrisque(c) > 0).length + brisquesHumain
  const brisquesRestantes = 32 - totalBrisquesJouees

  if (carteOuverte) {
    const brisqueDansPli = valeurBrisque(carteOuverte) > 0

    if (brisqueDansPli) {
      // Forcer la victoire si possible, avec la carte minimale
      const gagnants = candidatsGagnants(candidats, carteOuverte, couleurAtout, 1)
      if (gagnants.length > 0) {
        // Préférer ne pas sacrifier une carte utile aux combis
        const gagnantsSansUtiles = gagnants.filter(c => !cartesUtiles.has(c.id))
        return carteAvecRangMinimal(gagnantsSansUtiles.length > 0 ? gagnantsSansUtiles : gagnants)
      }
    }

    // Pli sans brisque : défausse optimale
    const defausse = candidats.filter(c =>
      VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id)
    )
    if (defausse.length > 0) return carteAvecRangMinimal(defausse)

    const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
    if (sansBrisques.length > 0) return carteAvecRangMinimal(sansBrisques)
    return carteAvecRangMinimal(candidats)
  }

  // Ouverture : choisir la meilleure stratégie
  if (couleurAtout) {
    const atoutsFortes = candidats.filter(c =>
      !c.estJoker && c.couleur === couleurAtout &&
      ORDRE_RANGS[c.rang] >= ORDRE_RANGS['10'] &&
      !cartesUtiles.has(c.id)
    )
    // Tirer les brisques adverses si on a des atouts forts et que l'adversaire en a probablement
    if (atoutsFortes.length > 0 && brisquesRestantes > 6) {
      return carteAvecRangMaximal(atoutsFortes)
    }
  }

  // Jouer le 7 d'atout si disponible (bonus +10 automatique)
  if (couleurAtout) {
    const septAtout = candidats.find(c =>
      !c.estJoker && c.rang === '7' && c.couleur === couleurAtout
    )
    if (septAtout && !cartesUtiles.has(septAtout.id)) return septAtout
  }

  // Défaut : défausser non-brisque, non-utile, rang minimal
  const sansValeur = candidats.filter(c =>
    VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id)
  )
  if (sansValeur.length > 0) return carteAvecRangMinimal(sansValeur)

  const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
  return carteAvecRangMinimal(sansBrisques.length > 0 ? sansBrisques : candidats)
}

// ============================================================
// STRATÉGIE D'ANNONCE — Niveau difficile
// ============================================================

function choisirAnnonceStrategique(
  combis: CombinaisonDisponible[],
  state: GameState
): CombinaisonDisponible {
  // Priorités :
  // 1. Mariage_Atout (débloque les autres + définit l'atout)
  // 2. Quinte (250 pts, nécessite le mariage_Atout actif)
  // 3. Carrés atout (points élevés)
  // 4. 4 As (100 pts)
  // 5. Bésigue premier (100 pts)
  // 6. Autres carrés
  // 7. Mariages hors-atout
  // 8. Bésigue suivant (40 pts)

  const priorite: Record<string, number> = {
    mariage_atout:      100,
    quinte:             90,
    '4_as_atout':       85,
    '4_roi_atout':      82,
    '4_dame_atout':     80,
    '4_valet_atout':    78,
    '4_as':             70,
    '4_roi':            60,
    '4_dame':           50,
    '4_valet':          40,
    besigue:            state.premierBesiguePose ? 20 : 65, // 1er bésigue = haute priorité
    mariage_hors_atout: 30,
    sept_atout:         10,
  }

  return combis.reduce((best, combi) => {
    const pBest = priorite[best.nom] ?? best.points
    const pCombi = priorite[combi.nom] ?? combi.points
    return pCombi > pBest ? combi : best
  })
}

// ============================================================
// Helpers — Cartes utiles aux combis de l'IA
// ============================================================

function cartesUtilesAuxCombis(state: GameState, joueurId: 0 | 1): Set<string> {
  const utiles = new Set<string>()
  const ia = state.joueurs[joueurId]
  const toutes = [...ia.main, ...ia.cartesEtalees]
  const couleurAtout = state.couleurAtout

  // Rois et Dames de même couleur → mariage potentiel
  const rois  = toutes.filter(c => !c.estJoker && c.rang === 'K')
  const dames = toutes.filter(c => !c.estJoker && c.rang === 'Q')

  for (const roi of rois) {
    if (dames.some(d => d.couleur === roi.couleur)) {
      utiles.add(roi.id)
      dames.filter(d => d.couleur === roi.couleur).forEach(d => utiles.add(d.id))
    }
  }

  // Dame♠ + Valet♦ → bésigue
  const damesSpades   = toutes.filter(c => !c.estJoker && c.rang === 'Q' && c.couleur === 'spades')
  const valetsDiamonds = toutes.filter(c => !c.estJoker && c.rang === 'J' && c.couleur === 'diamonds')
  if (damesSpades.length > 0 && valetsDiamonds.length > 0) {
    damesSpades.forEach(c => utiles.add(c.id))
    valetsDiamonds.forEach(c => utiles.add(c.id))
  }

  // Cartes d'atout pour quinte (As, 10, Valet atout)
  if (couleurAtout) {
    const asAtout    = toutes.filter(c => !c.estJoker && c.couleur === couleurAtout && c.rang === 'A')
    const dixAtout   = toutes.filter(c => !c.estJoker && c.couleur === couleurAtout && c.rang === '10')
    const valetAtout = toutes.filter(c => !c.estJoker && c.couleur === couleurAtout && c.rang === 'J')
    if (asAtout.length > 0 && dixAtout.length > 0 && valetAtout.length > 0) {
      asAtout.forEach(c => utiles.add(c.id))
      dixAtout.forEach(c => utiles.add(c.id))
      valetAtout.forEach(c => utiles.add(c.id))
    }
  }

  // Rangs proches du carré (3+ cartes du même rang)
  const parRang: Record<string, Carte[]> = {}
  for (const carte of toutes) {
    if (!carte.estJoker) {
      const k = carte.rang
      parRang[k] = parRang[k] ?? []
      parRang[k].push(carte)
    }
  }
  for (const rang of ['A','K','Q','J'] as const) {
    if ((parRang[rang] ?? []).length >= 3) {
      parRang[rang].forEach(c => utiles.add(c.id))
    }
  }

  return utiles
}

// ============================================================
// Helpers — logique de pli
// ============================================================

function valeurBrisque(carte: Carte): number {
  return VALEURS_BRISQUES[carte.rang]
}

/**
 * Retourne les cartes de `candidats` qui gagnent contre `carteOuverte`
 * selon les règles du Joker IT-6 :
 *  - Joker en réponse → perd TOUJOURS (règle 1)
 *  - Carte atout en réponse → gagne sur tout sauf atout plus fort
 *  - Carte normale en réponse → gagne si même couleur + rang supérieur
 */
function candidatsGagnants(
  candidats: Carte[],
  carteOuverte: Carte,
  couleurAtout: Couleur | null,
  joueurReponse: 0 | 1
): Carte[] {
  const joueurOuvreur: 0 | 1 = joueurReponse === 0 ? 1 : 0

  return candidats.filter(carteReponse => {
    // Simuler le pli avec cette carte en réponse
    const [c0, c1] = joueurReponse === 0
      ? [carteReponse, carteOuverte]
      : [carteOuverte, carteReponse]
    const { vainqueur } = resoudrePli(c0, c1, joueurOuvreur, couleurAtout)
    return vainqueur === joueurReponse
  })
}

function carteAvecRangMinimal(cartes: Carte[]): Carte {
  return cartes.reduce((min, c) =>
    ORDRE_RANGS[c.rang] < ORDRE_RANGS[min.rang] ? c : min
  )
}

function carteAvecRangMaximal(cartes: Carte[]): Carte {
  return cartes.reduce((max, c) =>
    ORDRE_RANGS[c.rang] > ORDRE_RANGS[max.rang] ? c : max
  )
}
