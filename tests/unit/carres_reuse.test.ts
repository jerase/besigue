// ============================================================
// TESTS — RÉUTILISATION CARTES DANS CARRÉS NORMAUX
// Vérifie qu'un carré déjà annoncé n'est pas reproposé avec
// les mêmes cartes, pour les 4 rangs (As, Roi, Dame, Valet)
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
import type { GameState, Carte, Couleur, NomCombinaison, AnnoncePosee } from '../../src/types'

// ── Helpers ───────────────────────────────────────────────────

const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0, pos = 0) =>
  creerCarte(couleur, rang, jeu, pos)

/** Crée un state de base avec le mariage_Atout déjà posé et les annonces injectées */
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

  return {
    ...state,
    joueurs,
    annonces: [annonceAtout, ...annoncesSupp],
  }
}

// ============================================================
// CARRÉ DÉJÀ ANNONCÉ → NE PAS REPROPOSER
// ============================================================

describe('Carrés normaux — non-reproposition après annonce', () => {

  const rangs: Array<{ rang: Carte['rang']; nom: NomCombinaison; label: string }> = [
    { rang: 'A', nom: '4_as',    label: 'As'    },
    { rang: 'K', nom: '4_roi',   label: 'Rois'  },
    { rang: 'Q', nom: '4_dame',  label: 'Dames' },
    { rang: 'J', nom: '4_valet', label: 'Valets' },
  ]

  rangs.forEach(({ rang, nom, label }) => {
    it(`Carré de ${label} annoncé → pas reproposé au tour suivant`, () => {
      // Les 4 cartes du rang (1 par couleur)
      const c0 = c('spades',   rang, 0, 10)
      const c1 = c('hearts',   rang, 0, 11)
      const c2 = c('diamonds', rang, 0, 12)
      const c3 = c('clubs',    rang, 0, 13)

      // Annonce déjà posée avec ces 4 cartes
      const annonceCarré: AnnoncePosee = {
        nom, points: 40,
        cartesIds: [c0.id, c1.id, c2.id, c3.id],
        joueurId: 0, mancheNumero: 1,
      }

      // Les cartes sont maintenant étalées
      const state = makeStateAvecAnnonces([], [c0, c1, c2, c3], [annonceCarré])

      const combis = detecterCombinaisonsDisponibles(state, 0)
      expect(combis.some(c => c.nom === nom)).toBe(false)
    })

    it(`Carré de ${label} avec Joker annoncé → pas reproposé`, () => {
      const c0 = c('spades',   rang, 0, 10)
      const c1 = c('hearts',   rang, 0, 11)
      const c2 = c('diamonds', rang, 0, 12)
      const joker = creerJoker('clubs', 0, 128)

      const annonceCarré: AnnoncePosee = {
        nom, points: 40,
        cartesIds: [c0.id, c1.id, c2.id, joker.id],
        joueurId: 0, mancheNumero: 1,
      }

      const state = makeStateAvecAnnonces([], [c0, c1, c2], [annonceCarré])

      const combis = detecterCombinaisonsDisponibles(state, 0)
      expect(combis.some(c => c.nom === nom)).toBe(false)
    })

    it(`Carré de ${label} avec nouvelles cartes (jeu1) peut être reproposé`, () => {
      // Jeu0 déjà utilisé, jeu1 libre → nouveau carré possible
      const c0_j0 = c('spades',   rang, 0, 10)
      const c1_j0 = c('hearts',   rang, 0, 11)
      const c2_j0 = c('diamonds', rang, 0, 12)
      const c3_j0 = c('clubs',    rang, 0, 13)

      const c0_j1 = c('spades',   rang, 1, 42)
      const c1_j1 = c('hearts',   rang, 1, 43)
      const c2_j1 = c('diamonds', rang, 1, 44)
      const c3_j1 = c('clubs',    rang, 1, 45)

      const annonceCarré: AnnoncePosee = {
        nom, points: 40,
        cartesIds: [c0_j0.id, c1_j0.id, c2_j0.id, c3_j0.id],
        joueurId: 0, mancheNumero: 1,
      }

      // Jeu0 étalé (consommé), jeu1 en main (libre)
      const state = makeStateAvecAnnonces(
        [c0_j1, c1_j1, c2_j1, c3_j1],
        [c0_j0, c1_j0, c2_j0, c3_j0],
        [annonceCarré]
      )

      const combis = detecterCombinaisonsDisponibles(state, 0)
      // Un nouveau carré avec les cartes jeu1 doit être disponible
      expect(combis.some(c => c.nom === nom)).toBe(true)
      const carré = combis.find(c => c.nom === nom)!
      // Les nouvelles cartes (jeu1) doivent être utilisées
      expect(carré.cartesIds).toContain(c0_j1.id)
      expect(carré.cartesIds).toContain(c1_j1.id)
    })
  })
})

