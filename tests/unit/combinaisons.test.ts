// ============================================================
// TESTS UNITAIRES — COMBINAISONS (IT-4)
// SF-10 : détection, réutilisation, mariage_Atout, bésigue
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import {
  detecterCombinaisonsDisponibles,
  appliquerAnnonce,
  gererCassureMariageAtout,
  initialiserChampsIT4,
} from '../../src/core/combinaisons'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte, creerJoker } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

// ── Helpers ───────────────────────────────────────────────────

function makeState(overrides?: Partial<GameState>): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  return initialiserChampsIT4({ ...state, ...overrides })
}

function stateAvecMain(cartes: Carte[], joueurId: 0 | 1 = 0, overrides?: Partial<GameState>): GameState {
  const base = makeState(overrides)
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[joueurId] = { ...joueurs[joueurId], main: cartes, cartesEtalees: [] }
  return { ...base, joueurs }
}

/**
 * Crée un state avec le mariage_Atout déjà posé (prérequis global débloqué).
 * L'annonce factice est injectée APRÈS stateAvecMain pour ne pas être écrasée
 * par initialiserChampsIT4.
 */
function stateAvecMariageAtoutPose(
  cartes: Carte[],
  joueurId: 0 | 1 = 0,
  couleurAtout: Couleur = 'hearts',
  overrides?: Partial<GameState>
): GameState {
  // stateAvecMain applique les overrides puis initialiserChampsIT4 (qui remet annonces:[])
  const base = stateAvecMain(cartes, joueurId, { couleurAtout, ...overrides })

  // Injecter l'annonce factice APRÈS (sinon initialiserChampsIT4 l'efface)
  const annonceFactice: import('../../src/types').AnnoncePosee = {
    nom: 'mariage_atout',
    points: 40,
    cartesIds: [`${couleurAtout}-K-9-900`, `${couleurAtout}-Q-9-901`],
    joueurId: joueurId === 0 ? 1 : 0,  // posé par l'adversaire pour ne pas polluer la main
    mancheNumero: 1,
  }
  return { ...base, annonces: [annonceFactice] }
}

// Cartes utilitaires
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0, pos = 0) =>
  creerCarte(couleur, rang, jeu, pos)

// ============================================================
// SF-10.1 / SF-10.2 — MARIAGES
// ============================================================

describe('Mariages', () => {
  it('détecte un mariage_atout quand atout défini', () => {
    const state = stateAvecMain([
      c('hearts', 'K', 0, 1),
      c('hearts', 'Q', 0, 2),
    ], 0, { couleurAtout: 'hearts' })

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'mariage_atout')).toBe(true)
    expect(combis.find(c => c.nom === 'mariage_atout')?.points).toBe(40)
  })

  it('détecte un mariage_hors_atout (autre couleur)', () => {
    const state = stateAvecMariageAtoutPose([
      c('spades', 'K', 0, 1),
      c('spades', 'Q', 0, 2),
    ], 0, 'hearts')

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'mariage_hors_atout')).toBe(true)
    expect(combis.find(c => c.nom === 'mariage_hors_atout')?.points).toBe(20)
  })

  it('sans atout défini, tout mariage est traité comme mariage_atout potentiel', () => {
    const state = stateAvecMain([
      c('hearts', 'K', 0, 1),
      c('hearts', 'Q', 0, 2),
    ], 0, { couleurAtout: null })

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.length).toBeGreaterThan(0)
    expect(combis[0].nom).toBe('mariage_atout')
  })

  it('pas de mariage sans Roi', () => {
    const state = stateAvecMain([
      c('hearts', 'Q', 0, 1),
      c('hearts', 'J', 0, 2),
    ], 0, { couleurAtout: 'hearts' })

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'mariage_atout' || c.nom === 'mariage_hors_atout')).toBe(false)
  })

  it('pas de mariage sans Dame', () => {
    const state = stateAvecMain([
      c('hearts', 'K', 0, 1),
      c('hearts', 'J', 0, 2),
    ], 0, { couleurAtout: 'hearts' })

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'mariage_atout' || c.nom === 'mariage_hors_atout')).toBe(false)
  })

  it('mariage déjà annoncé avec les mêmes cartes n\'est pas reproposé', () => {
    let state = stateAvecMain([
      c('hearts', 'K', 0, 1),
      c('hearts', 'Q', 0, 2),
    ], 0, { couleurAtout: 'hearts' })

    const combis = detecterCombinaisonsDisponibles(state, 0)
    const mariage = combis.find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, mariage)

    // Redonner les cartes en main pour simuler
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [...state.joueurs[0].cartesEtalees], cartesEtalees: [] }
    const stateApres = { ...state, joueurs }

    const combis2 = detecterCombinaisonsDisponibles(stateApres, 0)
    const mariagesDupliques = combis2.filter(c =>
      (c.nom === 'mariage_atout' || c.nom === 'mariage_hors_atout') &&
      c.cartesIds.every(id => mariage.cartesIds.includes(id))
    )
    expect(mariagesDupliques).toHaveLength(0)
  })
})

