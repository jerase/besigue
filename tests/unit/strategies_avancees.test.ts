// ============================================================
// TESTS — Stratégies avancées A/B (strategies-avancees.ts)
// Règles a.1/a.2/a.3/b.1/b.2 — fonctions pures, appelées ici
// directement (aucune intégration dans niveau-intermediaire.ts /
// niveau-difficile.ts à ce stade).
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  strategieBrisqueGagnante, strategieOuvrirAvecAs,
  strategieGagnerPourMariage, strategieOuvrirCouleurEpuisee,
  strategieOuvrirJokerSansMariage,
  couleurMariagePotentielNonAnnonce,
} from '../../src/core/ia/strategies-avancees'
import { initialiserPartie } from '../../src/core/init'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { creerCarte, creerJoker } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

function baseState(couleurAtout: Couleur | null = null): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({ ...state, couleurAtout })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [], pileRemportee: [] }
  joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [], pileRemportee: [] }
  return {
    ...base,
    joueurs,
    pioche: Array.from({ length: 16 }, (_, i) => c('clubs', '7', 0)),
    pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 0, cartes: [null, null] },
  }
}

// ============================================================
// a.1 / b.1 — Brisque gagnante prioritaire en réponse
// ============================================================

describe('strategieBrisqueGagnante — a.1 (pas d\'atout)', () => {
  it('capture avec le 10 en priorité (pas l\'As) quand les deux gagnent', () => {
    const roiCoeur = c('hearts', 'K')
    const dixCoeur = c('hearts', '10')
    const asCoeur = c('hearts', 'A')
    const autre = c('clubs', '9')
    let state = baseState(null)
    state = {
      ...state,
      pliEnCours: { carteJoueur0: roiCoeur, carteJoueur1: null, joueurOuvreur: 0, cartes: [roiCoeur, null] },
    }
    state.joueurs[1].main = [dixCoeur, asCoeur, autre]

    const candidats = [dixCoeur, asCoeur, autre]
    const choix = strategieBrisqueGagnante(candidats, state)
    expect(choix?.id).toBe(dixCoeur.id)
  })

  it('joue l\'As si c\'est la seule brisque gagnante (pas de 10 gagnant)', () => {
    // Roi de cœur ouvert : seul un 10 ou un As de cœur peut le battre.
    // Ici l'IA n'a qu'un As de cœur (pas de 10) → il doit être joué.
    const roiCoeur = c('hearts', 'K')
    let state = baseState(null)
    state = { ...state, pliEnCours: { carteJoueur0: roiCoeur, carteJoueur1: null, joueurOuvreur: 0, cartes: [roiCoeur, null] } }
    const asCoeurIA = c('hearts', 'A', 1)
    const neufTrefle = c('clubs', '9')
    state.joueurs[1].main = [asCoeurIA, neufTrefle]

    const choix = strategieBrisqueGagnante([asCoeurIA, neufTrefle], state)
    expect(choix?.id).toBe(asCoeurIA.id)
  })

  it('ne joue pas une brisque protégée par une combinaison en cours', () => {
    // 3 As en main (protection "4 As" prioritaire) + carte ouverte de même couleur qu'un des As
    const roiTrefle = c('clubs', 'K')
    const asTrefle = c('clubs', 'A')
    const asPique = c('spades', 'A')
    const asCoeur = c('hearts', 'A')
    let state = baseState(null)
    state = { ...state, pliEnCours: { carteJoueur0: roiTrefle, carteJoueur1: null, joueurOuvreur: 0, cartes: [roiTrefle, null] } }
    state.joueurs[1].main = [asTrefle, asPique, asCoeur]

    const choix = strategieBrisqueGagnante([asTrefle, asPique, asCoeur], state)
    expect(choix).toBeNull()
  })

  it('retourne null en ouverture (carteOuverte === null)', () => {
    const state = baseState(null)
    const dix = c('hearts', '10')
    state.joueurs[1].main = [dix]
    expect(strategieBrisqueGagnante([dix], state)).toBeNull()
  })
})

describe('strategieBrisqueGagnante — b.1 (atout déclaré)', () => {
  it('capture avec une brisque non-atout, jamais avec un atout', () => {
    const dameCoeur = c('hearts', 'Q')
    const dixCoeur = c('hearts', '10')
    const asTrefleAtout = c('clubs', 'A') // atout, gagnerait aussi mais ne doit PAS être choisi ici
    let state = baseState('clubs')
    state = { ...state, pliEnCours: { carteJoueur0: dameCoeur, carteJoueur1: null, joueurOuvreur: 0, cartes: [dameCoeur, null] } }
    state.joueurs[1].main = [dixCoeur, asTrefleAtout]

    const choix = strategieBrisqueGagnante([dixCoeur, asTrefleAtout], state)
    expect(choix?.id).toBe(dixCoeur.id)
  })

  it('ne s\'applique pas si la carte ouverte est elle-même l\'atout', () => {
    const dixTrefleAtout = c('clubs', '10') // ouverture à l'atout
    const asTrefleAtout = c('clubs', 'A')
    let state = baseState('clubs')
    state = { ...state, pliEnCours: { carteJoueur0: dixTrefleAtout, carteJoueur1: null, joueurOuvreur: 0, cartes: [dixTrefleAtout, null] } }
    state.joueurs[1].main = [asTrefleAtout]

    expect(strategieBrisqueGagnante([asTrefleAtout], state)).toBeNull()
  })
})

