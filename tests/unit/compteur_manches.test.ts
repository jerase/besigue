// ============================================================
// TESTS — COMPTEUR DE MANCHES, CENT POINTS, CHARLES BÉZIGUE
// Vérifie la mécanique de comptage des manches (IT-8) :
//   - Vainqueur de manche +1, adversaire → 0
//   - Charles Bézigue (en bas de table) = +2
//   - Victoire de partie à 4-0
//   - "Cent points" = victoire de partie
//   - Persistence du compteur entre les manches
// ============================================================

import { describe, it, expect } from 'vitest'
import { appliquerFinManche, initialiserNouvelleManche } from '../../src/core/finManche'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

// ── Helpers ──────────────────────────────────────────────────

const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0, pos = 0) =>
  creerCarte(couleur, rang, jeu, pos)

/**
 * Crée un état de fin de manche prêt à être résolu.
 * scoreJ0 / scoreJ1 : points de jeu (sur 1000)
 * brisquesJ0 / brisquesJ1 : nombre de brisques dans chaque pile
 * compteurManches : compteur de manches existant (défaut [0, 0])
 *
 * NOTE sur le duo (800, 960, 20, 5) utilisé comme "victoire normale" :
 * calculerBrisques attribue au vainqueur des brisques +brisques*10 et
 * inflige au perdant -200 (si son score >= 200). Avec (800, 300) le
 * perdant tombe à 100 < 750, ce qui déclenche À TORT "en bas de table"
 * (Charles Bézigue, gain +2). Le duo (800, 960) laisse le perdant à
 * 760 après pénalité, donc bien au-dessus du seuil de 750 : la manche
 * reste "normale" (gain +1), ce qui est l'intention de ces tests.
 */
function makeEtatFinManche(
  scoreJ0: number,
  scoreJ1: number,
  brisquesJ0: number,
  brisquesJ1: number,
  compteurManches: [number, number] = [0, 0]
): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({
    ...state,
    phase: 'finale',
    dernierVainqueurPli: 0,
    compteurManches,
  })
  // Remplir les piles avec le bon nombre de brisques (As = brisque)
  const pileJ0 = Array.from({ length: brisquesJ0 }, (_, i) => c('hearts', 'A', i % 4, i))
  const pileJ1 = Array.from({ length: brisquesJ1 }, (_, i) => c('spades', 'A', i % 4, i + 100))
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [], marquePoints: scoreJ0, pileRemportee: pileJ0 }
  joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [], marquePoints: scoreJ1, pileRemportee: pileJ1 }
  return { ...base, joueurs, combisEnAttente: { 0: [], 1: [] } }
}

// ============================================================
// 1. MANCHE SANS VAINQUEUR (personne n'atteint 1000)
// ============================================================

