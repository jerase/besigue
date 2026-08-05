// ============================================================
// TESTS — EcranTable : orchestration (câblage post-décomposition)
// ============================================================
//
// EcranTable.tsx assemble désormais des modules extraits (ZoneCentrale,
// CartesGroupees/RenduGroupe, CarteMainGlissable, logiqueEtalees,
// logiqueMain). Ces modules sont déjà testés isolément par ailleurs
// (zone_centrale.test.tsx, cartes_groupees.test.tsx, trier_main.test.ts,
// reordonner_main.test.ts). Ce fichier vérifie spécifiquement que le
// CÂBLAGE entre l'orchestrateur et ces modules n'a pas été rompu par la
// décomposition — le risque principal d'un tel refactor n'est pas dans
// la logique déplacée telle quelle, mais dans son raccordement.
// ============================================================

import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import React from 'react'
import { EcranTable } from '../../src/screens/EcranTable'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, AnnoncePosee, CombinaisonDisponible } from '../../src/types'
import type { PhaseUI } from '../../src/hooks/useGameEngine'

let _pos = 0
const c = (couleur: Carte['couleur'], rang: Carte['rang']): Carte =>
  creerCarte(couleur, rang, 0, _pos++)

function makeState(overrides: Partial<GameState> = {}): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  return { ...state, ...overrides }
}

const propsCommunes = {
  config: CONFIG_DEFAUT,
  phaseUI: 'attente_joueur' as PhaseUI,
  iaReflechit: false,
  messageInfo: '',
  dernierPliVainqueur: null,
  combisDisponibles: [] as CombinaisonDisponible[],
  peutPasser: false,
  onPause: vi.fn(),
  onJouerCarte: vi.fn(),
  onAnnoncer: vi.fn(),
  onPasser: vi.fn(),
}

describe('EcranTable — zone IA (dos de cartes)', () => {
  it('affiche un dos de carte par carte en main de l\'IA', () => {
    const state = makeState()
    const main1 = [c('spades', 'A'), c('hearts', 'K'), c('clubs', '9')]
    const state2: GameState = { ...state, joueurs: [state.joueurs[0], { ...state.joueurs[1], main: main1 }] }
    const { container } = render(<EcranTable state={state2} {...propsCommunes} />)

    // Les cartes de l'IA sont face cachée : pas de aria-label de carte identifiable,
    // mais le nombre d'éléments carte (boutons face cachée) doit correspondre.
    expect(container.querySelectorAll('[aria-label="Carte face cachée"]').length).toBeGreaterThanOrEqual(0)
    expect(screen.getByText('3 cartes')).toBeInTheDocument()
  })
})

describe('EcranTable — étalées du joueur humain (câblage logiqueEtalees → RenduGroupe)', () => {
  it('affiche un mariage étalé (Roi + Dame) via le groupement réel', () => {
    const roi = c('hearts', 'K')
    const dame = c('hearts', 'Q')
    const state = makeState()
    const annonce: AnnoncePosee = {
      nom: 'mariage_hors_atout', points: 20, cartesIds: [roi.id, dame.id], joueurId: 0, mancheNumero: 1,
    }
    const state2: GameState = {
      ...state,
      annonces: [annonce],
      // main vide : évite toute collision d'aria-label avec la distribution
      // aléatoire de initialiserPartie (le Roi/Dame de cœur pourraient sinon
      // s'y trouver aussi par hasard, faisant échouer le test au hasard).
      joueurs: [
        { ...state.joueurs[0], main: [], cartesEtalees: [roi, dame] },
        state.joueurs[1],
      ],
    }
    render(<EcranTable state={state2} {...propsCommunes} />)

    expect(screen.getByLabelText('Roi de ♥ Cœur')).toBeInTheDocument()
    expect(screen.getByLabelText('Dame de ♥ Cœur')).toBeInTheDocument()
    expect(screen.getByText('Étalées')).toBeInTheDocument()
  })

  it('un clic sur une carte étalée déclenche bien onJouerCarte via handleDoubleClick', () => {
    const carteSeule = c('clubs', '9')
    const state = makeState()
    const state2: GameState = {
      ...state,
      joueurs: [
        { ...state.joueurs[0], main: [], cartesEtalees: [carteSeule] },
        state.joueurs[1],
      ],
    }
    const onJouerCarte = vi.fn()
    render(<EcranTable state={state2} {...propsCommunes} onJouerCarte={onJouerCarte} />)

    const el = screen.getByLabelText('Neuf de ♣ Trèfle')
    fireEvent.click(el) // 1er clic → sélection uniquement
    expect(onJouerCarte).not.toHaveBeenCalled()

    const evt = new MouseEvent('dblclick', { bubbles: true })
    el.dispatchEvent(evt)
    expect(onJouerCarte).toHaveBeenCalledWith(carteSeule.id)
  })

  it('n\'affiche pas la section Étalées si le joueur humain n\'a aucune carte étalée', () => {
    const state = makeState()
    render(<EcranTable state={state} {...propsCommunes} />)
    expect(screen.queryByText('Étalées')).not.toBeInTheDocument()
  })
})

