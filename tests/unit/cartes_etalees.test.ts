// ============================================================
// TESTS NON-RÉGRESSION — CARTES ÉTALÉES JOUABLES
// Les cartes dans cartesEtalees doivent être sélectionnables
// et jouables exactement comme les cartes en main.
// ============================================================

import { describe, it, expect } from 'vitest'
import { jouerCarte, cartesJouablesPhaseFinale } from '../../src/core/pli'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0, pos = 0) =>
  creerCarte(couleur, rang, jeu, pos)

function makeState(
  mainJ0: Carte[],
  etaleesJ0: Carte[],
  overrides?: Partial<GameState>
): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const joueurs = [...state.joueurs] as typeof state.joueurs
  joueurs[0] = { ...joueurs[0], main: mainJ0, cartesEtalees: etaleesJ0 }
  return {
    ...state,
    joueurs,
    joueurActif: 0,  // forcer J0 pour les tests
    pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 0 },
    annonces: [],
    usagesCartes: [],
    mariagesAtoutActifs: { 0: [], 1: [] },
    ...overrides,
  }
}

// ============================================================
// PHASE LIBRE — cartes étalées jouables
// ============================================================

describe('Cartes étalées — jouables en phase libre', () => {

  it('une carte étalée peut être jouée comme une carte en main', () => {
    const carteMain   = c('spades', 'A', 0, 1)
    const carteEtalee = c('hearts', 'K', 0, 2)

    const state = makeState([carteMain], [carteEtalee])
    const { ok, state: apres } = jouerCarte(state, 0, carteEtalee.id)

    expect(ok).toBe(true)
    // La carte étalée est dans le pli
    expect(apres.pliEnCours.carteJoueur0?.id).toBe(carteEtalee.id)
    // La carte étalée est retirée de cartesEtalees
    expect(apres.joueurs[0].cartesEtalees.find(c => c.id === carteEtalee.id)).toBeUndefined()
    // La carte en main est intacte
    expect(apres.joueurs[0].main.find(c => c.id === carteMain.id)).toBeDefined()
  })

  it('une carte en main peut toujours être jouée quand des cartes sont étalées', () => {
    const carteMain   = c('spades', 'A', 0, 1)
    const carteEtalee = c('hearts', 'K', 0, 2)

    const state = makeState([carteMain], [carteEtalee])
    const { ok, state: apres } = jouerCarte(state, 0, carteMain.id)

    expect(ok).toBe(true)
    expect(apres.pliEnCours.carteJoueur0?.id).toBe(carteMain.id)
    // La carte étalée reste intacte
    expect(apres.joueurs[0].cartesEtalees.find(c => c.id === carteEtalee.id)).toBeDefined()
  })

  it('après avoir joué une carte étalée, elle n\'est plus ni en main ni dans étalées', () => {
    const e1 = c('hearts', 'Q', 0, 10)
    const e2 = c('spades', 'J', 0, 11)

    const state = makeState([], [e1, e2])
    const { ok, state: apres } = jouerCarte(state, 0, e1.id)

    expect(ok).toBe(true)
    expect(apres.joueurs[0].main).toHaveLength(0)
    expect(apres.joueurs[0].cartesEtalees).toHaveLength(1)
    expect(apres.joueurs[0].cartesEtalees[0].id).toBe(e2.id)
  })

  it('jouer une carte étalée inexistante retourne une erreur', () => {
    const state = makeState([c('spades', 'A', 0, 1)], [])
    const { ok, erreur } = jouerCarte(state, 0, 'carte-inexistante')
    expect(ok).toBe(false)
    expect(erreur).toBeDefined()
  })

  it('intégrité du total de cartes après avoir joué depuis les étalées', () => {
    const main = [c('spades','A',0,1), c('hearts','10',0,2)]
    const etalees = [c('diamonds','K',0,3), c('clubs','Q',0,4)]

    const state = makeState(main, etalees)
    const totalAvant = main.length + etalees.length

    const { state: apres } = jouerCarte(state, 0, etalees[0].id)

    // La carte jouée est dans le pli, tout le reste est conservé
    const totalApres = apres.joueurs[0].main.length
                     + apres.joueurs[0].cartesEtalees.length
    expect(totalApres).toBe(totalAvant - 1)
    expect(apres.pliEnCours.carteJoueur0).not.toBeNull()
  })

  it('plusieurs cartes étalées : chacune peut être jouée indépendamment', () => {
    const e1 = c('hearts', 'Q', 0, 10)
    const e2 = c('spades', 'J', 0, 11)
    const e3 = c('clubs',  'A', 0, 12)

    // Jouer e2 (du milieu)
    const state = makeState([], [e1, e2, e3])
    const { ok, state: apres } = jouerCarte(state, 0, e2.id)

    expect(ok).toBe(true)
    expect(apres.joueurs[0].cartesEtalees).toHaveLength(2)
    expect(apres.joueurs[0].cartesEtalees.map(c => c.id)).toContain(e1.id)
    expect(apres.joueurs[0].cartesEtalees.map(c => c.id)).toContain(e3.id)
    expect(apres.joueurs[0].cartesEtalees.map(c => c.id)).not.toContain(e2.id)
  })
})

// ============================================================
// PHASE FINALE — cartes étalées incluses dans l'obligation de couleur
// ============================================================

