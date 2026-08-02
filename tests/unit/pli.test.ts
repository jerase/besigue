// ============================================================
// TESTS UNITAIRES — MOTEUR DE PLI (IT-3)
// SF-09 : toutes les règles du pli
// ============================================================

import { describe, it, expect } from 'vitest'
import { resoudrePli, cartesJouablesPhaseFinale, appliquerPli, jouerCarte } from '../../src/core/pli'
import { creerCarte, creerJoker } from '../../src/core/deck'
import { initialiserPartie } from '../../src/core/init'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { Couleur, GameState } from '../../src/types'

// ── Helpers ───────────────────────────────────────────────────

const AS_PIQUE   = creerCarte('spades',   'A',  0, 0)
const DIX_PIQUE  = creerCarte('spades',   '10', 0, 1)
const ROI_PIQUE  = creerCarte('spades',   'K',  0, 2)
const SEPT_PIQUE = creerCarte('spades',   '7',  0, 3)
const AS_COEUR   = creerCarte('hearts',   'A',  0, 4)
const DIX_COEUR  = creerCarte('hearts',   '10', 0, 5)
const ROI_COEUR  = creerCarte('hearts',   'K',  0, 6)
const AS_CARRE   = creerCarte('diamonds', 'A',  0, 7)
const DIX_CARRE  = creerCarte('diamonds', '10', 0, 8)
const SEPT_CARRE = creerCarte('diamonds', '7',  0, 9)
const JOKER_0    = creerJoker('spades', 0, 100)
const JOKER_1    = creerJoker('hearts', 1, 101)

const ATOUT: Couleur = 'hearts'

// ============================================================
// SF-09.1 — Phase libre SANS atout défini
// ============================================================

describe('resoudrePli — sans atout', () => {
  it('même couleur : rang le plus fort gagne — J0 As > J1 Roi', () => {
    const r = resoudrePli(AS_PIQUE, ROI_PIQUE, 0, null)
    expect(r.vainqueur).toBe(0)
  })

  it('même couleur : rang le plus fort gagne — J1 As > J0 7', () => {
    const r = resoudrePli(SEPT_PIQUE, AS_PIQUE, 0, null)
    expect(r.vainqueur).toBe(1)
  })

  it('couleurs différentes : ouvreur J0 gagne', () => {
    const r = resoudrePli(SEPT_PIQUE, AS_COEUR, 0, null)
    expect(r.vainqueur).toBe(0)
  })

  it('couleurs différentes : ouvreur J1 gagne', () => {
    const r = resoudrePli(AS_COEUR, SEPT_PIQUE, 1, null)
    expect(r.vainqueur).toBe(1)
  })

  it('même couleur, rang égal : ouvreur J0 gagne', () => {
    const as0 = creerCarte('spades', 'A', 0, 0)
    const as1 = creerCarte('spades', 'A', 1, 32)
    const r = resoudrePli(as0, as1, 0, null)
    expect(r.vainqueur).toBe(0)
  })

  it('même couleur, rang égal : ouvreur J1 gagne', () => {
    const as0 = creerCarte('spades', 'A', 0, 0)
    const as1 = creerCarte('spades', 'A', 1, 32)
    const r = resoudrePli(as0, as1, 1, null)
    expect(r.vainqueur).toBe(1)
  })

  // Règle c : carte normale bat Joker (sans atout comme avec atout)
  // Règle 1 : Joker joué EN SECOND → l'ouvreur gagne toujours
  it('Règle 1 : Joker J1 joué en second (J0 ouvre) → J0 (ouvreur) gagne', () => {
    // J0 ouvre avec As♥, J1 répond avec Joker → J0 gagne
    const r = resoudrePli(AS_COEUR, JOKER_1, 0, null)
    expect(r.vainqueur).toBe(0)
  })

  it('Règle 1 : Joker J0 joué en second (J1 ouvre) → J1 (ouvreur) gagne', () => {
    // J1 ouvre avec As♥, J0 répond avec Joker → J1 gagne
    const r = resoudrePli(JOKER_0, AS_COEUR, 1, null)
    expect(r.vainqueur).toBe(1)
  })

  // Règle 2b sans atout : Joker ouvreur vs non-atout → Joker gagne
  it('Règle 2b : Joker J0 ouvre, As♥ non-atout répond (sans atout) → J0 gagne', () => {
    const r = resoudrePli(JOKER_0, AS_COEUR, 0, null)
    expect(r.vainqueur).toBe(0)
  })

  it('Règle 2b : Joker J1 ouvre, As♥ non-atout répond (sans atout) → J1 gagne', () => {
    const r = resoudrePli(AS_COEUR, JOKER_1, 1, null)
    expect(r.vainqueur).toBe(1)
  })

  it('Joker J0 vs Joker J1 : ouvreur J0 gagne (SF-10.10)', () => {
    const r = resoudrePli(JOKER_0, JOKER_1, 0, null)
    expect(r.vainqueur).toBe(0)
  })

  it('Joker J0 vs Joker J1 : ouvreur J1 gagne (SF-10.10)', () => {
    const r = resoudrePli(JOKER_0, JOKER_1, 1, null)
    expect(r.vainqueur).toBe(1)
  })
})

