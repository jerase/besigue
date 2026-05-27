// ============================================================
// MOTEUR IA — IT-6 (amélioré)
// SF-14 : Facile / Intermédiaire / Difficile
// ============================================================

import type { Carte, GameState, NiveauIA, Couleur, CombinaisonDisponible } from '../types'
import { ORDRE_RANGS, VALEURS_BRISQUES } from '../types'
import { cartesJouablesPhaseFinale, resoudrePli } from './pli'
import { detecterCombinaisonsDisponibles } from './combinaisons'
import { logger } from '../utils/logger'

// ============================================================
// Délais de réflexion simulés (SF-14.2)
// ============================================================

export const DELAIS_IA: Record<NiveauIA, [number, number]> = {
  facile:        [500,  1000],
  intermediaire: [1000, 1500],
  difficile:     [1500, 2500],
}

export function delaiSimule(niveau: NiveauIA): number {
  const [min, max] = DELAIS_IA[niveau]
  return Math.floor(Math.random() * (max - min) + min)
}

// ============================================================
// Point d'entrée — choisir la carte que l'IA va jouer
// ============================================================

export function choisirCarteIA(state: GameState, niveau: NiveauIA): Carte | null {
  const ia = state.joueurs[1]
  let candidats = [...ia.main, ...ia.cartesEtalees]

  if (candidats.length === 0) return null

  // En phase finale : filtrer selon les obligations (couleur/coupe)
  if (state.phase === 'finale') {
    const carteOuverte = state.pliEnCours.carteJoueur0
    const jouables = cartesJouablesPhaseFinale(candidats, carteOuverte, state.couleurAtout)
    candidats = jouables.length > 0 ? jouables : candidats
  }

  logger.debug('IA', `Niveau ${niveau}, ${candidats.length} candidats`)

  switch (niveau) {
    case 'facile':        return iaFacile(candidats, state)
    case 'intermediaire': return iaIntermediaire(candidats, state)
    case 'difficile':     return iaDifficile(candidats, state)
  }
}

// ============================================================
// Choisir quelle annonce faire (partagé entre niveaux)
// ============================================================

export function choisirAnnonceIA(
  combis: CombinaisonDisponible[],
  state: GameState,
  niveau: NiveauIA
): CombinaisonDisponible {
  if (combis.length === 1) return combis[0]

  switch (niveau) {
    case 'facile':
      // Aléatoire
      return combis[Math.floor(Math.random() * combis.length)]

    case 'intermediaire':
      // Prendre la plus rentable en points
      return combis.reduce((a, b) => b.points > a.points ? b : a)

    case 'difficile':
      return choisirAnnonceStrategique(combis, state)
  }
}

// ============================================================
// FACILE — Aléatoire avec comportements humains débutants
// ============================================================
//
// Trois comportements "d'erreur" réalistes s'ajoutent à l'aléatoire :
//
// 1. RATE couper le 10 : 1 chance sur 3 de ne pas appliquer la règle
//    (PROBA_RATER_COUPER10 = 0.33)
//
// 2. JOUE l'atout trop tôt : 30% du temps en ouverture, si elle a
//    de l'atout, elle le joue même sans raison stratégique
//    (PROBA_ATOUT_PREMATURE = 0.30)
//
// 3. JOUE une brisque au hasard : 20% du temps en ouverture, elle
//    joue une brisque (As ou 10) même quand c'est mauvais
//    (PROBA_BRISQUE_IMPRUDENTE = 0.20)
//
// Ces comportements sont indépendants et s'appliquent dans l'ordre.
// Si aucun ne se déclenche → tirage aléatoire pur (comportement original).

export const PROBA_RATER_COUPER10    = 0.33
export const PROBA_ATOUT_PREMATURE   = 0.30
export const PROBA_BRISQUE_IMPRUDENTE = 0.20

function iaFacile(candidats: Carte[], state: GameState): Carte {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout

  // ── Comportement 1 : Couper le 10 (avec risque de rater) ─────
  if (carteOuverte && carteOuverte.rang === '10') {
    const rate = Math.random() < PROBA_RATER_COUPER10
    if (!rate) {
      const coupe = strategieCouper10(candidats, carteOuverte, state)
      if (coupe) {
        logger.debug('IA', `Facile — Couper10 → ${coupe.rang}${coupe.couleur}`)
        return coupe
      }
    } else {
      logger.debug('IA', 'Facile — Couper10 RATÉ (comportement débutant)')
    }
  }

  // Les comportements 2 et 3 ne s'appliquent qu'en ouverture (pas de carte ouverte)
  if (!carteOuverte) {

    // ── Comportement 2 : Jouer l'atout trop tôt ───────────────
    if (couleurAtout && Math.random() < PROBA_ATOUT_PREMATURE) {
      const atouts = candidats.filter(c => !c.estJoker && c.couleur === couleurAtout)
      if (atouts.length > 0) {
        const choix = atouts[Math.floor(Math.random() * atouts.length)]
        logger.debug('IA', `Facile — Atout prématuré → ${choix.rang}${choix.couleur}`)
        return choix
      }
    }

    // ── Comportement 3 : Jouer une brisque imprudemment ────────
    if (Math.random() < PROBA_BRISQUE_IMPRUDENTE) {
      const brisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] > 0)
      if (brisques.length > 0) {
        const choix = brisques[Math.floor(Math.random() * brisques.length)]
        logger.debug('IA', `Facile — Brisque imprudente → ${choix.rang}${choix.couleur}`)
        return choix
      }
    }
  }

  // ── Garder les atouts (tous niveaux) ────────────────────────
  const garderAtout = strategieGarderAtouts(candidats, state)
  if (garderAtout) {
    logger.debug('IA', `Facile — GarderAtouts → ${garderAtout.rang}${garderAtout.couleur}`)
    return garderAtout
  }

  // ── Étalées en réponse (tous niveaux) ───────────────────────
  const etaleesRep = strategieEtaleesEnReponse(candidats, state)
  if (etaleesRep) {
    logger.debug('IA', `Facile — Étalées-réponse → ${etaleesRep.rang}${etaleesRep.couleur}`)
    return etaleesRep
  }

  // ── Stratégie pré-atout (tous niveaux) ──────────────────────
  const preAtout = strategieOuverturePreAtout(candidats, state)
  if (preAtout) {
    logger.debug('IA', `Facile — Pré-atout → ${preAtout.rang}${preAtout.couleur}`)
    return preAtout
  }

  // ── Aléatoire pur (comportement original) ────────────────────
  const idx = Math.floor(Math.random() * candidats.length)
  logger.debug('IA', `Facile → ${candidats[idx].rang}${candidats[idx].couleur}`)
  return candidats[idx]
}

