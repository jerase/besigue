// ============================================================
// TESTS — Évolution : préférer jouer la carte déjà étalée plutôt
// que sa semblable en main (niveaux Intermédiaire et Difficile).
//
// Exception : mariage d'atout encore actif (state.mariagesAtoutActifs)
// → jouer la main, préserver l'étalée intacte (sinon cassure, perte
// d'éligibilité à la quinte).
// ============================================================

import { describe, it, expect } from 'vitest'
import { preferEtaleeSiPossible, choisirCarteIA } from '../../src/core/ia'
import { initialiserPartie } from '../../src/core/init'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { creerCarte, creerJoker } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

function baseState(
  couleurAtout: Couleur | null,
  mainIA: Carte[],
  etaleesIA: Carte[],
  mariagesAtoutActifsIA: [string, string][] = []
): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({ ...state, couleurAtout })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [], pileRemportee: [] }
  joueurs[1] = { ...joueurs[1], main: mainIA, cartesEtalees: etaleesIA, pileRemportee: [] }
  return {
    ...base,
    joueurs,
    pioche: Array.from({ length: 16 }, () => c('clubs', '7', 0)),
    pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 0, cartes: [null, null] },
    mariagesAtoutActifs: [[], mariagesAtoutActifsIA],
  }
}

describe('preferEtaleeSiPossible — fonction pure', () => {
  it("Exemple 1 — valet de carreau en main + valet de carreau étalé (+ dame de cœur étalée) → préfère l'étalée", () => {
    const dameCoeurEtalee = c('hearts', 'Q')
    const valetCarreauEtalee = c('diamonds', 'J')
    const valetCarreauMain = c('diamonds', 'J')
    const state = baseState('spades', [valetCarreauMain], [dameCoeurEtalee, valetCarreauEtalee])
    const candidats = [valetCarreauMain, dameCoeurEtalee, valetCarreauEtalee]

    const resultat = preferEtaleeSiPossible(valetCarreauMain, state, candidats)
    expect(resultat.id).toBe(valetCarreauEtalee.id)
  })

  it("Exemple 2 — roi de pique en main + roi de pique étalé (+ valet de cœur étalé) → préfère l'étalé", () => {
    const roiPiqueEtalee = c('spades', 'K')
    const valetCoeurEtalee = c('hearts', 'J')
    const roiPiqueMain = c('spades', 'K')
    // Atout ≠ spades ici pour ne pas déclencher l'exception mariage d'atout
    const state = baseState('clubs', [roiPiqueMain], [roiPiqueEtalee, valetCoeurEtalee])
    const candidats = [roiPiqueMain, roiPiqueEtalee, valetCoeurEtalee]

    const resultat = preferEtaleeSiPossible(roiPiqueMain, state, candidats)
    expect(resultat.id).toBe(roiPiqueEtalee.id)
  })

  it("Exemple 3 — mariage d'atout Pique étalé (Roi+Dame) : jouer la Dame de pique en main protège l'étalée (joue la main)", () => {
    const roiPiqueEtale = c('spades', 'K')
    const damePiqueEtalee = c('spades', 'Q') // mariage d'atout étalé
    const dameCarreauEtalee = c('diamonds', 'Q')
    const valetCoeurEtalee = c('hearts', 'J')
    const damePiqueMain = c('spades', 'Q') // second exemplaire, en main

    const state = baseState(
      'spades', // atout = pique
      [damePiqueMain],
      [roiPiqueEtale, damePiqueEtalee, dameCarreauEtalee, valetCoeurEtalee],
      [[roiPiqueEtale.id, damePiqueEtalee.id]] // mariage d'atout ACTIF
    )
    const candidats = [damePiqueMain, roiPiqueEtale, damePiqueEtalee, dameCarreauEtalee, valetCoeurEtalee]

    const resultat = preferEtaleeSiPossible(damePiqueMain, state, candidats)
    // Doit garder le choix d'origine (la main), PAS rediriger vers l'étalée du mariage
    expect(resultat.id).toBe(damePiqueMain.id)
  })

  it("Exemple 3 (variante Roi) — jouer le Roi de pique en main protège aussi le mariage d'atout étalé", () => {
    const roiPiqueEtale = c('spades', 'K')
    const damePiqueEtalee = c('spades', 'Q')
    const roiPiqueMain = c('spades', 'K')

    const state = baseState(
      'spades',
      [roiPiqueMain],
      [roiPiqueEtale, damePiqueEtalee],
      [[roiPiqueEtale.id, damePiqueEtalee.id]]
    )
    const candidats = [roiPiqueMain, roiPiqueEtale, damePiqueEtalee]

    const resultat = preferEtaleeSiPossible(roiPiqueMain, state, candidats)
    expect(resultat.id).toBe(roiPiqueMain.id)
  })

  it("régression — aucune carte semblable étalée : la carte choisie n'est pas modifiée", () => {
    const roiPiqueMain = c('spades', 'K')
    const dameCoeurEtalee = c('hearts', 'Q')
    const state = baseState('clubs', [roiPiqueMain], [dameCoeurEtalee])
    const candidats = [roiPiqueMain, dameCoeurEtalee]

    const resultat = preferEtaleeSiPossible(roiPiqueMain, state, candidats)
    expect(resultat.id).toBe(roiPiqueMain.id)
  })

  it('régression — la carte choisie est déjà la carte étalée : aucun changement', () => {
    const roiPiqueEtalee = c('spades', 'K')
    const roiPiqueMain = c('spades', 'K')
    const state = baseState('clubs', [roiPiqueMain], [roiPiqueEtalee])
    const candidats = [roiPiqueMain, roiPiqueEtalee]

    const resultat = preferEtaleeSiPossible(roiPiqueEtalee, state, candidats)
    expect(resultat.id).toBe(roiPiqueEtalee.id)
  })

  it('régression — un Joker choisi ne déclenche jamais de substitution', () => {
    const joker = creerJoker('clubs', 0, _pos++)
    const state = baseState('spades', [joker], [])
    const candidats = [joker]

    const resultat = preferEtaleeSiPossible(joker, state, candidats)
    expect(resultat.id).toBe(joker.id)
  })

  it("un mariage HORS-atout étalé n'est PAS protégé par l'exception (elle ne vise que le mariage d'atout)", () => {
    const roiCoeurEtale = c('hearts', 'K')
    const dameCoeurEtalee = c('hearts', 'Q') // mariage hors-atout (atout = spades)
    const roiCoeurMain = c('hearts', 'K')

    const state = baseState('spades', [roiCoeurMain], [roiCoeurEtale, dameCoeurEtalee])
    const candidats = [roiCoeurMain, roiCoeurEtale, dameCoeurEtalee]

    const resultat = preferEtaleeSiPossible(roiCoeurMain, state, candidats)
    // Pas d'exception pour un mariage hors-atout → préfère quand même l'étalée
    expect(resultat.id).toBe(roiCoeurEtale.id)
  })

  it("un Roi/Dame d'atout étalé mais SANS mariage actif enregistré (cassure déjà survenue) n'est plus protégé", () => {
    const roiPiqueEtale = c('spades', 'K')
    const roiPiqueMain = c('spades', 'K')
    // Atout = pique, mais mariagesAtoutActifs est vide : rien à protéger
    const state = baseState('spades', [roiPiqueMain], [roiPiqueEtale], [])
    const candidats = [roiPiqueMain, roiPiqueEtale]

    const resultat = preferEtaleeSiPossible(roiPiqueMain, state, candidats)
    expect(resultat.id).toBe(roiPiqueEtale.id)
  })

  it("ne redirige pas si la carte étalée semblable n'est pas un candidat légal (filtrée ailleurs)", () => {
    const roiPiqueEtale = c('spades', 'K')
    const roiPiqueMain = c('spades', 'K')
    const state = baseState('clubs', [roiPiqueMain], [roiPiqueEtale])
    // La carte étalée n'apparaît PAS dans candidats (simulerait un filtrage phase finale)
    const candidats = [roiPiqueMain]

    const resultat = preferEtaleeSiPossible(roiPiqueMain, state, candidats)
    expect(resultat.id).toBe(roiPiqueMain.id)
  })
})

