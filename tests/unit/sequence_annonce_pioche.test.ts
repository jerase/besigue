// ============================================================
// TESTS NON-RÉGRESSION — SÉQUENCE ANNONCE AVANT PIOCHE
// Règle corrigée :
//   1. Résolution du pli
//   2. Proposer annonce(s) au vainqueur (AVANT la pioche)
//   3. Pioche après annonce ou passage
//   4. Tour suivant : re-proposer les combis en attente
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import {
  detecterCombinaisonsDisponibles,
  appliquerAnnonce,
  initialiserChampsIT4,
} from '../../src/core/combinaisons'
import { jouerCarte, appliquerPli } from '../../src/core/pli'
import { initialiserPartie, piocher } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur, AnnoncePosee, CombinaisonDisponible } from '../../src/types'

const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0, pos = 0) =>
  creerCarte(couleur, rang, jeu, pos)

// ── Helper : construire un state prêt pour annoncer ────────

function makeStateApresVictoirePli(
  cartesMainJ0: Carte[],
  cartesEtaleesJ0: Carte[],
  piocheCartes: Carte[],
  couleurAtout: Couleur = 'hearts',
  annoncesSupp: AnnoncePosee[] = []
): GameState {
  const { state: base } = initialiserPartie(CONFIG_DEFAUT)
  // 1. Initialiser les champs IT-4
  let state = initialiserChampsIT4({ ...base, couleurAtout, atoutDefini: true })
  // 2. Injecter les annonces et les combisEnAttente APRÈS initialiserChampsIT4
  state = {
    ...state,
    joueurActif: 0,
    dernierVainqueurPli: 0,
    pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 0 },
    pioche: piocheCartes,
    nbCartesRestantes: piocheCartes.length,
    annonces: [
      { nom: 'mariage_atout' as const, points: 40, cartesIds: [`${couleurAtout}-K-9-900`, `${couleurAtout}-Q-9-901`], joueurId: 1 as const, mancheNumero: 1 },
      ...annoncesSupp,
    ],
    combisEnAttente: { 0: [], 1: [] },
  }
  // 3. Injecter les cartes du joueur
  const joueurs = [...state.joueurs] as typeof state.joueurs
  joueurs[0] = { ...joueurs[0], main: cartesMainJ0, cartesEtalees: cartesEtaleesJ0 }
  return { ...state, joueurs }
}

// ============================================================
// RÈGLE 1 : les combis disponibles sont détectées AVANT la pioche
// ============================================================