// ============================================================
// SF-10.3 — QUINTE
// ============================================================

describe('Quinte', () => {
  it('détecte la quinte quand mariage_Atout actif + As + 10 + Valet atout', () => {
    const atout: Couleur = 'hearts'
    const roi   = c(atout, 'K', 0, 1)
    const dame  = c(atout, 'Q', 0, 2)
    const as    = c(atout, 'A', 0, 3)
    const dix   = c(atout, '10', 0, 4)
    const valet = c(atout, 'J', 0, 5)

    let state = stateAvecMain([roi, dame, as, dix, valet], 0, {
      couleurAtout: atout,
    })

    // Poser le mariage_Atout (premier mariage → débloque toutes les combis)
    const combiMariage = detecterCombinaisonsDisponibles(state, 0)
      .find(c => c.nom === 'mariage_atout')!
    expect(combiMariage).toBeDefined()
    state = appliquerAnnonce(state, 0, combiMariage)

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'quinte')).toBe(true)
    expect(combis.find(c => c.nom === 'quinte')?.points).toBe(250)
  })

  it('pas de quinte sans mariage_Atout actif', () => {
    const atout: Couleur = 'hearts'
    const state = stateAvecMain([
      c(atout, 'A', 0, 3),
      c(atout, '10', 0, 4),
      c(atout, 'J', 0, 5),
    ], 0, { couleurAtout: atout })
    // mariagesAtoutActifs vide → pas de quinte

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'quinte')).toBe(false)
  })

  it('pas de quinte sans As d\'atout', () => {
    const atout: Couleur = 'diamonds'
    let state = stateAvecMain([
      c(atout, 'K', 0, 1), c(atout, 'Q', 0, 2),
      c(atout, '10', 0, 4), c(atout, 'J', 0, 5),
    ], 0, { couleurAtout: atout })
    // Pose le mariage pour débloquer les combis
    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    expect(m).toBeDefined()
    state = appliquerAnnonce(state, 0, m)

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'quinte')).toBe(false)
  })

  it('quinte annoncée une seule fois', () => {
    const atout: Couleur = 'clubs'
    const roi = c(atout, 'K', 0, 1), dame = c(atout, 'Q', 0, 2)
    const as = c(atout, 'A', 0, 3), dix = c(atout, '10', 0, 4), valet = c(atout, 'J', 0, 5)
    let state = stateAvecMain([roi, dame, as, dix, valet], 0, { couleurAtout: atout })
    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    expect(m).toBeDefined()
    state = appliquerAnnonce(state, 0, m) // débloque les combis
    const q = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'quinte')!
    expect(q).toBeDefined()
    state = appliquerAnnonce(state, 0, q)
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === 'quinte')).toBe(false)
  })
})

// ============================================================
// SF-10 — SEPT D'ATOUT
// ============================================================

describe('Sept d\'Atout', () => {
  // Sept d'atout : JAMAIS proposé comme annonce — le bonus +10 est automatique dans appliquerPli()
  it('le 7 d\'atout n\'est PAS proposé comme annonce (bonus automatique)', () => {
    const state = stateAvecMariageAtoutPose([
      c('spades', '7', 0, 1),
    ], 0, 'spades')
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'sept_atout')).toBe(false)
  })
})

// ============================================================
// SF-10.4 — BÉSIGUE
// ============================================================

