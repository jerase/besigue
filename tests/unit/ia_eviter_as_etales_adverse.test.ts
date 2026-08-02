// ============================================================
// TESTS — Évolution : éviter d'ouvrir vers les As étalés (non-atout)
// de l'humain, niveaux Intermédiaire et Difficile uniquement.
//
// Sévérité :
//   - 10 de couleur dangereuse → EXCLU en priorité si alternative existe
//     (donnerait 2 brisques bonus : le 10 + l'As).
//   - Autre carte de couleur dangereuse → LIMITÉE (préférée en dernier
//     recours seulement, ne donne qu'1 brisque bonus : l'As).
// ============================================================

import { describe, it, expect } from 'vitest'
import { strategieEviterAsEtalesAdverse } from '../../src/core/ia/strategies-avancees'
import { iaIntermediaire } from '../../src/core/ia/niveau-intermediaire'
import { iaDifficile } from '../../src/core/ia/niveau-difficile'
import { initialiserPartie } from '../../src/core/init'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { creerCarte, creerJoker } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

function baseState(couleurAtout: Couleur | null, etaleesHumain: Carte[] = []): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({ ...state, couleurAtout })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: etaleesHumain, pileRemportee: [] }
  joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [], pileRemportee: [] }
  return {
    ...base,
    joueurs,
    pioche: Array.from({ length: 16 }, () => c('clubs', '7', 0)),
    pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 0, cartes: [null, null] },
  }
}

const AUCUNE_UTILE = new Set<string>()

