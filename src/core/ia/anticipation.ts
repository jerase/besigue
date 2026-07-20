// ============================================================
// ANTICIPATION IA — Objectif de 16 brisques + repli réaliste
// ============================================================
//
// L'IA suit en permanence son propre total de brisques déjà capturées
// (pileRemportee) et vise un minimum de 16 sur 32 (garantit au moins
// l'égalité en fin de manche — jamais la pénalité de perte des brisques).
//
// Si l'objectif devient mathématiquement inatteignable (plus assez de
// brisques non vues pour compenser le retard), l'IA bascule en mode
// « repli » : elle maximise son score global (annonces/combinaisons)
// tout en continuant à capter le plus de brisques possible.
// ============================================================

import type { GameState } from '../../types'
import { compterBrisques } from '../deck'
import { brisquesNonVuesRestantes } from './memoire'

export const OBJECTIF_BRISQUES = 16

export type ModeBrisque = 'atteint' | 'chasse' | 'repli'

export interface EtatObjectifBrisques {
  /** Brisques déjà dans la pile remportée de l'IA. */
  actuelles: number
  /** Objectif fixe (16). */
  objectif: number
  /** Brisques encore nécessaires pour atteindre l'objectif (0 si déjà atteint). */
  manquantes: number
  /** Brisques non vues restantes (encore potentiellement gagnables). */
  brisquesNonVues: number
  /** L'objectif reste-t-il mathématiquement atteignable ? */
  atteignable: boolean
  /** Mode recommandé pour la suite de la manche. */
  mode: ModeBrisque
}

/** Brisques (As + 10) déjà dans la pile remportée de l'IA. */
export function brisquesActuellesIA(state: GameState, joueurId: 0 | 1 = 1): number {
  return compterBrisques(state.joueurs[joueurId].pileRemportee)
}

/**
 * Calcule où en est l'IA par rapport à l'objectif de 16 brisques et
 * le mode de jeu recommandé :
 *   - 'atteint' : déjà ≥ 16, l'IA peut se concentrer sur autre chose (score/combos)
 *   - 'chasse'  : objectif encore atteignable → prioriser la capture de brisques
 *   - 'repli'   : objectif mathématiquement hors de portée → maximiser le score
 *                 global et capter le maximum de brisques possible en best-effort
 */
export function objectifBrisqueAtteignable(state: GameState, joueurId: 0 | 1 = 1): EtatObjectifBrisques {
  const actuelles = brisquesActuellesIA(state, joueurId)
  const manquantes = Math.max(0, OBJECTIF_BRISQUES - actuelles)
  const brisquesNonVues = brisquesNonVuesRestantes(state, joueurId)
  const atteignable = manquantes <= brisquesNonVues

  let mode: ModeBrisque
  if (manquantes === 0) mode = 'atteint'
  else if (atteignable) mode = 'chasse'
  else mode = 'repli'

  return { actuelles, objectif: OBJECTIF_BRISQUES, manquantes, brisquesNonVues, atteignable, mode }
}
