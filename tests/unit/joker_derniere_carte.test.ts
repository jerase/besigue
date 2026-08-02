// ============================================================
// TESTS — Joker comme dernière carte en phase finale
//
// Régression : quand le Joker est la seule carte disponible
// en phase finale, cartesJouablesPhaseFinale() retournait []
// → le moteur refusait toute carte → blocage de la partie.
//
// Fix : si sansJoker.length === 0, retourner main (le Joker).
// ============================================================

import { describe, it, expect } from 'vitest'
import { cartesJouablesPhaseFinale, jouerCarte } from '../../src/core/pli'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { Carte, Couleur, GameState } from '../../src/types'

// ── Helpers ──────────────────────────────────────────────────

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

const joker = (): Carte => ({
  ...creerCarte('spades', 'A', 0, _pos++),
  rang: 'JOKER',
  estJoker: true,
  faceUp: false,
})

function makeStateFinale(
  mainJ0: Carte[],
  carteOuverteIA: Carte | null = null,
  couleurAtout: Couleur | null = 'clubs'
): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({
    ...state,
    phase: 'finale',
    couleurAtout,
    joueurActif: 0, // sinon initialiserPartie tire ce champ au hasard
    pliEnCours: {
      carteJoueur0: null,
      carteJoueur1: carteOuverteIA,
      joueurOuvreur: 1,
      cartes: [null, carteOuverteIA],
    },
    pioche: [],
  })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], main: mainJ0, cartesEtalees: [] }
  joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [] }
  return { ...base, joueurs }
}

// ============================================================
// 1. BUG PRINCIPAL — Joker seul en main, réponse à un atout
// ============================================================

describe('Bug corrigé — Joker seule carte disponible', () => {

  it('Joker seul → cartesJouablesPhaseFinale retourne [Joker]', () => {
    const j = joker()
    const carteIA = c('clubs', 'A') // IA joue un atout fort
    const jouables = cartesJouablesPhaseFinale([j], carteIA, 'clubs')
    expect(jouables).toHaveLength(1)
    expect(jouables[0].estJoker).toBe(true)
  })

  it('Joker seul en ouverture → cartesJouablesPhaseFinale retourne [Joker]', () => {
    const j = joker()
    const jouables = cartesJouablesPhaseFinale([j], null, 'clubs')
    expect(jouables).toHaveLength(1)
    expect(jouables[0].estJoker).toBe(true)
  })

  it('Joker seul sans atout défini → retourne [Joker]', () => {
    const j = joker()
    const carteIA = c('hearts', 'K')
    const jouables = cartesJouablesPhaseFinale([j], carteIA, null)
    expect(jouables).toHaveLength(1)
    expect(jouables[0].estJoker).toBe(true)
  })

  it('Joker seul vs n\'importe quelle carte adverse → retourne [Joker]', () => {
    const j = joker()
    const adverses = [
      c('clubs', 'A'), c('hearts', '10'), c('spades', 'K'),
      c('diamonds', 'J'), c('clubs', '7'),
    ]
    for (const adverse of adverses) {
      const jouables = cartesJouablesPhaseFinale([j], adverse, 'clubs')
      expect(jouables).toHaveLength(1)
      expect(jouables[0].estJoker).toBe(true)
    }
  })
})

// ============================================================
// 2. LE JOUEUR PEUT EFFECTIVEMENT JOUER LE JOKER
// ============================================================

describe('Le joueur peut jouer le Joker quand c\'est sa seule carte', () => {

  it('jouerCarte accepte le Joker comme seule carte en phase finale', () => {
    const j = joker()
    const carteIA = c('clubs', 'A') // IA a ouvert le pli avec un atout
    const state = makeStateFinale([j], carteIA, 'clubs')
    // Le joueur tente de jouer son Joker
    const { ok, erreur } = jouerCarte(state, 0, j.id)
    expect(ok).toBe(true)
    expect(erreur).toBeUndefined()
  })

  it('après avoir joué le Joker, le pli est complet', () => {
    const j = joker()
    const carteIA = c('clubs', 'A')
    const state = makeStateFinale([j], carteIA, 'clubs')
    const { state: apres } = jouerCarte(state, 0, j.id)
    expect(apres.pliEnCours.carteJoueur0?.estJoker).toBe(true)
    expect(apres.pliEnCours.carteJoueur1?.id).toBe(carteIA.id)
  })
})

// ============================================================
// 3. NON-RÉGRESSION — Comportement normal préservé
// ============================================================

describe('Non-régression — Comportement normal préservé', () => {

  it('avec des cartes normales ET un Joker : Joker exclu des jouables', () => {
    const j = joker()
    const roi = c('hearts', 'K')
    const carteIA = c('clubs', 'A')
    const jouables = cartesJouablesPhaseFinale([j, roi], carteIA, 'clubs')
    // Le Roi est disponible → Joker exclu
    expect(jouables.every(c => !c.estJoker)).toBe(true)
  })

  it('obligation de couleur respectée (Joker ignoré si alternatives)', () => {
    const j = joker()
    const coeur = c('clubs', 'K')   // même couleur que l'atout
    const carteIA = c('clubs', '7') // IA joue atout
    const jouables = cartesJouablesPhaseFinale([j, coeur], carteIA, 'clubs')
    expect(jouables).toContain(coeur)
    expect(jouables.some(c => c.estJoker)).toBe(false)
  })

  it('obligation d\'atout respectée (Joker ignoré si atout disponible)', () => {
    const j = joker()
    const atout = c('clubs', '8')
    const carteIA = c('hearts', 'K')   // pas d'atout, pas de hearts
    const jouables = cartesJouablesPhaseFinale([j, atout], carteIA, 'clubs')
    // On n'a pas la couleur (hearts), mais on a atout → atout obligatoire
    expect(jouables).toContain(atout)
    expect(jouables.some(c => c.estJoker)).toBe(false)
  })

  it('défausse libre sans Joker : comportement inchangé', () => {
    const roi = c('spades', 'K')
    const huit = c('diamonds', '8')
    const carteIA = c('clubs', 'A')  // atout
    // Pas de hearts, pas d'atout → défausse libre
    const jouables = cartesJouablesPhaseFinale([roi, huit], carteIA, 'hearts')
    expect(jouables).toContain(roi)
    expect(jouables).toContain(huit)
  })

  it('en ouverture sans Joker : Joker non inclus (déjà vrai)', () => {
    const roi = c('hearts', 'K')
    const jouables = cartesJouablesPhaseFinale([roi], null, 'clubs')
    expect(jouables).toContain(roi)
  })

  it('tableau vide en entrée → tableau vide en sortie', () => {
    const jouables = cartesJouablesPhaseFinale([], c('clubs', 'A'), 'clubs')
    expect(jouables).toHaveLength(0)
  })
})
