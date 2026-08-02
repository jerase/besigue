// ============================================================
// NIVEAU INTERMÉDIAIRE — Heuristiques améliorées
// ============================================================
//
// A/B — Règles tactiques mémorisation + anticipation (priorité absolue,
//        avant toute la cascade existante — a.1→a.4, b.1→b.2), version
//        allégée : pas de filtrage combinaison-par-combinaison dédié
//        (cartesUtilesAuxCombis en bénéficie déjà globalement, cf. Phase 2)
//
// Évolutions par rapport au niveau facile :
//   1. Couper l'As adverse avec atout (seul moyen de battre un As)
//   2. Seuils de pioche remplacés par la mémorisation (brisques non vues)
//      quand IA_MEMOIRE_AVANCEE.intermediaire est actif
//   3. Sept d'atout en ouverture (brisques non vues encore nombreuses → sûr)
//   4. Bloquer les mariages adverses (brisques non vues peu nombreuses)

import type { Carte, GameState } from '../../types'
import { ORDRE_RANGS, VALEURS_BRISQUES } from '../../types'
import { logger } from '../../utils/logger'
import {
  SEUIL_PIOCHE_GRANDE, SEUIL_PIOCHE_PETITE,
  SEUIL_BRISQUES_NON_VUES_PETIT, SEUIL_BRISQUES_NON_VUES_GRAND,
  IA_MEMOIRE_AVANCEE,
} from '../ia.config'
import {
  carteAvecRangMinimal, candidatsGagnants, cartesUtilesAuxCombis, valeurBrisque,
} from './helpers'
import {
  strategieCouper10, strategieAsEtaleesOuEviter,
  strategieGarderAtouts, strategieEtaleesEnReponse,
  strategieOuverturePreAtout,
} from './strategies'
import {
  strategieBrisqueGagnante, strategieOuvrirAvecAs,
  strategieGagnerPourMariage, strategieOuvrirJokerSansMariage,
  strategieOuvrirCouleurEpuisee, strategieEviterAsEtalesAdverse,
} from './strategies-avancees'
import { brisquesNonVuesRestantes } from './memoire'

export function iaIntermediaire(candidats: Carte[], state: GameState): Carte {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout
  const piocheRestante = state.pioche.length
  const humain = state.joueurs[0]

  // ── Règles tactiques A/B — priorité absolue sur toute la cascade ──
  if (IA_MEMOIRE_AVANCEE.intermediaire) {
    const brisqueGagnante = strategieBrisqueGagnante(candidats, state) // a.1 / b.1
    if (brisqueGagnante) {
      logger.debug('IA', `Intermédiaire — [A/B] BrisqueGagnante → ${brisqueGagnante.rang}${brisqueGagnante.couleur}`)
      return brisqueGagnante
    }

    const ouvrirAs = strategieOuvrirAvecAs(candidats, state) // a.2 / a.3
    if (ouvrirAs) {
      logger.debug('IA', `Intermédiaire — [A/B] OuvrirAvecAs → ${ouvrirAs.rang}${ouvrirAs.couleur}`)
      return ouvrirAs
    }

    const gagnerMariage = strategieGagnerPourMariage(candidats, state) // a.3 (suite)
    if (gagnerMariage) {
      logger.debug('IA', `Intermédiaire — [A/B] GagnerPourMariage → ${gagnerMariage.rang}${gagnerMariage.couleur}`)
      return gagnerMariage
    }

    const ouvrirJoker = strategieOuvrirJokerSansMariage(candidats, state) // a.4
    if (ouvrirJoker) {
      logger.debug('IA', `Intermédiaire — [A/B] OuvrirJokerSansMariage → ${ouvrirJoker.rang}${ouvrirJoker.couleur}`)
      return ouvrirJoker
    }

    // Éviter les As étalés non-atout de l'humain — information CERTAINE
    // (cartes visibles), donc prioritaire sur l'estimation probabiliste
    // de OuvrirCouleurÉpuisée (b.2) ci-dessous, qui sinon capterait
    // systématiquement tout choix d'ouverture non-atout avant d'y arriver.
    const eviterAsEtales = strategieEviterAsEtalesAdverse(candidats, state, cartesUtilesAuxCombis(state, 1))
    if (eviterAsEtales) {
      logger.debug('IA', `Intermédiaire — ÉviterAsÉtalésAdverse → ${eviterAsEtales.rang}${eviterAsEtales.couleur}`)
      return eviterAsEtales
    }

    const ouvrirCouleurEpuisee = strategieOuvrirCouleurEpuisee(candidats, state) // b.2
    if (ouvrirCouleurEpuisee) {
      logger.debug('IA', `Intermédiaire — [A/B] OuvrirCouleurÉpuisée → ${ouvrirCouleurEpuisee.rang}${ouvrirCouleurEpuisee.couleur}`)
      return ouvrirCouleurEpuisee
    }
  }

  // Mémorisation (allégée) : brisques non vues restantes, remplace les
  // seuils fixes de pioche pour les évolutions 2/3/4 quand actif
  const brisquesNonVues = IA_MEMOIRE_AVANCEE.intermediaire ? brisquesNonVuesRestantes(state, 1) : null
  const modeAgressifBrisques = brisquesNonVues !== null
    ? brisquesNonVues <= SEUIL_BRISQUES_NON_VUES_PETIT
    : piocheRestante <= SEUIL_PIOCHE_PETITE
  const modeSurBrisques = brisquesNonVues !== null
    ? brisquesNonVues >= SEUIL_BRISQUES_NON_VUES_GRAND
    : piocheRestante > SEUIL_PIOCHE_GRANDE
  logger.debug(
    'IA',
    `Intermédiaire — pioche=${piocheRestante}` +
    (brisquesNonVues !== null ? ` | brisques non vues=${brisquesNonVues}` : '') +
    ` | agressif=${modeAgressifBrisques} | sûr=${modeSurBrisques}`
  )

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
        // Évolution 2 : mode agressif si peu de brisques inconnues restantes (ou pioche petite en repli)
        if (modeAgressifBrisques) {
          logger.debug('IA', `Intermédiaire — Agressif → gagner brisque`)
          return carteAvecRangMinimal(gagnants)
        }
        const gagnantsNonUtiles = gagnants.filter(c => !cartesUtiles.has(c.id))
        logger.debug('IA', `Intermédiaire — Gagner brisque`)
        return carteAvecRangMinimal(gagnantsNonUtiles.length > 0 ? gagnantsNonUtiles : gagnants)
      }
    }

    const defausse = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id))
    if (defausse.length > 0) return carteAvecRangMinimal(defausse)

    const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
    return carteAvecRangMinimal(sansBrisques.length > 0 ? sansBrisques : candidats)
  }

  // Bloc OUVERTURE

  // Évolution 3 : sept d'atout si beaucoup de brisques inconnues restantes (ou pioche grande en repli)
  if (couleurAtout && modeSurBrisques) {
    const septAtout = candidats.find(c => c.rang === '7' && c.couleur === couleurAtout && !c.estJoker)
    if (septAtout) {
      logger.debug('IA', `Intermédiaire — Sept d'atout → ${septAtout.rang}${septAtout.couleur}`)
      return septAtout
    }
  }

  // Évolution 4 : bloquer mariages adverses si peu de brisques inconnues restantes (ou pioche petite en repli)
  if (modeAgressifBrisques) {
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