// ============================================================
// a.2 / a.3 — Ouvrir avec un As avant l'atout
// ============================================================

describe('strategieOuvrirAvecAs — a.2', () => {
  it('joue un As en ouverture quand aucun mariage potentiel n\'est en jeu', () => {
    const asPique = c('spades', 'A')
    const neuf = c('clubs', '9')
    const state = baseState(null)
    state.joueurs[1].main = [neuf, asPique]

    const choix = strategieOuvrirAvecAs([neuf, asPique], state)
    expect(choix?.rang).toBe('A')
  })

  it('retourne null si l\'IA n\'a aucun As jouable', () => {
    const neuf = c('clubs', '9')
    const roi = c('spades', 'K')
    const state = baseState(null)
    state.joueurs[1].main = [neuf, roi]

    expect(strategieOuvrirAvecAs([neuf, roi], state)).toBeNull()
  })

  it('retourne null une fois l\'atout déclaré (règle pré-atout uniquement)', () => {
    const asPique = c('spades', 'A')
    const state = baseState('hearts')
    state.joueurs[1].main = [asPique]
    expect(strategieOuvrirAvecAs([asPique], state)).toBeNull()
  })

  it('retourne null si un adversaire a déjà ouvert (règle d\'ouverture uniquement)', () => {
    const asPique = c('spades', 'A')
    const roiTrefle = c('clubs', 'K')
    let state = baseState(null)
    state = { ...state, pliEnCours: { carteJoueur0: roiTrefle, carteJoueur1: null, joueurOuvreur: 0, cartes: [roiTrefle, null] } }
    state.joueurs[1].main = [asPique]
    expect(strategieOuvrirAvecAs([asPique], state)).toBeNull()
  })
})

describe('strategieOuvrirAvecAs — a.3 (exclusion de l\'As de la couleur du mariage)', () => {
  it('exclut l\'As de la couleur du mariage potentiel, joue un autre As', () => {
    const roiPique = c('spades', 'K')
    const damePique = c('spades', 'Q')
    const asPique = c('spades', 'A')   // couleur du mariage → NE DOIT PAS être joué ici
    const asCoeur = c('hearts', 'A')   // autre couleur → doit être joué
    const state = baseState(null)
    state.joueurs[1].main = [roiPique, damePique, asPique, asCoeur]

    expect(couleurMariagePotentielNonAnnonce(state)).toBe('spades')

    const choix = strategieOuvrirAvecAs([roiPique, damePique, asPique, asCoeur], state)
    expect(choix?.id).toBe(asCoeur.id)
  })

  it('retourne null si le seul As disponible est celui du mariage potentiel', () => {
    const roiPique = c('spades', 'K')
    const damePique = c('spades', 'Q')
    const asPique = c('spades', 'A')
    const state = baseState(null)
    state.joueurs[1].main = [roiPique, damePique, asPique]

    expect(strategieOuvrirAvecAs([roiPique, damePique, asPique], state)).toBeNull()
  })
})

// ============================================================
// a.3 (suite) — Gagner le pli pour pouvoir annoncer le mariage
// ============================================================

