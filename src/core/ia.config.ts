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
