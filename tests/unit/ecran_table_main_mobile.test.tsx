// ============================================================
// TESTS — EcranTable : affichage de la main humaine et tri (Point F)
// ============================================================
//
// Vérifie que :
//   - la main du joueur humain revient toujours à la ligne (flex-wrap),
//     sur mobile comme sur desktop — à l'identique de l'affichage des
//     dos de carte de l'IA, jamais en ligne unique défilante ;
//   - le bouton « Trier ma main » est bien un bouton visuellement jaune
//     (fond ambre), et réordonne réellement les cartes affichées
//     (couleur puis rang) ;
//   - la main reste jouable (le clic sur une carte reste câblé) quel
//     que soit le mode d'affichage.
//
// Le Point C (armement du drag par appui long sur mobile) est couvert
// séparément et en profondeur par tests/unit/use_long_press.test.ts : la
// mécanique de temporisation ne dépend pas du rendu de EcranTable, et
// framer-motion ne simule pas de vraie physique de glissé en jsdom.
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import React from 'react'
import { EcranTable } from '../../src/screens/EcranTable'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte } from '../../src/types'
import type { PhaseUI } from '../../src/hooks/useGameEngine'

// ── Contrôle de useEcranMobile via un mock de window.matchMedia ──

function installerMatchMedia(estMobile: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: estMobile,
    media: '',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }) as unknown as typeof window.matchMedia
}

afterEach(() => {
  vi.unstubAllGlobals()
  // @ts-expect-error - nettoyage volontaire entre les tests
  delete window.matchMedia
})

// ── État de jeu déterministe pour les assertions d'ordre ──

let _pos = 0
const c = (couleur: Carte['couleur'], rang: Carte['rang']): Carte =>
  creerCarte(couleur, rang, 0, _pos++)

function makeState(main: Carte[]): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  return {
    ...state,
    joueurs: [
      { ...state.joueurs[0], main },
      state.joueurs[1],
    ],
  }
}

const propsCommunes = {
  config: CONFIG_DEFAUT,
  phaseUI: 'attente_joueur' as PhaseUI,
  iaReflechit: false,
  messageInfo: '',
  dernierPliVainqueur: null,
  combisDisponibles: [],
  peutPasser: false,
  onPause: vi.fn(),
  onJouerCarte: vi.fn(),
  onAnnoncer: vi.fn(),
  onPasser: vi.fn(),
}

describe('EcranTable — la main humaine revient toujours à la ligne (comme l\'IA)', () => {
  it('retour à la ligne (flex-wrap) en mode mobile, jamais de ligne unique défilante', () => {
    installerMatchMedia(true)
    const state = makeState([c('spades', 'A'), c('hearts', 'K'), c('clubs', '9')])
    render(<EcranTable state={state} {...propsCommunes} />)

    const zone = screen.getByTestId('main-joueur')
    expect(zone.className).toContain('flex-wrap')
    expect(zone.className).not.toContain('overflow-x-auto')
    expect(zone.className).not.toContain('flex-nowrap')
  })

  it('retour à la ligne (flex-wrap) en mode desktop également', () => {
    installerMatchMedia(false)
    const state = makeState([c('spades', 'A'), c('hearts', 'K'), c('clubs', '9')])
    render(<EcranTable state={state} {...propsCommunes} />)

    const zone = screen.getByTestId('main-joueur')
    expect(zone.className).toContain('flex-wrap')
    expect(zone.className).not.toContain('overflow-x-auto')
    expect(zone.className).not.toContain('flex-nowrap')
  })

  it('la main humaine utilise le même mode de mise en page (flex-wrap) que la main de l\'IA', () => {
    installerMatchMedia(true)
    const state = makeState([c('spades', 'A'), c('hearts', 'K')])
    const { container } = render(<EcranTable state={state} {...propsCommunes} />)

    const zoneHumain = screen.getByTestId('main-joueur')
    // La zone des dos de carte IA est le seul autre conteneur flex-wrap
    // avec min-h défini dans l'écran (cf. rendu IA, gap-1.5 min-h-[62px])
    const zoneIA = container.querySelector('.flex.flex-wrap.gap-1\\.5.min-h-\\[62px\\]')

    expect(zoneHumain.className).toMatch(/flex-wrap/)
    expect(zoneIA).not.toBeNull()
    expect(zoneIA!.className).toMatch(/flex-wrap/)
  })

  it('la main reste jouable (clic sur une carte câblé) en mode mobile comme en mode desktop', () => {
    for (const mobile of [true, false]) {
      installerMatchMedia(mobile)
      const onJouerCarte = vi.fn()
      const state = makeState([c('spades', 'A')])
      const { unmount } = render(
        <EcranTable state={state} {...propsCommunes} onJouerCarte={onJouerCarte} />
      )
      const zone = screen.getByTestId('main-joueur')
      const carte = within(zone).getByLabelText('As de ♠ Pique')
      fireEvent.doubleClick(carte)
      expect(onJouerCarte).toHaveBeenCalledTimes(1)
      unmount()
    }
  })
})

describe('EcranTable — bouton « Trier ma main » (Point F)', () => {
  it('est affiché comme un bouton jaune (fond ambre)', () => {
    installerMatchMedia(false)
    const state = makeState([c('spades', 'A'), c('hearts', 'K')])
    render(<EcranTable state={state} {...propsCommunes} />)

    const bouton = screen.getByRole('button', { name: 'Trier ma main' })
    expect(bouton.tagName).toBe('BUTTON')
    expect(bouton.className).toMatch(/bg-amber-400/)
  })

  it('réordonne les cartes affichées par couleur puis par rang au clic', () => {
    installerMatchMedia(false)
    // Ordre initial volontairement désordonné
    const state = makeState([c('hearts', '7'), c('spades', 'Q'), c('hearts', 'A'), c('spades', '10')])
    render(<EcranTable state={state} {...propsCommunes} />)

    const zone = screen.getByTestId('main-joueur')
    fireEvent.click(screen.getByRole('button', { name: 'Trier ma main' }))

    const labels = within(zone)
      .getAllByRole('button')
      .map(el => el.getAttribute('aria-label'))
      .filter(Boolean)

    // spades (10 avant Q, hiérarchie bésigue) puis hearts (A avant 7)
    expect(labels).toEqual([
      'Dix de ♠ Pique',
      'Dame de ♠ Pique',
      'As de ♥ Cœur',
      'Sept de ♥ Cœur',
    ])
  })

  it('fonctionne aussi en mode mobile', () => {
    installerMatchMedia(true)
    const state = makeState([c('hearts', '9'), c('spades', 'A')])
    render(<EcranTable state={state} {...propsCommunes} />)

    const zone = screen.getByTestId('main-joueur')
    fireEvent.click(screen.getByRole('button', { name: 'Trier ma main' }))

    const labels = within(zone)
      .getAllByRole('button')
      .map(el => el.getAttribute('aria-label'))
      .filter(Boolean)

    expect(labels).toEqual(['As de ♠ Pique', 'Neuf de ♥ Cœur'])
  })
})