describe('Cartes étalées — obligation de couleur en phase finale', () => {

  it('une carte étalée de la bonne couleur est jouable en phase finale', () => {
    const atout: Couleur = 'hearts'
    // Carte adverse : As de pique
    const carteAdverse = c('spades', 'A', 0, 20)
    // J0 : rien en main, mais un Roi de pique dans les étalées
    const carteEtalee = c('spades', 'K', 0, 21)

    const state = makeState([], [carteEtalee], {
      couleurAtout: atout,
      phase: 'finale',
      pliEnCours: { carteJoueur0: null, carteJoueur1: carteAdverse, joueurOuvreur: 1 },
    })

    const { ok } = jouerCarte(state, 0, carteEtalee.id)
    expect(ok).toBe(true)
  })

  it('cartesJouablesPhaseFinale inclut les cartes étalées', () => {
    const atout: Couleur = 'hearts'
    const carteOuverte   = c('spades', '9', 0, 30)
    const enMain         = c('clubs',  'A', 0, 31)  // mauvaise couleur
    const enEtalees      = c('spades', 'K', 0, 32)  // bonne couleur

    const toutesCartes = [enMain, enEtalees]
    const jouables = cartesJouablesPhaseFinale(toutesCartes, carteOuverte, atout)

    // Roi de pique doit être jouable (même couleur que la carte ouverte)
    expect(jouables.some(c => c.id === enEtalees.id)).toBe(true)
  })

  it('en phase finale, carte étalée de mauvaise couleur sans atout → défausse libre', () => {
    const atout: Couleur = 'hearts'
    const carteOuverte   = c('spades',   'A', 0, 40)
    const enEtalees      = c('diamonds', 'K', 0, 41)  // ni pique, ni atout

    const jouables = cartesJouablesPhaseFinale([enEtalees], carteOuverte, atout)
    // Défausse libre : la carte étalée est jouable (pas d'autre option)
    expect(jouables.some(c => c.id === enEtalees.id)).toBe(true)
  })

  it('phase finale avec étalées : obligation atout si pas la couleur ouverte', () => {
    const atout: Couleur = 'hearts'
    const carteOuverte    = c('spades',  'A', 0, 50)
    const enMain          = c('clubs',   'K', 0, 51)  // ni pique, ni atout
    const enEtaleesAtout  = c(atout,     '7', 0, 52)  // atout !

    const toutesCartes = [enMain, enEtaleesAtout]
    const jouables = cartesJouablesPhaseFinale(toutesCartes, carteOuverte, atout)

    // Doit obligatoirement jouer l'atout étalé
    expect(jouables.some(c => c.id === enEtaleesAtout.id)).toBe(true)
    expect(jouables.some(c => c.id === enMain.id)).toBe(false)
  })

  it('jouerCarte en phase finale accepte une carte étalée respectant l\'obligation', () => {
    const atout: Couleur = 'clubs'
    const carteAdverse   = c('spades', 'A', 0, 60)
    const carteEtalee    = c('spades', '7', 0, 61)  // couleur correcte

    const state = makeState([], [carteEtalee], {
      couleurAtout: atout,
      phase: 'finale',
      pliEnCours: { carteJoueur0: null, carteJoueur1: carteAdverse, joueurOuvreur: 1 },
    })

    const { ok } = jouerCarte(state, 0, carteEtalee.id)
    expect(ok).toBe(true)
  })

  it('jouerCarte en phase finale refuse une carte étalée violant l\'obligation', () => {
    const atout: Couleur = 'hearts'
    const carteAdverse    = c('spades', 'A', 0, 70)
    // J0 a un Roi de pique en étalées (doit jouer pique) mais essaie de jouer clubs
    const carteObligation = c('spades', 'K', 0, 71)  // pique → jouable
    const carteInterdite  = c('clubs',  'J', 0, 72)  // clubs → interdit

    const state = makeState([], [carteObligation, carteInterdite], {
      couleurAtout: atout,
      phase: 'finale',
      pliEnCours: { carteJoueur0: null, carteJoueur1: carteAdverse, joueurOuvreur: 1 },
    })

    const { ok: okInterdite } = jouerCarte(state, 0, carteInterdite.id)
    const { ok: okObligee }   = jouerCarte(state, 0, carteObligation.id)

    expect(okInterdite).toBe(false)  // violation d'obligation
    expect(okObligee).toBe(true)     // obligation respectée
  })
})

// ============================================================
// COHÉRENCE — cartes étalées restent visibles après un pli
// ============================================================

describe('Cartes étalées — restent dans la zone étalées après avoir joué depuis main', () => {

  it('jouer une carte de la MAIN ne retire pas les cartes étalées', () => {
    const carteMain   = c('spades', 'A', 0, 80)
    const carteEtalee = c('hearts', 'K', 0, 81)

    const state = makeState([carteMain], [carteEtalee])
    const { state: apres } = jouerCarte(state, 0, carteMain.id)

    // Carte étalée toujours présente
    expect(apres.joueurs[0].cartesEtalees).toHaveLength(1)
    expect(apres.joueurs[0].cartesEtalees[0].id).toBe(carteEtalee.id)
  })

  it('une carte étalée jouée disparaît mais les autres étalées restent', () => {
    const e1 = c('hearts', 'Q', 0, 90)  // sera jouée
    const e2 = c('spades', 'K', 0, 91)  // doit rester
    const e3 = c('clubs',  'J', 0, 92)  // doit rester

    const state = makeState([], [e1, e2, e3])
    const { state: apres } = jouerCarte(state, 0, e1.id)

    expect(apres.joueurs[0].cartesEtalees).toHaveLength(2)
    expect(apres.joueurs[0].cartesEtalees.map(c => c.id)).not.toContain(e1.id)
    expect(apres.joueurs[0].cartesEtalees.map(c => c.id)).toContain(e2.id)
    expect(apres.joueurs[0].cartesEtalees.map(c => c.id)).toContain(e3.id)
  })
})
