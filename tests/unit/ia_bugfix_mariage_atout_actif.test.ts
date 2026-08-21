// ============================================================
// TESTS — Bugfix : protection du mariage d'atout ACTIF
// (rapporté) : l'IA cassait un mariage d'atout étalé pour capturer une
// brisque, alors qu'une Dame libre (doublon non marié, ex. issue d'un
// 4_dames) était disponible pour le même sacrifice — invalidant du
// même coup l'éligibilité de la quinte pour la manche en cours
// (detecterQuinte exige un mariage_atout actif comme prérequis,
// cf. combinaisons.ts).
//
// Cause racine : cartesProtegeesParCombinaisons (tableCombinaisons.ts)
// ne consultait que la matrice d'éligibilité à de NOUVELLES annonces —
// un Roi/Dame de mariage_atout déjà annoncé y est "épuisé" (plus aucun
// type éligible), donc considéré à tort comme sacrifiable. Le rôle de
// PRÉREQUIS ACTIF pour la quinte (state.mariagesAtoutActifs) n'était
// jamais consulté par ce mécanisme de protection.
//
// Portée constatée pendant l'investigation :
//   - niveau-difficile.ts : protection restaurée pour tout le bloc
//     RÉPONSE (via cartesUtilesAuxCombis, qui délègue à
//     cartesProtegeesParCombinaisons) — y compris la variation de
//     style D.4, qui piochait par erreur dans le pool NON filtré et
//     pouvait réintroduire la carte protégée malgré le filtre.
//   - niveau-intermediaire.ts : DEUX points d'interception distincts
//     concernés — "Bloc RÉPONSE" (déjà protégé via cartesUtiles) ET
//     "Évolution 1 — Couper l'As adverse avec atout", qui ne consultait
//     cartesUtiles nulle part (bug distinct, même cause racine).
//   - strategies.ts (strategieCouper10, PARTAGÉE par les 3 niveaux) :
//     TROISIÈME point d'interception distinct, découvert séparément —
//     quand l'adversaire MÈNE un 10 (pas un As), la branche "Cas A,
//     étape 3 : atout gagnant le plus faible" ne consultait cartesUtiles
//     nulle part non plus. Comme cette fonction est appelée AVANT le
//     Bloc RÉPONSE générique (et même avant que cartesUtiles soit
//     calculé, dans le cas du niveau difficile), elle court-circuitait
//     toute protection déjà en place plus loin dans la cascade. Le choix
//     entre deux cartes de même rang (une mariée, une libre) dépendait
//     alors uniquement de l'ordre du tableau `cartesEtalees`/`main`, pas
//     d'une stratégie — reproductible à volonté en permutant cet ordre.
//     Corrigé en ajoutant un paramètre `cartesUtiles` optionnel à
//     `strategieCouper10`, transmis par les niveaux intermédiaire et
//     difficile (qui le calculent déjà), volontairement PAS transmis
//     par le niveau facile (cf. ci-dessous).
//   - niveau-facile.ts : AUCUNE notion de protection de combinaison
//     n'existe à ce niveau (design volontaire — IA "débutante" 100%
//     aléatoire avec erreurs). Le bug n'y est donc pas "présent" au
//     sens d'une régression : il n'y a jamais eu de protection à
//     réparer. Non modifié (hors périmètre) — y compris pour
//     strategieCouper10, appelée sans son 4e paramètre à ce niveau.
//   - Limite connue, non traitée ici (hors périmètre du bug rapporté) :
//     en phase finale (pioche vide), niveau-difficile délègue
//     INTÉGRALEMENT la décision à choisirCarteMinimaxFinale
//     (minimaxFinale.ts), qui ne modélise NI les combinaisons ni les
//     mariages actifs — seule la différence de brisques + bonus est
//     optimisée. Le même scénario, une fois la pioche épuisée, peut
//     donc encore casser un mariage actif. Corriger cela exigerait de
//     faire porter au minimax la valeur des combinaisons, un chantier
//     à part entière au-delà de ce correctif.
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { choisirCarteIA } from '../../src/core/ia'
import { strategieCouper10 } from '../../src/core/ia/strategies'
import { cartesUtilesAuxCombis } from '../../src/core/ia/helpers'
import { cartesProtegeesParCombinaisons } from '../../src/core/ia/tableCombinaisons'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur, AnnoncePosee } from '../../src/types'

