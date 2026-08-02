// ============================================================
// TESTS UNITAIRES — SYNCHRONISATION PliEnCours.cartes[] (Phase 1 — Étape 3a/3b)
//
// Objectif : garantir que le nouveau champ générique `cartes` reste
// strictement synchronisé avec les champs historiques `carteJoueur0`
// et `carteJoueur1` à chaque étape du cycle de vie d'un pli (état
// initial, pose d'une carte par chaque joueur, résolution du pli).
//
// Ces tests utilisent le moteur réel (initialiserPartie, jouerCarte,
// appliquerPli) plutôt que des fixtures manuelles, pour valider le
// comportement de bout en bout tel que vécu par l'application.
// ============================================================

import { describe, it, expect } from 'vitest'
import { initialiserPartie } from '../../src/core/init'
import { jouerCarte, appliquerPli } from '../../src/core/pli'
import { CONFIG_DEFAUT } from '../../src/types'

describe('PliEnCours.cartes[] — synchronisation avec carteJoueur0/1', () => {
  it("à l'état initial d'une partie, cartes = [null, null]", () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    expect(state.pliEnCours.cartes).toEqual([null, null])
    expect(state.pliEnCours.carteJoueur0).toBeNull()
    expect(state.pliEnCours.carteJoueur1).toBeNull()
  })

  it('après la pose de la première carte (ouvreur), cartes[ouvreur] === carteJoueur du même siège', () => {
    const { state: state0 } = initialiserPartie(CONFIG_DEFAUT)
    const ouvreur = state0.joueurActif
    const carteJouee = state0.joueurs[ouvreur].main[0]

    const { state: state1, ok } = jouerCarte(state0, ouvreur, carteJouee.id)
    expect(ok).toBe(true)

    // Le champ historique correspondant au siège de l'ouvreur doit être renseigné
    const champHistorique = ouvreur === 0 ? state1.pliEnCours.carteJoueur0 : state1.pliEnCours.carteJoueur1
    expect(champHistorique?.id).toBe(carteJouee.id)

    // Le nouveau tableau générique doit contenir exactement la même carte, au même index
    expect(state1.pliEnCours.cartes?.[ouvreur]?.id).toBe(carteJouee.id)
    // L'autre siège doit rester vide des deux côtés
    const autreSiege = ouvreur === 0 ? 1 : 0
    const autreChampHistorique = autreSiege === 0 ? state1.pliEnCours.carteJoueur0 : state1.pliEnCours.carteJoueur1
    expect(autreChampHistorique).toBeNull()
    expect(state1.pliEnCours.cartes?.[autreSiege]).toBeNull()
  })

  it('après la pose des deux cartes du pli, cartes[] reflète exactement carteJoueur0 et carteJoueur1', () => {
    const { state: state0 } = initialiserPartie(CONFIG_DEFAUT)
    const ouvreur = state0.joueurActif
    const repondeur = ouvreur === 0 ? 1 : 0
    const carteOuvreur = state0.joueurs[ouvreur].main[0]

    const { state: state1 } = jouerCarte(state0, ouvreur, carteOuvreur.id)
    const carteRepondeur = state1.joueurs[repondeur].main[0]
    const { state: state2 } = jouerCarte(state1, repondeur, carteRepondeur.id)

    expect(state2.pliEnCours.cartes?.[0]?.id).toBe(state2.pliEnCours.carteJoueur0?.id)
    expect(state2.pliEnCours.cartes?.[1]?.id).toBe(state2.pliEnCours.carteJoueur1?.id)
    expect(state2.pliEnCours.carteJoueur0).not.toBeNull()
    expect(state2.pliEnCours.carteJoueur1).not.toBeNull()
  })

  it('après résolution du pli (appliquerPli), cartes[] est remis à [null, null] comme carteJoueur0/1', () => {
    const { state: state0 } = initialiserPartie(CONFIG_DEFAUT)
    const ouvreur = state0.joueurActif
    const repondeur = ouvreur === 0 ? 1 : 0
    const carteOuvreur = state0.joueurs[ouvreur].main[0]

    const { state: state1 } = jouerCarte(state0, ouvreur, carteOuvreur.id)
    const carteRepondeur = state1.joueurs[repondeur].main[0]
    const { state: state2 } = jouerCarte(state1, repondeur, carteRepondeur.id)

    const state3 = appliquerPli(state2)

    expect(state3.pliEnCours.carteJoueur0).toBeNull()
    expect(state3.pliEnCours.carteJoueur1).toBeNull()
    expect(state3.pliEnCours.cartes).toEqual([null, null])
  })
})
