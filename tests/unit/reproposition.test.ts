// ============================================================
// TESTS NON-RÉGRESSION — BUG REPROPOSITION DES COMBINAISONS
// Une carte déjà utilisée dans une combinaison d'un type donné
// ne peut pas reformer la même combinaison (même avec un
// partenaire différent pour les combinaisons à 2+ cartes).
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

// ── Helpers ───────────────────────────────────────────────────

const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0, pos = 0) =>
  creerCarte(couleur, rang, jeu, pos)

function makeStateAvecAnnonces(
  cartesMain: Carte[],
  cartesEtalees: Carte[],
  annoncesSupp: AnnoncePosee[],
  couleurAtout: Couleur = 'hearts',
  premierBesiguePose = false
): GameState {
  const { state: base } = initialiserPartie(CONFIG_DEFAUT)
  const state = initialiserChampsIT4({ ...base, couleurAtout, atoutDefini: true, premierBesiguePose })

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
// BÉSIGUE — bug principal signalé
// ============================================================

describe('Non-régression — bésigue reproposition', () => {

  it('bésigue déjà annoncé avec dame-X + valet-Y → non reproposé au tour suivant', () => {
    const dameX = c('spades',   'Q', 0, 1)
    const valetY = c('diamonds', 'J', 0, 2)

    const annonceBesigue: AnnoncePosee = {
      nom: 'besigue', points: 100,
      cartesIds: [dameX.id, valetY.id],
      joueurId: 0, mancheNumero: 1,
    }

    // Les cartes sont étalées après l'annonce
    const state = makeStateAvecAnnonces([], [dameX, valetY], [annonceBesigue], 'hearts', true)

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'besigue')).toBe(false)
  })

  it('dame-X déjà dans un bésigue → ne peut pas former un NOUVEAU bésigue avec valet-Z', () => {
    const dameX  = c('spades',   'Q', 0, 1)  // déjà utilisée
    const valetY = c('diamonds', 'J', 0, 2)  // déjà utilisé
    const valetZ = c('diamonds', 'J', 1, 34) // nouveau valet libre

    const annonceBesigue: AnnoncePosee = {
      nom: 'besigue', points: 100,
      cartesIds: [dameX.id, valetY.id],
      joueurId: 0, mancheNumero: 1,
    }

    // dameX étalée (consommée), valetZ en main (libre) mais dame est consommée
    const state = makeStateAvecAnnonces(
      [valetZ],
      [dameX, valetY],
      [annonceBesigue],
      'hearts', true
    )

    const combis = detecterCombinaisonsDisponibles(state, 0)
    // dameX consommée → impossible de former un nouveau bésigue
    expect(combis.some(c => c.nom === 'besigue')).toBe(false)
  })

  it('valet-Y déjà dans un bésigue → ne peut pas former un NOUVEAU bésigue avec dame-W', () => {
    const dameX  = c('spades',   'Q', 0, 1)  // déjà utilisée
    const valetY = c('diamonds', 'J', 0, 2)  // déjà utilisé
    const dameW  = c('spades',   'Q', 1, 33) // nouvelle dame libre

    const annonceBesigue: AnnoncePosee = {
      nom: 'besigue', points: 100,
      cartesIds: [dameX.id, valetY.id],
      joueurId: 0, mancheNumero: 1,
    }

    const state = makeStateAvecAnnonces(
      [dameW],
      [dameX, valetY],
      [annonceBesigue],
      'hearts', true
    )

    const combis = detecterCombinaisonsDisponibles(state, 0)
    // valetY consommé → impossible de former un nouveau bésigue
    expect(combis.some(c => c.nom === 'besigue')).toBe(false)
  })

  it('dame-W et valet-Z tous les deux libres → nouveau bésigue disponible', () => {
    const dameX  = c('spades',   'Q', 0, 1)
    const valetY = c('diamonds', 'J', 0, 2)
    const dameW  = c('spades',   'Q', 1, 33) // libre
    const valetZ = c('diamonds', 'J', 1, 34) // libre

    const annonceBesigue: AnnoncePosee = {
      nom: 'besigue', points: 100,
      cartesIds: [dameX.id, valetY.id],
      joueurId: 0, mancheNumero: 1,
    }

    const state = makeStateAvecAnnonces(
      [dameW, valetZ],
      [dameX, valetY],
      [annonceBesigue],
      'hearts', true
    )

    const combis = detecterCombinaisonsDisponibles(state, 0)
    // dameW + valetZ tous deux libres → deuxième bésigue valide (+40 pts)
    expect(combis.some(c => c.nom === 'besigue')).toBe(true)
    const b = combis.find(c => c.nom === 'besigue')!
    expect(b.points).toBe(40)         // 2e bésigue = 40 pts
    expect(b.cartesIds).toContain(dameW.id)
    expect(b.cartesIds).toContain(valetZ.id)
    // Les cartes consommées ne doivent pas apparaître
    expect(b.cartesIds).not.toContain(dameX.id)
    expect(b.cartesIds).not.toContain(valetY.id)
  })

  it('scénario exact du bug : après annonce, pli suivant → bésigue NE revient PAS', () => {
    const atout: Couleur = 'clubs'
    const dameX  = c('spades',   'Q', 0, 1)
    const valetY = c('diamonds', 'J', 0, 2)

    // Partir d'un state propre et annoncer via appliquerAnnonce
    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout, atoutDefini: true })
    state = {
      ...state,
      annonces: [
        { nom: 'mariage_atout' as const, points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1 as const, mancheNumero: 1 },
      ],
    }

    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [dameX, valetY], cartesEtalees: [] }
    state = { ...state, joueurs }

    // J0 annonce le bésigue
    const besigue = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'besigue')!
    expect(besigue).toBeDefined()
    state = appliquerAnnonce(state, 0, besigue)

    // Au tour suivant : le bésigue NE doit PAS être reproposé
    const combisApres = detecterCombinaisonsDisponibles(state, 0)
    expect(combisApres.some(c => c.nom === 'besigue')).toBe(false)
  })

  it('deux bésigues consécutifs avec des cartes différentes à chaque fois', () => {
    const dameX  = c('spades',   'Q', 0, 1)
    const valetY = c('diamonds', 'J', 0, 2)
    const dameW  = c('spades',   'Q', 1, 33)
    const valetZ = c('diamonds', 'J', 1, 34)

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: 'hearts', atoutDefini: true })
    state = {
      ...state,
      annonces: [
        { nom: 'mariage_atout' as const, points: 40, cartesIds: ['hearts-K-9-900', 'hearts-Q-9-901'], joueurId: 1 as const, mancheNumero: 1 },
      ],
    }

    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [dameX, valetY, dameW, valetZ], cartesEtalees: [] }
    state = { ...state, joueurs }

    // Premier bésigue (100 pts)
    const b1 = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'besigue')!
    expect(b1.points).toBe(100)
    state = appliquerAnnonce(state, 0, b1)
    expect(state.premierBesiguePose).toBe(true)

    // Deuxième bésigue doit utiliser dameW + valetZ (les cartes libres)
    const b2 = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'besigue')!
    expect(b2).toBeDefined()
    expect(b2.points).toBe(40)        // 2e bésigue = 40 pts
    // Les nouvelles cartes uniquement
    expect(b2.cartesIds).not.toContain(b1.cartesIds[0])
    expect(b2.cartesIds).not.toContain(b1.cartesIds[1])
    state = appliquerAnnonce(state, 0, b2)

    // Troisième bésigue impossible : toutes les cartes consommées
    const combis3 = detecterCombinaisonsDisponibles(state, 0)
    expect(combis3.some(c => c.nom === 'besigue')).toBe(false)
  })
})