describe('Bésigue', () => {
  it('détecte le bésigue (Dame♠ + Valet♦)', () => {
    const state = stateAvecMariageAtoutPose([
      c('spades',   'Q', 0, 1),
      c('diamonds', 'J', 0, 2),
    ])
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'besigue')).toBe(true)
  })

  it('premier bésigue vaut 100 pts', () => {
    const state = stateAvecMariageAtoutPose([c('spades', 'Q', 0, 1), c('diamonds', 'J', 0, 2)])
    const b = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'besigue')!
    expect(b.points).toBe(100)
  })

  it('bésigue suivant vaut 40 pts', () => {
    let state = stateAvecMariageAtoutPose([
      c('spades',   'Q', 0, 1), c('diamonds', 'J', 0, 2),
      c('spades',   'Q', 1, 33), c('diamonds', 'J', 1, 34),
    ])
    const b1 = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'besigue')!
    state = appliquerAnnonce(state, 0, b1)
    expect(state.premierBesiguePose).toBe(true)

    const combis2 = detecterCombinaisonsDisponibles(state, 0)
    const b2 = combis2.find(c => c.nom === 'besigue')
    expect(b2).toBeDefined()
    expect(b2?.points).toBe(40)
  })

  it('pas de bésigue sans Dame♠', () => {
    const state = stateAvecMariageAtoutPose([c('hearts', 'Q', 0, 1), c('diamonds', 'J', 0, 2)])
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === 'besigue')).toBe(false)
  })

  it('pas de bésigue sans Valet♦', () => {
    const state = stateAvecMariageAtoutPose([c('spades', 'Q', 0, 1), c('spades', 'J', 0, 2)])
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === 'besigue')).toBe(false)
  })
})

// ============================================================
// SF-10.5 — CARRÉS D'ATOUT (sans Joker)
// ============================================================

describe('Carrés d\'atout', () => {
  const atout: Couleur = 'hearts'

  it('4 As d\'atout → 200 pts', () => {
    const state = stateAvecMariageAtoutPose([
      c(atout,'A',0,1), c(atout,'A',1,33), c(atout,'A',2,65), c(atout,'A',3,97),
    ], 0, atout)
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_as_atout')).toBe(true)
    expect(combis.find(c => c.nom === '4_as_atout')?.points).toBe(200)
  })

  it('4 Rois d\'atout → 160 pts', () => {
    const state = stateAvecMariageAtoutPose([
      c(atout,'K',0,2), c(atout,'K',1,34), c(atout,'K',2,66), c(atout,'K',3,98),
    ], 0, atout)
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === '4_roi_atout')).toBe(true)
    expect(detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === '4_roi_atout')?.points).toBe(160)
  })

  it('4 Dames d\'atout → 120 pts', () => {
    const state = stateAvecMariageAtoutPose([
      c(atout,'Q',0,3), c(atout,'Q',1,35), c(atout,'Q',2,67), c(atout,'Q',3,99),
    ], 0, atout)
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === '4_dame_atout')).toBe(true)
  })

  it('4 Valets d\'atout → 80 pts', () => {
    const state = stateAvecMariageAtoutPose([
      c(atout,'J',0,4), c(atout,'J',1,36), c(atout,'J',2,68), c(atout,'J',3,100),
    ], 0, atout)
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === '4_valet_atout')).toBe(true)
  })

  it('Joker NE complète PAS un carré d\'atout (SF-10.5)', () => {
    const joker = creerJoker('hearts', 0, 128)
    const state = stateAvecMariageAtoutPose([
      c(atout,'A',0,1), c(atout,'A',1,33), c(atout,'A',2,65), joker,
    ], 0, atout)
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === '4_as_atout')).toBe(false)
  })

  it('pas de carré d\'atout sans mariage_Atout posé', () => {
    // Sans mariage_Atout posé, aucun carré d'atout n'est possible
    const state = stateAvecMain([
      c(atout,'A',0,1), c(atout,'A',1,33), c(atout,'A',2,65), c(atout,'A',3,97),
    ], 0, { couleurAtout: atout })
    // annonces vides → prérequis non satisfait
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === '4_as_atout')).toBe(false)
  })

  it('3 As d\'atout insuffisants', () => {
    const state = stateAvecMariageAtoutPose([
      c(atout,'A',0,1), c(atout,'A',1,33), c(atout,'A',2,65),
    ], 0, atout)
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === '4_as_atout')).toBe(false)
  })
})

// ============================================================
// SF-10.1 — CARRÉS NORMAUX (Joker autorisé, couleurs mixtes)
// ============================================================

