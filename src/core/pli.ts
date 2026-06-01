// ============================================================
// MOTEUR DE PLI
// : Règles du pli (phase libre et finale)
// ============================================================

import type { Carte, Couleur, GameState } from '../types'
import { ORDRE_RANGS } from '../types'
import { logger } from '../utils/logger'

// ============================================================
// Déterminer le vainqueur d'un pli
// ============================================================

export interface ResultatPliResolu {
 vainqueur: 0 | 1
 raison: string
}

export function resoudrePli(
 carteJ0: Carte,
 carteJ1: Carte,
 joueurOuvreur: 0 | 1,
 couleurAtout: Couleur | null
): ResultatPliResolu {

 // ── Règles du Joker (priorité absolue, avant toute autre règle) ───────────
 //
 // Basées sur QUI JOUE EN PREMIER (l'ouvreur) :
 //
 // 1) Joker joué EN SECOND (réponse) → le joueur qui a joué EN PREMIER gagne
 // (quelle que soit la carte ouverte, atout ou non)
 //
 // 2) Joker joué EN PREMIER (ouverture) :
 // - Si la réponse est un ATOUT → l'atout gagne (le joueur qui répond gagne)
 // - Si la réponse est une carte NON-ATOUT → le Joker gagne (l'ouvreur gagne)
 // - Si la réponse est aussi un Joker → l'ouvreur gagne (Joker vs Joker)

 const ouvreurEstJ0 = joueurOuvreur === 0
 const carteOuverte = ouvreurEstJ0 ? carteJ0 : carteJ1
 const carteReponse = ouvreurEstJ0 ? carteJ1 : carteJ0
 const joueurReponse: 0 | 1 = ouvreurEstJ0 ? 1 : 0

 // Cas Joker vs Joker (les deux jouent Joker) → ouvreur gagne
 if (carteOuverte.estJoker && carteReponse.estJoker) {
 logger.debug('PLI', 'Joker vs Joker → ouvreur gagne', { joueurOuvreur })
 return { vainqueur: joueurOuvreur, raison: 'Joker vs Joker → ouvreur garde la main' }
 }

 // Règle 1 : Joker joué EN SECOND → l'ouvreur (carte normale) gagne toujours
 if (carteReponse.estJoker && !carteOuverte.estJoker) {
 return {
 vainqueur: joueurOuvreur,
 raison: `Joker joué en second par J${joueurReponse} → ouvreur J${joueurOuvreur} gagne (règle 1)`,
 }
 }

 // Règle 2 : Joker joué EN PREMIER (ouverture)
 if (carteOuverte.estJoker && !carteReponse.estJoker) {
 const reponseEstAtout = couleurAtout !== null && carteReponse.couleur === couleurAtout
 if (reponseEstAtout) {
 // Atout en réponse bat le Joker
 return {
 vainqueur: joueurReponse,
 raison: `Atout J${joueurReponse} bat Joker ouvreur J${joueurOuvreur} (règle 2a)`,
 }
 } else {
 // Non-atout en réponse → Joker ouvreur gagne
 return {
 vainqueur: joueurOuvreur,
 raison: `Joker ouvreur J${joueurOuvreur} bat non-atout J${joueurReponse} (règle 2b)`,
 }
 }
 }

 // ── Aucun Joker impliqué → règles classiques ──────────────────────────────
 if (!couleurAtout) {
 return resoudreSansAtout(carteJ0, carteJ1, joueurOuvreur)
 }
 return resoudreAvecAtout(carteJ0, carteJ1, joueurOuvreur, couleurAtout)
}

function resoudreSansAtout(
 carteJ0: Carte,
 carteJ1: Carte,
 joueurOuvreur: 0 | 1,
): ResultatPliResolu {
 // Ici : aucun Joker (traité en amont), pas d'atout défini
 // Même couleur → rang le plus fort
 if (carteJ0.couleur === carteJ1.couleur) {
 const r0 = ORDRE_RANGS[carteJ0.rang]
 const r1 = ORDRE_RANGS[carteJ1.rang]
 if (r0 > r1) return { vainqueur: 0, raison: `J0 rang ${carteJ0.rang} > J1 rang ${carteJ1.rang}` }
 if (r1 > r0) return { vainqueur: 1, raison: `J1 rang ${carteJ1.rang} > J0 rang ${carteJ0.rang}` }
 return { vainqueur: joueurOuvreur, raison: 'Égalité de rang → ouvreur garde la main' }
 }
 // Couleurs différentes, pas d'atout → ouvreur gagne
 return { vainqueur: joueurOuvreur, raison: 'Couleurs différentes sans atout → ouvreur gagne' }
}

