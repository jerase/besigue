// ============================================================
// TESTS — ZoneCentrale (src/screens/EcranTable/ZoneCentrale.tsx)
// ============================================================
//
// Couvre les branches de rendu jusque-là peu exercées : pioche vide,
// atout affiché/non affiché, mise en évidence du vainqueur du pli.
// ============================================================

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ZoneCentrale } from '../../src/screens/EcranTable/ZoneCentrale'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte } from '../../src/types'

let _pos = 0
const c = (couleur: Carte['couleur'], rang: Carte['rang']): Carte =>
  creerCarte(couleur, rang, 0, _pos++)

function makeState(overrides: Partial<GameState>): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  return { ...state, ...overrides }
}

/** Surcharge uniquement carteJoueur0/carteJoueur1, en conservant les autres champs de PliEnCours (joueurOuvreur, cartes). */
function avecCartesDuPli(
  state: GameState,
  cartes: { carteJoueur0: Carte | null; carteJoueur1: Carte | null }
): GameState {
  return { ...state, pliEnCours: { ...state.pliEnCours, ...cartes } }
}

describe('ZoneCentrale — pioche', () => {
  it('affiche "Vide" quand la pioche est épuisée', () => {
    const state = makeState({ pioche: [] })
    render(<ZoneCentrale state={state} dernierPliVainqueur={null} />)
    expect(screen.getByText('Vide')).toBeInTheDocument()
  })

  it('affiche le nombre de cartes restantes quand la pioche n\'est pas vide', () => {
    const pioche = Array.from({ length: 42 }, () => c('spades', '9'))
    const state = makeState({ pioche })
    render(<ZoneCentrale state={state} dernierPliVainqueur={null} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})

describe('ZoneCentrale — atout', () => {
  it('affiche le symbole de l\'atout quand il est défini', () => {
    const state = makeState({ couleurAtout: 'hearts' })
    render(<ZoneCentrale state={state} dernierPliVainqueur={null} />)
    expect(screen.getByText('♥')).toBeInTheDocument()
    expect(screen.queryByText('Atout ?')).not.toBeInTheDocument()
  })

  it('affiche "Atout ?" tant qu\'aucun atout n\'est défini', () => {
    const state = makeState({ couleurAtout: null })
    render(<ZoneCentrale state={state} dernierPliVainqueur={null} />)
    expect(screen.getByText('Atout ?')).toBeInTheDocument()
  })
})

describe('ZoneCentrale — cartes du pli en cours', () => {
  it('affiche un emplacement vide pour un joueur qui n\'a pas encore joué', () => {
    const state = avecCartesDuPli(makeState({}), { carteJoueur0: null, carteJoueur1: null })
    const { container } = render(<ZoneCentrale state={state} dernierPliVainqueur={null} />)
    expect(container.querySelectorAll('.border-dashed').length).toBeGreaterThanOrEqual(1)
  })

  it('affiche la carte jouée par le joueur humain (label "Vous")', () => {
    const carteJouee = { ...c('diamonds', 'A'), faceUp: true }
    const state = avecCartesDuPli(makeState({}), { carteJoueur0: carteJouee, carteJoueur1: null })
    render(<ZoneCentrale state={state} dernierPliVainqueur={null} />)
    expect(screen.getByLabelText('As de ♦ Carreau')).toBeInTheDocument()
  })

  it('met en évidence le vainqueur du dernier pli', () => {
    const state = makeState({})
    render(<ZoneCentrale state={state} dernierPliVainqueur={0} />)
    const label = screen.getByText((content, el) => el?.textContent === '★ Vous')
    expect(label.className).toMatch(/text-amber-400/)
  })

  it('n\'ajoute aucune mise en évidence si aucun pli n\'est encore résolu', () => {
    const state = makeState({})
    render(<ZoneCentrale state={state} dernierPliVainqueur={null} />)
    expect(screen.queryByText((content, el) => el?.textContent === '★ Vous')).not.toBeInTheDocument()
    expect(screen.queryByText((content, el) => el?.textContent === '★ IA')).not.toBeInTheDocument()
  })
})
