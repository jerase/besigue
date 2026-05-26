// ============================================================
// TESTS — Stratégie ouverture pré-atout (tous niveaux)
// Quand l'atout n'est pas défini, l'IA privilégie en ouverture :
//   1. Les cartes 9, 8, 7 (faibles, non-brisques)
//   2. Les cartes en double (même rang, 2+ exemplaires)
//   3. Fallback → algorithme de niveau
//
// Quand l'atout est défini → la règle ne s'applique pas
// (chaque niveau gère déjà la préservation des atouts)
//
// La règle ne s'applique JAMAIS en réponse (carte ouverte présente)
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
  carteOuverte?: Carte | null
  couleurAtout?: Couleur | null
  nbPioche?: number
}): GameState {
  const { mainIA, carteOuverte = null, couleurAtout = null, nbPioche = 16 } = opts
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
  joueurs[1] = { ...joueurs[1], main: mainIA, cartesEtalees: [] }
  return { ...base, joueurs }
}

// ============================================================
// 1. PRIORITÉ 1 — CARTES FAIBLES (9, 8, 7)
// ============================================================

describe('Priorité 1 — Cartes faibles (9, 8, 7) quand atout non défini', () => {

  NIVEAUX.forEach(niveau => {
    it(`[${niveau}] joue le 7 si disponible (rang le plus faible)`, () => {
      const sept = c('hearts', '7')
      const roi  = c('spades', 'K')
      const as   = c('diamonds', 'A')
      const state = makeState({
        mainIA: [sept, roi, as],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(sept.id)
    })

    it(`[${niveau}] joue le 8 si pas de 7`, () => {
      const huit = c('hearts', '8')
      const roi  = c('spades', 'K')
      const dame = c('clubs', 'Q')
      const state = makeState({
        mainIA: [huit, roi, dame],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(huit.id)
    })

    it(`[${niveau}] joue le 9 si ni 7 ni 8`, () => {
      const neuf = c('diamonds', '9')
      const roi  = c('spades', 'K')
      const as   = c('hearts', 'A')
      const state = makeState({
        mainIA: [neuf, roi, as],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(neuf.id)
    })

    it(`[${niveau}] préfère le 7 au 8 et au 9 (rang minimal)`, () => {
      const sept = c('hearts', '7')
      const huit = c('spades', '8')
      const neuf = c('clubs', '9')
      const state = makeState({
        mainIA: [sept, huit, neuf],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(sept.id)
    })

    it(`[${niveau}] joue le 8 plutôt que le 9`, () => {
      const huit = c('hearts', '8')
      const neuf = c('spades', '9')
      const roi  = c('clubs', 'K')
      const state = makeState({
        mainIA: [neuf, huit, roi],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(huit.id)
    })

    it(`[${niveau}] plusieurs 7 disponibles → joue l'un d'eux`, () => {
      const sept1 = c('hearts', '7', 0)
      const sept2 = c('spades', '7', 1)
      const roi   = c('clubs', 'K')
      const state = makeState({
        mainIA: [sept1, sept2, roi],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      expect([sept1.id, sept2.id]).toContain(carte?.id)
    })
  })
})

// ============================================================
// 2. PRIORITÉ 2 — CARTES EN DOUBLE
// ============================================================

describe('Priorité 2 — Cartes en double (quand ni 7, ni 8, ni 9)', () => {

  NIVEAUX.forEach(niveau => {
    it(`[${niveau}] joue un doublon si pas de carte faible`, () => {
      const roi1  = c('hearts', 'K', 0)   // doublon
      const roi2  = c('spades', 'K', 1)   // doublon
      const dame  = c('clubs',  'Q')      // carte unique
      const valet = c('diamonds', 'J')    // carte unique
      const state = makeState({
        mainIA: [roi1, roi2, dame, valet],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      // Doit jouer un des Rois (doublon), pas la Dame ni le Valet
      expect([roi1.id, roi2.id]).toContain(carte?.id)
    })

    it(`[${niveau}] choisit le doublon de rang le plus faible`, () => {
      const roi1   = c('hearts', 'K', 0)   // doublon Roi (rang 6)
      const roi2   = c('spades', 'K', 1)
      const dame1  = c('clubs',  'Q', 0)   // doublon Dame (rang 5 < 6)
      const dame2  = c('diamonds', 'Q', 1)
      const state = makeState({
        mainIA: [roi1, roi2, dame1, dame2],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      // Dame (rang 5) < Roi (rang 6) → joue une Dame
      expect([dame1.id, dame2.id]).toContain(carte?.id)
    })

    it(`[${niveau}] 3 exemplaires du même rang → compte comme doublon`, () => {
      const as1 = c('hearts', 'A', 0)
      const as2 = c('spades', 'A', 1)
      const as3 = c('clubs',  'A', 0)
      const roi = c('diamonds', 'K')
      const state = makeState({
        mainIA: [as1, as2, as3, roi],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      // Les As sont en triple → doublon → jouer l'un d'eux
      expect([as1.id, as2.id, as3.id]).toContain(carte?.id)
    })
  })
})

// ============================================================
// 3. FALLBACK — NI CARTES FAIBLES NI DOUBLONS
// ============================================================

describe('Fallback — Pas de carte faible, pas de doublon', () => {

  NIVEAUX.forEach(niveau => {
    it(`[${niveau}] retourne quand même une carte valide (fallback)`, () => {
      // Toutes les cartes sont uniques et de rang élevé
      const roi  = c('hearts', 'K')
      const dame = c('spades', 'Q')
      const valet = c('clubs', 'J')
      const as   = c('diamonds', 'A')
      const state = makeState({
        mainIA: [roi, dame, valet, as],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
      expect([roi.id, dame.id, valet.id, as.id]).toContain(carte?.id)
    })
  })
})

// ============================================================
// 4. LA RÈGLE NE S'APPLIQUE PAS EN RÉPONSE
// ============================================================

describe('La règle pré-atout ne s\'applique pas en réponse', () => {

  NIVEAUX.forEach(niveau => {
    it(`[${niveau}] ignore la règle si carte ouverte présente`, () => {
      const carteOuverte = c('hearts', 'K')  // humain a ouvert
      const sept = c('spades', '7')
      const as   = c('clubs', 'A')
      const state = makeState({
        mainIA: [sept, as],
        carteOuverte,
        couleurAtout: null,
      })
      // En réponse → la règle pré-atout ne force pas le 7
      // Le comportement dépend de la logique normale de chaque niveau
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
      // On vérifie juste que ça ne crashe pas — pas de comportement forcé
    })
  })
})

// ============================================================
// 5. LA RÈGLE NE S'APPLIQUE PAS SI ATOUT DÉFINI
// ============================================================

describe('Quand l\'atout est défini — la règle pré-atout ne s\'active pas', () => {

  NIVEAUX.forEach(niveau => {
    it(`[${niveau}] atout défini + carte faible → comportement normal du niveau`, () => {
      const sept = c('clubs', '7')    // 7 de trèfle (atout)
      const huit = c('hearts', '8')   // 8 non-atout
      const roi  = c('spades', 'K')
      const state = makeState({
        mainIA: [sept, huit, roi],
        couleurAtout: 'clubs',  // atout défini
      })
      // La règle pré-atout ne s'active pas (atout défini)
      // L'IA ne doit PAS forcément jouer le 7 (c'est l'atout — à préserver)
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
    })
  })

  it('[difficile] atout défini → préserve les cartes d\'atout en ouverture', () => {
    const asAtout  = c('clubs', 'A')   // atout fort
    const dixAtout = c('clubs', '10')  // atout fort
    const huitH    = c('hearts', '8')  // non-atout faible
    const state = makeState({
      mainIA: [asAtout, dixAtout, huitH],
      couleurAtout: 'clubs',
      nbPioche: 14,  // pioche grande → comportement normal
    })
    const carte = choisirCarteIA(state, 'difficile')
    // Ne doit pas jouer l'atout fort en ouverture (mode normal)
    // → doit préférer le 8 de cœur
    expect(carte?.id).toBe(huitH.id)
  })
})

// ============================================================
// 6. PRIORITÉ : COUPER LE 10 > PRÉ-ATOUT
// ============================================================

describe('Priorités — couper le 10 reste prioritaire sur pré-atout', () => {

  NIVEAUX.forEach(niveau => {
    it(`[${niveau}] couper le 10 prioritaire même sans atout défini`, () => {
      // Niveau facile peut rater (33%) → on teste intermédiaire et difficile
      if (niveau === 'facile') return
      const dix    = c('hearts', '10')   // carte ouverte = 10
      const asH    = c('hearts', 'A')    // coupe avec As de même couleur
      const sept   = c('spades', '7')    // carte faible disponible
      const state = makeState({
        mainIA: [asH, sept],
        carteOuverte: dix,
        couleurAtout: null,
      })
      // strategieCouper10 passe avant strategieOuverturePreAtout
      // → joue l'As, pas le 7
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(asH.id)
    })
  })
})

// ============================================================
// 7. NON-RÉGRESSION — Fonctionnalités existantes
// ============================================================

describe('Non-régression — Fonctionnalités existantes préservées', () => {

  it('[facile] retourne null si aucun candidat', () => {
    const state = makeState({ mainIA: [], couleurAtout: null })
    expect(choisirCarteIA(state, 'facile')).toBeNull()
  })

  it('[intermediaire] retourne null si aucun candidat', () => {
    const state = makeState({ mainIA: [], couleurAtout: null })
    expect(choisirCarteIA(state, 'intermediaire')).toBeNull()
  })

  it('[difficile] retourne null si aucun candidat', () => {
    const state = makeState({ mainIA: [], couleurAtout: null })
    expect(choisirCarteIA(state, 'difficile')).toBeNull()
  })

  it('[tous] carte retournée toujours dans la main', () => {
    NIVEAUX.forEach(niveau => {
      const main = [
        c('hearts', '9'), c('spades', 'K'),
        c('clubs', 'Q'), c('diamonds', 'A'),
      ]
      const ids = new Set(main.map(c => c.id))
      for (let i = 0; i < 20; i++) {
        const state = makeState({ mainIA: [...main], couleurAtout: null })
        const carte = choisirCarteIA(state, niveau)
        if (carte) expect(ids.has(carte.id)).toBe(true)
      }
    })
  })

  it('[intermediaire] couper le 10 toujours actif avec atout défini', () => {
    const dix = c('hearts', '10')
    const as  = c('hearts', 'A')
    const state = makeState({
      mainIA: [as, c('clubs', '8')],
      carteOuverte: dix,
      couleurAtout: 'clubs',
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(as.id)
  })

  it('[difficile] couper le 10 toujours actif avec atout défini', () => {
    const dix = c('hearts', '10')
    const as  = c('hearts', 'A')
    const state = makeState({
      mainIA: [as, c('clubs', '8')],
      carteOuverte: dix,
      couleurAtout: 'clubs',
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.id).toBe(as.id)
  })

  it('[intermediaire] atout défini + 7 d\'atout → stratégie pré-atout inactive', () => {
    // Avec atout défini, strategieOuverturePreAtout retourne null
    // → iaIntermediaire joue le 7 d\'atout pour ses +10 pts (si pioche > 8)
    const septAtout = c('clubs', '7')
    const roiH      = c('hearts', 'K')
    const state = makeState({
      mainIA: [septAtout, roiH],
      couleurAtout: 'clubs',
      nbPioche: SEUIL_PIOCHE_GRANDE_MOCK,
    })
    // On vérifie juste que la carte est valide et dans la main
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte).not.toBeNull()
    expect([septAtout.id, roiH.id]).toContain(carte?.id)
  })
})

// Constante mock pour le test intermédiaire (valeur connue)
const SEUIL_PIOCHE_GRANDE_MOCK = 9 // > 8

// ============================================================
// PRIORITÉ 3 — ÉVITER LES DAMES ET ROIS UNIQUES
// ============================================================

describe('Priorité 3 — Éviter les Dames et Rois uniques (mariage potentiel)', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] évite la Dame unique quand d'autres cartes disponibles`, () => {
      // Pas de 9/8/7, pas de doublon, mais une Dame unique et un As unique
      const dame = c('hearts', 'Q')   // unique → à préserver
      const as   = c('spades', 'A')   // unique non-mariage → sacrifiable
      const state = makeState({
        mainIA: [dame, as],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      // Ne doit PAS jouer la Dame (unique, potentiel mariage)
      expect(carte?.id).not.toBe(dame.id)
      // Doit jouer l'As à la place
      expect(carte?.id).toBe(as.id)
    })

    it(`[${niveau}] évite le Roi unique quand d'autres cartes disponibles`, () => {
      const roi  = c('clubs', 'K')    // unique → à préserver
      const valet = c('hearts', 'J')  // unique non-mariage → sacrifiable
      const state = makeState({
        mainIA: [roi, valet],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).not.toBe(roi.id)
      expect(carte?.id).toBe(valet.id)
    })

    it(`[${niveau}] évite Dame ET Roi uniques, joue le Valet à la place`, () => {
      const dame  = c('hearts', 'Q')
      const roi   = c('spades', 'K')
      const valet = c('clubs', 'J')
      const state = makeState({
        mainIA: [dame, roi, valet],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(valet.id)
    })

    it(`[${niveau}] Dame en doublon peut être sacrifiée (priorité 2)`, () => {
      // Deux Dames → doublon → priorité 2 s'applique avant priorité 3
      const dame1 = c('hearts', 'Q', 0)
      const dame2 = c('spades', 'Q', 1)
      const roi   = c('clubs', 'K')    // Roi unique
      const state = makeState({
        mainIA: [dame1, dame2, roi],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      // Une des deux Dames (doublon) doit être jouée, pas le Roi unique
      expect([dame1.id, dame2.id]).toContain(carte?.id)
      expect(carte?.id).not.toBe(roi.id)
    })

    it(`[${niveau}] Roi en doublon peut être sacrifié (priorité 2)`, () => {
      const roi1  = c('hearts', 'K', 0)
      const roi2  = c('spades', 'K', 1)
      const dame  = c('clubs', 'Q')    // Dame unique → à préserver
      const state = makeState({
        mainIA: [roi1, roi2, dame],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      // Un des Rois (doublon) doit être joué
      expect([roi1.id, roi2.id]).toContain(carte?.id)
      expect(carte?.id).not.toBe(dame.id)
    })

    it(`[${niveau}] fallback si UNIQUEMENT Dames et Rois en main`, () => {
      // Aucune alternative → fallback (laisser le niveau décider)
      const dame = c('hearts', 'Q')
      const roi  = c('spades', 'K')
      const state = makeState({
        mainIA: [dame, roi],
        couleurAtout: null,
      })
      // Ne doit pas crasher, retourne quelque chose
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
      expect([dame.id, roi.id]).toContain(carte?.id)
    })
  })
})

// ============================================================
// PRIORITÉ GLOBALE COMPLÈTE (1 > 2 > 3 > fallback)
// ============================================================

describe('Ordre de priorité complet : 9/8/7 > doublon > éviter Q/K uniques', () => {

  NIVEAUX.forEach(niveau => {

    it(`[${niveau}] 7 bat doublon de Dame`, () => {
      const sept  = c('hearts', '7')
      const dame1 = c('spades', 'Q', 0)
      const dame2 = c('clubs',  'Q', 1)
      const state = makeState({
        mainIA: [sept, dame1, dame2],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(sept.id)
    })

    it(`[${niveau}] doublon de As bat Dame unique`, () => {
      const as1  = c('hearts', 'A', 0)
      const as2  = c('spades', 'A', 1)
      const dame = c('clubs',  'Q')
      const state = makeState({
        mainIA: [as1, as2, dame],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      // Doublon (As) joué avant Dame unique
      expect([as1.id, as2.id]).toContain(carte?.id)
    })

    it(`[${niveau}] Valet unique joué avant Dame unique`, () => {
      // Priorité 3 : Valet n'est pas un rang mariage → sacrifiable
      const dame  = c('hearts', 'Q')
      const valet = c('spades', 'J')
      const state = makeState({
        mainIA: [dame, valet],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(valet.id)
    })

    it(`[${niveau}] As unique joué avant Roi unique`, () => {
      const as  = c('hearts', 'A')
      const roi = c('spades', 'K')
      const state = makeState({
        mainIA: [as, roi],
        couleurAtout: null,
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte?.id).toBe(as.id)
    })
  })
})

// ============================================================
// NON-RÉGRESSION — Règle inactive avec atout défini
// ============================================================

describe('Non-régression — Règle Dame/Roi inactive avec atout défini', () => {

  NIVEAUX.forEach(niveau => {
    it(`[${niveau}] atout défini → comportement normal (pas de forçage)`, () => {
      const dame = c('hearts', 'Q')
      const valet = c('clubs', 'J')
      const state = makeState({
        mainIA: [dame, valet],
        couleurAtout: 'clubs', // atout défini → règle inactive
      })
      const carte = choisirCarteIA(state, niveau)
      expect(carte).not.toBeNull()
      // Comportement normal du niveau, pas de priorité forcée
    })
  })
})
