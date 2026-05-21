// ============================================================
// TESTS NON-RÉGRESSION — CARRÉ ATOUT / CARRÉ NORMAL
// Bug : une carte déjà dans un carré normal (4_dame) pouvait
// encore participer à un carré atout (4_dame_atout), et
// vice-versa. Une carte consommée dans un carré du même rang
// ne peut plus reformer aucun autre carré de ce rang.
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  detecterCombinaisonsDisponibles,
  appliquerAnnonce,
  initialiserChampsIT4,
} from '../../src/core/combinaisons'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur, AnnoncePosee } from '../../src/types'

const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0, pos = 0) =>
  creerCarte(couleur, rang, jeu, pos)

function makeState(
  cartesMain: Carte[],
  cartesEtalees: Carte[],
  annonces: AnnoncePosee[],
  couleurAtout: Couleur = 'hearts'
): GameState {
  const { state: base } = initialiserPartie(CONFIG_DEFAUT)
  const state = initialiserChampsIT4({ ...base, couleurAtout, atoutDefini: true })
  // Annonce de débloquage (mariage_Atout par l'adversaire)
  const unlock: AnnoncePosee = {
    nom: 'mariage_atout', points: 40,
    cartesIds: [`${couleurAtout}-K-9-900`, `${couleurAtout}-Q-9-901`],
    joueurId: 1, mancheNumero: 1,
  }
  const joueurs = [...state.joueurs] as typeof state.joueurs
  joueurs[0] = { ...joueurs[0], main: cartesMain, cartesEtalees }
  return { ...state, joueurs, annonces: [unlock, ...annonces] }
}

// ============================================================
// SCÉNARIO EXACT DU BUG
// Dame♥ (atout) déjà dans un carré normal (4_dame) →
// ne peut plus former un carré atout (4_dame_atout)
// ============================================================

describe('Bug carré atout — Dame♥ déjà dans 4_dame ne peut plus former 4_dame_atout', () => {

  it('scénario exact : mariage_Atout + 4_dame déjà posés → 4_dame_atout non proposé', () => {
    const atout: Couleur = 'hearts'
    // Les 4 Dames♥ (atout) déjà dans un carré normal (avec d'autres Dames)
    const dH0 = c(atout, 'Q', 0, 1)
    const dH1 = c(atout, 'Q', 1, 2)
    const dH2 = c(atout, 'Q', 2, 3)
    const dH3 = c(atout, 'Q', 3, 4)

    const annonce4Dame: AnnoncePosee = {
      nom: '4_dame', points: 60,
      cartesIds: [dH0.id, dH1.id, dH2.id, dH3.id],
      joueurId: 0, mancheNumero: 1,
    }

    // Les 4 Dames♥ sont étalées (consommées dans 4_dame)
    const state = makeState([], [dH0, dH1, dH2, dH3], [annonce4Dame], atout)

    const combis = detecterCombinaisonsDisponibles(state, 0)
    // 4_dame_atout ne doit PAS être proposé car les Dames♥ sont déjà consommées
    expect(combis.some(c => c.nom === '4_dame_atout')).toBe(false)
  })

  it('carte d\'atout dans 4_dame_atout → ne peut plus former 4_dame', () => {
    const atout: Couleur = 'hearts'
    const dH0 = c(atout, 'Q', 0, 1)
    const dH1 = c(atout, 'Q', 1, 2)
    const dH2 = c(atout, 'Q', 2, 3)
    const dH3 = c(atout, 'Q', 3, 4)

    const annonce4DameAtout: AnnoncePosee = {
      nom: '4_dame_atout', points: 120,
      cartesIds: [dH0.id, dH1.id, dH2.id, dH3.id],
      joueurId: 0, mancheNumero: 1,
    }

    const state = makeState([], [dH0, dH1, dH2, dH3], [annonce4DameAtout], atout)

    const combis = detecterCombinaisonsDisponibles(state, 0)
    // 4_dame ne doit PAS être proposé — les Dames♥ sont consommées
    expect(combis.some(c => c.nom === '4_dame')).toBe(false)
  })
})

// ============================================================
// TOUS LES RANGS — vérification croisée normal ↔ atout
// ============================================================