// ============================================================
// SEPT D'ATOUT — désormais bonus automatique, jamais annonce
// ============================================================

describe('Non-régression — sept d\'atout n\'est jamais une annonce', () => {

  it('7 d\'atout en main : jamais proposé comme annonce', () => {
    const atout: Couleur = 'hearts'
    const sept = c(atout, '7', 0, 1)
    const state = makeStateAvecAnnonces([sept], [], [], atout)
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'sept_atout')).toBe(false)
  })

  it('deux 7 d\'atout en main : aucun sept_atout proposé', () => {
    const atout: Couleur = 'spades'
    const sept0 = c(atout, '7', 0, 1)
    const sept1 = c(atout, '7', 1, 33)
    const state = makeStateAvecAnnonces([sept0, sept1], [], [], atout)
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'sept_atout')).toBe(false)
  })
})

// ============================================================
// QUINTE — non-reproposition
// ============================================================

describe('Non-régression — quinte reproposition', () => {

  it('quinte déjà annoncée → jamais reproposée', () => {
    const atout: Couleur = 'diamonds'
    const as    = c(atout, 'A',  0, 1)
    const dix   = c(atout, '10', 0, 2)
    const valet = c(atout, 'J',  0, 3)
    const roi   = c(atout, 'K',  0, 4)
    const dame  = c(atout, 'Q',  0, 5)

    const annonceQuinte: AnnoncePosee = {
      nom: 'quinte', points: 250,
      cartesIds: [as.id, dix.id, valet.id],
      joueurId: 0, mancheNumero: 1,
    }
    const annonceMariageJ0: AnnoncePosee = {
      nom: 'mariage_atout', points: 40,
      cartesIds: [roi.id, dame.id],
      joueurId: 0, mancheNumero: 1,
    }

    const state = makeStateAvecAnnonces(
      [as, dix, valet],
      [roi, dame],
      [annonceMariageJ0, annonceQuinte],
      atout
    )
    // Injecter mariagesAtoutActifs pour J0
    const stateAvecMariage = {
      ...state,
      mariagesAtoutActifs: { 0: [[roi.id, dame.id]] as [string, string][], 1: [] as [string, string][] },
    }

    const combis = detecterCombinaisonsDisponibles(stateAvecMariage, 0)
    expect(combis.some(c => c.nom === 'quinte')).toBe(false)
  })
})

