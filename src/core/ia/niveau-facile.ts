// ============================================================
// NIVEAU FACILE — Aléatoire avec comportements débutants
// ============================================================
//
// Trois comportements "d'erreur" réalistes s'ajoutent à l'aléatoire :
//   1. Rate couper le 10 (PROBA_RATER_COUPER10 = 0.33)
//   2. Joue l'atout trop tôt en ouverture (PROBA_ATOUT_PREMATURE = 0.30)
//   3. Joue une brisque imprudemment en ouverture (PROBA_BRISQUE_IMPRUDENTE = 0.20)

import type { Carte, GameState } from '../../types'
import { VALEURS_BRISQUES } from '../../types'
import { logger } from '../../utils/logger'
import {
  PROBA_RATER_COUPER10, PROBA_ATOUT_PREMATURE, PROBA_BRISQUE_IMPRUDENTE,
} from '../ia.config'
import {
  strategieCouper10, strategieAsEtaleesOuEviter,
  strategieGarderAtouts, strategieEtaleesEnReponse,
  strategieOuverturePreAtout,
} from './strategies'

export function iaFacile(candidats: Carte[], state: GameState): Carte {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout

  // Comportement 1 : Couper le 10 (avec risque de rater)
  //
  // Note : `strategieCouper10` reçoit ici un 4e argument `cartesUtiles`
  // volontairement omis — le niveau facile n'a par conception aucune
  // conscience des combinaisons (aucun appel à cartesUtilesAuxCombis
  // dans tout ce fichier, y compris pour les brisques et l'ouverture) ;
  // ajouter une protection isolée à cette seule étape serait incohérent
  // avec son comportement volontairement naïf partout ailleurs.
  if (carteOuverte && carteOuverte.rang === '10') {
    if (Math.random() >= PROBA_RATER_COUPER10) {
      const coupe = strategieCouper10(candidats, carteOuverte, state)
      if (coupe) {
        logger.debug('IA', `Facile — Couper10 → ${coupe.rang}${coupe.couleur}`)
        return coupe
      }
    } else {
      logger.debug('IA', 'Facile — Couper10 RATÉ (comportement débutant)')
    }
  }

  // Comportements 2 et 3 uniquement en ouverture
  if (!carteOuverte) {
    // Comportement 2 : Atout prématuré
    if (couleurAtout && Math.random() < PROBA_ATOUT_PREMATURE) {
      const atouts = candidats.filter(c => !c.estJoker && c.couleur === couleurAtout)
      if (atouts.length > 0) {
        const choix = atouts[Math.floor(Math.random() * atouts.length)]
        logger.debug('IA', `Facile — Atout prématuré → ${choix.rang}${choix.couleur}`)
        return choix
      }
    }

    // Comportement 3 : Brisque imprudente
    if (Math.random() < PROBA_BRISQUE_IMPRUDENTE) {
      const brisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] > 0)
      if (brisques.length > 0) {
        const choix = brisques[Math.floor(Math.random() * brisques.length)]
        logger.debug('IA', `Facile — Brisque imprudente → ${choix.rang}${choix.couleur}`)
        return choix
      }
    }
  }

  // Stratégies communes
  const asEtalees = strategieAsEtaleesOuEviter(candidats, state)
  if (asEtalees) return asEtalees

  const garderAtout = strategieGarderAtouts(candidats, state)
  if (garderAtout) return garderAtout

  const etaleesRep = strategieEtaleesEnReponse(candidats, state)
  if (etaleesRep) return etaleesRep

  const preAtout = strategieOuverturePreAtout(candidats, state)
  if (preAtout) return preAtout

  // Aléatoire pur
  const idx = Math.floor(Math.random() * candidats.length)
  logger.debug('IA', `Facile → ${candidats[idx].rang}${candidats[idx].couleur}`)
  return candidats[idx]
}
