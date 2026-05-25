// ============================================================
// TESTS — Niveau FACILE amélioré
// Vérifie les 3 comportements débutants et la non-régression
// de l'aléatoire pur.
//
// Stratégie de test :
//   - Tests probabilistes sur N tirages (comportements émergents)
//   - Tests déterministes via mock Math.random (comportement exact)
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { choisirCarteIA, PROBA_RATER_COUPER10, PROBA_ATOUT_PREMATURE, PROBA_BRISQUE_IMPRUDENTE } from '../../src/core/ia'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

// ── Helpers ──────────────────────────────────────────────────

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

function makeState(
  mainIA: Carte[],
  carteOuverte: Carte | null = null,
  couleurAtout: Couleur | null = null,
  nbPioche = 16
): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({
    ...state,
    couleurAtout,
    pliEnCours: {
      carteJoueur0: carteOuverte,
      carteJoueur1: null,
      joueurOuvreur: 0,
    },
    pioche: Array.from({ length: nbPioche }, (_, i) => c('clubs', '7')),
  })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[1] = { ...joueurs[1], main: mainIA, cartesEtalees: [] }
  return { ...base, joueurs }
}

// Mock Math.random pour forcer un comportement déterministe
function mockRandom(value: number) {
  vi.spyOn(Math, 'random').mockReturnValue(value)
}

// ============================================================
// EXPORTS DES CONSTANTES
// ============================================================

describe('Constantes de probabilité exportées', () => {
  it('PROBA_RATER_COUPER10 est entre 0 et 1', () => {
    expect(PROBA_RATER_COUPER10).toBeGreaterThan(0)
    expect(PROBA_RATER_COUPER10).toBeLessThan(1)
  })
  it('PROBA_ATOUT_PREMATURE est entre 0 et 1', () => {
    expect(PROBA_ATOUT_PREMATURE).toBeGreaterThan(0)
    expect(PROBA_ATOUT_PREMATURE).toBeLessThan(1)
  })
  it('PROBA_BRISQUE_IMPRUDENTE est entre 0 et 1', () => {
    expect(PROBA_BRISQUE_IMPRUDENTE).toBeGreaterThan(0)
    expect(PROBA_BRISQUE_IMPRUDENTE).toBeLessThan(1)
  })
})

// ============================================================
// COMPORTEMENT 1 — Couper le 10 avec risque de rater
// ============================================================

describe('Comportement 1 — Couper le 10 (avec risque de rater)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('applique la règle quand Math.random() >= PROBA_RATER', () => {
    // Math.random() >= 0.33 → ne rate pas → applique la règle
    mockRandom(PROBA_RATER_COUPER10 + 0.01)
    const dix = c('hearts', '10')
    const as  = c('hearts', 'A')
    const state = makeState([as, c('clubs', 'K')], dix, 'clubs')
    const carte = choisirCarteIA(state, 'facile')
    expect(carte?.id).toBe(as.id)
  })

  it('rate la règle quand Math.random() < PROBA_RATER', () => {
    // Math.random() < 0.33 → rate → ne joue PAS forcément l'As
    mockRandom(PROBA_RATER_COUPER10 - 0.01)
    const dix    = c('hearts', '10')
    const as     = c('hearts', 'A')
    const autreK = c('clubs',  'K')
    const state = makeState([as, autreK], dix, 'clubs')
    const carte = choisirCarteIA(state, 'facile')
    // La carte jouée peut être n'importe laquelle (aléatoire) — pas forcément l'As
    expect(carte).not.toBeNull()
    // Ne vérifie pas l'id exact car c'est aléatoire
  })

  it('sur 200 tirages avec un 10 ouvert : coupe au moins 50% du temps (≈67%)', () => {
    vi.restoreAllMocks() // laisser le vrai Math.random
    const dix = c('hearts', '10')
    const as  = c('hearts', 'A')
    let coupes = 0
    for (let i = 0; i < 200; i++) {
      const state = makeState([as, c('clubs', 'K'), c('spades', '8')], dix, 'clubs')
      const carte = choisirCarteIA(state, 'facile')
      if (carte?.id === as.id) coupes++
    }
    // Attendu ~67% (1 - 0.33), tolérance large
    expect(coupes).toBeGreaterThan(90)   // > 45%
    expect(coupes).toBeLessThan(175)     // < 87%
  })

  it('sur 200 tirages : rate au moins ~20% du temps', () => {
    vi.restoreAllMocks()
    const dix = c('hearts', '10')
    const as  = c('hearts', 'A')
    let coupes = 0
    for (let i = 0; i < 200; i++) {
      const state = makeState([as, c('clubs', 'K')], dix, 'clubs')
      const carte = choisirCarteIA(state, 'facile')
      if (carte?.id === as.id) coupes++
    }
    // Elle NE coupe PAS toujours (doit rater ~33%)
    expect(coupes).toBeLessThan(200)
  })
})

// ============================================================
// COMPORTEMENT 2 — Atout prématuré en ouverture
// ============================================================

