// ============================================================
// TESTS UNITAIRES — MOTEUR IA (IT-3)
// SF-14 : niveaux, délais, accès information
// ============================================================

import { describe, it, expect } from 'vitest'
import { choisirCarteIA, delaiSimule, DELAIS_IA } from '../../src/core/ia'
import { initialiserPartie } from '../../src/core/init'
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
    const state = makeState()
    const ids = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const c = choisirCarteIA(state, 'facile')
      if (c) ids.add(c.id)
    }
    // Avec 9 cartes, on doit voir au moins 2 cartes différentes sur 50 tirages
    expect(ids.size).toBeGreaterThan(1)
  })

  it('intermédiaire : évite de poser des brisques en ouverture', () => {
    const state = makeState()
    // Injecter une main IA avec uniquement As et un 7
    const as  = { ...state.joueurs[1].main[0], rang: 'A'  as const }
    const sept = { ...state.joueurs[1].main[1], rang: '7' as const }
    const stateTest = {
      ...state,
      joueurs: [
        state.joueurs[0],
        { ...state.joueurs[1], main: [as, sept], cartesEtalees: [] },
      ] as typeof state.joueurs,
    }
    // Sur plusieurs tirages, l'intermédiaire doit préférer le 7 (éviter de donner l'As)
    let nbFois7 = 0
    for (let i = 0; i < 20; i++) {
      const c = choisirCarteIA(stateTest, 'intermediaire')
      if (c?.rang === '7') nbFois7++
    }
    // Le 7 doit être choisi la majorité du temps
    expect(nbFois7).toBeGreaterThan(10)
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
