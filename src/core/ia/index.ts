// ============================================================
// MODULE IA — Point d'entrée public
// ============================================================
//
// Seul fichier à importer depuis l'extérieur du module ia/.
// Exporte exactement la même API que l'ancien ia.ts.
//
// Importé par :
//   - useGameEngine.ts (choisirCarteIA, choisirAnnonceIA, delaiSimule, DELAIS_IA)
//   - tests (choisirCarteIA, choisirAnnonceIA, SEUIL_*, PROBA_*)

import type { Carte, GameState, NiveauIA, CombinaisonDisponible } from '../../types'
import { logger } from '../../utils/logger'
import { cartesJouablesPhaseFinale } from '../pli'
import { detecterCombinaisonsDisponibles } from '../combinaisons'
import { DELAIS_IA } from '../ia.config'
import { iaFacile }         from './niveau-facile'
import { iaIntermediaire }  from './niveau-intermediaire'
import { iaDifficile }      from './niveau-difficile'
import { cartesUtilesAuxCombis } from './helpers'
import { meilleureCombiMariageAtout } from './tableChoixAtout'

// Réexports publics (utilisés par les tests et l'engine)
export { DELAIS_IA } from '../ia.config'
export { SEUIL_PIOCHE_GRANDE, SEUIL_PIOCHE_PETITE, SEUIL_GARDER_ATOUTS } from '../ia.config'
export { PROBA_RATER_COUPER10, PROBA_ATOUT_PREMATURE, PROBA_BRISQUE_IMPRUDENTE } from '../ia.config'
export { PROBA_VARIATION_MIN, PROBA_VARIATION_MAX } from '../ia.config'

// ── Délai simulé ──────────────────────────────────────────────

export function delaiSimule(niveau: NiveauIA): number {
  const [min, max] = DELAIS_IA[niveau]
  return Math.floor(Math.random() * (max - min) + min)
}

// ── Choix de carte ────────────────────────────────────────────

// ============================================================
// Garde Phase 1 → Phase 3 (Étape 6)
//
// Les 10 fichiers du module core/ia/* (mémoire de cartes vues,
// recherche minimax de phase finale, tables de décision, stratégies
// heuristiques) supposent tous un adversaire UNIQUE et FIXE au siège
// 0 — des dizaines d'occurrences de state.joueurs[0]/[1] et de
// paramètres joueurId par défaut = 1, jusque dans le calcul des
// cartes non vues et la déduction de la main adverse (memoire.ts,
// minimaxFinale.ts). Ce n'est pas une simple question de signature :
// généraliser correctement nécessiterait de repenser la déduction
// probabiliste et les tables de décision pour plusieurs adversaires
// inconnus simultanément — un chantier à part entière, différé à la
// Phase 3, après validation des règles à N joueurs. Cette garde
// empêche d'invoquer silencieusement une IA calibrée pour un duel
// dans un contexte à N joueurs non pris en charge.
// ============================================================

function assertIACompatible(state: GameState, fonction: string): void {
  if (state.joueurs.length !== 2) {
    throw new Error(
      `${fonction} : IA implémentée uniquement pour un duel à 2 joueurs ` +
      `(reçu ${state.joueurs.length} joueurs). Les modules de mémoire, minimax ` +
      `et tables de décision supposent un adversaire unique et fixe (siège 0) ; ` +
      `généralisation à N adversaires différée à la Phase 3.`
    )
  }
}

/**
 * Quand l'IA joue une carte de sa main dont une carte « semblable »
 * (même rang, même couleur) existe déjà parmi ses cartes étalées, elle
 * doit préférer jouer la carte étalée plutôt que celle de la main — la
 * carte en main reste disponible pour de futures combinaisons, alors que
 * l'étalée est déjà « exposée » et n'a plus rien à protéger en général.
 *
 * Exception : si la carte étalée fait partie d'un mariage d'atout encore
 * ACTIF (state.mariagesAtoutActifs), on ne la sacrifie pas — la jouer
 * romprait ce mariage (gererCassureMariageAtout) et ferait perdre son
 * éligibilité comme prérequis de la quinte. Dans ce cas précis, l'IA
 * joue plutôt la carte de sa main (le choix d'origine), pour préserver
 * le mariage d'atout étalé intact.
 *
 * S'applique uniquement pour les niveaux intermédiaire et difficile —
 * n'est jamais appelée pour le niveau facile (cf. switch ci-dessous).
 */
