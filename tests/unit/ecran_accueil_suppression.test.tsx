// ============================================================
// TESTS — Suppression des sauvegardes depuis l'écran d'accueil
// Vérifie :
//   1. Le bouton 🗑 apparaît uniquement si une sauvegarde existe
//   2. Un clic affiche la confirmation inline
//   3. "Annuler" masque la confirmation sans rien supprimer
//   4. "Oui, supprimer" supprime la sauvegarde et masque le bouton
//   5. L'historique a aussi sa confirmation avant effacement
//   6. Non-régression : "Reprendre la partie" fonctionne toujours
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { EcranAccueil } from '../../src/screens/EcranAccueil'

// ── Mock persistence ──────────────────────────────────────────

vi.mock('../../src/utils/persistence', () => ({
  sauvegardeExiste:   vi.fn(),
  horodatage:         vi.fn(),
  chargerHistorique:  vi.fn(),
  effacerHistorique:  vi.fn(),
  supprimerSauvegarde: vi.fn(),
}))

import * as persistence from '../../src/utils/persistence'

const mockProps = {
  onNouvellePartie:  vi.fn(),
  onReprendrePartie: vi.fn(),
  onRegles:          vi.fn(),
  onTutoriel:        vi.fn(),
}

function renderAccueil() {
  return render(<EcranAccueil {...mockProps} />)
}

// ============================================================
// 1. AFFICHAGE DU BOUTON SUPPRESSION
// ============================================================

describe('Bouton suppression — affichage conditionnel', () => {

  beforeEach(() => {
    vi.mocked(persistence.chargerHistorique).mockReturnValue([])
  })
  afterEach(() => vi.clearAllMocks())

  it('bouton 🗑 visible si une sauvegarde existe', () => {
    vi.mocked(persistence.sauvegardeExiste).mockReturnValue(true)
    vi.mocked(persistence.horodatage).mockReturnValue('01/01/2025 10:00')
    renderAccueil()
    expect(screen.getByTitle('Supprimer la sauvegarde')).toBeInTheDocument()
  })

  it('bouton 🗑 absent si aucune sauvegarde', () => {
    vi.mocked(persistence.sauvegardeExiste).mockReturnValue(false)
    vi.mocked(persistence.horodatage).mockReturnValue(null)
    renderAccueil()
    expect(screen.queryByTitle('Supprimer la sauvegarde')).not.toBeInTheDocument()
  })
})

// ============================================================
// 2. CONFIRMATION INLINE — SUPPRESSION SAUVEGARDE
// ============================================================

