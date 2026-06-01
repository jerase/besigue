// ============================================================
// HOOK useNavigation — Gestion des écrans de l'application
// Responsabilité unique : transitions entre les écrans.
// ============================================================

import { useState, useCallback } from 'react'
import type { EcranApp, GameState } from '../types'

export interface UseNavigationReturn {
  ecran: EcranApp
  setEcran: (ecran: EcranApp) => void
  allerAccueil: () => void
  allerConfig: () => void
  allerPause: () => void
  allerRegles: () => void
  allerTutoriel: () => void
  retourDepuisRegles: () => void
  retourDepuisPause: () => void
}

export function useNavigation(state: GameState | null): UseNavigationReturn {
  const [ecran, setEcran] = useState<EcranApp>('accueil')

  const allerAccueil        = useCallback(() => setEcran('accueil'),  [])
  const allerConfig         = useCallback(() => setEcran('config'),   [])
  const allerPause          = useCallback(() => setEcran('pause'),    [])
  const allerRegles         = useCallback(() => setEcran('regles'),   [])
  const allerTutoriel       = useCallback(() => setEcran('tutoriel'), [])
  const retourDepuisPause   = useCallback(() => setEcran('table'),    [])
  const retourDepuisRegles  = useCallback(() => setEcran(state ? 'table' : 'accueil'), [state])

  return {
    ecran,
    setEcran,
    allerAccueil,
    allerConfig,
    allerPause,
    allerRegles,
    allerTutoriel,
    retourDepuisRegles,
    retourDepuisPause,
  }
}
