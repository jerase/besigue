// ============================================================
// CONFIGURATION DE L'INTELLIGENCE ARTIFICIELLE
// ============================================================
//
// Ce fichier centralise tous les paramètres tunables des
// 3 niveaux de l'IA. Modifier ici pour ajuster la difficulté
// sans toucher aux algorithmes dans ia.ts.
//
// Nomenclature :
// PROBA_* → probabilité (0 à 1)
// SEUIL_* → nombre de cartes dans la pioche (0 à 114)
// DELAIS_* → millisecondes [min, max]

import type { NiveauIA } from '../types'

// ── Délais de réflexion simulés ───────────────────────────────

export const DELAIS_IA: Record<NiveauIA, [number, number]> = {
 facile: [500, 1000],
 intermediaire: [1000, 1500],
 difficile: [1500, 2500],
}

// ── Niveau FACILE — comportements débutants ───────────────────

/** Probabilité que l'IA facile rate la règle "couper le 10" */
export const PROBA_RATER_COUPER10 = 0.33

/** Probabilité que l'IA facile joue un atout prématurément en ouverture */
export const PROBA_ATOUT_PREMATURE = 0.30

/** Probabilité que l'IA facile joue une brisque imprudemment en ouverture */
export const PROBA_BRISQUE_IMPRUDENTE = 0.20

// ── Niveau INTERMÉDIAIRE — seuils de pioche ───────────────────

/** Au-delà de ce seuil : mode safe (pioche > GRANDE → garder les utiles) */
export const SEUIL_PIOCHE_GRANDE = 8

/** En-dessous de ce seuil : mode agressif (pioche ≤ PETITE → capturer brisques) */
export const SEUIL_PIOCHE_PETITE = 4

/**
 * Équivalents basés sur la mémorisation (memoire.ts), utilisés à la place
 * des seuils de pioche ci-dessus quand IA_MEMOIRE_AVANCEE.intermediaire
 * est actif : au lieu de raisonner sur "combien reste-t-il de cartes en
 * pioche", l'IA raisonne sur "combien de brisques restent encore
 * inconnues (non vues)" — un signal plus directement pertinent pour
 * décider de capturer agressivement ou de jouer le 7 d'atout en sécurité.
 */

/** Peu de brisques encore inconnues restantes → les capturer maintenant a de la valeur (mode agressif) */
export const SEUIL_BRISQUES_NON_VUES_PETIT = 6

/** Beaucoup de brisques encore inconnues restantes → tôt dans la manche, sûr de jouer le 7 d'atout */
export const SEUIL_BRISQUES_NON_VUES_GRAND = 24

// ── Niveau DIFFICILE — variation de style ─────────────────────

/** Probabilité minimale de jouer la 2e meilleure carte (anti-prévisibilité) */
export const PROBA_VARIATION_MIN = 0.05

/** Probabilité maximale de jouer la 2e meilleure carte */
export const PROBA_VARIATION_MAX = 0.10

// ── Tous niveaux — préservation des atouts ────────────────────

/**
 * Pioche ≤ ce seuil : l'IA entre en mode "nettoyage" et évite
 * encore plus strictement de jouer ses atouts en ouverture.
 */
export const SEUIL_GARDER_ATOUTS = 50

// ── Mémorisation avancée + règles tactiques A/B ────────────────

/**
 * Active, par niveau, la mémorisation par déduction (memoire.ts),
 * l'objectif de 16 brisques (anticipation.ts) et les règles
 * tactiques A/B (strategies-avancees.ts).
 *
 * Le niveau Facile reste volontairement exclu (accessibilité aux
 * débutants). Intermédiaire et Difficile bénéficient tous deux des
 * règles A/B et de la mémorisation complète ; seule la profondeur
 * d'usage diffère au niveau de l'intégration dans chaque niveau.
 */
export const IA_MEMOIRE_AVANCEE: Record<NiveauIA, boolean> = {
  facile: false,
  intermediaire: true,
  difficile: true,
}

/**
 * Règle a.3 (strategieGagnerPourMariage) : si aucune carte gagnante
 * NON protégée n'existe pour remporter le pli et pouvoir annoncer un
 * mariage, l'IA peut sacrifier une carte protégée en dernier recours —
 * mais pas systématiquement, 1 fois sur 2 seulement.
 */
export const PROBA_SACRIFIER_CARTE_PROTEGEE_POUR_MARIAGE = 0.5

// ── Table de décision — Choix de la couleur d'atout ────────────
//
// tableChoixAtout.ts : quand l'IA détient plusieurs mariages
// potentiels (Roi+Dame de couleurs différentes) avant que l'atout
// soit fixé, chaque couleur candidate reçoit un score = somme
// pondérée de 3 facteurs indépendants. Remplace le choix "premier
// trouvé par ordre de détection" (spades>hearts>diamonds>clubs).

/**
 * Poids par carte de la couleur candidate déjà en main/étalées.
 * Plus l'IA détient de cartes de cette couleur, plus elle contrôlera
 * les plis une fois cette couleur déclarée atout.
 */
export const POIDS_ATOUT_EN_MAIN_CHOIX_ATOUT = 2

/**
 * Bonus si la quinte (As+10+Valet de cette couleur) reste
 * mathématiquement atteignable (déjà en main, ou encore non vue —
 * cf. combinaisonEncoreAtteignable). Volontairement modéré : rester
 * "atteignable" n'est qu'une possibilité, pas une garantie (les
 * cartes manquantes peuvent finir en main adverse) — ce facteur ne
 * doit donc pas écraser les deux autres, qui reposent sur des cartes
 * déjà tenues avec certitude.
 */
export const BONUS_QUINTE_ATTEIGNABLE_CHOIX_ATOUT = 15

/**
 * Poids par brisque (As/10) de cette couleur déjà tenue en main —
 * un gain de points sûr si cette couleur devient atout, contrairement
 * aux cartes non vues qui ne sont qu'une probabilité.
 */
export const POIDS_BRISQUE_EN_MAIN_CHOIX_ATOUT = 5