function resoudreAvecAtout(
 carteJ0: Carte,
 carteJ1: Carte,
 joueurOuvreur: 0 | 1,
 couleurAtout: Couleur
): ResultatPliResolu {
 // Ici : aucun Joker (traité en amont), atout défini
 const j0EstAtout = carteJ0.couleur === couleurAtout
 const j1EstAtout = carteJ1.couleur === couleurAtout

 // Règle 1 : Atout > non-atout
 if (j0EstAtout && !j1EstAtout) return { vainqueur: 0, raison: 'Atout J0 bat non-atout J1' }
 if (j1EstAtout && !j0EstAtout) return { vainqueur: 1, raison: 'Atout J1 bat non-atout J0' }

 // Règle 2 : Atout vs atout → rang le plus fort
 if (j0EstAtout && j1EstAtout) {
 const r0 = ORDRE_RANGS[carteJ0.rang]
 const r1 = ORDRE_RANGS[carteJ1.rang]
 if (r0 > r1) return { vainqueur: 0, raison: `Atout J0 ${carteJ0.rang} > atout J1 ${carteJ1.rang}` }
 if (r1 > r0) return { vainqueur: 1, raison: `Atout J1 ${carteJ1.rang} > atout J0 ${carteJ0.rang}` }
 return { vainqueur: joueurOuvreur, raison: 'Égalité atout → ouvreur garde la main' }
 }

 // Règle 3 : Même couleur non-atout → rang le plus fort
 if (carteJ0.couleur === carteJ1.couleur) {
 const r0 = ORDRE_RANGS[carteJ0.rang]
 const r1 = ORDRE_RANGS[carteJ1.rang]
 if (r0 > r1) return { vainqueur: 0, raison: `J0 ${carteJ0.rang} > J1 ${carteJ1.rang} (même couleur)` }
 if (r1 > r0) return { vainqueur: 1, raison: `J1 ${carteJ1.rang} > J0 ${carteJ0.rang} (même couleur)` }
 return { vainqueur: joueurOuvreur, raison: 'Égalité même couleur → ouvreur garde la main' }
 }

 // Règle 4 : Couleurs différentes, ni atout → ouvreur gagne
 return { vainqueur: joueurOuvreur, raison: 'Couleurs différentes, ni atout → ouvreur gagne' }
}

// ============================================================
// Cartes jouables en phase finale
// Obligation de couleur et de coupe
// ============================================================

export function cartesJouablesPhaseFinale(
 main: Carte[],
 carteOuverte: Carte | null,
 couleurAtout: Couleur | null
): Carte[] {
 if (!carteOuverte) return main.filter(c => !c.estJoker)

 const couleurOuverte = carteOuverte.estJoker ? null : carteOuverte.couleur

 // 1. Essayer de fournir la couleur
 if (couleurOuverte) {
 const memeCouleur = main.filter(c => !c.estJoker && c.couleur === couleurOuverte)
 if (memeCouleur.length > 0) {
 // Parmi celles-ci, couper si possible (carte > carte ouverte)
 const rangOuverte = ORDRE_RANGS[carteOuverte.rang]
 const peutCouper = memeCouleur.filter(c => ORDRE_RANGS[c.rang] > rangOuverte)
 return peutCouper.length > 0 ? peutCouper : memeCouleur
 }
 }

 // 2. Sinon, couper à l'atout
 if (couleurAtout) {
 const atouts = main.filter(c => !c.estJoker && c.couleur === couleurAtout)
 if (atouts.length > 0) return atouts
 }

 // 3. Défausse libre
 return main.filter(c => !c.estJoker)
}

// ============================================================
// Appliquer un pli complet sur le GameState
// ============================================================

