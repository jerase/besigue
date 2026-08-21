// ============================================================
// TESTS — Protection des combinaisons désactivée en phase finale
//
// Règle confirmée : en phase finale (state.phase === 'finale',
// déclenchée par useGameEngine.ts dès que la pioche se vide), AUCUNE
// combinaison ne peut plus être annoncée — useGameEngine.ts,
// proposerAnnonces : `if (s.phase === 'finale') { effectuerPioche(...);
// return }`, la proposition d'annonce est purement et simplement
// sautée. Seul le bonus du 7 d'atout (+10 pts, cf. pli.ts) reste actif
// en phase finale — mais ce n'est pas une "combinaison" à protéger :
// c'est un effet automatique appliqué à la carte jouée, indépendant de
// toute notion de protection.
//
// Bug corrigé : cartesProtegeesParCombinaisons (tableCombinaisons.ts)
// continuait à protéger un mariage_atout actif (state.mariagesAtoutActifs)
// et des pièces de quinte en cours MÊME en phase finale, alors que cette
// protection n'a plus aucun objet (aucune quinte, aucun carré, aucun
// mariage ne pourra plus jamais être annoncé pour cette manche). Résultat
// observé : niveau-intermédiaire (qui n'a aucune autre garde de phase
// finale, contrairement à niveau-difficile qui délègue entièrement au
// minimax dès pioche vide, cf. minimaxFinale.ts) continuait à éviter de
// jouer le Roi/la Dame d'un mariage actif, quitte à jouer une carte plus
// coûteuse à la place — un choix strictement moins bon, sans aucune
// contrepartie.
//
// Portée : niveau-difficile n'était PAS affecté (routage vers le
// minimax avant tout calcul de cartesUtiles, cf. niveau-difficile.ts,
// ligne `if (piocheRestante === 0) { return choisirCarteMinimaxFinale(...) }`).
// niveau-facile n'était pas affecté non plus (n'appelle jamais cette
// fonction, par conception). Seul niveau-intermédiaire était concerné.
//
// Choix du signal : state.phase === 'finale', PAS state.pioche.length
// === 0 — ce dernier est utilisé par certains états de test comme pure
// simplification, sans intention de représenter une vraie phase finale
// (cf. tests/unit/cartes_utiles_atteignabilite.test.ts, qui construit
// délibérément `pioche: []` pour tester l'atteignabilité des
// combinaisons en cours de manche normale). Utiliser `state.phase` évite
// ce faux-positif — vérifié par contrôle A/B direct pendant l'implémentation.
// ============================================================

import { describe, it, expect } from 'vitest'
import { choisirCarteIA } from '../../src/core/ia'
import { cartesProtegeesParCombinaisons } from '../../src/core/ia/tableCombinaisons'
import { cartesUtilesAuxCombis } from '../../src/core/ia/helpers'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur, Rang, AnnoncePosee } from '../../src/types'

// ── Helpers ──────────────────────────────────────────────────

let _pos = 0
const c = (couleur: Couleur, rang: Rang, jeu = 0): Carte => creerCarte(couleur, rang, jeu, _pos++)

/**
 * Mariage d'atout actif (Roi+Dame cœur) — protégé normalement tant que
 * la quinte n'est pas annoncée. `phase` et `pioche` sont paramétrables
 * pour comparer le comportement en/hors phase finale sur le MÊME état.
 */
function stateAvecMariageActif(phase: 'libre' | 'finale', pioche: Carte[] = [c('clubs', '7')]): {
  state: GameState
  roiCoeurMarie: Carte
  dameCoeurMariee: Carte
} {
  const roiCoeurMarie = c('hearts', 'K')
  const dameCoeurMariee = c('hearts', 'Q')

  const { state } = initialiserPartie(CONFIG_DEFAUT)
  let base = initialiserChampsIT4({
    ...state,
    couleurAtout: 'hearts',
    phase,
    pioche,
    pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 0, cartes: [null, null] },
  })
  base = {
    ...base,
    annonces: [
      { joueurId: 1, nom: 'mariage_atout', points: 40, cartesIds: [roiCoeurMarie.id, dameCoeurMariee.id], mancheNumero: 1 },
    ] as AnnoncePosee[],
    usagesCartes: [
      { carteId: roiCoeurMarie.id, combinaisonsUtilisees: ['mariage_atout'] },
      { carteId: dameCoeurMariee.id, combinaisonsUtilisees: ['mariage_atout'] },
    ],
    mariagesAtoutActifs: [[], [[roiCoeurMarie.id, dameCoeurMariee.id]]],
  }
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[1] = { ...joueurs[1], main: [roiCoeurMarie, dameCoeurMariee], cartesEtalees: [] }
  base = { ...base, joueurs }

  return { state: base, roiCoeurMarie, dameCoeurMariee }
}

// ============================================================
// Unité — cartesProtegeesParCombinaisons / cartesUtilesAuxCombis
// ============================================================

