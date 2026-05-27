// ============================================================
// TESTS — Stratégie garder les atouts (tous niveaux)
//
// Mode NORMAL (atout défini, toujours actif) :
//   - Ouverture : jouer non-atout si possible
//   - Réponse ordinaire : jouer non-atout si possible
//   - Réponse brisque/important (As, 10) : atout autorisé → fallback
//
// Mode NETTOYAGE (pioche ≤ 50) : même règle, renforcée
//
// Ne s'applique PAS :
//   - Si atout non défini
//   - Si que des atouts en main (obligation)
//   - Les règles couper10/couper-As passent AVANT
// ============================================================

import { describe, it, expect } from 'vitest'
import { choisirCarteIA, SEUIL_GARDER_ATOUTS } from '../../src/core/ia'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur, NiveauIA } from '../../src/types'

// ── Helpers ──────────────────────────────────────────────────

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

const NIVEAUX: NiveauIA[] = ['facile', 'intermediaire', 'difficile']

function makeState(opts: {
  mainIA: Carte[]
  etaleesIA?: Carte[]
  carteOuverte?: Carte | null
  couleurAtout?: Couleur | null
  nbPioche?: number
}): GameState {
  const {
    mainIA, etaleesIA = [], carteOuverte = null,
    couleurAtout = null, nbPioche = 16,
  } = opts
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({
    ...state,
    couleurAtout,
    pliEnCours: {
      carteJoueur0: carteOuverte,
      carteJoueur1: null,
      joueurOuvreur: 0,
    },
    pioche: Array.from({ length: nbPioche }, () => c('spades', '7')),
  })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[1] = { ...joueurs[1], main: mainIA, cartesEtalees: etaleesIA }
  return { ...base, joueurs }
}

// ============================================================
// CONSTANTE EXPORTÉE
// ============================================================

describe('Constante SEUIL_GARDER_ATOUTS exportée', () => {
  it('SEUIL_GARDER_ATOUTS vaut 50', () => {
    expect(SEUIL_GARDER_ATOUTS).toBe(50)
  })
})

// ============================================================
// 1. OUVERTURE — Éviter les atouts
// ============================================================

describe('Ouverture — éviter les atouts si alternative possible', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] atout défini, pioche pleine → joue non-atout en ouverture`, () => {
      const asAtout = c('clubs', 'A')   // atout
      const roiH    = c('hearts', 'K')  // non-atout
      const state = makeState({
        mainIA: [asAtout, roiH],
        couleurAtout: 'clubs',
        nbPioche: 60,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.couleur).not.toBe('clubs')  // pas d'atout
      expect(carte?.id).toBe(roiH.id)
    })

    it(`[${niveau}] pioche ≤ 50 (mode nettoyage) → toujours non-atout en ouverture`, () => {
      const dixAtout = c('clubs', '10')  // atout
      const huitH    = c('hearts', '8') // non-atout
      const state = makeState({
        mainIA: [dixAtout, huitH],
        couleurAtout: 'clubs',
        nbPioche: SEUIL_GARDER_ATOUTS,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.couleur).not.toBe('clubs')
      expect(carte?.id).toBe(huitH.id)
    })

    it(`[${niveau}] que des atouts en main → obligé de jouer un atout`, () => {
      const asAtout  = c('clubs', 'A')
      const roiAtout = c('clubs', 'K')
      const state = makeState({
        mainIA: [asAtout, roiAtout],
        couleurAtout: 'clubs',
        nbPioche: 60,
      })
      // Aucune alternative → doit jouer un atout
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
      expect(carte?.couleur).toBe('clubs')
    })

    it(`[${niveau}] plusieurs non-atouts disponibles → joue le rang minimal`, () => {
      const asAtout = c('clubs', 'A')
      const roiH    = c('hearts', 'K')  // rang 6
      const huitD   = c('diamonds', '8') // rang 2 → minimal
      const state = makeState({
        mainIA: [asAtout, roiH, huitD],
        couleurAtout: 'clubs',
        nbPioche: 30,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(huitD.id)  // rang minimal non-atout
    })
  })
})

// ============================================================
// 2. RÉPONSE ORDINAIRE — Éviter les atouts
// ============================================================

describe('Réponse ordinaire — éviter les atouts (carte ouverte non As/10)', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] réponse à un Roi → joue non-atout si disponible`, () => {
      const roiH    = c('hearts', 'K')   // carte ouverte ordinaire
      const asAtout = c('clubs', 'A')    // atout → à préserver
      const septH   = c('hearts', '7')   // non-atout
      const state = makeState({
        mainIA: [asAtout, septH],
        carteOuverte: roiH,
        couleurAtout: 'clubs',
        nbPioche: 30,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.couleur).not.toBe('clubs')
      expect(carte?.id).toBe(septH.id)
    })

    it(`[${niveau}] réponse à une Dame → ne gaspille pas l'atout`, () => {
      const dameS   = c('spades', 'Q')
      const asAtout = c('clubs', 'A')
      const roiH    = c('hearts', 'K')
      const state = makeState({
        mainIA: [asAtout, roiH],
        carteOuverte: dameS,
        couleurAtout: 'clubs',
        nbPioche: 60,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.couleur).not.toBe('clubs')
    })

    it(`[${niveau}] réponse à un 9 → non-atout préféré`, () => {
      const neufD   = c('diamonds', '9')
      const roiAtout = c('clubs', 'K')
      const huitH   = c('hearts', '8')
      const state = makeState({
        mainIA: [roiAtout, huitH],
        carteOuverte: neufD,
        couleurAtout: 'clubs',
        nbPioche: 20,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.couleur).not.toBe('clubs')
      expect(carte?.id).toBe(huitH.id)
    })
  })
})