export function preferEtaleeSiPossible(
  carteChoisie: Carte,
  state: GameState,
  candidats: Carte[]
): Carte {
  if (carteChoisie.estJoker) return carteChoisie // pas de « semblable » pour un Joker

  const ia = state.joueurs[1]

  // La carte choisie est déjà une carte étalée → rien à changer
  const choisieEstDejaEtalee = ia.cartesEtalees.some(e => e.id === carteChoisie.id)
  if (choisieEstDejaEtalee) return carteChoisie

  // Chercher une carte étalée « semblable » (même rang + même couleur)
  // parmi les candidats légaux (garantit que le remplacement reste jouable)
  const semblableEtalee = candidats.find(c =>
    !c.estJoker &&
    c.id !== carteChoisie.id &&
    c.rang === carteChoisie.rang &&
    c.couleur === carteChoisie.couleur &&
    ia.cartesEtalees.some(e => e.id === c.id)
  )
  if (!semblableEtalee) return carteChoisie

  // Exception : mariage d'atout encore actif → préserver l'étalée, jouer la main
  const couleurAtout = state.couleurAtout
  const estRoiOuDameAtout = couleurAtout !== null &&
    carteChoisie.couleur === couleurAtout &&
    (carteChoisie.rang === 'K' || carteChoisie.rang === 'Q')

  if (estRoiOuDameAtout) {
    const mariagesActifs = state.mariagesAtoutActifs?.[1] ?? []
    const etaleeProtegeeParMariage = mariagesActifs.some(paire => paire.includes(semblableEtalee.id))
    if (etaleeProtegeeParMariage) {
      logger.debug(
        'IA',
        `PréférerÉtalée — mariage d'atout actif préservé, main jouée à la place → ${carteChoisie.rang}${carteChoisie.couleur}`
      )
      return carteChoisie
    }
  }

  logger.debug(
    'IA',
    `PréférerÉtalée — carte étalée semblable jouée à la place de la main → ${semblableEtalee.rang}${semblableEtalee.couleur}`
  )
  return semblableEtalee
}

/**
 * Point d'entrée principal : retourne la carte que l'IA joue.
 * Retourne null si aucun candidat n'est disponible.
 */
export function choisirCarteIA(state: GameState, niveau: NiveauIA): Carte | null {
  assertIACompatible(state, 'choisirCarteIA')
  const ia = state.joueurs[1]
  let candidats: Carte[] = [...ia.main, ...ia.cartesEtalees]

  if (candidats.length === 0) return null

  // Phase finale : filtrer les cartes jouables
  const carteOuverte = state.pliEnCours.carteJoueur0
  if (state.phase === 'finale' && carteOuverte) {
    const jouables = cartesJouablesPhaseFinale(candidats, carteOuverte, state.couleurAtout)
    if (jouables.length > 0) candidats = jouables
  }

  if (candidats.length === 0) return null

  logger.debug('IA', `choisirCarteIA — niveau=${niveau}, candidats=${candidats.length}`)

  // Priorité absolue (bugfix) : un Joker déjà étalé (utilisé dans une
  // combinaison annoncée, donc présent dans cartesEtalees) ne rapporte
  // plus rien à conserver — il doit être joué dès que possible pour
  // s'en débarrasser. Cette règle prime sur toute stratégie des 3
  // niveaux (facile, intermédiaire, difficile), y compris la recherche
  // minimax de phase finale du niveau difficile.
  const jokerEtaleAJouer = candidats.find(c => c.estJoker && ia.cartesEtalees.some(e => e.id === c.id))
  if (jokerEtaleAJouer) {
    logger.debug('IA', `Joker déjà étalé → défausse prioritaire (niveau=${niveau})`)
    return jokerEtaleAJouer
  }

  switch (niveau) {
    case 'facile':        return iaFacile(candidats, state)
    case 'intermediaire': return preferEtaleeSiPossible(iaIntermediaire(candidats, state), state, candidats)
    case 'difficile':     return preferEtaleeSiPossible(iaDifficile(candidats, state), state, candidats)
  }
}

