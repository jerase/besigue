// ============================================================
// TESTS — cartesUtilesAuxCombis enrichie avec priorités
//
// Ordre de protection selon besigue annoncé ou non :
//
// Bésigue NON annoncé :
//   mariage_atout > quinte > 4_as > 1er_besigue > 4_rois > 4_dames > 4_valets
//
// Bésigue déjà annoncé :
//   mariage_atout > quinte > 4_as > 4_rois > 4_dames > 4_valets > besigue_suivant
//
// Règle quinte : mariage_atout annoncé → protéger As, 10, Valet atout en main
// Règle carré  : protéger si 3+ cartes du même rang
// ============================================================

import { describe, it, expect } from 'vitest'
import { choisirCarteIA } from '../../src/core/ia'
import { cartesUtilesAuxCombis } from '../../src/core/ia/helpers'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur, NiveauIA, AnnoncePosee } from '../../src/types'

// ── Helpers ──────────────────────────────────────────────────

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

const NIVEAUX: NiveauIA[] = ['facile', 'intermediaire', 'difficile']

function annonce(nom: AnnoncePosee['nom'], cartesIds: string[] = []): AnnoncePosee {
  return { joueurId: 1, nom, cartesIds, points: 0, mancheNumero: 1 }
}

function makeState(opts: {
  mainIA: Carte[]
  etaleesIA?: Carte[]
  carteOuverte?: Carte | null
  couleurAtout?: Couleur | null
  nbPioche?: number
  annonces?: AnnoncePosee[]
  premierBesiguePose?: boolean
}): GameState {
  const {
    mainIA, etaleesIA = [], carteOuverte = null,
    couleurAtout = null, nbPioche = 16,
    annonces: annoncesInit = [], premierBesiguePose = false,
  } = opts

  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({
    ...state,
    couleurAtout,
    premierBesiguePose,
    pliEnCours: {
      carteJoueur0: carteOuverte,
      carteJoueur1: null,
      joueurOuvreur: 0,
    },
    pioche: Array.from({ length: nbPioche }, () => c('spades', '7')),
  })
  // NOTE : initialiserChampsIT4 réinitialise `annonces` à [] de façon
  // inconditionnelle ; on l'applique donc APRÈS l'appel, sans quoi ce
  // paramètre serait silencieusement ignoré.
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[1] = { ...joueurs[1], main: mainIA, cartesEtalees: etaleesIA }
  return { ...base, joueurs, annonces: annoncesInit }
}

// ============================================================
// 1. PRIORITÉ 1 — MARIAGE D'ATOUT
// ============================================================

