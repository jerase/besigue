// ============================================================
// NIVEAU DIFFICILE — Stratégique avancé
// ============================================================
//
// D.1 — Mémorisation des cartes vues
// D.2 — Gestion du score de partie (modes prudent / agressif)
// D.3 — Phase finale dédiée (couper librement)
// D.4 — Variation de style (anti-prévisibilité 5-10%)

import type { Carte, GameState } from '../../types'
import { ORDRE_RANGS, VALEURS_BRISQUES } from '../../types'
import { logger } from '../../utils/logger'
import { PROBA_VARIATION_MIN, PROBA_VARIATION_MAX } from '../ia.config'
import {
  carteAvecRangMinimal, carteAvecRangMaximal,
  candidatsGagnants, cartesUtilesAuxCombis, valeurBrisque,
} from './helpers'
import {
  strategieCouper10, strategieAsEtaleesOuEviter,
  strategieGarderAtouts, strategieEtaleesEnReponse,
  strategieOuverturePreAtout,
} from './strategies'

/** Retourne la 2e meilleure carte selon une probabilité aléatoire */
function appliquerVariation(cartes: Carte[]): Carte | null {
  if (cartes.length < 2) return null
  const proba = PROBA_VARIATION_MIN + Math.random() * (PROBA_VARIATION_MAX - PROBA_VARIATION_MIN)
  if (Math.random() < proba) {
    logger.debug('IA', 'Difficile — Variation de style → 2e meilleure carte')
    return cartes[1]
  }
  return null
}