describe('strategieGagnerPourMariage', () => {
  it('gagne le pli en cours avec la carte la plus faible suffisante, une fois les As écoulés', () => {
    const roiPique = c('spades', 'K')
    const damePique = c('spades', 'Q')
    const neufCoeur = c('hearts', '9')     // carte ouverte par l'humain
    const dixCoeur = c('hearts', '10')     // gagne (rang > 9)
    const valetCoeur = c('hearts', 'J')    // gagne aussi (rang > 9), plus faible que le 10
    let state = baseState(null)
    state = { ...state, pliEnCours: { carteJoueur0: neufCoeur, carteJoueur1: null, joueurOuvreur: 0, cartes: [neufCoeur, null] } }
    state.joueurs[1].main = [roiPique, damePique, dixCoeur, valetCoeur]

    const candidats = [dixCoeur, valetCoeur]
    const choix = strategieGagnerPourMariage(candidats, state)
    expect(choix?.id).toBe(valetCoeur.id) // rang minimal parmi les gagnantes
  })

  it('ne s\'applique pas s\'il reste un As d\'une autre couleur à écouler (priorité a.2)', () => {
    const roiPique = c('spades', 'K')
    const damePique = c('spades', 'Q')
    const asCoeur = c('hearts', 'A')
    const neufCoeur = c('hearts', '9')
    const dixCoeur = c('hearts', '10')
    let state = baseState(null)
    state = { ...state, pliEnCours: { carteJoueur0: neufCoeur, carteJoueur1: null, joueurOuvreur: 0, cartes: [neufCoeur, null] } }
    state.joueurs[1].main = [roiPique, damePique, asCoeur, dixCoeur]

    const choix = strategieGagnerPourMariage([asCoeur, dixCoeur], state)
    expect(choix).toBeNull()
  })

  it('retourne null si l\'IA n\'a aucun mariage potentiel non annoncé', () => {
    const neufCoeur = c('hearts', '9')
    const dixCoeur = c('hearts', '10')
    let state = baseState(null)
    state = { ...state, pliEnCours: { carteJoueur0: neufCoeur, carteJoueur1: null, joueurOuvreur: 0, cartes: [neufCoeur, null] } }
    state.joueurs[1].main = [dixCoeur]

    expect(strategieGagnerPourMariage([dixCoeur], state)).toBeNull()
  })

  describe('sacrifice d\'une carte protégée en dernier recours — 1 fois sur 2', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    /** Construit un état où la SEULE carte gagnante possible est protégée (4 Rois en préparation). */
    function stateAvecSeuleGagnanteProtegee() {
      const roiDiamant = c('diamonds', 'K')   // couleur du mariage
      const dameDiamant = c('diamonds', 'Q')  // couleur du mariage
      const roiPique = c('spades', 'K')
      const roiCoeur = c('hearts', 'K')       // sera la seule carte gagnante
      const roiTrefle = c('clubs', 'K')
      const dameCoeurOuverte = c('hearts', 'Q') // carte ouverte par l'humain

      let state = baseState(null)
      state = { ...state, pliEnCours: { carteJoueur0: dameCoeurOuverte, carteJoueur1: null, joueurOuvreur: 0, cartes: [dameCoeurOuverte, null] } }
      state.joueurs[1].main = [roiDiamant, dameDiamant, roiPique, roiCoeur, roiTrefle]

      // Vérifie la prémisse du test : mariage potentiel = diamonds, et les 4 Rois sont protégés (4_rois, seuil ≥3)
      expect(couleurMariagePotentielNonAnnonce(state)).toBe('diamonds')

      return { state, roiCoeur }
    }

    it('sacrifie la carte protégée quand le tirage aléatoire est favorable (< 0.5)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.3)
      const { state, roiCoeur } = stateAvecSeuleGagnanteProtegee()

      const choix = strategieGagnerPourMariage([roiCoeur], state)
      expect(choix?.id).toBe(roiCoeur.id)
    })

    it('renonce à sacrifier la carte protégée quand le tirage aléatoire est défavorable (>= 0.5)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.7)
      const { state, roiCoeur } = stateAvecSeuleGagnanteProtegee()

      const choix = strategieGagnerPourMariage([roiCoeur], state)
      expect(choix).toBeNull()
    })
  })
})

// ============================================================
// a.4 — Jouer les Jokers en ouverture, sans mariage en main
// ============================================================

describe('strategieOuvrirJokerSansMariage — a.4', () => {
  it('joue un Joker en ouverture quand l\'IA n\'a pas de mariage potentiel en main', () => {
    const jokerPique = creerJoker('spades', 0, _pos++)
    const neuf = c('clubs', '9')
    const state = baseState(null)
    state.joueurs[1].main = [neuf, jokerPique]

    const choix = strategieOuvrirJokerSansMariage([neuf, jokerPique], state)
    expect(choix?.id).toBe(jokerPique.id)
  })

  it('ne joue pas de Joker si l\'IA a déjà un mariage potentiel en main (a.2/a.3 priment)', () => {
    const roiPique = c('spades', 'K')
    const damePique = c('spades', 'Q')
    const jokerCoeur = creerJoker('hearts', 0, _pos++)
    const state = baseState(null)
    state.joueurs[1].main = [roiPique, damePique, jokerCoeur]

    expect(strategieOuvrirJokerSansMariage([roiPique, damePique, jokerCoeur], state)).toBeNull()
  })

  it('retourne null si l\'IA n\'a aucun Joker jouable', () => {
    const neuf = c('clubs', '9')
    const state = baseState(null)
    state.joueurs[1].main = [neuf]
    expect(strategieOuvrirJokerSansMariage([neuf], state)).toBeNull()
  })

  it('retourne null une fois l\'atout déclaré', () => {
    const jokerPique = creerJoker('spades', 0, _pos++)
    const state = baseState('hearts')
    state.joueurs[1].main = [jokerPique]
    expect(strategieOuvrirJokerSansMariage([jokerPique], state)).toBeNull()
  })

  it('retourne null si un adversaire a déjà ouvert', () => {
    const jokerPique = creerJoker('spades', 0, _pos++)
    const roiTrefle = c('clubs', 'K')
    let state = baseState(null)
    state = { ...state, pliEnCours: { carteJoueur0: roiTrefle, carteJoueur1: null, joueurOuvreur: 0, cartes: [roiTrefle, null] } }
    state.joueurs[1].main = [jokerPique]
    expect(strategieOuvrirJokerSansMariage([jokerPique], state)).toBeNull()
  })
})

