// ============================================================
// TABLE DE CORRESPONDANCE — Valeur espérée des brisques par couleur
// ============================================================
//
// L'ancienne logique de `strategieOuvrirCouleurEpuisee` (b.2) choisissait
// la couleur non-atout où le PLUS de brisques avaient déjà été vues
// (brisquesJoueesParCouleur) : un proxy grossier — "beaucoup jouées" ne
// dit pas directement combien il en reste, seulement combien sont sorties.
//
// Cette table remplace ce proxy par le calcul direct et exact du
// reliquat non vu (via memoire.ts, comptage par élimination sur les
// NB_JEUX exemplaires du deck), pondéré par la probabilité que ce
// reliquat soit en main adverse plutôt qu'en pioche — c'est la vraie
// grandeur qui détermine le risque de se faire contrer par une brisque
// adverse en ouvrant dans cette couleur.
//
// Structure : table de correspondance à plat — Record<Couleur, number>,
// 4 entrées fixes, calculées indépendamment les unes des autres (simple
// map sur les 4 couleurs, aucune dépendance croisée, aucune hiérarchie).
//
// Note de transparence : la probabilité (main adverse / (pioche + main
// adverse)) est une grandeur GLOBALE à l'état de jeu, pas spécifique à
// une couleur — elle multiplie donc les 4 entrées par le MÊME facteur.
// Pour un classement (couleur la plus sûre = valeur minimale), cela ne
// change donc pas l'ORDRE relatif des couleurs par rapport à un simple
// classement sur le reliquat non vu brut : le facteur commun ne peut pas
// inverser un classement. Il reste néanmoins nécessaire pour produire une
// authentique "valeur espérée" (grandeur absolue, réutilisable telle
// quelle ailleurs — comparaison à un seuil, combinaison avec d'autres
// termes, etc.), conformément à la demande, et non un simple comptage.
// ============================================================

import type { Couleur, GameState } from '../../types'
import { COULEURS } from '../deck'
import { quantiteNonVue } from './memoire'

export type ValeurEspereeBrisque = number

/**
 * Calcule la valeur espérée (nombre attendu) de brisques (As+10) de
 * `couleur` actuellement en main adverse plutôt qu'en pioche — la
 * grandeur qui détermine le risque de se faire contrer si l'IA ouvre
 * dans cette couleur. Fonction pure, indépendante des autres couleurs.
 */
export function calculerValeurEspereeBrisque(
  state: GameState,
  couleur: Couleur,
  joueurId: 0 | 1 = 1
): ValeurEspereeBrisque {
  const adversaireId: 0 | 1 = joueurId === 1 ? 0 : 1
  const pioche = state.pioche.length
  const mainAdverse = state.joueurs[adversaireId].main.length
  const total = pioche + mainAdverse
  // Hypothèse (confirmée) : répartition uniforme aléatoire des cartes
  // non vues entre pioche et main adverse — aucune autre information
  // ne permet de départager, cf. principe de memoire.ts.
  const probabiliteMainAdverse = total > 0 ? mainAdverse / total : 0

  const nonVuesAs = quantiteNonVue(state, 'A', couleur, joueurId)
  const nonVues10 = quantiteNonVue(state, '10', couleur, joueurId)

  return (nonVuesAs + nonVues10) * probabiliteMainAdverse
}

/**
 * Table complète : une entrée par couleur, chacune calculée
 * indépendamment (map/reduce à plat sur les 4 couleurs).
 */
export function calculerTableBrisques(
  state: GameState,
  joueurId: 0 | 1 = 1
): Record<Couleur, ValeurEspereeBrisque> {
  const table = {} as Record<Couleur, ValeurEspereeBrisque>
  for (const couleur of COULEURS) {
    table[couleur] = calculerValeurEspereeBrisque(state, couleur, joueurId)
  }
  return table
}

/**
 * Parmi un sous-ensemble de couleurs candidates, retient celle(s) à la
 * valeur espérée MINIMALE (couleur la plus sûre à ouvrir — le moins de
 * risque qu'une brisque adverse restante y traîne). Retourne TOUTES les
 * couleurs à égalité (pas d'arbitrage arbitraire), à charge de l'appelant
 * de départager ensuite sur un autre critère (ex. rang de carte minimal) —
 * comportement historique de `strategieOuvrirCouleurEpuisee` préservé.
 */
export function couleursLesPlusSuresAOuvrir(
  state: GameState,
  candidates: Couleur[],
  joueurId: 0 | 1 = 1
): Couleur[] {
  if (candidates.length === 0) return []
  const table = calculerTableBrisques(state, joueurId)
  const valeurMinimale = Math.min(...candidates.map(cl => table[cl]))
  return candidates.filter(cl => table[cl] === valeurMinimale)
}
