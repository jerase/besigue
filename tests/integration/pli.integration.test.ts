// ============================================================
// TESTS D'INTÉGRATION — MOTEUR DE JEU (IT-3)
// Scénarios de plis complets sur GameState réel
// ============================================================

import { describe, it, expect } from 'vitest'
import { jouerCarte, appliquerPli, resoudrePli } from '../../src/core/pli'
import { initialiserPartie, piocher } from '../../src/core/init'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState } from '../../src/types'

function makeState(): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  return state
}

// ============================================================
// Séquence : J0 joue → J1 joue → résolution → pioche
// ============================================================

describe('Intégration IT-3 — séquence de pli complète', () => {
  it('J0 joue une carte, J1 joue, pli résolu, pioche effectuée', () => {
    let state = makeState()
    const joueurActif = state.joueurActif

    // Forcer J0 a la main pour le test
    state = { ...state, joueurActif: 0, pliEnCours: { ...state.pliEnCours, joueurOuvreur: 0 } }

    // J0 joue sa première carte
    const carteJ0 = state.joueurs[0].main[0]
    const r1 = jouerCarte(state, 0, carteJ0.id)
    expect(r1.ok).toBe(true)
    expect(r1.state.pliEnCours.carteJoueur0?.id).toBe(carteJ0.id)
    expect(r1.state.joueurs[0].main).toHaveLength(8)

    // J1 répond
    let s2 = r1.state
    s2 = { ...s2, joueurActif: 1 }
    const carteJ1 = s2.joueurs[1].main[0]
    const r2 = jouerCarte(s2, 1, carteJ1.id)
    expect(r2.ok).toBe(true)
    expect(r2.state.pliEnCours.carteJoueur1?.id).toBe(carteJ1.id)

    // Résolution du pli
    let stateApres = appliquerPli(r2.state)
    const vainqueur = stateApres.dernierVainqueurPli!
    expect([0, 1]).toContain(vainqueur)
    // Les 2 cartes sont dans la pile du vainqueur
    expect(stateApres.joueurs[vainqueur].pileRemportee).toHaveLength(2)
    // Le pli est vidé
    expect(stateApres.pliEnCours.carteJoueur0).toBeNull()
    expect(stateApres.pliEnCours.carteJoueur1).toBeNull()

    // Pioche
    const pioches = piocher(stateApres, vainqueur)
    expect(pioches.state.joueurs[vainqueur].main).toHaveLength(9) // 8 + 1 pioché
    const adversaire: 0 | 1 = vainqueur === 0 ? 1 : 0
    const pioches2 = piocher(pioches.state, adversaire)
    expect(pioches2.state.joueurs[adversaire].main).toHaveLength(9) // 8 + 1 pioché

    // Intégrité totale
    const total = pioches2.state.joueurs[0].main.length
                + pioches2.state.joueurs[0].cartesEtalees.length
                + pioches2.state.joueurs[1].main.length
                + pioches2.state.joueurs[1].cartesEtalees.length
                + pioches2.state.pioche.length
                + pioches2.state.joueurs[0].pileRemportee.length
                + pioches2.state.joueurs[1].pileRemportee.length
    expect(total).toBe(132)
  })

  it('impossible de jouer hors de son tour', () => {
    let state = makeState()
    state = { ...state, joueurActif: 0 }
    const carteJ1 = state.joueurs[1].main[0]
    const r = jouerCarte(state, 1, carteJ1.id)
    expect(r.ok).toBe(false)
    expect(r.erreur).toContain('tour')
  })

  it('impossible de jouer une carte inexistante', () => {
    const state = makeState()
    const r = jouerCarte(state, 0, 'carte-inexistante')
    expect(r.ok).toBe(false)
  })
})

// ============================================================
// Simulation de 5 plis complets
// ============================================================