describe('Symétrie carré normal ↔ carré atout pour tous les rangs', () => {
  const atout: Couleur = 'diamonds'
  const rangs: Array<{
    rang: Carte['rang']
    nomNormal: string
    nomAtout: string
  }> = [
    { rang: 'A', nomNormal: '4_as',    nomAtout: '4_as_atout'    },
    { rang: 'K', nomNormal: '4_roi',   nomAtout: '4_roi_atout'   },
    { rang: 'Q', nomNormal: '4_dame',  nomAtout: '4_dame_atout'  },
    { rang: 'J', nomNormal: '4_valet', nomAtout: '4_valet_atout' },
  ]

  rangs.forEach(({ rang, nomNormal, nomAtout }) => {
    // 4 cartes atout du rang
    const c0 = c(atout, rang, 0, 10)
    const c1 = c(atout, rang, 1, 11)
    const c2 = c(atout, rang, 2, 12)
    const c3 = c(atout, rang, 3, 13)

    it(`${nomNormal} annoncé avec des cartes atout → ${nomAtout} non proposé`, () => {
      const annonce: AnnoncePosee = {
        nom: nomNormal as AnnoncePosee['nom'],
        points: 40, cartesIds: [c0.id, c1.id, c2.id, c3.id],
        joueurId: 0, mancheNumero: 1,
      }
      const state = makeState([], [c0, c1, c2, c3], [annonce], atout)
      const combis = detecterCombinaisonsDisponibles(state, 0)
      expect(combis.some(c => c.nom === nomAtout)).toBe(false)
    })

    it(`${nomAtout} annoncé → ${nomNormal} non proposé avec ces mêmes cartes`, () => {
      const annonce: AnnoncePosee = {
        nom: nomAtout as AnnoncePosee['nom'],
        points: 80, cartesIds: [c0.id, c1.id, c2.id, c3.id],
        joueurId: 0, mancheNumero: 1,
      }
      const state = makeState([], [c0, c1, c2, c3], [annonce], atout)
      const combis = detecterCombinaisonsDisponibles(state, 0)
      expect(combis.some(c => c.nom === nomNormal)).toBe(false)
    })

    it(`${nomAtout} reste proposé si les cartes atout n'ont pas encore été consommées`, () => {
      // Aucun carré annoncé → le carré atout doit être disponible
      const state = makeState([c0, c1, c2, c3], [], [], atout)
      const combis = detecterCombinaisonsDisponibles(state, 0)
      expect(combis.some(c => c.nom === nomAtout)).toBe(true)
    })

    it(`${nomAtout} peut être annoncé si les cartes du carré normal sont non-atout`, () => {
      // Le carré normal a été fait avec des cartes non-atout → les cartes atout restent libres
      const nonAtout1 = c('spades',  rang, 0, 20)
      const nonAtout2 = c('hearts',  rang, 0, 21)
      const nonAtout3 = c('clubs',   rang, 0, 22)
      const nonAtout4 = c('spades',  rang, 1, 23)

      const annonceNormal: AnnoncePosee = {
        nom: nomNormal as AnnoncePosee['nom'],
        points: 40,
        cartesIds: [nonAtout1.id, nonAtout2.id, nonAtout3.id, nonAtout4.id],
        joueurId: 0, mancheNumero: 1,
      }
      // Les cartes atout sont libres, les non-atout sont consommées
      const state = makeState(
        [c0, c1, c2, c3],          // cartes atout en main (libres)
        [nonAtout1, nonAtout2, nonAtout3, nonAtout4],  // non-atout étalés (consommés)
        [annonceNormal],
        atout
      )
      const combis = detecterCombinaisonsDisponibles(state, 0)
      // Les cartes atout sont encore libres → carré atout disponible
      expect(combis.some(c => c.nom === nomAtout)).toBe(true)
    })
  })
})

// ============================================================
// CYCLE COMPLET VIA appliquerAnnonce
// ============================================================