// ============================================================
// 3. RÉPONSE BRISQUE/IMPORTANT — Atout autorisé
// ============================================================

describe('Réponse brisque/importante — atout autorisé (As ou 10 adverse)', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] adversaire joue un As → l'IA peut utiliser un atout`, () => {
      const asH     = c('hearts', 'A')   // brisque adverse importante
      const asAtout = c('clubs', 'A')    // atout fort → peut être joué
      const huitD   = c('diamonds', '8') // non-atout
      const state = makeState({
        mainIA: [asAtout, huitD],
        carteOuverte: asH,
        couleurAtout: 'clubs',
        nbPioche: 30,
      })
      // La règle garder-atouts laisse passer → fallback niveau décide
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
      // La carte peut être l'atout (autorisé) ou le non-atout selon le niveau
    })

    it(`[${niveau}] adversaire joue un 10 → l'IA peut utiliser un atout`, () => {
      const dixH    = c('hearts', '10')  // brisque adverse
      const roiAtout = c('clubs', 'K')   // atout → peut être joué
      const neufD   = c('diamonds', '9')
      const state = makeState({
        mainIA: [roiAtout, neufD],
        carteOuverte: dixH,
        couleurAtout: 'clubs',
        nbPioche: 30,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
      // Pas de restriction sur l'atout pour un 10 adverse
    })
  })
})

// ============================================================
// 4. ATOUT NON DÉFINI — Règle inactive
// ============================================================

describe('Atout non défini — stratégie garder-atouts inactive', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] sans atout défini → comportement normal (pas de restriction)`, () => {
      const roiH = c('hearts', 'K')
      const roiS = c('spades', 'K')
      const state = makeState({
        mainIA: [roiH, roiS],
        couleurAtout: null,  // pas d'atout
        nbPioche: 30,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
      // Pas de restriction → carte valide
    })
  })
})

// ============================================================
// 5. PIOCHE ≤ 50 — MODE NETTOYAGE
// ============================================================

describe('Mode nettoyage — pioche ≤ 50', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] pioche = 50 → non-atout préféré en ouverture`, () => {
      const asAtout = c('clubs', 'A')
      const huitH   = c('hearts', '8')
      const state = makeState({
        mainIA: [asAtout, huitH],
        couleurAtout: 'clubs',
        nbPioche: 50,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(huitH.id)
    })

    it(`[${niveau}] pioche = 1 → non-atout préféré en ouverture`, () => {
      const dixAtout = c('clubs', '10')
      const roiH     = c('hearts', 'K')
      const state = makeState({
        mainIA: [dixAtout, roiH],
        couleurAtout: 'clubs',
        nbPioche: 1,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(roiH.id)
    })

    it(`[${niveau}] pioche = 51 → règle aussi active (atout défini)`, () => {
      const asAtout = c('clubs', 'A')
      const neufH   = c('hearts', '9')
      const state = makeState({
        mainIA: [asAtout, neufH],
        couleurAtout: 'clubs',
        nbPioche: 51,
      })
      // Règle active dès que l'atout est défini
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(neufH.id)
    })
  })
})

