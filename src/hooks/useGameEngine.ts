// ============================================================
// HOOK useGameEngine — Orchestrateur principal du jeu
//
// Séquence correcte :
//   1. Jouer une carte → résolution du pli
//   2. Proposer annonce(s) au vainqueur (ou passer)
//   3. Pioche (vainqueur puis adversaire)
//   4. Début du tour suivant
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react'
import type { GameConfig, GameState, ActionJeu, CombinaisonDisponible } from '../types'
import { initialiserPartie, piocher } from '../core/init'
import { jouerCarte, appliquerPli } from '../core/pli'
import { detecterCombinaisonsDisponibles, appliquerAnnonce, gererCassureMariageAtout } from '../core/combinaisons'
import { appliquerFinManche, mancheTerminee, initialiserNouvelleManche } from '../core/finManche'
import type { ResultatManche } from '../core/finManche'
import { choisirCarteIA, delaiSimule, choisirAnnonceIA } from '../core/ia'
import { sauvegarder, chargerSauvegarde, supprimerSauvegarde } from '../utils/persistence'
import { logger } from '../utils/logger'
import { useNavigation } from './useNavigation'

export type PhaseUI =
  | 'attente_joueur'
  | 'attente_annonce'
  | 'attente_ia'
  | 'pli_en_resolution'
  | 'apres_pli'
  | 'pioche'
  | 'phase_finale'
  | 'fin_manche'

export interface UseGameEngineReturn {
  ecran: ReturnType<typeof useNavigation>['ecran']
  config: GameConfig | null
  state: GameState | null
  history: ActionJeu[]
  phaseUI: PhaseUI
  dernierPliVainqueur: (0 | 1) | null
  iaReflechit: boolean
  messageInfo: string
  combisDisponibles: CombinaisonDisponible[]
  peutPasser: boolean
  allerAccueil: () => void
  allerConfig: () => void
  allerPause: () => void
  allerRegles: () => void
  allerTutoriel: () => void
  retourDepuisRegles: () => void
  retourDepuisPause: () => void
  demarrerPartie: (config: GameConfig) => void
  reprendrePartie: () => boolean
  abandonnerPartie: () => void
  resultatManche: ResultatManche | null
  jouerCarteHumain: (carteId: string) => void
  annoncer: (combi: CombinaisonDisponible) => void
  passerAnnonce: () => void
  lancerNouvelleManche: () => void
}