// ============================================================
// INTERMÉDIAIRE — Heuristique améliorée (IT-6)
// ============================================================

// ── Seuils pioche pour niveau intermédiaire ──────────────────
export const SEUIL_PIOCHE_GRANDE  = 8   // pioche > 8 → jouer safe
export const SEUIL_PIOCHE_PETITE  = 4   // pioche ≤ 4 → jouer agressif

function iaIntermediaire(candidats: Carte[], state: GameState): Carte {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout
  const piocheRestante = state.pioche.length
  const humain = state.joueurs[0]

  // ── Stratégie couper le 10 — tous niveaux ────────────────────
  if (carteOuverte) {
    const coupe = strategieCouper10(candidats, carteOuverte, state)
    if (coupe) {
      logger.debug('IA', `Intermédiaire — Couper10 → ${coupe.rang}${coupe.couleur}`)
      return coupe
    }
  }

  // ── Évolution 1 : Couper l'As adverse avec atout ─────────────
  // L'As est le rang le plus fort (rang 8). Aucune carte de même
  // couleur ne peut le battre. Seul un atout peut capturer un As
  // non-atout. Si le joueur pose un As d'atout → rien ne le bat.
  if (carteOuverte && carteOuverte.rang === 'A' && couleurAtout) {
    const estAsAtout = carteOuverte.couleur === couleurAtout
    if (!estAsAtout) {
      // As non-atout → chercher l'atout gagnant le plus faible
      const atoutsGagnants = candidatsGagnants(
        candidats.filter(c => !c.estJoker && c.couleur === couleurAtout),
        carteOuverte,
        couleurAtout,
        1
      )
      if (atoutsGagnants.length > 0) {
        const plusFaible = atoutsGagnants.reduce((min, c) =>
          ORDRE_RANGS[c.rang] < ORDRE_RANGS[min.rang] ? c : min
        )
        logger.debug('IA', `Intermédiaire — Couper As non-atout → atout ${plusFaible.rang}${plusFaible.couleur}`)
        return plusFaible
      }
    }
    // As d'atout ou pas d'atout disponible → fallback
  }

  // ── Garder les atouts (tous niveaux) ────────────────────────
  const garderAtout = strategieGarderAtouts(candidats, state)
  if (garderAtout) {
    logger.debug('IA', `Intermédiaire — GarderAtouts → ${garderAtout.rang}${garderAtout.couleur}`)
    return garderAtout
  }

  // ── Étalées en réponse (tous niveaux) ───────────────────────
  const etaleesRep = strategieEtaleesEnReponse(candidats, state)
  if (etaleesRep) {
    logger.debug('IA', `Intermédiaire — Étalées-réponse → ${etaleesRep.rang}${etaleesRep.couleur}`)
    return etaleesRep
  }

  // ── Stratégie pré-atout (tous niveaux) ──────────────────────
  const preAtout = strategieOuverturePreAtout(candidats, state)
  if (preAtout) {
    logger.debug('IA', `Intermédiaire — Pré-atout → ${preAtout.rang}${preAtout.couleur}`)
    return preAtout
  }

  // ── Cartes utiles aux combis ──────────────────────────────────
  const cartesUtiles = cartesUtilesAuxCombis(state, 1)

  // ── Bloc RÉPONSE (carteOuverte présente) ─────────────────────
  if (carteOuverte) {
    const brisqueDansPli = valeurBrisque(carteOuverte) > 0

    if (brisqueDansPli) {
      // Évolution 2 : Pioche adaptative en mode agressif
      // Si la pioche est petite (≤ 4), on essaie encore plus fort de gagner
      // les brisques (même sacrifier une carte utile si nécessaire)
      const gagnants = candidatsGagnants(candidats, carteOuverte, couleurAtout, 1)
      if (gagnants.length > 0) {
        if (piocheRestante <= SEUIL_PIOCHE_PETITE) {
          // Mode agressif : gagner coûte que coûte
          logger.debug('IA', `Intermédiaire — Agressif (pioche=${piocheRestante}) → gagner brisque`)
          return carteAvecRangMinimal(gagnants)
        }
        // Mode normal : gagner avec carte minimale sans sacrifier utiles
        const gagnantsNonUtiles = gagnants.filter(c => !cartesUtiles.has(c.id))
        logger.debug('IA', `Intermédiaire — Gagner brisque (pioche=${piocheRestante})`)
        return carteAvecRangMinimal(gagnantsNonUtiles.length > 0 ? gagnantsNonUtiles : gagnants)
      }
    }

    // Pli sans brisque (ou impossible à gagner) → défausse intelligente
    const defausse = candidats
      .filter(c => VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id))
    if (defausse.length > 0) return carteAvecRangMinimal(defausse)

    const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
    return carteAvecRangMinimal(sansBrisques.length > 0 ? sansBrisques : candidats)
  }

  // ── Bloc OUVERTURE (l'IA joue en premier) ────────────────────

  // Évolution 3 : Jouer le 7 d'atout en ouverture si pioche grande
  // → +10 pts automatiques, sans risque (pioche grande = pas encore en finale)
  if (couleurAtout && piocheRestante > SEUIL_PIOCHE_GRANDE) {
    const septAtout = candidats.find(
      c => c.rang === '7' && c.couleur === couleurAtout && !c.estJoker
    )
    if (septAtout) {
      logger.debug('IA', `Intermédiaire — Sept d'atout (+10 pts) → ${septAtout.rang}${septAtout.couleur}`)
      return septAtout
    }
  }

  // Évolution 4 : Bloquer les mariages adverses en mode agressif
  // Si pioche petite et que l'humain a une carte étalée (demi-mariage),
  // l'IA essaie de jouer la carte complémentaire pour le gêner
  // (en jouant cette carte dans un pli, elle l'épuise de sa main)
  if (piocheRestante <= SEUIL_PIOCHE_PETITE) {
    const etaleesHumain = humain.cartesEtalees
    for (const etale of etaleesHumain) {
      if (etale.rang === 'Q') {
        // L'humain a une Dame étalée → chercher le Roi de même couleur en main IA
        const roi = candidats.find(
          c => c.rang === 'K' && c.couleur === etale.couleur && !cartesUtiles.has(c.id)
        )
        if (roi) {
          logger.debug('IA', `Intermédiaire — Bloquer mariage humain → jouer ${roi.rang}${roi.couleur}`)
          return roi
        }
      }
      if (etale.rang === 'K') {
        // L'humain a un Roi étalé → chercher la Dame de même couleur en main IA
        const dame = candidats.find(
          c => c.rang === 'Q' && c.couleur === etale.couleur && !cartesUtiles.has(c.id)
        )
        if (dame) {
          logger.debug('IA', `Intermédiaire — Bloquer mariage humain → jouer ${dame.rang}${dame.couleur}`)
          return dame
        }
      }
    }
  }

  // Ouverture normale : éviter brisques ET cartes utiles aux combis
  const sansValeur = candidats.filter(c =>
    VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id)
  )
  if (sansValeur.length > 0) return carteAvecRangMinimal(sansValeur)

  const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
  return carteAvecRangMinimal(sansBrisques.length > 0 ? sansBrisques : candidats)
}

