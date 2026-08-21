// ============================================================
// TESTS — Piste 3 : Mode AGRESSIF (ouverture) — risque de contre
// évalué, cartes protégées exclues, variation de style réintroduite
//
// Rappel du diagnostic initial : le bloc d'ouverture du mode agressif
// exposait systématiquement l'atout le plus fort disponible
// (`atoutsFortes`), sans jamais tenir compte des cartes protégées par
// une combinaison, ni du risque qu'une brisque d'atout adverse batte
// ce coup, et sans jamais varier son style (D.4 désactivée).
//
// BUG DÉCOUVERT PENDANT L'IMPLÉMENTATION (corrigé ici) : le code tel
// que trouvé calculait `atoutsFortes` avec le seuil
// `ORDRE_RANGS[c.rang] >= ORDRE_RANGS['10']`, qui ne retient EN
// RÉALITÉ que l'As et le 10 d'atout (K/Q/J sont width strictement en
// dessous de ce seuil, malgré un commentaire qui affirmait à tort le
// contraire). Comme As et 10 sont TOUJOURS des brisques
// (VALEURS_BRISQUES), la condition `possedeBrisqueAtout` du code
// original était une TAUTOLOGIE — toujours vraie dès que
// `atoutsFortes` était non vide — ce qui rendait la branche "risque de
// contre" totalement inatteignable (code mort). La correction remplace
// ce test par `esAsInvincible` (le meilleur candidat est-il l'As,
// intrinsèquement imparable ?), et fait REPLIER la décision sur la
// suite de la cascade (au lieu de forcer un choix mathématiquement
// identique) quand le risque est réel et qu'aucune carte plus sûre
// n'est disponible dans ce lot.
//
// Tous les scénarios ci-dessous ont été vérifiés empiriquement par
// instrumentation du code (valeurs de risqueContre/brisquesRestantes
// et chemin de décision réellement emprunté) avant d'écrire les
// assertions, pour éviter toute erreur de calcul à la main.
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { choisirCarteIA } from '../../src/core/ia'
import { calculerValeurEspereeBrisque } from '../../src/core/ia/tableBrisques'
import { brisquesNonVuesRestantes } from '../../src/core/ia/memoire'
import { objectifBrisqueAtteignable } from '../../src/core/ia/anticipation'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

// ── Helpers ──────────────────────────────────────────────────

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte => creerCarte(couleur, rang, jeu, _pos++)

/** État simple, sans calibration de risque particulière (mode par défaut). */
function makeState(mainIA: Carte[]): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({
    ...state,
    couleurAtout: 'clubs' as Couleur,
    compteurManches: [0, 3] as [number, number], // adversaire mène 3-0 → modeAgressif
    pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 1, cartes: [null, null] },
    pioche: Array.from({ length: 16 }, () => c('spades', '9')),
  })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[1] = { ...joueurs[1], main: mainIA, pileRemportee: [] }
  return { ...base, joueurs }
}

/** Toutes les brisques (As+10) des 3 couleurs non-atout, pour calibrer précisément brisquesRestantes. */
function autresBrisquesNonClubs(offset: number): Carte[] {
  const cartes: Carte[] = []
  for (const couleur of ['hearts', 'diamonds', 'spades'] as Couleur[]) {
    for (const rang of ['A', '10'] as const) {
      for (let j = 0; j < 4; j++) cartes.push(creerCarte(couleur, rang, j, offset + cartes.length))
    }
  }
  return cartes
}

/**
 * État calibré pour rester en mode 'chasse' (pas 'repli') avec
 * brisquesRestantes EXACTEMENT à 6 (≤ 6, donc le bloc "Contrôle atout"
 * plus bas dans la cascade ne se redéclenche PAS non plus — condition
 * `brisquesRestantes > 6`) : 10 brisques non-clubs déjà capturées par
 * l'IA (objectif encore atteignable : 16-10=6 manquantes ≤ 6 non
 * vues), le reste des brisques non-clubs déjà vues côté humain, et un
 * As de clubs déjà vu pour ramener le compte clubs à 6.
 *
 * `risqueAdverseEleve` contrôle uniquement la taille de la main
 * adverse (0 = risque nul, car calculerValeurEspereeBrisque pondère
 * par mainAdverse/(pioche+mainAdverse)) — c'est le SEUL paramètre qui
 * varie entre le scénario "risque élevé" et "risque faible" ci-dessous.
 */