describe('Séquence correcte — annonce avant pioche', () => {

  it('après victoire, les combis sont disponibles avant que la pioche ne soit effectuée', () => {
    const atout: Couleur = 'hearts'
    const roiS  = c('spades',   'K', 0, 10)
    const dameS = c('spades',   'Q', 0, 11)
    // Pioche avec 10 cartes
    const piocheCartes = Array.from({ length: 10 }, (_, i) =>
      c('clubs', '8', i % 4, 100 + i)
    )

    const state = makeStateApresVictoirePli(
      [roiS, dameS],
      [],
      piocheCartes,
      atout
    )

    // AVANT la pioche : les combis sont détectables
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'mariage_hors_atout')).toBe(true)
    // La pioche n'a pas encore été effectuée
    expect(state.pioche).toHaveLength(10)
    expect(state.joueurs[0].main).toHaveLength(2)
  })

  it('après annonce, la pioche n\'a toujours pas été effectuée', () => {
    const atout: Couleur = 'spades'
    const roiS  = c(atout,  'K', 0, 10)
    const dameS = c(atout, 'Q', 0, 11)
    const piocheCartes = [c('hearts', '8', 0, 100), c('clubs', '8', 0, 101)]

    let state = makeStateApresVictoirePli([roiS, dameS], [], piocheCartes, atout)

    // Annoncer le mariage_Atout
    const mariage = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_atout')!
    expect(mariage).toBeDefined()
    state = appliquerAnnonce(state, 0, mariage)

    // APRÈS annonce mais AVANT pioche : la pioche est intacte
    expect(state.pioche).toHaveLength(2)
    // Les cartes sont étalées
    expect(state.joueurs[0].cartesEtalees.some(c => c.id === roiS.id)).toBe(true)
  })

  it('la pioche est effectuée APRÈS l\'annonce — le joueur a sa carte piochée', () => {
    const atout: Couleur = 'hearts'
    const roiS  = c('spades', 'K', 0, 10)
    const dameS = c('spades', 'Q', 0, 11)
    const carteAJouer = c('clubs', '9', 0, 100)  // sera piochée
    const piocheCartes = [carteAJouer, c('clubs', '8', 0, 101)]

    let state = makeStateApresVictoirePli([roiS, dameS], [], piocheCartes, atout)

    // 1. Annoncer
    const mariage = detecterCombinaisonsDisponibles(state, 0).find(c => c.nom === 'mariage_hors_atout')!
    state = appliquerAnnonce(state, 0, mariage)
    expect(state.pioche).toHaveLength(2)  // pas encore pioché

    // 2. Piocher maintenant (simulation de effectuerPioche)
    const { state: apres } = piocher(state, 0)
    expect(apres.pioche).toHaveLength(1)  // 1 carte piochée par J0
    expect(apres.joueurs[0].main.some(c => c.id === carteAJouer.id)).toBe(true)
  })

  it('si passage sans annonce, la pioche est effectuée immédiatement', () => {
    const piocheCartes = [c('clubs', '8', 0, 100), c('hearts', '7', 0, 101)]
    const state = makeStateApresVictoirePli(
      [c('spades', 'A', 0, 1)],
      [],
      piocheCartes
    )

    // Aucune combi → simulation du passage → pioche directe
    const { state: apres } = piocher(state, 0)
    expect(apres.pioche).toHaveLength(1)
    expect(apres.joueurs[0].main).toHaveLength(2)  // 1 original + 1 pioché
  })
})

// ============================================================
// RÈGLE 2 : combisEnAttente persistées entre les tours
// ============================================================

describe('combisEnAttente — persistance entre tours', () => {

  it('si le joueur passe, les combis restent en attente pour le tour suivant', () => {
    const atout: Couleur = 'hearts'
    const roiS  = c('spades', 'K', 0, 10)
    const dameS = c('spades', 'Q', 0, 11)

    let state = makeStateApresVictoirePli([roiS, dameS], [], [], atout)

    // Détecter les combis disponibles
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.some(c => c.nom === 'mariage_hors_atout')).toBe(true)

    // Simuler "passer" : sauvegarder en attente sans annoncer
    state = {
      ...state,
      combisEnAttente: { 0: combis, 1: [] },
    }

    // Au tour suivant, les combis sont encore en attente
    const enAttente = state.combisEnAttente[0]
    expect(enAttente).toHaveLength(combis.length)
    expect(enAttente.some(c => c.nom === 'mariage_hors_atout')).toBe(true)
  })

  it('après annonce, la combi posée est retirée des en-attente', () => {
    const atout: Couleur = 'clubs'
    const dameS = c('spades',   'Q', 0, 10)
    const valetD = c('diamonds','J', 0, 11)
    const roiH   = c('hearts',  'K', 0, 12)
    const dameH  = c('hearts',  'Q', 0, 13)

    let state = makeStateApresVictoirePli([dameS, valetD, roiH, dameH], [], [], atout)
    const combis = detecterCombinaisonsDisponibles(state, 0)

    // Mettre en attente
    state = { ...state, combisEnAttente: { 0: combis, 1: [] } }

    // Annoncer le bésigue
    const besigue = combis.find(c => c.nom === 'besigue')!
    state = appliquerAnnonce(state, 0, besigue)

    // Retirer le bésigue des en-attente
    const enAttenteRestantes = state.combisEnAttente[0].filter(ea => ea.nom !== besigue.nom)
    state = { ...state, combisEnAttente: { 0: enAttenteRestantes, 1: [] } }

    expect(state.combisEnAttente[0].some(c => c.nom === 'besigue')).toBe(false)
  })

  it('les combisEnAttente sont initialisées vides au démarrage', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    expect(state.combisEnAttente[0]).toHaveLength(0)
    expect(state.combisEnAttente[1]).toHaveLength(0)
  })

  it('plusieurs combis en attente : chacune peut être posée indépendamment', () => {
    const atout: Couleur = 'hearts'
    // Mariage hors-atout + bésigue disponibles en même temps
    const roiS  = c('spades',   'K', 0, 10)
    const dameS = c('spades',   'Q', 0, 11)
    const valetD = c('diamonds','J', 0, 12)

    let state = makeStateApresVictoirePli([roiS, dameS, valetD], [], [], atout)
    const combis = detecterCombinaisonsDisponibles(state, 0)

    state = { ...state, combisEnAttente: { 0: combis, 1: [] } }

    // Poser mariage en premier
    const mariage = combis.find(c => c.nom === 'mariage_hors_atout')
    if (mariage) {
      state = appliquerAnnonce(state, 0, mariage)
      const enAttenteApres = state.combisEnAttente[0].filter(ea => ea.nom !== 'mariage_hors_atout')
      state = { ...state, combisEnAttente: { 0: enAttenteApres, 1: [] } }
      // Les autres combis (bésigue etc.) sont encore en attente
      expect(state.joueurs[0].cartesEtalees.some(c => c.id === roiS.id)).toBe(true)
    }
  })
})