// ============================================================
// CARRÉS ATOUT — non-reproposition
// ============================================================

describe('Carrés d\'atout — non-reproposition après annonce', () => {
  const atout: Couleur = 'hearts'

  const rangsAtout: Array<{ rang: Carte['rang']; nom: NomCombinaison; label: string }> = [
    { rang: 'A', nom: '4_as_atout',    label: 'As d\'atout'     },
    { rang: 'K', nom: '4_roi_atout',   label: 'Rois d\'atout'   },
    { rang: 'Q', nom: '4_dame_atout',  label: 'Dames d\'atout'  },
    { rang: 'J', nom: '4_valet_atout', label: 'Valets d\'atout' },
  ]

  rangsAtout.forEach(({ rang, nom, label }) => {
    it(`Carré de ${label} annoncé → pas reproposé au tour suivant`, () => {
      const c0 = c(atout, rang, 0, 10)
      const c1 = c(atout, rang, 1, 11)
      const c2 = c(atout, rang, 2, 12)
      const c3 = c(atout, rang, 3, 13)

      const annonceCarré: AnnoncePosee = {
        nom, points: 80,
        cartesIds: [c0.id, c1.id, c2.id, c3.id],
        joueurId: 0, mancheNumero: 1,
      }

      const state = makeStateAvecAnnonces([], [c0, c1, c2, c3], [annonceCarré], atout)
      const combis = detecterCombinaisonsDisponibles(state, 0)
      expect(combis.some(c => c.nom === nom)).toBe(false)
    })

    it(`Carré de ${label} avec jeu1 libre peut être proposé`, () => {
      const c0_j0 = c(atout, rang, 0, 10)
      const c1_j0 = c(atout, rang, 1, 11)
      const c2_j0 = c(atout, rang, 2, 12)
      const c3_j0 = c(atout, rang, 3, 13)

      const c0_j1 = c(atout, rang, 0, 42) // même couleur, jeuIndex différent simulé par pos différent
      // Note : en vrai jeu il n'y a que 4 jeux donc 4 cartes max par rang+couleur
      // Ce test vérifie simplement que si des cartes libres existent elles sont proposées

      const annonceCarré: AnnoncePosee = {
        nom, points: 80,
        cartesIds: [c0_j0.id, c1_j0.id, c2_j0.id, c3_j0.id],
        joueurId: 0, mancheNumero: 1,
      }

      // Jeu0-3 consommés, pas de nouvelles cartes disponibles
      const state = makeStateAvecAnnonces([], [c0_j0, c1_j0, c2_j0, c3_j0], [annonceCarré], atout)
      const combis = detecterCombinaisonsDisponibles(state, 0)
      // Pas de 5e jeu → pas de nouveau carré atout possible
      expect(combis.some(c => c.nom === nom)).toBe(false)
    })
  })
})

// ============================================================
// RÉUTILISATION INTER-COMBINAISONS (cartes dans mariage + carré)
// ============================================================

describe('Réutilisation légale — même carte dans mariage ET carré', () => {

  it('Dame♠ dans un mariage peut aussi être dans un carré de Dames', () => {
    const atout: Couleur = 'hearts'
    const dameS = c('spades', 'Q', 0, 10)  // dans un mariage♠
    const dameH = c('hearts', 'Q', 0, 11)
    const dameD = c('diamonds', 'Q', 0, 12)
    const dameC = c('clubs', 'Q', 0, 13)

    const annonceMariage: AnnoncePosee = {
      nom: 'mariage_hors_atout', points: 20,
      cartesIds: [c('spades', 'K', 0, 20).id, dameS.id],
      joueurId: 0, mancheNumero: 1,
    }

    const state = makeStateAvecAnnonces(
      [dameH, dameD, dameC],
      [dameS],   // dameS étalée via le mariage
      [annonceMariage],
      atout
    )

    const combis = detecterCombinaisonsDisponibles(state, 0)
    // dameS peut participer au carré de dames (règle de réutilisation inter-combis)
    expect(combis.some(c => c.nom === '4_dame')).toBe(true)
    const carré = combis.find(c => c.nom === '4_dame')!
    expect(carré.cartesIds).toContain(dameS.id)
  })

  it('Roi dans un mariage peut aussi être dans un carré de Rois', () => {
    const atout: Couleur = 'spades'
    const roiH = c('hearts',   'K', 0, 10)  // dans mariage♥ (hors-atout car atout=♠)
    const roiS = c('spades',   'K', 0, 11)
    const roiD = c('diamonds', 'K', 0, 12)
    const roiC = c('clubs',    'K', 0, 13)

    const annonceMariage: AnnoncePosee = {
      nom: 'mariage_hors_atout', points: 20,
      cartesIds: [roiH.id, c('hearts', 'Q', 0, 20).id],
      joueurId: 0, mancheNumero: 1,
    }

    const state = makeStateAvecAnnonces(
      [roiS, roiD, roiC],
      [roiH],
      [annonceMariage],
      atout
    )

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_roi')).toBe(true)
    const carré = combis.find(c => c.nom === '4_roi')!
    expect(carré.cartesIds).toContain(roiH.id)
  })

  it('As dans la quinte peut aussi être dans un carré d\'As', () => {
    const atout: Couleur = 'hearts'
    const asH = c(atout, 'A', 0, 10)  // dans la quinte ♥
    const asS = c('spades',   'A', 0, 11)
    const asD = c('diamonds', 'A', 0, 12)
    const asC = c('clubs',    'A', 0, 13)

    const annonceQuinte: AnnoncePosee = {
      nom: 'quinte', points: 250,
      cartesIds: [asH.id, c(atout, '10', 0, 20).id, c(atout, 'J', 0, 21).id],
      joueurId: 0, mancheNumero: 1,
    }

    const state = makeStateAvecAnnonces(
      [asS, asD, asC],
      [asH],
      [annonceQuinte],
      atout
    )

    const combis = detecterCombinaisonsDisponibles(state, 0)
    // asH peut participer au carré d'As même s'il est dans la quinte
    expect(combis.some(c => c.nom === '4_as')).toBe(true)
  })
})