describe('Phase finale — cartesProtegeesParCombinaisons désactivée', () => {
  it('phase finale : retourne un ensemble VIDE, même avec un mariage_atout actif', () => {
    const { state } = stateAvecMariageActif('finale', [])
    const proteges = cartesProtegeesParCombinaisons(state, 1)
    expect(proteges.size).toBe(0)
  })

  it('phase libre (même état sinon identique) : le mariage actif reste protégé normalement', () => {
    const { state, roiCoeurMarie, dameCoeurMariee } = stateAvecMariageActif('libre')
    const proteges = cartesProtegeesParCombinaisons(state, 1)
    expect(proteges.has(roiCoeurMarie.id)).toBe(true)
    expect(proteges.has(dameCoeurMariee.id)).toBe(true)
  })

  it('cartesUtilesAuxCombis (alias utilisé par les niveaux IA) reflète la même désactivation en phase finale', () => {
    const { state } = stateAvecMariageActif('finale', [])
    const utiles = cartesUtilesAuxCombis(state, 1)
    expect(utiles.size).toBe(0)
  })

  it('pioche vide MAIS phase encore "libre" (construction de test simplifiée, PAS une vraie phase finale) : protection normale conservée', () => {
    // Distingue explicitement le signal utilisé (state.phase) d'un
    // simple `pioche.length === 0` — cf. cartes_utiles_atteignabilite.test.ts,
    // qui construit délibérément des états à pioche vide en phase
    // 'libre' pour tester l'atteignabilité des combinaisons, sans
    // vouloir représenter une vraie phase finale.
    const { state, roiCoeurMarie, dameCoeurMariee } = stateAvecMariageActif('libre', [])
    expect(state.pioche.length).toBe(0)
    expect(state.phase).toBe('libre')
    const proteges = cartesProtegeesParCombinaisons(state, 1)
    expect(proteges.has(roiCoeurMarie.id)).toBe(true)
    expect(proteges.has(dameCoeurMariee.id)).toBe(true)
  })

  it('quinte en préparation (As+10+Valet d\'atout en main) : elle aussi non protégée en phase finale', () => {
    const asAtout = c('hearts', 'A')
    const dixAtout = c('hearts', '10')
    const valetAtout = c('hearts', 'J')
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4({
      ...state, couleurAtout: 'hearts', phase: 'finale', pioche: [],
    })
    const joueurs = [...base.joueurs] as typeof base.joueurs
    joueurs[1] = { ...joueurs[1], main: [asAtout, dixAtout, valetAtout], cartesEtalees: [] }
    const stateFinal = { ...base, joueurs }

    const proteges = cartesProtegeesParCombinaisons(stateFinal, 1)
    expect(proteges.size).toBe(0)
  })
})

// ============================================================
// Intégration — niveau INTERMÉDIAIRE (seul niveau réellement affecté)
// ============================================================

describe('Phase finale — niveau intermédiaire ne sacrifie plus une carte à tort pour "protéger" un mariage obsolète', () => {
  it(
    'Roi libre (non marié) ET Dame mariée disponibles pour gagner le pli : ' +
    'joue la Dame (rang minimal), plus le Roi (rang supérieur, choix pré-correctif)',
    () => {
      const roiCoeurMarie = c('hearts', 'K')
      const dameCoeur = c('hearts', 'Q')       // protégée par le mariage (roiCoeurMarie + dameCoeur)
      const roiCoeurLibre = c('hearts', 'K', 1) // autre exemplaire du Roi, PAS dans la paire mariée
      const asPique = c('spades', 'A')

      const { state } = initialiserPartie(CONFIG_DEFAUT)
      let base = initialiserChampsIT4({
        ...state, couleurAtout: 'hearts', phase: 'finale', pioche: [],
        pliEnCours: { carteJoueur0: asPique, carteJoueur1: null, joueurOuvreur: 0, cartes: [asPique, null] },
      })
      base = {
        ...base,
        annonces: [
          { joueurId: 1, nom: 'mariage_atout', points: 40, cartesIds: [roiCoeurMarie.id, dameCoeur.id], mancheNumero: 1 },
        ] as AnnoncePosee[],
        mariagesAtoutActifs: [[], [[roiCoeurMarie.id, dameCoeur.id]]],
      }
      const joueurs = [...base.joueurs] as typeof base.joueurs
      joueurs[1] = { ...joueurs[1], main: [dameCoeur, roiCoeurLibre], cartesEtalees: [] }
      base = { ...base, joueurs }

      const carte = choisirCarteIA(base, 'intermediaire')
      expect(carte?.id).toBe(dameCoeur.id)
      expect(carte?.id).not.toBe(roiCoeurLibre.id)
    }
  )

  it('même scénario, HORS phase finale (phase libre, pioche non vide) : protège toujours le mariage comme avant', () => {
    const roiCoeurMarie = c('hearts', 'K')
    const dameCoeur = c('hearts', 'Q')
    const roiCoeurLibre = c('hearts', 'K', 1)
    const asPique = c('spades', 'A')

    const { state } = initialiserPartie(CONFIG_DEFAUT)
    let base = initialiserChampsIT4({
      ...state, couleurAtout: 'hearts', phase: 'libre', pioche: [c('clubs', '7')],
      pliEnCours: { carteJoueur0: asPique, carteJoueur1: null, joueurOuvreur: 0, cartes: [asPique, null] },
    })
    base = {
      ...base,
      annonces: [
        { joueurId: 1, nom: 'mariage_atout', points: 40, cartesIds: [roiCoeurMarie.id, dameCoeur.id], mancheNumero: 1 },
      ] as AnnoncePosee[],
      // usagesCartes est requis : sans lui, dameCoeur/roiCoeurMarie ne
      // sont pas marqués "déjà utilisés dans mariage_atout", et la
      // matrice d'éligibilité (calculerEligibiliteCarte) considère alors
      // à tort roiCoeurLibre + dameCoeur comme un NOUVEAU mariage_atout
      // encore annonçable (légitime dans l'absolu — deux jeux différents
      // du Roi/Dame de même couleur forment bien une paire valide — mais
      // pas le scénario visé ici, où seule la protection au titre du
      // mariage DÉJÀ actif doit être testée).
      usagesCartes: [
        { carteId: roiCoeurMarie.id, combinaisonsUtilisees: ['mariage_atout'] },
        { carteId: dameCoeur.id, combinaisonsUtilisees: ['mariage_atout'] },
      ],
      mariagesAtoutActifs: [[], [[roiCoeurMarie.id, dameCoeur.id]]],
    }
    const joueurs = [...base.joueurs] as typeof base.joueurs
    joueurs[1] = { ...joueurs[1], main: [dameCoeur, roiCoeurLibre], cartesEtalees: [] }
    base = { ...base, joueurs }

    const carte = choisirCarteIA(base, 'intermediaire')
    // Hors phase finale, la Dame mariée reste protégée : c'est le Roi
    // libre (plus coûteux mais non protégé) qui doit être sacrifié —
    // comportement inchangé par ce correctif.
    expect(carte?.id).toBe(roiCoeurLibre.id)
    expect(carte?.id).not.toBe(dameCoeur.id)
  })
})