// ============================================================
// SF-09.1 — Phase libre AVEC atout défini
// ============================================================

describe('resoudrePli — avec atout (hearts)', () => {
  it('Règle 1 : atout J0 bat non-atout J1', () => {
    // J0 joue 7♥ (atout), J1 joue As♠ (non-atout)
    const r = resoudrePli(SEPT_PIQUE, AS_COEUR, 0, ATOUT) // J0=7♠, J1=As♥(atout)
    // Correction : AS_COEUR est hearts (atout) donc J1 gagne
    expect(r.vainqueur).toBe(1)
  })

  it('Règle 1 : atout J0 bat non-atout J1 (directement)', () => {
    const septCoeur  = creerCarte('hearts', '7', 0, 10)  // atout
    const asPique    = creerCarte('spades', 'A', 0, 11)  // non-atout
    const r = resoudrePli(septCoeur, asPique, 0, ATOUT)
    expect(r.vainqueur).toBe(0)
  })

  it('Règle 1 : atout J1 bat non-atout J0', () => {
    const asPique    = creerCarte('spades', 'A', 0, 12)  // non-atout
    const septCoeur  = creerCarte('hearts', '7', 0, 13)  // atout
    const r = resoudrePli(asPique, septCoeur, 0, ATOUT)
    expect(r.vainqueur).toBe(1)
  })

  it('Règle 2 : atout vs atout, rang supérieur gagne', () => {
    const asCoeur  = creerCarte('hearts', 'A', 0, 14)
    const dixCoeur = creerCarte('hearts', '10', 0, 15)
    // J0=As♥, J1=10♥ → J0 gagne
    const r = resoudrePli(asCoeur, dixCoeur, 0, ATOUT)
    expect(r.vainqueur).toBe(0)
  })

  it('Règle 2 : atout vs atout, J1 supérieur gagne', () => {
    const septCoeur = creerCarte('hearts', '7',  0, 16)
    const asCoeur   = creerCarte('hearts', 'A',  0, 17)
    const r = resoudrePli(septCoeur, asCoeur, 0, ATOUT)
    expect(r.vainqueur).toBe(1)
  })

  it('Règle 3 : même couleur non-atout, rang le plus fort', () => {
    const asCarr  = creerCarte('diamonds', 'A',  0, 18)
    const dixCarr = creerCarte('diamonds', '10', 0, 19)
    const r = resoudrePli(dixCarr, asCarr, 0, ATOUT)
    expect(r.vainqueur).toBe(1)
  })

  it('Règle 4 : couleurs différentes, ni atout → ouvreur J0', () => {
    const asPique  = creerCarte('spades',   'A', 0, 20)
    const asCarr   = creerCarte('diamonds', 'A', 0, 21)
    const r = resoudrePli(asPique, asCarr, 0, ATOUT)
    expect(r.vainqueur).toBe(0)
  })

  it('Règle 4 : couleurs différentes, ni atout → ouvreur J1', () => {
    const asPique  = creerCarte('spades',   'A', 0, 22)
    const asCarr   = creerCarte('diamonds', 'A', 0, 23)
    const r = resoudrePli(asPique, asCarr, 1, ATOUT)
    expect(r.vainqueur).toBe(1)
  })

  // ── Tests corrigés : règles Joker avec atout défini (spec précisée) ─────────

  // Règle a : Joker vs Joker → ouvreur remporte (joueur A = celui qui a joué en premier)
  it('Règle a : Joker J0 vs Joker J1 → ouvreur J0 remporte', () => {
    const r = resoudrePli(JOKER_0, JOKER_1, 0, ATOUT)
    expect(r.vainqueur).toBe(0)
  })

  it('Règle a : Joker J0 vs Joker J1 → ouvreur J1 remporte', () => {
    const r = resoudrePli(JOKER_0, JOKER_1, 1, ATOUT)
    expect(r.vainqueur).toBe(1)
  })

  // Règle b : Joker vs atout → l'atout l'emporte sur le Joker
  it('Règle b : atout J1 bat Joker J0 (As de cœur atout)', () => {
    const asCoeur = creerCarte('hearts', 'A', 0, 24)
    const r = resoudrePli(JOKER_0, asCoeur, 0, ATOUT)
    expect(r.vainqueur).toBe(1) // BUG CORRIGÉ : atout bat Joker
  })

  it('Règle b : atout J0 bat Joker J1 (As de cœur atout)', () => {
    const asCoeur = creerCarte('hearts', 'A', 0, 25)
    const r = resoudrePli(asCoeur, JOKER_1, 0, ATOUT)
    expect(r.vainqueur).toBe(0) // BUG CORRIGÉ : atout bat Joker
  })

  it("Règle b : même le 7 d'atout (faible) bat le Joker", () => {
    const septCoeur = creerCarte('hearts', '7', 0, 26)
    const r = resoudrePli(JOKER_0, septCoeur, 0, ATOUT)
    expect(r.vainqueur).toBe(1) // 7♥ atout > Joker
  })

  it('Règle 2b : Joker J0 (ouvreur) vs As♠ non-atout J1 → J0 gagne', () => {
    // J0 ouvre avec Joker, J1 répond As♠ (non-atout hearts) → règle 2b : Joker gagne
    const asPique = creerCarte('spades', 'A', 0, 27)
    const r = resoudrePli(JOKER_0, asPique, 0, ATOUT)
    expect(r.vainqueur).toBe(0) // Joker ouvreur gagne sur non-atout
  })

  it('Règle 1 : non-atout J0 (As♠ ouvreur) bat Joker J1 (second) → J0 gagne', () => {
    // J0 ouvre avec As♠, J1 répond Joker → règle 1 : ouvreur J0 gagne
    const asPique = creerCarte('spades', 'A', 0, 28)
    const r = resoudrePli(asPique, JOKER_1, 0, ATOUT)
    expect(r.vainqueur).toBe(0) // ouvreur gagne quand Joker joué en second
  })

  // Règle 1 : carte normale ouvre → Joker en réponse perd
  it('Règle 1 : non-atout J0 (7♠ ouvreur) bat Joker J1 (second)', () => {
    const septPique = creerCarte('spades', '7', 0, 29)
    const r = resoudrePli(septPique, JOKER_1, 0, ATOUT)
    expect(r.vainqueur).toBe(0) // ouvreur J0 gagne, Joker en second perd
  })

  it('Règle 2b : Joker J0 (ouvreur) vs 7♠ non-atout J1 → J0 gagne', () => {
    // J0 ouvre avec Joker, J1 répond 7♠ (non-atout) → Joker ouvreur gagne
    const septPique = creerCarte('spades', '7', 0, 30)
    const r = resoudrePli(JOKER_0, septPique, 0, ATOUT)
    expect(r.vainqueur).toBe(0)
  })

  it('Règle 1 : As♠ non-atout J0 (ouvreur) bat Joker J1 (second, J1 ouvre), ouvreur=J1', () => {
    // J1 est l'ouvreur, J0 répond As♠, J1 a joué Joker → J1 ouvre avec non-Joker
    // Attends : J1 ouvre avec As♠, J0 répond Joker → J1 (ouvreur) gagne
    const asPique = creerCarte('spades', 'A', 0, 31)
    const r = resoudrePli(JOKER_0, asPique, 1, ATOUT)
    // J1 ouvre avec As♠, J0 répond Joker → ouvreur J1 gagne (règle 1)
    expect(r.vainqueur).toBe(1)
  })
})