// ── Helpers ──────────────────────────────────────────────────

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte => creerCarte(couleur, rang, jeu, _pos++)

/**
 * Reproduit exactement le scénario rapporté : atout cœur, mariage
 * d'atout étalé (Roi+Dame cœur), + une Dame de cœur EXTRA (doublon
 * physique, issue d'un 4_dames déjà annoncé avec les 4 dames dont ce
 * doublon), et l'humain ouvre avec un As pique (brisque, non-atout).
 *
 * IMPORTANT : les champs annonces/usagesCartes/mariagesAtoutActifs
 * doivent être appliqués APRÈS initialiserChampsIT4 (qui les
 * réinitialise sinon à vide).
 */
function scenarioBug(piocheVide = false): {
  state: GameState
  roiCoeurMarie: Carte
  dameCoeurMariee: Carte
  dameCoeurExtra: Carte
} {
  const roiCoeurMarie = c('hearts', 'K')
  const dameCoeurMariee = c('hearts', 'Q', 0)
  const dameCoeurExtra = c('hearts', 'Q', 1)
  const dameSpadesUsee = c('spades', 'Q')
  const dameDiamondsUsee = c('diamonds', 'Q')
  const dameClubsUsee = c('clubs', 'Q')
  const asSpadesHumain = c('spades', 'A')

  const { state } = initialiserPartie(CONFIG_DEFAUT)
  let base = initialiserChampsIT4({
    ...state,
    couleurAtout: 'hearts',
    pliEnCours: {
      carteJoueur0: asSpadesHumain, carteJoueur1: null,
      joueurOuvreur: 0, cartes: [asSpadesHumain, null],
    },
    pioche: piocheVide ? [] : [c('clubs', '7')],
    compteurManches: [0, 0],
  })
  base = {
    ...base,
    annonces: [
      { joueurId: 1, nom: 'mariage_atout', points: 40, cartesIds: [roiCoeurMarie.id, dameCoeurMariee.id], mancheNumero: 1 },
      { joueurId: 1, nom: '4_dame', points: 60, cartesIds: [dameSpadesUsee.id, dameCoeurExtra.id, dameDiamondsUsee.id, dameClubsUsee.id], mancheNumero: 1 },
    ] as AnnoncePosee[],
    usagesCartes: [
      { carteId: roiCoeurMarie.id, combinaisonsUtilisees: ['mariage_atout'] },
      { carteId: dameCoeurMariee.id, combinaisonsUtilisees: ['mariage_atout'] },
      { carteId: dameSpadesUsee.id, combinaisonsUtilisees: ['4_dame'] },
      { carteId: dameCoeurExtra.id, combinaisonsUtilisees: ['4_dame'] },
      { carteId: dameDiamondsUsee.id, combinaisonsUtilisees: ['4_dame'] },
      { carteId: dameClubsUsee.id, combinaisonsUtilisees: ['4_dame'] },
    ],
    mariagesAtoutActifs: [[], [[roiCoeurMarie.id, dameCoeurMariee.id]]],
  }
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [] }
  joueurs[1] = {
    ...joueurs[1],
    main: [],
    cartesEtalees: [roiCoeurMarie, dameCoeurMariee, dameCoeurExtra, dameSpadesUsee, dameDiamondsUsee, dameClubsUsee],
  }
  base = { ...base, joueurs }

  return { state: base, roiCoeurMarie, dameCoeurMariee, dameCoeurExtra }
}

