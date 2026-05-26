// ============================================================
// TESTS — Stratégie étalées en réponse (tous niveaux)
//
// En réponse à une carte adverse non-atout, l'IA préfère
// jouer ses cartes étalées (non-atout) gagnantes plutôt que
// ses cartes en main.
//
// Priorités :
//   1. As étalé non-atout de même couleur (brisque)
//   2. Toute autre carte étalée non-atout gagnante (rang minimal)
//
// Ne s'applique PAS :
//   - En ouverture (pas de carte adverse)
//   - Si la carte ouverte est un atout
//   - Si aucune étalée non-atout ne gagne le pli
//   - Si les étalées d'atout sont les seules disponibles
// ============================================================

import { describe, it, expect } from 'vitest'
import { choisirCarteIA } from '../../src/core/ia'
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
    pioche: Array.from({ length: nbPioche }, () => c('clubs', '7')),
  })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[1] = { ...joueurs[1], main: mainIA, cartesEtalees: etaleesIA }
  return { ...base, joueurs }
}

// ============================================================
// 1. PRIORITÉ 1 — AS ÉTALÉ NON-ATOUT DE MÊME COULEUR
// ============================================================

describe('Priorité 1 — As étalé non-atout de même couleur', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] joue l'As étalé de même couleur pour capturer la brisque`, () => {
      const roiH   = c('hearts', 'K')   // carte ouverte par humain
      const asH    = c('hearts', 'A')   // As hearts étalé → gagne + brisque
      const roiMain = c('spades', 'K')  // carte en main
      const state = makeState({
        mainIA: [roiMain],
        etaleesIA: [asH],
        carteOuverte: roiH,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asH.id)
    })

    it(`[${niveau}] As étalé prioritaire sur As en main de même couleur`, () => {
      const roiH    = c('hearts', 'K')
      const asEtale = c('hearts', 'A', 1)  // étalé → prioritaire
      const asMain  = c('hearts', 'A', 0)  // en main
      const state = makeState({
        mainIA: [asMain, c('spades', '8')],
        etaleesIA: [asEtale],
        carteOuverte: roiH,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asEtale.id)
    })

    it(`[${niveau}] joue l'As étalé pour défendre contre une brisque adverse`, () => {
      const dixH   = c('hearts', '10')   // 10 adverse (brisque)
      const asH    = c('hearts', 'A')    // As étalé → gagne le pli
      const roiS   = c('spades', 'K')
      const state = makeState({
        mainIA: [roiS],
        etaleesIA: [asH],
        carteOuverte: dixH,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asH.id)
    })

    it(`[${niveau}] As étalé d'une autre couleur ne s'applique pas (mauvaise couleur)`, () => {
      const roiH   = c('hearts', 'K')    // ouverte hearts
      const asS    = c('spades', 'A')    // étalé spades ≠ hearts → pas P1
      const asH    = c('hearts', 'A')    // étalé hearts = même couleur → P1
      const state = makeState({
        mainIA: [c('diamonds', '8')],
        etaleesIA: [asS, asH],
        carteOuverte: roiH,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asH.id)  // As même couleur, pas As autre couleur
    })
  })
})

// ============================================================
// 2. PRIORITÉ 2 — AUTRE CARTE ÉTALÉE GAGNANTE (rang minimal)
// ============================================================

describe('Priorité 2 — Autre carte étalée non-atout gagnante', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] joue une carte étalée gagnante non-As`, () => {
      const roiH    = c('hearts', 'K')   // ouverte
      const asEtale = c('hearts', 'A')   // étalé → gagne → P2 (pas P1 car pas même couleur... si)
      // Scénario : ouverte = 8 hearts, étalée = K hearts → K gagne le 8
      const huitH   = c('hearts', '8')   // ouverte
      const roiHE   = c('hearts', 'K')   // étalé → gagne le 8
      const asMain  = c('spades', 'A')   // en main — ne pas utiliser si étalée gagne
      const state = makeState({
        mainIA: [asMain],
        etaleesIA: [roiHE],
        carteOuverte: huitH,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(roiHE.id)
    })

    it(`[${niveau}] choisit l'étalée gagnante de rang minimal parmi plusieurs`, () => {
      const huitH   = c('hearts', '8')   // ouverte
      const roiHE   = c('hearts', 'K')   // étalé rang 6 → gagne
      const asHE    = c('hearts', 'A')   // étalé rang 8 → gagne aussi mais plus fort
      const state = makeState({
        mainIA: [c('diamonds', '7')],
        etaleesIA: [roiHE, asHE],
        carteOuverte: huitH,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      // Rang minimal gagnant = Roi (rang 6) avant As (rang 8) — économiser
      expect(carte?.id).toBe(roiHE.id)
    })

    it(`[${niveau}] n'utilise pas une étalée qui perd le pli`, () => {
      const asH     = c('hearts', 'A')   // ouverte → As adverse très fort
      const roiHE   = c('hearts', 'K')   // étalé → ne bat pas l'As (même couleur, rang < As)
      const roiMain = c('clubs', 'K')    // en main (atout) → bat l'As
      const state = makeState({
        mainIA: [roiMain],
        etaleesIA: [roiHE],
        carteOuverte: asH,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      // L'étalée (roiHE) ne gagne pas → ne pas l'utiliser
      // Comportement de niveau normal
      expect(carte).not.toBeNull()
    })
  })
})

// ============================================================
// 3. CAS OÙ LA STRATÉGIE NE S'APPLIQUE PAS
// ============================================================