// ============================================================
// DIFFICILE — Stratégique avancé (IT-6)
// Mémorisation, score de partie, phase finale dédiée, variation
// ============================================================
//
// Évolution D.1 — Mémorisation des cartes vues
//   Cartes "vues" = piles remportées des deux joueurs
//                 + carte posée par l'humain dans le pli en cours
//   Déduit le nombre max de brisques encore disponibles chez l'humain
//   → Coupe sans hésiter si on sait que l'humain ne peut plus gagner
//
// Évolution D.2 — Gestion du score de partie (compteurManches)
//   IA mène (≥ 3-0)        → mode PRUDENT : carte minimale partout
//   IA est menée (0-3 pour l'adversaire) → mode AGRESSIF : prend
//     tous les risques, sacrifie les cartes utiles pour gagner
//   Situation normale       → comportement standard
//
// Évolution D.3 — Phase finale dédiée
//   Pioche = 0 → calcul exact des As adverses encore en jeu
//   Si humain ne peut plus gagner le pli → couper librement
//
// Évolution D.4 — Variation de style (anti-prévisibilité)
//   5% à 10% du temps (aléatoire) → joue la 2e meilleure carte
//   Préserve l'efficacité tout en restant imprévisible

export const PROBA_VARIATION_MIN = 0.05
export const PROBA_VARIATION_MAX = 0.10

// ── Helpers locaux ─────────────────────────────────────────────

/** Applique la variation de style : retourne la 2e carte si tirage réussi */
function appliquerVariation(cartes: Carte[]): Carte | null {
  if (cartes.length < 2) return null
  const proba = PROBA_VARIATION_MIN + Math.random() * (PROBA_VARIATION_MAX - PROBA_VARIATION_MIN)
  if (Math.random() < proba) {
    logger.debug('IA', 'Difficile — Variation de style → 2e meilleure carte')
    return cartes[1]  // la 2e carte de la liste (triée par rang)
  }
  return null
}

/** Compte les As d'une couleur encore non vus (potentiellement chez l'humain) */
function asNonVus(couleur: string, cartesVues: Set<string>, state: GameState): number {
  // Il y a 2 As par couleur dans le jeu (2 jeux de cartes)
  const totalAs = 2
  const asVus = [...state.joueurs[0].pileRemportee, ...state.joueurs[1].pileRemportee,
                 ...state.joueurs[1].main, ...state.joueurs[1].cartesEtalees]
    .filter(c => c.rang === 'A' && c.couleur === couleur && cartesVues.has(c.id)).length
  return Math.max(0, totalAs - asVus)
}

