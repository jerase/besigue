// ============================================================
// TESTS — Stratégie "Couper le 10" (IT-6.2)
// Vérifie la réponse de l'IA quand le joueur humain joue un 10,
// pour les 3 niveaux : facile, intermédiaire, difficile.
//
// Cas A — 10 non-atout :
//   1. As de même couleur dans étalées IA → couper avec cet As
//   2. As de même couleur en main IA      → couper avec cet As
//   3. Atout défini → atout le plus faible
//   4. Sinon fallback
//
// Cas B — 10 atout :
//   1. IA a plusieurs As d'atout → jouer un As d'atout
//   2. IA a 1 seul As d'atout + pioche ≤ 2 → jouer cet As
//   3. Sinon fallback
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { choisirCarteIA } from '../../src/core/ia'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur, NiveauIA } from '../../src/types'

// Le niveau "facile" pioche dans Math.random() pour décider s'il applique
// (ou "rate" volontairement) une stratégie. On fige le hasard à une valeur
// haute pour que ces tests de non-régression soient déterministes : cela
// désactive les comportements probabilistes d'erreur volontaire et laisse
// place à l'application normale des règles testées ici.
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.99)
})
afterEach(() => {
  vi.restoreAllMocks()
})

// ── Helpers ──────────────────────────────────────────────────

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

const NIVEAUX: NiveauIA[] = ['facile', 'intermediaire', 'difficile']

/**
 * Construit un état de jeu où :
 * - le joueur humain (J0) a posé `carteHumain` comme première carte du pli
 * - l'IA (J1) a `mainIA` en main et `etaleesIA` dans ses étalées
 * - l'atout est `couleurAtout` (null si non défini)
 * - la pioche contient `nbPioche` cartes fictives
 */
function makeStateAvecPli(
  carteHumain: Carte,
  mainIA: Carte[],
  etaleesIA: Carte[] = [],
  couleurAtout: Couleur | null = null,
  nbPioche = 16
): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({
    ...state,
    couleurAtout,
    pliEnCours: { carteJoueur0: carteHumain, carteJoueur1: null, joueurOuvreur: 0 },
    pioche: Array.from({ length: nbPioche }, (_, i) => c('clubs', '7')),
  })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], main: [carteHumain] }
  joueurs[1] = { ...joueurs[1], main: mainIA, cartesEtalees: etaleesIA }
  return { ...base, joueurs }
}

// ============================================================
// CAS A — 10 NON-ATOUT
// ============================================================

describe('Cas A.1 — As de même couleur dans les étalées IA', () => {
  const dix = c('hearts', '10')
  const asEtalee = c('hearts', 'A')
  const autreAsMain = c('spades', 'A')

  NIVEAUX.forEach(niveau => {
    it(`[${niveau}] joue l'As de cœur depuis les étalées`, () => {
      const state = makeStateAvecPli(
        dix,
        [autreAsMain, c('clubs', 'K'), c('spades', '8')], // main sans As hearts
        [asEtalee],                                         // As hearts dans étalées
        'clubs'                                             // atout = trèfle
      )
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asEtalee.id)
    })
  })

  it('[facile] joue l\'As depuis étalées même s\'il y a un As en main de la même couleur', () => {
    // Quand les étalées ont la priorité (règle 1 > règle 2)
    const dixH = c('hearts', '10')
    const asEtale2 = c('hearts', 'A', 1) // As hearts en étalées
    const asMain2  = c('hearts', 'A', 0) // As hearts en main aussi
    const state = makeStateAvecPli(
      dixH,
      [asMain2, c('diamonds', '8')],
      [asEtale2],
      'clubs'
    )
    const carte = choisirCarteIA(state, 'facile')
    // L'as depuis les étalées a la priorité
    expect(carte?.id).toBe(asEtale2.id)
  })
})