describe('strategieEviterAsEtalesAdverse — fonction pure', () => {
  it("retourne null si l'humain n'a aucun As étalé", () => {
    const state = baseState('spades')
    const candidats = [c('hearts', '10'), c('clubs', '9')]
    expect(strategieEviterAsEtalesAdverse(candidats, state, AUCUNE_UTILE)).toBeNull()
  })

  it("retourne null en RÉPONSE (carteOuverte non nulle), même avec un As étalé dangereux", () => {
    const asCoeur = c('hearts', 'A')
    const state = baseState('spades', [asCoeur])
    const stateReponse = {
      ...state,
      pliEnCours: { carteJoueur0: c('diamonds', 'K'), carteJoueur1: null, joueurOuvreur: 0 as const, cartes: [null, null] },
    }
    const candidats = [c('hearts', '10')]
    expect(strategieEviterAsEtalesAdverse(candidats, stateReponse, AUCUNE_UTILE)).toBeNull()
  })

  it("un As étalé de la couleur d'ATOUT n'est PAS considéré dangereux (règle explicite : non-atout uniquement)", () => {
    const asAtout = c('spades', 'A') // atout = spades
    const state = baseState('spades', [asAtout])
    const dixAtout = c('spades', '10')
    const neufTrefle = c('clubs', '9')
    const choix = strategieEviterAsEtalesAdverse([dixAtout, neufTrefle], state, AUCUNE_UTILE)
    // Aucune couleur dangereuse détectée → la fonction ne doit rien changer (null)
    expect(choix).toBeNull()
  })

  describe('Exemple 1 de la spec — atout Pique, humain a As♥ + As♦ + As♠ étalés', () => {
    function stateExemple1(): GameState {
      const asCoeur = c('hearts', 'A')
      const asCarreau = c('diamonds', 'A')
      const asPique = c('spades', 'A') // atout → non dangereux
      return baseState('spades', [asCoeur, asCarreau, asPique])
    }

    it('évite le 10 de cœur si une carte hors couleur dangereuse existe', () => {
      const state = stateExemple1()
      const dixCoeur = c('hearts', '10')
      const neufTrefle = c('clubs', '9')
      const choix = strategieEviterAsEtalesAdverse([dixCoeur, neufTrefle], state, AUCUNE_UTILE)
      expect(choix?.id).toBe(neufTrefle.id)
    })

    it('évite le 10 de carreau si une carte hors couleur dangereuse existe', () => {
      const state = stateExemple1()
      const dixCarreau = c('diamonds', '10')
      const neufTrefle = c('clubs', '9')
      const choix = strategieEviterAsEtalesAdverse([dixCarreau, neufTrefle], state, AUCUNE_UTILE)
      expect(choix?.id).toBe(neufTrefle.id)
    })

    it("limite (préférence, pas blocage) une carte cœur/carreau non-10 si c'est la seule option", () => {
      const state = stateExemple1()
      const neufCoeur = c('hearts', '9')
      const choix = strategieEviterAsEtalesAdverse([neufCoeur], state, AUCUNE_UTILE)
      // Aucune alternative → on accepte la carte, faute de mieux
      expect(choix?.id).toBe(neufCoeur.id)
    })

    it('entre un 10 cœur (pire cas) et un valet cœur (cas limité), préfère le valet cœur', () => {
      const state = stateExemple1()
      const dixCoeur = c('hearts', '10')
      const valetCoeur = c('hearts', 'J')
      const choix = strategieEviterAsEtalesAdverse([dixCoeur, valetCoeur], state, AUCUNE_UTILE)
      expect(choix?.id).toBe(valetCoeur.id)
    })

    it("le Pique (couleur de l'As étalé mais qui est l'atout) n'est pas traité comme dangereux", () => {
      const state = stateExemple1()
      const neufPique = c('spades', '9') // atout, sans lien avec le danger non-atout
      const dixCoeur = c('hearts', '10')
      const choix = strategieEviterAsEtalesAdverse([neufPique, dixCoeur], state, AUCUNE_UTILE)
      expect(choix?.id).toBe(neufPique.id)
    })
  })

  describe('Exemple 2 de la spec — As de trèfle étalé, atout ≠ trèfle', () => {
    function stateExemple2(): GameState {
      const asTrefle = c('clubs', 'A')
      return baseState('spades', [asTrefle])
    }

    it('évite SURTOUT le 10 de trèfle si une alternative existe', () => {
      const state = stateExemple2()
      const dixTrefle = c('clubs', '10')
      const neufCoeur = c('hearts', '9')
      const choix = strategieEviterAsEtalesAdverse([dixTrefle, neufCoeur], state, AUCUNE_UTILE)
      expect(choix?.id).toBe(neufCoeur.id)
    })

    it('évite si possible toute autre carte trèfle (limiter) si une alternative hors trèfle existe', () => {
      const state = stateExemple2()
      const roiTrefle = c('clubs', 'K')
      const neufCoeur = c('hearts', '9')
      const choix = strategieEviterAsEtalesAdverse([roiTrefle, neufCoeur], state, AUCUNE_UTILE)
      expect(choix?.id).toBe(neufCoeur.id)
    })

    it("retourne null si SEULES des cartes '10 trèfle' à risque sont disponibles (rien à améliorer)", () => {
      const state = stateExemple2()
      const dixTrefle1 = c('clubs', '10', 0)
      const dixTrefle2 = c('clubs', '10', 1)
      const choix = strategieEviterAsEtalesAdverse([dixTrefle1, dixTrefle2], state, AUCUNE_UTILE)
      expect(choix).toBeNull()
    })
  })

  it('un Joker en ouverture est toujours traité comme sûr (bat tout non-atout par les règles du Joker)', () => {
    const asTrefle = c('clubs', 'A')
    const state = baseState('spades', [asTrefle])
    const joker = creerJoker('clubs', 0, _pos++)
    const dixTrefle = c('clubs', '10')
    const choix = strategieEviterAsEtalesAdverse([joker, dixTrefle], state, AUCUNE_UTILE)
    expect(choix?.id).toBe(joker.id)
  })

  it('respecte cartesUtiles (ne sacrifie pas une carte protégée) parmi les cartes sûres', () => {
    const asTrefle = c('clubs', 'A')
    const state = baseState('spades', [asTrefle])
    const neufCoeurUtile = c('hearts', '9')
    const huitCoeur = c('hearts', '8')
    const cartesUtiles = new Set([neufCoeurUtile.id])
    const choix = strategieEviterAsEtalesAdverse([neufCoeurUtile, huitCoeur], state, cartesUtiles)
    expect(choix?.id).toBe(huitCoeur.id)
  })
})

// ============================================================
// Intégration dans la cascade complète (niveaux intermédiaire et difficile)
// ============================================================

describe('Intégration — niveau intermédiaire évite les As étalés en ouverture', () => {
  it('choisit une carte hors couleur dangereuse plutôt que le 10 de cette couleur', () => {
    const asTrefle = c('clubs', 'A')
    let state = baseState('spades', [asTrefle])
    const dixTrefle = c('clubs', '10')
    const neufCoeur = c('hearts', '9')
    state.joueurs[1].main = [dixTrefle, neufCoeur]
    const carte = iaIntermediaire([dixTrefle, neufCoeur], state)
    expect(carte.id).toBe(neufCoeur.id)
  })
})

describe('Intégration — niveau difficile évite les As étalés en ouverture', () => {
  it('choisit une carte hors couleur dangereuse plutôt que le 10 de cette couleur', () => {
    const asTrefle = c('clubs', 'A')
    let state = baseState('spades', [asTrefle])
    state = { ...state, pioche: Array.from({ length: 16 }, () => c('diamonds', '7', 0)) }
    const dixTrefle = c('clubs', '10')
    const neufCoeur = c('hearts', '9')
    state.joueurs[1].main = [dixTrefle, neufCoeur]
    const carte = iaDifficile([dixTrefle, neufCoeur], state)
    expect(carte.id).toBe(neufCoeur.id)
  })
})