/**
 * Variante du scénario ci-dessus, découverte séparément : l'adversaire
 * mène avec un 10 NON-ATOUT (au lieu d'un As), déclenchant
 * `strategieCouper10` — Cas A, étape 3 ("atout gagnant le plus
 * faible") — un chemin de décision entièrement différent du Bloc
 * RÉPONSE générique, appelé PLUS TÔT dans la cascade des niveaux
 * intermédiaire et difficile.
 *
 * `ordreInverse` permute l'ordre des deux Dames dans `cartesEtalees` :
 * avant correctif, le choix dépendait UNIQUEMENT de cet ordre (aucune
 * notion de protection) — ce paramètre sert donc à prouver que le
 * correctif rend le choix indépendant de l'ordre, dans les deux sens.
 */
function scenarioBugDixMene(ordreInverse = false): {
  state: GameState
  roiCoeurMarie: Carte
  dameCoeurMariee: Carte
  dameCoeurExtra: Carte
} {
  const roiCoeurMarie = c('hearts', 'K')
  const dameCoeurMariee = c('hearts', 'Q', 0)
  const dameCoeurExtra = c('hearts', 'Q', 1)
  const dameSpadesUsee = c('spades', 'Q')
  const dameDiamondsUsee = c('diamonds', 'Q')
  const dameClubsUsee = c('clubs', 'Q')
  const dixSpadesHumain = c('spades', '10') // 10 non-atout (déclenche strategieCouper10, pas le Bloc RÉPONSE)

  const { state } = initialiserPartie(CONFIG_DEFAUT)
  let base = initialiserChampsIT4({
    ...state,
    couleurAtout: 'hearts',
    pliEnCours: {
      carteJoueur0: dixSpadesHumain, carteJoueur1: null,
      joueurOuvreur: 0, cartes: [dixSpadesHumain, null],
    },
    pioche: [c('clubs', '7')],
    compteurManches: [0, 0],
  })
  base = {
    ...base,
    annonces: [
      { joueurId: 1, nom: 'mariage_atout', points: 40, cartesIds: [roiCoeurMarie.id, dameCoeurMariee.id], mancheNumero: 1 },
      { joueurId: 1, nom: '4_dame', points: 60, cartesIds: [dameSpadesUsee.id, dameCoeurExtra.id, dameDiamondsUsee.id, dameClubsUsee.id], mancheNumero: 1 },
    ] as AnnoncePosee[],
    usagesCartes: [
      { carteId: roiCoeurMarie.id, combinaisonsUtilisees: ['mariage_atout'] },
      { carteId: dameCoeurMariee.id, combinaisonsUtilisees: ['mariage_atout'] },
      { carteId: dameSpadesUsee.id, combinaisonsUtilisees: ['4_dame'] },
      { carteId: dameCoeurExtra.id, combinaisonsUtilisees: ['4_dame'] },
      { carteId: dameDiamondsUsee.id, combinaisonsUtilisees: ['4_dame'] },
      { carteId: dameClubsUsee.id, combinaisonsUtilisees: ['4_dame'] },
    ],
    mariagesAtoutActifs: [[], [[roiCoeurMarie.id, dameCoeurMariee.id]]],
  }
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [] }
  const etaleesIA = ordreInverse
    ? [roiCoeurMarie, dameCoeurExtra, dameCoeurMariee, dameSpadesUsee, dameDiamondsUsee, dameClubsUsee]
    : [roiCoeurMarie, dameCoeurMariee, dameCoeurExtra, dameSpadesUsee, dameDiamondsUsee, dameClubsUsee]
  joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: etaleesIA }
  base = { ...base, joueurs }

  return { state: base, roiCoeurMarie, dameCoeurMariee, dameCoeurExtra }
}

// ============================================================
// Unité — cartesProtegeesParCombinaisons / cartesUtilesAuxCombis
// ============================================================