// ============================================================
// b.2 — Ouvrir dans la couleur non-atout la plus épuisée
// ============================================================

describe('strategieOuvrirCouleurEpuisee', () => {
  it('choisit la couleur non-atout la plus sûre à ouvrir (moins de brisques adverses probables restantes)', () => {
    // Atout = clubs. hearts : As+10 déjà vus (partis, remportés par J0)
    //   → il ne reste que 3+3=6 brisques hearts non vues dans le reliquat.
    // diamonds : rien vu → 4+4=8 brisques diamonds non vues dans le reliquat.
    // hearts a donc une valeur espérée de brisques adverses plus faible
    // (moins de reliquat au total) → hearts est la couleur la plus sûre.
    const asCoeurJoue = c('hearts', 'A')
    const dixCoeurJoue = c('hearts', '10')
    const state0 = baseState('clubs')
    const j0 = {
      ...state0.joueurs[0],
      pileRemportee: [asCoeurJoue, dixCoeurJoue],
      // Main adverse réaliste et non vide (baseState la met à [] par
      // défaut) : indispensable pour que la pondération probabiliste de
      // tableBrisques.ts soit représentative (sinon proba = 0 partout).
      main: Array.from({ length: 5 }, (_, i) => c('clubs', '9', i % 4)),
    }
    const state = { ...state0, joueurs: [j0, state0.joueurs[1]] as typeof state0.joueurs }

    const neufCoeur = c('hearts', '9')
    const huitDiamond = c('diamonds', '8')
    state.joueurs[1].main = [neufCoeur, huitDiamond]

    const choix = strategieOuvrirCouleurEpuisee([neufCoeur, huitDiamond], state)
    expect(choix?.couleur).toBe('hearts')
  })

  it('retourne null si aucun atout n\'est déclaré', () => {
    const neufCoeur = c('hearts', '9')
    const state = baseState(null)
    state.joueurs[1].main = [neufCoeur]
    expect(strategieOuvrirCouleurEpuisee([neufCoeur], state)).toBeNull()
  })

  it('retourne null si un adversaire a déjà ouvert', () => {
    const roiTrefle = c('clubs', 'K')
    const neufCoeur = c('hearts', '9')
    let state = baseState('clubs')
    state = { ...state, pliEnCours: { carteJoueur0: roiTrefle, carteJoueur1: null, joueurOuvreur: 0, cartes: [roiTrefle, null] } }
    state.joueurs[1].main = [neufCoeur]
    expect(strategieOuvrirCouleurEpuisee([neufCoeur], state)).toBeNull()
  })

  it('ne sacrifie jamais une brisque détenue quand une carte faible non-brisque existe dans une autre couleur — même si sa couleur est jugée "plus sûre" (régression découverte via ia_intermediaire_v2.test.ts)', () => {
    // Piège : l'IA détient un As de hearts (sa seule carte hearts) et un 8
    // de diamonds. Le fait que l'IA possède déjà cet As réduit le reliquat
    // "non vu" côté hearts (memoire.ts l'exclut de son propre calcul), ce
    // qui peut faire ressortir hearts comme couleur "la plus sûre" au sens
    // strict de tableBrisques — mais la SEULE carte hearts disponible est
    // justement cette brisque. Il ne faut jamais la sacrifier tant qu'une
    // carte faible sans valeur (le 8 de diamonds) reste disponible ailleurs.
    const asHearts = c('hearts', 'A')
    const huitDiamond = c('diamonds', '8')
    const state = baseState('clubs')
    state.joueurs[0].main = Array.from({ length: 9 }, (_, i) => c('clubs', '9', i % 4))
    state.pioche = Array.from({ length: 6 }, (_, i) => c('clubs', '7', i % 4))
    state.joueurs[1].main = [asHearts, huitDiamond]

    const choix = strategieOuvrirCouleurEpuisee([asHearts, huitDiamond], state)
    expect(choix?.id).toBe(huitDiamond.id)
  })
})
