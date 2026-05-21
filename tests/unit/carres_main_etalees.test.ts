// ============================================================
// TESTS NON-RÉGRESSION — CARRÉ AVEC DOUBLONS DE COULEUR
// Bug : parCouleur ne prenait qu'une carte par couleur,
// empêchant la détection d'un carré quand 2 Rois de même
// couleur (jeux différents) sont nécessaires pour atteindre 4.
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  detecterCombinaisonsDisponibles,
  appliquerAnnonce,
  initialiserChampsIT4,
} from '../../src/core/combinaisons'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte, creerJoker } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur, AnnoncePosee } from '../../src/types'

const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0, pos = 0) =>
  creerCarte(couleur, rang, jeu, pos)

function makeStateAvecAnnonces(
  cartesMain: Carte[],
  cartesEtalees: Carte[],
  annoncesSupp: AnnoncePosee[],
  couleurAtout: Couleur = 'hearts'
): GameState {
  const { state: base } = initialiserPartie(CONFIG_DEFAUT)
  const state = initialiserChampsIT4({ ...base, couleurAtout, atoutDefini: true })
  const annonceAtout: AnnoncePosee = {
    nom: 'mariage_atout', points: 40,
    cartesIds: [`${couleurAtout}-K-9-900`, `${couleurAtout}-Q-9-901`],
    joueurId: 1, mancheNumero: 1,
  }
  const joueurs = [...state.joueurs] as typeof state.joueurs
  joueurs[0] = { ...joueurs[0], main: cartesMain, cartesEtalees }
  return { ...state, joueurs, annonces: [annonceAtout, ...annoncesSupp] }
}

// ============================================================
// SCÉNARIO EXACT DU BUG
// 3 Rois en main + 1 Roi étalé de couleur différente = carré
// ============================================================

describe('Carré — scénario du bug (3 en main + 1 étalé)', () => {

  it('carré de Rois : 3 en main + 1 étalé de couleur différente → détecté', () => {
    const roiH = c('hearts',   'K', 0, 1)  // étalé via mariage
    const roiS = c('spades',   'K', 0, 2)  // main
    const roiD = c('diamonds', 'K', 0, 3)  // main
    const roiC = c('clubs',    'K', 0, 4)  // main

    const annonceMariage: AnnoncePosee = {
      nom: 'mariage_atout', points: 40,
      cartesIds: [roiH.id, c('hearts', 'Q', 0, 5).id],
      joueurId: 0, mancheNumero: 1,
    }
    const state = makeStateAvecAnnonces(
      [roiS, roiD, roiC],
      [roiH],
      [annonceMariage]
    )
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_roi')).toBe(true)
  })

  it('carré de Dames : 3 en main + 1 étalée = détecté', () => {
    const dameH = c('hearts',   'Q', 0, 1)  // étalée via bésigue
    const dameS = c('spades',   'Q', 0, 2)  // main
    const dameD = c('diamonds', 'Q', 0, 3)  // main
    const dameC = c('clubs',    'Q', 0, 4)  // main

    const annonceBesigue: AnnoncePosee = {
      nom: 'besigue', points: 100,
      cartesIds: [dameS.id, c('diamonds', 'J', 0, 10).id],
      joueurId: 0, mancheNumero: 1,
    }
    const state = makeStateAvecAnnonces(
      [dameD, dameC, dameH],  // dameS est étalée
      [dameS],
      [annonceBesigue]
    )
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_dame')).toBe(true)
  })

  it('carré de Valets : 2 en main + 2 étalés = détecté', () => {
    const valetH = c('hearts',   'J', 0, 1)  // étalé
    const valetS = c('spades',   'J', 0, 2)  // étalé
    const valetD = c('diamonds', 'J', 0, 3)  // main
    const valetC = c('clubs',    'J', 0, 4)  // main

    const state = makeStateAvecAnnonces(
      [valetD, valetC],
      [valetH, valetS],
      []
    )
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_valet')).toBe(true)
  })

  it('carré d\'As : 1 en main + 3 étalés = détecté', () => {
    const asH = c('hearts',   'A', 0, 1)  // étalé
    const asS = c('spades',   'A', 0, 2)  // étalé
    const asD = c('diamonds', 'A', 0, 3)  // étalé
    const asC = c('clubs',    'A', 0, 4)  // main

    const state = makeStateAvecAnnonces(
      [asC],
      [asH, asS, asD],
      []
    )
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_as')).toBe(true)
  })
})

