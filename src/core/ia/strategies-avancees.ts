// ============================================================
// STRATÉGIES AVANCÉES A/B — Mémorisation + anticipation
// Appliquées en tête de cascade pour les niveaux Intermédiaire
// et Difficile (jamais pour Facile). Chaque fonction retourne
// une carte ou null (→ fallback vers la cascade existante).
//
// Une carte protégée par cartesUtilesAuxCombis n'est JAMAIS
// sacrifiée par ces règles, même quand elle capturerait une
// brisque ou gagnerait un pli (décision validée explicitement).
// ============================================================

import type { Carte, Couleur, GameState } from '../../types'
import { logger } from '../../utils/logger'
import { detecterCombinaisonsDisponibles } from '../combinaisons'
import { carteAvecRangMinimal, candidatsGagnants, cartesUtilesAuxCombis } from './helpers'
import { brisquesJoueesParCouleur } from './memoire'
import { PROBA_SACRIFIER_CARTE_PROTEGEE_POUR_MARIAGE } from '../ia.config'

// ── Utilitaire partagé : couleur d'un mariage potentiel non annoncé ──

/**
 * Si l'IA détient un Roi+Dame de même couleur formant un mariage
 * potentiel pas encore annoncé (donc avant que l'atout soit défini),
 * retourne cette couleur. Sinon null.
 *
 * Réutilise directement `detecterCombinaisonsDisponibles` (source
 * unique de vérité pour la détection des mariages) plutôt que de
 * dupliquer la logique d'appariement Roi/Dame.
 */
export function couleurMariagePotentielNonAnnonce(state: GameState): Couleur | null {
  if (state.couleurAtout !== null) return null
  const combis = detecterCombinaisonsDisponibles(state, 1)
  const mariage = combis.find(c => c.nom === 'mariage_atout')
  if (!mariage) return null

  const ia = state.joueurs[1]
  const carte = [...ia.main, ...ia.cartesEtalees].find(c => mariage.cartesIds.includes(c.id))
  return carte ? carte.couleur : null
}

/**
 * Comme carteAvecRangMinimal, mais à égalité de rang, préfère une carte
 * déjà étalée (posée sur la table) à une carte encore en main — convention
 * déjà établie ailleurs dans le projet (ex. strategieCouper10) : jouer une
 * carte étalée avant une carte de main ne coûte rien de nouveau (elle est
 * déjà exposée) et préserve la flexibilité de la main.
 */
function carteEtaleeEnPrioriteAuRangMinimal(cartes: Carte[], state: GameState): Carte {
  const rangMinimal = carteAvecRangMinimal(cartes).rang
  const auRangMinimal = cartes.filter(c => c.rang === rangMinimal)
  const idsEtalees = new Set(state.joueurs[1].cartesEtalees.map(c => c.id))
  return auRangMinimal.find(c => idsEtalees.has(c.id)) ?? auRangMinimal[0]
}

// ── Règle a.1 / b.1 — Brisque gagnante prioritaire en réponse ──

/**
 * En réponse à l'adversaire (jamais en ouverture) : si l'IA peut
 * remporter le pli avec une brisque (10 ou As), elle le fait
 * prioritairement — 10 avant As (ORDRE_RANGS place le 10 juste
 * en dessous de l'As, donc `carteAvecRangMinimal` choisit
 * naturellement le 10 en premier parmi les brisques gagnantes).
 *
 * a.1 — atout non déclaré : toutes couleurs de brisques autorisées.
 * b.1 — atout déclaré : seulement si la carte ouverte n'est PAS
 *        l'atout, et seulement avec des brisques NON-atout (on ne
 *        sacrifie pas un atout ici — cas géré par la cascade existante).
 *
 * Une brisque protégée par une combinaison en cours n'est jamais jouée.
 */
export function strategieBrisqueGagnante(candidats: Carte[], state: GameState): Carte | null {
  const carteOuverte = state.pliEnCours.carteJoueur0
  if (!carteOuverte) return null

  const couleurAtout = state.couleurAtout
  if (couleurAtout && carteOuverte.couleur === couleurAtout) return null // b.1 : carte ouverte non-atout uniquement

  const protegees = cartesUtilesAuxCombis(state, 1)

  let brisques = candidats.filter(c =>
    !c.estJoker && (c.rang === 'A' || c.rang === '10') && !protegees.has(c.id)
  )
  if (couleurAtout) {
    brisques = brisques.filter(c => c.couleur !== couleurAtout) // b.1 : brisques non-atout uniquement
  }
  if (brisques.length === 0) return null

  const gagnantes = candidatsGagnants(brisques, carteOuverte, couleurAtout, 1)
  if (gagnantes.length === 0) return null

  const choix = carteEtaleeEnPrioriteAuRangMinimal(gagnantes, state)
  logger.debug('IA', `BrisqueGagnante (a.1/b.1) — ${choix.rang}${choix.couleur} capture le pli`)
  return choix
}