// ============================================================
// Ordre des rangs — As > 10 > K > Q > J > 9 > 8 > 7
// ============================================================

describe('resoudrePli — ordre des rangs complet', () => {
  const RANGS_ORDRE = ['A', '10', 'K', 'Q', 'J', '9', '8', '7'] as const
  RANGS_ORDRE.forEach((rang, i) => {
    if (i < RANGS_ORDRE.length - 1) {
      const rangInf = RANGS_ORDRE[i + 1]
      it(`${rang} > ${rangInf} (même couleur)`, () => {
        const c1 = creerCarte('spades', rang,    0, i * 10)
        const c2 = creerCarte('spades', rangInf, 0, i * 10 + 1)
        const r = resoudrePli(c1, c2, 0, null)
        expect(r.vainqueur).toBe(0)
      })
    }
  })
})

// ============================================================
// SF-09.2 — Phase finale : cartes jouables
// ============================================================

describe('cartesJouablesPhaseFinale', () => {
  it('fournir la couleur si possible', () => {
    const main = [
      creerCarte('spades', 'K', 0, 0),
      creerCarte('hearts', 'A', 0, 1),
      creerCarte('spades', '7', 0, 2),
    ]
    const carteOuverte = creerCarte('spades', '9', 0, 3)
    const jouables = cartesJouablesPhaseFinale(main, carteOuverte, null)
    expect(jouables.every(c => c.couleur === 'spades')).toBe(true)
    // K♠ > 9♠ → obligation de couper avec K uniquement (7 < 9 ne peut pas couper)
    expect(jouables.length).toBe(1)
    expect(jouables[0].rang).toBe('K')
  })

  it('couper si possible dans la même couleur (rang supérieur)', () => {
    const main = [
      creerCarte('spades', 'A', 0, 0),
      creerCarte('spades', '7', 0, 1),
    ]
    const carteOuverte = creerCarte('spades', '9', 0, 2)
    const jouables = cartesJouablesPhaseFinale(main, carteOuverte, null)
    // As > 9, donc seul As doit être jouable
    expect(jouables).toHaveLength(1)
    expect(jouables[0].rang).toBe('A')
  })

  it('si pas la couleur : couper à l\'atout', () => {
    const main = [
      creerCarte('hearts', '7', 0, 0),   // atout (hearts)
      creerCarte('clubs',  'A', 0, 1),   // pas la couleur, pas atout
    ]
    const carteOuverte = creerCarte('spades', 'A', 0, 2) // pique ouvert
    const jouables = cartesJouablesPhaseFinale(main, carteOuverte, 'hearts')
    expect(jouables.every(c => c.couleur === 'hearts')).toBe(true)
  })

  it('défausse libre si ni la couleur ni atout', () => {
    const main = [
      creerCarte('clubs', 'A', 0, 0),
      creerCarte('clubs', 'K', 0, 1),
    ]
    const carteOuverte = creerCarte('spades', 'A', 0, 2)
    const jouables = cartesJouablesPhaseFinale(main, carteOuverte, 'hearts')
    // Pas de pique, pas de hearts → défausse libre = toutes les cartes non-Joker
    expect(jouables.length).toBe(2)
  })

  it('sans carte ouverte : toutes les cartes jouables (ouvreur)', () => {
    const main = [
      creerCarte('spades', 'A', 0, 0),
      creerCarte('hearts', 'K', 0, 1),
    ]
    const jouables = cartesJouablesPhaseFinale(main, null, 'hearts')
    expect(jouables.length).toBe(2)
  })

  it('carte ouverte = Joker : aucune couleur à suivre → défausse libre', () => {
    const main = [
      creerCarte('spades', 'A', 0, 0),
      creerCarte('hearts', 'K', 0, 1),
      creerCarte('diamonds', '7', 0, 2),
    ]
    const jokerOuvert = creerJoker('diamonds', 0, 3)
    // couleurAtout = 'clubs' : aucune carte en main n'est atout → défausse libre
    const jouables = cartesJouablesPhaseFinale(main, jokerOuvert, 'clubs')
    // Le Joker adverse n'impose aucune couleur : toutes les cartes non-Joker jouables
    expect(jouables.length).toBe(3)
  })
})