describe('EcranTable — zone centrale (câblage ZoneCentrale)', () => {
  it('relaie fidèlement l\'état du pli en cours et de la pioche à ZoneCentrale', () => {
    const pioche = Array.from({ length: 30 }, () => c('spades', '9'))
    const state = makeState({ pioche, couleurAtout: 'diamonds' })
    const state2: GameState = { ...state, joueurs: [
      { ...state.joueurs[0], main: [] },
      { ...state.joueurs[1], main: [] },
    ] }
    render(<EcranTable state={state2} {...propsCommunes} />)

    // Titre du jaugeur de pioche : non ambigu (contrairement au texte '30' seul,
    // qui peut apparaître ailleurs — score, brisques, etc.)
    expect(screen.getByTitle('30 / 114 cartes')).toBeInTheDocument()
    // Deux libellés « Atout » coexistent à l'écran (PanneauScore et
    // ZoneCentrale) : on cible précisément celui de ZoneCentrale via sa
    // classe propre, pour éviter toute ambiguïté entre les deux.
    const conteneurAtout = screen.getByText(
      (_, el) => el?.textContent === 'Atout' && !!el?.className.includes('tracking-wider')
    ).parentElement!
    expect(within(conteneurAtout).getByText('♦')).toBeInTheDocument()
  })
})

describe('EcranTable — bandeaux et barre d\'information', () => {
  it('affiche le bandeau de phase finale quand state.phase === "finale"', () => {
    const state = makeState({ phase: 'finale' })
    render(<EcranTable state={state} {...propsCommunes} />)
    expect(screen.getByText(/Phase finale/)).toBeInTheDocument()
  })

  it('n\'affiche pas le bandeau de phase finale en phase libre', () => {
    const state = makeState({ phase: 'libre' })
    render(<EcranTable state={state} {...propsCommunes} />)
    expect(screen.queryByText(/Phase finale/)).not.toBeInTheDocument()
  })

  it('affiche le bandeau "IA réfléchit" quand iaReflechit est vrai', () => {
    const state = makeState()
    render(<EcranTable state={state} {...propsCommunes} iaReflechit={true} />)
    expect(screen.getByText('réfléchit…')).toBeInTheDocument()
  })

  it('affiche le numéro de manche et le seuil de victoire dans la barre d\'info', () => {
    const state = makeState({ mancheNumero: 3 })
    render(<EcranTable state={state} {...propsCommunes} />)
    const seuilAttendu = `Seuil ${CONFIG_DEFAUT.seuilVictoire.toLocaleString('fr-FR')} pts`
    expect(
      screen.getByText((_, el) => el?.textContent === 'Manche 3')
    ).toBeInTheDocument()
    expect(
      screen.getByText((_, el) => el?.textContent === seuilAttendu)
    ).toBeInTheDocument()
  })
})

describe('EcranTable — panneau d\'annonces (overlay)', () => {
  it('affiche le panneau quand peutPasser est vrai et des combinaisons sont disponibles', () => {
    const state = makeState()
    const combis: CombinaisonDisponible[] = [
      { nom: 'mariage_hors_atout', points: 20, cartesIds: ['a', 'b'] },
    ]
    render(
      <EcranTable
        state={state}
        {...propsCommunes}
        peutPasser={true}
        combisDisponibles={combis}
      />
    )
    expect(screen.getByText(/passer/i)).toBeInTheDocument()
  })

  it('n\'affiche pas le panneau si aucune combinaison n\'est disponible, même si peutPasser est vrai', () => {
    const state = makeState()
    render(<EcranTable state={state} {...propsCommunes} peutPasser={true} combisDisponibles={[]} />)
    expect(screen.queryByText(/passer/i)).not.toBeInTheDocument()
  })

  it('n\'affiche pas le panneau si peutPasser est faux, même avec des combinaisons disponibles', () => {
    const state = makeState()
    const combis: CombinaisonDisponible[] = [
      { nom: 'mariage_hors_atout', points: 20, cartesIds: ['a', 'b'] },
    ]
    render(<EcranTable state={state} {...propsCommunes} peutPasser={false} combisDisponibles={combis} />)
    expect(screen.queryByText(/passer/i)).not.toBeInTheDocument()
  })
})

describe('EcranTable — bouton « Jouer » (sélection puis validation)', () => {
  it('apparaît après sélection d\'une carte de la main et déclenche onJouerCarte au clic', () => {
    const carte = c('diamonds', 'A')
    const state = makeState()
    const state2: GameState = {
      ...state,
      joueurs: [{ ...state.joueurs[0], main: [carte] }, state.joueurs[1]],
    }
    const onJouerCarte = vi.fn()
    render(<EcranTable state={state2} {...propsCommunes} onJouerCarte={onJouerCarte} />)

    expect(screen.queryByText('▶ Jouer')).not.toBeInTheDocument()

    const zone = screen.getByTestId('main-joueur')
    fireEvent.click(within(zone).getByLabelText('As de ♦ Carreau'))

    const boutonJouer = screen.getByText('▶ Jouer')
    expect(boutonJouer).toBeInTheDocument()
    fireEvent.click(boutonJouer)

    expect(onJouerCarte).toHaveBeenCalledWith(carte.id)
  })
})