// ============================================================
// Intégration — via choisirCarteIA (niveaux intermédiaire et difficile)
// ============================================================

describe('Intégration — choisirCarteIA préfère la carte étalée (intermédiaire)', () => {
  it('joue le valet de carreau étalé plutôt que celui de la main', () => {
    const valetCarreauEtalee = c('diamonds', 'J')
    const valetCarreauMain = c('diamonds', 'J')
    const state = baseState('spades', [valetCarreauMain], [valetCarreauEtalee])

    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(valetCarreauEtalee.id)
  })

  it("préserve le mariage d'atout actif : joue la main, pas l'étalée du mariage", () => {
    const roiPiqueEtale = c('spades', 'K')
    const damePiqueEtalee = c('spades', 'Q')
    const damePiqueMain = c('spades', 'Q')
    const state = baseState(
      'spades',
      [damePiqueMain],
      [roiPiqueEtale, damePiqueEtalee],
      [[roiPiqueEtale.id, damePiqueEtalee.id]]
    )

    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(damePiqueMain.id)
  })
})

describe('Intégration — choisirCarteIA préfère la carte étalée (difficile)', () => {
  it('joue le roi de pique étalé plutôt que celui de la main', () => {
    const roiPiqueEtalee = c('spades', 'K')
    const roiPiqueMain = c('spades', 'K')
    const state = baseState('clubs', [roiPiqueMain], [roiPiqueEtalee])

    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.id).toBe(roiPiqueEtalee.id)
  })

  it("préserve le mariage d'atout actif : joue la main, pas l'étalée du mariage", () => {
    const roiPiqueEtale = c('spades', 'K')
    const roiPiqueMain = c('spades', 'K')
    // La Dame du mariage n'est volontairement PAS un candidat jouable ici (pas dans
    // cartesEtalees) : seul l'identifiant de la paire compte pour l'exception —
    // cela isole le câblage du wrapper sans qu'une carte de rang plus faible ne
    // détourne le choix du cascade avant même d'atteindre preferEtaleeSiPossible.
    const damePiqueDuMariage = c('spades', 'Q')
    const state = baseState(
      'spades',
      [roiPiqueMain],
      [roiPiqueEtale],
      [[roiPiqueEtale.id, damePiqueDuMariage.id]]
    )

    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.id).toBe(roiPiqueMain.id)
  })
})

describe('Intégration — le niveau facile ne préfère PAS les cartes étalées (hors périmètre de la demande)', () => {
  it('peut jouer la carte de la main même si une semblable est étalée (aucune redirection appliquée)', () => {
    const valetCarreauEtalee = c('diamonds', 'J')
    const valetCarreauMain = c('diamonds', 'J')
    const state = baseState('spades', [valetCarreauMain], [valetCarreauEtalee])

    const carte = choisirCarteIA(state, 'facile')
    // Le niveau facile n'a aucune préférence : main ou étalée sont toutes deux valides
    expect([valetCarreauMain.id, valetCarreauEtalee.id]).toContain(carte?.id)
  })
})