function iaDifficile(candidats: Carte[], state: GameState): Carte {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout
  const ia = state.joueurs[1]
  const humain = state.joueurs[0]
  const piocheRestante = state.pioche.length
  const [manchesIA, manchesHumain] = state.compteurManches ?? [0, 0]

  // ── D.2 : Score de partie → mode de jeu ──────────────────────
  const modeAgressif = manchesHumain >= 3 && manchesIA === 0
  const modePrudent  = manchesIA >= 3 && manchesHumain === 0
  logger.debug('IA', `Difficile — mode: ${modeAgressif ? 'AGRESSIF' : modePrudent ? 'PRUDENT' : 'NORMAL'} (IA:${manchesIA} vs H:${manchesHumain})`)

  // ── Garder les atouts (tous niveaux) ────────────────────────
  const garderAtout = strategieGarderAtouts(candidats, state)
  if (garderAtout) {
    logger.debug('IA', `Difficile — GarderAtouts → ${garderAtout.rang}${garderAtout.couleur}`)
    return garderAtout
  }

  // ── Étalées en réponse (tous niveaux) ───────────────────────
  const etaleesRep = strategieEtaleesEnReponse(candidats, state)
  if (etaleesRep) {
    logger.debug('IA', `Difficile — Étalées-réponse → ${etaleesRep.rang}${etaleesRep.couleur}`)
    return etaleesRep
  }

  // ── Stratégie pré-atout (tous niveaux) ──────────────────────
  const preAtout = strategieOuverturePreAtout(candidats, state)
  if (preAtout) {
    logger.debug('IA', `Difficile — Pré-atout → ${preAtout.rang}${preAtout.couleur}`)
    return preAtout
  }

  // ── D.1 : Cartes vues (mémorisation) ─────────────────────────
  // Vues = piles remportées des deux joueurs + carte ouverte par l'humain
  const cartesVues = new Set<string>([
    ...ia.pileRemportee.map(c => c.id),
    ...humain.pileRemportee.map(c => c.id),
    ...(carteOuverte ? [carteOuverte.id] : []),
  ])

  // Cartes utiles aux combis de l'IA
  const cartesUtiles = cartesUtilesAuxCombis(state, 1)

  // Brisques totales vues (pour estimation)
  const brisquesVues = [...cartesVues].filter(id => {
    const all = [...ia.pileRemportee, ...humain.pileRemportee]
    return all.some(c => c.id === id && valeurBrisque(c) > 0)
  }).length
  const brisquesRestantes = 32 - brisquesVues

  // ── D.3 : Phase finale — calcul exact ────────────────────────
  const estPhaseFinale = piocheRestante === 0

  // ── Couper le 10 — commun à tous les niveaux ─────────────────
  if (carteOuverte) {
    const coupe = strategieCouper10(candidats, carteOuverte, state)
    if (coupe) {
      logger.debug('IA', `Difficile — Couper10 → ${coupe.rang}${coupe.couleur}`)
      return coupe
    }
  }

  // ── Bloc RÉPONSE ──────────────────────────────────────────────
  if (carteOuverte) {
    const brisqueDansPli = valeurBrisque(carteOuverte) > 0

    if (brisqueDansPli) {
      const gagnants = candidatsGagnants(candidats, carteOuverte, couleurAtout, 1)

      if (gagnants.length > 0) {

        // D.3 — Phase finale : l'humain peut-il encore gagner ce pli ?
        // Si toutes les cartes de même couleur ou atouts de l'humain sont vues
        // → il ne peut plus gagner → on peut couper avec n'importe quel gagnant
        if (estPhaseFinale) {
          logger.debug('IA', 'Difficile — Phase finale : couper librement')
          const meilleurGagnant = carteAvecRangMinimal(
            gagnants.filter(c => !cartesUtiles.has(c.id)).length > 0
              ? gagnants.filter(c => !cartesUtiles.has(c.id))
              : gagnants
          )
          // D.4 — Variation de style
          const variation = appliquerVariation(
            [...gagnants].sort((a, b) => ORDRE_RANGS[a.rang] - ORDRE_RANGS[b.rang])
          )
          return (modePrudent || !variation) ? meilleurGagnant : variation
        }

        // D.2 — Mode agressif : gagner coûte que coûte, même sacrifier utiles
        if (modeAgressif) {
          logger.debug('IA', 'Difficile — Mode AGRESSIF : gagner la brisque')
          const choix = carteAvecRangMinimal(gagnants)
          // D.4 — Variation (réduite en mode agressif)
          const variation = appliquerVariation(
            [...gagnants].sort((a, b) => ORDRE_RANGS[a.rang] - ORDRE_RANGS[b.rang])
          )
          return variation ?? choix
        }

        // D.1 — Mémorisation : si l'humain a peu d'atouts vus, il peut couper
        // → ne sacrifier une carte utile que si on est sûr de gagner
        const gagnantsSansUtiles = gagnants.filter(c => !cartesUtiles.has(c.id))

        // D.2 — Mode prudent : ne jamais sacrifier une carte utile
        if (modePrudent && gagnantsSansUtiles.length === 0) {
          // Laisser passer la brisque plutôt que de sacrifier une utile
          logger.debug('IA', 'Difficile — Mode PRUDENT : laisser passer la brisque')
          const defausse = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id))
          const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
          return carteAvecRangMinimal(defausse.length > 0 ? defausse : sansBrisques.length > 0 ? sansBrisques : candidats)
        }

        const meilleur = carteAvecRangMinimal(gagnantsSansUtiles.length > 0 ? gagnantsSansUtiles : gagnants)
        // D.4 — Variation de style (mode normal uniquement)
        if (!modePrudent && !modeAgressif) {
          const tries = [...gagnants].sort((a, b) => ORDRE_RANGS[a.rang] - ORDRE_RANGS[b.rang])
          const variation = appliquerVariation(tries)
          if (variation) return variation
        }
        return meilleur
      }
    }

    // Pli sans brisque : défausse optimale
    const defausse = candidats.filter(c =>
      VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id)
    )
    if (defausse.length > 0) return carteAvecRangMinimal(defausse)

    const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
    if (sansBrisques.length > 0) return carteAvecRangMinimal(sansBrisques)
    return carteAvecRangMinimal(candidats)
  }

  // ── Bloc OUVERTURE ────────────────────────────────────────────

  // D.2 — Mode prudent : toujours la carte minimale en ouverture
  if (modePrudent) {
    logger.debug('IA', 'Difficile — Mode PRUDENT ouverture : carte minimale')
    const sansValeur = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id))
    const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
    return carteAvecRangMinimal(sansValeur.length > 0 ? sansValeur : sansBrisques.length > 0 ? sansBrisques : candidats)
  }

  // D.2 — Mode agressif : tirer l'adversaire avec un atout fort
  if (modeAgressif && couleurAtout) {
    const atoutsFortes = candidats.filter(c =>
      !c.estJoker && c.couleur === couleurAtout &&
      ORDRE_RANGS[c.rang] >= ORDRE_RANGS['10']
    )
    if (atoutsFortes.length > 0) {
      logger.debug('IA', 'Difficile — Mode AGRESSIF ouverture : atout fort')
      return carteAvecRangMaximal(atoutsFortes)
    }
  }

  // Ouverture normale : contrôle atout si brisques restantes élevées
  if (couleurAtout) {
    const atoutsFortes = candidats.filter(c =>
      !c.estJoker && c.couleur === couleurAtout &&
      ORDRE_RANGS[c.rang] >= ORDRE_RANGS['10'] &&
      !cartesUtiles.has(c.id)
    )
    if (atoutsFortes.length > 0 && brisquesRestantes > 6) {
      const choix = carteAvecRangMaximal(atoutsFortes)
      // D.4 — Variation de style en ouverture normale
      const tries = [...atoutsFortes].sort((a, b) => ORDRE_RANGS[b.rang] - ORDRE_RANGS[a.rang])
      const variation = appliquerVariation(tries)
      return variation ?? choix
    }
  }

  // Jouer le 7 d'atout si disponible (bonus +10 automatique)
  if (couleurAtout) {
    const septAtout = candidats.find(c =>
      !c.estJoker && c.rang === '7' && c.couleur === couleurAtout
    )
    if (septAtout && !cartesUtiles.has(septAtout.id)) return septAtout
  }

  // Défaut : défausser non-brisque, non-utile, rang minimal
  const sansValeur = candidats.filter(c =>
    VALEURS_BRISQUES[c.rang] === 0 && !cartesUtiles.has(c.id)
  )
  if (sansValeur.length > 0) return carteAvecRangMinimal(sansValeur)

  const sansBrisques = candidats.filter(c => VALEURS_BRISQUES[c.rang] === 0)
  return carteAvecRangMinimal(sansBrisques.length > 0 ? sansBrisques : candidats)
}

