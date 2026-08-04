// ============================================================
// HELPERS IA — Utilitaires partagés par les 3 niveaux
// Fonctions pures sans dépendance vers les niveaux ou stratégies.
// ============================================================

import type { Carte, GameState, Couleur } from '../../types'
import { ORDRE_RANGS, VALEURS_BRISQUES } from '../../types'
import { resoudrePli } from '../pli'
import { cartesProtegeesParCombinaisons } from './tableCombinaisons'

// ── Valeur brisque ────────────────────────────────────────────

export function valeurBrisque(carte: Carte): number {
  return VALEURS_BRISQUES[carte.rang]
}

// ── Sélection par rang ────────────────────────────────────────

export function carteAvecRangMinimal(cartes: Carte[]): Carte {
  return cartes.reduce((min, c) =>
    ORDRE_RANGS[c.rang] < ORDRE_RANGS[min.rang] ? c : min
  )
}

export function carteAvecRangMaximal(cartes: Carte[]): Carte {
  return cartes.reduce((max, c) =>
    ORDRE_RANGS[c.rang] > ORDRE_RANGS[max.rang] ? c : max
  )
}

// ── Candidats gagnants ────────────────────────────────────────

/**
 * Retourne les cartes de `candidats` qui gagnent contre `carteOuverte`
 * selon les règles complètes du pli (Joker, atout, couleur).
 */
export function candidatsGagnants(
  candidats: Carte[],
  carteOuverte: Carte,
  couleurAtout: Couleur | null,
  joueurReponse: 0 | 1
): Carte[] {
  const joueurOuvreur: 0 | 1 = joueurReponse === 0 ? 1 : 0

  return candidats.filter(carteReponse => {
    const [c0, c1] = joueurReponse === 0
      ? [carteReponse, carteOuverte]
      : [carteOuverte, carteReponse]
    const { vainqueur } = resoudrePli(c0, c1, joueurOuvreur, couleurAtout)
    return vainqueur === joueurReponse
  })
}

// ── Protection des combinaisons ───────────────────────────────

/**
 * Retourne un Set des IDs de cartes que l'IA doit préserver car elles
 * restent éligibles à au moins un type de combinaison (mariage, quinte,
 * bésigue, carrés) — cf. tableCombinaisons.ts pour le détail carte par
 * carte et les règles de famille de réutilisation.
 *
 * Délègue à `cartesProtegeesParCombinaisons` (tableCombinaisons.ts),
 * qui consulte réellement `state.usagesCartes` — corrige la faille de
 * l'ancienne implémentation (jamais consultée), qui continuait à
 * protéger indéfiniment une carte déjà épuisée dans TOUS les types
 * auxquels elle pouvait prétendre (ex. un carré déjà annoncé avec ces
 * 4 cartes précises).
 */
export function cartesUtilesAuxCombis(state: GameState, joueurId: 0 | 1): Set<string> {
  return cartesProtegeesParCombinaisons(state, joueurId)
}