describe('Priorité 1 — Mariage d\'atout (Roi + Dame)', () => {

  // Facile : random → tester intermédiaire et difficile pour les comportements déterministes
  ;(['intermediaire', 'difficile'] as NiveauIA[]).forEach(niveau => {

    it(`[${niveau}] protège Roi ET Dame d'atout en ouverture`, () => {
      const roiAtout  = c('clubs', 'K')   // mariage atout → protéger
      const dameAtout = c('clubs', 'Q')   // mariage atout → protéger
      const huitH     = c('hearts', '8')  // sacrifiable
      const state = makeState({
        mainIA: [roiAtout, dameAtout, huitH],
        couleurAtout: 'clubs',
        nbPioche: 20,
      })
      const carte = choisirCarteIA(state, niveau)
      // Ne doit jouer ni le Roi ni la Dame d'atout
      expect(carte?.id).not.toBe(roiAtout.id)
      expect(carte?.id).not.toBe(dameAtout.id)
      expect(carte?.id).toBe(huitH.id)
    })

    it(`[${niveau}] protège Dame d'atout même si Roi étalé`, () => {
      const dameAtout = c('clubs', 'Q')   // en main → à protéger
      const roiAtout  = c('clubs', 'K')   // en étalées
      const neufH     = c('hearts', '9')
      const state = makeState({
        mainIA: [dameAtout, neufH],
        etaleesIA: [roiAtout],
        couleurAtout: 'clubs',
        nbPioche: 20,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).not.toBe(dameAtout.id)
      expect(carte?.id).toBe(neufH.id)
    })
  })
})

// ============================================================
// 2. PRIORITÉ 2 — QUINTE (mariage atout annoncé)
// ============================================================

describe('Priorité 2 — Quinte : pièces manquantes protégées si mariage annoncé', () => {

  ;(['intermediaire', 'difficile'] as NiveauIA[]).forEach(niveau => {

    it(`[${niveau}] mariage annoncé → protège As d'atout en main`, () => {
      const dameA  = c('clubs', 'Q')   // étalée (mariage annoncé)
      const roiA   = c('clubs', 'K')   // étalé
      const asA    = c('clubs', 'A')   // en main → pièce quinte → protéger
      const huitH  = c('hearts', '8')
      const roiAtoutId = roiA.id
      const dameAtoutId = dameA.id
      const state = makeState({
        mainIA: [asA, huitH],
        etaleesIA: [roiA, dameA],
        couleurAtout: 'clubs',
        annonces: [annonce('mariage_atout', [roiAtoutId, dameAtoutId])],
        nbPioche: 20,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).not.toBe(asA.id)
      expect(carte?.id).toBe(huitH.id)
    })

    it(`[${niveau}] mariage annoncé → protège Valet d'atout en main`, () => {
      const valetA = c('clubs', 'J')   // pièce quinte → protéger
      const huitH  = c('hearts', '8')
      const state = makeState({
        mainIA: [valetA, huitH],
        couleurAtout: 'clubs',
        annonces: [annonce('mariage_atout')],
        nbPioche: 20,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).not.toBe(valetA.id)
      expect(carte?.id).toBe(huitH.id)
    })

    it(`[${niveau}] mariage annoncé → protège 10 d'atout en main`, () => {
      const dixA  = c('clubs', '10')
      const huitH = c('hearts', '8')
      const state = makeState({
        mainIA: [dixA, huitH],
        couleurAtout: 'clubs',
        annonces: [annonce('mariage_atout')],
        nbPioche: 20,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).not.toBe(dixA.id)
      expect(carte?.id).toBe(huitH.id)
    })

    it(`[${niveau}] sans mariage annoncé : quinte protégée seulement si As+10+Valet présents`, () => {
      const asA    = c('clubs', 'A')
      const dixA   = c('clubs', '10')
      const valetA = c('clubs', 'J')
      const huitH  = c('hearts', '8')
      const state = makeState({
        mainIA: [asA, dixA, valetA, huitH],
        couleurAtout: 'clubs',
        annonces: [],  // pas de mariage annoncé
        nbPioche: 20,
      })
      const carte = choisirCarteIA(state, niveau)
      // Les 3 pièces sont présentes → quinte potentielle → protéger
      expect([asA.id, dixA.id, valetA.id]).not.toContain(carte?.id)
      expect(carte?.id).toBe(huitH.id)
    })

    it(`[${niveau}] sans mariage et pièce manquante : quinte non protégée`, () => {
      const asA   = c('clubs', 'A')
      const dixA  = c('clubs', '10')
      // Valet manquant → quinte incomplète → pas de protection
      const huitH = c('hearts', '8')
      const state = makeState({
        mainIA: [asA, dixA, huitH],
        couleurAtout: 'clubs',
        annonces: [],
        nbPioche: 20,
      })
      const carte = choisirCarteIA(state, niveau)
      // Pas de protection quinte → peut jouer l'As ou le 10 (selon d'autres règles)
      expect(carte).not.toBeNull()
    })
  })
})

// ============================================================
// 3. PRIORITÉ 3 — 4 AS
// ============================================================

describe('Priorité 3 — 4 As (3+ en main/étalées → protéger)', () => {

  ;(['intermediaire', 'difficile'] as NiveauIA[]).forEach(niveau => {

    it(`[${niveau}] 3 As présents → protégés`, () => {
      const as1   = c('hearts', 'A', 0)
      const as2   = c('spades', 'A', 0)
      const as3   = c('diamonds', 'A', 0)
      const huitH = c('clubs', '8')
      const state = makeState({
        mainIA: [as1, as2, as3, huitH],
        couleurAtout: 'hearts',
        nbPioche: 20,
      })
      const carte = choisirCarteIA(state, niveau)
      expect([as1.id, as2.id, as3.id]).not.toContain(carte?.id)
      expect(carte?.id).toBe(huitH.id)
    })

    it(`[${niveau}] 2 As seulement → non protégés (pas encore 3)`, () => {
      const as1   = c('hearts', 'A', 0)
      const as2   = c('spades', 'A', 0)
      const huitH = c('clubs', '8')
      const state = makeState({
        mainIA: [as1, as2, huitH],
        couleurAtout: 'hearts',
        nbPioche: 20,
      })
      const carte = choisirCarteIA(state, niveau)
      // Pas de protection → comportement normal
      expect(carte).not.toBeNull()
    })
  })
})

// ============================================================
// 4. PRIORITÉ 4 — PREMIER BÉSIGUE (non encore annoncé)
// ============================================================

describe('Priorité 4 — Premier bésigue (si non encore annoncé)', () => {

  ;(['intermediaire', 'difficile'] as NiveauIA[]).forEach(niveau => {

    it(`[${niveau}] Dame♠ + Valet♦ présents → protégés si bésigue non annoncé`, () => {
      const dameS  = c('spades', 'Q')
      const valetD = c('diamonds', 'J')
      const huitH  = c('hearts', '8')
      const state = makeState({
        mainIA: [dameS, valetD, huitH],
        couleurAtout: 'clubs',
        premierBesiguePose: false,
        annonces: [],
        nbPioche: 20,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).not.toBe(dameS.id)
      expect(carte?.id).not.toBe(valetD.id)
      expect(carte?.id).toBe(huitH.id)
    })

    it(`[${niveau}] 1er bésigue déjà annoncé → Dame♠+Valet♦ descendent en priorité 8`, () => {
      const dameS  = c('spades', 'Q')
      const valetD = c('diamonds', 'J')
      const roiH   = c('hearts', 'K')   // sacrifiable (pas de mariage atout)
      const state = makeState({
        mainIA: [dameS, valetD, roiH],
        couleurAtout: 'clubs',
        premierBesiguePose: true,
        annonces: [annonce('besigue', [dameS.id, valetD.id])],
        nbPioche: 20,
      })
      // Bésigue annoncé → priorité 8 (basse) → Dame♠+Valet♦ moins protégés
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
      // Le Roi n'est pas un mariage (pas de Dame de même couleur) → peut être joué
    })
  })

  // Tests directs de cartesUtilesAuxCombis : dans le pipeline complet,
  // strategieGarderAtouts intercepte systématiquement dès qu'une carte
  // non-atout est disponible (huitH ci-dessus), avant même de consulter
  // cartesUtiles. On teste donc ici la fonction en isolation, comme le
  // permet son statut de fonction exportée.
  it('Priorité 4 (isolation) : Dame♠+Valet♦ marqués utiles si bésigue non annoncé', () => {
    const dameS  = c('spades', 'Q')
    const valetD = c('diamonds', 'J')
    const huitH  = c('hearts', '8')
    const state = makeState({
      mainIA: [dameS, valetD, huitH],
      couleurAtout: 'clubs',
      premierBesiguePose: false,
      annonces: [],
    })
    const utiles = cartesUtilesAuxCombis(state, 1)
    expect(utiles.has(dameS.id)).toBe(true)
    expect(utiles.has(valetD.id)).toBe(true)
    expect(utiles.has(huitH.id)).toBe(false)
  })

  it('Priorité 4 (isolation) : ni Dame♠ ni Valet♦ seul ne suffit', () => {
    const dameS  = c('spades', 'Q')
    const roiH   = c('hearts', 'K')
    const state = makeState({
      mainIA: [dameS, roiH],
      couleurAtout: 'clubs',
      premierBesiguePose: false,
      annonces: [],
    })
    const utiles = cartesUtilesAuxCombis(state, 1)
    expect(utiles.has(dameS.id)).toBe(false)
  })

  it('Priorité 8 (isolation) : Dame♠+Valet♦ marqués utiles si 1er bésigue déjà annoncé (par ce joueur)', () => {
    const dameS  = c('spades', 'Q')
    const valetD = c('diamonds', 'J')
    const state = makeState({
      mainIA: [dameS, valetD],
      couleurAtout: 'clubs',
      premierBesiguePose: true,
      annonces: [annonce('besigue', [dameS.id, valetD.id])],
    })
    const utiles = cartesUtilesAuxCombis(state, 1)
    expect(utiles.has(dameS.id)).toBe(true)
    expect(utiles.has(valetD.id)).toBe(true)
  })
})

// ============================================================
// 5. PRIORITÉS 5/6/7 — 4 ROIS, DAMES, VALETS
// ============================================================

describe('Priorités 5-7 — 4 Rois, Dames, Valets (3+ → protéger)', () => {

  ;(['intermediaire', 'difficile'] as NiveauIA[]).forEach(niveau => {

    it(`[${niveau}] 3 Rois présents → protégés`, () => {
      const roi1  = c('hearts', 'K', 0)
      const roi2  = c('spades', 'K', 0)
      const roi3  = c('clubs',  'K', 0)
      const huitD = c('diamonds', '8')
      const state = makeState({
        mainIA: [roi1, roi2, roi3, huitD],
        couleurAtout: 'hearts',
        nbPioche: 20,
      })
      const carte = choisirCarteIA(state, niveau)
      expect([roi1.id, roi2.id, roi3.id]).not.toContain(carte?.id)
      expect(carte?.id).toBe(huitD.id)
    })

    it(`[${niveau}] 3 Valets présents → protégés`, () => {
      const valet1 = c('hearts', 'J', 0)
      const valet2 = c('spades', 'J', 0)
      const valet3 = c('clubs',  'J', 0)
      const huitD  = c('diamonds', '8')
      const state = makeState({
        mainIA: [valet1, valet2, valet3, huitD],
        couleurAtout: 'hearts',
        nbPioche: 20,
      })
      const carte = choisirCarteIA(state, niveau)
      expect([valet1.id, valet2.id, valet3.id]).not.toContain(carte?.id)
      expect(carte?.id).toBe(huitD.id)
    })
  })
})

// ============================================================
// 6. NON-RÉGRESSION
// ============================================================

describe('Non-régression — fonctionnalités existantes préservées', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] retourne null si aucun candidat`, () => {
      const state = makeState({ mainIA: [], couleurAtout: 'clubs' })
      expect(choisirCarteIA(state, niveau)).toBeNull()
    })

    it(`[${niveau}] carte toujours dans la main`, () => {
      const main = [c('clubs', 'K'), c('hearts', '8'), c('spades', 'Q')]
      const ids  = new Set(main.map(c => c.id))
      for (let i = 0; i < 20; i++) {
        const state = makeState({ mainIA: [...main], couleurAtout: 'clubs' })
        const carte = choisirCarteIA(state, niveau)
        if (carte) expect(ids.has(carte.id)).toBe(true)
      }
    })
  })

  it('[intermediaire] couper10 prioritaire sur protection combis', () => {
    const dix   = c('hearts', '10')
    const asH   = c('hearts', 'A')   // coupe le 10
    const roiA  = c('clubs',  'K')   // mariage atout → protégé normalement
    const dameA = c('clubs',  'Q')
    const state = makeState({
      mainIA: [asH, roiA, dameA],
      carteOuverte: dix,
      couleurAtout: 'clubs',
    })
    // strategieCouper10 > protection combis
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(asH.id)
  })

  it('[difficile] mariages non-atout toujours protégés (comportement existant)', () => {
    const roiH  = c('hearts', 'K')
    const dameH = c('hearts', 'Q')
    const huitS = c('spades', '8')
    const state = makeState({
      mainIA: [roiH, dameH, huitS],
      couleurAtout: 'clubs',  // hearts n'est pas l'atout
      nbPioche: 20,
    })
    const carte = choisirCarteIA(state, 'difficile')
    // Mariage hearts potentiel → protéger (comportement existant enrichi)
    expect(carte?.id).toBe(huitS.id)
  })

  it('[intermediaire] sans atout défini : combis hors-atout protégées', () => {
    const roiH  = c('hearts', 'K')
    const dameH = c('hearts', 'Q')
    const huitS = c('spades', '8')
    const state = makeState({
      mainIA: [roiH, dameH, huitS],
      couleurAtout: null,
      nbPioche: 20,
    })
    // pré-atout actif (pas d'atout) → joue le 8 (carte faible)
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(huitS.id)
  })
})