// ============================================================
// STRATÉGIE D'ANNONCE — Niveau difficile
// ============================================================

function choisirAnnonceStrategique(
  combis: CombinaisonDisponible[],
  state: GameState
): CombinaisonDisponible {
  // Priorités :
  // 1. Mariage_Atout (débloque les autres + définit l'atout)
  // 2. Quinte (250 pts, nécessite le mariage_Atout actif)
  // 3. Carrés atout (points élevés)
  // 4. 4 As (100 pts)
  // 5. Bésigue premier (100 pts)
  // 6. Autres carrés
  // 7. Mariages hors-atout
  // 8. Bésigue suivant (40 pts)

  const priorite: Record<string, number> = {
    mariage_atout:      100,
    quinte:             90,
    '4_as_atout':       85,
    '4_roi_atout':      82,
    '4_dame_atout':     80,
    '4_valet_atout':    78,
    '4_as':             70,
    '4_roi':            60,
    '4_dame':           50,
    '4_valet':          40,
    besigue:            state.premierBesiguePose ? 20 : 65, // 1er bésigue = haute priorité
    mariage_hors_atout: 30,
    sept_atout:         10,
  }

  return combis.reduce((best, combi) => {
    const pBest = priorite[best.nom] ?? best.points
    const pCombi = priorite[combi.nom] ?? combi.points
    return pCombi > pBest ? combi : best
  })
}

// ============================================================
// STRATÉGIE "COUPER LE 10" — Tous niveaux (IT-6.2)
// Appliquée quand le joueur humain joue un 10.
//
// Cas A — 10 NON-ATOUT :
//   1. As de même couleur dans les étalées IA
//   2. As de même couleur en main IA
//   3. La plus faible carte d'atout qui bat le 10
//   4. Fallback algorithme existant
//
// Cas B — 10 ATOUT :
//   1. IA a plusieurs As d'atout → jouer un As d'atout
//   2. IA n'a qu'un seul As d'atout ET pioche ≤ 2 → jouer cet As
//   3. Fallback algorithme existant
// ============================================================

// ============================================================
// STRATÉGIE OUVERTURE PRÉ-ATOUT — Tous niveaux
// ============================================================
//
// S'applique UNIQUEMENT en ouverture (l'IA joue en premier)
// et UNIQUEMENT quand l'atout n'est pas encore défini.
//
// Même après définition de l'atout, l'IA évite de gaspiller
// ses cartes d'atout — elle les préserve jusqu'à la fin.
//
// Priorités quand atout non défini :
//   1. Cartes de rang faible : 9, 8, 7 (non-brisques, peu utiles)
//   2. Cartes en double (même rang, 2+ exemplaires en main)
//      → sacrifier un des doublons plutôt qu'une carte unique utile
//   3. Fallback → algorithme de niveau habituel
//
// Quand atout défini :
//   → éviter les cartes d'atout en ouverture (les préserver)
//   → laisser le niveau gérer normalement
/**
 * Stratégie d'ouverture pré-atout et préservation des atouts.
 * Retourne null si la règle ne s'applique pas (→ fallback).
 */
