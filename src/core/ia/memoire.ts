// ============================================================
// MÉMORISATION IA — Comptage de cartes par déduction/élimination
// ============================================================
//
// Principe : l'IA ne lit JAMAIS directement state.pioche ni la main de
// l'adversaire. Elle déduit l'ensemble exact des cartes non encore
// jouées par élimination :
//
//   cartes non vues = univers total (4 jeux)
//                    − cartes jouées (pileRemportee J0 + J1)
//                    − cartes étalées (J0 + J1)
//                    − cartes du pli en cours (posées, pas encore résolues)
//                    − main du joueur qui « sait » (par défaut l'IA, J1)
//
// Ce reliquat est un ensemble d'identités de cartes connu avec CERTITUDE
// (pas une estimation probabiliste). Il est physiquement réparti entre
// la pioche et la main de l'adversaire, sans que l'IA sache laquelle
// est où — seul le compte total par rang/couleur est exact.
// ============================================================

import type { Carte, Couleur, GameState, Rang } from '../../types'
import { COULEURS, RANGS, NB_JEUX } from '../deck'

// ── Structures ───────────────────────────────────────────────

export interface CompteCouleurRang {
  couleur: Couleur
  rang: Rang
  quantiteNonVue: number // 0..NB_JEUX
}

// ── Rassembler les cartes déjà jouées / étalées / au pli ───────

/**
 * Cartes que TOUT LE MONDE peut voir sur la table : remportées, étalées,
 * ou posées dans le pli en cours (pas encore résolu). N'inclut PAS la
 * main d'un joueur — ce n'est pas encore « joué ».
 */
export function cartesConnuesJouees(state: GameState): Carte[] {
  const { joueurs, pliEnCours } = state
  return [
    ...joueurs[0].pileRemportee,
    ...joueurs[1].pileRemportee,
    ...joueurs[0].cartesEtalees,
    ...joueurs[1].cartesEtalees,
    ...(pliEnCours.carteJoueur0 ? [pliEnCours.carteJoueur0] : []),
    ...(pliEnCours.carteJoueur1 ? [pliEnCours.carteJoueur1] : []),
  ]
}

// ── Cartes non vues (par déduction) ─────────────────────────────

/**
 * Ensemble exact des cartes non encore jouées, du point de vue de
 * `joueurId` (par défaut 1 = IA) : réparties entre la pioche et la
 * main de l'adversaire, sans distinction possible entre les deux.
 *
 * Les Jokers SONT comptabilisés (rang 'JOKER', 1 seul exemplaire par
 * couleur — il y en a 4 au total dans le deck). Savoir combien il en
 * reste non vus est utile : un Joker peut compléter un carré normal
 * (4-de-même-rang) plus tard dans la manche.
 */
export function cartesNonVues(state: GameState, joueurId: 0 | 1 = 1): CompteCouleurRang[] {
  const univers = new Map<string, number>()
  for (const couleur of COULEURS) {
    for (const rang of RANGS) {
      univers.set(`${couleur}|${rang}`, NB_JEUX)
    }
    univers.set(`${couleur}|JOKER`, 1) // 1 seul Joker par couleur dans le deck
  }

  const connues = [
    ...cartesConnuesJouees(state),
    ...state.joueurs[joueurId].main,
  ]

  for (const carte of connues) {
    const cle = `${carte.couleur}|${carte.rang}`
    const restant = univers.get(cle)
    if (restant !== undefined) univers.set(cle, Math.max(0, restant - 1))
  }

  const resultat: CompteCouleurRang[] = []
  for (const couleur of COULEURS) {
    for (const rang of RANGS) {
      resultat.push({ couleur, rang, quantiteNonVue: univers.get(`${couleur}|${rang}`) ?? 0 })
    }
    resultat.push({ couleur, rang: 'JOKER', quantiteNonVue: univers.get(`${couleur}|JOKER`) ?? 0 })
  }
  return resultat
}

/** Quantité non vue pour un rang/couleur précis (raccourci de lecture). */
export function quantiteNonVue(state: GameState, rang: Rang, couleur: Couleur, joueurId: 0 | 1 = 1): number {
  return cartesNonVues(state, joueurId).find(c => c.rang === rang && c.couleur === couleur)?.quantiteNonVue ?? 0
}

/** Nombre total de Jokers non vus (sur 4), toutes couleurs confondues. */
export function jokersNonVus(state: GameState, joueurId: 0 | 1 = 1): number {
  return cartesNonVues(state, joueurId)
    .filter(c => c.rang === 'JOKER')
    .reduce((total, c) => total + c.quantiteNonVue, 0)
}

// ── Brisques non vues restantes (total, toutes couleurs) ───────

/**
 * Nombre de brisques (As + 10) encore non vues (donc potentiellement
 * gagnables par l'IA — en pioche ou en main adverse).
 */
export function brisquesNonVuesRestantes(state: GameState, joueurId: 0 | 1 = 1): number {
  return cartesNonVues(state, joueurId)
    .filter(c => c.rang === 'A' || c.rang === '10')
    .reduce((total, c) => total + c.quantiteNonVue, 0)
}

// ── Brisques déjà jouées, par couleur non-atout ─────────────────

/**
 * Pour chaque couleur : nombre de brisques (As + 10) déjà réellement
 * JOUÉES (remportées, étalées, ou posées dans le pli en cours) —
 * ne compte PAS les cartes encore en main de l'IA (celles-ci ne sont
 * pas « jouées »).
 *
 * Utile pour choisir, en ouverture une fois l'atout déclaré, la couleur
 * non-atout la plus « épuisée » en brisques (règle b.2).
 */
export function brisquesJoueesParCouleur(state: GameState): Record<Couleur, number> {
  const compte: Record<Couleur, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 }
  for (const carte of cartesConnuesJouees(state)) {
    if (carte.estJoker) continue
    if (carte.rang === 'A' || carte.rang === '10') {
      compte[carte.couleur] += 1
    }
  }
  return compte
}

// ── Atteignabilité d'une combinaison en cours de constitution ───

export interface BesoinCombinaison {
  rang: Rang
  /** Couleur précise requise (carré d'atout) ; absente = toutes couleurs (carré normal). */
  couleur?: Couleur
  quantiteRequise: number
  quantitePresente: number
}

/**
 * Vérifie qu'une combinaison partiellement constituée (ex. 3 As sur 4)
 * reste mathématiquement atteignable : les cartes manquantes doivent
 * encore exister dans le reliquat non vu.
 *
 * - `couleur` fournie → carré d'atout (une seule couleur précise, sans Joker).
 * - `couleur` absente → carré normal (toutes couleurs confondues).
 */
export function combinaisonEncoreAtteignable(
  state: GameState,
  besoin: BesoinCombinaison,
  joueurId: 0 | 1 = 1
): boolean {
  const manquant = besoin.quantiteRequise - besoin.quantitePresente
  if (manquant <= 0) return true

  if (besoin.couleur) {
    return quantiteNonVue(state, besoin.rang, besoin.couleur, joueurId) >= manquant
  }

  const disponible = COULEURS.reduce(
    (total, couleur) => total + quantiteNonVue(state, besoin.rang, couleur, joueurId),
    0
  )
  return disponible >= manquant
}