// ============================================================
// NON-RÉGRESSION — RÈGLES JOKER (bug corrigé)
// 3 règles de la spec :
//   a) Joker vs Joker  → joueur A (ouvreur) remporte
//   b) Joker vs atout  → atout remporte / Joker vs non-atout → Joker remporte
//   c) Carte normale vs Joker → carte normale remporte
// ============================================================

describe('NON-RÉGRESSION — Règles Joker (3 règles correctes)', () => {
  const JOKER_A = creerJoker('spades',   0, 200)
  const JOKER_B = creerJoker('diamonds', 1, 201)
  const ATOUTS: Couleur[] = ['hearts', 'diamonds', 'clubs', 'spades']

  // ── Règle 1 : Joker joué EN SECOND → l'ouvreur gagne toujours ─────────────
  // Peu importe la carte ouverte, peu importe l'atout

  describe('Règle 1 — Joker en second : ouvreur gagne toujours', () => {
    it('J0 ouvre avec carte normale, J1 répond Joker → J0 gagne (sans atout)', () => {
      const carte = creerCarte('spades', 'A', 0, 10)
      expect(resoudrePli(carte, JOKER_B, 0, null).vainqueur).toBe(0)
    })
    it('J1 ouvre avec carte normale, J0 répond Joker → J1 gagne (sans atout)', () => {
      const carte = creerCarte('hearts', 'K', 0, 11)
      expect(resoudrePli(JOKER_A, carte, 1, null).vainqueur).toBe(1)
    })
    it('J0 ouvre avec carte normale, J1 répond Joker → J0 gagne (avec atout)', () => {
      const carte = creerCarte('spades', '7', 0, 12)
      expect(resoudrePli(carte, JOKER_B, 0, 'hearts').vainqueur).toBe(0)
    })
    it('J1 ouvre avec carte normale, J0 répond Joker → J1 gagne (avec atout)', () => {
      const carte = creerCarte('clubs', 'Q', 0, 13)
      expect(resoudrePli(JOKER_A, carte, 1, 'spades').vainqueur).toBe(1)
    })
    // Scénario exact du bug signalé : J0 joue 8♠, IA (J1) joue Joker en second → J0 gagne
    it('Scénario bug : J0 joue 8♠ (premier), J1 joue Joker (second) → J0 gagne', () => {
      const huitPique = creerCarte('spades', '8', 0, 5)
      expect(resoudrePli(huitPique, JOKER_B, 0, null).vainqueur).toBe(0)
    })
    it('Scénario bug : J1 ouvre 8♠, J0 joue Joker en second → J1 gagne', () => {
      const huitPique = creerCarte('spades', '8', 0, 5)
      expect(resoudrePli(JOKER_A, huitPique, 1, null).vainqueur).toBe(1)
    })
    // Toutes couleurs d'atout possibles
    ATOUTS.forEach(atout => {
      it(`Joker en second perd contre n'importe quelle carte (atout=${atout})`, () => {
        const carte = creerCarte(atout === 'hearts' ? 'spades' : 'hearts', '7', 0, 50)
        // J0 ouvre, J1 répond Joker
        expect(resoudrePli(carte, JOKER_B, 0, atout).vainqueur).toBe(0)
        // J1 ouvre, J0 répond Joker
        expect(resoudrePli(JOKER_A, carte, 1, atout).vainqueur).toBe(1)
      })
    })
  })

  // ── Règle 2a : Joker EN PREMIER, atout en réponse → atout gagne ───────────

  describe('Règle 2a — Joker en premier vs atout en réponse : atout gagne', () => {
    ATOUTS.forEach(atout => {
      const RANGS = ['A', '10', 'K', 'Q', 'J', '9', '8', '7'] as const
      RANGS.forEach(rang => {
        it(`Joker J0 ouvre, ${rang} d'atout ${atout} répond → J1 gagne`, () => {
          const carteAtout = creerCarte(atout, rang, 0, 60)
          expect(resoudrePli(JOKER_A, carteAtout, 0, atout).vainqueur).toBe(1)
        })
        it(`Joker J1 ouvre, ${rang} d'atout ${atout} répond J0 → J0 gagne`, () => {
          const carteAtout = creerCarte(atout, rang, 0, 70)
          expect(resoudrePli(carteAtout, JOKER_B, 1, atout).vainqueur).toBe(0)
        })
      })
    })
  })

  // ── Règle 2b : Joker EN PREMIER, non-atout en réponse → Joker gagne ───────

  describe('Règle 2b — Joker en premier vs non-atout : Joker gagne', () => {
    it('Joker J0 ouvre, As♠ non-atout (atout=hearts) → J0 gagne', () => {
      const asPique = creerCarte('spades', 'A', 0, 80)
      expect(resoudrePli(JOKER_A, asPique, 0, 'hearts').vainqueur).toBe(0)
    })
    it('Joker J1 ouvre, As♠ non-atout (atout=hearts) → J1 gagne', () => {
      const asPique = creerCarte('spades', 'A', 0, 81)
      expect(resoudrePli(asPique, JOKER_B, 1, 'hearts').vainqueur).toBe(1)
    })
    it('Joker J0 ouvre, 7♦ non-atout (atout=clubs) → J0 gagne', () => {
      const sept = creerCarte('diamonds', '7', 0, 82)
      expect(resoudrePli(JOKER_A, sept, 0, 'clubs').vainqueur).toBe(0)
    })
    it('Joker J0 ouvre, As non-atout sans atout défini → J0 gagne', () => {
      const as = creerCarte('hearts', 'A', 0, 83)
      expect(resoudrePli(JOKER_A, as, 0, null).vainqueur).toBe(0)
    })
    it('Joker J1 ouvre, As non-atout sans atout défini → J1 gagne', () => {
      const as = creerCarte('hearts', 'A', 0, 84)
      expect(resoudrePli(as, JOKER_B, 1, null).vainqueur).toBe(1)
    })
  })

  // ── Joker vs Joker : ouvreur gagne ────────────────────────────────────────

  describe('Joker vs Joker — ouvreur gagne', () => {
    it('Joker J0 ouvre, Joker J1 répond → J0 gagne (sans atout)', () => {
      expect(resoudrePli(JOKER_A, JOKER_B, 0, null).vainqueur).toBe(0)
    })
    it('Joker J1 ouvre, Joker J0 répond → J1 gagne (sans atout)', () => {
      expect(resoudrePli(JOKER_A, JOKER_B, 1, null).vainqueur).toBe(1)
    })
    it('Joker J0 ouvre, Joker J1 répond → J0 gagne (avec atout)', () => {
      expect(resoudrePli(JOKER_A, JOKER_B, 0, 'hearts').vainqueur).toBe(0)
    })
    it('Joker J1 ouvre, Joker J0 répond → J1 gagne (avec atout)', () => {
      expect(resoudrePli(JOKER_A, JOKER_B, 1, 'spades').vainqueur).toBe(1)
    })
  })
})