describe('Cas A.2 — As de même couleur en main IA (pas dans étalées)', () => {
  const dix = c('diamonds', '10')
  const asMain = c('diamonds', 'A')

  NIVEAUX.forEach(niveau => {
    it(`[${niveau}] joue l'As de carreau depuis la main`, () => {
      const state = makeStateAvecPli(
        dix,
        [asMain, c('clubs', 'K'), c('spades', '9')],
        [], // pas d'étalées
        'hearts'
      )
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asMain.id)
    })
  })

  it('[intermediaire] préfère l\'As en étalées sur l\'As en main', () => {
    const dixS = c('spades', '10')
    const asEtale3 = c('spades', 'A', 1)
    const asMain3  = c('spades', 'A', 0)
    const state = makeStateAvecPli(
      dixS,
      [asMain3, c('clubs', '8')],
      [asEtale3],
      'hearts'
    )
    const carte = choisirCarteIA(state, 'intermediaire')
    // Règle 1 (étalées) avant règle 2 (main)
    expect(carte?.id).toBe(asEtale3.id)
  })
})

describe('Cas A.3 — Pas d\'As de même couleur, couper avec atout le plus faible', () => {
  NIVEAUX.forEach(niveau => {
    it(`[${niveau}] joue l'atout le plus faible qui est disponible`, () => {
      const dixH = c('hearts', '10')
      const atoutFaible = c('clubs', '8')  // 8 de trèfle (atout)
      const atoutFort   = c('clubs', 'K')  // K de trèfle (atout)
      const state = makeStateAvecPli(
        dixH,
        [atoutFaible, atoutFort, c('spades', 'K')],
        [],
        'clubs' // atout = trèfle
      )
      const carte = choisirCarteIA(state, niveau)
      // Doit choisir le 8 de trèfle (le plus faible atout)
      expect(carte?.id).toBe(atoutFaible.id)
    })
  })

  it('[difficile] choisit le 7 d\'atout (rang le plus bas) parmi plusieurs atouts', () => {
    const dixS = c('spades', '10')
    const sept  = c('hearts', '7')  // 7 de cœur (atout) — bat quand même le 10 non-atout
    const huit  = c('hearts', '8')
    const neuf  = c('hearts', '9')
    const state = makeStateAvecPli(
      dixS,
      [sept, huit, neuf, c('clubs', 'K')],
      [],
      'hearts'
    )
    const carte = choisirCarteIA(state, 'difficile')
    // Tout atout bat un 10 non-atout → le plus faible (7) est retourné
    expect(carte?.id).toBe(sept.id)
  })

  it('[tous niveaux] vérifie via resoudrePli — tout atout bat un 10 non-atout', () => {
    // Validation que la règle A.3 passe bien par candidatsGagnants
    // Un K d\'atout (rang 6) bat un 10 non-atout même si le 10 a rang 7
    NIVEAUX.forEach(niveau => {
      const dixH = c('hearts', '10')
      const roiAtout = c('clubs', 'K')  // Seule carte disponible = atout
      const state = makeStateAvecPli(
        dixH,
        [roiAtout],
        [],
        'clubs'
      )
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(roiAtout.id) // K atout doit battre le 10 non-atout
    })
  })
})

describe('Cas A.4 — Fallback : pas d\'As, pas d\'atout défini', () => {
  it('[facile] utilise l\'algorithme existant si aucune règle ne s\'applique', () => {
    const dixH = c('hearts', '10')
    const mainIA = [c('clubs', '8'), c('spades', 'K'), c('diamonds', '9')]
    const state = makeStateAvecPli(
      dixH,
      mainIA,
      [],
      null // atout non défini
    )
    // Ne doit pas crasher et retourner une carte valide
    const carte = choisirCarteIA(state, 'facile')
    expect(carte).not.toBeNull()
    expect(mainIA.some(m => m.id === carte?.id)).toBe(true)
  })

  it('[intermediaire] utilise le fallback si l\'As de même couleur n\'est pas dans les candidats', () => {
    // As de hearts dans les étalées mais pas dans candidats (filtrage phase finale)
    const dixH = c('hearts', '10')
    const asEtale4 = c('hearts', 'A')
    const autreMainCard = c('clubs', '8')
    // En phase finale, candidats peut être restreint — simuler sans cet as
    const state = makeStateAvecPli(
      dixH,
      [autreMainCard], // main sans As hearts
      [],              // étalées vides (l'As n'est pas accessible)
      'clubs'
    )
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte).not.toBeNull()
  })
})

// ============================================================
// CAS B — 10 D'ATOUT
// ============================================================

