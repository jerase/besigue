// ============================================================
// TESTS — Piste 1 : Mode AGRESSIF conditionné à l'objectif de 16 brisques
//
// Avant piste 1 : dès que modeAgressif était actif (adversaire mené 3-0),
// l'IA sacrifiait systématiquement toute carte protégée par une
// combinaison en cours pour capturer une brisque supplémentaire — même
// une fois l'objectif de 16 brisques déjà garanti (égalité minimale de
// fin de manche déjà assurée, cf. anticipation.ts).
//
// Après piste 1 : le sacrifice de cartes protégées ne se déclenche plus
// que si l'objectif de 16 brisques n'est pas encore atteint
// (modeAgressifActif = modeAgressif && objectifBrisques?.mode !== 'atteint').
// Une fois l'objectif atteint, le comportement retombe sur la cascade
// normale (préservation des combinaisons, cf. gagnantsSansUtiles).
//
// Ce fichier vérifie à la fois le nouveau comportement ET la
// non-régression du comportement agressif existant (objectif non
// atteint → sacrifice toujours possible, comme avant).
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { choisirCarteIA } from '../../src/core/ia'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { OBJECTIF_BRISQUES } from '../../src/core/ia/anticipation'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

// ── Helpers (mêmes conventions que tests/unit/ia_difficile_v2.test.ts) ──

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

function makeState(opts: {
  mainIA: Carte[]
  etaleesIA?: Carte[]
  carteOuverte?: Carte | null
  couleurAtout?: Couleur | null
  nbPioche?: number
  compteurManches?: [number, number]
  pileHumain?: Carte[]
  pileIA?: Carte[]
}): GameState {
  const {
    mainIA, etaleesIA = [], carteOuverte = null,
    couleurAtout = null, nbPioche = 16,
    compteurManches = [0, 0],
    pileHumain = [], pileIA = [],
  } = opts

  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({
    ...state,
    couleurAtout,
    compteurManches,
    pliEnCours: {
      carteJoueur0: carteOuverte,
      carteJoueur1: null,
      joueurOuvreur: 0,
      cartes: [carteOuverte, null],
    },
    pioche: Array.from({ length: nbPioche }, () => c('clubs', '7')),
  })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], pileRemportee: pileHumain }
  joueurs[1] = { ...joueurs[1], main: mainIA, cartesEtalees: etaleesIA, pileRemportee: pileIA }
  return { ...base, joueurs }
}

/**
 * Construit une pile de N brisques (As/10) pour la pile remportée de
 * l'IA, réparties sur les 4 couleurs afin de ne jamais dépasser NB_JEUX
 * (4) exemplaires d'une même carte (rang+couleur).
 */
function pileDeBrisques(n: number): Carte[] {
  const couleurs: Couleur[] = ['clubs', 'hearts', 'diamonds', 'spades']
  const rangs: Carte['rang'][] = ['A', '10']
  const pile: Carte[] = []
  let jeu = 0
  outer: for (let r = 0; r < rangs.length; r++) {
    for (let col = 0; col < couleurs.length; col++) {
      for (let copie = 0; copie < 2; copie++) {
        if (pile.length >= n) break outer
        pile.push(c(couleurs[col], rangs[r], jeu))
        jeu = (jeu + 1) % 4
      }
    }
  }
  return pile
}

