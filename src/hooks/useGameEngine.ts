// ============================================================
// HOOK useGameEngine — IT-4 (séquence annonce corrigée)
// Séquence correcte :
//   1. Jouer une carte → résolution du pli
//   2. Proposer annonce(s) au vainqueur (ou passer)
//   3. Pioche (vainqueur puis adversaire)
//   4. Au début du tour suivant : re-proposer les combis
//      en attente (non encore posées) avant de jouer
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react'
import type { GameConfig, GameState, ActionJeu, EcranApp, CombinaisonDisponible } from '../types'
import { initialiserPartie, piocher } from '../core/init'
import { jouerCarte, appliquerPli } from '../core/pli'
import { detecterCombinaisonsDisponibles, appliquerAnnonce, gererCassureMariageAtout } from '../core/combinaisons'
import { appliquerFinManche, mancheTerminee, initialiserNouvelleManche } from '../core/finManche'
import type { ResultatManche } from '../core/finManche'
import { choisirCarteIA, delaiSimule, choisirAnnonceIA } from '../core/ia'
import { sauvegarder, chargerSauvegarde, supprimerSauvegarde, ajouterHistorique } from '../utils/persistence'
import { logger } from '../utils/logger'

export type PhaseUI =
  | 'attente_joueur'
  | 'attente_annonce'     // humain peut annoncer AVANT de piocher
  | 'attente_ia'
  | 'pli_en_resolution'
  | 'apres_pli'
  | 'pioche'
  | 'phase_finale'
  | 'fin_manche'

export interface UseGameEngineReturn {
  ecran: EcranApp
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
  const [ecran, setEcran]               = useState<EcranApp>('accueil')
  const [config, setConfig]             = useState<GameConfig | null>(null)
  const [state, setState]               = useState<GameState | null>(null)
  const [history, setHistory]           = useState<ActionJeu[]>([])
  const [phaseUI, setPhaseUI]           = useState<PhaseUI>('attente_joueur')
  const [dernierPliVainqueur, setDernierPliVainqueur] = useState<(0 | 1) | null>(null)
  const [iaReflechit, setIaReflechit]   = useState(false)
  const [messageInfo, setMessageInfo]   = useState('')
  const [combisDisponibles, setCombisDisponibles] = useState<CombinaisonDisponible[]>([])
  const [phaseAnnonce, setPhaseAnnonce] = useState(false)
  const [resultatManche, setResultatManche] = useState<ResultatManche | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => { if (timerRef.current) clearTimeout(timerRef.current) }

  const sauvegarderEtat = useCallback((cfg: GameConfig, s: GameState, h: ActionJeu[]) => {
    sauvegarder(cfg, s, h)
  }, [])

  // ── Navigation ────────────────────────────────────────────

  const allerAccueil       = useCallback(() => setEcran('accueil'), [])
  const allerTutoriel      = useCallback(() => setEcran('tutoriel' as any), [])
  const allerConfig        = useCallback(() => setEcran('config'), [])
  const allerPause         = useCallback(() => setEcran('pause'), [])
  const allerRegles        = useCallback(() => setEcran('regles'), [])
  const retourDepuisRegles = useCallback(() => setEcran(state ? 'table' : 'accueil'), [state])
  const retourDepuisPause  = useCallback(() => setEcran('table'), [])

  // ── Étape 3 : Pioche après annonce/passage ────────────────

