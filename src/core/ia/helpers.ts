// ============================================================
// HELPERS IA — Utilitaires partagés par les 3 niveaux
// Fonctions pures sans dépendance vers les niveaux ou stratégies.
// ============================================================

import type { Carte, GameState, Couleur } from '../../types'
import { ORDRE_RANGS, VALEURS_BRISQUES } from '../../types'
import { resoudrePli } from '../pli'

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

/** Vérifie si le joueur a déjà annoncé un mariage d'atout dans cette manche */
export function aMariageAtoutAnnonce(state: GameState, joueurId: 0 | 1): boolean {
  return state.annonces.some(
    a => a.joueurId === joueurId && a.nom === 'mariage_atout'
  )
}

/** Vérifie si le premier bésigue a été annoncé dans cette manche (par ce joueur) */
export function aPremierBesigueAnnonce(state: GameState, joueurId: 0 | 1): boolean {
  return state.premierBesiguePose && state.annonces.some(
    a => a.joueurId === joueurId && a.nom === 'besigue'
  )
}

/**
 * Retourne un Set des IDs de cartes que l'IA doit préserver car elles
 * participent à des combinaisons potentielles, classées par priorité.
 *
 * Bésigue NON annoncé :
 *   mariage_atout > quinte > 4_as > 1er_besigue > 4_rois > 4_dames > 4_valets
 *
 * Bésigue déjà annoncé :
 *   mariage_atout > quinte > 4_as > 4_rois > 4_dames > 4_valets > besigue_suivant
 */
export function cartesUtilesAuxCombis(state: GameState, joueurId: 0 | 1): Set<string> {
  const utiles = new Set<string>()
  const ia = state.joueurs[joueurId]
  const main    = ia.main.filter(c => !c.estJoker)
  const etalees = ia.cartesEtalees.filter(c => !c.estJoker)
  const toutes  = [...main, ...etalees]
  const couleurAtout = state.couleurAtout

  const mariageAnnonce = aMariageAtoutAnnonce(state, joueurId)
  const besigueAnnonce = aPremierBesigueAnnonce(state, joueurId)

  // Priorité 1 : Mariage d'atout (Roi + Dame)
  if (couleurAtout) {
    const roisAtout  = toutes.filter(c => c.rang === 'K' && c.couleur === couleurAtout)
    const damesAtout = toutes.filter(c => c.rang === 'Q' && c.couleur === couleurAtout)
    if (roisAtout.length > 0 && damesAtout.length > 0) {
      roisAtout.forEach(c => utiles.add(c.id))
      damesAtout.forEach(c => utiles.add(c.id))
    }
  }

  // Priorité 2 : Quinte (pièces manquantes)
  if (couleurAtout && mariageAnnonce) {
    main.filter(c => c.couleur === couleurAtout && c.rang === 'A').forEach(c => utiles.add(c.id))
    main.filter(c => c.couleur === couleurAtout && c.rang === '10').forEach(c => utiles.add(c.id))
    main.filter(c => c.couleur === couleurAtout && c.rang === 'J').forEach(c => utiles.add(c.id))
  } else if (couleurAtout) {
    const asAtout    = toutes.filter(c => c.couleur === couleurAtout && c.rang === 'A')
    const dixAtout   = toutes.filter(c => c.couleur === couleurAtout && c.rang === '10')
    const valetAtout = toutes.filter(c => c.couleur === couleurAtout && c.rang === 'J')
    if (asAtout.length > 0 && dixAtout.length > 0 && valetAtout.length > 0) {
      asAtout.forEach(c => utiles.add(c.id))
      dixAtout.forEach(c => utiles.add(c.id))
      valetAtout.forEach(c => utiles.add(c.id))
    }
  }

  // Priorité 3 : 4 As (3+ en main/étalées)
  const tousAs = toutes.filter(c => c.rang === 'A')
  if (tousAs.length >= 3) tousAs.forEach(c => utiles.add(c.id))

  // Priorité 4 : Premier bésigue (Dame♠ + Valet♦) si non encore annoncé
  if (!besigueAnnonce) {
    const damesSpades    = toutes.filter(c => c.rang === 'Q' && c.couleur === 'spades')
    const valetsDiamonds = toutes.filter(c => c.rang === 'J' && c.couleur === 'diamonds')
    if (damesSpades.length > 0 && valetsDiamonds.length > 0) {
      damesSpades.forEach(c => utiles.add(c.id))
      valetsDiamonds.forEach(c => utiles.add(c.id))
    }
  }

  // Priorité 5 : 4 Rois
  const tousRois = toutes.filter(c => c.rang === 'K')
  if (tousRois.length >= 3) tousRois.forEach(c => utiles.add(c.id))

  // Priorité 6 : 4 Dames
  const toutesDames = toutes.filter(c => c.rang === 'Q')
  if (toutesDames.length >= 3) toutesDames.forEach(c => utiles.add(c.id))

  // Priorité 7 : 4 Valets
  const tousValets = toutes.filter(c => c.rang === 'J')
  if (tousValets.length >= 3) tousValets.forEach(c => utiles.add(c.id))

  // Priorité 8 : Bésigue suivant (si 1er déjà annoncé)
  if (besigueAnnonce) {
    const damesSpades    = toutes.filter(c => c.rang === 'Q' && c.couleur === 'spades')
    const valetsDiamonds = toutes.filter(c => c.rang === 'J' && c.couleur === 'diamonds')
    if (damesSpades.length > 0 && valetsDiamonds.length > 0) {
      damesSpades.forEach(c => utiles.add(c.id))
      valetsDiamonds.forEach(c => utiles.add(c.id))
    }
  }

  // Mariages hors-atout (comportement existant préservé)
  const rois  = toutes.filter(c => c.rang === 'K')
  const dames = toutes.filter(c => c.rang === 'Q')
  for (const roi of rois) {
    if (dames.some(d => d.couleur === roi.couleur)) {
      utiles.add(roi.id)
      dames.filter(d => d.couleur === roi.couleur).forEach(d => utiles.add(d.id))
    }
  }

  return utiles
}