describe('Piste 1 — objectif de 16 brisques déjà atteint → mode agressif ne sacrifie plus une combinaison', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sanity check : pileDeBrisques(16) contient bien 16 brisques', () => {
    expect(pileDeBrisques(16).length).toBe(OBJECTIF_BRISQUES)
  })

  it(
    "en réponse à une brisque, objectif ATTEINT (16 brisques) : préfère une carte gagnante " +
    "NON protégée plutôt que de sacrifier une pièce de quinte (A/10/J d'atout)",
    () => {
      const asHumain = c('hearts', 'A') // brisque adverse (non-atout) à capturer

      // Trio A+10+J d'atout en main IA (sans mariage_atout annoncé) →
      // protégé comme "quinte potentielle" par cartesUtilesAuxCombis
      // (cf. tableCombinaisons.ts : toutesPresentesEnMain).
      const asAtoutProtege    = c('clubs', 'A')      // rang 8 — le plus fort
      const dixAtoutProtege   = c('clubs', '10', 1)
      const valetAtoutProtege = c('clubs', 'J')      // rang 4 — le plus faible du trio

      // Dame d'atout SEULE (pas de Roi de même couleur en main) : gagnante
      // contre l'As de cœur (atout bat non-atout) mais NON protégée (pas
      // de mariage_atout possible sans Roi, pas partie de la quinte).
      const dameAtoutLibre = c('clubs', 'Q') // rang 5

      const state = makeState({
        mainIA: [asAtoutProtege, dixAtoutProtege, valetAtoutProtege, dameAtoutLibre],
        carteOuverte: asHumain,
        couleurAtout: 'clubs',
        compteurManches: [0, 3], // adversaire mène 3-0 → modeAgressif = true
        pileIA: pileDeBrisques(16), // objectif de 16 brisques déjà garanti
      })

      const carte = choisirCarteIA(state, 'difficile')

      // Ne sacrifie plus aucune pièce de la quinte protégée...
      expect(carte?.id).not.toBe(asAtoutProtege.id)
      expect(carte?.id).not.toBe(dixAtoutProtege.id)
      expect(carte?.id).not.toBe(valetAtoutProtege.id)
      // ...et choisit la carte gagnante non protégée disponible.
      expect(carte?.id).toBe(dameAtoutLibre.id)
    }
  )

  it(
    'non-régression : objectif NON atteint (0 brisque) → le mode agressif sacrifie ' +
    "toujours la pièce de quinte si c'est la carte gagnante la moins coûteuse (comportement historique)",
    () => {
      // Neutralise la variation de style D.4 (probabiliste, 5-10%) pour
      // isoler déterministement le comportement du mode agressif lui-même.
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      const asHumain = c('hearts', 'A')
      const asAtoutProtege    = c('clubs', 'A')
      const dixAtoutProtege   = c('clubs', '10', 1)
      const valetAtoutProtege = c('clubs', 'J') // rang minimal parmi tous les gagnants
      const dameAtoutLibre    = c('clubs', 'Q')

      const state = makeState({
        mainIA: [asAtoutProtege, dixAtoutProtege, valetAtoutProtege, dameAtoutLibre],
        carteOuverte: asHumain,
        couleurAtout: 'clubs',
        compteurManches: [0, 3], // adversaire mène 3-0 → modeAgressif = true
        pileIA: [], // objectif encore loin (0/16) → modeAgressifActif reste vrai
      })

      const carte = choisirCarteIA(state, 'difficile')

      // Comportement historique préservé : gagne coûte que coûte avec la
      // carte gagnante de rang minimal, protection ignorée.
      expect(carte?.id).toBe(valetAtoutProtege.id)
    }
  )

  it(
    "objectif ATTEINT mais aucune carte gagnante non protégée disponible : " +
    'retombe sur la sélection au rang minimal parmi les cartes protégées (comme le mode normal)',
    () => {
      // Neutralise la variation de style D.4 : ce test isole le repli
      // "rang minimal", pas le comportement probabiliste de D.4 (qui a
      // désormais accès à ce chemin depuis la piste 1, puisque
      // modeAgressifActif=false ici lève la condition `!modeAgressifActif`).
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      const asHumain = c('hearts', 'A')
      const asAtoutProtege    = c('clubs', 'A')
      const dixAtoutProtege   = c('clubs', '10', 1)
      const valetAtoutProtege = c('clubs', 'J') // rang minimal → doit être choisi par repli

      const state = makeState({
        mainIA: [asAtoutProtege, dixAtoutProtege, valetAtoutProtege],
        carteOuverte: asHumain,
        couleurAtout: 'clubs',
        compteurManches: [0, 3],
        pileIA: pileDeBrisques(16),
      })

      const carte = choisirCarteIA(state, 'difficile')

      // Toutes les cartes gagnantes sont protégées → repli identique au
      // mode normal (carteAvecRangMinimal parmi `gagnants`).
      expect(carte?.id).toBe(valetAtoutProtege.id)
    }
  )

  it('mode PRUDENT (IA mène 3-0) reste inchangé par la piste 1 (hors de son périmètre)', () => {
    const asHumain = c('hearts', 'A')
    const asAtout  = c('clubs', 'A')
    const dixAtout = c('clubs', '10', 1)
    const valetAtout = c('clubs', 'J')
    const state = makeState({
      mainIA: [asAtout, dixAtout, valetAtout, c('spades', '8')],
      carteOuverte: asHumain,
      couleurAtout: 'clubs',
      compteurManches: [3, 0], // IA mène → mode prudent, jamais agressif
    })
    const carte = choisirCarteIA(state, 'difficile')
    // Mode prudent : ne sacrifie pas la quinte, laisse passer la brisque
    expect(carte?.id).not.toBe(asAtout.id)
    expect(carte?.id).not.toBe(dixAtout.id)
    expect(carte?.id).not.toBe(valetAtout.id)
  })

  it('situation normale (1-1, aucun mode spécial) reste inchangée par la piste 1', () => {
    const asHumain = c('hearts', 'A')
    const asAtout  = c('clubs', 'A')
    const dixAtout = c('clubs', '10', 1)
    const valetAtout = c('clubs', 'J')
    const state = makeState({
      mainIA: [asAtout, dixAtout, valetAtout],
      carteOuverte: asHumain,
      couleurAtout: 'clubs',
      compteurManches: [1, 1],
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
  })
})
