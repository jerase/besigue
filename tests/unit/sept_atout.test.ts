// ============================================================
// TESTS NON-RÉGRESSION — SEPT D'ATOUT
// Le 7 d'atout :
// - Reste en main (jamais étalé)
// - N'est JAMAIS proposé comme annonce manuelle
// - +10 pts accordés AUTOMATIQUEMENT dans appliquerPli()
//   quand le joueur joue le 7 d'atout dans un pli
// ============================================================

import { describe, it, expect } from 'vitest'
import { detecterCombinaisonsDisponibles, appliquerAnnonce, initialiserChampsIT4 } from '../../src/core/combinaisons'
import { jouerCarte, appliquerPli } from '../../src/core/pli'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur, AnnoncePosee } from '../../src/types'

const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0, pos = 0) =>
  creerCarte(couleur, rang, jeu, pos)

function makeState(
  cartesMain: Carte[],
  cartesEtalees: Carte[],
  annoncesSupp: AnnoncePosee[],
  couleurAtout: Couleur = 'hearts',
  joueurActif: 0 | 1 = 0
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
    ...state, joueurs,
    joueurActif,
    pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: joueurActif, cartes: [null, null] },
    annonces: [annonceAtout, ...annoncesSupp],
  }
}

// ============================================================
// RÈGLE PRINCIPALE : le 7 d'atout n'est JAMAIS une annonce
// ============================================================

describe('Sept d\'atout — jamais proposé comme annonce manuelle', () => {

  it('7 d\'atout en main : aucune annonce sept_atout proposée', () => {
    const sept = c('hearts', '7', 0, 1)
    const state = makeState([sept], [], [])
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'sept_atout')).toBe(false)
  })

  it('7 d\'atout étalé : aucune annonce sept_atout proposée', () => {
    const sept = c('hearts', '7', 0, 1)
    const state = makeState([], [sept], [])
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'sept_atout')).toBe(false)
  })

  it('7 d\'atout en main avec d\'autres combis : sept_atout absent des propositions', () => {
    const atout: Couleur = 'spades'
    const sept = c(atout, '7', 0, 1)
    const roiS = c(atout, 'K', 0, 2)  // mariage possible
    const dameS = c(atout, 'Q', 0, 3)

    const state = makeState([sept, roiS, dameS], [], [], atout)
    const combis = detecterCombinaisonsDisponibles(state, 0)

    // Mariage peut être proposé, mais pas sept_atout
    expect(combis.some(c => c.nom === 'sept_atout')).toBe(false)
    // Le mariage est bien proposé (vérification que le reste fonctionne)
    expect(combis.some(c => c.nom === 'mariage_atout')).toBe(true)
  })

  it('deux 7 d\'atout en main : aucun sept_atout proposé', () => {
    const sept0 = c('hearts', '7', 0, 1)
    const sept1 = c('hearts', '7', 1, 33)
    const state = makeState([sept0, sept1], [], [])
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'sept_atout')).toBe(false)
  })

  it('sept_atout absent même après un pli remporté', () => {
    const sept = c('hearts', '7', 0, 1)
    // Simuler une annonce historique de sept_atout (ancien bug)
    const annonceFactice: AnnoncePosee = {
      nom: 'sept_atout', points: 10,
      cartesIds: [sept.id],
      joueurId: 0, mancheNumero: 1,
    }
    const state = makeState([sept], [], [annonceFactice])
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'sept_atout')).toBe(false)
  })
})

// ============================================================
// RÈGLE : le 7 d'atout reste en main — jamais étalé
// ============================================================