// ============================================================
// DOUBLONS DE COULEUR — même couleur, jeux différents
// ============================================================

describe('Carré — doublons de couleur (4 jeux × même rang)', () => {

  it('carré de Rois avec 2 Rois♥ (jeu0 et jeu1) + 2 autres', () => {
    // Cas impossible avec 1 seul jeu, mais légal avec 4 jeux
    const roiH0 = c('hearts', 'K', 0, 1)  // K♥ jeu0
    const roiH1 = c('hearts', 'K', 1, 33) // K♥ jeu1
    const roiS  = c('spades', 'K', 0, 2)
    const roiD  = c('diamonds', 'K', 0, 3)

    const state = makeStateAvecAnnonces(
      [roiH0, roiH1, roiS, roiD],
      [],
      []
    )
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_roi')).toBe(true)
  })

  it('carré de Dames avec 3 Dames♠ (jeux 0,1,2) + 1 autre', () => {
    const dameS0 = c('spades', 'Q', 0, 1)
    const dameS1 = c('spades', 'Q', 1, 33)
    const dameS2 = c('spades', 'Q', 2, 65)
    const dameH  = c('hearts', 'Q', 0, 4)

    const state = makeStateAvecAnnonces(
      [dameS0, dameS1, dameS2, dameH],
      [],
      []
    )
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_dame')).toBe(true)
  })

  it('carré d\'As avec 4 As♠ (4 jeux différents)', () => {
    const as0 = c('spades', 'A', 0, 1)
    const as1 = c('spades', 'A', 1, 33)
    const as2 = c('spades', 'A', 2, 65)
    const as3 = c('spades', 'A', 3, 97)

    const state = makeStateAvecAnnonces([as0, as1, as2, as3], [], [])
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_as')).toBe(true)
  })
})

// ============================================================
// SCÉNARIO COMPLET — annonce du carré puis non-reproposition
// ============================================================

describe('Carré — cycle complet avec cartes mixtes main+étalées', () => {

  it('carré announcé depuis main+étalées → non reproposé', () => {
    const atout: Couleur = 'hearts'
    const roiH = c(atout,      'K', 0, 1)  // étalé via mariage
    const roiS = c('spades',   'K', 0, 2)
    const roiD = c('diamonds', 'K', 0, 3)
    const roiC = c('clubs',    'K', 0, 4)

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout, atoutDefini: true })
    state = {
      ...state,
      annonces: [
        // mariage_Atout posé par IA (débloque combis)
        { nom: 'mariage_atout' as const, points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1 as const, mancheNumero: 1 },
        // mariage_Atout posé par J0 avec roiH
        { nom: 'mariage_atout' as const, points: 40, cartesIds: [roiH.id, c(atout, 'Q', 0, 10).id], joueurId: 0 as const, mancheNumero: 1 },
      ],
    }
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [roiS, roiD, roiC], cartesEtalees: [roiH] }
    state = { ...state, joueurs }

    // Détection du carré
    const combis = detecterCombinaisonsDisponibles(state, 0)
    const carré = combis.find(c => c.nom === '4_roi')
    expect(carré).toBeDefined()
    expect(carré!.cartesIds).toHaveLength(4)
    expect(carré!.cartesIds).toContain(roiH.id) // le Roi étalé est inclus

    // Annoncer le carré
    state = appliquerAnnonce(state, 0, carré!)
    expect(state.joueurs[0].marquePoints).toBeGreaterThanOrEqual(80)

    // Vérifier non-reproposition
    const combis2 = detecterCombinaisonsDisponibles(state, 0)
    expect(combis2.some(c => c.nom === '4_roi')).toBe(false)
  })

  it('le carré inclut le Roi étalé dans ses cartesIds', () => {
    const atout: Couleur = 'spades'
    const roiH = c('hearts',   'K', 0, 1)  // sera étalé
    const roiD = c('diamonds', 'K', 0, 2)
    const roiC = c('clubs',    'K', 0, 3)
    const roiS = c(atout,      'K', 0, 4)

    const state = makeStateAvecAnnonces(
      [roiD, roiC, roiS],
      [roiH],
      [],
      atout
    )
    const combis = detecterCombinaisonsDisponibles(state, 0)
    const carré = combis.find(c => c.nom === '4_roi')
    expect(carré).toBeDefined()
    // Le Roi étalé doit faire partie du carré
    expect(carré!.cartesIds).toContain(roiH.id)
  })

  it('3 Rois seulement : carré non proposé (sauf avec Joker)', () => {
    const roiH = c('hearts',   'K', 0, 1)
    const roiS = c('spades',   'K', 0, 2)
    const roiD = c('diamonds', 'K', 0, 3)
    // Pas de 4e Roi

    const state = makeStateAvecAnnonces([roiH, roiS, roiD], [], [])
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_roi')).toBe(false)
  })

  it('3 Rois + 1 Joker : carré proposé avec Joker', () => {
    const roiH  = c('hearts',   'K', 0, 1)
    const roiS  = c('spades',   'K', 0, 2)
    const roiD  = c('diamonds', 'K', 0, 3)
    const joker = creerJoker('clubs', 0, 128)

    const state = makeStateAvecAnnonces([roiH, roiS, roiD, joker], [], [])
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_roi')).toBe(true)
    const carré = combis.find(c => c.nom === '4_roi')!
    expect(carré.cartesIds).toContain(joker.id)
  })
})

