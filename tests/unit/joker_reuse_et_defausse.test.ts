// ============================================================
// TESTS — BUGFIX : Joker unique par combinaison + défausse prioritaire
//
// Bug 1 : un Joker étalé dans une combinaison (ex. 4_roi) était encore
//         proposé pour compléter une AUTRE combinaison (ex. 4_valet).
//         Règle du jeu : un Joker ne participe qu'à UNE SEULE
//         combinaison annoncée et étalée, tous types confondus.
//
// Bug 2 : aucune règle ne forçait l'IA à se débarrasser d'un Joker
//         déjà étalé (utilisé dans une combinaison annoncée) au
//         prochain pli. Correction appliquée uniformément aux 3
//         niveaux (facile, intermédiaire, difficile) via le point
//         d'entrée commun choisirCarteIA.
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  detecterCombinaisonsDisponibles,
  appliquerAnnonce,
  initialiserChampsIT4,
} from '../../src/core/combinaisons'
import { choisirCarteIA } from '../../src/core/ia'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte, creerJoker } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur, NomCombinaison, AnnoncePosee, NiveauIA } from '../../src/types'

// ── Helpers ───────────────────────────────────────────────────

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

/** State de base avec un mariage_Atout déjà posé (débloque toutes les annonces) et des annonces injectées */
function makeStateAvecAnnonces(
  cartesMain: Carte[],
  cartesEtalees: Carte[],
  annoncesSupp: AnnoncePosee[],
  couleurAtout: Couleur = 'hearts'
): GameState {
  const { state: base } = initialiserPartie(CONFIG_DEFAUT)
  const state = initialiserChampsIT4({ ...base, couleurAtout })

  const annonceAtout: AnnoncePosee = {
    nom: 'mariage_atout', points: 40,
    cartesIds: [`${couleurAtout}-K-9-900`, `${couleurAtout}-Q-9-901`],
    joueurId: 1, mancheNumero: 1,
  }

  const joueurs = [...state.joueurs] as typeof state.joueurs
  joueurs[0] = { ...joueurs[0], main: cartesMain, cartesEtalees }

  return {
    ...state,
    joueurs,
    annonces: [annonceAtout, ...annoncesSupp],
  }
}

/** State pour tester choisirCarteIA : main + cartesEtalees paramétrables pour l'IA (siège 1) */
function makeStateIA(
  mainIA: Carte[],
  cartesEtaleesIA: Carte[],
  carteOuverte: Carte | null = null,
  couleurAtout: Couleur | null = null,
  phase: 'libre' | 'finale' = 'libre',
  nbPioche = 16
): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({
    ...state,
    couleurAtout,
    phase,
    joueurActif: 1,
    pliEnCours: {
      carteJoueur0: carteOuverte,
      carteJoueur1: null,
      joueurOuvreur: 0,
      cartes: [carteOuverte, null],
    },
    pioche: Array.from({ length: nbPioche }, (_, i) => c('clubs', '7')),
  })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[1] = { ...joueurs[1], main: mainIA, cartesEtalees: cartesEtaleesIA }
  return { ...base, joueurs }
}

// ============================================================
// BUG 1 — Un Joker étalé dans une combinaison n'est plus
// disponible pour une AUTRE combinaison (tous types confondus)
// ============================================================