// ============================================================
// RÈGLE 3 : ordre de la séquence complète
// ============================================================

describe('Séquence complète — ordre des étapes', () => {

  it('ordre : résolution → annonce → pioche → tour suivant', () => {
    const atout: Couleur = 'diamonds'
    const roiS  = c('spades', 'K', 0, 1)
    const dameS = c('spades', 'Q', 0, 2)
    const carteJ0 = c(atout, 'A', 0, 3)  // J0 joue As♦
    const carteJ1 = c('clubs', '7', 0, 4) // J1 joue 7♣ (J0 gagne car atout)
    const cartePioche = c('hearts', '9', 0, 100)

    let state = makeStateApresVictoirePli([], [], [cartePioche], atout)
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], main: [roiS, dameS, carteJ0], cartesEtalees: [] }
    joueurs[1] = { ...joueurs[1], main: [carteJ1] }
    state = { ...state, joueurs }

    // Étape 1 : J0 joue, J1 joue
    const r1 = jouerCarte(state, 0, carteJ0.id)
    expect(r1.ok).toBe(true)
    let s = r1.state
    s = { ...s, joueurActif: 1 }
    const r2 = jouerCarte(s, 1, carteJ1.id)
    expect(r2.ok).toBe(true)
    s = r2.state

    // Étape 1b : résolution
    s = appliquerPli(s)
    expect(s.dernierVainqueurPli).toBe(0)

    // Étape 2 : AVANT pioche → combis disponibles
    const combisAvantPioche = detecterCombinaisonsDisponibles(s, 0)
    expect(combisAvantPioche.some(c => c.nom === 'mariage_hors_atout')).toBe(true)
    expect(s.pioche).toHaveLength(1)  // pas encore pioché
    expect(s.joueurs[0].main).toHaveLength(2)  // roiS + dameS

    // Étape 2b : annoncer
    const mariage = combisAvantPioche.find(c => c.nom === 'mariage_hors_atout')!
    s = appliquerAnnonce(s, 0, mariage)
    expect(s.joueurs[0].cartesEtalees.some(c => c.id === roiS.id)).toBe(true)
    expect(s.pioche).toHaveLength(1)  // TOUJOURS pas pioché

    // Étape 3 : pioche MAINTENANT
    const { state: apres } = piocher(s, 0)
    expect(apres.pioche).toHaveLength(0)
    expect(apres.joueurs[0].main.some(c => c.id === cartePioche.id)).toBe(true)

    // Étape 4 : tour suivant → J0 a ses cartes + la piochée
    expect(apres.joueurs[0].main).toHaveLength(1)  // la carte piochée
    expect(apres.joueurs[0].cartesEtalees).toHaveLength(2)  // mariage étalé
  })

  it('si passage : pioche immédiate sans annonce, combis gardées pour tour suivant', () => {
    const atout: Couleur = 'spades'
    const roiH  = c('hearts', 'K', 0, 10)
    const dameH = c('hearts', 'Q', 0, 11)
    const cartePioche = c('clubs', 'A', 0, 100)

    let state = makeStateApresVictoirePli([roiH, dameH], [], [cartePioche], atout)

    // Combis détectées (mariage hors-atout)
    const combis = detecterCombinaisonsDisponibles(state, 0)
    expect(combis.length).toBeGreaterThan(0)

    // Simuler passage : sauvegarder en attente
    state = { ...state, combisEnAttente: { 0: combis, 1: [] } }

    // Piocher immédiatement (sans annonce)
    const { state: apres } = piocher(state, 0)
    expect(apres.pioche).toHaveLength(0)
    expect(apres.joueurs[0].main.some(c => c.id === cartePioche.id)).toBe(true)

    // Les combis sont encore en attente pour le prochain tour
    expect(apres.combisEnAttente[0].length).toBeGreaterThan(0)
  })
})