// ============================================================
// CYCLE COMPLET via appliquerAnnonce — toutes les combis
// ============================================================

describe('Cycle complet — non-reproposition après appliquerAnnonce', () => {

  it('mariage_atout annoncé → non reproposé avec les mêmes cartes', () => {
    const atout: Couleur = 'hearts'
    const roi  = c(atout, 'K', 0, 1)
    const dame = c(atout, 'Q', 0, 2)

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout, atoutDefini: true })

    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [roi, dame], cartesEtalees: [] }
    state = { ...state, joueurs }

    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    expect(m).toBeDefined()
    state = appliquerAnnonce(state, 0, m)

    // Roi et Dame sont étalés — ne pas reproposer le même mariage
    const combis2 = detecterCombinaisonsDisponibles(state, 0)
    const memeMarriage = combis2.filter(c =>
      (c.nom === 'mariage_atout' || c.nom === 'mariage_hors_atout') &&
      c.cartesIds.includes(roi.id) && c.cartesIds.includes(dame.id)
    )
    expect(memeMarriage).toHaveLength(0)
  })

  it('mariage_hors_atout annoncé → non reproposé', () => {
    const atout: Couleur = 'hearts'
    const roiS  = c('spades', 'K', 0, 10)
    const dameS = c('spades', 'Q', 0, 11)

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout, atoutDefini: true })
    state = {
      ...state,
      annonces: [
        { nom: 'mariage_atout' as const, points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1 as const, mancheNumero: 1 },
      ],
    }

    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [roiS, dameS], cartesEtalees: [] }
    state = { ...state, joueurs }

    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_hors_atout')!
    expect(m).toBeDefined()
    state = appliquerAnnonce(state, 0, m)

    const combis2 = detecterCombinaisonsDisponibles(state, 0)
    const memeMarriage = combis2.filter(c =>
      c.nom === 'mariage_hors_atout' &&
      c.cartesIds.includes(roiS.id) && c.cartesIds.includes(dameS.id)
    )
    expect(memeMarriage).toHaveLength(0)
  })
})
