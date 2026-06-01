// ============================================================
// STRATÉGIES COMMUNES — Appliquées par les 3 niveaux
// Chaque fonction retourne une carte ou null (→ fallback niveau).
// ============================================================

import type { Carte, GameState } from '../../types'
import { ORDRE_RANGS, VALEURS_BRISQUES } from '../../types'
import { logger } from '../../utils/logger'
import {
  SEUIL_PIOCHE_GRANDE, SEUIL_PIOCHE_PETITE, SEUIL_GARDER_ATOUTS,
} from '../ia.config'
import { carteAvecRangMinimal, candidatsGagnants } from './helpers'

// ── Couper le 10 ──────────────────────────────────────────────

/**
 * Quand le joueur pose un 10, tente de trouver la meilleure réponse.
 *
 * Cas B (10 d'atout) :
 *   1. Plusieurs As d'atout → jouer l'un d'eux
 *   2. As d'atout unique + pioche ≤ 2 → jouer cet As
 *
 * Cas A (10 non-atout) :
 *   1. As étalé de même couleur → le jouer
 *   2. As en main de même couleur → le jouer
 *   3. Atout gagnant le plus faible → le jouer
 */
export function strategieCouper10(
  candidats: Carte[],
  carteOuverte: Carte,
  state: GameState
): Carte | null {
  if (carteOuverte.rang !== '10') return null

  const couleurAtout = state.couleurAtout
  const ia = state.joueurs[1]
  const estAtout = couleurAtout !== null && carteOuverte.couleur === couleurAtout
  const piocheRestante = state.pioche.length

  if (estAtout && couleurAtout) {
    const asAtout = candidats.filter(
      c => !c.estJoker && c.rang === 'A' && c.couleur === couleurAtout
    )
    if (asAtout.length > 1) {
      logger.debug('IA', `Couper10-atout: plusieurs As d'atout → jouer un As atout`)
      return asAtout[0]
    }
    if (asAtout.length === 1 && piocheRestante <= 2) {
      logger.debug('IA', `Couper10-atout: As unique + pioche=${piocheRestante} → jouer As atout`)
      return asAtout[0]
    }
    return null
  }

  const couleur10 = carteOuverte.couleur

  // As étalé de même couleur
  const asEtalees = ia.cartesEtalees.filter(
    c => !c.estJoker && c.rang === 'A' && c.couleur === couleur10
  )
  if (asEtalees.length > 0) {
    const asJouable = candidats.find(c => c.id === asEtalees[0].id)
    if (asJouable) {
      logger.debug('IA', `Couper10: As ${couleur10} depuis étalées → ${asJouable.id}`)
      return asJouable
    }
  }

  // As en main de même couleur
  const asMain = ia.main.filter(
    c => !c.estJoker && c.rang === 'A' && c.couleur === couleur10
  )
  const asMainJouable = asMain.find(c => candidats.some(cand => cand.id === c.id))
  if (asMainJouable) {
    logger.debug('IA', `Couper10: As ${couleur10} depuis main → ${asMainJouable.id}`)
    return asMainJouable
  }

  // Atout gagnant le plus faible
  if (couleurAtout) {
    const atoutsGagnants = candidatsGagnants(
      candidats.filter(c => !c.estJoker && c.couleur === couleurAtout),
      carteOuverte,
      couleurAtout,
      1
    )
    if (atoutsGagnants.length > 0) {
      const plusFaible = atoutsGagnants.reduce((min, c) =>
        ORDRE_RANGS[c.rang] < ORDRE_RANGS[min.rang] ? c : min
      )
      logger.debug('IA', `Couper10: atout gagnant le plus faible → ${plusFaible.rang}${plusFaible.couleur}`)
      return plusFaible
    }
  }

  return null
}

// ── As étalés ou éviter le pli ───────────────────────────────

/**
 * Carte adverse non-atout ET non-brisque :
 *   Cas 1 — As étalé non-atout gagnant → le jouer (étalées > main)
 *   Cas 2 — Pas d'As étalé gagnant → 9/8/7 pour éviter le pli
 */
export function strategieAsEtaleesOuEviter(
  candidats: Carte[],
  state: GameState
): Carte | null {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout

  if (!carteOuverte) return null
  if (carteOuverte.rang === 'A' || carteOuverte.rang === '10') return null
  if (couleurAtout && carteOuverte.couleur === couleurAtout) return null

  const etaleesIA = state.joueurs[1].cartesEtalees

  const asEtalesNonAtout = etaleesIA.filter(e =>
    !e.estJoker &&
    e.rang === 'A' &&
    (!couleurAtout || e.couleur !== couleurAtout) &&
    candidats.some(cand => cand.id === e.id)
  )

  if (asEtalesNonAtout.length > 0) {
    const asGagnants = candidatsGagnants(asEtalesNonAtout, carteOuverte, couleurAtout, 1)
    if (asGagnants.length > 0) {
      logger.debug('IA', `AsÉtalés — As étalé gagnant → ${asGagnants[0].rang}${asGagnants[0].couleur}`)
      return asGagnants[0]
    }
  }

  const RANGS_FAIBLES: Carte['rang'][] = ['9', '8', '7']
  const cartesFaibles = candidats.filter(c => !c.estJoker && RANGS_FAIBLES.includes(c.rang))
  if (cartesFaibles.length > 0) {
    const choix = carteAvecRangMinimal(cartesFaibles)
    logger.debug('IA', `AsÉtalés — éviter le pli → ${choix.rang}${choix.couleur}`)
    return choix
  }

  return null
}

// ── Garder les atouts ─────────────────────────────────────────