// ============================================================
// NON-RÉGRESSION — appliquerPli / jouerCarte : cas limites
// ============================================================

function makeStateAvecPli(overrides?: Partial<GameState>): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  return initialiserChampsIT4({ ...state, ...overrides })
}

describe('appliquerPli — pli incomplet', () => {
  it('retourne le state inchangé si carteJoueur0 est absente', () => {
    const state = makeStateAvecPli({
      pliEnCours: { carteJoueur0: null, carteJoueur1: AS_COEUR, joueurOuvreur: 1, cartes: [null, AS_COEUR] },
    })
    const apres = appliquerPli(state)
    expect(apres).toBe(state)
  })

  it('retourne le state inchangé si carteJoueur1 est absente', () => {
    const state = makeStateAvecPli({
      pliEnCours: { carteJoueur0: AS_COEUR, carteJoueur1: null, joueurOuvreur: 0, cartes: [AS_COEUR, null] },
    })
    const apres = appliquerPli(state)
    expect(apres).toBe(state)
  })
})

describe('jouerCarte — obligation de couleur en phase finale pour J1', () => {
  it("J1 doit suivre la couleur de la carte jouée par J0 (phase finale)", () => {
    const dixPiqueJ0 = creerCarte('spades', '10', 0, 200)   // déjà joué par J0
    const piqueEnMain = creerCarte('spades', '7', 0, 201)   // J1 a du pique : obligatoire
    const coeurEnMain = creerCarte('hearts', '8', 0, 202)   // ne suit pas la couleur

    let state = makeStateAvecPli({
      phase: 'finale',
      couleurAtout: 'diamonds',
      joueurActif: 1,
      pliEnCours: { carteJoueur0: dixPiqueJ0, carteJoueur1: null, joueurOuvreur: 0, cartes: [dixPiqueJ0, null] },
    })
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[1] = { ...joueurs[1], main: [piqueEnMain, coeurEnMain], cartesEtalees: [] }
    state = { ...state, joueurs }

    // Jouer le cœur (ne suit pas la couleur alors qu'un pique est disponible) → refusé
    const refus = jouerCarte(state, 1, coeurEnMain.id)
    expect(refus.ok).toBe(false)

    // Jouer le pique (suit la couleur) → accepté
    const accepte = jouerCarte(state, 1, piqueEnMain.id)
    expect(accepte.ok).toBe(true)
  })
})


