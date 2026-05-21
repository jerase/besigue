// ============================================================
// HOOK useGame — IT-2
// Gestionnaire d'état central de la partie
// ============================================================

import { useState, useCallback } from 'react'
import type { GameConfig, GameState, ActionJeu, EcranApp } from '../types'
import { initialiserPartie } from '../core/init'
import { sauvegarder, chargerSauvegarde, supprimerSauvegarde } from '../utils/persistence'
import { logger } from '../utils/logger'

export interface UseGameReturn {
  ecran: EcranApp
  config: GameConfig | null
  state: GameState | null
  history: ActionJeu[]
  // Navigation
  allerAccueil: () => void
  allerConfig: () => void
  allerTable: () => void
  allerPause: () => void
  allerRegles: () => void
  // Actions
  demarrerPartie: (config: GameConfig) => void
  reprendrePartie: () => boolean
  abandonnerPartie: () => void
  // Dispatch action (pour IT-3+)
  dispatchAction: (action: ActionJeu) => void
}

export function useGame(): UseGameReturn {
  const [ecran, setEcran] = useState<EcranApp>('accueil')
  const [config, setConfig] = useState<GameConfig | null>(null)
  const [state, setState] = useState<GameState | null>(null)
  const [history, setHistory] = useState<ActionJeu[]>([])

  // ── Navigation ──────────────────────────────────────────────

  const allerAccueil = useCallback(() => {
    logger.info('NAV', 'Écran accueil')
    setEcran('accueil')
  }, [])

  const allerConfig = useCallback(() => {
    logger.info('NAV', 'Écran config')
    setEcran('config')
  }, [])

  const allerTable = useCallback(() => {
    logger.info('NAV', 'Écran table')
    setEcran('table')
  }, [])

  const allerPause = useCallback(() => {
    logger.info('NAV', 'Menu pause')
    setEcran('pause')
  }, [])

  const allerRegles = useCallback(() => {
    logger.info('NAV', 'Écran règles')
    setEcran('regles')
  }, [])

  // ── Démarrer une nouvelle partie ────────────────────────────

  const demarrerPartie = useCallback((cfg: GameConfig) => {
    logger.info('GAME', 'Démarrage nouvelle partie', { config: cfg })
    const { state: newState, history: newHistory } = initialiserPartie(cfg)
    setConfig(cfg)
    setState(newState)
    setHistory(newHistory)
    sauvegarder(cfg, newState, newHistory)
    setEcran('table')
  }, [])

  // ── Reprendre une partie sauvegardée ────────────────────────

  const reprendrePartie = useCallback((): boolean => {
    const save = chargerSauvegarde()
    if (!save) {
      logger.warn('GAME', 'Aucune sauvegarde à reprendre')
      return false
    }
    setConfig(save.config)
    setState(save.state)
    setHistory(save.history)
    setEcran('table')
    logger.info('GAME', 'Partie reprise', { partieId: save.state.partieId })
    return true
  }, [])

  // ── Abandonner la partie ────────────────────────────────────

  const abandonnerPartie = useCallback(() => {
    logger.info('GAME', 'Abandon de la partie')
    supprimerSauvegarde()
    setConfig(null)
    setState(null)
    setHistory([])
    setEcran('accueil')
  }, [])

  // ── Dispatch d'action (utilisé par IT-3+) ───────────────────

  const dispatchAction = useCallback((action: ActionJeu) => {
    logger.debug('ACTION', action.type, action)
    setHistory(prev => {
      const newHistory = [...prev, action]
      // Auto-save après chaque action
      if (config && state) {
        sauvegarder(config, state, newHistory)
      }
      return newHistory
    })
  }, [config, state])

  return {
    ecran, config, state, history,
    allerAccueil, allerConfig, allerTable, allerPause, allerRegles,
    demarrerPartie, reprendrePartie, abandonnerPartie,
    dispatchAction,
  }
}
