// ============================================================
// NIVEAU INTERMÉDIAIRE — Heuristiques améliorées
// ============================================================
//
// Évolutions par rapport au niveau facile :
//   1. Couper l'As adverse avec atout (seul moyen de battre un As)
//   2. Pioche adaptative (safe si > 8, agressif si ≤ 4)
//   3. Sept d'atout en ouverture (pioche > 8 → +10 pts auto)
//   4. Bloquer les mariages adverses (pioche ≤ 4)

import type { Carte, GameState } from '../../types'
import { ORDRE_RANGS, VALEURS_BRISQUES } from '../../types'
import { logger } from '../../utils/logger'
import { SEUIL_PIOCHE_GRANDE, SEUIL_PIOCHE_PETITE } from '../ia.config'
import {
  carteAvecRangMinimal, candidatsGagnants, cartesUtilesAuxCombis, valeurBrisque,
} from './helpers'
import {
  strategieCouper10, strategieAsEtaleesOuEviter,
  strategieGarderAtouts, strategieEtaleesEnReponse,
  strategieOuverturePreAtout,
} from './strategies'

export function iaIntermediaire(candidats: Carte[], state: GameState): Carte {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout
  const piocheRestante = state.pioche.length
  const humain = state.joueurs[0]

  // Couper le 10
  if (carteOuverte) {
    const coupe = strategieCouper10(candidats, carteOuverte, state)
    if (coupe) {
      logger.debug('IA', `Intermédiaire — Couper10 → ${coupe.rang}${coupe.couleur}`)
      return coupe
    }
  }

  // Évolution 1 : Couper l'As adverse avec atout
  if (carteOuverte && carteOuverte.rang === 'A' && couleurAtout) {
    if (carteOuverte.couleur !== couleurAtout) {
      const atoutsGagnants = candidatsGagnants(
        candidats.filter(c => !c.estJoker && c.couleur === couleurAtout),
        carteOuverte, couleurAtout, 1
      )
      if (atoutsGagnants.length > 0) {
        const plusFaible = atoutsGagnants.reduce((min, c) =>
          ORDRE_RANGS[c.rang] < ORDRE_RANGS[min.rang] ? c : min
        )
        logger.debug('IA', `Intermédiaire — Couper As → ${plusFaible.rang}${plusFaible.couleur}`)
        return plusFaible
      }
    }
  }

  // Stratégies communes
  const asEtalees = strategieAsEtaleesOuEviter(candidats, state)
  if (asEtalees) {
    logger.debug('IA', `Intermédiaire — AsÉtalés → ${asEtalees.rang}${asEtalees.couleur}`)
    return asEtalees
  }

  const garderAtout = strategieGarderAtouts(candidats, state)
  if (garderAtout) {
    logger.debug('IA', `Intermédiaire — GarderAtouts → ${garderAtout.rang}${garderAtout.couleur}`)
    return garderAtout
  }

  const etaleesRep = strategieEtaleesEnReponse(candidats, state)
  if (etaleesRep) {
    logger.debug('IA', `Intermédiaire — Étalées-réponse → ${etaleesRep.rang}${etaleesRep.couleur}`)
    return etaleesRep
  }

  const preAtout = strategieOuverturePreAtout(candidats, state)
  if (preAtout) {
    logger.debug('IA', `Intermédiaire — Pré-atout → ${preAtout.rang}${preAtout.couleur}`)
    return preAtout
  }

  const cartesUtiles = cartesUtilesAuxCombis(state, 1)

  // Bloc RÉPONSE
  if (carteOuverte) {
    const brisqueDansPli = valeurBrisque(carteOuverte) > 0

    if (brisqueDansPli) {
      const gagnants = candidatsGagnants(candidats, carteOuverte, couleurAtout, 1)
      if (gagnants.length > 0) {
        // Évolution 2 : mode agressif si pioche petite
        if (piocheRestante <= SEUIL_PIOCHE_PETITE) {
          logger.debug('IA', `Intermédiaire — Agressif (pioche=${piocheRestante}) → gagner brisque`)
          return carteAvecRangMinimal(gagnants)
        }
        const gagnantsNonUtiles = gagnants.filter(c => !cartesUtiles.has(c.id))
        logger.debug('IA', `Intermédiaire — Gagner brisque (pioche=${piocheRestante})`)
        return carteAvecRangMinimal(gagnantsNonUtiles.length > 0 ? gagnantsNonUtiles : gagnants)
      }
    }

    const defausse = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id))
    if (defausse.length > 0) return carteAvecRangMinimal(defausse)

    const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
    return carteAvecRangMinimal(sansBrisques.length > 0 ? sansBrisques : candidats)
  }

  // Bloc OUVERTURE

  // Évolution 3 : sept d'atout si pioche grande
  if (couleurAtout && piocheRestante > SEUIL_PIOCHE_GRANDE) {
    const septAtout = candidats.find(c => c.rang === '7' && c.couleur === couleurAtout && !c.estJoker)
    if (septAtout) {
      logger.debug('IA', `Intermédiaire — Sept d'atout → ${septAtout.rang}${septAtout.couleur}`)
      return septAtout
    }
  }

  // Évolution 4 : bloquer mariages adverses si pioche petite
  if (piocheRestante <= SEUIL_PIOCHE_PETITE) {
    for (const etale of humain.cartesEtalees) {
      if (etale.rang === 'Q') {
        const roi = candidats.find(c => c.rang === 'K' && c.couleur === etale.couleur && !cartesUtiles.has(c.id))
        if (roi) {
          logger.debug('IA', `Intermédiaire — Bloquer mariage → ${roi.rang}${roi.couleur}`)
          return roi
        }
      }
      if (etale.rang === 'K') {
        const dame = candidats.find(c => c.rang === 'Q' && c.couleur === etale.couleur && !cartesUtiles.has(c.id))
        if (dame) {
          logger.debug('IA', `Intermédiaire — Bloquer mariage → ${dame.rang}${dame.couleur}`)
          return dame
        }
      }
    }
  }

  // Ouverture normale
  const sansValeur = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id))
  if (sansValeur.length > 0) return carteAvecRangMinimal(sansValeur)

  const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
  return carteAvecRangMinimal(sansBrisques.length > 0 ? sansBrisques : candidats)
}
