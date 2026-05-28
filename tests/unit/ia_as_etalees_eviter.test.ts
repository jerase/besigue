// ============================================================
// TESTS — Stratégie As étalés ou éviter le pli (tous niveaux)
//
// Carte adverse non-atout ET non-brisque :
//   Cas 1 : As étalé non-atout gagnant → le jouer (étalé > main)
//   Cas 2 : Pas d'As étalé gagnant → 9/8/7 pour éviter le pli
//
// Ne s'applique PAS :
//   - Carte adverse = brisque (As ou 10) → règles existantes
//   - Carte adverse = atout
//   - En ouverture
//   - Pas d'As étalés ET pas de 9/8/7
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
    pioche: Array.from({ length: nbPioche }, () => c('spades', '7')),
  })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[1] = { ...joueurs[1], main: mainIA, cartesEtalees: etaleesIA }
  return { ...base, joueurs }
}

// ============================================================
// 1. CAS 1 — AS ÉTALÉ NON-ATOUT GAGNANT
// ============================================================

describe('Cas 1 — As étalé non-atout gagnant : le jouer', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] joue l'As étalé non-atout quand il gagne le pli`, () => {
      const roiH    = c('hearts', 'K')   // carte adverse ordinaire
      const asEtale = c('hearts', 'A')   // As étalé same couleur → gagne
      const roiMain = c('spades', 'K')   // en main
      const state = makeState({
        mainIA: [roiMain, c('clubs', '8')],
        etaleesIA: [asEtale],
        carteOuverte: roiH,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asEtale.id)
    })

    it(`[${niveau}] As étalé prioritaire sur As en main de même couleur`, () => {
      const roiH    = c('hearts', 'K')
      const asEtale = c('hearts', 'A', 1)  // étalé → prioritaire
      const asMain  = c('hearts', 'A', 0)  // en main
      const state = makeState({
        mainIA: [asMain, c('clubs', '8')],
        etaleesIA: [asEtale],
        carteOuverte: roiH,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asEtale.id)
    })

    it(`[${niveau}] joue l'As étalé pour une Dame adverse`, () => {
      const dameS   = c('spades', 'Q')
      const asEtale = c('spades', 'A')  // étalé même couleur → gagne
      const huitH   = c('hearts', '8')
      const state = makeState({
        mainIA: [huitH],
        etaleesIA: [asEtale],
        carteOuverte: dameS,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asEtale.id)
    })

    it(`[${niveau}] As étalé d'une autre couleur non concerné si ne gagne pas`, () => {
      const roiH     = c('hearts', 'K')    // ouverte hearts
      const asSpades = c('spades', 'A')    // étalé spades ≠ hearts ET même couleur ouvreur→ ne gagne pas (ouvreur gagne)
      const huitH    = c('hearts', '8')
      const state = makeState({
        mainIA: [huitH],
        etaleesIA: [asSpades],
        carteOuverte: roiH,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      // As spades ne gagne pas contre Roi hearts (pas même couleur, pas atout)
      // → cas 2 : jouer 8 pour éviter
      expect(carte?.id).toBe(huitH.id)
    })

    it(`[${niveau}] As étalé atout non concerné (protégé)`, () => {
      const roiH     = c('hearts', 'K')
      const asAtout  = c('clubs', 'A')    // étalé ATOUT → exclu
      const huitH    = c('hearts', '8')
      const state = makeState({
        mainIA: [huitH],
        etaleesIA: [asAtout],
        carteOuverte: roiH,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      // As atout étalé non concerné → cas 2 : jouer 8
      expect(carte?.id).toBe(huitH.id)
    })
  })
})

// ============================================================
// 2. CAS 2 — PAS D'AS ÉTALÉ GAGNANT → 9/8/7 POUR ÉVITER
// ============================================================

describe('Cas 2 — Pas d\'As étalé gagnant : jouer 9/8/7 pour éviter le pli', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] joue le 7 pour éviter si pas d'As étalé gagnant`, () => {
      const roiH = c('hearts', 'K')
      const sept = c('diamonds', '7')
      const roiS = c('spades', 'K')  // ne gagne pas (même rang, ouvreur gagne)
      const state = makeState({
        mainIA: [roiS, sept],
        etaleesIA: [],  // pas d'As étalés
        carteOuverte: roiH,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(sept.id)
    })

    it(`[${niveau}] joue le 8 si pas de 7`, () => {
      const roiH = c('hearts', 'K')
      const huit = c('diamonds', '8')
      const roiS = c('spades', 'K')
      const state = makeState({
        mainIA: [roiS, huit],
        etaleesIA: [],
        carteOuverte: roiH,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(huit.id)
    })

    it(`[${niveau}] joue le 9 si ni 7 ni 8`, () => {
      const roiH = c('hearts', 'K')
      const neuf = c('diamonds', '9')
      const roiS = c('spades', 'K')
      const state = makeState({
        mainIA: [roiS, neuf],
        etaleesIA: [],
        carteOuverte: roiH,
        couleurAtout: 'clubs',
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(neuf.id)
    })

    it(`[${niveau}] préfère le 7 au 8 et au 9 (rang minimal)`, () => {
      const roiH = c('hearts', 'K')
      const sept = c('diamonds', '7')
      const huit = c('clubs', '8')
      const neuf = c('spades', '9')
      const state = makeState({
        mainIA: [sept, huit, neuf],
        etaleesIA: [],
        carteOuverte: roiH,
        couleurAtout: 'hearts',  // atout = hearts, donc 7/8/9 non-atout
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(sept.id)
    })
  })
})

// ============================================================
// 3. CAS OÙ LA RÈGLE NE S'APPLIQUE PAS
// ============================================================

describe('Règle inactive — carte adverse = brisque (As ou 10)', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] carte adverse = As → règles existantes (pas de 9/8/7 forcé)`, () => {
      const asH   = c('hearts', 'A')    // brisque adverse
      const asEtale = c('hearts', 'A', 1) // As étalé
      const huitH = c('clubs', '8')
      const state = makeState({
        mainIA: [huitH],
        etaleesIA: [asEtale],
        carteOuverte: asH,
        couleurAtout: 'clubs',
      })
      // La règle ne s'applique pas (brisque adverse) → fallback niveau
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
      // Ne doit PAS forcer le 8 sur un As adverse (règles existantes décident)
    })

    it(`[${niveau}] carte adverse = 10 → règles existantes`, () => {
      const dixH  = c('hearts', '10')   // brisque adverse
      const huitD = c('diamonds', '8')
      const state = makeState({
        mainIA: [huitD, c('clubs', 'K')],
        etaleesIA: [],
        carteOuverte: dixH,
        couleurAtout: 'clubs',
      })
      // La règle ne s'applique pas → fallback
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
    })
  })
})

describe('Règle inactive — carte adverse = atout', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] carte adverse = atout → règle inactive`, () => {
      const roiAtout = c('clubs', 'K')  // atout adverse
      const asEtale  = c('hearts', 'A') // étalé non-atout
      const huitH    = c('hearts', '8')
      const state = makeState({
        mainIA: [huitH],
        etaleesIA: [asEtale],
        carteOuverte: roiAtout,
        couleurAtout: 'clubs',
      })
      // Carte adverse = atout → hors scope
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
    })
  })
})

