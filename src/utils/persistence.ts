// ============================================================
// PERSISTANCE — IT-2
// Sauvegarde / restauration dans localStorage (SF-20)
// ============================================================

import type { GameConfig, GameState, ActionJeu, Sauvegarde } from '../types'
import { logger } from './logger'

const CLE_SAVE   = 'besigue_save'
const CLE_HISTO  = 'besigue_historique'
const VERSION    = '1.0'

// ── Sauvegarde automatique ────────────────────────────────────

export function sauvegarder(
  config: GameConfig,
  state: GameState,
  history: ActionJeu[]
): boolean {
  try {
    const save: Sauvegarde = {
      version: VERSION,
      timestamp: Date.now(),
      config,
      state,
      history,
    }
    localStorage.setItem(CLE_SAVE, JSON.stringify(save))
    logger.debug('SAVE', 'Sauvegarde effectuée', { partieId: state.partieId })
    return true
  } catch (err) {
    logger.error('SAVE', 'Échec sauvegarde', err)
    return false
  }
}

// ── Chargement ────────────────────────────────────────────────

export function chargerSauvegarde(): Sauvegarde | null {
  try {
    const raw = localStorage.getItem(CLE_SAVE)
    if (!raw) return null
    const save = JSON.parse(raw) as Sauvegarde
    if (save.version !== VERSION) {
      logger.warn('SAVE', 'Version sauvegarde incompatible', { version: save.version })
      return null
    }
    logger.info('SAVE', 'Sauvegarde chargée', { partieId: save.state.partieId, timestamp: save.timestamp })
    return save
  } catch (err) {
    logger.error('SAVE', 'Échec chargement sauvegarde', err)
    return null
  }
}

// ── Suppression ───────────────────────────────────────────────

export function supprimerSauvegarde(): void {
  try {
    localStorage.removeItem(CLE_SAVE)
    logger.info('SAVE', 'Sauvegarde supprimée')
  } catch {
    // Silencieux
  }
}

export function sauvegardeExiste(): boolean {
  try {
    return localStorage.getItem(CLE_SAVE) !== null
  } catch {
    return false
  }
}

// ── Historique des parties terminées (SF-20.5) ────────────────

export interface EntreeHistorique {
  partieId: string
  date: number
  vainqueur: string
  scoreJ0: number
  scoreJ1: number
  nomJ0: string
  nomJ1: string
  nbBrisquesJ0: number
  nbBrisquesJ1: number
}

export function ajouterHistorique(entree: EntreeHistorique): void {
  try {
    const raw = localStorage.getItem(CLE_HISTO)
    const histo: EntreeHistorique[] = raw ? JSON.parse(raw) : []
    histo.unshift(entree)
    // Garder les 20 dernières parties
    const truncated = histo.slice(0, 20)
    localStorage.setItem(CLE_HISTO, JSON.stringify(truncated))
    logger.info('HISTO', 'Partie ajoutée à l\'historique', { partieId: entree.partieId })
  } catch (err) {
    logger.error('HISTO', 'Échec ajout historique', err)
  }
}

export function chargerHistorique(): EntreeHistorique[] {
  try {
    const raw = localStorage.getItem(CLE_HISTO)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