describe('Bugfix mariage actif — protection au niveau de cartesProtegeesParCombinaisons', () => {
  it('le Roi ET la Dame d\'un mariage_atout actif sont protégés, même "épuisés" pour de nouvelles annonces', () => {
    const { state, roiCoeurMarie, dameCoeurMariee } = scenarioBug()
    const proteges = cartesProtegeesParCombinaisons(state, 1)
    expect(proteges.has(roiCoeurMarie.id)).toBe(true)
    expect(proteges.has(dameCoeurMariee.id)).toBe(true)
  })

  it('un doublon (même rang+couleur) qui n\'est PAS dans la paire mariée reste, lui, sacrifiable', () => {
    const { state, dameCoeurExtra } = scenarioBug()
    const proteges = cartesProtegeesParCombinaisons(state, 1)
    expect(proteges.has(dameCoeurExtra.id)).toBe(false)
  })

  it('cartesUtilesAuxCombis (alias utilisé par les niveaux IA) reflète la même protection', () => {
    const { state, roiCoeurMarie, dameCoeurMariee, dameCoeurExtra } = scenarioBug()
    const proteges = cartesUtilesAuxCombis(state, 1)
    expect(proteges.has(roiCoeurMarie.id)).toBe(true)
    expect(proteges.has(dameCoeurMariee.id)).toBe(true)
    expect(proteges.has(dameCoeurExtra.id)).toBe(false)
  })

  it('la protection du mariage actif est levée une fois la quinte annoncée par ce joueur', () => {
    const { state, roiCoeurMarie, dameCoeurMariee } = scenarioBug()
    const stateAvecQuinte: GameState = {
      ...state,
      annonces: [
        ...(state.annonces ?? []),
        { joueurId: 1, nom: 'quinte', points: 250, cartesIds: [], mancheNumero: 1 },
      ],
    }
    const proteges = cartesProtegeesParCombinaisons(stateAvecQuinte, 1)
    expect(proteges.has(roiCoeurMarie.id)).toBe(false)
    expect(proteges.has(dameCoeurMariee.id)).toBe(false)
  })

  it('un mariage_atout actif d\'un AUTRE joueur (siège 0) ne protège pas les cartes du siège 1', () => {
    const { state } = scenarioBug()
    const roiAutreJoueur = c('diamonds', 'K')
    const dameAutreJoueur = c('diamonds', 'Q')
    const stateAutre: GameState = {
      ...state,
      mariagesAtoutActifs: [[[roiAutreJoueur.id, dameAutreJoueur.id]], state.mariagesAtoutActifs![1]],
    }
    const proteges = cartesProtegeesParCombinaisons(stateAutre, 1)
    expect(proteges.has(roiAutreJoueur.id)).toBe(false)
    expect(proteges.has(dameAutreJoueur.id)).toBe(false)
  })
})

// ============================================================
// Intégration — niveau DIFFICILE
// ============================================================