describe('Règle inactive — en ouverture', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] en ouverture → règle inactive`, () => {
      const asEtale = c('hearts', 'A')
      const huitH   = c('spades', '8')
      const state = makeState({
        mainIA: [huitH],
        etaleesIA: [asEtale],
        carteOuverte: null,  // ouverture
        couleurAtout: 'clubs',
      })
      // Pas de carte ouverte → règle inactive
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
    })
  })
})

// ============================================================
// 4. NON-RÉGRESSION
// ============================================================

describe('Non-régression', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] retourne null si aucun candidat`, () => {
      const state = makeState({ mainIA: [], couleurAtout: 'clubs' })
      expect(choisirCarteIA(state, niveau)).toBeNull()
    })

    it(`[${niveau}] carte toujours dans les candidats`, () => {
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

  it('[intermediaire] couper10 prioritaire sur as-étalés', () => {
    const dix     = c('hearts', '10')   // 10 → couper10 s'active
    const asMain  = c('hearts', 'A')    // coupe via strategieCouper10
    const asEtale = c('spades', 'A')    // étalé non-atout
    const state = makeState({
      mainIA: [asMain],
      etaleesIA: [asEtale],
      carteOuverte: dix,
      couleurAtout: 'clubs',
    })
    // strategieCouper10 avant strategieAsEtaleesOuEviter
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(asMain.id)
  })

  it('[difficile] pas d\'As étalés et pas de 9/8/7 → fallback niveau', () => {
    const roiH = c('hearts', 'K')  // carte adverse ordinaire
    const roiS = c('spades', 'K')  // ne gagne pas, pas de 9/8/7
    const state = makeState({
      mainIA: [roiS],
      etaleesIA: [],
      carteOuverte: roiH,
      couleurAtout: 'clubs',
    })
    // Fallback → retourne quand même quelque chose
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
    expect(carte?.id).toBe(roiS.id)
  })
})
