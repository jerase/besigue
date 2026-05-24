// ============================================================
// TESTS — PanneauScore : affichage du compteur de manches
// Vérifie que le compteur de manches est correctement affiché
// dans le panneau de score pour les deux joueurs.
// ============================================================

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { PanneauScore } from '../../src/components/ui/PanneauScore'
import { initialiserPartie } from '../../src/core/init'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState } from '../../src/types'

// ── Helper : état de jeu avec compteur personnalisé ──────────

function makeState(
  compteurManches: [number, number],
  overrides: Partial<GameState> = {}
): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  return { ...state, compteurManches, ...overrides }
}

const onPause = vi.fn()

// ============================================================
// 1. COMPTEUR À ZÉRO (début de partie)
// ============================================================

describe('Compteur à zéro (début de partie)', () => {
  it('affiche "0 manche" pour les deux joueurs', () => {
    render(<PanneauScore state={makeState([0, 0])} onPause={onPause} />)
    const zeros = screen.getAllByText('0 manche')
    expect(zeros).toHaveLength(2)
  })

  it('les 4 pastilles des deux joueurs sont inactives (aucune remplie)', () => {
    const { container } = render(<PanneauScore state={makeState([0, 0])} onPause={onPause} />)
    // Toutes les pastilles doivent être grises (bg-white/15), aucune en amber
    const pastillesAmber = container.querySelectorAll('.bg-amber-400')
    expect(pastillesAmber).toHaveLength(0)
  })
})

// ============================================================
// 2. J0 A GAGNÉ DES MANCHES
// ============================================================

describe('J0 a des manches gagnées', () => {
  it('1 manche → affiche "1 / 4 manche"', () => {
    render(<PanneauScore state={makeState([1, 0])} onPause={onPause} />)
    expect(screen.getByText('1 / 4 manche')).toBeInTheDocument()
  })

  it('2 manches → affiche "2 / 4 manches" (pluriel)', () => {
    render(<PanneauScore state={makeState([2, 0])} onPause={onPause} />)
    expect(screen.getByText('2 / 4 manches')).toBeInTheDocument()
  })

  it('3 manches → affiche "3 / 4 manches"', () => {
    render(<PanneauScore state={makeState([3, 0])} onPause={onPause} />)
    expect(screen.getByText('3 / 4 manches')).toBeInTheDocument()
  })

  it('4 manches → affiche "4 / 4 manches"', () => {
    render(<PanneauScore state={makeState([4, 0])} onPause={onPause} />)
    expect(screen.getByText('4 / 4 manches')).toBeInTheDocument()
  })

  it('2 manches J0 → 2 pastilles amber pour J0', () => {
    const { container } = render(<PanneauScore state={makeState([2, 0])} onPause={onPause} />)
    const pastillesAmber = container.querySelectorAll('.bg-amber-400')
    expect(pastillesAmber).toHaveLength(2)
  })

  it('3 manches J0 → 3 pastilles amber', () => {
    const { container } = render(<PanneauScore state={makeState([3, 0])} onPause={onPause} />)
    const pastillesAmber = container.querySelectorAll('.bg-amber-400')
    expect(pastillesAmber).toHaveLength(3)
  })
})

// ============================================================
// 3. J1 A GAGNÉ DES MANCHES
// ============================================================

describe('J1 (IA) a des manches gagnées', () => {
  it('1 manche J1 → affiche "1 / 4 manche"', () => {
    render(<PanneauScore state={makeState([0, 1])} onPause={onPause} />)
    expect(screen.getByText('1 / 4 manche')).toBeInTheDocument()
  })

  it('2 manches J1 → 2 pastilles amber', () => {
    const { container } = render(<PanneauScore state={makeState([0, 2])} onPause={onPause} />)
    const pastillesAmber = container.querySelectorAll('.bg-amber-400')
    expect(pastillesAmber).toHaveLength(2)
  })
})

// ============================================================
// 4. LES DEUX JOUEURS ONT DES MANCHES (état intermédiaire)
// ============================================================

describe('Compteurs indépendants par joueur', () => {
  it('J0=2, J1=1 → textes distincts dans le DOM', () => {
    render(<PanneauScore state={makeState([2, 1])} onPause={onPause} />)
    expect(screen.getByText('2 / 4 manches')).toBeInTheDocument()
    expect(screen.getByText('1 / 4 manche')).toBeInTheDocument()
  })

  it('J0=2, J1=1 → 3 pastilles amber au total', () => {
    const { container } = render(<PanneauScore state={makeState([2, 1])} onPause={onPause} />)
    const pastillesAmber = container.querySelectorAll('.bg-amber-400')
    expect(pastillesAmber).toHaveLength(3)
  })

  it('J0=0, J1=3 → 3 pastilles amber', () => {
    const { container } = render(<PanneauScore state={makeState([0, 3])} onPause={onPause} />)
    const pastillesAmber = container.querySelectorAll('.bg-amber-400')
    expect(pastillesAmber).toHaveLength(3)
  })
})

// ============================================================
// 5. REMISE À ZÉRO DE L'ADVERSAIRE
// ============================================================

describe('Remise à zéro après victoire adverse', () => {
  it('J0 revient à 0 après victoire J1 → "0 manche" pour J0', () => {
    // J0 avait 2, J1 gagne → J0=0, J1=1
    render(<PanneauScore state={makeState([0, 1])} onPause={onPause} />)
    const zeros = screen.getAllByText('0 manche')
    // J0 doit afficher "0 manche"
    expect(zeros.length).toBeGreaterThanOrEqual(1)
  })

  it('J0=0, J1=1 → 1 seule pastille amber', () => {
    const { container } = render(<PanneauScore state={makeState([0, 1])} onPause={onPause} />)
    const pastillesAmber = container.querySelectorAll('.bg-amber-400')
    expect(pastillesAmber).toHaveLength(1)
  })
})

// ============================================================
// 6. COMPTEUR ABSENT (compatibilité ascendante)
// ============================================================

describe('Compatibilité ascendante — compteur absent', () => {
  it('state sans compteurManches → pas de crash, affiche 0 manche', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    // Simuler un ancien state sans le champ
    const stateAncien = { ...state } as any
    delete stateAncien.compteurManches

    expect(() =>
      render(<PanneauScore state={stateAncien} onPause={onPause} />)
    ).not.toThrow()

    const zeros = screen.getAllByText('0 manche')
    expect(zeros).toHaveLength(2)
  })
})

// ============================================================
// 7. NON-RÉGRESSION — points de jeu toujours affichés
// ============================================================

describe('Non-régression — points de jeu (marquePoints)', () => {
  it('les points de jeu sont toujours affichés même avec compteur', () => {
    const state = makeState([2, 1])
    // Fixer des scores de jeu identifiables
    const stateAvecScores = {
      ...state,
      joueurs: [
        { ...state.joueurs[0], marquePoints: 450 },
        { ...state.joueurs[1], marquePoints: 320 },
      ] as typeof state.joueurs,
    }
    render(<PanneauScore state={stateAvecScores} onPause={onPause} />)
    expect(screen.getByText('450')).toBeInTheDocument()
    expect(screen.getByText('320')).toBeInTheDocument()
  })

  it('le nom des joueurs est toujours affiché', () => {
    const state = makeState([1, 0])
    render(<PanneauScore state={state} onPause={onPause} />)
    expect(screen.getByText(/Joueur/)).toBeInTheDocument()
  })
})