export function useGameEngine(): UseGameEngineReturn {
  const [config, setConfig]                   = useState<GameConfig | null>(null)
  const [state, setState]                     = useState<GameState | null>(null)
  const [history, setHistory]                 = useState<ActionJeu[]>([])
  const [phaseUI, setPhaseUI]                 = useState<PhaseUI>('attente_joueur')
  const [dernierPliVainqueur, setDernierPliVainqueur] = useState<(0 | 1) | null>(null)
  const [iaReflechit, setIaReflechit]         = useState(false)
  const [messageInfo, setMessageInfo]         = useState('')
  const [combisDisponibles, setCombisDisponibles] = useState<CombinaisonDisponible[]>([])
  const [phaseAnnonce, setPhaseAnnonce]       = useState(false)
  const [resultatManche, setResultatManche]   = useState<ResultatManche | null>(null)

  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialiseRef = useRef(false)  // Point 10 : remplace eslint-disable

  const nav = useNavigation(state)

  const clearTimer = () => { if (timerRef.current) clearTimeout(timerRef.current) }

  const sauvegarderEtat = useCallback((cfg: GameConfig, s: GameState, h: ActionJeu[]) => {
    sauvegarder(cfg, s, h)
  }, [])

  // ── Étape 3 : Pioche ─────────────────────────────────────

  const effectuerPioche = useCallback((
    s: GameState, cfg: GameConfig, h: ActionJeu[], vainqueur: 0 | 1
  ) => {
    let newState = s

    if (s.phase === 'libre' && newState.pioche.length > 0) {
      const r1 = piocher(newState, vainqueur)
      newState = r1.state
      const adversaire: 0 | 1 = vainqueur === 0 ? 1 : 0
      if (newState.pioche.length > 0) {
        const r2 = piocher(newState, adversaire)
        newState = r2.state
      }
    }

    // Transition phase finale
    if (newState.pioche.length === 0 && newState.phase === 'libre') {
      const joueursMaj = [...newState.joueurs] as typeof newState.joueurs
      for (const idx of [0, 1] as const) {
        const j = joueursMaj[idx]
        if (j.cartesEtalees.length > 0) {
          joueursMaj[idx] = { ...j, main: [...j.main, ...j.cartesEtalees], cartesEtalees: [] }
          logger.info('ENGINE', `Phase finale — ${j.cartesEtalees.length} carte(s) étalées → main J${idx}`)
        }
      }
      newState = { ...newState, phase: 'finale', joueurs: joueursMaj }
      setMessageInfo('⚡ Phase finale ! Obligation de fournir la couleur.')
      logger.info('ENGINE', 'Phase finale déclenchée')
    }

    setState(newState)
    setHistory(h)
    sauvegarderEtat(cfg, newState, h)

    timerRef.current = setTimeout(() => {
      lancerTourSuivant(newState, cfg, h, vainqueur)
    }, 300)
  }, [sauvegarderEtat])

  // ── Étape 2 : Proposer annonces ──────────────────────────

  const proposerAnnonces = useCallback((
    s: GameState, cfg: GameConfig, h: ActionJeu[], vainqueur: 0 | 1
  ) => {
    if (s.phase === 'finale') {
      effectuerPioche(s, cfg, h, vainqueur)
      return
    }

    if (vainqueur === 0) {
      const combis = detecterCombinaisonsDisponibles(s, 0)
      if (combis.length > 0) {
        setCombisDisponibles(combis)
        setPhaseAnnonce(true)
        setPhaseUI('attente_annonce')
        setMessageInfo('Vous pouvez annoncer une combinaison, puis vous piocherez.')
        return
      }
    } else {
      const combis = detecterCombinaisonsDisponibles(s, 1)
      if (combis.length > 0) {
        const meilleure = choisirAnnonceIA(combis, s, cfg.niveauIA)
        const stateApresAnnonce = appliquerAnnonce(s, 1, meilleure)
        const h2: ActionJeu[] = [...h, { type: 'ANNONCER' as const, joueur: 1 as const, combinaison: meilleure.nom, points: meilleure.points }]
        logger.info('ENGINE', `IA annonce ${meilleure.nom} +${meilleure.points} (${cfg.niveauIA})`)
        timerRef.current = setTimeout(() => {
          effectuerPioche(stateApresAnnonce, cfg, h2, vainqueur)
        }, 600)
        return
      }
    }

    effectuerPioche(s, cfg, h, vainqueur)
  }, [effectuerPioche])

  // ── Étape 1 : Résolution du pli ───────────────────────────

  const resoudrePliComplet = useCallback((s: GameState, cfg: GameConfig, h: ActionJeu[]) => {
    setPhaseUI('pli_en_resolution')

    timerRef.current = setTimeout(() => {
      const newState = appliquerPli(s)
      const vainqueur = newState.dernierVainqueurPli!
      setDernierPliVainqueur(vainqueur)

      const newHistory: ActionJeu[] = [...h, { type: 'REMPORTER_PLI', joueur: vainqueur }]
      logger.info('ENGINE', `Pli résolu → J${vainqueur} remporte`)

      setState(newState)
      setHistory(newHistory)
      sauvegarderEtat(cfg, newState, newHistory)

      timerRef.current = setTimeout(() => {
        setPhaseUI('apres_pli')
        setMessageInfo('')
        proposerAnnonces(newState, cfg, newHistory, vainqueur)
      }, 600)
    }, 400)
  }, [sauvegarderEtat, proposerAnnonces])

  // ── Tour suivant ──────────────────────────────────────────

  const lancerTourSuivant = useCallback((
    s: GameState, cfg: GameConfig, h: ActionJeu[], joueurActif: 0 | 1
  ) => {
    const seuilAtteint = s.joueurs.some(j => j.marquePoints >= cfg.seuilVictoire)
    const finNaturelle = mancheTerminee(s)

    if (seuilAtteint || finNaturelle) {
      const finAnticipee = seuilAtteint && !finNaturelle
      logger.info('ENGINE', seuilAtteint
        ? `Seuil ${cfg.seuilVictoire} pts atteint${finAnticipee ? ' (fin anticipée)' : ''}`
        : 'Fin de manche naturelle')
      const resultat = appliquerFinManche(s, finAnticipee)
      setResultatManche(resultat)
      setState(resultat.state)
      sauvegarderEtat(cfg, resultat.state, h)
      setPhaseUI('fin_manche')
      nav.setEcran('fin')
      return
    }

    if (joueurActif === 0) {
      setPhaseUI('attente_joueur')
      setMessageInfo('Votre tour — Jouez une carte')
    } else {
      // Garde : mains vides → fin de manche forcée
      if (s.joueurs[1].main.length === 0 && s.joueurs[0].main.length === 0) {
        logger.info('ENGINE', 'Mains vides détectées avant tour IA — fin de manche forcée')
        const resultat = appliquerFinManche(s)
        setResultatManche(resultat)
        setState(resultat.state)
        sauvegarderEtat(cfg, resultat.state, h)
        setPhaseUI('fin_manche')
        nav.setEcran('fin')
        return
      }

      setPhaseUI('attente_ia')
      setIaReflechit(true)
      setMessageInfo(`${s.joueurs[1].nom} réfléchit…`)

      const delai = delaiSimule(cfg.niveauIA)
      timerRef.current = setTimeout(() => {
        const carte = choisirCarteIA(s, cfg.niveauIA)
        if (!carte) {
          logger.warn('ENGINE', 'IA sans carte jouable — fin de manche forcée')
          setIaReflechit(false)
          const resultat = appliquerFinManche(s)
          setResultatManche(resultat)
          setState(resultat.state)
          sauvegarderEtat(cfg, resultat.state, h)
          setPhaseUI('fin_manche')
          nav.setEcran('fin')
          return
        }

        logger.info('IA', `IA joue ${carte.rang}${carte.couleur}`)
        const { state: stateJoueIA, ok } = jouerCarte(s, 1, carte.id)
        if (!ok) { logger.error('IA', 'Erreur jouerCarte IA'); setIaReflechit(false); return }
        const stateApres = gererCassureMariageAtout(stateJoueIA, 1, carte.id)

        setIaReflechit(false)
        setState(stateApres)

        const pliComplet = stateApres.pliEnCours.carteJoueur0 !== null &&
          stateApres.pliEnCours.carteJoueur1 !== null

        if (pliComplet) {
          timerRef.current = setTimeout(() => resoudrePliComplet(stateApres, cfg, h), 2000)
        } else {
          setPhaseUI('attente_joueur')
          setMessageInfo('Votre tour — Répondez au pli')
        }
      }, delai)
    }
  }, [resoudrePliComplet, sauvegarderEtat, nav])

  // ── Actions joueur humain ─────────────────────────────────

  const jouerCarteHumain = useCallback((carteId: string) => {
    if (!state || !config) return
    if (phaseUI !== 'attente_joueur') {
      setMessageInfo('Ce n\'est pas votre tour')
      return
    }

    const { state: stateJoue, ok, erreur } = jouerCarte(state, 0, carteId)
    if (!ok) {
      setMessageInfo(erreur ?? 'Action invalide')
      logger.warn('ENGINE', `Carte invalide : ${erreur}`)
      return
    }
    const newState = gererCassureMariageAtout(stateJoue, 0, carteId)
    setMessageInfo('')
    setState(newState)

    const pliComplet = newState.pliEnCours.carteJoueur0 !== null &&
      newState.pliEnCours.carteJoueur1 !== null

    if (pliComplet) {
      resoudrePliComplet(newState, config, history)
    } else {
      lancerTourSuivant(newState, config, history, 1)
    }
  }, [state, config, history, phaseUI, resoudrePliComplet, lancerTourSuivant])

  const annoncer = useCallback((combi: CombinaisonDisponible) => {
    if (!state || !config) return

    const newState = appliquerAnnonce(state, 0, combi)
    const newHistory: ActionJeu[] = [...history, {
      type: 'ANNONCER', joueur: 0, combinaison: combi.nom, points: combi.points,
    }]
    const stateNettoye: GameState = {
      ...newState,
      combisEnAttente: { ...(newState.combisEnAttente ?? { 0: [], 1: [] }), 0: [] },
    }

    setState(stateNettoye)
    setHistory(newHistory)
    sauvegarderEtat(config, stateNettoye, newHistory)
    setCombisDisponibles([])
    setPhaseAnnonce(false)
    setMessageInfo('')

    timerRef.current = setTimeout(() => {
      effectuerPioche(stateNettoye, config, newHistory, stateNettoye.joueurActif as 0 | 1)
    }, 300)
  }, [state, config, history, sauvegarderEtat, effectuerPioche])

  const passerAnnonce = useCallback(() => {
    if (!state || !config) return
    setCombisDisponibles([])
    setPhaseAnnonce(false)
    setMessageInfo('')
    const stateNettoye: GameState = {
      ...state,
      combisEnAttente: { ...(state.combisEnAttente ?? { 0: [], 1: [] }), 0: [] },
    }
    setState(stateNettoye)
    effectuerPioche(stateNettoye, config, history, stateNettoye.joueurActif as 0 | 1)
  }, [state, config, history, effectuerPioche])

  // ── Cycle de vie ──────────────────────────────────────────

  const demarrerPartie = useCallback((cfg: GameConfig) => {
    clearTimer()
    logger.info('ENGINE', 'Démarrage partie', cfg)
    const { state: newState } = initialiserPartie(cfg)
    const h: ActionJeu[] = [{ type: 'DEBUT_MANCHE', mancheNumero: 1 }]
    setConfig(cfg)
    setState(newState)
    setHistory(h)
    setDernierPliVainqueur(null)
    setMessageInfo('')
    sauvegarderEtat(cfg, newState, h)
    nav.setEcran('table')
    timerRef.current = setTimeout(() => lancerTourSuivant(newState, cfg, h, newState.joueurActif), 200)
  }, [sauvegarderEtat, lancerTourSuivant, nav])

  const reprendrePartie = useCallback((): boolean => {
    const save = chargerSauvegarde()
    if (!save) return false
    clearTimer()
    setConfig(save.config)
    setState(save.state)
    setHistory(save.history)
    nav.setEcran('table')
    timerRef.current = setTimeout(() => lancerTourSuivant(save.state, save.config, save.history, save.state.joueurActif), 300)
    return true
  }, [lancerTourSuivant, nav])

  const abandonnerPartie = useCallback(() => {
    clearTimer()
    supprimerSauvegarde()
    setConfig(null)
    setState(null)
    setHistory([])
    setPhaseUI('attente_joueur')
    setIaReflechit(false)
    nav.setEcran('accueil')
  }, [nav])

  const lancerNouvelleManche = useCallback(() => {
    if (!config || !resultatManche) return
    clearTimer()
    const newState = initialiserNouvelleManche(resultatManche.state, config, resultatManche.vainqueurManche)
    const h: ActionJeu[] = [{ type: 'DEBUT_MANCHE', mancheNumero: newState.mancheNumero }]
    setState(newState)
    setHistory(h)
    setResultatManche(null)
    setDernierPliVainqueur(null)
    setMessageInfo('')
    sauvegarderEtat(config, newState, h)
    nav.setEcran('table')
    timerRef.current = setTimeout(() => lancerTourSuivant(newState, config, h, newState.joueurActif), 300)
  }, [config, resultatManche, sauvegarderEtat, lancerTourSuivant, nav])

  // ── Effets ────────────────────────────────────────────────

  // Nettoyage du timer au démontage
  useEffect(() => () => clearTimer(), [])

  // Reprise de partie : si c'est le tour de l'IA au montage.
  // Utilise un ref d'initialisation pour n'exécuter qu'une seule fois
  // sans déclarer de dépendances instables.
  useEffect(() => {
    if (initialiseRef.current) return
    initialiseRef.current = true

    if (state && config && nav.ecran === 'table' && phaseUI === 'attente_joueur' && state.joueurActif === 1) {
      lancerTourSuivant(state, config, history, 1)
    }
  })

  // ── Retour ────────────────────────────────────────────────

  return {
    ecran:               nav.ecran,
    config, state, history,
    phaseUI, dernierPliVainqueur, iaReflechit, messageInfo,
    combisDisponibles,
    peutPasser:          phaseAnnonce,
    allerAccueil:        nav.allerAccueil,
    allerConfig:         nav.allerConfig,
    allerPause:          nav.allerPause,
    allerRegles:         nav.allerRegles,
    allerTutoriel:       nav.allerTutoriel,
    retourDepuisRegles:  nav.retourDepuisRegles,
    retourDepuisPause:   nav.retourDepuisPause,
    demarrerPartie, reprendrePartie, abandonnerPartie,
    resultatManche,
    jouerCarteHumain, annoncer, passerAnnonce,
    lancerNouvelleManche,
  }
}
