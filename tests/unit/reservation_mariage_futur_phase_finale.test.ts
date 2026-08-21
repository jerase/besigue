// ============================================================
// TESTS — Réservation de cartes pour un mariage_atout FUTUR
// désactivée en phase finale (strategies-avancees.ts)
//
// Suite directe du correctif de cartesProtegeesParCombinaisons
// (protection_combinaisons_phase_finale.test.ts) : la même règle de
// fond ("aucune combinaison ne peut plus être annoncée en phase
// finale, donc plus rien à protéger") s'appliquait déjà à une
// combinaison DÉJÀ étalée, mais pas encore à la réservation de cartes
// pour un mariage_atout qui n'a JAMAIS été annoncé (couleurAtout
// encore null) — cas rare mais possible : aucun des deux joueurs n'a
// jamais eu Roi+Dame de même couleur pendant toute la phase libre,
// state.couleurAtout reste alors null jusqu'à la phase finale.
//
// Bug corrigé (2 points, même cause racine) :
//   1. couleurMariagePotentielNonAnnonce (utilisée par a.2 OuvrirAvecAs
//      et a.3 GagnerPourMariage) continuait à réserver l'As de la
//      couleur d'un mariage potentiel, même en phase finale — alors que
//      ce mariage ne pourra plus jamais être annoncé. Observé : l'IA
//      jouait une carte faible (Pré-atout) plutôt qu'un As pourtant
//      imparable en ouverture pré-atout.
//   2. strategieOuvrirJokerSansMariage (a.4), dont toute la
//      justification documentée est "dans l'espoir de piocher un Roi
//      ou une Dame" — également fausse en phase finale (pioche vide).
//      Effet de bord du correctif n°1 : en phase finale ET avec un
//      mariage potentiel en main, a.4 se remettait paradoxalement à
//      s'appliquer (couleurMariage devenu null via le correctif n°1),
//      jouant le Joker sur un log affichant littéralement "espoir de
//      piocher" avec pioche.length === 0. Gate désormais explicite.
//
// Portée : seul niveau-intermédiaire est concerné (niveau-difficile
// délègue entièrement au minimax dès pioche vide, avant tout appel à
// ces fonctions ; niveau-facile ne les appelle jamais).
// ============================================================

import { describe, it, expect } from 'vitest'
import { choisirCarteIA } from '../../src/core/ia'
import {
  couleurMariagePotentielNonAnnonce,
  strategieOuvrirAvecAs,
  strategieOuvrirJokerSansMariage,
} from '../../src/core/ia/strategies-avancees'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte, creerJoker } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

// ── Helpers ──────────────────────────────────────────────────

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte => creerCarte(couleur, rang, jeu, _pos++)

/**
 * Atout jamais fixé (couleurAtout: null) + Roi/Dame de cœur en main
 * (mariage potentiel jamais annoncé) — `phase` paramétrable pour
 * comparer en/hors phase finale sur un état par ailleurs identique.
 */
function stateMariagePotentiel(
  phase: 'libre' | 'finale',
  autresCartes: Carte[]
): { state: GameState; roiCoeur: Carte; dameCoeur: Carte } {
  const roiCoeur = c('hearts', 'K')
  const dameCoeur = c('hearts', 'Q')
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({
    ...state,
    couleurAtout: null,
    phase,
    pioche: phase === 'finale' ? [] : [c('clubs', '7')],
    pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 1, cartes: [null, null] },
  })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[1] = { ...joueurs[1], main: [roiCoeur, dameCoeur, ...autresCartes], cartesEtalees: [] }
  return { state: { ...base, joueurs }, roiCoeur, dameCoeur }
}

// ============================================================
// Unité — couleurMariagePotentielNonAnnonce
// ============================================================

describe('Phase finale — couleurMariagePotentielNonAnnonce désactivée', () => {
  it('phase finale : retourne null même avec Roi+Dame de même couleur en main', () => {
    const { state } = stateMariagePotentiel('finale', [])
    expect(couleurMariagePotentielNonAnnonce(state)).toBeNull()
  })

  it('phase libre (état sinon identique) : détecte toujours le mariage potentiel normalement', () => {
    const { state } = stateMariagePotentiel('libre', [])
    expect(couleurMariagePotentielNonAnnonce(state)).toBe('hearts')
  })

  it('couleurAtout déjà fixé : retourne toujours null (comportement préexistant, inchangé)', () => {
    const roiCoeur = c('hearts', 'K')
    const dameCoeur = c('hearts', 'Q')
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4({ ...state, couleurAtout: 'hearts', phase: 'libre' })
    const joueurs = [...base.joueurs] as typeof base.joueurs
    joueurs[1] = { ...joueurs[1], main: [roiCoeur, dameCoeur], cartesEtalees: [] }
    expect(couleurMariagePotentielNonAnnonce({ ...base, joueurs })).toBeNull()
  })
})