// ============================================================
// STRATÉGIE GARDER LES ATOUTS — Tous niveaux
// ============================================================
//
// Objectif : conserver 4-5 cartes d'atout en main pour la phase
// finale, où elles seront décisives.
//
// Deux modes selon la taille de la pioche :
//
// Mode NORMAL (atout défini, pioche > SEUIL_GARDER_ATOUTS) :
//   - Ouverture : éviter les atouts, jouer autre chose
//   - Réponse   : n'utiliser un atout QUE pour :
//       a) capturer une brisque adverse (As ou 10)
//       b) gagner un pli important (adversaire joue As ou 10)
//     → si aucun de ces cas, ne pas jouer d'atout
//
// Mode NETTOYAGE (pioche ≤ SEUIL_GARDER_ATOUTS = 50) :
//   - Même règle renforcée : atout uniquement pour brisque/pli important
//   - En ouverture : jouer toujours autre chose si possible
//
// Les cartes d'atout sont TOUJOURS jouables via les règles
// prioritaires (couper10, couper-As, étalées).
// Cette stratégie s'applique APRÈS ces règles.

export const SEUIL_GARDER_ATOUTS = 50  // pioche ≤ 50 → mode nettoyage

/**
 * Stratégie de préservation des atouts.
 * Retourne la carte à jouer (sans atout si possible),
 * ou null si aucune restriction ne s'applique (→ fallback niveau).
 */
function strategieGarderAtouts(
  candidats: Carte[],
  state: GameState
): Carte | null {
  const couleurAtout = state.couleurAtout
  if (!couleurAtout) return null  // atout non défini → inapplicable

  const carteOuverte = state.pliEnCours.carteJoueur0
  const piocheRestante = state.pioche.length

  // ── Mode RÉPONSE ──────────────────────────────────────────────
  if (carteOuverte) {
    // Cas autorisé : la carte adverse est une brisque (As ou 10) ou un pli important
    const estBrisqueOuImportant =
      carteOuverte.rang === 'A' || carteOuverte.rang === '10'

    if (estBrisqueOuImportant) {
      // L'IA PEUT jouer un atout — laisser le fallback décider
      return null
    }

    // Carte adverse ordinaire → ne pas gaspiller un atout
    // Chercher une carte non-atout parmi les candidats
    const sansAtout = candidats.filter(
      c => !c.estJoker && c.couleur !== couleurAtout
    )
    if (sansAtout.length > 0) {
      const choix = carteAvecRangMinimal(sansAtout)
      logger.debug('IA', `GarderAtouts-réponse — non-atout → ${choix.rang}${choix.couleur}`)
      return choix
    }
    // Que des atouts disponibles → obligation de jouer atout, fallback
    return null
  }

  // ── Mode OUVERTURE ────────────────────────────────────────────
  // Toujours éviter les atouts en ouverture si possible
  const sansAtout = candidats.filter(
    c => !c.estJoker && c.couleur !== couleurAtout
  )
  if (sansAtout.length > 0) {
    const choix = carteAvecRangMinimal(sansAtout)
    logger.debug('IA', `GarderAtouts-ouverture (pioche=${piocheRestante}) — non-atout → ${choix.rang}${choix.couleur}`)
    return choix
  }

  // Que des atouts en main → obligation de jouer atout, fallback
  return null
}

// ============================================================
// STRATÉGIE ÉTALÉES EN RÉPONSE — Tous niveaux
// ============================================================
//
// En réponse à une carte adverse non-atout, l'IA privilégie
// de jouer ses cartes ÉTALÉES (non-atout) plutôt que ses cartes
// en main — si elles gagnent le pli.
//
// Priorités dans les étalées :
//   1. As étalé non-atout de même couleur que la carte ouverte
//      → capture une brisque adverse / récupère la sienne
//   2. Toute autre carte étalée non-atout gagnante (rang minimal)
//
// Les cartes d'atout étalées sont TOUJOURS protégées.
// Ne s'applique qu'en réponse (carteOuverte présente).
/**
 * En réponse, préférer jouer une carte étalée non-atout gagnante
 * plutôt qu'une carte en main.
 * Retourne null si aucune carte étalée applicable.
 */
function strategieEtaleesEnReponse(
  candidats: Carte[],
  state: GameState
): Carte | null {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout

  // Ne s'applique qu'en réponse
  if (!carteOuverte) return null

  // Ne s'applique pas si la carte ouverte est un atout
  // (dans ce cas, les règles normales de coupe s'appliquent)
  if (couleurAtout && carteOuverte.couleur === couleurAtout) return null

  const etaleesIA = state.joueurs[1].cartesEtalees

  // Cartes étalées non-atout présentes dans les candidats jouables
  const etaleesDisponibles = etaleesIA.filter(e =>
    !e.estJoker &&
    (!couleurAtout || e.couleur !== couleurAtout) &&
    candidats.some(cand => cand.id === e.id)
  )

  if (etaleesDisponibles.length === 0) return null

  // Calculer quelles étalées gagnent le pli
  const etaleesGagnantes = candidatsGagnants(etaleesDisponibles, carteOuverte, couleurAtout, 1)

  if (etaleesGagnantes.length === 0) return null

  // Priorité 1 : As étalé non-atout de même couleur que la carte ouverte
  // → brisque capturée ou défendue
  const asMemeCouleur = etaleesGagnantes.filter(
    c => c.rang === 'A' && c.couleur === carteOuverte.couleur
  )
  if (asMemeCouleur.length > 0) {
    const choix = asMemeCouleur[0]
    logger.debug('IA', `Étalées-réponse — As étalé même couleur → ${choix.rang}${choix.couleur}`)
    return choix
  }

  // Priorité 2 : toute autre carte étalée gagnante, rang minimal
  const choix = carteAvecRangMinimal(etaleesGagnantes)
  logger.debug('IA', `Étalées-réponse — étalée gagnante → ${choix.rang}${choix.couleur}`)
  return choix
}