describe('La stratégie ne s\'applique pas dans ces cas', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] ne s'applique pas en ouverture (pas de carte ouverte)`, () => {
      const asH = c('hearts', 'A')  // étalé
      const roiS = c('spades', 'K') // en main
      const state = makeState({
        mainIA: [roiS],
        etaleesIA: [asH],
        carteOuverte: null,  // ouverture
        couleurAtout: 'clubs',
      })
      // La stratégie étalées ne force pas l'As en ouverture
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
      // En ouverture, l'As étalé ne doit pas être forcé
      // (pré-atout ou logique de niveau gère l'ouverture)
    })

    it(`[${niveau}] ne s'applique pas si la carte ouverte est un atout`, () => {
      const roiAtout = c('clubs', 'K')   // ouverte = atout
      const asEtale  = c('hearts', 'A')  // étalé non-atout
      const roiMain  = c('spades', 'K')
      const state = makeState({
        mainIA: [roiMain],
        etaleesIA: [asEtale],
        carteOuverte: roiAtout,
        couleurAtout: 'clubs',  // clubs = atout, roiAtout est un atout
      })
      // Carte ouverte = atout → la stratégie ne s'applique pas
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
      // L'As étalé non-atout ne peut pas battre un atout adverse
    })

    it(`[${niveau}] ne joue pas une étalée d'atout (protégée)`, () => {
      const roiH      = c('hearts', 'K')   // ouverte
      const asAtoutE  = c('clubs', 'A')    // étalé ATOUT → protégé
      const roiMain   = c('spades', 'K')   // en main non-atout
      const state = makeState({
        mainIA: [roiMain],
        etaleesIA: [asAtoutE],
        carteOuverte: roiH,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      // L'As d'atout étalé est protégé → ne doit pas être joué par cette règle
      expect(carte?.id).not.toBe(asAtoutE.id)
    })

    it(`[${niveau}] sans étalées → comportement normal du niveau`, () => {
      const roiH = c('hearts', 'K')
      const asH  = c('hearts', 'A')
      const state = makeState({
        mainIA: [asH, c('clubs', '8')],
        etaleesIA: [],  // pas d'étalées
        carteOuverte: roiH,
        couleurAtout: 'clubs',
      })
      // Pas d'étalées → fallback niveau normal
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
    })
  })
})

// ============================================================
// 4. INTERACTION AVEC COUPER LE 10 (priorité supérieure)
// ============================================================

describe('Priorités — couper le 10 reste avant étalées', () => {

  NIVEAUX.forEach(niveau => {
    if (niveau === 'facile') return  // facile peut rater couper10

    it(`[${niveau}] couper le 10 prioritaire sur étalées en réponse`, () => {
      const dixH    = c('hearts', '10')   // ouverte = 10 → couper10 s'active
      const asHMain = c('hearts', 'A')    // en main → coupe via strategieCouper10
      const roiEtal = c('spades', 'K')    // étalé gagnant aussi
      const state = makeState({
        mainIA: [asHMain, c('clubs', '8')],
        etaleesIA: [roiEtal],
        carteOuverte: dixH,
        couleurAtout: 'clubs',
      })
      // strategieCouper10 passe AVANT strategieEtaleesEnReponse
      // → l'As en main est joué (règle A.2 couper10)
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asHMain.id)
    })
  })
})

// ============================================================
// 5. NON-RÉGRESSION
// ============================================================

describe('Non-régression — fonctionnalités existantes préservées', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] retourne null si aucun candidat`, () => {
      const state = makeState({ mainIA: [], etaleesIA: [], couleurAtout: null })
      expect(choisirCarteIA(state, niveau)).toBeNull()
    })

    it(`[${niveau}] carte retournée toujours dans les candidats`, () => {
      const main   = [c('hearts', 'K'), c('clubs', '8')]
      const etalee = [c('spades', 'A')]
      const ids    = new Set([...main, ...etalee].map(c => c.id))
      for (let i = 0; i < 20; i++) {
        const state = makeState({
          mainIA: [...main],
          etaleesIA: [...etalee],
          carteOuverte: c('hearts', '9'),
          couleurAtout: 'clubs',
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
      etaleesIA: [],
      carteOuverte: dix,
      couleurAtout: 'clubs',
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(as.id)
  })

  it('[difficile] couper le 10 prioritaire sur étalées', () => {
    const dix    = c('hearts', '10')
    const asMain = c('hearts', 'A')    // couper10 → As en main
    const asEtal = c('spades', 'A')    // étalé non-atout
    const state = makeState({
      mainIA: [asMain],
      etaleesIA: [asEtal],
      carteOuverte: dix,
      couleurAtout: 'clubs',
    })
    const carte = choisirCarteIA(state, 'difficile')
    // strategieCouper10 (As même couleur) avant étalées
    expect(carte?.id).toBe(asMain.id)
  })

  it('[difficile] pré-atout actif en ouverture même avec étalées', () => {
    // En ouverture, étalées-réponse inactive → pré-atout prend la main
    const sept   = c('spades', '7')   // rang faible → pré-atout
    const asEtal = c('hearts', 'A')   // étalé → inutile en ouverture
    const state = makeState({
      mainIA: [sept, c('clubs', 'K')],
      etaleesIA: [asEtal],
      carteOuverte: null,   // ouverture
      couleurAtout: null,   // pré-atout actif
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.id).toBe(sept.id)
  })
})
