// ============================================================
// TYPES +
// ============================================================

export type Couleur = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Rang = 'A' | '10' | 'K' | 'Q' | 'J' | '9' | '8' | '7' | 'JOKER'
export type ValeurBrisque = 0 | 1
export type EtatCarte = 'faceDown' | 'faceUp' | 'selected' | 'highlighted' | 'disabled' | 'played'

export interface Carte {
 id: string
 couleur: Couleur
 rang: Rang
 jeuIndex: number
 estJoker: boolean
 faceUp: boolean
 etat: EtatCarte
}

export interface Deck {
 cartes: Carte[]
 graine: number
}

export const ORDRE_RANGS: Record<Rang, number> = {
 'A': 8, '10': 7, 'K': 6, 'Q': 5, 'J': 4, '9': 3, '8': 2, '7': 1, 'JOKER': 0,
}

export const VALEURS_BRISQUES: Record<Rang, ValeurBrisque> = {
 'A': 1, '10': 1, 'K': 0, 'Q': 0, 'J': 0, '9': 0, '8': 0, '7': 0, 'JOKER': 0,
}

export const NOM_COULEUR: Record<Couleur, string> = {
 spades: '♠ Pique', hearts: '♥ Cœur', diamonds: '♦ Carreau', clubs: '♣ Trèfle',
}

export const NOM_RANG: Record<Rang, string> = {
 'A': 'As', '10': 'Dix', 'K': 'Roi', 'Q': 'Dame', 'J': 'Valet',
 '9': 'Neuf', '8': 'Huit', '7': 'Sept', 'JOKER': 'Joker',
}

export const SYMBOLE_COULEUR: Record<Couleur, string> = {
 spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
}

// ============================================================
// TYPES — CONFIG & ÉTAT DE JEU
// ============================================================

export type NiveauIA = 'facile' | 'intermediaire' | 'difficile'
export type PhaseJeu = 'libre' | 'finale' | 'terminee'
export type EcranApp = 'accueil' | 'config' | 'table' | 'pause' | 'fin' | 'regles' | 'tutoriel'
export type TypeJoueur = 'humain' | 'ia'

/**
 * Source de décision pour un siège donné, au tour de ce siège.
 * Étape 7 (Phase 1) — abstraction introduite pour découpler le moteur
 * (useGameEngine.ts) de l'hypothèse « siège 0 = humain local, siège 1 = IA ».
 * Distincte de TypeJoueur (qui ne distingue pas humain local / humain
 * distant) car c'est précisément cette distinction qui manque pour
 * brancher un siège sur un transport réseau plutôt que sur la saisie
 * locale ou l'IA.
 * 'distant' n'est pour l'instant produit par aucun code — c'est le point
 * d'intégration prévu pour la Phase 2 (humain vs humain à distance).
 */
export type SourceDecision = 'humain-local' | 'ia' | 'distant'

export interface GameConfig {
 nomJoueur1: string
 nomJoueur2: string
 typeJoueur2: TypeJoueur
 niveauIA: NiveauIA
 nbJeux: number
 seuilVictoire: number
}

export const CONFIG_DEFAUT: GameConfig = {
 nomJoueur1: 'Joueur',
 nomJoueur2: 'IA',
 typeJoueur2: 'ia',
 niveauIA: 'intermediaire',
 nbJeux: 4,
 seuilVictoire: 1000,
}

// ============================================================
// PRÉPARATION MULTIJOUEUR (Phase 1 — Étape 1)
//
// Ajout PUR : ces types et fonctions ne sont importés par AUCUN
// module existant. Ils préparent la généralisation du moteur à
// N joueurs (étapes suivantes de la Phase 1) sans toucher au
// comportement actuel du jeu à 2 joueurs (humain vs IA).
// ============================================================

/** Identifiant de siège autour de la table (0 à 3). Le jeu actuel n'utilise que 0 et 1. */
export type SiegeId = 0 | 1 | 2 | 3

/** Nombre minimum de sièges pris en charge par le moteur généralisé */
export const NB_SIEGES_MIN = 2

/** Nombre maximum de sièges pris en charge par le moteur généralisé */
export const NB_SIEGES_MAX = 4

/** Liste des identifiants de sièges possibles, dans l'ordre de la table */
export const SIEGES_POSSIBLES: SiegeId[] = [0, 1, 2, 3]

/**
 * Vérifie qu'un nombre de sièges est dans les bornes prises en charge
 * par le moteur généralisé (2 à 4). Fonction pure, sans effet de bord.
 */
export function estNombreSiegesValide(nbSieges: number): boolean {
 return Number.isInteger(nbSieges) && nbSieges >= NB_SIEGES_MIN && nbSieges <= NB_SIEGES_MAX
}

/**
 * Vérifie qu'un identifiant de siège est valide au sein d'une table
 * comptant `nbSieges` joueurs (ex : siège 3 invalide si nbSieges = 2).
 * Fonction pure, sans effet de bord.
 */
export function estSiegeValide(siege: number, nbSieges: number): boolean {
 return Number.isInteger(siege) && siege >= 0 && siege < nbSieges
}

export interface Joueur {
 id: SiegeId
 nom: string
 type: TypeJoueur
 main: Carte[]
 cartesEtalees: Carte[]
 pileRemportee: Carte[]
 marquePoints: number
 brisques: number
}