function strategieOuverturePreAtout(
  candidats: Carte[],
  state: GameState
): Carte | null {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout

  // Ne s'applique qu'en ouverture (pas de carte posée par l'adversaire)
  if (carteOuverte !== null) return null

  // ── Cas A : atout non défini → stratégie pré-atout ───────────
  if (couleurAtout === null) {
    // Priorité 1 : rangs faibles non-brisques (9, 8, 7)
    const RANGS_FAIBLES: Carte['rang'][] = ['9', '8', '7']
    const cartesFaibles = candidats.filter(
      c => !c.estJoker && RANGS_FAIBLES.includes(c.rang)
    )
    if (cartesFaibles.length > 0) {
      const choix = carteAvecRangMinimal(cartesFaibles)
      logger.debug('IA', `Pré-atout — carte faible → ${choix.rang}${choix.couleur}`)
      return choix
    }

    // Priorité 2 : cartes en double (même rang présent 2+ fois en main)
    // → sacrifier un doublon plutôt qu'une carte unique potentiellement utile
    const rangsEnMain: Record<string, Carte[]> = {}
    for (const carte of candidats) {
      if (!carte.estJoker) {
        const key = carte.rang
        if (!rangsEnMain[key]) rangsEnMain[key] = []
        rangsEnMain[key].push(carte)
      }
    }
    const doublons = Object.values(rangsEnMain)
      .filter(groupe => groupe.length >= 2)
      .flat()
    if (doublons.length > 0) {
      // Parmi les doublons, jouer celui avec le rang le plus faible
      const choix = carteAvecRangMinimal(doublons)
      logger.debug('IA', `Pré-atout — doublon → ${choix.rang}${choix.couleur}`)
      return choix
    }

    // Priorité 3 : éviter les Dames et Rois UNIQUES (potentiel mariage atout)
    // Un doublon de Dame/Roi peut être sacrifié (priorité 2 déjà passée).
    // Ici on exclut seulement les exemplaires uniques.
    const RANGS_MARIAGE: Carte['rang'][] = ['Q', 'K']
    const rangsDupliques = new Set(
      Object.entries(rangsEnMain)
        .filter(([, groupe]) => groupe.length >= 2)
        .map(([rang]) => rang)
    )
    const sansMariageUniques = candidats.filter(
      c => !c.estJoker && !(RANGS_MARIAGE.includes(c.rang) && !rangsDupliques.has(c.rang))
    )
    if (sansMariageUniques.length > 0) {
      const choix = carteAvecRangMinimal(sansMariageUniques)
      logger.debug('IA', `Pré-atout — éviter Dame/Roi unique → ${choix.rang}${choix.couleur}`)
      return choix
    }

    // Aucune alternative → fallback complet (laisser le niveau décider)
    return null
  }

  // ── Cas B : atout défini → préserver les cartes d'atout ──────
  // Retourner null ici : chaque niveau gère déjà l'évitement des atouts
  // via sa logique d'ouverture normale (non-brisque, non-utile, minimal).
  // Aucune intervention nécessaire.
  return null
}

/**
 * Si la carte ouverte est un 10, tente de trouver la meilleure
 * réponse selon la stratégie "couper le 10".
 * Retourne null si aucune règle ne s'applique (→ fallback).
 */
function strategieCouper10(
  candidats: Carte[],
  carteOuverte: Carte,
  state: GameState
): Carte | null {
  if (carteOuverte.rang !== '10') return null

  const couleurAtout = state.couleurAtout
  const ia = state.joueurs[1]
  const estAtout = couleurAtout !== null && carteOuverte.couleur === couleurAtout
  const piocheRestante = state.pioche.length

  // ── Cas B : 10 d'atout ──────────────────────────────────────
  if (estAtout && couleurAtout) {
    const asAtout = candidats.filter(
      c => !c.estJoker && c.rang === 'A' && c.couleur === couleurAtout
    )
    if (asAtout.length > 1) {
      // Plusieurs As d'atout → sacrifier le moins "rare" (le premier trouvé)
      logger.debug('IA', `Couper10-atout: plusieurs As d'atout → jouer un As atout`)
      return asAtout[0]
    }
    if (asAtout.length === 1 && piocheRestante <= 2) {
      // Un seul As d'atout mais pioche quasi-vide → jouer cet As
      logger.debug('IA', `Couper10-atout: As unique + pioche=${piocheRestante} → jouer As atout`)
      return asAtout[0]
    }
    return null // Fallback
  }

  // ── Cas A : 10 NON-atout ────────────────────────────────────
  const couleur10 = carteOuverte.couleur

  // 1. As de même couleur dans les étalées
  const asEtalees = ia.cartesEtalees.filter(
    c => !c.estJoker && c.rang === 'A' && c.couleur === couleur10
  )
  if (asEtalees.length > 0) {
    // Vérifier que cette carte est bien dans les candidats (jouable)
    const asJouable = candidats.find(c => c.id === asEtalees[0].id)
    if (asJouable) {
      logger.debug('IA', `Couper10: As ${couleur10} depuis étalées → ${asJouable.id}`)
      return asJouable
    }
  }

  // 2. As de même couleur en main
  const asMain = ia.main.filter(
    c => !c.estJoker && c.rang === 'A' && c.couleur === couleur10
  )
  const asMainJouable = asMain.find(c => candidats.some(cand => cand.id === c.id))
  if (asMainJouable) {
    logger.debug('IA', `Couper10: As ${couleur10} depuis main → ${asMainJouable.id}`)
    return asMainJouable
  }

  // 3. La plus faible carte d'atout qui bat réellement le 10 (si atout défini)
  // On utilise resoudrePli pour être cohérent avec le moteur de jeu.
  // Un atout bat toujours un non-atout, donc tous les atouts sont candidats.
  // On prend néanmoins le plus faible pour économiser les atouts précieux.
  if (couleurAtout) {
    const atoutsGagnants = candidatsGagnants(
      candidats.filter(c => !c.estJoker && c.couleur === couleurAtout),
      carteOuverte,
      couleurAtout,
      1  // l'IA (J1) répond
    )
    if (atoutsGagnants.length > 0) {
      const plusFaible = atoutsGagnants.reduce((min, c) =>
        ORDRE_RANGS[c.rang] < ORDRE_RANGS[min.rang] ? c : min
      )
      logger.debug('IA', `Couper10: atout gagnant le plus faible → ${plusFaible.rang}${plusFaible.couleur}`)
      return plusFaible
    }
  }

  return null // Fallback algorithme existant
}