// ============================================================
// TOUS LES RANGS — vérification symétrique
// ============================================================

describe('Carré — tous les rangs : 3 en main + 1 étalé', () => {
  const rangsTest: Array<{ rang: Carte['rang']; nom: string }> = [
    { rang: 'A', nom: '4_as'    },
    { rang: 'K', nom: '4_roi'   },
    { rang: 'Q', nom: '4_dame'  },
    { rang: 'J', nom: '4_valet' },
  ]

  rangsTest.forEach(({ rang, nom }) => {
    it(`${nom} : 3 en main + 1 étalé → détecté`, () => {
      const c1 = c('hearts',   rang, 0, 10)  // étalé
      const c2 = c('spades',   rang, 0, 11)  // main
      const c3 = c('diamonds', rang, 0, 12)  // main
      const c4 = c('clubs',    rang, 0, 13)  // main

      const state = makeStateAvecAnnonces([c2, c3, c4], [c1], [])
      const combis = detecterCombinaisonsDisponibles(state, 0)
      expect(combis.some(c => c.nom === nom)).toBe(true)
      const carré = combis.find(c => c.nom === nom)!
      expect(carré.cartesIds).toContain(c1.id) // la carte étalée est incluse
    })

    it(`${nom} : 2 en main + 2 étalées → détecté`, () => {
      const c1 = c('hearts',   rang, 0, 20)  // étalé
      const c2 = c('spades',   rang, 0, 21)  // étalé
      const c3 = c('diamonds', rang, 0, 22)  // main
      const c4 = c('clubs',    rang, 0, 23)  // main

      const state = makeStateAvecAnnonces([c3, c4], [c1, c2], [])
      const combis = detecterCombinaisonsDisponibles(state, 0)
      expect(combis.some(c => c.nom === nom)).toBe(true)
    })

    it(`${nom} : 4 étalées → détecté (toutes étalées)`, () => {
      const c1 = c('hearts',   rang, 0, 30)
      const c2 = c('spades',   rang, 0, 31)
      const c3 = c('diamonds', rang, 0, 32)
      const c4 = c('clubs',    rang, 0, 33)

      const state = makeStateAvecAnnonces([], [c1, c2, c3, c4], [])
      const combis = detecterCombinaisonsDisponibles(state, 0)
      expect(combis.some(c => c.nom === nom)).toBe(true)
    })
  })
})
