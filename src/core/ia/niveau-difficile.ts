// ============================================================
// NIVEAU DIFFICILE — Stratégique avancé
// ============================================================
//
// Phase finale (pioche vide) — remplace l'INTÉGRALITÉ de la décision
//        par une recherche minimax à information complète (minimaxFinale.ts).
//        Toutes les règles ci-dessous (A/B, D.1, D.2, D.4) ne s'appliquent
//        qu'AVANT que la pioche ne soit vide.
// A/B — Règles tactiques mémorisation + anticipation (priorité absolue,
//        avant toute la cascade existante — a.1→a.4, b.1→b.2)
// D.1 — Mémorisation RÉELLE des cartes vues (memoire.ts, par déduction)
// D.2 — Gestion du score de partie (modes prudent / agressif),
//        enrichie par l'objectif de 16 brisques (anticipation.ts)
// D.4 — Variation de style (anti-prévisibilité 5-10%)

import type { Carte, GameState } from '../../types'
import { ORDRE_RANGS, VALEURS_BRISQUES } from '../../types'
import { logger } from '../../utils/logger'
import { PROBA_VARIATION_MIN, PROBA_VARIATION_MAX, IA_MEMOIRE_AVANCEE } from '../ia.config'
import {
  carteAvecRangMinimal, carteAvecRangMaximal,
  candidatsGagnants, cartesUtilesAuxCombis, valeurBrisque,
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
import { objectifBrisqueAtteignable } from './anticipation'
import { calculerValeurEspereeBrisque } from './tableBrisques'
import { choisirCarteMinimaxFinale } from './minimaxFinale'

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

/**
 * Ancien comptage agrégé des brisques restantes (D.1 pré-Phase 2) —
 * conservé uniquement comme repli si IA_MEMOIRE_AVANCEE.difficile est
 * désactivé. Moins précis que memoire.ts : ignore les cartes étalées,
 * le pli en cours (si non transmis via carteOuverte) et la main IA.
 */
function ancienComptageBrisquesRestantes(state: GameState, carteOuverte: Carte | null): number {
  const ia = state.joueurs[1]
  const humain = state.joueurs[0]
  const cartesVues = new Set<string>([
    ...ia.pileRemportee.map(c => c.id),
    ...humain.pileRemportee.map(c => c.id),
    ...(carteOuverte ? [carteOuverte.id] : []),
  ])
  const all = [...ia.pileRemportee, ...humain.pileRemportee]
  const brisquesVues = [...cartesVues].filter(id => all.some(c => c.id === id && valeurBrisque(c) > 0)).length
  return 32 - brisquesVues
}

export function iaDifficile(candidats: Carte[], state: GameState): Carte {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout
  const piocheRestante = state.pioche.length
  const [manchesIA, manchesHumain] = state.compteurManches ?? [0, 0]

  // ── Phase finale (pioche vide) — remplace l'INTÉGRALITÉ de la
  // décision (ouverture ET réponse) par une recherche minimax à
  // information complète (cf. minimaxFinale.ts) : à partir de ce
  // point, la main adverse est déductible avec certitude, donc un
  // vrai arbre de jeu exploré exhaustivement (élagage alpha-bêta)
  // prime sur toute heuristique. Aucune règle ci-dessous (A/B, D.1 à
  // D.4) ne s'applique plus une fois cette condition atteinte.
  if (piocheRestante === 0) {
    return choisirCarteMinimaxFinale(candidats, state)
  }

  // ── Règles tactiques A/B — priorité absolue sur toute la cascade ──
  if (IA_MEMOIRE_AVANCEE.difficile) {
    const brisqueGagnante = strategieBrisqueGagnante(candidats, state) // a.1 / b.1
    if (brisqueGagnante) {
      logger.debug('IA', `Difficile — [A/B] BrisqueGagnante → ${brisqueGagnante.rang}${brisqueGagnante.couleur}`)
      return brisqueGagnante
    }

    const ouvrirAs = strategieOuvrirAvecAs(candidats, state) // a.2 / a.3
    if (ouvrirAs) {
      logger.debug('IA', `Difficile — [A/B] OuvrirAvecAs → ${ouvrirAs.rang}${ouvrirAs.couleur}`)
      return ouvrirAs
    }

    const gagnerMariage = strategieGagnerPourMariage(candidats, state) // a.3 (suite)
    if (gagnerMariage) {
      logger.debug('IA', `Difficile — [A/B] GagnerPourMariage → ${gagnerMariage.rang}${gagnerMariage.couleur}`)
      return gagnerMariage
    }

    const ouvrirJoker = strategieOuvrirJokerSansMariage(candidats, state) // a.4
    if (ouvrirJoker) {
      logger.debug('IA', `Difficile — [A/B] OuvrirJokerSansMariage → ${ouvrirJoker.rang}${ouvrirJoker.couleur}`)
      return ouvrirJoker
    }

    // Éviter les As étalés non-atout de l'humain — information CERTAINE
    // (cartes visibles), donc prioritaire sur l'estimation probabiliste
    // de OuvrirCouleurÉpuisée (b.2) ci-dessous, qui sinon capterait
    // systématiquement tout choix d'ouverture non-atout avant d'y arriver.
    const eviterAsEtales = strategieEviterAsEtalesAdverse(candidats, state, cartesUtilesAuxCombis(state, 1))
    if (eviterAsEtales) {
      logger.debug('IA', `Difficile — ÉviterAsÉtalésAdverse → ${eviterAsEtales.rang}${eviterAsEtales.couleur}`)
      return eviterAsEtales
    }

    const ouvrirCouleurEpuisee = strategieOuvrirCouleurEpuisee(candidats, state) // b.2
    if (ouvrirCouleurEpuisee) {
      logger.debug('IA', `Difficile — [A/B] OuvrirCouleurÉpuisée → ${ouvrirCouleurEpuisee.rang}${ouvrirCouleurEpuisee.couleur}`)
      return ouvrirCouleurEpuisee
    }
  }

  // D.2 : Déterminer le mode de jeu — score de manche + objectif de 16 brisques
  const objectifBrisques = IA_MEMOIRE_AVANCEE.difficile ? objectifBrisqueAtteignable(state) : null
  const modeAgressif = manchesHumain >= 3 && manchesIA === 0
  // Mode prudent déclenché par le score de manche OU par l'objectif de 16 brisques
  // devenu mathématiquement hors de portée (repli : préserver le score plutôt
  // que de continuer à sacrifier des cartes pour une bataille de brisques perdue)
  const modePrudent = (manchesIA >= 3 && manchesHumain === 0) || objectifBrisques?.mode === 'repli'
  // Piste 1 : mode agressif "effectif" — le sacrifice de cartes protégées par
  // une combinaison en cours (cf. bloc RÉPONSE ci-dessous) n'est justifié que
  // tant que l'objectif de 16 brisques n'est pas déjà garanti. Une fois les
  // 16 brisques acquises (objectifBrisques.mode === 'atteint'), l'égalité
  // minimale de fin de manche est déjà assurée : détruire une combinaison
  // pour une brisque supplémentaire n'apporte plus rien et coûte des points
  // d'annonce inutilement. Repli sur le comportement normal dans ce cas
  // (préservation des combinaisons, cf. gagnantsSansUtiles plus bas).
  const modeAgressifActif = modeAgressif && objectifBrisques?.mode !== 'atteint'
  logger.debug(
    'IA',
    `Difficile — mode: ${
      modeAgressifActif
        ? 'AGRESSIF'
        : modeAgressif
          ? 'AGRESSIF→NORMAL (objectif 16 brisques déjà atteint)'
          : modePrudent
            ? 'PRUDENT'
            : 'NORMAL'
    }` +
    (objectifBrisques ? ` | brisques: ${objectifBrisques.actuelles}/16 (${objectifBrisques.mode})` : '')
  )

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

  // D.1 : Mémorisation réelle (par déduction) — remplace l'ancien comptage agrégé
  const cartesUtiles = cartesUtilesAuxCombis(state, 1)
  const brisquesRestantes = IA_MEMOIRE_AVANCEE.difficile
    ? brisquesNonVuesRestantes(state, 1)
    : ancienComptageBrisquesRestantes(state, carteOuverte)

  // Couper le 10
  if (carteOuverte) {
    const coupe = strategieCouper10(candidats, carteOuverte, state, cartesUtiles)
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
        // D.2 : Mode agressif (piste 1 : uniquement si l'objectif de 16
        // brisques n'est pas déjà garanti — cf. modeAgressifActif ci-dessus)
        if (modeAgressifActif) {
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
        //
        // Bugfix (mariage d'atout protégé) : la variation doit piocher
        // dans le MÊME pool que `meilleur` (gagnantsSansUtiles en
        // priorité) — pas dans `gagnants` brut, sans quoi elle pouvait
        // réintroduire par hasard une carte protégée (ex. la Dame d'un
        // mariage_atout actif) alors qu'un doublon libre équivalent
        // était disponible pour le sacrifice.
        if (!modePrudent && !modeAgressifActif) {
          const poolVariation = gagnantsSansUtiles.length > 0 ? gagnantsSansUtiles : gagnants
          const tries = [...poolVariation].sort((a, b) => ORDRE_RANGS[a.rang] - ORDRE_RANGS[b.rang])
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

  // D.2 : Mode agressif → atout fort (piste 3 : risque de contre évalué,
  // cartes protégées exclues, variation de style réintroduite).
  //
  // Correction par rapport au commentaire précédent (piste 1) : ce bloc
  // filtre désormais aussi `!cartesUtiles.has(c.id)`, au même titre que
  // le bloc "Contrôle atout" plus bas. `atoutsFortes` ne contient QUE
  // l'As et le 10 d'atout (seuls rangs ≥ rang('10') dans ORDRE_RANGS —
  // K/Q/J en sont exclus, contrairement à une lecture rapide du seuil).
  // Ces deux cartes peuvent néanmoins être protégées par une quinte en
  // cours (A+10+J d'atout, cf. detecterQuinte/combinaisons.ts) : le
  // filtre `cartesUtiles` reste donc pertinent ici. Il utilise
  // `modeAgressifActif` (piste 1), pas `modeAgressif` brut, pour la
  // même raison que le bloc RÉPONSE.
  if (modeAgressifActif && couleurAtout) {
    const atoutsFortes = candidats.filter(c =>
      !c.estJoker && c.couleur === couleurAtout &&
      ORDRE_RANGS[c.rang] >= ORDRE_RANGS['10'] && !cartesUtiles.has(c.id)
    )
    if (atoutsFortes.length > 0) {
      // atoutsFortes ⊆ {As, 10} d'atout : le meilleur candidat (rang
      // maximal) est donc TOUJOURS soit l'As, soit le 10.
      //
      // - Si c'est l'As : il est IMPARABLE (rang le plus élevé du jeu,
      //   rien ne peut le battre) — l'exposer ne comporte aucun risque
      //   réel, quel que soit le reliquat non vu.
      // - Si c'est le 10 (l'As n'est pas/plus en main) : il PEUT être
      //   contré par l'As d'atout adverse s'il est encore en jeu — on
      //   évalue alors le risque qu'une brisque d'atout adverse traîne
      //   encore (piste 3 : calculerValeurEspereeBrisque, déjà utilisé
      //   par strategieOuvrirCouleurEpuisee — tableBrisques.ts), pour
      //   ne pas jeter aveuglément le 10 dans un contre évitable.
      const meilleurCandidat = carteAvecRangMaximal(atoutsFortes)
      const esAsInvincible = meilleurCandidat.rang === 'A'
      const risqueContre = calculerValeurEspereeBrisque(state, couleurAtout, 1)

      if (esAsInvincible || risqueContre < 1) {
        logger.debug('IA', 'Difficile — Mode AGRESSIF ouverture : atout fort')
        const choix = carteAvecRangMaximal(atoutsFortes)
        const tries = [...atoutsFortes].sort((a, b) => ORDRE_RANGS[b.rang] - ORDRE_RANGS[a.rang])
        return appliquerVariation(tries) ?? choix
      }

      // Risque de contre significatif ET le meilleur candidat est le 10
      // (pas l'As — sinon esAsInvincible serait vrai) : le 10 PEUT être
      // battu par l'As d'atout adverse. Comme atoutsFortes ⊆ {As, 10}
      // et que l'As est absent ici, il n'existe AUCUNE carte "forte"
      // alternative plus sûre au sein de ce lot (rang minimal = rang
      // maximal = le 10 lui-même) : forcer quand même l'exposition
      // reviendrait exactement au même choix que si le risque n'avait
      // jamais été évalué — la piste 3 serait alors sans effet réel.
      //
      // On cède donc la main à la SUITE de la cascade (pas de return
      // ici) : "Contrôle atout si brisques restantes élevées" (heuristique
      // globale indépendante du risque adverse sur cette couleur
      // précise), puis "Sept d'atout", puis la défausse par défaut —
      // c'est ce repli qui donne un effet concret et observable à
      // l'évaluation du risque, plutôt qu'un choix mathématiquement
      // identique déguisé en branche distincte.
      logger.debug(
        'IA',
        `Difficile — Mode AGRESSIF ouverture : risque de contre (${risqueContre.toFixed(2)}) sur le 10 d'atout → repli sur la cascade normale (pas d'exposition forcée)`
      )
      // (pas de return : la fonction continue sur les blocs suivants)
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