describe('Bugfix mariage actif — niveau difficile (choisirCarteIA)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reproduction exacte du bug rapporté : sacrifie la Dame LIBRE, jamais la Dame ou le Roi mariés', () => {
    const { state, dameCoeurExtra } = scenarioBug()
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.id).toBe(dameCoeurExtra.id)
  })

  it('la variation de style D.4 ne réintroduit jamais la carte protégée (100 tirages, Math.random réel)', () => {
    const { state, roiCoeurMarie, dameCoeurMariee, dameCoeurExtra } = scenarioBug()
    for (let i = 0; i < 100; i++) {
      const carte = choisirCarteIA(state, 'difficile')
      expect(carte?.id).not.toBe(roiCoeurMarie.id)
      expect(carte?.id).not.toBe(dameCoeurMariee.id)
      expect(carte?.id).toBe(dameCoeurExtra.id)
    }
  })

  it('sans doublon libre disponible, l\'IA doit tout de même pouvoir gagner le pli (repli forcé sur la carte protégée)', () => {
    // Neutralise D.4 : gagnantsSansUtiles est vide ici (roi ET dame
    // mariés protégés, aucune alternative), donc le pool de variation
    // retombe sur `gagnants` complet (2 cartes) — sans ce mock, D.4 peut
    // occasionnellement choisir le Roi plutôt que la Dame (rang minimal),
    // ce qui reste correct mais rendrait cette assertion précise flaky.
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const { state, dameCoeurExtra } = scenarioBug()
    // Retire le doublon libre : seuls le Roi et la Dame mariés restent.
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[1] = {
      ...joueurs[1],
      cartesEtalees: joueurs[1].cartesEtalees.filter(e => e.id !== dameCoeurExtra.id),
    }
    const stateSansDoublon = { ...state, joueurs }

    const carte = choisirCarteIA(stateSansDoublon, 'difficile')
    // Aucune carte protégée disponible autrement : le pli doit quand même
    // être gagné (la protection ne doit jamais faire refuser un gain
    // possible quand c'est la seule option) — la Dame (rang minimal parmi
    // les deux restantes) est jouée, brisant le mariage faute d'alternative.
    expect(carte?.rang).toBe('Q')
    expect(carte?.couleur).toBe('hearts')
  })

  it('protection levée après annonce de la quinte : peut désormais casser le mariage si besoin', () => {
    // Neutralise la variation de style D.4 (probabiliste, 5-10%) : ce
    // test isole la logique "protection levée après quinte", pas le
    // comportement probabiliste de D.4 (qui a accès à ce chemin dès que
    // K et Q deviennent tous deux des candidats non protégés).
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const { state, roiCoeurMarie, dameCoeurMariee, dameCoeurExtra } = scenarioBug()
    // Retire le doublon libre ET simule la quinte déjà annoncée : plus
    // aucune raison de préserver le mariage, la carte protégée redevient
    // un choix normal (rang minimal).
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[1] = {
      ...joueurs[1],
      cartesEtalees: joueurs[1].cartesEtalees.filter(e => e.id !== dameCoeurExtra.id),
    }
    const stateAvecQuinte: GameState = {
      ...state,
      joueurs,
      annonces: [
        ...(state.annonces ?? []),
        { joueurId: 1, nom: 'quinte', points: 250, cartesIds: [], mancheNumero: 1 },
      ],
    }
    const carte = choisirCarteIA(stateAvecQuinte, 'difficile')
    expect(carte?.rang).toBe('Q')
    expect([roiCoeurMarie.id, dameCoeurMariee.id]).not.toContain(undefined) // sanity
    expect(carte?.id).toBe(dameCoeurMariee.id)
  })
})

// ============================================================
// Intégration — niveau INTERMÉDIAIRE
// ============================================================

describe('Bugfix mariage actif — niveau intermédiaire (choisirCarteIA)', () => {
  it('reproduction exacte du bug rapporté : sacrifie la Dame LIBRE, jamais la Dame ou le Roi mariés', () => {
    const { state, dameCoeurExtra } = scenarioBug()
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(dameCoeurExtra.id)
  })

  it('bug distinct corrigé : "Couper l\'As adverse avec atout" (Évolution 1) respecte désormais cartesUtiles', () => {
    // Scénario resserré sur EXACTEMENT le chemin "Couper As" (carteOuverte
    // est un As non-atout, couleurAtout défini) pour isoler ce bloc précis
    // de la cascade (avant même le bloc RÉPONSE générique).
    const { state, roiCoeurMarie, dameCoeurMariee, dameCoeurExtra } = scenarioBug()
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).not.toBe(roiCoeurMarie.id)
    expect(carte?.id).not.toBe(dameCoeurMariee.id)
    expect(carte?.id).toBe(dameCoeurExtra.id)
  })

  it('sans doublon libre disponible, gagne quand même le pli (repli forcé)', () => {
    const { state, dameCoeurExtra } = scenarioBug()
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[1] = {
      ...joueurs[1],
      cartesEtalees: joueurs[1].cartesEtalees.filter(e => e.id !== dameCoeurExtra.id),
    }
    const stateSansDoublon = { ...state, joueurs }
    const carte = choisirCarteIA(stateSansDoublon, 'intermediaire')
    expect(carte?.rang).toBe('Q')
    expect(carte?.couleur).toBe('hearts')
  })
})

// ============================================================
// Bug distinct découvert séparément — strategieCouper10 ("10" mène)
// ============================================================

