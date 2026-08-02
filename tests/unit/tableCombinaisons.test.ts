// ============================================================
// TESTS — Matrice de relation : cartes × types de combinaisons
// (tableCombinaisons.ts)
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  calculerEligibiliteCarte,
  calculerTableCombinaisons,
  cartesProtegeesParCombinaisons,
  typesEncoreEligibles,
} from '../../src/core/ia/tableCombinaisons'
import { cartesUtilesAuxCombis } from '../../src/core/ia/helpers'
import { appliquerAnnonce, initialiserChampsIT4 } from '../../src/core/combinaisons'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte, creerJoker } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)
const j = (couleur: Couleur, jeu = 0): Carte => creerJoker(couleur, jeu, _pos++)

function baseState(couleurAtout: Couleur | null = null): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({ ...state, couleurAtout })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [], pileRemportee: [] }
  joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [], pileRemportee: [] }
  return {
    ...base,
    joueurs,
    pioche: Array.from({ length: 20 }, (_, i) => c('clubs', '7', i % 4)),
    pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 0, cartes: [null, null] },
  }
}

// ============================================================
// calculerEligibiliteCarte — une cellule à la fois
// ============================================================

describe('calculerEligibiliteCarte — mariage', () => {
  it('Roi + Dame de même couleur, atout non défini → mariage_atout pour les deux', () => {
    const roi = c('hearts', 'K')
    const dame = c('hearts', 'Q')
    const state = baseState(null)
    state.joueurs[1].main = [roi, dame]

    expect(calculerEligibiliteCarte(state, roi, 1).typesEligibles).toEqual(['mariage_atout'])
    expect(calculerEligibiliteCarte(state, dame, 1).typesEligibles).toEqual(['mariage_atout'])
  })

  it('Roi + Dame couleur ≠ atout → mariage_hors_atout', () => {
    const roi = c('hearts', 'K')
    const dame = c('hearts', 'Q')
    const state = baseState('clubs')
    state.joueurs[1].main = [roi, dame]

    expect(calculerEligibiliteCarte(state, roi, 1).typesEligibles).toEqual(['mariage_hors_atout'])
  })

  it('Roi seul sans Dame partenaire → aucune éligibilité mariage', () => {
    const roi = c('hearts', 'K')
    const state = baseState(null)
    state.joueurs[1].main = [roi]
    expect(calculerEligibiliteCarte(state, roi, 1).typesEligibles).toEqual([])
  })
})

describe('calculerEligibiliteCarte — bésigue', () => {
  it('Dame♠ + Valet♦ tous deux disponibles → besigue pour les deux', () => {
    const dameS = c('spades', 'Q')
    const valetD = c('diamonds', 'J')
    const state = baseState('clubs')
    state.joueurs[1].main = [dameS, valetD]

    expect(calculerEligibiliteCarte(state, dameS, 1).typesEligibles).toContain('besigue')
    expect(calculerEligibiliteCarte(state, valetD, 1).typesEligibles).toContain('besigue')
  })

  it('Dame♠ sans Valet♦ → pas éligible bésigue', () => {
    const dameS = c('spades', 'Q')
    const state = baseState('clubs')
    state.joueurs[1].main = [dameS]
    expect(calculerEligibiliteCarte(state, dameS, 1).typesEligibles).not.toContain('besigue')
  })
})

describe('calculerEligibiliteCarte — carrés', () => {
  it('3 cartes de même rang, non-atout → éligible 4_as, pas 4_as_atout', () => {
    const as1 = c('hearts', 'A')
    const as2 = c('spades', 'A')
    const as3 = c('diamonds', 'A')
    const state = baseState('clubs') // aucun n'est de la couleur atout
    state.joueurs[1].main = [as1, as2, as3]

    const ligne = calculerEligibiliteCarte(state, as1, 1)
    expect(ligne.typesEligibles).toContain('4_as')
    expect(ligne.typesEligibles).not.toContain('4_as_atout')
  })

  it('3 cartes de même rang ET même couleur atout → éligible aux DEUX 4_as et 4_as_atout', () => {
    const as1 = c('clubs', 'A')
    const as2 = c('clubs', 'A', 1)
    const as3 = c('clubs', 'A', 2)
    const state = baseState('clubs')
    state.joueurs[1].main = [as1, as2, as3]

    const ligne = calculerEligibiliteCarte(state, as1, 1)
    expect(ligne.typesEligibles).toContain('4_as')
    expect(ligne.typesEligibles).toContain('4_as_atout')
  })

  it('seulement 2 cartes de même rang, sans Joker → pas éligible', () => {
    const as1 = c('hearts', 'A')
    const as2 = c('spades', 'A')
    const state = baseState('clubs')
    state.joueurs[1].main = [as1, as2]
    expect(calculerEligibiliteCarte(state, as1, 1).typesEligibles).toEqual([])
  })

  it('carré non atteignable si les cartes manquantes sont toutes déjà vues ailleurs', () => {
    const as1 = c('hearts', 'A', 0)
    const as2 = c('spades', 'A', 0)
    const as3 = c('diamonds', 'A', 0)
    const state = baseState('clubs')
    state.joueurs[1].main = [as1, as2, as3]
    // Le 16e As (le seul manquant) est déjà vu, capturé par l'adversaire
    const autresAs: Carte[] = []
    for (const couleur of ['hearts', 'spades', 'diamonds', 'clubs'] as Couleur[]) {
      for (let jeu = 0; jeu < 4; jeu++) {
        if (couleur === 'clubs' || jeu > 0) autresAs.push(c(couleur, 'A', jeu))
      }
    }
    state.joueurs[0].pileRemportee = autresAs
    expect(calculerEligibiliteCarte(state, as1, 1).typesEligibles).toEqual([])
  })
})

