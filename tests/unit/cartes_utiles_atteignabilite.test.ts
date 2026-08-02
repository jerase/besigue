// ============================================================
// TESTS — Raffinement combinaisonEncoreAtteignable dans
// cartesUtilesAuxCombis (helpers.ts) : ne plus protéger une
// combinaison mathématiquement devenue impossible à compléter.
// ============================================================

import { describe, it, expect } from 'vitest'
import { cartesUtilesAuxCombis } from '../../src/core/ia/helpers'
import { initialiserPartie } from '../../src/core/init'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { creerCarte } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur, Rang } from '../../src/types'

let _pos = 0
const c = (couleur: Couleur, rang: Rang, jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

const TOUTES_COULEURS: Couleur[] = ['spades', 'hearts', 'diamonds', 'clubs']

/** Toutes les cartes d'un rang donné, sur les 4 jeux, sauf celles déjà fournies (par couleur+jeuIndex). */
function resteDuRang(rang: Rang, dejaPrises: Carte[]): Carte[] {
  const cartes: Carte[] = []
  for (const couleur of TOUTES_COULEURS) {
    for (let jeu = 0; jeu < 4; jeu++) {
      const dejaPris = dejaPrises.some(cc => cc.couleur === couleur && cc.jeuIndex === jeu && cc.rang === rang)
      if (!dejaPris) cartes.push(c(couleur, rang, jeu))
    }
  }
  return cartes
}

function baseState(couleurAtout: Couleur | null = null): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({ ...state, couleurAtout })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [], pileRemportee: [] }
  joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [], pileRemportee: [] }
  return {
    ...base,
    joueurs,
    pioche: [],
    pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 0, cartes: [null, null] },
  }
}

describe('cartesUtilesAuxCombis — Priorité 3 (4 As) avec atteignabilité', () => {
  it('protège les 3 As si le 4e reste atteignable (encore non vu quelque part)', () => {
    const as1 = c('spades', 'A', 0)
    const as2 = c('hearts', 'A', 0)
    const as3 = c('diamonds', 'A', 0)
    const state = baseState(null)
    state.joueurs[1].main = [as1, as2, as3]

    const utiles = cartesUtilesAuxCombis(state, 1)
    expect(utiles.has(as1.id)).toBe(true)
    expect(utiles.has(as2.id)).toBe(true)
    expect(utiles.has(as3.id)).toBe(true)
  })

  it('ne protège PLUS les 3 As si les 13 autres As restants sont tous déjà vus ailleurs (4e impossible)', () => {
    const as1 = c('spades', 'A', 0)
    const as2 = c('hearts', 'A', 0)
    const as3 = c('diamonds', 'A', 0)
    const state = baseState(null)
    state.joueurs[1].main = [as1, as2, as3]
    // Les 13 As restants (toutes couleurs, tous jeux, sauf les 3 en main IA)
    // sont déjà dans la pile remportée de l'humain → plus aucun 4e As possible.
    state.joueurs[0].pileRemportee = resteDuRang('A', [as1, as2, as3])

    const utiles = cartesUtilesAuxCombis(state, 1)
    expect(utiles.has(as1.id)).toBe(false)
    expect(utiles.has(as2.id)).toBe(false)
    expect(utiles.has(as3.id)).toBe(false)
  })
})

describe('cartesUtilesAuxCombis — Priorité 5 (4 Rois) avec atteignabilité', () => {
  it('ne protège plus 3 Rois si le 4e est déjà totalement épuisé ailleurs', () => {
    const roi1 = c('spades', 'K', 0)
    const roi2 = c('hearts', 'K', 0)
    const roi3 = c('diamonds', 'K', 0)
    const state = baseState(null)
    state.joueurs[1].main = [roi1, roi2, roi3]
    state.joueurs[0].pileRemportee = resteDuRang('K', [roi1, roi2, roi3])

    const utiles = cartesUtilesAuxCombis(state, 1)
    expect(utiles.has(roi1.id)).toBe(false)
    expect(utiles.has(roi2.id)).toBe(false)
    expect(utiles.has(roi3.id)).toBe(false)
  })
})

describe('cartesUtilesAuxCombis — Priorité 2 (quinte) avec atteignabilité pièce par pièce', () => {
  it('protège As+10 d\'atout si le Valet d\'atout manquant reste atteignable', () => {
    const asAtout  = c('spades', 'A', 0)
    const dixAtout = c('spades', '10', 0)
    const state = baseState('spades')
    state.joueurs[1].main = [asAtout, dixAtout]
    // Mariage d'atout déjà annoncé (prérequis de la quinte)
    state.annonces = [{ joueurId: 1, nom: 'mariage_atout', points: 40, cartesIds: [], mancheNumero: 1 }]

    const utiles = cartesUtilesAuxCombis(state, 1)
    expect(utiles.has(asAtout.id)).toBe(true)
    expect(utiles.has(dixAtout.id)).toBe(true)
  })

  it('ne protège plus As+10 d\'atout si les 4 Valets d\'atout sont déjà tous vus ailleurs (quinte impossible)', () => {
    const asAtout  = c('spades', 'A', 0)
    const dixAtout = c('spades', '10', 0)
    const state = baseState('spades')
    state.joueurs[1].main = [asAtout, dixAtout]
    state.annonces = [{ joueurId: 1, nom: 'mariage_atout', points: 40, cartesIds: [], mancheNumero: 1 }]
    // Les 4 Valets de pique (atout) ont déjà été capturés par l'humain
    state.joueurs[0].pileRemportee = resteDuRang('J', []).filter(card => card.couleur === 'spades')

    const utiles = cartesUtilesAuxCombis(state, 1)
    expect(utiles.has(asAtout.id)).toBe(false)
    expect(utiles.has(dixAtout.id)).toBe(false)
  })
})
