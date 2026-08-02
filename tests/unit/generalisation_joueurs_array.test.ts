// ============================================================
// TESTS UNITAIRES — GÉNÉRALISATION GameState.joueurs (Phase 1 — Étape 2)
//
// Objectif : verrouiller dans le temps le fait que GameState.joueurs
// est un tableau générique (Joueur[]) et non plus un tuple figé à
// exactement 2 éléments ([Joueur, Joueur]).
//
// Ce test est structurel : il ne fait PAS jouer de partie à 3 ou 4
// joueurs (le reste du moteur — plis, combinaisons, IA — ne le
// prend pas encore en charge, cf. étapes suivantes de la Phase 1).
// Il vérifie uniquement que la structure de données elle-même
// n'empêche plus, au niveau du type, de contenir plus de 2 joueurs.
// ============================================================

import { describe, it, expect } from 'vitest'
import type { GameState, Joueur } from '../../src/types'

function creerJoueurMinimal(id: 0 | 1 | 2 | 3, nom: string): Joueur {
  return {
    id,
    nom,
    type: 'humain',
    main: [],
    cartesEtalees: [],
    pileRemportee: [],
    marquePoints: 0,
    brisques: 0,
  }
}

describe('GameState.joueurs — généralisation en tableau (étape 2)', () => {
  it('accepte toujours exactement 2 joueurs (comportement actuel inchangé)', () => {
    const joueurs: GameState['joueurs'] = [
      creerJoueurMinimal(0, 'Joueur'),
      creerJoueurMinimal(1, 'IA'),
    ]
    expect(joueurs).toHaveLength(2)
  })

  it("n'est plus figé à un tuple de 2 éléments : accepte structurellement 3 joueurs", () => {
    const joueurs: GameState['joueurs'] = [
      creerJoueurMinimal(0, 'Joueur A'),
      creerJoueurMinimal(1, 'Joueur B'),
      creerJoueurMinimal(2, 'Joueur C'),
    ]
    expect(joueurs).toHaveLength(3)
  })

  it('accepte structurellement 4 joueurs', () => {
    const joueurs: GameState['joueurs'] = [
      creerJoueurMinimal(0, 'A'),
      creerJoueurMinimal(1, 'B'),
      creerJoueurMinimal(2, 'C'),
      creerJoueurMinimal(3, 'D'),
    ]
    expect(joueurs).toHaveLength(4)
  })
})