describe('Sept d\'atout — reste en main, jamais étalé', () => {

  it('après avoir joué une autre carte, le 7 d\'atout reste en main', () => {
    const sept = c('hearts', '7', 0, 1)
    const autresCarte = c('spades', 'A', 0, 2)
    const state = makeState([sept, autresCarte], [], [])

    // Jouer la carte normale, pas le 7 d'atout
    const { state: apres } = jouerCarte(state, 0, autresCarte.id)
    expect(apres.joueurs[0].main.some(c => c.id === sept.id)).toBe(true)
    expect(apres.joueurs[0].cartesEtalees.some(c => c.id === sept.id)).toBe(false)
  })

  it('le 7 d\'atout peut être joué dans un pli normalement', () => {
    const atout: Couleur = 'clubs'
    const sept = c(atout, '7', 0, 1)
    const state = makeState([sept], [], [], atout, 0)

    const { ok } = jouerCarte(state, 0, sept.id)
    expect(ok).toBe(true)
  })

  it('après avoir joué le 7 d\'atout, il n\'est plus en main ni dans étalées', () => {
    const atout: Couleur = 'diamonds'
    const sept = c(atout, '7', 0, 1)
    const state = makeState([sept], [], [], atout, 0)

    const { state: apres } = jouerCarte(state, 0, sept.id)
    // La carte est dans le pli, plus en main ni dans étalées
    expect(apres.joueurs[0].main.some(c => c.id === sept.id)).toBe(false)
    expect(apres.joueurs[0].cartesEtalees.some(c => c.id === sept.id)).toBe(false)
    expect(apres.pliEnCours.carteJoueur0?.id).toBe(sept.id)
  })
})

// ============================================================
// RÈGLE : +10 pts automatiques lors du jeu du 7 d'atout
// ============================================================