// ============================================================
// Helpers — Cartes utiles aux combis de l'IA
// ============================================================

function cartesUtilesAuxCombis(state: GameState, joueurId: 0 | 1): Set<string> {
  const utiles = new Set<string>()
  const ia = state.joueurs[joueurId]
  const toutes = [...ia.main, ...ia.cartesEtalees]
  const couleurAtout = state.couleurAtout

  // Rois et Dames de même couleur → mariage potentiel
  const rois  = toutes.filter(c => !c.estJoker && c.rang === 'K')
  const dames = toutes.filter(c => !c.estJoker && c.rang === 'Q')

  for (const roi of rois) {
    if (dames.some(d => d.couleur === roi.couleur)) {
      utiles.add(roi.id)
      dames.filter(d => d.couleur === roi.couleur).forEach(d => utiles.add(d.id))
    }
  }

  // Dame♠ + Valet♦ → bésigue
  const damesSpades   = toutes.filter(c => !c.estJoker && c.rang === 'Q' && c.couleur === 'spades')
  const valetsDiamonds = toutes.filter(c => !c.estJoker && c.rang === 'J' && c.couleur === 'diamonds')
  if (damesSpades.length > 0 && valetsDiamonds.length > 0) {
    damesSpades.forEach(c => utiles.add(c.id))
    valetsDiamonds.forEach(c => utiles.add(c.id))
  }

  // Cartes d'atout pour quinte (As, 10, Valet atout)
  if (couleurAtout) {
    const asAtout    = toutes.filter(c => !c.estJoker && c.couleur === couleurAtout && c.rang === 'A')
    const dixAtout   = toutes.filter(c => !c.estJoker && c.couleur === couleurAtout && c.rang === '10')
    const valetAtout = toutes.filter(c => !c.estJoker && c.couleur === couleurAtout && c.rang === 'J')
    if (asAtout.length > 0 && dixAtout.length > 0 && valetAtout.length > 0) {
      asAtout.forEach(c => utiles.add(c.id))
      dixAtout.forEach(c => utiles.add(c.id))
      valetAtout.forEach(c => utiles.add(c.id))
    }
  }

  // Rangs proches du carré (3+ cartes du même rang)
  const parRang: Record<string, Carte[]> = {}
  for (const carte of toutes) {
    if (!carte.estJoker) {
      const k = carte.rang
      parRang[k] = parRang[k] ?? []
      parRang[k].push(carte)
    }
  }
  for (const rang of ['A','K','Q','J'] as const) {
    if ((parRang[rang] ?? []).length >= 3) {
      parRang[rang].forEach(c => utiles.add(c.id))
    }
  }

  return utiles
}

// ============================================================
// Helpers — logique de pli
// ============================================================

function valeurBrisque(carte: Carte): number {
  return VALEURS_BRISQUES[carte.rang]
}

/**
 * Retourne les cartes de `candidats` qui gagnent contre `carteOuverte`
 * selon les règles du Joker IT-6 :
 *  - Joker en réponse → perd TOUJOURS (règle 1)
 *  - Carte atout en réponse → gagne sur tout sauf atout plus fort
 *  - Carte normale en réponse → gagne si même couleur + rang supérieur
 */
function candidatsGagnants(
  candidats: Carte[],
  carteOuverte: Carte,
  couleurAtout: Couleur | null,
  joueurReponse: 0 | 1
): Carte[] {
  const joueurOuvreur: 0 | 1 = joueurReponse === 0 ? 1 : 0

  return candidats.filter(carteReponse => {
    // Simuler le pli avec cette carte en réponse
    const [c0, c1] = joueurReponse === 0
      ? [carteReponse, carteOuverte]
      : [carteOuverte, carteReponse]
    const { vainqueur } = resoudrePli(c0, c1, joueurOuvreur, couleurAtout)
    return vainqueur === joueurReponse
  })
}

function carteAvecRangMinimal(cartes: Carte[]): Carte {
  return cartes.reduce((min, c) =>
    ORDRE_RANGS[c.rang] < ORDRE_RANGS[min.rang] ? c : min
  )
}

function carteAvecRangMaximal(cartes: Carte[]): Carte {
  return cartes.reduce((max, c) =>
    ORDRE_RANGS[c.rang] > ORDRE_RANGS[max.rang] ? c : max
  )
}