// ── Choix d'annonce ───────────────────────────────────────────

/**
 * Retourne la combinaison que l'IA annonce parmi celles disponibles.
 * Retourne null si aucune combinaison n'est disponible.
 */
export function choisirAnnonceIA(
  combis: CombinaisonDisponible[],
  state: GameState,
  niveau: NiveauIA
): CombinaisonDisponible | null {
  assertIACompatible(state, 'choisirAnnonceIA')
  if (combis.length === 0) return null

  switch (niveau) {
    case 'facile':
      return combis[Math.floor(Math.random() * combis.length)]

    case 'intermediaire': {
      // Plusieurs mariage_atout candidats (couleurs différentes, atout pas
      // encore fixé) : la table de décision (tableChoixAtout.ts) départage
      // sur un score motivé plutôt que sur le premier trouvé — sinon,
      // à points égaux (40 chacun), .reduce garderait toujours le premier.
      const meilleurMariageAtout = meilleureCombiMariageAtout(combis, state, 1)
      if (meilleurMariageAtout && combis.filter(c => c.nom === 'mariage_atout').length > 1) {
        return meilleurMariageAtout
      }
      return combis.reduce((a, b) => b.points > a.points ? b : a)
    }

    case 'difficile':
      return choisirAnnonceStrategique(combis, state)
  }
}

// ── Annonce stratégique (niveau difficile) ────────────────────

const PRIORITE_ANNONCE: Record<string, number> = {
  mariage_atout:      100,
  quinte:             90,
  '4_as_atout':       85,
  '4_roi_atout':      82,
  '4_dame_atout':     80,
  '4_valet_atout':    78,
  '4_as':             70,
  besigue:            65, // 1er bésigue (100 pts) — abaissé à 20 si suivants
  '4_roi':            60,
  '4_dame':           50,
  '4_valet':          40,
  mariage_hors_atout: 30,
  sept_atout:         10,
}

function choisirAnnonceStrategique(
  combis: CombinaisonDisponible[],
  state: GameState
): CombinaisonDisponible {
  // Plusieurs mariage_atout candidats (couleurs différentes, atout pas
  // encore fixé) : tous à égalité de priorité (100), la table de décision
  // (tableChoixAtout.ts) départage sur un score motivé plutôt que le
  // premier trouvé par ordre de détection. Dans ce cas, `combis` ne
  // contient de toute façon QUE des candidats mariage_atout (cf.
  // detecterCombinaisonsDisponibles : avant le premier mariage_Atout,
  // seuls ces candidats sont proposés).
  const meilleurMariageAtout = meilleureCombiMariageAtout(combis, state, 1)
  if (meilleurMariageAtout && combis.filter(c => c.nom === 'mariage_atout').length > 1) {
    return meilleurMariageAtout
  }

  let meilleureCombi = combis[0]
  let meilleurScore = -1

  for (const combi of combis) {
    let score = PRIORITE_ANNONCE[combi.nom] ?? 0

    // Ajuster le score du bésigue selon s'il est le premier ou non
    if (combi.nom === 'besigue' && state.premierBesiguePose) {
      score = 20
    }

    if (score > meilleurScore) {
      meilleurScore = score
      meilleureCombi = combi
    }
  }

  return meilleureCombi
}

// ── Export de cartesUtilesAuxCombis (utilisé dans les tests) ──
export { cartesUtilesAuxCombis }