describe('Cas B.1 — 10 atout : IA a plusieurs As d\'atout → jouer un As d\'atout', () => {
  NIVEAUX.forEach(niveau => {
    it(`[${niveau}] joue un As d'atout quand elle en a 2`, () => {
      const dixAtout = c('clubs', '10')  // 10 de trèfle (atout)
      const as1 = c('clubs', 'A', 0)
      const as2 = c('clubs', 'A', 1)
      const state = makeStateAvecPli(
        dixAtout,
        [as1, as2, c('hearts', 'K')],
        [],
        'clubs', // atout = trèfle
        16       // pioche pleine
      )
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.rang).toBe('A')
      expect(carte?.couleur).toBe('clubs')
    })
  })
})

describe('Cas B.2 — 10 atout : 1 seul As d\'atout + pioche ≤ 2 → jouer cet As', () => {
  NIVEAUX.forEach(niveau => {
    it(`[${niveau}] joue l'As d'atout unique si pioche = 0`, () => {
      const dixAtout = c('hearts', '10')
      const asUnique = c('hearts', 'A')
      const state = makeStateAvecPli(
        dixAtout,
        [asUnique, c('clubs', 'K'), c('spades', '9')],
        [],
        'hearts',
        0 // pioche vide
      )
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asUnique.id)
    })

    it(`[${niveau}] joue l'As d'atout unique si pioche = 1`, () => {
      const dixAtout = c('hearts', '10')
      const asUnique2 = c('hearts', 'A')
      const state = makeStateAvecPli(
        dixAtout,
        [asUnique2, c('clubs', 'K')],
        [],
        'hearts',
        1
      )
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asUnique2.id)
    })

    it(`[${niveau}] joue l'As d'atout unique si pioche = 2`, () => {
      const dixAtout = c('hearts', '10')
      const asUnique3 = c('hearts', 'A')
      const state = makeStateAvecPli(
        dixAtout,
        [asUnique3, c('clubs', 'K')],
        [],
        'hearts',
        2
      )
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asUnique3.id)
    })
  })
})

describe('Cas B.3 — Fallback : 1 seul As d\'atout + pioche > 2', () => {
  // strategieCouper10 (B.3) renvoie null quand l'IA n'a qu'un seul As
  // d'atout et que la pioche est encore grande : elle ne force pas le
  // jeu de cet As au seul titre de "couper le 10". Mais un 10 est en
  // lui-même une brisque : si cet As reste le SEUL moyen de remporter
  // le pli (aucune autre carte de la main ne bat le 10), la logique
  // générale de gain de brisque (bloc RÉPONSE, commune à tous les
  // niveaux) rejoue quand même l'As pour capturer la brisque adverse.
  // Pour observer un véritable renoncement, il faut placer l'IA en
  // mode prudent (difficile) ET que l'As soit lui-même "utile" (une
  // quinte d'atout en cours) : dans ce cas seulement l'IA préfère
  // laisser filer plutôt que sacrifier une combinaison utile.
  it('[difficile] mode prudent : ne sacrifie pas l\'As unique s\'il est utile à une combinaison', () => {
    const dixAtout = c('clubs', '10')          // joué par l'humain (jeu 0)
    const asUnique4 = c('clubs', 'A')
    const dixIA     = c('clubs', '10', 1)       // second exemplaire (jeu 1)
    const valetIA   = c('clubs', 'J')
    const state = makeStateAvecPli(
      dixAtout,
      [asUnique4, dixIA, valetIA, c('hearts', '8')],
      [],
      'clubs',
      10 // pioche encore grande
    )
    // Mode prudent : l'IA mène 3-0
    const stateAvecCompteur = { ...state, compteurManches: [3, 0] as [number, number] }
    const carte = choisirCarteIA(stateAvecCompteur, 'difficile')
    // A/10/J d'atout réunis forment une quinte potentielle : l'As est
    // "utile", l'IA préfère se défausser plutôt que le sacrifier.
    expect(carte?.id).not.toBe(asUnique4.id)
  })

  it('[intermediaire] joue quand même l\'As unique : c\'est le seul moyen de gagner la brisque', () => {
    const dixAtout = c('hearts', '10')
    const asUnique5 = c('hearts', 'A')
    const state = makeStateAvecPli(
      dixAtout,
      [asUnique5, c('clubs', '9'), c('spades', '8')],
      [],
      'hearts',
      3 // > 2 → strategieCouper10 (B.3) ne s'applique pas
    )
    const carte = choisirCarteIA(state, 'intermediaire')
    // Contrairement au mode "difficile", l'IA "intermediaire" n'a pas
    // de mode prudent : elle joue son seul atout gagnant pour capturer
    // la brisque, même si la pioche est encore grande.
    expect(carte?.id).toBe(asUnique5.id)
  })

  it('[intermediaire] pioche > seuil petit : gagne la brisque via gagnantsNonUtiles', () => {
    // Pioche strictement supérieure à SEUIL_PIOCHE_PETITE (4) : le mode
    // "agressif" (Évolution 2) ne s'applique pas, mais l'IA gagne quand
    // même la brisque via la branche gagnantsNonUtiles (seul moyen de
    // gagner de toute façon).
    const dixAtout = c('clubs', '10')
    const asUnique6 = c('clubs', 'A')
    const state = makeStateAvecPli(
      dixAtout,
      [asUnique6],
      [],
      'clubs',
      10 // > SEUIL_PIOCHE_PETITE (4) et > 2 (B.3 de strategieCouper10)
    )
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(asUnique6.id)
  })
})