describe('Bugfix distinct — strategieCouper10 (adversaire mène un 10 non-atout)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('unité : à rang égal, préfère la carte NON protégée (Dame libre) à la Dame mariée', () => {
    const { state, dameCoeurMariee, dameCoeurExtra } = scenarioBugDixMene()
    const candidats = [...state.joueurs[1].main, ...state.joueurs[1].cartesEtalees]
    const carteOuverte = state.pliEnCours.carteJoueur0!
    const proteges = cartesUtilesAuxCombis(state, 1)
    const carte = strategieCouper10(candidats, carteOuverte, state, proteges)
    expect(carte?.id).toBe(dameCoeurExtra.id)
    expect(carte?.id).not.toBe(dameCoeurMariee.id)
  })

  it('unité : sans le 4e paramètre (comportement pré-correctif), la protection n\'est PAS appliquée', () => {
    // Documente explicitement le comportement quand `cartesUtiles` est
    // omis (c'est le cas d'usage du niveau facile) : le choix retombe
    // sur le premier candidat de même rang, sans notion de protection —
    // ordre-dépendant par construction, PAS un bug de ce correctif.
    const { state, dameCoeurMariee } = scenarioBugDixMene()
    const candidats = [...state.joueurs[1].main, ...state.joueurs[1].cartesEtalees]
    const carteOuverte = state.pliEnCours.carteJoueur0!
    const carte = strategieCouper10(candidats, carteOuverte, state) // pas de cartesUtiles
    expect(carte?.id).toBe(dameCoeurMariee.id) // 1er du tableau, ordre par défaut
  })

  it('intégration DIFFICILE : choix indépendant de l\'ordre des cartes étalées (ordre normal)', () => {
    const { state, roiCoeurMarie, dameCoeurMariee, dameCoeurExtra } = scenarioBugDixMene(false)
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.id).not.toBe(roiCoeurMarie.id)
    expect(carte?.id).not.toBe(dameCoeurMariee.id)
    expect(carte?.id).toBe(dameCoeurExtra.id)
  })

  it('intégration DIFFICILE : même résultat avec l\'ordre INVERSE (avant correctif, cet ordre changeait le résultat)', () => {
    const { state, roiCoeurMarie, dameCoeurMariee, dameCoeurExtra } = scenarioBugDixMene(true)
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.id).not.toBe(roiCoeurMarie.id)
    expect(carte?.id).not.toBe(dameCoeurMariee.id)
    expect(carte?.id).toBe(dameCoeurExtra.id)
  })

  it('intégration INTERMÉDIAIRE : choix indépendant de l\'ordre des cartes étalées (ordre normal)', () => {
    const { state, roiCoeurMarie, dameCoeurMariee, dameCoeurExtra } = scenarioBugDixMene(false)
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).not.toBe(roiCoeurMarie.id)
    expect(carte?.id).not.toBe(dameCoeurMariee.id)
    expect(carte?.id).toBe(dameCoeurExtra.id)
  })

  it('intégration INTERMÉDIAIRE : même résultat avec l\'ordre INVERSE', () => {
    const { state, roiCoeurMarie, dameCoeurMariee, dameCoeurExtra } = scenarioBugDixMene(true)
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).not.toBe(roiCoeurMarie.id)
    expect(carte?.id).not.toBe(dameCoeurMariee.id)
    expect(carte?.id).toBe(dameCoeurExtra.id)
  })

  it('sans doublon libre disponible, gagne quand même le pli (repli forcé sur la carte protégée)', () => {
    const { state, dameCoeurExtra } = scenarioBugDixMene()
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[1] = {
      ...joueurs[1],
      cartesEtalees: joueurs[1].cartesEtalees.filter(e => e.id !== dameCoeurExtra.id),
    }
    const stateSansDoublon = { ...state, joueurs }
    const carte = choisirCarteIA(stateSansDoublon, 'difficile')
    expect(carte?.rang).toBe('Q')
    expect(carte?.couleur).toBe('hearts')
  })

  it('plusieurs As d\'atout (10 d\'ATOUT mené, Cas B) : préfère aussi le doublon libre à un As protégé (ex. pièce de quinte)', () => {
    // Scénario indépendant, Cas B de strategieCouper10 (l'adversaire
    // mène le 10 D'ATOUT lui-même, pas un 10 non-atout) : deux As
    // d'atout, l'un protégé (pièce d'une quinte en préparation avec
    // 10+Valet d'atout déjà en main), l'autre libre.
    const dixCoeurHumain = c('hearts', '10', 3) // 10 d'ATOUT mené → déclenche le Cas B
    const asAtoutProtege = c('hearts', 'A', 0)
    const dixAtoutPourQuinte = c('hearts', '10', 1)
    const valetAtoutPourQuinte = c('hearts', 'J', 0)
    const asAtoutLibre = c('hearts', 'A', 1)

    const { state } = initialiserPartie(CONFIG_DEFAUT)
    let base = initialiserChampsIT4({
      ...state,
      couleurAtout: 'hearts',
      pliEnCours: { carteJoueur0: dixCoeurHumain, carteJoueur1: null, joueurOuvreur: 0, cartes: [dixCoeurHumain, null] },
      pioche: [c('clubs', '7'), c('clubs', '8')], // pioche > 2 : n'active pas la branche "As unique"
      compteurManches: [0, 0] as [number, number],
    })
    base = {
      ...base,
      annonces: [
        { joueurId: 1, nom: 'mariage_atout', points: 40, cartesIds: [c('hearts', 'K', 2).id, c('hearts', 'Q', 2).id], mancheNumero: 1 },
      ] as AnnoncePosee[],
    }
    const joueurs = [...base.joueurs] as typeof base.joueurs
    joueurs[1] = {
      ...joueurs[1],
      main: [asAtoutProtege, dixAtoutPourQuinte, valetAtoutPourQuinte, asAtoutLibre],
      cartesEtalees: [],
    }
    const stateQuinte = { ...base, joueurs }

    const carte = choisirCarteIA(stateQuinte, 'difficile')
    expect(carte?.id).toBe(asAtoutLibre.id)
    expect(carte?.id).not.toBe(asAtoutProtege.id)
  })
})