export function iaDifficile(candidats: Carte[], state: GameState): Carte {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout
  const ia = state.joueurs[1]
  const humain = state.joueurs[0]
  const piocheRestante = state.pioche.length
  const [manchesIA, manchesHumain] = state.compteurManches ?? [0, 0]

  // D.2 : Déterminer le mode de jeu
  const modeAgressif = manchesHumain >= 3 && manchesIA === 0
  const modePrudent  = manchesIA >= 3 && manchesHumain === 0
  logger.debug('IA', `Difficile — mode: ${modeAgressif ? 'AGRESSIF' : modePrudent ? 'PRUDENT' : 'NORMAL'}`)

  // Stratégies communes
  const asEtalees = strategieAsEtaleesOuEviter(candidats, state)
  if (asEtalees) {
    logger.debug('IA', `Difficile — AsÉtalés → ${asEtalees.rang}${asEtalees.couleur}`)
    return asEtalees
  }

  const garderAtout = strategieGarderAtouts(candidats, state)
  if (garderAtout) {
    logger.debug('IA', `Difficile — GarderAtouts → ${garderAtout.rang}${garderAtout.couleur}`)
    return garderAtout
  }

  const etaleesRep = strategieEtaleesEnReponse(candidats, state)
  if (etaleesRep) {
    logger.debug('IA', `Difficile — Étalées-réponse → ${etaleesRep.rang}${etaleesRep.couleur}`)
    return etaleesRep
  }

  const preAtout = strategieOuverturePreAtout(candidats, state)
  if (preAtout) {
    logger.debug('IA', `Difficile — Pré-atout → ${preAtout.rang}${preAtout.couleur}`)
    return preAtout
  }

  // D.1 : Cartes vues (mémorisation)
  const cartesVues = new Set<string>([
    ...ia.pileRemportee.map(c => c.id),
    ...humain.pileRemportee.map(c => c.id),
    ...(carteOuverte ? [carteOuverte.id] : []),
  ])

  const cartesUtiles = cartesUtilesAuxCombis(state, 1)

  // Brisques restantes estimées
  const brisquesVues = [...cartesVues].filter(id => {
    const all = [...ia.pileRemportee, ...humain.pileRemportee]
    return all.some(c => c.id === id && valeurBrisque(c) > 0)
  }).length
  const brisquesRestantes = 32 - brisquesVues

  const estPhaseFinale = piocheRestante === 0

  // Couper le 10
  if (carteOuverte) {
    const coupe = strategieCouper10(candidats, carteOuverte, state)
    if (coupe) {
      logger.debug('IA', `Difficile — Couper10 → ${coupe.rang}${coupe.couleur}`)
      return coupe
    }
  }

  // Bloc RÉPONSE
  if (carteOuverte) {
    const brisqueDansPli = valeurBrisque(carteOuverte) > 0

    if (brisqueDansPli) {
      const gagnants = candidatsGagnants(candidats, carteOuverte, couleurAtout, 1)

      if (gagnants.length > 0) {
        // D.3 : Phase finale → couper librement
        if (estPhaseFinale) {
          logger.debug('IA', 'Difficile — Phase finale : couper librement')
          const nonUtiles = gagnants.filter(c => !cartesUtiles.has(c.id))
          const meilleur = carteAvecRangMinimal(nonUtiles.length > 0 ? nonUtiles : gagnants)
          const tries = [...gagnants].sort((a, b) => ORDRE_RANGS[a.rang] - ORDRE_RANGS[b.rang])
          const variation = appliquerVariation(tries)
          return (modePrudent || !variation) ? meilleur : variation!
        }

        // D.2 : Mode agressif
        if (modeAgressif) {
          logger.debug('IA', 'Difficile — Mode AGRESSIF : gagner la brisque')
          const choix = carteAvecRangMinimal(gagnants)
          const tries = [...gagnants].sort((a, b) => ORDRE_RANGS[a.rang] - ORDRE_RANGS[b.rang])
          return appliquerVariation(tries) ?? choix
        }

        const gagnantsSansUtiles = gagnants.filter(c => !cartesUtiles.has(c.id))

        // D.2 : Mode prudent → ne pas sacrifier une carte utile
        if (modePrudent && gagnantsSansUtiles.length === 0) {
          logger.debug('IA', 'Difficile — Mode PRUDENT : laisser passer la brisque')
          const defausse = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id))
          const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
          return carteAvecRangMinimal(defausse.length > 0 ? defausse : sansBrisques.length > 0 ? sansBrisques : candidats)
        }

        const meilleur = carteAvecRangMinimal(gagnantsSansUtiles.length > 0 ? gagnantsSansUtiles : gagnants)
        // D.4 : Variation (mode normal uniquement)
        if (!modePrudent && !modeAgressif) {
          const tries = [...gagnants].sort((a, b) => ORDRE_RANGS[a.rang] - ORDRE_RANGS[b.rang])
          const variation = appliquerVariation(tries)
          if (variation) return variation
        }
        return meilleur
      }
    }

    // Défausse optimale
    const defausse = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id))
    if (defausse.length > 0) return carteAvecRangMinimal(defausse)

    const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
    if (sansBrisques.length > 0) return carteAvecRangMinimal(sansBrisques)
    return carteAvecRangMinimal(candidats)
  }

  // Bloc OUVERTURE

  // D.2 : Mode prudent → carte minimale
  if (modePrudent) {
    logger.debug('IA', 'Difficile — Mode PRUDENT ouverture : carte minimale')
    const sansValeur = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id))
    const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
    return carteAvecRangMinimal(sansValeur.length > 0 ? sansValeur : sansBrisques.length > 0 ? sansBrisques : candidats)
  }

  // D.2 : Mode agressif → atout fort
  if (modeAgressif && couleurAtout) {
    const atoutsFortes = candidats.filter(c =>
      !c.estJoker && c.couleur === couleurAtout && ORDRE_RANGS[c.rang] >= ORDRE_RANGS['10']
    )
    if (atoutsFortes.length > 0) {
      logger.debug('IA', 'Difficile — Mode AGRESSIF ouverture : atout fort')
      return carteAvecRangMaximal(atoutsFortes)
    }
  }

  // Contrôle atout si brisques restantes élevées
  if (couleurAtout) {
    const atoutsFortes = candidats.filter(c =>
      !c.estJoker && c.couleur === couleurAtout &&
      ORDRE_RANGS[c.rang] >= ORDRE_RANGS['10'] && !cartesUtiles.has(c.id)
    )
    if (atoutsFortes.length > 0 && brisquesRestantes > 6) {
      const choix = carteAvecRangMaximal(atoutsFortes)
      const tries = [...atoutsFortes].sort((a, b) => ORDRE_RANGS[b.rang] - ORDRE_RANGS[a.rang])
      return appliquerVariation(tries) ?? choix
    }
  }

  // Sept d'atout (+10 pts auto)
  if (couleurAtout) {
    const septAtout = candidats.find(c => !c.estJoker && c.rang === '7' && c.couleur === couleurAtout)
    if (septAtout && !cartesUtiles.has(septAtout.id)) return septAtout
  }

  // Défaut : défausser non-brisque, non-utile, rang minimal
  const sansValeur = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id))
  if (sansValeur.length > 0) return carteAvecRangMinimal(sansValeur)

  const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
  return carteAvecRangMinimal(sansBrisques.length > 0 ? sansBrisques : candidats)
}