describe('Bugfix — Joker : une seule combinaison, tous types confondus', () => {
  it('Joker étalé dans un carré de Rois → non disponible pour compléter un carré de Valets', () => {
    const roiS = c('spades', 'K')
    const roiH = c('hearts', 'K')
    const roiD = c('diamonds', 'K')
    const joker = creerJoker('clubs', 0, _pos++)

    const annonceRois: AnnoncePosee = {
      nom: '4_roi', points: 40,
      cartesIds: [roiS.id, roiH.id, roiD.id, joker.id],
      joueurId: 0, mancheNumero: 1,
    }

    // Le joueur a maintenant 3 valets en main + le même Joker (déjà étalé dans 4_roi)
    const valS = c('spades', 'J')
    const valH = c('hearts', 'J')
    const valD = c('diamonds', 'J')

    const state = makeStateAvecAnnonces(
      [valS, valH, valD],
      [roiS, roiH, roiD, joker],
      [annonceRois]
    )

    const combis = detecterCombinaisonsDisponibles(state, 0)
    const carreValets = combis.find(cb => cb.nom === '4_valet')

    // AVANT le correctif, ce test échouait : le Joker était proposé (et donc
    // réutilisable) pour compléter un second carré alors qu'il est déjà étalé.
    expect(carreValets).toBeUndefined()
  })

  it('Joker étalé dans un carré de Dames → non disponible pour compléter un carré d\'As', () => {
    const dameS = c('spades', 'Q')
    const dameH = c('hearts', 'Q')
    const dameD = c('diamonds', 'Q')
    const joker = creerJoker('clubs', 0, _pos++)

    const annonceDames: AnnoncePosee = {
      nom: '4_dame', points: 40,
      cartesIds: [dameS.id, dameH.id, dameD.id, joker.id],
      joueurId: 0, mancheNumero: 1,
    }

    const asS = c('spades', 'A')
    const asH = c('hearts', 'A')
    const asD = c('diamonds', 'A')

    const state = makeStateAvecAnnonces(
      [asS, asH, asD],
      [dameS, dameH, dameD, joker],
      [annonceDames]
    )

    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.find(cb => cb.nom === '4_as')).toBeUndefined()
  })

  it('cycle complet via appliquerAnnonce : Joker consommé par 4_roi puis inutilisable pour 4_valet', () => {
    const atout: Couleur = 'clubs'
    const roiS = c('spades', 'K')
    const roiH = c('hearts', 'K')
    const roiD = c('diamonds', 'K')
    const joker = creerJoker(atout, 0, _pos++)

    const valS = c('spades', 'J')
    const valH = c('hearts', 'J')
    const valD = c('diamonds', 'J')

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    let state = initialiserChampsIT4({ ...base, couleurAtout: atout })
    state = {
      ...state,
      annonces: [
        { nom: 'mariage_atout' as const, points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1 as const, mancheNumero: 1 },
      ],
    }
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [roiS, roiH, roiD, joker, valS, valH, valD], cartesEtalees: [] }
    state = { ...state, joueurs }

    // Annoncer le carré de Rois en utilisant le Joker
    const carreRois = detecterCombinaisonsDisponibles(state, 0).find(cb => cb.nom === '4_roi')!
    expect(carreRois).toBeDefined()
    expect(carreRois.cartesIds).toContain(joker.id)
    state = appliquerAnnonce(state, 0, carreRois)

    // Le Joker est maintenant étalé — un carré de Valets (3 valets + Joker) ne doit plus être proposé
    const combis2 = detecterCombinaisonsDisponibles(state, 0)
    expect(combis2.find(cb => cb.nom === '4_valet')).toBeUndefined()
  })

  it('régression : un Joker NON encore utilisé reste disponible pour compléter un carré', () => {
    const roiS = c('spades', 'K')
    const roiH = c('hearts', 'K')
    const roiD = c('diamonds', 'K')
    const joker = creerJoker('clubs', 0, _pos++)

    const state = makeStateAvecAnnonces([roiS, roiH, roiD, joker], [], [])
    const combis = detecterCombinaisonsDisponibles(state, 0)
    const carreRois = combis.find(cb => cb.nom === '4_roi')
    expect(carreRois).toBeDefined()
    expect(carreRois!.cartesIds).toContain(joker.id)
  })

  it('régression : un carré du même type déjà annoncé avec Joker reste non reproposé (comportement existant préservé)', () => {
    const roiS = c('spades', 'K')
    const roiH = c('hearts', 'K')
    const roiD = c('diamonds', 'K')
    const joker = creerJoker('clubs', 0, _pos++)

    const annonceRois: AnnoncePosee = {
      nom: '4_roi', points: 40,
      cartesIds: [roiS.id, roiH.id, roiD.id, joker.id],
      joueurId: 0, mancheNumero: 1,
    }
    const state = makeStateAvecAnnonces([], [roiS, roiH, roiD, joker], [annonceRois])
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.find(cb => cb.nom === '4_roi')).toBeUndefined()
  })
})

// ============================================================
// BUG 2 — Défausse prioritaire d'un Joker déjà étalé,
// pour les 3 niveaux d'IA
// ============================================================

describe('Bugfix — défausse prioritaire du Joker étalé (3 niveaux)', () => {
  const niveaux: NiveauIA[] = ['facile', 'intermediaire', 'difficile']

  niveaux.forEach(niveau => {
    it(`niveau ${niveau} — joue le Joker étalé en OUVERTURE, avant toute autre stratégie`, () => {
      const joker = creerJoker('spades', 0, _pos++)
      const roi = c('hearts', 'K')
      const dame = c('hearts', 'Q') // mariage potentiel qui serait normalement gardé

      const state = makeStateIA([roi, dame], [joker], null, null)
      const carte = choisirCarteIA(state, niveau)

      expect(carte?.id).toBe(joker.id)
    })

    it(`niveau ${niveau} — joue le Joker étalé en RÉPONSE, même si une autre carte gagnerait le pli`, () => {
      const joker = creerJoker('spades', 0, _pos++)
      const atout: Couleur = 'clubs'
      const carteOuverte = c('hearts', '9')
      const atoutGagnant = c(atout, 'A') // capturerait normalement le pli

      const state = makeStateIA([atoutGagnant], [joker], carteOuverte, atout)
      const carte = choisirCarteIA(state, niveau)

      expect(carte?.id).toBe(joker.id)
    })

    it(`niveau ${niveau} — régression : sans Joker étalé, le comportement normal s'applique (pas de défausse forcée)`, () => {
      const roi = c('hearts', 'K')
      const dame = c('hearts', 'Q')

      const state = makeStateIA([roi, dame], [], null, null)
      const carte = choisirCarteIA(state, niveau)

      // Aucun Joker étalé → la carte jouée ne doit pas être un Joker (il n'y en a pas)
      expect(carte?.estJoker).toBe(false)
    })

    it(`niveau ${niveau} — un Joker encore en MAIN (pas étalé) n'est pas forcé par cette règle`, () => {
      const jokerEnMain = creerJoker('spades', 0, _pos++)
      const neuf = c('diamonds', '9')

      // Joker en main (candidat possible), mais PAS dans cartesEtalees → pas de défausse forcée
      const state = makeStateIA([jokerEnMain, neuf], [], null, null)
      const carte = choisirCarteIA(state, niveau)

      // Le niveau peut choisir de jouer le Joker pour d'autres raisons stratégiques
      // (ex. strategieOuvrirJokerSansMariage pour intermédiaire/difficile), mais ce
      // n'est plus une contrainte absolue : on vérifie seulement qu'un candidat valide
      // est retourné (pas de crash / pas de comportement forcé spécifique testé ici).
      expect(carte).not.toBeNull()
    })
  })
})