// ============================================================
// Non-régression — niveau DIFFICILE inchangé (déjà correct avant)
// ============================================================

describe('Phase finale — niveau difficile inchangé (délègue déjà entièrement au minimax)', () => {
  it('même scénario que le bug intermédiaire : ne crashe pas, reste cohérent (minimax, pas de notion de mariage)', () => {
    const roiCoeurMarie = c('hearts', 'K')
    const dameCoeur = c('hearts', 'Q')
    const roiCoeurLibre = c('hearts', 'K', 1)
    const asPique = c('spades', 'A')

    const { state } = initialiserPartie(CONFIG_DEFAUT)
    let base = initialiserChampsIT4({
      ...state, couleurAtout: 'hearts', phase: 'finale', pioche: [],
      pliEnCours: { carteJoueur0: asPique, carteJoueur1: null, joueurOuvreur: 0, cartes: [asPique, null] },
    })
    base = {
      ...base,
      annonces: [
        { joueurId: 1, nom: 'mariage_atout', points: 40, cartesIds: [roiCoeurMarie.id, dameCoeur.id], mancheNumero: 1 },
      ] as AnnoncePosee[],
      mariagesAtoutActifs: [[], [[roiCoeurMarie.id, dameCoeur.id]]],
    }
    const joueurs = [...base.joueurs] as typeof base.joueurs
    joueurs[1] = { ...joueurs[1], main: [dameCoeur, roiCoeurLibre], cartesEtalees: [] }
    base = { ...base, joueurs }

    const carte = choisirCarteIA(base, 'difficile')
    expect(carte).not.toBeNull()
    expect(['hearts']).toContain(carte?.couleur)
  })
})

// ============================================================
// Non-régression — comportement existant hors phase finale inchangé
// ============================================================

describe('Non-régression — protection normale (hors phase finale) inchangée par ce correctif', () => {
  it('mariage actif protégé normalement en phase libre avec pioche non vide (cas courant)', () => {
    const { state, roiCoeurMarie, dameCoeurMariee } = stateAvecMariageActif('libre', [c('clubs', '7'), c('clubs', '8')])
    const proteges = cartesProtegeesParCombinaisons(state, 1)
    expect(proteges.has(roiCoeurMarie.id)).toBe(true)
    expect(proteges.has(dameCoeurMariee.id)).toBe(true)
  })

  it('sans aucun mariage actif ni phase finale, aucune protection additionnelle (comportement de base inchangé)', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4({ ...state, couleurAtout: 'hearts', phase: 'libre' })
    // Main vidée explicitement : la distribution initiale aléatoire de
    // initialiserPartie (9 cartes réelles) pourrait sinon contenir par
    // hasard une paire ou une pièce de combinaison, rendant cette
    // assertion dépendante du hasard.
    const joueurs = [...base.joueurs] as typeof base.joueurs
    joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [] }
    const stateVide = { ...base, joueurs }
    const proteges = cartesProtegeesParCombinaisons(stateVide, 1)
    expect(proteges.size).toBe(0)
  })
})