// ── Règle a.2 / a.3 — Ouvrir avec un As avant l'atout ───────────

/**
 * En ouverture, tant que l'atout n'est pas déclaré : jouer un As si
 * l'IA en a un jouable. Sans atout, l'ouvreur d'un pli gagne toujours
 * avec un As (soit par couleur différente → ouvreur gagne par défaut,
 * soit par même couleur → l'As est imbattable, égalité comprise) :
 * c'est un coup quasiment imparable.
 *
 * a.3 : si l'IA a un mariage potentiel non encore annoncé, l'As de
 * la couleur de CE mariage est exclu (réservé pour une quinte future)
 * — seuls les As des AUTRES couleurs sont joués ici.
 *
 * Un As protégé par une combinaison en cours (ex. 4 As en préparation)
 * n'est jamais joué.
 */
export function strategieOuvrirAvecAs(candidats: Carte[], state: GameState): Carte | null {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout
  if (carteOuverte !== null) return null
  if (couleurAtout !== null) return null

  const protegees = cartesUtilesAuxCombis(state, 1)
  const couleurMariage = couleurMariagePotentielNonAnnonce(state)

  const asJouables = candidats.filter(c =>
    !c.estJoker &&
    c.rang === 'A' &&
    !protegees.has(c.id) &&
    c.couleur !== couleurMariage
  )
  if (asJouables.length === 0) return null

  const choix = asJouables[0]
  logger.debug('IA', `OuvrirAvecAs (a.2/a.3) — ${choix.rang}${choix.couleur} (coup quasi imparable, pré-atout)`)
  return choix
}

// ── Règle a.3 (suite) — Gagner le pli pour pouvoir annoncer ─────

/**
 * Une fois tous les As des autres couleurs écoulés (strategieOuvrirAvecAs
 * ne trouve plus rien à jouer), et si l'IA a toujours un mariage
 * potentiel non annoncé : elle cherche activement à remporter le pli
 * en cours (avec la carte gagnante la plus faible possible, cartes
 * protégées mises à part) afin d'obtenir le droit d'annoncer le
 * mariage au prochain tour (le moteur de jeu propose déjà l'annonce
 * avant la pioche, pour les deux joueurs).
 *
 * Si aucune carte gagnante NON protégée n'existe, l'IA peut sacrifier
 * une carte protégée en dernier recours — mais pas systématiquement :
 * seulement 1 fois sur 2 (PROBA_SACRIFIER_CARTE_PROTEGEE_POUR_MARIAGE).
 * L'autre fois sur deux, elle renonce à gagner ce pli et laisse la
 * cascade existante décider (préservant ainsi la combinaison protégée).
 */
export function strategieGagnerPourMariage(candidats: Carte[], state: GameState): Carte | null {
  const carteOuverte = state.pliEnCours.carteJoueur0
  if (!carteOuverte) return null
  if (state.couleurAtout !== null) return null

  const couleurMariage = couleurMariagePotentielNonAnnonce(state)
  if (!couleurMariage) return null

  // Priorité à a.2 : s'il reste un As d'une autre couleur à écouler, ne pas agir ici
  const asAutresCouleurs = candidats.filter(c => !c.estJoker && c.rang === 'A' && c.couleur !== couleurMariage)
  if (asAutresCouleurs.length > 0) return null

  const gagnantes = candidatsGagnants(candidats.filter(c => !c.estJoker), carteOuverte, null, 1)
  if (gagnantes.length === 0) return null

  const protegees = cartesUtilesAuxCombis(state, 1)
  const nonProtegees = gagnantes.filter(c => !protegees.has(c.id))

  if (nonProtegees.length > 0) {
    const choix = carteAvecRangMinimal(nonProtegees)
    logger.debug('IA', `GagnerPourMariage (a.3) — ${choix.rang}${choix.couleur} sécurise le pli pour annoncer`)
    return choix
  }

  // Aucune carte gagnante non protégée : sacrifice possible, mais 1 fois sur 2 seulement
  if (Math.random() < PROBA_SACRIFIER_CARTE_PROTEGEE_POUR_MARIAGE) {
    const choix = carteAvecRangMinimal(gagnantes)
    logger.debug(
      'IA',
      `GagnerPourMariage (a.3) — sacrifice d'une carte protégée (${choix.rang}${choix.couleur}) pour annoncer, 1 fois sur 2`
    )
    return choix
  }

  logger.debug('IA', 'GagnerPourMariage (a.3) — renonce à sacrifier une carte protégée cette fois-ci')
  return null
}