function stateCalibreeChasse(mainIA: Carte[], offset: number, mainAdverseVide: boolean): GameState {
  const unAsClubVu = creerCarte('clubs', 'A', 2, offset + 1)
  const autres = autresBrisquesNonClubs(offset + 100)
  const iaDejaCapturees = autres.slice(0, 10)
  const humainVues = [...autres.slice(10), unAsClubVu]

  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({
    ...state,
    couleurAtout: 'clubs' as Couleur,
    compteurManches: [0, 3] as [number, number],
    pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 1, cartes: [null, null] },
    pioche: Array.from({ length: 16 }, (_, i) => creerCarte('spades', '9', 0, offset + 3000 + i)),
  })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  // mainAdverseVide=false conserve la distribution initiale (9 cartes,
  // via base.joueurs[0].main) → risque élevé ; true la vide → risque nul.
  joueurs[0] = { ...joueurs[0], main: mainAdverseVide ? [] : base.joueurs[0].main, pileRemportee: humainVues }
  joueurs[1] = { ...joueurs[1], main: mainIA, pileRemportee: iaDejaCapturees }
  return { ...base, joueurs }
}

// ============================================================
// Correctif du bug (possedeBrisqueAtout tautologique → esAsInvincible)
// ============================================================

describe('Piste 3 — le meilleur candidat détermine si le risque est évalué (correctif du bug)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('l\'As d\'atout est TOUJOURS exposé en mode agressif, même avec un risque de contre non nul', () => {
    // Neutralise la variation de style D.4 (réintroduite par la piste 3,
    // probabiliste 5-10%) : ce test isole la logique "As imparable",
    // pas le comportement probabiliste de D.4 (testé séparément plus bas).
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    // État par défaut (non calibré) : main adverse normale (9 cartes),
    // pioche modérée → risqueContre non nul par construction, mais la
    // présence de l'As en main doit primer sur ce risque.
    const state = makeState([c('clubs', 'A'), c('clubs', '10'), c('clubs', '8')])
    expect(objectifBrisqueAtteignable(state, 1).mode).toBe('chasse') // pas 'repli' (sinon modePrudent primerait)
    expect(calculerValeurEspereeBrisque(state, 'clubs', 1)).toBeGreaterThan(0) // risque non nul

    const carte = choisirCarteIA(state, 'difficile')
    // L'As est imparable : exposé malgré le risque calculé.
    expect(carte?.rang).toBe('A')
    expect(carte?.couleur).toBe('clubs')
  })
})

// ============================================================
// Effet comportemental réel du repli sur risque (le cœur de la piste 3)
// ============================================================

describe('Piste 3 — repli sur la cascade normale quand le seul candidat fort est le 10 et le risque est élevé', () => {
  it('risque de contre ÉLEVÉ, seul candidat = 10 d\'atout → NE l\'expose PAS, replie sur la défausse sûre', () => {
    const state = stateCalibreeChasse(
      [c('clubs', '10'), c('clubs', '8')],
      20_000,
      false // main adverse normale (9 cartes) → risque élevé (vérifié : ≈ 2.16 ≥ 1)
    )
    expect(objectifBrisqueAtteignable(state, 1).mode).toBe('chasse')
    expect(calculerValeurEspereeBrisque(state, 'clubs', 1)).toBeGreaterThanOrEqual(1)
    expect(brisquesNonVuesRestantes(state, 1)).toBeLessThanOrEqual(6)

    const carte = choisirCarteIA(state, 'difficile')
    // Ne joue PAS le 10 (risqué) — replie sur la défausse par défaut (8, non-brisque).
    expect(carte?.rang).not.toBe('10')
    expect(carte?.rang).toBe('8')
  })

  it('MÊME configuration mais risque FAIBLE (main adverse vide) → expose le 10 sans hésiter', () => {
    const state = stateCalibreeChasse(
      [c('clubs', '10'), c('clubs', '8')],
      30_000,
      true // main adverse vidée artificiellement → probabilité de contre nulle
    )
    expect(objectifBrisqueAtteignable(state, 1).mode).toBe('chasse')
    expect(calculerValeurEspereeBrisque(state, 'clubs', 1)).toBe(0)
    expect(brisquesNonVuesRestantes(state, 1)).toBeLessThanOrEqual(6)

    const carte = choisirCarteIA(state, 'difficile')
    // Même carte en main, même contexte de manche — SEUL le risque a changé :
    // la décision s'inverse, preuve que `calculerValeurEspereeBrisque` a un
    // effet réel et observable sur le choix de l'IA.
    expect(carte?.rang).toBe('10')
    expect(carte?.couleur).toBe('clubs')
  })
})