describe('calculerEligibiliteCarte — Joker', () => {
  it('complète un carré normal si exactement 3 cartes non-Joker du même rang', () => {
    const roi1 = c('hearts', 'K')
    const roi2 = c('spades', 'K')
    const roi3 = c('diamonds', 'K')
    const joker = j('clubs')
    const state = baseState('clubs')
    state.joueurs[1].main = [roi1, roi2, roi3, joker]

    expect(calculerEligibiliteCarte(state, joker, 1).typesEligibles).toContain('4_roi')
  })

  it('un Joker n\'est jamais éligible à un carré d\'atout', () => {
    const roi1 = c('clubs', 'K')
    const roi2 = c('clubs', 'K', 1)
    const roi3 = c('clubs', 'K', 2)
    const joker = j('clubs')
    const state = baseState('clubs')
    state.joueurs[1].main = [roi1, roi2, roi3, joker]

    expect(calculerEligibiliteCarte(state, joker, 1).typesEligibles).not.toContain('4_roi_atout')
  })

  it('4 cartes déjà présentes (pas besoin du Joker) → Joker non éligible pour ce rang', () => {
    const roi1 = c('hearts', 'K')
    const roi2 = c('spades', 'K')
    const roi3 = c('diamonds', 'K')
    const roi4 = c('clubs', 'K')
    const joker = j('clubs')
    const state = baseState('hearts')
    state.joueurs[1].main = [roi1, roi2, roi3, roi4, joker]
    expect(calculerEligibiliteCarte(state, joker, 1).typesEligibles).toEqual([])
  })
})

// ============================================================
// Familles de réutilisation via usagesCartes — le cœur de la correction
// ============================================================

describe('Familles de réutilisation (usagesCartes)', () => {
  it('carte exclue de SA famille (mariage) reste inéligible même avec un partenaire disponible', () => {
    const roi = c('hearts', 'K')
    const dame = c('hearts', 'Q')
    const state = baseState(null)
    state.joueurs[1].main = [roi, dame]
    state.usagesCartes = [{ carteId: roi.id, combinaisonsUtilisees: ['mariage_atout'] }]

    expect(calculerEligibiliteCarte(state, roi, 1).typesEligibles).toEqual([])
  })

  it('exclusion croisée intra-famille : Roi déjà utilisé en mariage_hors_atout exclut aussi mariage_atout', () => {
    const roi = c('clubs', 'K')
    const dame = c('clubs', 'Q')
    const state = baseState('clubs') // couleur clubs = atout maintenant
    state.joueurs[1].main = [roi, dame]
    // Usage enregistré AVANT que clubs devienne atout (mariage_hors_atout à l'époque)
    state.usagesCartes = [{ carteId: roi.id, combinaisonsUtilisees: ['mariage_hors_atout'] }]

    expect(calculerEligibiliteCarte(state, roi, 1).typesEligibles).toEqual([])
  })

  it('AUCUNE exclusivité entre familles différentes : Roi d\'atout épuisé en mariage reste éligible à 4_roi_atout', () => {
    const roiUtilise = c('clubs', 'K', 0)
    const roi2 = c('clubs', 'K', 1)
    const roi3 = c('clubs', 'K', 2)
    const dame = c('clubs', 'Q')
    const state = baseState('clubs')
    state.joueurs[1].main = [roiUtilise, roi2, roi3, dame]
    state.usagesCartes = [{ carteId: roiUtilise.id, combinaisonsUtilisees: ['mariage_atout'] }]

    const ligne = calculerEligibiliteCarte(state, roiUtilise, 1)
    expect(ligne.typesEligibles).not.toContain('mariage_atout') // famille mariage épuisée
    expect(ligne.typesEligibles).toContain('4_roi')              // famille carré intacte
    expect(ligne.typesEligibles).toContain('4_roi_atout')        // famille carré intacte
  })

  it('carte épuisée dans TOUTES les familles où elle était éligible → aucun type restant', () => {
    const roi = c('hearts', 'K')
    const dame = c('hearts', 'Q')
    const state = baseState('clubs')
    state.joueurs[1].main = [roi, dame] // seuls 2 Rois de coeur → pas de carré possible de toute façon
    state.usagesCartes = [{ carteId: roi.id, combinaisonsUtilisees: ['mariage_hors_atout'] }]

    expect(calculerEligibiliteCarte(state, roi, 1).typesEligibles).toEqual([])
  })
})