  const effectuerPioche = useCallback((
    s: GameState,
    cfg: GameConfig,
    h: ActionJeu[],
    vainqueur: 0 | 1
  ) => {
    let newState = s

    // Pioche uniquement en phase libre
    if (s.phase === 'libre' && newState.pioche.length > 0) {
      const r1 = piocher(newState, vainqueur)
      newState = r1.state
      const adversaire: 0 | 1 = vainqueur === 0 ? 1 : 0
      if (newState.pioche.length > 0) {
        const r2 = piocher(newState, adversaire)
        newState = r2.state
      }
    }

    // Vérifier transition phase finale
    if (newState.pioche.length === 0 && newState.phase === 'libre') {
      // Rapatrier les cartes étalées dans la main de chaque joueur :
      // elles redeviennent jouables normalement et ne sont plus visibles
      // par l'adversaire (règle de la phase finale).
      const joueursMaj = [...newState.joueurs] as typeof newState.joueurs
      for (const idx of [0, 1] as const) {
        const j = joueursMaj[idx]
        if (j.cartesEtalees.length > 0) {
          joueursMaj[idx] = {
            ...j,
            main: [...j.main, ...j.cartesEtalees],
            cartesEtalees: [],
          }
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

    // Lancer le tour suivant
    timerRef.current = setTimeout(() => {
      lancerTourSuivant(newState, cfg, h, vainqueur)
    }, 300)
  }, [sauvegarderEtat])

  // ── Étape 2 : Proposer annonces AVANT la pioche ───────────

  const proposerAnnonces = useCallback((
    s: GameState,
    cfg: GameConfig,
    h: ActionJeu[],
    vainqueur: 0 | 1
  ) => {
    // Phase finale : pas d'annonces
    if (s.phase === 'finale') {
      effectuerPioche(s, cfg, h, vainqueur)
      return
    }

    if (vainqueur === 0) {
      // Humain vainqueur : chercher combis disponibles
      const combis = detecterCombinaisonsDisponibles(s, 0)
      if (combis.length > 0) {
        setCombisDisponibles(combis)
        setPhaseAnnonce(true)
        setPhaseUI('attente_annonce')
        setMessageInfo('Vous pouvez annoncer une combinaison, puis vous piocherez.')
        return
      }
    } else {
      // IA vainqueur : annoncer automatiquement si possible
      const combis = detecterCombinaisonsDisponibles(s, 1)
      if (combis.length > 0) {
        const meilleure = choisirAnnonceIA(combis, s, cfg.niveauIA)
        const stateApresAnnonce = appliquerAnnonce(s, 1, meilleure)
        const h2: ActionJeu[] = [...h, { type: 'ANNONCER' as const, joueur: 1 as const, combinaison: meilleure.nom, points: meilleure.points }]
        logger.info('ENGINE', `IA annonce ${meilleure.nom} +${meilleure.points} (${cfg.niveauIA})`)
        // Piocher après l'annonce IA
        timerRef.current = setTimeout(() => {
          effectuerPioche(stateApresAnnonce, cfg, h2, vainqueur)
        }, 600)
        return
      }
    }

    // Pas d'annonce → piocher directement
    effectuerPioche(s, cfg, h, vainqueur)
  }, [effectuerPioche, sauvegarderEtat])

  // ── Étape 1 : Résolution du pli ───────────────────────────

  const resoudrePliComplet = useCallback((s: GameState, cfg: GameConfig, h: ActionJeu[]) => {
    setPhaseUI('pli_en_resolution')

    timerRef.current = setTimeout(() => {
      let newState = appliquerPli(s)
      const vainqueur = newState.dernierVainqueurPli!
      setDernierPliVainqueur(vainqueur)

      const newHistory: ActionJeu[] = [...h, { type: 'REMPORTER_PLI', joueur: vainqueur }]
      logger.info('ENGINE', `Pli résolu → J${vainqueur} remporte`)

      setState(newState)
      setHistory(newHistory)
      sauvegarderEtat(cfg, newState, newHistory)

      // Attendre 600ms puis proposer annonces (AVANT la pioche)
      timerRef.current = setTimeout(() => {
        setPhaseUI('apres_pli')
        setMessageInfo('')
        proposerAnnonces(newState, cfg, newHistory, vainqueur)
      }, 600)
    }, 400)
  }, [sauvegarderEtat, proposerAnnonces])

  // ── Tour suivant — vérifie combis en attente ──────────────

  const lancerTourSuivant = useCallback((
    s: GameState,
    cfg: GameConfig,
    h: ActionJeu[],
    joueurActif: 0 | 1
  ) => {
    // Fin de manche : seuil atteint via annonces ou pioche/mains épuisées
    const seuilAtteint = s.joueurs.some(j => j.marquePoints >= cfg.seuilVictoire)
    const finNaturelle  = mancheTerminee(s)
    if (seuilAtteint || finNaturelle) {
      // finAnticipee = seuil atteint avec cartes encore en main
      // → pas de brisques ni bonus dernier pli (marquePoints suffisent)
      const finAnticipee = seuilAtteint && !finNaturelle
      logger.info('ENGINE', seuilAtteint
        ? `Seuil ${cfg.seuilVictoire} pts atteint${finAnticipee ? ' (fin anticipée)' : ''}`
        : 'Fin de manche naturelle')
      const resultat = appliquerFinManche(s, finAnticipee)
      setResultatManche(resultat)
      setState(resultat.state)
      if (cfg) sauvegarderEtat(cfg, resultat.state, h)
      setPhaseUI('fin_manche')
      setEcran('fin')
      return
    }

    // ── Jouer normalement ─────────────────────────────────────
    if (joueurActif === 0) {
      setPhaseUI('attente_joueur')
      setMessageInfo('Votre tour — Jouez une carte')
    } else {
      // Garde : si la main de l'IA est vide, la manche est terminée
      // (cas phase finale, dernier pli joué — mancheTerminee() peut rater
      // le timing selon l'état passé en paramètre)
      if (s.joueurs[1].main.length === 0 && s.joueurs[0].main.length === 0) {
        logger.info('ENGINE', 'Mains vides détectées avant tour IA — fin de manche forcée')
        const resultat = appliquerFinManche(s)
        setResultatManche(resultat)
        setState(resultat.state)
        if (cfg) sauvegarderEtat(cfg, resultat.state, h)
        setPhaseUI('fin_manche')
        setEcran('fin')
        return
      }

      setPhaseUI('attente_ia')
      setIaReflechit(true)
      setMessageInfo(`${s.joueurs[1].nom} réfléchit…`)

      const delai = delaiSimule(cfg.niveauIA)
      timerRef.current = setTimeout(() => {
        const carte = choisirCarteIA(s, cfg.niveauIA)
        if (!carte) {
          // Sécurité : si l'IA n'a plus de carte à jouer, forcer la fin de manche
          logger.warn('ENGINE', 'IA sans carte jouable — fin de manche forcée')
          setIaReflechit(false)
          const resultat = appliquerFinManche(s)
          setResultatManche(resultat)
          setState(resultat.state)
          if (cfg) sauvegarderEtat(cfg, resultat.state, h)
          setPhaseUI('fin_manche')
          setEcran('fin')
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
  }, [resoudrePliComplet, sauvegarderEtat])

  // ── Jouer une carte (humain) ──────────────────────────────

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

  // ── Annoncer une combinaison (humain) — AVANT la pioche ───

  const annoncer = useCallback((combi: CombinaisonDisponible) => {
    if (!state || !config) return

    const newState = appliquerAnnonce(state, 0, combi)
    const newHistory: ActionJeu[] = [...history, {
      type: 'ANNONCER', joueur: 0, combinaison: combi.nom, points: combi.points,
    }]

    // Règle : une seule combinaison par pli.
    // Vider toutes les combisEnAttente — le joueur a utilisé son droit d'annonce pour ce pli.
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

    // Piocher immédiatement après l'annonce (une seule combi par pli, puis pioche)
    timerRef.current = setTimeout(() => {
      effectuerPioche(stateNettoye, config, newHistory, stateNettoye.joueurActif as 0 | 1)
    }, 300)
  }, [state, config, history, sauvegarderEtat, effectuerPioche])

  // ── Passer l'annonce → piocher ───────────────────────────

  const passerAnnonce = useCallback(() => {
    if (!state || !config) return
    setCombisDisponibles([])
    setPhaseAnnonce(false)
    setMessageInfo('')
    // Règle : une seule combinaison par pli.
    // En passant, le droit d'annonce pour ce pli est perdu — vider les combisEnAttente.
    const stateNettoye: GameState = {
      ...state,
      combisEnAttente: { ...(state.combisEnAttente ?? { 0: [], 1: [] }), 0: [] },
    }
    setState(stateNettoye)
    effectuerPioche(stateNettoye, config, history, stateNettoye.joueurActif as 0 | 1)
  }, [state, config, history, effectuerPioche])

  // ── Démarrer ──────────────────────────────────────────────

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
    setEcran('table')
    timerRef.current = setTimeout(() => lancerTourSuivant(newState, cfg, h, newState.joueurActif), 200)
  }, [sauvegarderEtat, lancerTourSuivant])

  // ── Reprendre ─────────────────────────────────────────────

  const reprendrePartie = useCallback((): boolean => {
    const save = chargerSauvegarde()
    if (!save) return false
    clearTimer()
    setConfig(save.config)
    setState(save.state)
    setHistory(save.history)
    setEcran('table')
    timerRef.current = setTimeout(() => lancerTourSuivant(save.state, save.config, save.history, save.state.joueurActif), 300)
    return true
  }, [lancerTourSuivant])

  // ── Abandonner ────────────────────────────────────────────

  const abandonnerPartie = useCallback(() => {
    clearTimer()
    supprimerSauvegarde()
    setConfig(null)
    setState(null)
    setHistory([])
    setPhaseUI('attente_joueur')
    setIaReflechit(false)
    setEcran('accueil')
  }, [])

  useEffect(() => () => clearTimer(), [])

  useEffect(() => {
    if (state && config && ecran === 'table' && phaseUI === 'attente_joueur' && state.joueurActif === 1) {
      lancerTourSuivant(state, config, history, 1)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Nouvelle manche ──────────────────────────────────────

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
    setEcran('table')
    timerRef.current = setTimeout(() => lancerTourSuivant(newState, config, h, newState.joueurActif), 300)
  }, [config, resultatManche, sauvegarderEtat, lancerTourSuivant])

  return {
    ecran, config, state, history,
    phaseUI, dernierPliVainqueur, iaReflechit, messageInfo,
    combisDisponibles,
    peutPasser: phaseAnnonce,
    allerAccueil, allerConfig, allerPause, allerRegles, allerTutoriel,
    retourDepuisRegles, retourDepuisPause,
    demarrerPartie, reprendrePartie, abandonnerPartie,
    resultatManche,
    jouerCarteHumain, annoncer, passerAnnonce,
    lancerNouvelleManche,
  }
}