/**
 * Évite de gaspiller les atouts :
 *   - En réponse ordinaire (non brisque) → jouer non-atout
 *   - En ouverture → toujours non-atout si possible
 *   - Exception : si la carte adverse est une brisque (As/10) → laisser passer
 */
export function strategieGarderAtouts(
  candidats: Carte[],
  state: GameState
): Carte | null {
  const couleurAtout = state.couleurAtout
  if (!couleurAtout) return null

  const carteOuverte = state.pliEnCours.carteJoueur0
  const piocheRestante = state.pioche.length

  if (carteOuverte) {
    if (carteOuverte.rang === 'A' || carteOuverte.rang === '10') return null

    const sansAtout = candidats.filter(c => !c.estJoker && c.couleur !== couleurAtout)
    if (sansAtout.length > 0) {
      const choix = carteAvecRangMinimal(sansAtout)
      logger.debug('IA', `GarderAtouts-réponse — non-atout → ${choix.rang}${choix.couleur}`)
      return choix
    }
    return null
  }

  const sansAtout = candidats.filter(c => !c.estJoker && c.couleur !== couleurAtout)
  if (sansAtout.length > 0) {
    const choix = carteAvecRangMinimal(sansAtout)
    logger.debug('IA', `GarderAtouts-ouverture (pioche=${piocheRestante}) — non-atout → ${choix.rang}${choix.couleur}`)
    return choix
  }

  return null
}

// ── Étalées en réponse ────────────────────────────────────────

/**
 * En réponse à une carte adverse non-atout, préférer jouer une carte
 * étalée non-atout gagnante plutôt qu'une carte en main.
 *   Priorité 1 : As étalé de même couleur
 *   Priorité 2 : toute autre étalée gagnante (rang minimal)
 */
export function strategieEtaleesEnReponse(
  candidats: Carte[],
  state: GameState
): Carte | null {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout

  if (!carteOuverte) return null
  if (couleurAtout && carteOuverte.couleur === couleurAtout) return null

  const etaleesIA = state.joueurs[1].cartesEtalees

  const etaleesDisponibles = etaleesIA.filter(e =>
    !e.estJoker &&
    (!couleurAtout || e.couleur !== couleurAtout) &&
    candidats.some(cand => cand.id === e.id)
  )
  if (etaleesDisponibles.length === 0) return null

  const etaleesGagnantes = candidatsGagnants(etaleesDisponibles, carteOuverte, couleurAtout, 1)
  if (etaleesGagnantes.length === 0) return null

  const asMemeCouleur = etaleesGagnantes.filter(
    c => c.rang === 'A' && c.couleur === carteOuverte.couleur
  )
  if (asMemeCouleur.length > 0) {
    logger.debug('IA', `Étalées-réponse — As étalé même couleur → ${asMemeCouleur[0].rang}${asMemeCouleur[0].couleur}`)
    return asMemeCouleur[0]
  }

  const choix = carteAvecRangMinimal(etaleesGagnantes)
  logger.debug('IA', `Étalées-réponse — étalée gagnante → ${choix.rang}${choix.couleur}`)
  return choix
}

// ── Ouverture pré-atout ───────────────────────────────────────

/**
 * En ouverture avant que l'atout soit défini :
 *   Priorité 1 : rangs faibles 9/8/7
 *   Priorité 2 : doublons (même rang, 2+ exemplaires)
 *   Priorité 3 : éviter les Dames/Rois uniques (mariage potentiel)
 */
export function strategieOuverturePreAtout(
  candidats: Carte[],
  state: GameState
): Carte | null {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout

  if (carteOuverte !== null) return null
  if (couleurAtout !== null) return null

  const RANGS_FAIBLES: Carte['rang'][] = ['9', '8', '7']
  const cartesFaibles = candidats.filter(c => !c.estJoker && RANGS_FAIBLES.includes(c.rang))
  if (cartesFaibles.length > 0) {
    const choix = carteAvecRangMinimal(cartesFaibles)
    logger.debug('IA', `Pré-atout — carte faible → ${choix.rang}${choix.couleur}`)
    return choix
  }

  const rangsEnMain: Record<string, Carte[]> = {}
  for (const carte of candidats) {
    if (!carte.estJoker) {
      const key = carte.rang
      if (!rangsEnMain[key]) rangsEnMain[key] = []
      rangsEnMain[key].push(carte)
    }
  }

  const doublons = Object.values(rangsEnMain).filter(g => g.length >= 2).flat()
  if (doublons.length > 0) {
    const choix = carteAvecRangMinimal(doublons)
    logger.debug('IA', `Pré-atout — doublon → ${choix.rang}${choix.couleur}`)
    return choix
  }

  const RANGS_MARIAGE: Carte['rang'][] = ['Q', 'K']
  const rangsDupliques = new Set(
    Object.entries(rangsEnMain)
      .filter(([, groupe]) => groupe.length >= 2)
      .map(([rang]) => rang)
  )
  const sansMariageUniques = candidats.filter(
    c => !c.estJoker && !(RANGS_MARIAGE.includes(c.rang) && !rangsDupliques.has(c.rang))
  )
  if (sansMariageUniques.length > 0) {
    const choix = carteAvecRangMinimal(sansMariageUniques)
    logger.debug('IA', `Pré-atout — éviter Dame/Roi unique → ${choix.rang}${choix.couleur}`)
    return choix
  }

  return null
}

// ── Ré-exports des constantes utiles aux niveaux ──────────────
export { SEUIL_PIOCHE_GRANDE, SEUIL_PIOCHE_PETITE, SEUIL_GARDER_ATOUTS }

// ── Ré-export VALEURS_BRISQUES pour les niveaux ───────────────
export { VALEURS_BRISQUES }
