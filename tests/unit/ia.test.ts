// ============================================================
// TESTS UNITAIRES — MOTEUR IA (IT-3)
// SF-14 : niveaux, délais, accès information
// ============================================================

import { describe, it, expect } from 'vitest'
import { choisirCarteIA, delaiSimule, DELAIS_IA } from '../../src/core/ia'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, NiveauIA } from '../../src/types'

// Helper : state de base
function makeState(): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  return state
}

// ============================================================
// DÉLAIS
// ============================================================

describe('delaiSimule', () => {
  const niveaux: NiveauIA[] = ['facile', 'intermediaire', 'difficile']
  niveaux.forEach(niveau => {
    it(`délai ${niveau} dans la plage [${DELAIS_IA[niveau][0]}, ${DELAIS_IA[niveau][1]}]`, () => {
      for (let i = 0; i < 20; i++) {
        const d = delaiSimule(niveau)
        expect(d).toBeGreaterThanOrEqual(DELAIS_IA[niveau][0])
        expect(d).toBeLessThanOrEqual(DELAIS_IA[niveau][1])
      }
    })
  })
})

// ============================================================
// CHOIX DE CARTE
// ============================================================

describe('choisirCarteIA', () => {
  it('retourne une carte parmi la main de l\'IA', () => {
    const state = makeState()
    const carte = choisirCarteIA(state, 'facile')
    expect(carte).not.toBeNull()
    const ids = [...state.joueurs[1].main, ...state.joueurs[1].cartesEtalees].map(c => c.id)
    expect(ids).toContain(carte!.id)
  })

  it('fonctionne en mode intermediaire', () => {
    const state = makeState()
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte).not.toBeNull()
  })

  it('fonctionne en mode difficile', () => {
    const state = makeState()
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
  })

  it('retourne null si l\'IA n\'a aucune carte', () => {
    const state = makeState()
    const stateVide = {
      ...state,
      joueurs: [
        state.joueurs[0],
        { ...state.joueurs[1], main: [], cartesEtalees: [] },
      ] as typeof state.joueurs,
    }
    const carte = choisirCarteIA(stateVide, 'facile')
    expect(carte).toBeNull()
  })

  it('SF-14.3 : l\'IA ne voit pas la main du joueur humain', () => {
    // L'IA choisit uniquement dans sa propre main
    const state = makeState()
    const carte = choisirCarteIA(state, 'difficile')
    const mainHumain = state.joueurs[0].main.map(c => c.id)
    expect(mainHumain).not.toContain(carte!.id)
  })

  it('niveau facile : résultats variés sur 50 tirages (pas toujours la même carte)', () => {
    // Main explicite garantissant des brisques disponibles : sans cela,
    // une main réelle distribuée aléatoirement peut par malchance ne
    // contenir aucun As/10, ce qui rend Comportement 3 (brisque
    // imprudente) inopérant et strategieOuverturePreAtout déterministe
    // à 100 %, cassant le test de façon intermittente.
    const mainTest = [
      creerCarte('hearts', 'A', 0, 910),
      creerCarte('diamonds', '10', 0, 911),
      creerCarte('clubs', 'K', 0, 912),
      creerCarte('spades', 'Q', 0, 913),
      creerCarte('hearts', 'J', 0, 914),
    ]
    const base = makeState()
    const state = {
      ...base,
      joueurs: [
        base.joueurs[0],
        { ...base.joueurs[1], main: mainTest, cartesEtalees: [] },
      ] as GameState['joueurs'],
    }
    const ids = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const c = choisirCarteIA(state, 'facile')
      if (c) ids.add(c.id)
    }
    // Avec 5 cartes dont des brisques, on doit voir au moins 2 cartes différentes sur 50 tirages
    expect(ids.size).toBeGreaterThan(1)
  })

  it('intermédiaire : règle a.2 — joue l\'As en priorité en ouverture pré-atout (Phase 3)', () => {
    const state = makeState()
    // Injecter une main IA avec uniquement As et un 7 (cartes synthétiques,
    // pour éviter qu'une carte issue de la distribution aléatoire soit
    // par hasard le Joker, ce qui casserait le déterminisme du test)
    const as  = creerCarte('hearts', 'A', 0, 900)
    const sept = creerCarte('spades', '7', 0, 901)
    const stateTest = {
      ...state,
      joueurs: [
        state.joueurs[0],
        { ...state.joueurs[1], main: [as, sept], cartesEtalees: [] },
      ] as typeof state.joueurs,
    }
    // Règle a.2 (Phase 2 Difficile, Phase 3 Intermédiaire) : en ouverture,
    // tant que l'atout n'est pas déclaré, l'As est TOUJOURS prioritaire
    // (coup quasi imparable) — comportement déterministe, plus de hasard.
    // Remplace l'ancien "éviter de donner l'As" qui n'a plus cours ici.
    let nbFoisAs = 0
    for (let i = 0; i < 20; i++) {
      const c = choisirCarteIA(stateTest, 'intermediaire')
      if (c?.rang === 'A') nbFoisAs++
    }
    expect(nbFoisAs).toBe(20)
  })
})

// ============================================================
// ACCÈS AUX INFORMATIONS (SF-14.3)
// ============================================================

describe('IA — accès aux informations', () => {
  it('l\'IA a accès à son score', () => {
    const state = makeState()
    expect(state.joueurs[1].marquePoints).toBeDefined()
  })

  it('l\'IA peut voir le nombre de cartes de l\'adversaire', () => {
    const state = makeState()
    expect(state.joueurs[0].main.length).toBe(9)
  })

  it('l\'IA a accès à la couleur d\'atout', () => {
    const state = makeState()
    // couleurAtout peut être null au départ
    expect(state.couleurAtout === null || typeof state.couleurAtout === 'string').toBe(true)
  })
})