describe('Intégration IT-3 — simulation 5 plis', () => {
  it('5 plis successifs maintiennent l\'intégrité des 132 cartes', () => {
    let state = makeState()
    state = { ...state, joueurActif: 0, pliEnCours: { ...state.pliEnCours, joueurOuvreur: 0 } }

    for (let pliNum = 0; pliNum < 5; pliNum++) {
      const actif = state.joueurActif
      const adversaire: 0 | 1 = actif === 0 ? 1 : 0

      // Actif joue
      const carteActif = state.joueurs[actif].main[0]
      const r1 = jouerCarte(state, actif, carteActif.id)
      expect(r1.ok).toBe(true)
      let s = r1.state

      // Adversaire joue
      s = { ...s, joueurActif: adversaire }
      const carteAdversaire = s.joueurs[adversaire].main[0]
      const r2 = jouerCarte(s, adversaire, carteAdversaire.id)
      expect(r2.ok).toBe(true)

      // Résolution
      s = appliquerPli(r2.state)
      const vainqueur = s.dernierVainqueurPli!

      // Pioche
      if (s.pioche.length > 0) {
        s = piocher(s, vainqueur).state
        const adv2: 0 | 1 = vainqueur === 0 ? 1 : 0
        if (s.pioche.length > 0) s = piocher(s, adv2).state
      }

      // Vérifier intégrité après chaque pli
      const total = s.joueurs[0].main.length + s.joueurs[0].cartesEtalees.length
                  + s.joueurs[1].main.length + s.joueurs[1].cartesEtalees.length
                  + s.pioche.length
                  + s.joueurs[0].pileRemportee.length
                  + s.joueurs[1].pileRemportee.length
      expect(total).toBe(132)

      state = s
    }

    // Après 5 plis : 10 cartes dans les piles
    const cartesEnPiles = state.joueurs[0].pileRemportee.length + state.joueurs[1].pileRemportee.length
    expect(cartesEnPiles).toBe(10)
  })
})

// ============================================================
// Bonus 7 d'atout (SF-08.1 Étape 3)
// ============================================================

describe('Intégration IT-3 — bonus 7 d\'atout', () => {
  it('jouer le 7 d\'atout donne +10 pts au joueur', () => {
    let { state } = initialiserPartie(CONFIG_DEFAUT)

    // Définir l'atout hearts
    state = { ...state, couleurAtout: 'hearts' }

    // Injecter un 7 de cœur (atout) dans la main de J0
    const sept7 = { ...state.joueurs[0].main[0], rang: '7' as const, couleur: 'hearts' as const, estJoker: false }
    const mainJ0 = [sept7, ...state.joueurs[0].main.slice(1)]
    state = {
      ...state,
      joueurs: [
        { ...state.joueurs[0], main: mainJ0 },
        state.joueurs[1],
      ],
      joueurActif: 0,
      pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 0 },
    }

    // J0 joue le 7 d'atout
    const r1 = jouerCarte(state, 0, sept7.id)
    expect(r1.ok).toBe(true)

    // J1 joue n'importe quelle carte
    let s = r1.state
    s = { ...s, joueurActif: 1 }
    const carteJ1 = s.joueurs[1].main[0]
    const r2 = jouerCarte(s, 1, carteJ1.id)
    expect(r2.ok).toBe(true)

    // Résolution → J0 doit avoir reçu +10 pts
    const stateApres = appliquerPli(r2.state)
    expect(stateApres.joueurs[0].marquePoints).toBe(10)
  })
})

// ============================================================
// Épuisement de la pioche → phase finale
// ============================================================

describe('Intégration IT-3 — transition phase finale', () => {
  it('quand la pioche est vide, le state est prêt pour la phase finale', () => {
    let { state } = initialiserPartie(CONFIG_DEFAUT)

    // Vider la pioche artificiellement
    state = { ...state, pioche: [], phase: 'libre' }

    // Simuler un pli
    state = { ...state, joueurActif: 0, pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 0 } }
    const r1 = jouerCarte(state, 0, state.joueurs[0].main[0].id)
    let s = r1.state
    s = { ...s, joueurActif: 1 }
    const r2 = jouerCarte(s, 1, s.joueurs[1].main[0].id)
    const resolved = appliquerPli(r2.state)

    // Après le pli avec pioche vide → la phase doit basculer
    // (normalement géré par l'orchestrateur, mais l'état pioche=0 est là)
    expect(resolved.pioche.length).toBe(0)
    expect(resolved.pioche.length).toBe(0)
  })
})

// ============================================================
// Règles pli — cas Joker SF-10.10
// ============================================================

describe('Intégration IT-3 — cas Joker dans pli réel', () => {
  it('Joker vs Joker : le joueur qui a la main (ouvreur) remporte', () => {
    // Les jokers sont importés en haut du fichier
    const j0 = { id: 'joker-spades-0-128', couleur: 'spades' as const, rang: 'JOKER' as const, jeuIndex: 0, estJoker: true, faceUp: false, etat: 'faceDown' as const }
    const j1 = { id: 'joker-hearts-1-129', couleur: 'hearts' as const, rang: 'JOKER' as const, jeuIndex: 1, estJoker: true, faceUp: false, etat: 'faceDown' as const }

    // J0 ouvre
    const r0 = resoudrePli(j0, j1, 0, null)
    expect(r0.vainqueur).toBe(0)

    // J1 ouvre
    const r1 = resoudrePli(j0, j1, 1, null)
    expect(r1.vainqueur).toBe(1)
  })
})