// ============================================================
// calculerTableCombinaisons / dérivés
// ============================================================

describe('calculerTableCombinaisons', () => {
  it('une ligne par carte en main + étalées', () => {
    const roi = c('hearts', 'K')
    const dame = c('hearts', 'Q')
    const huit = c('clubs', '8')
    const state = baseState(null)
    state.joueurs[1].main = [roi, dame]
    state.joueurs[1].cartesEtalees = [huit]

    const table = calculerTableCombinaisons(state, 1)
    expect(table).toHaveLength(3)
    expect(table.map(l => l.carteId).sort()).toEqual([roi.id, dame.id, huit.id].sort())
  })
})

describe('cartesProtegeesParCombinaisons', () => {
  it('ne protège que les cartes ayant au moins un type éligible', () => {
    const roi = c('hearts', 'K')
    const dame = c('hearts', 'Q')
    const huit = c('clubs', '8') // ne participe à rien
    const state = baseState(null)
    state.joueurs[1].main = [roi, dame, huit]

    const proteges = cartesProtegeesParCombinaisons(state, 1)
    expect(proteges.has(roi.id)).toBe(true)
    expect(proteges.has(dame.id)).toBe(true)
    expect(proteges.has(huit.id)).toBe(false)
  })
})

describe('typesEncoreEligibles', () => {
  it('liste tous les types encore accessibles, sans doublon', () => {
    const roi = c('hearts', 'K')
    const dame = c('hearts', 'Q')
    const dameS = c('spades', 'Q')
    const valetD = c('diamonds', 'J')
    const state = baseState('clubs')
    state.joueurs[1].main = [roi, dame, dameS, valetD]

    const types = typesEncoreEligibles(state, 1)
    expect(types.sort()).toEqual(['besigue', 'mariage_hors_atout'].sort())
  })
})

// ============================================================
// Intégration — faille corrigée : usagesCartes réellement consulté
// via le pipeline réel (appliquerAnnonce)
// ============================================================

describe('Intégration — faille usagesCartes corrigée via appliquerAnnonce', () => {
  it('un mariage_atout déjà annoncé (pipeline réel) n\'est plus protégé après coup', () => {
    const roi = c('clubs', 'K')
    const dame = c('clubs', 'Q')
    const state = baseState('clubs')
    state.joueurs[1].main = [roi, dame]

    // Avant annonce : les deux cartes sont protégées (mariage_atout éligible)
    expect(cartesUtilesAuxCombis(state, 1).has(roi.id)).toBe(true)
    expect(cartesUtilesAuxCombis(state, 1).has(dame.id)).toBe(true)

    // Annonce réelle via le pipeline (peuple state.usagesCartes ET déplace
    // les cartes en cartesEtalees, comme en jeu réel)
    const stateApres = appliquerAnnonce(state, 1, {
      nom: 'mariage_atout', points: 40, cartesIds: [roi.id, dame.id],
    })

    // Après annonce : plus aucune autre carte de même rang/couleur en main
    // pour un carré → ces deux cartes précises n'ont plus AUCUN type
    // éligible → ne doivent plus être protégées.
    //
    // Avec l'ANCIEN cartesUtilesAuxCombis (jamais de lecture de
    // usagesCartes), ces deux cartes restaient protégées indéfiniment
    // car il se contentait de refiltrer main+étalées par rang/couleur,
    // sans jamais vérifier si CES cartes précises avaient déjà servi.
    const protegesApres = cartesUtilesAuxCombis(stateApres, 1)
    expect(protegesApres.has(roi.id)).toBe(false)
    expect(protegesApres.has(dame.id)).toBe(false)
  })

  it('après annonce, un carré (famille différente) reste protégé pour les mêmes cartes', () => {
    const roiUtilise = c('clubs', 'K', 0)
    const roi2 = c('clubs', 'K', 1)
    const roi3 = c('clubs', 'K', 2)
    const dame = c('clubs', 'Q')
    const state = baseState('clubs')
    state.joueurs[1].main = [roiUtilise, roi2, roi3, dame]

    const stateApres = appliquerAnnonce(state, 1, {
      nom: 'mariage_atout', points: 40, cartesIds: [roiUtilise.id, dame.id],
    })

    // roiUtilise a épuisé la famille mariage, mais reste protégé via la
    // famille carré (4_roi / 4_roi_atout), toujours intacte.
    const proteges = cartesUtilesAuxCombis(stateApres, 1)
    expect(proteges.has(roiUtilise.id)).toBe(true)
    expect(proteges.has(roi2.id)).toBe(true)
    expect(proteges.has(roi3.id)).toBe(true)
  })
})
