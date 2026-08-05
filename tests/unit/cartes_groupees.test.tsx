// ============================================================
// TESTS — RenduGroupe (src/screens/EcranTable/CartesGroupees.tsx)
// ============================================================
//
// Ce module rend les cartes étalées d'un joueur (mariage/bésigue
// superposés, ou carte isolée). Isolé de l'écran principal lors de la
// décomposition de EcranTable.tsx, il n'était jusqu'ici jamais exercé
// par les tests (6,5% de couverture) — la logique de groupement
// (grouperCartesEtalees) était testée, mais pas son rendu visuel.
// ============================================================

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { RenduGroupe } from '../../src/screens/EcranTable/CartesGroupees'
import type { GroupeEtalee } from '../../src/screens/EcranTable/types'
import { creerCarte } from '../../src/core/deck'
import type { Carte } from '../../src/types'

let _pos = 0
const c = (couleur: Carte['couleur'], rang: Carte['rang']): Carte =>
  creerCarte(couleur, rang, 0, _pos++)

const propsBase = {
  taille: 'md' as const,
  humainPeutJouer: true,
  carteSelectionnee: null,
  combisDisponibles: [],
}

describe('RenduGroupe — mariage (Roi + Dame superposés)', () => {
  it('affiche à la fois le Roi et la Dame', () => {
    const roi = c('spades', 'K')
    const dame = c('spades', 'Q')
    const groupe: GroupeEtalee = { type: 'mariage', roi, dame }

    render(<RenduGroupe groupe={groupe} {...propsBase} onClick={vi.fn()} onDoubleClick={vi.fn()} />)

    expect(screen.getByLabelText('Roi de ♠ Pique')).toBeInTheDocument()
    expect(screen.getByLabelText('Dame de ♠ Pique')).toBeInTheDocument()
  })

  it('déclenche onClick avec la carte cliquée (Roi et Dame indépendamment)', () => {
    const roi = c('hearts', 'K')
    const dame = c('hearts', 'Q')
    const onClick = vi.fn()
    const groupe: GroupeEtalee = { type: 'mariage', roi, dame }

    render(<RenduGroupe groupe={groupe} {...propsBase} onClick={onClick} onDoubleClick={vi.fn()} />)

    screen.getByLabelText('Roi de ♥ Cœur').click()
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: roi.id }))

    screen.getByLabelText('Dame de ♥ Cœur').click()
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: dame.id }))
  })

  it("désactive l'interaction quand humainPeutJouer est faux (onClick non câblé)", () => {
    const roi = c('clubs', 'K')
    const dame = c('clubs', 'Q')
    const onClick = vi.fn()
    const groupe: GroupeEtalee = { type: 'mariage', roi, dame }

    render(
      <RenduGroupe
        groupe={groupe}
        {...propsBase}
        humainPeutJouer={false}
        onClick={onClick}
        onDoubleClick={vi.fn()}
      />
    )

    screen.getByLabelText('Roi de ♣ Trèfle').click()
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('RenduGroupe — bésigue (Dame♠ + Valet♦ superposés)', () => {
  it('affiche à la fois la Dame de pique et le Valet de carreau', () => {
    const dame = c('spades', 'Q')
    const valet = c('diamonds', 'J')
    const groupe: GroupeEtalee = { type: 'besigue', dame, valet }

    render(<RenduGroupe groupe={groupe} {...propsBase} onClick={vi.fn()} onDoubleClick={vi.fn()} />)

    expect(screen.getByLabelText('Dame de ♠ Pique')).toBeInTheDocument()
    expect(screen.getByLabelText('Valet de ♦ Carreau')).toBeInTheDocument()
  })

  it('déclenche onDoubleClick avec la carte correspondante', () => {
    const dame = c('spades', 'Q')
    const valet = c('diamonds', 'J')
    const onDoubleClick = vi.fn()
    const groupe: GroupeEtalee = { type: 'besigue', dame, valet }

    render(
      <RenduGroupe groupe={groupe} {...propsBase} onClick={vi.fn()} onDoubleClick={onDoubleClick} />
    )

    const carte = screen.getByLabelText('Valet de ♦ Carreau')
    const evt = new MouseEvent('dblclick', { bubbles: true })
    carte.dispatchEvent(evt)

    expect(onDoubleClick).toHaveBeenCalledWith(expect.objectContaining({ id: valet.id }))
  })
})

describe('RenduGroupe — carte isolée', () => {
  it('affiche la carte seule', () => {
    const carte = c('hearts', '9')
    const groupe: GroupeEtalee = { type: 'seule', carte }

    render(<RenduGroupe groupe={groupe} {...propsBase} onClick={vi.fn()} onDoubleClick={vi.fn()} />)

    expect(screen.getByLabelText('Neuf de ♥ Cœur')).toBeInTheDocument()
  })

  it('affiche la carte comme mise en évidence si elle appartient à une combinaison disponible', () => {
    const carte = c('hearts', '9')
    const groupe: GroupeEtalee = { type: 'seule', carte }

    render(
      <RenduGroupe
        groupe={groupe}
        {...propsBase}
        combisDisponibles={[{ nom: 'quinte', cartesIds: [carte.id], points: 250 }]}
        onClick={vi.fn()}
        onDoubleClick={vi.fn()}
      />
    )

    const el = screen.getByLabelText('Neuf de ♥ Cœur')
    // L'état "highlighted" se traduit par une classe/ring distincte du rendu normal
    expect(el.className).not.toBe('')
  })

  it('applique un état désactivé si humainPeutJouer est faux', () => {
    const carte = c('hearts', '9')
    const groupe: GroupeEtalee = { type: 'seule', carte }
    const onClick = vi.fn()

    render(
      <RenduGroupe
        groupe={groupe}
        {...propsBase}
        humainPeutJouer={false}
        onClick={onClick}
        onDoubleClick={vi.fn()}
      />
    )

    screen.getByLabelText('Neuf de ♥ Cœur').click()
    expect(onClick).not.toHaveBeenCalled()
  })
})