// ============================================================
// NON-RÉGRESSION — Comportement hors 10
// ============================================================

describe('Non-régression — pas de 10 joué par l\'humain', () => {
  it('la stratégie couper10 n\'interfère pas pour un 9', () => {
    const neufH = c('hearts', '9')
    const asMain6 = c('hearts', 'A')
    const state = makeStateAvecPli(
      neufH,
      [asMain6, c('clubs', '8')],
      [],
      'clubs'
    )
    // L'IA ne doit pas systématiquement jouer l'As pour un 9
    // — c'est le fallback qui décide
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
    // On vérifie juste que ça ne crashe pas et retourne quelque chose
  })

  it('la stratégie couper10 ne s\'applique pas à l\'ouverture (pas de carteJoueur0)', () => {
    const mainIA2 = [c('hearts', 'A'), c('clubs', 'K'), c('spades', '8')]
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4({
      ...state,
      couleurAtout: 'clubs',
      pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 1 },
    })
    const joueurs = [...base.joueurs] as typeof base.joueurs
    joueurs[1] = { ...joueurs[1], main: mainIA2, cartesEtalees: [] }
    const stateOuverture = { ...base, joueurs }

    const carte = choisirCarteIA(stateOuverture, 'intermediaire')
    expect(carte).not.toBeNull()
  })

  it('[tous niveaux] retourne null si aucun candidat', () => {
    NIVEAUX.forEach(niveau => {
      const dix = c('clubs', '10')
      const state = makeStateAvecPli(dix, [], [], 'clubs')
      const carte = choisirCarteIA(state, niveau)
      expect(carte).toBeNull()
    })
  })
})

// ============================================================
// CAS LIMITE — Plusieurs règles applicables simultanément
// ============================================================

describe('Priorité des règles A.1 > A.2 > A.3', () => {
  it('As en étalées prioritaire sur As en main', () => {
    const dixD = c('diamonds', '10')
    const asEtale5  = c('diamonds', 'A', 1) // dans étalées
    const asMain5   = c('diamonds', 'A', 0) // en main aussi
    const atoutClu  = c('clubs', '7')       // atout disponible
    const state = makeStateAvecPli(
      dixD,
      [asMain5, atoutClu],
      [asEtale5],
      'clubs'
    )
    NIVEAUX.forEach(niveau => {
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asEtale5.id) // règle 1
    })
  })

  it('As en main prioritaire sur atout', () => {
    const dixH = c('hearts', '10')
    const asMain7 = c('hearts', 'A')
    const atout7  = c('clubs', '8')
    const state = makeStateAvecPli(
      dixH,
      [asMain7, atout7],
      [],
      'clubs'
    )
    NIVEAUX.forEach(niveau => {
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asMain7.id) // règle 2 avant règle 3
    })
  })
})