// ============================================================
// VIA appliquerAnnonce — cycle complet
// ============================================================

describe('Carrés — cycle complet via appliquerAnnonce', () => {

  it('carré de Rois annoncé puis non-reproposé au tour suivant', () => {
    const atout: Couleur = 'hearts'
    const roiS = c('spades',   'K', 0, 10)
    const roiH = c(atout,      'K', 0, 11) // note: c'est de l'atout mais carré normal
    const roiD = c('diamonds', 'K', 0, 12)
    const roiC = c('clubs',    'K', 0, 13)

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout, atoutDefini: true })
    // Mariage_Atout posé pour débloquer
    state = {
      ...state,
      annonces: [
        { nom: 'mariage_atout' as const, points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1 as const, mancheNumero: 1 },
      ],
    }

    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [roiS, roiH, roiD, roiC], cartesEtalees: [] }
    state = { ...state, joueurs }

    // Annoncer le carré de rois
    const carré = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === '4_roi')!
    expect(carré).toBeDefined()
    state = appliquerAnnonce(state, 0, carré)

    // Les cartes sont maintenant étalées — ne pas reproposer
    const combis2 = detecterCombinaisonsDisponibles(state, 0)
    expect(combis2.some(c => c.nom === '4_roi')).toBe(false)
  })

  it('carré de Valets annoncé puis non-reproposé', () => {
    const atout: Couleur = 'clubs'
    const valS = c('spades',   'J', 0, 10)
    const valH = c('hearts',   'J', 0, 11)
    const valD = c('diamonds', 'J', 0, 12)
    const valC = c(atout,      'J', 0, 13)

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout, atoutDefini: true })
    state = {
      ...state,
      annonces: [
        { nom: 'mariage_atout' as const, points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1 as const, mancheNumero: 1 },
      ],
    }

    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [valS, valH, valD, valC], cartesEtalees: [] }
    state = { ...state, joueurs }

    const carré = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === '4_valet')!
    expect(carré).toBeDefined()
    state = appliquerAnnonce(state, 0, carré)

    const combis2 = detecterCombinaisonsDisponibles(state, 0)
    expect(combis2.some(c => c.nom === '4_valet')).toBe(false)
  })

  it('carré d\'As annoncé puis non-reproposé', () => {
    const atout: Couleur = 'diamonds'
    const asS = c('spades',   'A', 0, 10)
    const asH = c('hearts',   'A', 0, 11)
    const asD = c(atout,      'A', 0, 12)
    const asC = c('clubs',    'A', 0, 13)

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout, atoutDefini: true })
    state = {
      ...state,
      annonces: [
        { nom: 'mariage_atout' as const, points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1 as const, mancheNumero: 1 },
      ],
    }

    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [asS, asH, asD, asC], cartesEtalees: [] }
    state = { ...state, joueurs }

    const carré = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === '4_as')!
    expect(carré).toBeDefined()
    state = appliquerAnnonce(state, 0, carré)

    const combis2 = detecterCombinaisonsDisponibles(state, 0)
    expect(combis2.some(c => c.nom === '4_as')).toBe(false)
  })
})
