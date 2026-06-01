// ============================================================
// MODULE IA — Point d'entrée public
// ============================================================
//
// Seul fichier à importer depuis l'extérieur du module ia/.
// Exporte exactement la même API que l'ancien ia.ts.
//
// Importé par :
//   - useGameEngine.ts (choisirCarteIA, choisirAnnonceIA, delaiSimule, DELAIS_IA)
//   - tests (choisirCarteIA, choisirAnnonceIA, SEUIL_*, PROBA_*)

import type { Carte, GameState, NiveauIA, CombinaisonDisponible } from '../../types'
import { logger } from '../../utils/logger'
import { cartesJouablesPhaseFinale } from '../pli'
import { detecterCombinaisonsDisponibles } from '../combinaisons'
import { DELAIS_IA } from '../ia.config'
import { iaFacile }         from './niveau-facile'
import { iaIntermediaire }  from './niveau-intermediaire'
import { iaDifficile }      from './niveau-difficile'
import { cartesUtilesAuxCombis } from './helpers'

// Réexports publics (utilisés par les tests et l'engine)
export { DELAIS_IA } from '../ia.config'
export { SEUIL_PIOCHE_GRANDE, SEUIL_PIOCHE_PETITE, SEUIL_GARDER_ATOUTS } from '../ia.config'
export { PROBA_RATER_COUPER10, PROBA_ATOUT_PREMATURE, PROBA_BRISQUE_IMPRUDENTE } from '../ia.config'
export { PROBA_VARIATION_MIN, PROBA_VARIATION_MAX } from '../ia.config'

// ── Délai simulé ──────────────────────────────────────────────

export function delaiSimule(niveau: NiveauIA): number {
  const [min, max] = DELAIS_IA[niveau]
  return Math.floor(Math.random() * (max - min) + min)
}

// ── Choix de carte ────────────────────────────────────────────

/**
 * Point d'entrée principal : retourne la carte que l'IA joue.
 * Retourne null si aucun candidat n'est disponible.
 */
export function choisirCarteIA(state: GameState, niveau: NiveauIA): Carte | null {
  const ia = state.joueurs[1]
  let candidats: Carte[] = [...ia.main, ...ia.cartesEtalees]

  if (candidats.length === 0) return null

  // Phase finale : filtrer les cartes jouables
  const carteOuverte = state.pliEnCours.carteJoueur0
  if (state.phase === 'finale' && carteOuverte) {
    const jouables = cartesJouablesPhaseFinale(candidats, carteOuverte, state.couleurAtout)
    if (jouables.length > 0) candidats = jouables
  }

  if (candidats.length === 0) return null

  logger.debug('IA', `choisirCarteIA — niveau=${niveau}, candidats=${candidats.length}`)

  switch (niveau) {
    case 'facile':        return iaFacile(candidats, state)
    case 'intermediaire': return iaIntermediaire(candidats, state)
    case 'difficile':     return iaDifficile(candidats, state)
  }
}

// ── Choix d'annonce ───────────────────────────────────────────

/**
 * Retourne la combinaison que l'IA annonce parmi celles disponibles.
 * Retourne null si aucune combinaison n'est disponible.
 */
export function choisirAnnonceIA(
  combis: CombinaisonDisponible[],
  state: GameState,
  niveau: NiveauIA
): CombinaisonDisponible | null {
  if (combis.length === 0) return null

  switch (niveau) {
    case 'facile':
      return combis[Math.floor(Math.random() * combis.length)]

    case 'intermediaire':
      return combis.reduce((a, b) => b.points > a.points ? b : a)

    case 'difficile':
      return choisirAnnonceStrategique(combis, state)
  }
}

// ── Annonce stratégique (niveau difficile) ────────────────────

const PRIORITE_ANNONCE: Record<string, number> = {
  mariage_atout:      100,
  quinte:             90,
  '4_as_atout':       85,
  '4_roi_atout':      82,
  '4_dame_atout':     80,
  '4_valet_atout':    78,
  '4_as':             70,
  besigue:            65, // 1er bésigue (100 pts) — abaissé à 20 si suivants
  '4_roi':            60,
  '4_dame':           50,
  '4_valet':          40,
  mariage_hors_atout: 30,
  sept_atout:         10,
}

function choisirAnnonceStrategique(
  combis: CombinaisonDisponible[],
  state: GameState
): CombinaisonDisponible {
  let meilleureCombi = combis[0]
  let meilleurScore = -1

  for (const combi of combis) {
    let score = PRIORITE_ANNONCE[combi.nom] ?? 0

    // Ajuster le score du bésigue selon s'il est le premier ou non
    if (combi.nom === 'besigue' && state.premierBesiguePose) {
      score = 20
    }

    if (score > meilleurScore) {
      meilleurScore = score
      meilleureCombi = combi
    }
  }

  return meilleureCombi
}

// ── Export de cartesUtilesAuxCombis (utilisé dans les tests) ──
export { cartesUtilesAuxCombis }