describe('Carrés normaux', () => {
  it('4 As de couleurs différentes → 100 pts', () => {
    const state = stateAvecMariageAtoutPose([
      c('spades','A',0,1), c('hearts','A',0,5), c('diamonds','A',0,9), c('clubs','A',0,13),
    ])
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === '4_as')).toBe(true)
    expect(combis.find(c => c.nom === '4_as')?.points).toBe(100)
  })

  it('4 Rois → 80 pts', () => {
    const state = stateAvecMariageAtoutPose([
      c('spades','K',0,2), c('hearts','K',0,6), c('diamonds','K',0,10), c('clubs','K',0,14),
    ])
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === '4_roi')).toBe(true)
    expect(detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === '4_roi')?.points).toBe(80)
  })

  it('4 Dames → 60 pts', () => {
    const state = stateAvecMariageAtoutPose([
      c('spades','Q',0,3), c('hearts','Q',0,7), c('diamonds','Q',0,11), c('clubs','Q',0,15),
    ])
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === '4_dame')).toBe(true)
    expect(detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === '4_dame')?.points).toBe(60)
  })

  it('4 Valets → 40 pts', () => {
    const state = stateAvecMariageAtoutPose([
      c('spades','J',0,4), c('hearts','J',0,8), c('diamonds','J',0,12), c('clubs','J',0,16),
    ])
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === '4_valet')).toBe(true)
  })

  it('Joker complète un carré normal (3 + Joker = 4)', () => {
    const joker = creerJoker('spades', 0, 128)
    const state = stateAvecMariageAtoutPose([
      c('spades','A',0,1), c('hearts','A',0,5), c('diamonds','A',0,9), joker,
    ])
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === '4_as')).toBe(true)
  })

  it('3 As sans Joker insuffisants', () => {
    const state = stateAvecMariageAtoutPose([
      c('spades','A',0,1), c('hearts','A',0,5), c('diamonds','A',0,9),
    ])
    expect(detecterCombinaisonsDisponibles(state, 0).some(c => c.nom === '4_as')).toBe(false)
  })
})

// ============================================================
// SF-10.10 — RÉUTILISATION DES CARTES
// ============================================================

describe('Réutilisation des cartes', () => {
  it('une carte peut être dans 2 combinaisons différentes (mariage + carré)', () => {
    // Roi♥ dans un mariage_Atout ET dans un carré de rois
    // Le prérequis (mariage_Atout existant) est satisfait par le mariage que J0 va poser lui-même
    const atout: Couleur = 'hearts'
    const roiH = c(atout, 'K', 0, 1)
    // J0 a Roi♥ + Dame♥ (pour mariage_Atout) + 3 autres Rois (pour carré)
    let state = stateAvecMain([
      roiH,
      c(atout, 'Q', 0, 2),
      c('spades', 'K', 0, 10),
      c('diamonds', 'K', 0, 11),
      c('clubs', 'K', 0, 12),
    ], 0, { couleurAtout: atout })

    // J0 pose son mariage_Atout (premier mariage → débloque tout)
    const mariage = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    expect(mariage).toBeDefined()
    state = appliquerAnnonce(state, 0, mariage)

    // Le Roi♥ est maintenant étalé. Le carré de rois (roiH étalé + 3 en main) doit rester dispo
    const combis2 = detecterCombinaisonsDisponibles(state, 0)
    expect(combis2.some(c => c.nom === '4_roi')).toBe(true)
  })

  it('poser les 2 combinaisons partageant une carte cumule bien les points et les usages', () => {
    // On pose réellement le mariage_Atout PUIS le carré de rois : le Roi♥
    // (carte partagée) doit alors apparaître dans usagesCartes avec les
    // 2 noms de combinaison, et les points des deux annonces s'additionnent.
    const atout: Couleur = 'hearts'
    const roiH = c(atout, 'K', 0, 1)
    let state = stateAvecMain([
      roiH,
      c(atout, 'Q', 0, 2),
      c('spades', 'K', 0, 10),
      c('diamonds', 'K', 0, 11),
      c('clubs', 'K', 0, 12),
    ], 0, { couleurAtout: atout })

    const mariage = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, mariage)
    const scoreApresMariage = state.joueurs[0].marquePoints
    expect(scoreApresMariage).toBe(40)

    const carre = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === '4_roi')!
    expect(carre).toBeDefined()
    state = appliquerAnnonce(state, 0, carre)

    // Les points des deux annonces se cumulent
    expect(state.joueurs[0].marquePoints).toBe(scoreApresMariage + carre.points)

    // Le Roi♥ (carte partagée) référence bien les 2 combinaisons dans usagesCartes
    const usageRoiH = state.usagesCartes.find(u => u.carteId === roiH.id)
    expect(usageRoiH).toBeDefined()
    expect(usageRoiH!.combinaisonsUtilisees).toEqual(
      expect.arrayContaining(['mariage_atout', '4_roi'])
    )
    expect(usageRoiH!.combinaisonsUtilisees).toHaveLength(2)

    // Le Roi♥ reste étalé une seule fois (pas de doublon)
    const occurrences = state.joueurs[0].cartesEtalees.filter(c => c.id === roiH.id)
    expect(occurrences).toHaveLength(1)
  })

  it('la même paire (Roi+Dame) ne peut PAS reformer le même mariage', () => {
    const roi = c('hearts', 'K', 0, 1)
    const dame = c('hearts', 'Q', 0, 2)
    let state = stateAvecMain([roi, dame], 0, { couleurAtout: 'hearts' })

    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m)

    // Remettre les cartes en main (simuler une récupération)
    const j = [...state.joueurs] as typeof state.joueurs
    j[0] = { ...j[0], main: [roi, dame], cartesEtalees: [] }
    const s2 = { ...state, joueurs: j }

    const combis2 = detecterCombinaisonsDisponibles(s2, 0)
    const memeMarigae = combis2.filter(c =>
      (c.nom === 'mariage_atout') &&
      c.cartesIds.includes(roi.id) && c.cartesIds.includes(dame.id)
    )
    expect(memeMarigae).toHaveLength(0)
  })
})