describe('Cycle complet — carré normal puis carré atout bloqué', () => {

  it('annoncer 4_dame puis 4_dame_atout impossible avec mêmes cartes', () => {
    const atout: Couleur = 'clubs'
    const dC0 = c(atout, 'Q', 0, 1)
    const dC1 = c(atout, 'Q', 1, 2)
    const dC2 = c(atout, 'Q', 2, 3)
    const dC3 = c(atout, 'Q', 3, 4)

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout, atoutDefini: true })
    // Mariage_Atout posé par J0 pour débloquer
    state = {
      ...state,
      annonces: [
        { nom: 'mariage_atout' as const, points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1 as const, mancheNumero: 1 },
      ],
    }
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [dC0, dC1, dC2, dC3], cartesEtalees: [] }
    state = { ...state, joueurs }

    // Annoncer 4_dame (carré normal)
    const carre4Dame = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === '4_dame')!
    expect(carre4Dame).toBeDefined()
    state = appliquerAnnonce(state, 0, carre4Dame)

    // Les 4 Dames♣ sont maintenant étalées et consommées
    // Le carré atout ne doit PAS être proposé
    const combisApres = detecterCombinaisonsDisponibles(state, 0)
    expect(combisApres.some(c => c.nom === '4_dame_atout')).toBe(false)
  })

  it('annoncer 4_roi_atout puis 4_roi impossible avec mêmes cartes', () => {
    const atout: Couleur = 'spades'
    const rS0 = c(atout, 'K', 0, 1)
    const rS1 = c(atout, 'K', 1, 2)
    const rS2 = c(atout, 'K', 2, 3)
    const rS3 = c(atout, 'K', 3, 4)

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout, atoutDefini: true })
    state = {
      ...state,
      annonces: [
        { nom: 'mariage_atout' as const, points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1 as const, mancheNumero: 1 },
      ],
    }
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [rS0, rS1, rS2, rS3], cartesEtalees: [] }
    state = { ...state, joueurs }

    // Annoncer 4_roi_atout
    const carre4RoiAtout = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === '4_roi_atout')!
    expect(carre4RoiAtout).toBeDefined()
    state = appliquerAnnonce(state, 0, carre4RoiAtout)

    // 4_roi ne doit plus être proposé avec ces mêmes Rois
    const combisApres = detecterCombinaisonsDisponibles(state, 0)
    expect(combisApres.some(c => c.nom === '4_roi')).toBe(false)
  })
})

// ============================================================
// CAS LÉGAUX — nouvelles cartes libres
// ============================================================

describe('Cas légaux — nouvelles cartes permettent un deuxième carré', () => {

  it('4_dame avec non-atout consommés, cartes atout libres → 4_dame_atout disponible ET 4_dame aussi (cartes atout libres)', () => {
    const atout: Couleur = 'hearts'
    // Carré normal déjà annoncé avec les non-atout (♠,♦,♣,♠jeu1)
    const dS  = c('spades',   'Q', 0, 10)
    const dD  = c('diamonds', 'Q', 0, 11)
    const dC  = c('clubs',    'Q', 0, 12)
    const dS2 = c('spades',   'Q', 1, 13)

    // 4 Dames♥ (atout) libres en main
    const dH0 = c(atout, 'Q', 0, 20)
    const dH1 = c(atout, 'Q', 1, 21)
    const dH2 = c(atout, 'Q', 2, 22)
    const dH3 = c(atout, 'Q', 3, 23)

    const annonceNormal: AnnoncePosee = {
      nom: '4_dame', points: 60,
      cartesIds: [dS.id, dD.id, dC.id, dS2.id],
      joueurId: 0, mancheNumero: 1,
    }

    const state = makeState(
      [dH0, dH1, dH2, dH3],
      [dS, dD, dC, dS2],
      [annonceNormal],
      atout
    )

    const combis = detecterCombinaisonsDisponibles(state, 0)
    // Les Dames♥ sont libres → 4_dame_atout disponible
    expect(combis.some(c => c.nom === '4_dame_atout')).toBe(true)
    // Les Dames♥ libres peuvent aussi former un 4_dame (elles n'ont pas été consommées)
    // C'est légal : une carte non consommée peut toujours participer à un carré
    expect(combis.some(c => c.nom === '4_dame')).toBe(true)
  })
})