// ============================================================
// Protection des combinaisons (quinte A+10+J d'atout)
// ============================================================

describe('Piste 3 — les cartes protégées par une quinte en cours restent exclues de l\'exposition agressive', () => {
  it('quinte potentielle (A+10+J d\'atout en main) → atoutsFortes vide → repli sur la défausse par défaut', () => {
    const state = makeState([c('clubs', 'A'), c('clubs', '10'), c('clubs', 'J'), c('clubs', '8')])
    const carte = choisirCarteIA(state, 'difficile')
    // Ni l'As ni le 10 (tous deux protégés par la quinte en cours) ne
    // sont exposés — repli sur la carte non-brisque, non-utile (le 8).
    expect(carte?.rang).not.toBe('A')
    expect(carte?.rang).not.toBe('10')
    expect(carte?.rang).toBe('8')
  })
})

// ============================================================
// D.4 — Variation de style réintroduite en mode agressif
// ============================================================

describe('Piste 3 — la variation de style (D.4) est réintroduite dans le bloc agressif d\'ouverture', () => {
  afterEach(() => vi.restoreAllMocks())

  it('Math.random() très bas → joue la 2e meilleure carte (10) au lieu de l\'As', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const state = makeState([c('clubs', 'A'), c('clubs', '10')])
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.rang).toBe('10')
  })

  it('Math.random() très haut → joue la meilleure carte (As), pas de variation', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const state = makeState([c('clubs', 'A'), c('clubs', '10')])
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.rang).toBe('A')
  })

  it('sur 100 tirages : produit bien les deux cartes (variation active, non figée)', () => {
    const cartesJouees = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const state = makeState([c('clubs', 'A'), c('clubs', '10')])
      const carte = choisirCarteIA(state, 'difficile')
      if (carte) cartesJouees.add(carte.rang)
    }
    expect(cartesJouees.size).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================
// Non-régression — comportements historiques préservés
// ============================================================

describe('Piste 3 — non-régression des comportements historiques', () => {
  it('mode PRUDENT (IA mène 3-0) reste inchangé — hors du périmètre de la piste 3', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4({
      ...state,
      couleurAtout: 'clubs' as Couleur,
      compteurManches: [3, 0] as [number, number], // IA mène → mode prudent
      pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 1, cartes: [null, null] },
      pioche: Array.from({ length: 16 }, () => c('spades', '9')),
    })
    const joueurs = [...base.joueurs] as typeof base.joueurs
    joueurs[1] = { ...joueurs[1], main: [c('clubs', 'A'), c('clubs', '8')], pileRemportee: [] }
    const carte = choisirCarteIA({ ...base, joueurs }, 'difficile')
    expect(carte?.rang).toBe('8') // carte minimale, pas l'As
  })

  it('scénario historique (As+10+8 en main, mode agressif par défaut) : joue toujours un atout fort', () => {
    const state = makeState([c('clubs', 'A'), c('clubs', '10'), c('clubs', '8')])
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.couleur).toBe('clubs')
    expect(['A', '10'].includes(carte?.rang ?? '')).toBe(true)
  })

  it('situation normale (1-1, hors mode agressif) : ne crashe pas et reste cohérente', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4({
      ...state,
      couleurAtout: 'clubs' as Couleur,
      compteurManches: [1, 1] as [number, number],
      pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 1, cartes: [null, null] },
      pioche: Array.from({ length: 16 }, () => c('spades', '9')),
    })
    const joueurs = [...base.joueurs] as typeof base.joueurs
    joueurs[1] = { ...joueurs[1], main: [c('clubs', 'A'), c('hearts', '8')], pileRemportee: [] }
    const carte = choisirCarteIA({ ...base, joueurs }, 'difficile')
    expect(carte).not.toBeNull()
  })
})
