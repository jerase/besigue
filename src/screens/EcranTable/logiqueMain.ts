// ============================================================
// LOGIQUE PURE — ordre d'affichage de la main du joueur humain
// ============================================================
//
// Fonctions pures, sans dépendance React, testables indépendamment du
// rendu et du glisser-déposer.

import type { Carte } from '../../types'
import { ORDRE_RANGS } from '../../types'

// ── Ordre d'affichage libre (glisser-déposer) ───────────────────
//
// Le joueur peut glisser-déposer ses cartes pour les réorganiser à sa
// convenance (ex. rapprocher deux cartes d'une combinaison en préparation).
// Cet ordre est purement un confort d'affichage : il ne touche jamais à
// state.joueurs[0].main (dont l'ordre n'a aucune incidence sur les règles
// du jeu — recherche systématique par id, cf. core/pli.ts, core/combinaisons.ts).
//
// `reconcilierOrdreMain` réconcilie l'ordre choisi par le joueur avec le
// contenu réel de sa main à chaque changement (pioche, carte jouée,
// carte étalée) :
//   - les cartes toujours en main conservent leur position relative choisie
//   - les cartes qui ont quitté la main (jouées / étalées) disparaissent
//   - les cartes nouvellement arrivées (pioche, nouvelle manche) sont
//     ajoutées à la fin, dans leur ordre naturel de distribution
export function reconcilierOrdreMain(ordrePrecedent: string[], main: Carte[]): string[] {
 const idsActuels = main.map(c => c.id)
 const presentsActuellement = new Set(idsActuels)

 const conserves = ordrePrecedent.filter(id => presentsActuellement.has(id))
 const dejaConserves = new Set(conserves)
 const nouveaux = idsActuels.filter(id => !dejaConserves.has(id))

 return [...conserves, ...nouveaux]
}

// ── Tri automatique de la main ──────────────────────────────────
//
// Répond au besoin sous-jacent le plus fréquent (« je veux regrouper mes
// cartes ») sans nécessiter le moindre geste fin — utile en complément du
// glisser-déposer, en particulier sur petit écran où un réarrangement
// carte par carte est plus coûteux.
//
// Regroupe par couleur puis, à l'intérieur d'une couleur, du rang le plus
// fort au plus faible (ORDRE_RANGS, déjà utilisé ailleurs dans le moteur
// de jeu — cf. src/types/index.ts). L'ordre des couleurs est une simple
// convention d'affichage (pique, cœur, trèfle, carreau) sans signification
// pour les règles.
export const ORDRE_COULEURS_TRI: Record<Carte['couleur'], number> = {
 spades: 0, hearts: 1, clubs: 2, diamonds: 3,
}

/** Trie une main par couleur puis par rang décroissant. Fonction pure. */
export function trierMain(main: Carte[]): Carte[] {
 return [...main].sort((a, b) => {
 if (a.couleur !== b.couleur) {
 return ORDRE_COULEURS_TRI[a.couleur] - ORDRE_COULEURS_TRI[b.couleur]
 }
 return ORDRE_RANGS[b.rang] - ORDRE_RANGS[a.rang]
})
}