export function appliquerPli(state: GameState): GameState {
 const { pliEnCours, couleurAtout } = state
 const { carteJoueur0, carteJoueur1, joueurOuvreur } = pliEnCours

 if (!carteJoueur0 || !carteJoueur1) {
 logger.warn('PLI', 'Tentative de résoudre un pli incomplet')
 return state
 }

 const { vainqueur, raison } = resoudrePli(
 carteJoueur0, carteJoueur1, joueurOuvreur, couleurAtout
)

 logger.info('PLI', `Pli résolu → J${vainqueur} gagne`, { raison, c0: carteJoueur0.id, c1: carteJoueur1.id })

 // Bonus 7 d'atout
 let newState = { ...state }
 if (couleurAtout) {
 if (!carteJoueur0.estJoker && carteJoueur0.rang === '7' && carteJoueur0.couleur === couleurAtout) {
 logger.info('PLI', 'J0 joue le 7 d\'atout → +10 pts')
 newState = ajouterPointsState(newState, 0, 10)
 }
 if (!carteJoueur1.estJoker && carteJoueur1.rang === '7' && carteJoueur1.couleur === couleurAtout) {
 logger.info('PLI', 'J1 joue le 7 d\'atout → +10 pts')
 newState = ajouterPointsState(newState, 1, 10)
 }
 }

 // Ajouter les cartes au pile du vainqueur
 const joueursMaj = [...newState.joueurs] as typeof newState.joueurs
 joueursMaj[vainqueur] = {
 ...joueursMaj[vainqueur],
 pileRemportee: [
 ...joueursMaj[vainqueur].pileRemportee,
 { ...carteJoueur0, faceUp: true },
 { ...carteJoueur1, faceUp: true },
 ],
 }

 // Réinitialiser le pli en cours
 const nouveauPli = {
 carteJoueur0: null,
 carteJoueur1: null,
 joueurOuvreur: vainqueur,
 }

 return {
 ...newState,
 joueurs: joueursMaj,
 pliEnCours: nouveauPli,
 joueurActif: vainqueur,
 dernierVainqueurPli: vainqueur,
 }
}

// ============================================================
// Jouer une carte depuis la main
// ============================================================

export function jouerCarte(
 state: GameState,
 joueurId: 0 | 1,
 carteId: string
): { state: GameState; ok: boolean; erreur?: string } {
 const joueur = state.joueurs[joueurId]
 const carte = joueur.main.find(c => c.id === carteId)
 ?? joueur.cartesEtalees.find(c => c.id === carteId)

 if (!carte) {
 return { state, ok: false, erreur: `Carte ${carteId} introuvable` }
 }

 // Vérifier si c'est bien le tour de ce joueur
 if (state.joueurActif !== joueurId) {
 return { state, ok: false, erreur: `Ce n'est pas le tour de J${joueurId}` }
 }

 // Phase finale : vérifier les cartes jouables (main + étalées)
 if (state.phase === 'finale') {
 const carteOuverte = joueurId === 0
 ? state.pliEnCours.carteJoueur1
 : state.pliEnCours.carteJoueur0
 // Si l'adversaire a déjà joué, vérifier obligation de couleur
 if (carteOuverte) {
 const toutesCartes = [...joueur.main, ...joueur.cartesEtalees]
 const jouables = cartesJouablesPhaseFinale(toutesCartes, carteOuverte, state.couleurAtout)
 if (!jouables.find(c => c.id === carteId)) {
 return { state, ok: false, erreur: 'Carte non jouable en phase finale (obligation de couleur)' }
 }
 }
 }

 // Retirer la carte de la main ou des étalées
 const nouvelleMain = joueur.main.filter(c => c.id !== carteId)
 const nouvellesEtalees = joueur.cartesEtalees.filter(c => c.id !== carteId)
 const carteJouee: Carte = { ...carte, faceUp: true, etat: 'played' }

 const joueursMaj = [...state.joueurs] as typeof state.joueurs
 joueursMaj[joueurId] = { ...joueursMaj[joueurId], main: nouvelleMain, cartesEtalees: nouvellesEtalees }

 // Placer dans le pli
 const nouveauPli = { ...state.pliEnCours }
 if (joueurId === 0) nouveauPli.carteJoueur0 = carteJouee
 else nouveauPli.carteJoueur1 = carteJouee

 // Prochain joueur actif = l'autre (en attendant la résolution)
 const adversaire: 0 | 1 = joueurId === 0 ? 1 : 0
 const pliComplet = nouveauPli.carteJoueur0 !== null && nouveauPli.carteJoueur1 !== null

 logger.info('PLI', `J${joueurId} joue ${carte.rang}${carte.couleur}`, { carteId })

 return {
 state: {
 ...state,
 joueurs: joueursMaj,
 pliEnCours: nouveauPli,
 joueurActif: pliComplet ? state.joueurActif : adversaire,
 },
 ok: true,
 }
}

// ── Utilitaire local ──────────────────────────────────────────

function ajouterPointsState(state: GameState, joueurId: 0 | 1, points: number): GameState {
 const joueursMaj = [...state.joueurs] as typeof state.joueurs
 joueursMaj[joueurId] = {
 ...joueursMaj[joueurId],
 marquePoints: Math.max(0, joueursMaj[joueurId].marquePoints + points),
 }
 return { ...state, joueurs: joueursMaj }
}