describe('Sept d\'atout — +10 pts automatiques dans appliquerPli', () => {

  it('J0 joue le 7 d\'atout (ouvreur) → +10 pts accordés automatiquement', () => {
    const atout: Couleur = 'hearts'
    const sept   = c(atout, '7', 0, 1)
    const carteIA = c('spades', 'A', 0, 2)  // carte IA non-atout

    // Construire un state avec le pli déjà posé
    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    const state = initialiserChampsIT4({
      ...base,
      couleurAtout: atout,
      annonces: [{ nom: 'mariage_atout', points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1, mancheNumero: 1 }],
      pliEnCours: { carteJoueur0: { ...sept, faceUp: true, etat: 'played' }, carteJoueur1: { ...carteIA, faceUp: true, etat: 'played' }, joueurOuvreur: 0, cartes: [{ ...sept, faceUp: true, etat: 'played' }, { ...carteIA, faceUp: true, etat: 'played' }] },
      joueurs: [
        { ...base.joueurs[0], main: [], marquePoints: 0 },
        { ...base.joueurs[1], main: [], marquePoints: 0 },
      ] as typeof base.joueurs,
    })

    const apres = appliquerPli(state)
    // J0 a joué le 7 d'atout → +10 pts
    expect(apres.joueurs[0].marquePoints).toBe(10)
    expect(apres.joueurs[1].marquePoints).toBe(0)
  })

  it('J1 (IA) joue le 7 d\'atout (second) → +10 pts pour J1', () => {
    const atout: Couleur = 'spades'
    const carteHumain = c('hearts', 'A', 0, 1)
    const sept = c(atout, '7', 0, 2)

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    const state = initialiserChampsIT4({
      ...base,
      couleurAtout: atout,
      annonces: [{ nom: 'mariage_atout', points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1, mancheNumero: 1 }],
      pliEnCours: { carteJoueur0: { ...carteHumain, faceUp: true, etat: 'played' }, carteJoueur1: { ...sept, faceUp: true, etat: 'played' }, joueurOuvreur: 0, cartes: [{ ...carteHumain, faceUp: true, etat: 'played' }, { ...sept, faceUp: true, etat: 'played' }] },
      joueurs: [
        { ...base.joueurs[0], main: [], marquePoints: 0 },
        { ...base.joueurs[1], main: [], marquePoints: 0 },
      ] as typeof base.joueurs,
    })

    const apres = appliquerPli(state)
    // J1 a joué le 7 d'atout → +10 pts pour J1
    expect(apres.joueurs[1].marquePoints).toBe(10)
    expect(apres.joueurs[0].marquePoints).toBe(0)
  })

  it('ni J0 ni J1 joue le 7 d\'atout → aucun bonus', () => {
    const atout: Couleur = 'clubs'
    const carte0 = c('hearts', 'A', 0, 1)
    const carte1 = c('spades', 'K', 0, 2)

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    const state = initialiserChampsIT4({
      ...base,
      couleurAtout: atout,
      annonces: [{ nom: 'mariage_atout', points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1, mancheNumero: 1 }],
      pliEnCours: { carteJoueur0: { ...carte0, faceUp: true, etat: 'played' }, carteJoueur1: { ...carte1, faceUp: true, etat: 'played' }, joueurOuvreur: 0, cartes: [{ ...carte0, faceUp: true, etat: 'played' }, { ...carte1, faceUp: true, etat: 'played' }] },
      joueurs: [
        { ...base.joueurs[0], main: [], marquePoints: 0 },
        { ...base.joueurs[1], main: [], marquePoints: 0 },
      ] as typeof base.joueurs,
    })

    const apres = appliquerPli(state)
    expect(apres.joueurs[0].marquePoints).toBe(0)
    expect(apres.joueurs[1].marquePoints).toBe(0)
  })

  it('7 d\'atout sans couleur d\'atout définie → pas de bonus', () => {
    const sept = c('hearts', '7', 0, 1)
    const autre = c('spades', 'A', 0, 2)

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    const state = {
      ...initialiserChampsIT4({ ...base, couleurAtout: null }),
      pliEnCours: { carteJoueur0: { ...sept, faceUp: true, etat: 'played' as const }, carteJoueur1: { ...autre, faceUp: true, etat: 'played' as const }, joueurOuvreur: 0 as const, cartes: [{ ...sept, faceUp: true, etat: 'played' as const }, { ...autre, faceUp: true, etat: 'played' as const }] },
      joueurs: [
        { ...base.joueurs[0], main: [], marquePoints: 0 },
        { ...base.joueurs[1], main: [], marquePoints: 0 },
      ] as typeof base.joueurs,
    }

    const apres = appliquerPli(state)
    // Pas d'atout défini → pas de bonus 7 d'atout
    expect(apres.joueurs[0].marquePoints).toBe(0)
  })

  it('7 de non-atout joué → pas de bonus', () => {
    const atout: Couleur = 'hearts'
    const septNonAtout = c('spades', '7', 0, 1)  // 7 de pique, pas l'atout
    const autre = c('clubs', 'A', 0, 2)

    const { state: base } = initialiserPartie(CONFIG_DEFAUT)
    const state = initialiserChampsIT4({
      ...base,
      couleurAtout: atout,
      annonces: [{ nom: 'mariage_atout', points: 40, cartesIds: [`${atout}-K-9-900`, `${atout}-Q-9-901`], joueurId: 1, mancheNumero: 1 }],
      pliEnCours: { carteJoueur0: { ...septNonAtout, faceUp: true, etat: 'played' }, carteJoueur1: { ...autre, faceUp: true, etat: 'played' }, joueurOuvreur: 0, cartes: [{ ...septNonAtout, faceUp: true, etat: 'played' }, { ...autre, faceUp: true, etat: 'played' }] },
      joueurs: [
        { ...base.joueurs[0], main: [], marquePoints: 0 },
        { ...base.joueurs[1], main: [], marquePoints: 0 },
      ] as typeof base.joueurs,
    })

    const apres = appliquerPli(state)
    expect(apres.joueurs[0].marquePoints).toBe(0)
  })
})

// ============================================================
// INTÉGRATION : séquence complète
// ============================================================

describe('Sept d\'atout — séquence complète', () => {

  it('le 7 d\'atout en main peut être sélectionné et joué sans être étalé', () => {
    const atout: Couleur = 'hearts'
    const sept  = c(atout, '7', 0, 1)
    const autre = c('spades', 'A', 0, 2)

    const state = makeState([sept, autre], [], [], atout, 0)

    // Le 7 d'atout est en main
    expect(state.joueurs[0].main.some(c => c.id === sept.id)).toBe(true)
    expect(state.joueurs[0].cartesEtalees.some(c => c.id === sept.id)).toBe(false)

    // Aucune annonce sept_atout proposée
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'sept_atout')).toBe(false)

    // Le joueur peut le jouer directement
    const { ok } = jouerCarte(state, 0, sept.id)
    expect(ok).toBe(true)
  })
})