// ============================================================
// SF-10.2 — MARIAGE_ATOUT DYNAMIQUE & CASSURE
// ============================================================

describe('Mariage_Atout dynamique', () => {
  it('poser mariage_Atout définit la couleur d\'atout', () => {
    const roi  = c('diamonds', 'K', 0, 1)
    const dame = c('diamonds', 'Q', 0, 2)
    let state = stateAvecMain([roi, dame], 0, { couleurAtout: null })

    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m)

    expect(state.couleurAtout).toBe('diamonds')
    expect(state.couleurAtout).not.toBeNull()
  })

  it('gererCassureMariageAtout : jouer le Roi casse le mariage_Atout', () => {
    const roi  = c('hearts', 'K', 0, 1)
    const dame = c('hearts', 'Q', 0, 2)
    let state = stateAvecMain([roi, dame], 0, { couleurAtout: 'hearts' })
    state = {
      ...state,
      mariagesAtoutActifs: { 0: [[roi.id, dame.id]], 1: [] },
    }

    const stateApres = gererCassureMariageAtout(state, 0, roi.id)
    expect(stateApres.mariagesAtoutActifs?.[0]).toHaveLength(0)
  })

  it('jouer une carte non liée ne casse pas le mariage', () => {
    const roi  = c('hearts', 'K', 0, 1)
    const dame = c('hearts', 'Q', 0, 2)
    const as   = c('hearts', 'A', 0, 3)
    let state = stateAvecMain([roi, dame, as], 0, { couleurAtout: 'hearts' })
    state = {
      ...state,
      mariagesAtoutActifs: { 0: [[roi.id, dame.id]], 1: [] },
    }
    const stateApres = gererCassureMariageAtout(state, 0, as.id)
    expect(stateApres.mariagesAtoutActifs?.[0]).toHaveLength(1)
  })
})

// ============================================================
// APPLIQUER ANNONCE — vérifications points et cartes étalées
// ============================================================

describe('appliquerAnnonce', () => {
  it('les points sont ajoutés au score du joueur', () => {
    let state = stateAvecMain([
      c('hearts', 'K', 0, 1),
      c('hearts', 'Q', 0, 2),
    ], 0, { couleurAtout: 'hearts' })
    // Le mariage_Atout est la première annonce, pas de prérequis pour lui-même

    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m)
    expect(state.joueurs[0].marquePoints).toBe(40)
  })

  it('les cartes sont déplacées de la main vers cartesEtalees', () => {
    const roi  = c('hearts', 'K', 0, 1)
    const dame = c('hearts', 'Q', 0, 2)
    let state = stateAvecMain([roi, dame], 0, { couleurAtout: 'hearts' })
    // mariage_Atout = pas de prérequis (c'est lui le premier)

    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m)

    expect(state.joueurs[0].main).toHaveLength(0)
    expect(state.joueurs[0].cartesEtalees).toHaveLength(2)
  })

  it('l\'annonce est ajoutée à l\'historique', () => {
    let state = stateAvecMain([
      c('hearts', 'K', 0, 1), c('hearts', 'Q', 0, 2),
    ], 0, { couleurAtout: 'hearts' })
    // mariage_Atout = pas de prérequis

    const m = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    state = appliquerAnnonce(state, 0, m)

    expect(state.annonces).toHaveLength(1)
    expect(state.annonces[0].nom).toBe('mariage_atout')
    expect(state.annonces[0].joueurId).toBe(0)
    expect(state.annonces[0].points).toBe(40)
  })

  it('premier bésigue pose le flag premierBesiguePose', () => {
    let state = stateAvecMariageAtoutPose([c('spades', 'Q', 0, 1), c('diamonds', 'J', 0, 2)])
    const b = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'besigue')!
    state = appliquerAnnonce(state, 0, b)
    expect(state.premierBesiguePose).toBe(true)
  })
})