// ── Règle a.4 — Jouer les Jokers en ouverture, sans mariage en main ──

/**
 * En ouverture, tant que l'atout n'est pas déclaré, ET si l'IA n'a
 * PAS de mariage potentiel en main (ni Roi+Dame de même couleur) :
 * elle joue aussi ses Jokers.
 *
 * Un Joker joué en ouverture avant l'atout gagne TOUJOURS le pli
 * (règle 2b de résolution du Joker : non-atout en réponse → l'ouvreur
 * du Joker gagne ; et Joker vs Joker → l'ouvreur gagne aussi). Le jouer
 * permet donc de garder la main (rester vainqueur du pli, donc
 * piocheur en premier) sans consommer les cartes utiles à un futur
 * mariage — dans l'espoir de piocher un Roi ou une Dame complétant
 * une paire.
 *
 * Complète a.2 (qui joue les As) : les deux s'appliquent en parallèle
 * en ouverture pré-atout quand aucun mariage n'est en main.
 */
export function strategieOuvrirJokerSansMariage(candidats: Carte[], state: GameState): Carte | null {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout
  if (carteOuverte !== null) return null
  if (couleurAtout !== null) return null

  const couleurMariage = couleurMariagePotentielNonAnnonce(state)
  if (couleurMariage) return null // l'IA a déjà un mariage en main → a.4 ne s'applique pas

  const jokersJouables = candidats.filter(c => c.estJoker)
  if (jokersJouables.length === 0) return null

  const choix = jokersJouables[0]
  logger.debug('IA', `OuvrirJokerSansMariage (a.4) — Joker joué pour garder la main, espoir de piocher un mariage`)
  return choix
}



/**
 * En ouverture, une fois l'atout déclaré : choisir la couleur
 * non-atout où le plus de brisques ont déjà été vues/jouées
 * (couleur la plus "épuisée"), et y jouer la carte la plus faible
 * disponible. Maximise la probabilité de gagner par la règle
 * "couleurs différentes → ouvreur gagne" ou de ne pas se faire
 * couper facilement par une brisque adverse restante.
 */
export function strategieOuvrirCouleurEpuisee(candidats: Carte[], state: GameState): Carte | null {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const couleurAtout = state.couleurAtout
  if (carteOuverte !== null) return null
  if (couleurAtout === null) return null

  const protegees = cartesUtilesAuxCombis(state, 1)
  const brisquesJouees = brisquesJoueesParCouleur(state)

  const candidatsNonAtout = candidats.filter(c =>
    !c.estJoker && c.couleur !== couleurAtout && !protegees.has(c.id)
  )
  if (candidatsNonAtout.length === 0) return null

  const couleursDisponibles = Array.from(new Set(candidatsNonAtout.map(c => c.couleur)))
  const maxBrisquesVues = Math.max(...couleursDisponibles.map(cl => brisquesJouees[cl]))
  const couleursMax = couleursDisponibles.filter(cl => brisquesJouees[cl] === maxBrisquesVues)

  // En cas d'égalité entre plusieurs couleurs (ex. aucune brisque vue nulle
  // part encore), on ne fixe pas arbitrairement une couleur : on prend la
  // carte globalement la plus faible parmi toutes les couleurs à égalité.
  const candidatsRetenus = candidatsNonAtout.filter(c => couleursMax.includes(c.couleur))
  const choix = carteAvecRangMinimal(candidatsRetenus)
  logger.debug(
    'IA',
    `OuvrirCouleurÉpuisée (b.2) — ${choix.couleur} (${maxBrisquesVues} brisques vues) → ${choix.rang}${choix.couleur}`
  )
  return choix
}
