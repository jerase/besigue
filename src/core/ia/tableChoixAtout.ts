// ============================================================
// TABLE DE DÉCISION — Choix de la couleur d'atout
// ============================================================
//
// Quand l'IA détient plusieurs mariages potentiels (Roi+Dame de
// couleurs différentes) et que l'atout n'est pas encore fixé, le
// code existant retenait la première couleur détectée par
// `detecterMariages` (ordre fixe spades>hearts>diamonds>clubs),
// sans rapport avec la valeur réelle de chaque couleur pour l'IA.
//
// Ce module calcule une ligne de score PAR couleur candidate et
// retient la ligne au score maximal.
//
// Structure : table de décision plate — { couleur, score }[],
// triée une fois. Chaque ligne se calcule indépendamment des
// autres (aucune récursion, aucune relation inter-lignes) :
// testable une par une.
//
// Utilisée par :
//  - couleurMariagePotentielNonAnnonce (strategies-avancees.ts)
//  - choisirAnnonceIA, niveaux intermédiaire et difficile (index.ts)
// afin que les deux convergent systématiquement vers la même
// couleur "gagnante".
// ============================================================

import type { Couleur, GameState, CombinaisonDisponible, Rang } from '../../types'
import { COULEURS } from '../deck'
import { combinaisonEncoreAtteignable } from './memoire'
import {
  POIDS_ATOUT_EN_MAIN_CHOIX_ATOUT,
  BONUS_QUINTE_ATTEIGNABLE_CHOIX_ATOUT,
  POIDS_BRISQUE_EN_MAIN_CHOIX_ATOUT,
} from '../ia.config'

export interface LigneChoixAtout {
  couleur: Couleur
  score: number
}

const RANGS_QUINTE: Rang[] = ['A', '10', 'J']

/**
 * Calcule la ligne de score d'UNE SEULE couleur candidate. Fonction
 * pure, ne lit ni ne dépend du résultat des autres couleurs —
 * testable isolément, conformément à la contrainte "table plate".
 *
 * 3 facteurs :
 *  1. Nombre d'atouts en main (cartes de cette couleur déjà tenues) :
 *     contrôle futur des plis une fois cette couleur déclarée atout.
 *  2. Quinte atteignable : As+10+Valet de cette couleur, chacun déjà
 *     en main ou encore mathématiquement disponible (non vu).
 *  3. Brisques (As/10) de cette couleur déjà tenues en main : gain de
 *     points sûr, à la différence des cartes non vues (probabilité).
 */
export function calculerLigneChoixAtout(
  state: GameState,
  couleur: Couleur,
  joueurId: 0 | 1 = 1
): LigneChoixAtout {
  const joueur = state.joueurs[joueurId]
  const cartesCouleur = [...joueur.main, ...joueur.cartesEtalees]
    .filter(c => !c.estJoker && c.couleur === couleur)

  // 1. Atouts en main
  const atoutsEnMain = cartesCouleur.length

  // 2. Quinte atteignable
  const quinteAtteignable = RANGS_QUINTE.every(rang => {
    const quantitePresente = cartesCouleur.filter(c => c.rang === rang).length
    return combinaisonEncoreAtteignable(
      state,
      { rang, couleur, quantiteRequise: 1, quantitePresente },
      joueurId
    )
  })

  // 3. Brisques déjà sûres en main
  const brisquesEnMain = cartesCouleur.filter(c => c.rang === 'A' || c.rang === '10').length

  const score =
    atoutsEnMain * POIDS_ATOUT_EN_MAIN_CHOIX_ATOUT +
    (quinteAtteignable ? BONUS_QUINTE_ATTEIGNABLE_CHOIX_ATOUT : 0) +
    brisquesEnMain * POIDS_BRISQUE_EN_MAIN_CHOIX_ATOUT

  return { couleur, score }
}

/**
 * Table complète : une ligne par couleur du jeu, triée une fois par
 * score décroissant. À égalité de score, l'ordre canonique des
 * couleurs (spades>hearts>diamonds>clubs, cf. COULEURS) départage —
 * comportement déterministe.
 */
export function calculerTableChoixAtout(
  state: GameState,
  joueurId: 0 | 1 = 1
): LigneChoixAtout[] {
  return COULEURS
    .map(couleur => calculerLigneChoixAtout(state, couleur, joueurId))
    .sort((a, b) => b.score - a.score)
}

/**
 * Retient, parmi un sous-ensemble de couleurs réellement candidates
 * (celles qui ont effectivement un mariage potentiel disponible),
 * celle au score maximal dans la table. Retourne null si `candidates`
 * est vide.
 */
export function meilleureCouleurAtout(
  state: GameState,
  candidates: Couleur[],
  joueurId: 0 | 1 = 1
): Couleur | null {
  if (candidates.length === 0) return null
  const table = calculerTableChoixAtout(state, joueurId)
  const ligneRetenue = table.find(ligne => candidates.includes(ligne.couleur))
  return ligneRetenue ? ligneRetenue.couleur : candidates[0]
}

/**
 * Parmi une liste de combinaisons disponibles, retient la meilleure
 * combinaison `mariage_atout` selon la table de décision — au lieu
 * du premier trouvé par ordre de détection. S'il n'y a qu'un seul
 * candidat `mariage_atout` (ou aucun), le comportement est inchangé
 * (retourne ce candidat unique, ou null).
 *
 * Centralise ici la correspondance carte→couleur pour chaque combi,
 * afin que `couleurMariagePotentielNonAnnonce` (strategies-avancees.ts)
 * et `choisirAnnonceIA` (index.ts, niveaux intermédiaire et difficile)
 * convergent systématiquement vers la même couleur.
 */
export function meilleureCombiMariageAtout(
  combis: CombinaisonDisponible[],
  state: GameState,
  joueurId: 0 | 1 = 1
): CombinaisonDisponible | null {
  const mariagesAtout = combis.filter(c => c.nom === 'mariage_atout')
  if (mariagesAtout.length === 0) return null
  if (mariagesAtout.length === 1) return mariagesAtout[0]

  const joueur = state.joueurs[joueurId]
  const toutesCartes = [...joueur.main, ...joueur.cartesEtalees]

  const combiParCouleur = new Map<Couleur, CombinaisonDisponible>()
  for (const combi of mariagesAtout) {
    const carte = toutesCartes.find(c => combi.cartesIds.includes(c.id))
    if (carte && !combiParCouleur.has(carte.couleur)) {
      combiParCouleur.set(carte.couleur, combi)
    }
  }

  const table = calculerTableChoixAtout(state, joueurId)
  for (const ligne of table) {
    const combi = combiParCouleur.get(ligne.couleur)
    if (combi) return combi
  }

  // Repli défensif (ex. cartesIds ne correspondent à aucune carte réelle,
  // cas de tests synthétiques) : comportement historique, premier trouvé.
  return mariagesAtout[0]
}