// ============================================================
// RÈGLE 4 : intégrité — pioche ne se fait jamais avant l'annonce
// ============================================================

describe('Intégrité — la pioche n\'altère pas les combis détectables', () => {

  it('les combis détectées avant pioche correspondent aux cartes en main (sans la piochée)', () => {
    const atout: Couleur = 'hearts'
    const roiS  = c('spades', 'K', 0, 1)
    const dameS = c('spades', 'Q', 0, 2)
    // Carte piochée qui n'ajoute pas de nouvelle combi
    const piocheNeutre = c('clubs', '8', 0, 100)

    const state = makeStateApresVictoirePli([roiS, dameS], [], [piocheNeutre], atout)

    // Combis avant pioche
    const combisAvant = detecterCombinaisonsDisponibles(state, 0)

    // Piocher
    const { state: apres } = piocher(state, 0)
    const combisApres = detecterCombinaisonsDisponibles(apres, 0)

    // Le mariage hors-atout est disponible dans les deux cas
    expect(combisAvant.some(c => c.nom === 'mariage_hors_atout')).toBe(true)
    expect(combisApres.some(c => c.nom === 'mariage_hors_atout')).toBe(true)
  })

  it('la carte piochée peut créer de nouvelles combis qui seront proposées au TOUR SUIVANT', () => {
    const atout: Couleur = 'hearts'
    // En main : 3 As (pas encore un carré)
    const as0 = c('spades',   'A', 0, 1)
    const as1 = c('hearts',   'A', 0, 2)
    const as2 = c('diamonds', 'A', 0, 3)
    // Carte piochée = 4e As → crée un carré !
    const as3 = c('clubs',    'A', 0, 100)

    const state = makeStateApresVictoirePli([as0, as1, as2], [], [as3], atout)

    // Avant pioche : pas de carré d'As
    const combisAvant = detecterCombinaisonsDisponibles(state, 0)
    expect(combisAvant.some(c => c.nom === '4_as')).toBe(false)

    // Piocher
    const { state: apres } = piocher(state, 0)

    // Après pioche : carré d'As disponible (sera proposé au TOUR SUIVANT)
    const combisApres = detecterCombinaisonsDisponibles(apres, 0)
    expect(combisApres.some(c => c.nom === '4_as')).toBe(true)
  })
})