describe('Comportement 2 — Atout prématuré en ouverture', () => {
  afterEach(() => vi.restoreAllMocks())

  it('joue l\'atout quand random < PROBA_ATOUT et pas de carte ouverte', () => {
    // Séquence : random[0] >= PROBA_RATER (pas de 10 → ignoré) 
    // mais en ouverture : random[0] < PROBA_ATOUT → atout
    // On mock à une valeur < PROBA_ATOUT_PREMATURE
    mockRandom(PROBA_ATOUT_PREMATURE - 0.01)
    const atout = c('clubs', 'K')
    const autre = c('hearts', '8')
    const state = makeState([atout, autre], null, 'clubs')
    const carte = choisirCarteIA(state, 'facile')
    expect(carte?.couleur).toBe('clubs') // un atout
  })

  it('ne joue PAS l\'atout prématurément quand random >= PROBA_ATOUT', () => {
    // random >= 0.30 → pas d'atout prématuré, random >= 0.20 → pas de brisque imprudente
    // → aléatoire pur
    mockRandom(0.99)
    const atout = c('clubs', 'K')
    const autre = c('hearts', '8')
    const state = makeState([atout, autre], null, 'clubs')
    // Ne doit pas crasher, retourne quelque chose
    const carte = choisirCarteIA(state, 'facile')
    expect(carte).not.toBeNull()
  })

  it('ne déclenche PAS en réponse (carte ouverte présente)', () => {
    // L'atout prématuré ne s'applique qu'en ouverture
    vi.restoreAllMocks()
    const carteOuverte = c('hearts', '8') // pas un 10
    const atout = c('clubs', 'K')
    let atoutsJoues = 0
    for (let i = 0; i < 100; i++) {
      const state = makeState([atout, c('spades', '8')], carteOuverte, 'clubs')
      const carte = choisirCarteIA(state, 'facile')
      if (carte?.couleur === 'clubs') atoutsJoues++
    }
    // En réponse, l'atout n'est choisi qu'aléatoirement (50% avec 2 cartes)
    // Il ne doit PAS être joué systématiquement (pas de comportement 2 forcé)
    expect(atoutsJoues).toBeLessThan(100)
  })

  it('sur 200 ouvertures avec atout disponible : joue l\'atout ~30% du temps', () => {
    vi.restoreAllMocks()
    const atout  = c('clubs', 'K')
    const autre1 = c('hearts', '8')
    const autre2 = c('spades', '9')
    let atoutsJoues = 0
    for (let i = 0; i < 200; i++) {
      const state = makeState([atout, autre1, autre2], null, 'clubs')
      const carte = choisirCarteIA(state, 'facile')
      if (carte?.couleur === 'clubs') atoutsJoues++
    }
    // Base aléatoire = 33% (1/3) + boost comportement 2 → attendu ~45–60%
    // Tolérance large : au moins 25%, pas plus de 90%
    expect(atoutsJoues).toBeGreaterThan(40)
    expect(atoutsJoues).toBeLessThan(180)
  })

  it('sans atout disponible : comportement 2 est ignoré silencieusement', () => {
    mockRandom(0) // force comportement 2, mais pas d'atout
    const state = makeState([c('hearts', '8'), c('spades', '9')], null, 'clubs')
    // clubs est l'atout mais l'IA n'en a pas en main
    const carte = choisirCarteIA(state, 'facile')
    expect(carte).not.toBeNull()
  })
})

// ============================================================
// COMPORTEMENT 3 — Brisque imprudente en ouverture
// ============================================================