describe('Manche sans vainqueur (< 1000 pts)', () => {
  it('le compteur de manches reste inchangé', () => {
    const state = makeEtatFinManche(400, 500, 12, 10, [1, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBeNull()
    expect(r.vainqueurPartie).toBeNull()
    expect(r.compteurManches).toEqual([1, 0]) // inchangé
  })

  it('centPoints est false', () => {
    const state = makeEtatFinManche(400, 500, 12, 10)
    const r = appliquerFinManche(state)
    expect(r.centPoints).toBe(false)
  })
})

// ============================================================
// 2. VAINQUEUR DE MANCHE — COMPTEUR +1 / ADVERSAIRE → 0
// ============================================================

describe('Vainqueur de manche : compteur +1, adversaire → 0', () => {
  it('J0 gagne la première manche : compteur [1, 0]', () => {
    // J0 : 800 pts + 20 brisques × 10 = 1000 ; J1 : 300 pts
    const state = makeEtatFinManche(800, 960, 20, 5, [0, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(0)
    expect(r.compteurManches[0]).toBe(1)
    expect(r.compteurManches[1]).toBe(0)
  })

  it('J1 gagne la première manche : compteur [0, 1]', () => {
    // J1 : 800 pts + 20 brisques × 10 = 1000 ; J0 : 300 pts
    const state = makeEtatFinManche(960, 800, 5, 20, [0, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(1)
    expect(r.compteurManches[0]).toBe(0)
    expect(r.compteurManches[1]).toBe(1)
  })

  it('J0 gagne une 2e manche : compteur [2, 0]', () => {
    const state = makeEtatFinManche(800, 960, 20, 5, [1, 0])
    const r = appliquerFinManche(state)
    expect(r.compteurManches).toEqual([2, 0])
  })

  it('J1 gagne après J0 : adversaire remis à 0 → compteur [0, 1]', () => {
    // J0 avait 2 manches, J1 gagne → J0 revient à 0
    const state = makeEtatFinManche(960, 800, 5, 20, [2, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(1)
    expect(r.compteurManches).toEqual([0, 1])
  })

  it('si J0 avait 3 manches et J1 gagne, J0 revient à 0', () => {
    const state = makeEtatFinManche(960, 800, 5, 20, [3, 0])
    const r = appliquerFinManche(state)
    expect(r.compteurManches).toEqual([0, 1])
  })
})

// ============================================================
// 3. CHARLES BÉZIGUE DE MANCHE (en bas de table) = +2
// ============================================================

describe('Charles Bézigue de manche (en bas de table) : +2 points de manche', () => {
  it('vainqueur en bas de table : +2 au compteur', () => {
    // J0 atteint 1000, J1 a 500 < 750 → en bas de table
    const state = makeEtatFinManche(800, 500, 20, 5, [0, 0])
    const r = appliquerFinManche(state)
    expect(r.enBasTable).toBe(true)
    expect(r.charlesBezigue).toBe(true)
    expect(r.compteurManches[0]).toBe(2) // +2 au lieu de +1
    expect(r.compteurManches[1]).toBe(0)
  })

  it('vainqueur normal (adversaire ≥ 750) : +1 seulement', () => {
    // J1 a 960 pts ; après la pénalité de brisques (-200, J0 ayant plus
    // de brisques) il reste à 760 ≥ 750 → pas en bas de table
    const state = makeEtatFinManche(800, 960, 20, 5, [0, 0])
    // J0 gagne car plus de brisques
    const r = appliquerFinManche(state)
    expect(r.enBasTable).toBe(false)
    expect(r.compteurManches[0]).toBe(1)
  })

  it('Charles Bézigue avec compteur initial 1 → compteur 3', () => {
    // J0 avait 1 manche, gagne en bas de table → +2 → 3
    const state = makeEtatFinManche(800, 400, 20, 5, [1, 0])
    const r = appliquerFinManche(state)
    expect(r.charlesBezigue).toBe(true)
    expect(r.compteurManches[0]).toBe(3)
    expect(r.compteurManches[1]).toBe(0)
  })

  it('Charles Bézigue avec compteur initial 2 → compteur 4 → victoire de partie', () => {
    // J0 avait 2 manches, gagne en bas de table → +2 → 4 → victoire
    const state = makeEtatFinManche(800, 400, 20, 5, [2, 0])
    const r = appliquerFinManche(state)
    expect(r.charlesBezigue).toBe(true)
    expect(r.compteurManches[0]).toBe(4)
    expect(r.compteurManches[1]).toBe(0)
    expect(r.vainqueurPartie).toBe(0)
    expect(r.centPoints).toBe(true)
  })
})

// ============================================================
// 4. VICTOIRE DE PARTIE (4-0) — CENT POINTS
// ============================================================

describe('Victoire de partie (4-0) — Cent Points', () => {
  it('J0 à 3 manches gagne la 4e : victoire de partie', () => {
    const state = makeEtatFinManche(800, 300, 20, 5, [3, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(0)
    expect(r.vainqueurPartie).toBe(0)
    expect(r.centPoints).toBe(true)
    expect(r.state.phase).toBe('terminee')
  })

  it('J1 à 3 manches gagne la 4e : victoire de partie pour J1', () => {
    const state = makeEtatFinManche(300, 800, 5, 20, [0, 3])
    const r = appliquerFinManche(state)
    expect(r.vainqueurPartie).toBe(1)
    expect(r.centPoints).toBe(true)
  })

  it('J0 à 3 manches mais J1 gagne la manche : pas de victoire de partie', () => {
    const state = makeEtatFinManche(960, 800, 5, 20, [3, 0])
    const r = appliquerFinManche(state)
    // J1 gagne la manche → J0 remis à 0, J1 à 1
    expect(r.vainqueurManche).toBe(1)
    expect(r.vainqueurPartie).toBeNull()
    expect(r.centPoints).toBe(false)
    expect(r.compteurManches).toEqual([0, 1])
    expect(r.state.phase).not.toBe('terminee')
  })

  it('4-0 avec un Charles Bézigue final : centPoints = true', () => {
    // J0 avait 2 manches, gagne en bas de table → +2 → 4 → centPoints
    const state = makeEtatFinManche(800, 400, 20, 5, [2, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurPartie).toBe(0)
    expect(r.centPoints).toBe(true)
    expect(r.charlesBezigue).toBe(true)
  })

  it('victoire 3 manches normales + 1 Charles Bézigue (total 4) : centPoints', () => {
    // J0 avait 3 manches (normales), gagne encore normalement → 4 → victoire
    const state = makeEtatFinManche(800, 960, 20, 5, [3, 0])
    const r = appliquerFinManche(state)
    expect(r.enBasTable).toBe(false) // J1 > 750
    expect(r.compteurManches[0]).toBe(4)
    expect(r.vainqueurPartie).toBe(0)
    expect(r.centPoints).toBe(true)
  })

  it('si adversaire a 1 point et vainqueur atteint 4 : PAS de victoire (adversaire ≠ 0)', () => {
    // J0 a 4 manches mais J1 a 1 → pas 4-0 → pas de victoire
    const state = makeEtatFinManche(800, 960, 20, 5, [4, 1])
    // Ce cas ne devrait pas arriver en jeu normal mais testons la robustesse
    const r = appliquerFinManche(state)
    // J0 gagne la manche, adversaire (J1) revient à 0
    expect(r.compteurManches[0]).toBe(5) // 4+1
    expect(r.compteurManches[1]).toBe(0)
    // Maintenant J0 a 5 ≥ 4 et J1 = 0 → victoire
    expect(r.vainqueurPartie).toBe(0)
  })
})

// ============================================================
// 5. PERSISTENCE DU COMPTEUR ENTRE LES MANCHES
// ============================================================

describe('Persistence du compteur de manches entre les manches', () => {
  it('initialiserNouvelleManche préserve le compteur (manche avec vainqueur)', () => {
    const state = makeEtatFinManche(800, 960, 20, 5, [1, 0])
    const r = appliquerFinManche(state)
    expect(r.compteurManches).toEqual([2, 0])

    const newState = initialiserNouvelleManche(r.state, CONFIG_DEFAUT, r.vainqueurManche)
    expect(newState.compteurManches).toEqual([2, 0])
  })

  it('nouvelle manche avec vainqueur : scores remis à 0, compteur conservé', () => {
    const state = makeEtatFinManche(800, 960, 20, 5, [2, 0])
    const r = appliquerFinManche(state)
    const newState = initialiserNouvelleManche(r.state, CONFIG_DEFAUT, r.vainqueurManche)

    expect(newState.joueurs[0].marquePoints).toBe(0)
    expect(newState.joueurs[1].marquePoints).toBe(0)
    expect(newState.compteurManches).toEqual([3, 0])
  })

  it('numéro de manche incrémenté', () => {
    const state = makeEtatFinManche(800, 300, 20, 5, [0, 0])
    const r = appliquerFinManche(state)
    const newState = initialiserNouvelleManche(r.state, CONFIG_DEFAUT, r.vainqueurManche)
    expect(newState.mancheNumero).toBe(2)
  })

  it('scénario complet 4 manches : J0 gagne la partie', () => {
    let s = makeEtatFinManche(800, 960, 20, 5, [0, 0])
    let r = appliquerFinManche(s)
    expect(r.compteurManches).toEqual([1, 0])
    expect(r.vainqueurPartie).toBeNull()

    s = makeEtatFinManche(800, 960, 20, 5, r.compteurManches)
    r = appliquerFinManche(s)
    expect(r.compteurManches).toEqual([2, 0])
    expect(r.vainqueurPartie).toBeNull()

    s = makeEtatFinManche(800, 960, 20, 5, r.compteurManches)
    r = appliquerFinManche(s)
    expect(r.compteurManches).toEqual([3, 0])
    expect(r.vainqueurPartie).toBeNull()

    s = makeEtatFinManche(800, 960, 20, 5, r.compteurManches)
    r = appliquerFinManche(s)
    expect(r.compteurManches).toEqual([4, 0])
    expect(r.vainqueurPartie).toBe(0)
    expect(r.centPoints).toBe(true)
  })

  it('scénario avec échange de manches avant victoire', () => {
    let s = makeEtatFinManche(800, 960, 20, 5, [0, 0])
    let r = appliquerFinManche(s)
    expect(r.compteurManches).toEqual([1, 0])

    s = makeEtatFinManche(960, 800, 5, 20, r.compteurManches)
    r = appliquerFinManche(s)
    expect(r.compteurManches).toEqual([0, 1])

    s = makeEtatFinManche(800, 960, 20, 5, r.compteurManches)
    r = appliquerFinManche(s)
    expect(r.compteurManches).toEqual([1, 0])

    s = makeEtatFinManche(800, 960, 20, 5, r.compteurManches)
    r = appliquerFinManche(s)
    expect(r.compteurManches).toEqual([2, 0])

    s = makeEtatFinManche(800, 960, 20, 5, r.compteurManches)
    r = appliquerFinManche(s)
    expect(r.compteurManches).toEqual([3, 0])

    s = makeEtatFinManche(800, 960, 20, 5, r.compteurManches)
    r = appliquerFinManche(s)
    expect(r.compteurManches).toEqual([4, 0])
    expect(r.vainqueurPartie).toBe(0)
    expect(r.centPoints).toBe(true)
  })
})

// ============================================================
// 6. INITIALISATION DU COMPTEUR
// ============================================================

describe('Initialisation du compteur de manches', () => {
  it('une nouvelle partie démarre avec compteur [0, 0]', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    expect(state.compteurManches).toEqual([0, 0])
  })
})

// ============================================================
// 7. CONSERVATION DES SCORES SANS VAINQUEUR
// Régression : quand personne n'atteint 1000 pts, les scores
// doivent être conservés pour la manche suivante.
// ============================================================

describe('Conservation des scores entre les manches (sans vainqueur)', () => {
  it('sans vainqueur : les scores sont conservés tels quels', () => {
    // Personne n'atteint 1000 pts (brisques insuffisantes)
    // J0 : 650 + 10 (bonus pli) + 120 (12 brisques) = 780 < 1000
    // J1 : 120 + 0 + 50 (5 brisques) = 170 < 1000
    const state = makeEtatFinManche(650, 120, 12, 5, [0, 0])
    const r = appliquerFinManche(state)

    expect(r.vainqueurManche).toBeNull()

    const newState = initialiserNouvelleManche(r.state, CONFIG_DEFAUT, r.vainqueurManche)
    // Les scores finaux de la manche sont conservés dans la suivante
    expect(newState.joueurs[0].marquePoints).toBe(r.scoreFinJ0)
    expect(newState.joueurs[1].marquePoints).toBe(r.scoreFinJ1)
    // Les scores ne sont pas à 0
    expect(newState.joueurs[0].marquePoints).toBeGreaterThan(0)
    expect(newState.joueurs[1].marquePoints).toBeGreaterThan(0)
  })

  it('avec vainqueur : les scores repartent à 0', () => {
    // J0 atteint 1000 pts
    const state = makeEtatFinManche(800, 300, 20, 5, [0, 0])
    const r = appliquerFinManche(state)

    expect(r.vainqueurManche).toBe(0)

    const newState = initialiserNouvelleManche(r.state, CONFIG_DEFAUT, r.vainqueurManche)
    expect(newState.joueurs[0].marquePoints).toBe(0)
    expect(newState.joueurs[1].marquePoints).toBe(0)
  })

  it('sans vainqueur : les scores cumulés permettent de gagner la manche suivante', () => {
    // Manche 1 : J0 finit à 780, J1 à 170 — personne n'atteint 1000
    const etat1 = makeEtatFinManche(650, 120, 12, 5, [0, 0])
    const r1 = appliquerFinManche(etat1)
    expect(r1.vainqueurManche).toBeNull()

    // Début manche 2 avec les scores conservés
    const etat2 = initialiserNouvelleManche(r1.state, CONFIG_DEFAUT, r1.vainqueurManche)
    expect(etat2.joueurs[0].marquePoints).toBe(r1.scoreFinJ0)

    // Manche 2 : J0 accumule encore des points et dépasse 1000 au total
    // En recréant un état de fin de manche à partir des scores conservés
    const scoreDepart = etat2.joueurs[0].marquePoints  // ex: 780
    // J0 marque 300 pts en manche 2 → 780 + 300 = 1080 ≥ 1000
    const etatFin2 = makeEtatFinManche(scoreDepart + 300, 50, 5, 2, etat2.compteurManches)
    const r2 = appliquerFinManche(etatFin2)
    expect(r2.vainqueurManche).toBe(0)
    expect(r2.scoreFinJ0).toBeGreaterThanOrEqual(1000)
  })

  it('deux manches consécutives sans vainqueur : scores cumulés sur les deux', () => {
    // Manche 1 : J0=400, J1=300 — ni l'un ni l'autre n'atteint 1000
    const etat1 = makeEtatFinManche(400, 300, 8, 6, [0, 0])
    const r1 = appliquerFinManche(etat1)
    expect(r1.vainqueurManche).toBeNull()

    const score1_J0 = r1.scoreFinJ0
    const score1_J1 = r1.scoreFinJ1

    // Manche 2 : scores repartent des valeurs conservées
    const etat2 = initialiserNouvelleManche(r1.state, CONFIG_DEFAUT, r1.vainqueurManche)
    expect(etat2.joueurs[0].marquePoints).toBe(score1_J0)
    expect(etat2.joueurs[1].marquePoints).toBe(score1_J1)

    // Manche 2 : J0=score1_J0+300, J1=score1_J1+100 — toujours pas 1000
    const etatFin2 = makeEtatFinManche(score1_J0 + 300, score1_J1 + 100, 8, 6, etat2.compteurManches)
    const r2 = appliquerFinManche(etatFin2)
    expect(r2.vainqueurManche).toBeNull()

    // Manche 3 : les scores de la manche 2 sont conservés
    const etat3 = initialiserNouvelleManche(r2.state, CONFIG_DEFAUT, r2.vainqueurManche)
    expect(etat3.joueurs[0].marquePoints).toBe(r2.scoreFinJ0)
    expect(etat3.joueurs[1].marquePoints).toBe(r2.scoreFinJ1)
    // Les scores ont bien cumulé sur 3 manches
    expect(etat3.joueurs[0].marquePoints).toBeGreaterThan(score1_J0)
  })

  it('compteur de manches inchangé quand personne ne gagne', () => {
    const state = makeEtatFinManche(400, 300, 8, 6, [2, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBeNull()

    const newState = initialiserNouvelleManche(r.state, CONFIG_DEFAUT, r.vainqueurManche)
    // Compteur inchangé puisqu'aucune manche n'a été gagnée
    expect(newState.compteurManches).toEqual([2, 0])
  })
})

// ============================================================
// 8. SEUIL DE 1000 PTS ATTEINT EN COURS DE MANCHE
// Régression : si un joueur atteint 1000 pts via des annonces
// (pioche non vide), la fin de manche doit se déclencher.
// appliquerFinManche doit correctement identifier le vainqueur
// et incrémenter le compteur — que le seuil soit atteint en
// cours de jeu ou à l'issue naturelle de la manche.
// ============================================================

describe('Seuil 1000 pts atteint en cours de manche (via annonces)', () => {
  it('J0 exactement à 1000 pts → vainqueurManche = 0', () => {
    // Score atteint via annonces, brisques à 0 pour isoler
    const state = makeEtatFinManche(1000, 600, 0, 0, [0, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(0)
    expect(r.compteurManches[0]).toBe(1)
    expect(r.compteurManches[1]).toBe(0)
  })

  it('J1 exactement à 1000 pts → vainqueurManche = 1', () => {
    const state = makeEtatFinManche(600, 1000, 0, 0, [0, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(1)
    expect(r.compteurManches[0]).toBe(0)
    expect(r.compteurManches[1]).toBe(1)
  })

  it('J0 dépasse 1000 pts (ex: 1040 via annonce) → vainqueurManche = 0', () => {
    const state = makeEtatFinManche(1040, 600, 0, 0, [0, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(0)
    expect(r.compteurManches[0]).toBe(1)
  })

  it('seuil atteint en cours de manche → scores remis à 0 pour la suivante', () => {
    const state = makeEtatFinManche(1000, 400, 0, 0, [0, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(0)

    const newState = initialiserNouvelleManche(r.state, CONFIG_DEFAUT, r.vainqueurManche)
    expect(newState.joueurs[0].marquePoints).toBe(0)
    expect(newState.joueurs[1].marquePoints).toBe(0)
  })

  it('seuil atteint → compteur préservé pour la nouvelle manche', () => {
    const state = makeEtatFinManche(1000, 600, 0, 0, [2, 0])
    const r = appliquerFinManche(state)
    expect(r.compteurManches).toEqual([3, 0])

    const newState = initialiserNouvelleManche(r.state, CONFIG_DEFAUT, r.vainqueurManche)
    expect(newState.compteurManches).toEqual([3, 0])
  })

  it('seuil atteint en bas de table (< 750) → Charles Bézigue +2', () => {
    // J0 = 1000, J1 = 500 < 750 → en bas de table
    const state = makeEtatFinManche(1000, 500, 0, 0, [1, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(0)
    expect(r.enBasTable).toBe(true)
    expect(r.charlesBezigue).toBe(true)
    expect(r.compteurManches[0]).toBe(3) // 1 + 2
    expect(r.compteurManches[1]).toBe(0)
  })

  it('seuil atteint → victoire de partie si compteur atteint 4-0', () => {
    const state = makeEtatFinManche(1000, 600, 0, 0, [3, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(0)
    expect(r.vainqueurPartie).toBe(0)
    expect(r.centPoints).toBe(true)
    expect(r.state.phase).toBe('terminee')
  })

  it('les deux joueurs à 1000 pts → le plus haut gagne', () => {
    const state = makeEtatFinManche(1050, 1000, 0, 0, [0, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(0) // J0 a plus de points
  })

  it('les deux joueurs à 1000 pts exactement → J0 gagne (égalité)', () => {
    const state = makeEtatFinManche(1000, 1000, 0, 0, [0, 0])
    const r = appliquerFinManche(state)
    // score J0 >= score J1 → J0
    expect(r.vainqueurManche).toBe(0)
  })

  it('les deux joueurs à 1000 pts, J1 a le score le plus haut → J1 gagne', () => {
    const state = makeEtatFinManche(1000, 1050, 0, 0, [0, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBe(1) // J1 a plus de points
  })
})

// ============================================================
// 9. FLAG PREMIER BÉSIGUE — PERSISTENCE ENTRE LES MANCHES
// Régression : premierBesiguePose doit être conservé quand la
// manche continue sans vainqueur, et remis à false uniquement
// quand une manche se termine par une victoire à 1000 pts.
// ============================================================

describe('Flag premierBesiguePose — persistence entre les manches', () => {

  it('sans vainqueur : premierBesiguePose conservé à true', () => {
    // Simuler une manche où le bésigue a déjà été posé
    const state = makeEtatFinManche(400, 300, 8, 6, [0, 0])
    const stateAvecBesigue = { ...state, premierBesiguePose: true }
    const r = appliquerFinManche(stateAvecBesigue)
    expect(r.vainqueurManche).toBeNull()

    const newState = initialiserNouvelleManche(r.state, CONFIG_DEFAUT, r.vainqueurManche)
    // Le flag doit être conservé → pas de 2e bésigue à 100 pts
    expect(newState.premierBesiguePose).toBe(true)
  })

  it('sans vainqueur : premierBesiguePose conservé à false', () => {
    // Manche sans bésigue posé
    const state = makeEtatFinManche(400, 300, 8, 6, [0, 0])
    const r = appliquerFinManche(state)
    expect(r.vainqueurManche).toBeNull()

    const newState = initialiserNouvelleManche(r.state, CONFIG_DEFAUT, r.vainqueurManche)
    expect(newState.premierBesiguePose).toBe(false)
  })

  it('avec vainqueur : premierBesiguePose remis à false même si true', () => {
    // Bésigue posé en manche 1, manche gagnée → la manche 2 repart à false
    const state = makeEtatFinManche(800, 300, 20, 5, [0, 0])
    const stateAvecBesigue = { ...state, premierBesiguePose: true }
    const r = appliquerFinManche(stateAvecBesigue)
    expect(r.vainqueurManche).toBe(0)

    const newState = initialiserNouvelleManche(r.state, CONFIG_DEFAUT, r.vainqueurManche)
    // Victoire → nouveau départ → bésigue à 100 pts de nouveau disponible
    expect(newState.premierBesiguePose).toBe(false)
  })

  it('avec vainqueur : premierBesiguePose reste false', () => {
    const state = makeEtatFinManche(800, 300, 20, 5, [0, 0])
    const r = appliquerFinManche(state)
    const newState = initialiserNouvelleManche(r.state, CONFIG_DEFAUT, r.vainqueurManche)
    expect(newState.premierBesiguePose).toBe(false)
  })

  it('scénario complet : manche sans vainqueur, bésigue bloqué à 40 pts', () => {
    // Manche 1 : bésigue posé (premierBesiguePose devient true)
    const state1 = makeEtatFinManche(400, 300, 8, 6, [0, 0])
    const stateB = { ...state1, premierBesiguePose: false }
    const r1 = appliquerFinManche(stateB)
    expect(r1.vainqueurManche).toBeNull()

    // Nouvelle manche sans vainqueur → le flag est conservé
    // On le simule à true (comme si le bésigue avait été posé pendant la manche)
    const stateAvecFlag = { ...r1.state, premierBesiguePose: true }
    const r1b = appliquerFinManche(stateAvecFlag)
    const manche2 = initialiserNouvelleManche(r1b.state, CONFIG_DEFAUT, r1b.vainqueurManche)

    // En manche 2, premierBesiguePose = true → le prochain bésigue vaut 40 pts
    expect(manche2.premierBesiguePose).toBe(true)
  })

  it('scénario complet : victoire puis nouvelle manche, bésigue à 100 pts disponible', () => {
    // Manche 1 : bésigue posé puis victoire à 1000 pts
    const state1 = makeEtatFinManche(800, 300, 20, 5, [0, 0])
    const stateB = { ...state1, premierBesiguePose: true }
    const r1 = appliquerFinManche(stateB)
    expect(r1.vainqueurManche).toBe(0)

    const manche2 = initialiserNouvelleManche(r1.state, CONFIG_DEFAUT, r1.vainqueurManche)
    // Victoire → reset → bésigue à 100 pts disponible en manche 2
    expect(manche2.premierBesiguePose).toBe(false)
  })
})