// ============================================================
// Unité — strategieOuvrirAvecAs (a.2/a.3)
// ============================================================

describe('Phase finale — strategieOuvrirAvecAs ne réserve plus l\'As du mariage potentiel', () => {
  it('phase finale, As unique = celui de la couleur du mariage potentiel : le joue quand même', () => {
    const asCoeur = c('hearts', 'A')
    const { state } = stateMariagePotentiel('finale', [asCoeur, c('spades', '8')])
    const carte = strategieOuvrirAvecAs(state.joueurs[1].main, state)
    expect(carte?.id).toBe(asCoeur.id)
  })

  it('phase libre (état identique sinon) : réserve toujours l\'As du mariage potentiel, ne le joue pas', () => {
    const asCoeur = c('hearts', 'A')
    const { state } = stateMariagePotentiel('libre', [asCoeur, c('spades', '8')])
    const carte = strategieOuvrirAvecAs(state.joueurs[1].main, state)
    expect(carte).toBeNull() // seul As dispo = celui réservé → a.2/a.3 ne s'applique pas
  })

  it('intégration : niveau intermédiaire joue l\'As imparable plutôt qu\'une carte faible, en phase finale', () => {
    const asCoeur = c('hearts', 'A')
    const { state } = stateMariagePotentiel('finale', [asCoeur, c('spades', '8')])
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(asCoeur.id)
  })

  it('non-régression : même scénario HORS phase finale, réserve toujours l\'As (comportement inchangé)', () => {
    const asCoeur = c('hearts', 'A')
    const { state } = stateMariagePotentiel('libre', [asCoeur, c('spades', '8')])
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).not.toBe(asCoeur.id)
  })
})

// ============================================================
// Unité — strategieOuvrirJokerSansMariage (a.4)
// ============================================================

describe('Phase finale — strategieOuvrirJokerSansMariage désactivée (plus de pioche à espérer)', () => {
  it('phase finale, aucun mariage en main : ne joue plus le Joker (gate direct, pas seulement via couleurMariage)', () => {
    const joker = creerJoker('clubs', 0, 900)
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4({
      ...state, couleurAtout: null, phase: 'finale', pioche: [],
      pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 1, cartes: [null, null] },
    })
    const joueurs = [...base.joueurs] as typeof base.joueurs
    joueurs[1] = { ...joueurs[1], main: [joker, c('spades', '8')], cartesEtalees: [] }
    const stateFinal = { ...base, joueurs }
    expect(strategieOuvrirJokerSansMariage(stateFinal.joueurs[1].main, stateFinal)).toBeNull()
  })

  it('phase libre (état identique sinon) : joue toujours le Joker normalement', () => {
    const joker = creerJoker('clubs', 0, 901)
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4({
      ...state, couleurAtout: null, phase: 'libre', pioche: [c('clubs', '7')],
      pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 1, cartes: [null, null] },
    })
    const joueurs = [...base.joueurs] as typeof base.joueurs
    joueurs[1] = { ...joueurs[1], main: [joker, c('spades', '8')], cartesEtalees: [] }
    const stateLibre = { ...base, joueurs }
    const carte = strategieOuvrirJokerSansMariage(stateLibre.joueurs[1].main, stateLibre)
    expect(carte?.estJoker).toBe(true)
  })

  it(
    'effet de bord corrigé : phase finale + mariage potentiel en main + Joker → ' +
    'ne joue PAS le Joker sur une justification devenue fausse ("espoir de piocher")',
    () => {
      const joker = creerJoker('clubs', 0, 902)
      const { state } = stateMariagePotentiel('finale', [joker, c('spades', '8')])
      const carte = choisirCarteIA(state, 'intermediaire')
      expect(carte?.estJoker).toBe(false)
    }
  )
})

// ============================================================
// Non-régression — niveau difficile inchangé
// ============================================================

describe('Phase finale — niveau difficile inchangé (délègue déjà entièrement au minimax)', () => {
  it('atout jamais fixé + phase finale : ne crashe pas, joue une carte cohérente (minimax)', () => {
    const asCoeur = c('hearts', 'A')
    const { state } = stateMariagePotentiel('finale', [asCoeur, c('spades', '8')])
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
  })
})