// ============================================================
// 6. PRIORITÉS — couper10 > garder-atouts
// ============================================================

describe('Priorités — couper10 reste prioritaire sur garder-atouts', () => {

  // Facile peut rater couper10 → tester uniquement intermédiaire/difficile
  ;(['intermediaire', 'difficile'] as NiveauIA[]).forEach(niveau => {

    it(`[${niveau}] couper le 10 avec As → joue l'As même si c'est un atout`, () => {
      const dixH    = c('hearts', '10')   // 10 adverse → couper10 s'active
      const asH     = c('hearts', 'A')    // As même couleur → couper10 règle A.2
      const roiAtout = c('clubs', 'K')    // atout à préserver
      const state = makeState({
        mainIA: [asH, roiAtout],
        carteOuverte: dixH,
        couleurAtout: 'clubs',
        nbPioche: 30,
      })
      // strategieCouper10 passe AVANT garder-atouts
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asH.id)
    })
  })
})

// ============================================================
// 7. NON-RÉGRESSION
// ============================================================

describe('Non-régression — fonctionnalités existantes préservées', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] retourne null si aucun candidat`, () => {
      const state = makeState({ mainIA: [], couleurAtout: 'clubs', nbPioche: 30 })
      expect(choisirCarteIA(state, niveau)).toBeNull()
    })

    it(`[${niveau}] carte retournée toujours dans la main`, () => {
      const main = [c('clubs', 'A'), c('hearts', 'K'), c('diamonds', '8')]
      const ids  = new Set(main.map(c => c.id))
      for (let i = 0; i < 20; i++) {
        const state = makeState({
          mainIA: [...main],
          couleurAtout: 'clubs',
          nbPioche: 30,
        })
        const carte = choisirCarteIA(state, niveau)
        if (carte) expect(ids.has(carte.id)).toBe(true)
      }
    })
  })

  it('[intermediaire] couper le 10 toujours actif', () => {
    const dix = c('hearts', '10')
    const as  = c('hearts', 'A')
    const state = makeState({
      mainIA: [as, c('clubs', '8')],
      carteOuverte: dix,
      couleurAtout: 'clubs',
      nbPioche: 30,
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(as.id)
  })

  it('[difficile] pré-atout actif quand atout non défini + ouverture', () => {
    const sept = c('hearts', '7')
    const roi  = c('spades', 'K')
    const state = makeState({
      mainIA: [sept, roi],
      couleurAtout: null,  // pas d'atout → pré-atout actif
      nbPioche: 30,
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.id).toBe(sept.id)
  })

  it('[tous] étalées en réponse toujours actives', () => {
    NIVEAUX.forEach(niveau => {
      const roiH    = c('hearts', 'K')    // ouverte
      const asEtale = c('hearts', 'A')    // étalé → gagne
      const asAtout = c('clubs', 'A')     // atout → garder
      const state = makeState({
        mainIA: [asAtout],
        etaleesIA: [asEtale],
        carteOuverte: roiH,
        couleurAtout: 'clubs',
        nbPioche: 30,
      })
      // Garder-atouts évite l'atout en réponse ordinaire (Roi)
      // mais étalées-réponse joue l'As étalé non-atout
      // → ces deux règles sont cohérentes (As étalé hearts n'est pas l'atout clubs)
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
    })
  })
})