describe('Niveau facile — hors périmètre du correctif (aucune notion de protection de combinaison)', () => {
  it('ne crashe pas sur le même scénario (comportement aléatoire/débutant inchangé par conception)', () => {
    const { state } = scenarioBug()
    const carte = choisirCarteIA(state, 'facile')
    expect(carte).not.toBeNull()
  })
})

// ============================================================
// Non-régression — comportements existants inchangés
// ============================================================

describe('Non-régression — comportements existants inchangés par ce correctif', () => {
  it('sans aucun mariage actif, le comportement de capture de brisque reste inchangé (difficile)', () => {
    const asHumain = c('spades', 'A')
    const roiCoeur = c('hearts', 'K')
    const dameCoeur = c('hearts', 'Q')
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4({
      ...state,
      couleurAtout: 'hearts',
      pliEnCours: { carteJoueur0: asHumain, carteJoueur1: null, joueurOuvreur: 0, cartes: [asHumain, null] },
      pioche: [c('clubs', '7')],
      compteurManches: [0, 0] as [number, number],
    })
    const joueurs = [...base.joueurs] as typeof base.joueurs
    joueurs[1] = { ...joueurs[1], main: [roiCoeur, dameCoeur], cartesEtalees: [] }
    const carte = choisirCarteIA({ ...base, joueurs }, 'difficile')
    expect(carte?.couleur).toBe('hearts')
  })

  it('mariagesAtoutActifs vide (aucun mariage annoncé) : aucune protection additionnelle, comportement inchangé', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4({ ...state, couleurAtout: 'hearts' })
    const joueurs = [...base.joueurs] as typeof base.joueurs
    const roiCoeur = c('hearts', 'K')
    const dameCoeur = c('hearts', 'Q')
    joueurs[1] = { ...joueurs[1], main: [roiCoeur, dameCoeur], cartesEtalees: [] }
    const proteges = cartesProtegeesParCombinaisons({ ...base, joueurs }, 1)
    // Roi+Dame en MAIN (pas encore annoncés) restent protégés via la
    // matrice d'éligibilité classique (mariage_atout futur possible) —
    // comportement préexistant, non affecté par ce correctif.
    expect(proteges.has(roiCoeur.id)).toBe(true)
    expect(proteges.has(dameCoeur.id)).toBe(true)
  })
})