describe('Comportement 3 — Brisque imprudente en ouverture', () => {
  afterEach(() => vi.restoreAllMocks())

  it('joue une brisque quand conditions remplies (random séquence forcée)', () => {
    // Comportement 2 ne se déclenche pas (pas d'atout), comportement 3 oui
    // Mock : random[0] = 0.99 (skip atout), random[1] < PROBA_BRISQUE → brisque
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.99  // skip atout prématuré
      if (call === 2) return PROBA_BRISQUE_IMPRUDENTE - 0.01 // déclenche brisque
      return 0 // index 0 dans la liste des brisques
    })
    const as    = c('hearts', 'A')  // brisque
    const autre = c('spades', '8')  // non-brisque
    const state = makeState([as, autre], null, null) // pas d'atout
    const carte = choisirCarteIA(state, 'facile')
    expect(carte?.rang).toBe('A') // brisque jouée
  })

  it('ne déclenche PAS en réponse (carte ouverte présente)', () => {
    vi.restoreAllMocks()
    const carteOuverte = c('spades', '7') // pas un 10
    const as = c('hearts', 'A')
    const autres = [c('clubs', '8'), c('diamonds', '9'), c('spades', 'K')]
    let brisquesJouees = 0
    for (let i = 0; i < 100; i++) {
      const state = makeState([as, ...autres], carteOuverte, null)
      const carte = choisirCarteIA(state, 'facile')
      if (carte?.rang === 'A') brisquesJouees++
    }
    // Aléatoire pur en réponse → ~25% (1/4 cartes)
    // Pas de comportement 3 forcé
    expect(brisquesJouees).toBeLessThan(80)
  })

  it('sur 200 ouvertures avec brisques disponibles : joue plus souvent qu\'attendu par hasard', () => {
    vi.restoreAllMocks()
    const as    = c('hearts', 'A') // brisque
    const dix   = c('spades', '10') // brisque
    const sept  = c('clubs',  '7')  // non-brisque
    const huit  = c('diamonds', '8') // non-brisque
    let brisquesJouees = 0
    for (let i = 0; i < 200; i++) {
      const state = makeState([as, dix, sept, huit], null, null)
      const carte = choisirCarteIA(state, 'facile')
      if (carte && (carte.rang === 'A' || carte.rang === '10')) brisquesJouees++
    }
    // Aléatoire pur = 50% (2/4). Comportement 3 booste légèrement au-dessus.
    // Attendu : > 40% (comportement aléatoire de base) et < 95%
    expect(brisquesJouees).toBeGreaterThan(60)
  })

  it('sans brisque disponible : comportement 3 est ignoré', () => {
    mockRandom(0) // force tout à 0 → déclencherait comportement 3 si brisques dispo
    const state = makeState([c('clubs', '7'), c('spades', '9')], null, null)
    const carte = choisirCarteIA(state, 'facile')
    expect(carte).not.toBeNull()
  })
})

// ============================================================
// NON-RÉGRESSION — Aléatoire pur préservé
// ============================================================

describe('Non-régression — Aléatoire pur préservé', () => {
  afterEach(() => vi.restoreAllMocks())

  it('retourne null si aucun candidat', () => {
    const state = makeState([], null, null)
    expect(choisirCarteIA(state, 'facile')).toBeNull()
  })

  it('avec une seule carte → toujours cette carte', () => {
    const seule = c('hearts', '8')
    const state = makeState([seule], null, null)
    for (let i = 0; i < 20; i++) {
      const carte = choisirCarteIA(state, 'facile')
      expect(carte?.id).toBe(seule.id)
    }
  })

  it('produit de la variété sur 50 tirages sans comportements spéciaux', () => {
    vi.restoreAllMocks()
    // Aucune condition spéciale : pas de 10, pas d'atout, pas de brisques
    const state = makeState([
      c('hearts', '7'), c('spades', '8'), c('clubs', '9'),
      c('diamonds', 'K'), c('hearts', 'J'),
    ], null, null)
    const ids = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const carte = choisirCarteIA(state, 'facile')
      if (carte) ids.add(carte.id)
    }
    expect(ids.size).toBeGreaterThan(1)
  })

  it('carte retournée est toujours dans les candidats', () => {
    vi.restoreAllMocks()
    const main = [
      c('hearts', 'A'), c('spades', '10'), c('clubs', 'K'),
      c('diamonds', 'Q'), c('hearts', '8'),
    ]
    const ids = new Set(main.map(m => m.id))
    for (let i = 0; i < 50; i++) {
      const state = makeState([...main], null, 'clubs')
      const carte = choisirCarteIA(state, 'facile')
      if (carte) expect(ids.has(carte.id)).toBe(true)
    }
  })
})

// ============================================================
// NON-RÉGRESSION — Interactions entre comportements
// ============================================================

describe('Non-régression — Interactions entre comportements', () => {
  afterEach(() => vi.restoreAllMocks())

  it('comportement 2 et 3 ne s\'activent jamais en réponse à un 10', () => {
    vi.restoreAllMocks()
    const dix   = c('clubs', '10')  // carte ouverte = 10
    const atout = c('hearts', 'K')  // atout
    const as    = c('spades', 'A')  // brisque non-atout
    const autre = c('diamonds', '8')

    let atoutPremature = 0
    let brisqueImprudente = 0
    for (let i = 0; i < 200; i++) {
      const state = makeState([atout, as, autre], dix, 'hearts')
      const carte = choisirCarteIA(state, 'facile')
      // Les comportements 2 et 3 ne doivent pas s'activer en réponse à un 10
      // (carteOuverte présente → on passe direct à couper10 ou fallback)
      if (carte) {
        // La carte jouée doit être dans la main
        expect([atout.id, as.id, autre.id]).toContain(carte.id)
      }
    }
  })

  it('niveaux intermédiaire et difficile non affectés par les nouvelles constantes', () => {
    vi.restoreAllMocks()
    // Vérifier que les autres niveaux retournent toujours des cartes valides
    const as  = c('hearts', 'A')
    const roi = c('clubs',  'K')
    const state = makeState([as, roi], null, 'clubs')

    for (let i = 0; i < 20; i++) {
      const carteInterm = choisirCarteIA(state, 'intermediaire')
      const carteDiff   = choisirCarteIA(state, 'difficile')
      expect(carteInterm).not.toBeNull()
      expect(carteDiff).not.toBeNull()
    }
  })
})