describe('Confirmation inline — suppression sauvegarde', () => {

  beforeEach(() => {
    vi.mocked(persistence.sauvegardeExiste).mockReturnValue(true)
    vi.mocked(persistence.horodatage).mockReturnValue('01/01/2025 10:00')
    vi.mocked(persistence.chargerHistorique).mockReturnValue([])
  })
  afterEach(() => vi.clearAllMocks())

  it('la confirmation est cachée par défaut', () => {
    renderAccueil()
    expect(screen.queryByText('Supprimer cette sauvegarde ?')).not.toBeInTheDocument()
  })

  it('un clic sur 🗑 affiche la confirmation', () => {
    renderAccueil()
    fireEvent.click(screen.getByTitle('Supprimer la sauvegarde'))
    expect(screen.getByText('Supprimer cette sauvegarde ?')).toBeInTheDocument()
    expect(screen.getByText('Oui, supprimer')).toBeInTheDocument()
    expect(screen.getByText('Annuler')).toBeInTheDocument()
  })

  it('"Annuler" masque la confirmation sans supprimer', () => {
    renderAccueil()
    fireEvent.click(screen.getByTitle('Supprimer la sauvegarde'))
    fireEvent.click(screen.getByText('Annuler'))
    expect(screen.queryByText('Supprimer cette sauvegarde ?')).not.toBeInTheDocument()
    expect(persistence.supprimerSauvegarde).not.toHaveBeenCalled()
  })

  it('"Oui, supprimer" appelle supprimerSauvegarde()', () => {
    renderAccueil()
    fireEvent.click(screen.getByTitle('Supprimer la sauvegarde'))
    fireEvent.click(screen.getByText('Oui, supprimer'))
    expect(persistence.supprimerSauvegarde).toHaveBeenCalledOnce()
  })

  it('après suppression, le bouton "Reprendre" disparaît', () => {
    renderAccueil()
    expect(screen.getByText('Reprendre la partie')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Supprimer la sauvegarde'))
    fireEvent.click(screen.getByText('Oui, supprimer'))
    expect(screen.queryByText('Reprendre la partie')).not.toBeInTheDocument()
  })

  it('après suppression, le bouton 🗑 disparaît aussi', () => {
    renderAccueil()
    fireEvent.click(screen.getByTitle('Supprimer la sauvegarde'))
    fireEvent.click(screen.getByText('Oui, supprimer'))
    expect(screen.queryByTitle('Supprimer la sauvegarde')).not.toBeInTheDocument()
  })

  it('après suppression, la confirmation disparaît', () => {
    renderAccueil()
    fireEvent.click(screen.getByTitle('Supprimer la sauvegarde'))
    fireEvent.click(screen.getByText('Oui, supprimer'))
    expect(screen.queryByText('Supprimer cette sauvegarde ?')).not.toBeInTheDocument()
  })

  it('un 2e clic sur 🗑 ferme la confirmation (toggle)', () => {
    renderAccueil()
    const btn = screen.getByTitle('Supprimer la sauvegarde')
    fireEvent.click(btn)
    expect(screen.getByText('Supprimer cette sauvegarde ?')).toBeInTheDocument()
    fireEvent.click(btn)
    expect(screen.queryByText('Supprimer cette sauvegarde ?')).not.toBeInTheDocument()
  })
})

// ============================================================
// 3. CONFIRMATION HISTORIQUE — EFFACER TOUT
// ============================================================

describe('Confirmation historique — effacer tout', () => {

  const histoMock = [{
    partieId: 'p1', date: Date.now(), vainqueur: 'Joueur',
    scoreJ0: 1000, scoreJ1: 400, nomJ0: 'Joueur', nomJ1: 'IA',
    nbBrisquesJ0: 12, nbBrisquesJ1: 8, charlesBezigue: false, mancheNumero: 1,
  }]

  beforeEach(() => {
    vi.mocked(persistence.sauvegardeExiste).mockReturnValue(false)
    vi.mocked(persistence.horodatage).mockReturnValue(null)
    vi.mocked(persistence.chargerHistorique).mockReturnValue(histoMock)
  })
  afterEach(() => vi.clearAllMocks())

  it('le bouton "Effacer tout" est visible quand l\'historique est ouvert', () => {
    renderAccueil()
    // Ouvrir l'historique
    fireEvent.click(screen.getByText(/Historique/))
    expect(screen.getByText('Effacer tout')).toBeInTheDocument()
  })

  it('"Effacer tout" demande confirmation avant d\'effacer', () => {
    renderAccueil()
    fireEvent.click(screen.getByText(/Historique/))
    fireEvent.click(screen.getByText('Effacer tout'))
    expect(screen.getByText('Confirmer ?')).toBeInTheDocument()
    expect(persistence.effacerHistorique).not.toHaveBeenCalled()
  })

  it('"Non" annule sans effacer', () => {
    renderAccueil()
    fireEvent.click(screen.getByText(/Historique/))
    fireEvent.click(screen.getByText('Effacer tout'))
    fireEvent.click(screen.getByText('Non'))
    expect(screen.queryByText('Confirmer ?')).not.toBeInTheDocument()
    expect(persistence.effacerHistorique).not.toHaveBeenCalled()
  })

  it('"Oui" efface l\'historique', () => {
    renderAccueil()
    fireEvent.click(screen.getByText(/Historique/))
    fireEvent.click(screen.getByText('Effacer tout'))
    fireEvent.click(screen.getByText('Oui'))
    expect(persistence.effacerHistorique).toHaveBeenCalledOnce()
  })
})

// ============================================================
// 4. NON-RÉGRESSION
// ============================================================

describe('Non-régression — fonctionnalités existantes', () => {

  afterEach(() => vi.clearAllMocks())

  it('"Reprendre la partie" appelle onReprendrePartie', () => {
    vi.mocked(persistence.sauvegardeExiste).mockReturnValue(true)
    vi.mocked(persistence.horodatage).mockReturnValue('01/01/2025')
    vi.mocked(persistence.chargerHistorique).mockReturnValue([])
    renderAccueil()
    fireEvent.click(screen.getByText('Reprendre la partie'))
    expect(mockProps.onReprendrePartie).toHaveBeenCalledOnce()
  })

  it('"Nouvelle partie" appelle onNouvellePartie', () => {
    vi.mocked(persistence.sauvegardeExiste).mockReturnValue(false)
    vi.mocked(persistence.horodatage).mockReturnValue(null)
    vi.mocked(persistence.chargerHistorique).mockReturnValue([])
    renderAccueil()
    fireEvent.click(screen.getByText('Nouvelle partie'))
    expect(mockProps.onNouvellePartie).toHaveBeenCalledOnce()
  })

  it('supprimerSauvegarde n\'est jamais appelé sans confirmation', () => {
    vi.mocked(persistence.sauvegardeExiste).mockReturnValue(true)
    vi.mocked(persistence.horodatage).mockReturnValue('01/01/2025')
    vi.mocked(persistence.chargerHistorique).mockReturnValue([])
    renderAccueil()
    // Ouvrir la confirmation mais annuler
    fireEvent.click(screen.getByTitle('Supprimer la sauvegarde'))
    fireEvent.click(screen.getByText('Annuler'))
    expect(persistence.supprimerSauvegarde).not.toHaveBeenCalled()
  })

  it('effacerHistorique n\'est jamais appelé sans confirmation', () => {
    vi.mocked(persistence.sauvegardeExiste).mockReturnValue(false)
    vi.mocked(persistence.horodatage).mockReturnValue(null)
    vi.mocked(persistence.chargerHistorique).mockReturnValue([{
      partieId: 'p1', date: Date.now(), vainqueur: 'J',
      scoreJ0: 100, scoreJ1: 50, nomJ0: 'J', nomJ1: 'IA',
      nbBrisquesJ0: 5, nbBrisquesJ1: 3, charlesBezigue: false, mancheNumero: 1,
    }])
    renderAccueil()
    fireEvent.click(screen.getByText(/Historique/))
    fireEvent.click(screen.getByText('Effacer tout'))
    fireEvent.click(screen.getByText('Non'))
    expect(persistence.effacerHistorique).not.toHaveBeenCalled()
  })
})
