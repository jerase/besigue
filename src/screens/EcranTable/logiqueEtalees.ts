// ============================================================
// LOGIQUE PURE — groupement des cartes étalées
// ============================================================
//
// Fonction pure, sans dépendance React : regroupe les cartes étalées d'un
// joueur pour l'affichage (paires de mariage / bésigue superposées, cartes
// isolées séparées). N'affecte jamais l'état du jeu — c'est une pure
// projection d'affichage à partir de state.joueurs[i].cartesEtalees et de
// state.annonces.

import type { Carte, AnnoncePosee } from '../../types'
import type { GroupeEtalee } from './types'

/**
 * Groupe les cartes étalées d'un joueur :
 * - paires de mariage (roi + dame) → superposées
 * - paires de bésigue (dame♠ + valet♦) → superposées
 * - toutes les autres cartes → isolées
 */
export function grouperCartesEtalees(
 cartesEtalees: Carte[],
 annonces: AnnoncePosee[],
 joueurId: 0 | 1
): GroupeEtalee[] {
 // --- Paires de mariage : [roiId, dameId]
 const pairesMarriage = annonces
 .filter(a =>
 a.joueurId === joueurId &&
 (a.nom === 'mariage_atout' || a.nom === 'mariage_hors_atout') &&
 a.cartesIds.length === 2
)
 .map(a => ({ roiId: a.cartesIds[0], dameId: a.cartesIds[1] }))

 // --- Paires de bésigue : [dameId, valetId] (ordre défini dans detecterBesigue)
 const pairesBesigue = annonces
 .filter(a =>
 a.joueurId === joueurId &&
 a.nom === 'besigue' &&
 a.cartesIds.length === 2
)
 .map(a => ({ dameId: a.cartesIds[0], valetId: a.cartesIds[1] }))

 const dejaGroupees = new Set<string>()
 const groupes: GroupeEtalee[] = []

 for (const carte of cartesEtalees) {
 if (dejaGroupees.has(carte.id)) continue

 // 1. Chercher un mariage
 const paireMariage = pairesMarriage.find(
 p => p.roiId === carte.id || p.dameId === carte.id
)
 if (paireMariage) {
 const autreId = paireMariage.roiId === carte.id ? paireMariage.dameId : paireMariage.roiId
 const autreCarte = cartesEtalees.find(c => c.id === autreId)
 if (autreCarte && !dejaGroupees.has(autreCarte.id)) {
 const roi = carte.rang === 'K' ? carte : autreCarte
 const dame = carte.rang === 'Q' ? carte : autreCarte
 groupes.push({ type: 'mariage', roi, dame })
 dejaGroupees.add(roi.id)
 dejaGroupees.add(dame.id)
 continue
 }
 }

 // 2. Chercher un bésigue
 const paireBesigue = pairesBesigue.find(
 p => p.dameId === carte.id || p.valetId === carte.id
)
 if (paireBesigue) {
 const autreId = paireBesigue.dameId === carte.id ? paireBesigue.valetId : paireBesigue.dameId
 const autreCarte = cartesEtalees.find(c => c.id === autreId)
 if (autreCarte && !dejaGroupees.has(autreCarte.id)) {
 const dame = carte.rang === 'Q' ? carte : autreCarte
 const valet = carte.rang === 'J' ? carte : autreCarte
 groupes.push({ type: 'besigue', dame, valet })
 dejaGroupees.add(dame.id)
 dejaGroupees.add(valet.id)
 continue
 }
 }

 // 3. Carte isolée
 groupes.push({ type: 'seule', carte })
 dejaGroupees.add(carte.id)
 }

 return groupes
}