export interface PliEnCours {
 carteJoueur0: Carte | null
 carteJoueur1: Carte | null
 joueurOuvreur: 0 | 1
 /**
  * Étape 3c (Phase 1) — représentation générique indexée par siège,
  * désormais SOURCE DE VÉRITÉ utilisée par le moteur de résolution
  * de pli (appliquerPli). carteJoueur0/carteJoueur1 restent maintenus
  * en synchronisation stricte par pli.ts pour ne pas casser les
  * nombreux consommateurs existants (IA, UI, tests) qui les lisent
  * encore directement — leur migration est différée à la Phase 3,
  * en même temps que la généralisation des règles à N joueurs.
  */
 cartes: (Carte | null)[]
}

export interface ResultatTirage {
 premierJoueur: 0 | 1
 carteJ0: Carte
 carteJ1: Carte
 egalite: boolean
}

export interface GameState {
 partieId: string
 phase: PhaseJeu
 mancheNumero: number
 joueurs: Joueur[]
 pioche: Carte[]
 pliEnCours: PliEnCours
 joueurActif: 0 | 1
 dernierVainqueurPli: (0 | 1) | null
 couleurAtout: Couleur | null
 premierBesiguePose: boolean
 bonusDernierPli: (0 | 1) | null
 // Compteur de manches gagnées [J0, J1] — remis à 0 chez l'adversaire à chaque victoire
 compteurManches: [number, number]
 // — Annonces
 annonces: AnnoncePosee[]
 // Combinaisons remportées mais pas encore étalées (posées après la pioche du tour suivant)
 // Étape 4 (Phase 1) : tableau indexé par siège (auparavant Record<0|1,T>)
 combisEnAttente: CombinaisonDisponible[][] // historique toutes annonces
 usagesCartes: UsageCarteCombi[] // suivi réutilisation cartes
 // Étape 4 (Phase 1) : tableau indexé par siège — mariagesAtoutActifs[siege] = [[roiId, dameId], ...]
 mariagesAtoutActifs: string[][][]
}

export interface Sauvegarde {
 version: string
 timestamp: number
 config: GameConfig
 state: GameState
 history: ActionJeu[]
}

export type ActionJeu =
 | { type: 'JOUER_CARTE'; joueur: 0 | 1; carteId: string }
 | { type: 'ANNONCER'; joueur: 0 | 1; combinaison: string; points: number }
 | { type: 'PIOCHER'; joueur: 0 | 1; carteId: string }
 | { type: 'REMPORTER_PLI'; joueur: 0 | 1 }
 | { type: 'DEBUT_MANCHE'; mancheNumero: number }
 | { type: 'FIN_MANCHE'; scores: [number, number] }

export type NiveauLog = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

export interface EntreeLog {
 timestamp: number
 niveau: NiveauLog
 categorie: string
 message: string
 donnees?: unknown
}

export interface FichierLog {
 version: string
 partieId: string
 entries: EntreeLog[]
}

// ============================================================
// TYPES — COMBINAISONS & ANNONCES
// ============================================================

export type NomCombinaison =
 | 'mariage_atout'
 | 'mariage_hors_atout'
 | 'quinte'
 | 'sept_atout'
 | 'besigue'
 | '4_as_atout'
 | '4_roi_atout'
 | '4_dame_atout'
 | '4_valet_atout'
 | '4_as'
 | '4_roi'
 | '4_dame'
 | '4_valet'

export const POINTS_COMBINAISON: Record<NomCombinaison, number> = {
 mariage_atout: 40,
 mariage_hors_atout: 20,
 quinte: 250,
 sept_atout: 10,
 besigue: 40, // 100 pour le premier (géré dynamiquement)
 '4_as_atout': 200,
 '4_roi_atout': 160,
 '4_dame_atout': 120,
 '4_valet_atout': 80,
 '4_as': 100,
 '4_roi': 80,
 '4_dame': 60,
 '4_valet': 40,
}

export const NOM_AFFICHE_COMBINAISON: Record<NomCombinaison, string> = {
 mariage_atout: 'Mariage Atout',
 mariage_hors_atout: 'Mariage',
 quinte: 'Quinte',
 sept_atout: 'Sept d\'Atout',
 besigue: 'Bésigue',
 '4_as_atout': '4 As d\'Atout',
 '4_roi_atout': '4 Rois d\'Atout',
 '4_dame_atout': '4 Dames d\'Atout',
 '4_valet_atout': '4 Valets d\'Atout',
 '4_as': '4 As',
 '4_roi': '4 Rois',
 '4_dame': '4 Dames',
 '4_valet': '4 Valets',
}

// Une combinaison détectée et proposable
export interface CombinaisonDisponible {
 nom: NomCombinaison
 points: number // points réels (tient compte du 1er bésigue)
 cartesIds: string[] // IDs des cartes qui la composent
}

// Une annonce effectivement posée (historique)
export interface AnnoncePosee {
 nom: NomCombinaison
 points: number
 cartesIds: string[] // IDs des cartes étalées pour cette combinaison
 joueurId: 0 | 1
 mancheNumero: number
}

// Suivi par carte : dans quelles combinaisons elle a déjà été utilisée
export interface UsageCarteCombi {
 carteId: string
 combinaisonsUtilisees: NomCombinaison[]
}
