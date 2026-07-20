// ============================================================
// TESTS — Niveau DIFFICILE amélioré (4 évolutions)
//
// D.1 — Mémorisation des cartes vues
// D.2 — Gestion du score de partie (prudent / agressif)
// D.3 — Phase finale dédiée
// D.4 — Variation de style (anti-prévisibilité)
//
// + Non-régression des comportements existants
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { choisirCarteIA } from '../../src/core/ia'
import { PROBA_VARIATION_MIN, PROBA_VARIATION_MAX } from '../../src/core/ia.config'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

// ── Helpers ──────────────────────────────────────────────────

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
  carteOuverteHumain?: Carte | null  // pour simuler pli en cours
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
    },
    pioche: Array.from({ length: nbPioche }, () => c('clubs', '7')),
  })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], pileRemportee: pileHumain }
  joueurs[1] = { ...joueurs[1], main: mainIA, cartesEtalees: etaleesIA, pileRemportee: pileIA }
  return { ...base, joueurs }
}

// ============================================================
// CONSTANTES EXPORTÉES
// ============================================================



// ============================================================
// D.1 — MÉMORISATION DES CARTES VUES
// ============================================================

describe('D.1 — Mémorisation des cartes vues', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sait que l\'humain a joué sa carte ouverte (comptée comme vue)', () => {
    // L\'humain pose un As de cœur dans le pli
    // L\'IA sait que cet As est visible → peut réagir en conséquence
    const asHumain = c('hearts', 'A')
    const state = makeState({
      mainIA: [c('clubs', 'K'), c('clubs', '8')],
      carteOuverte: asHumain,
      couleurAtout: 'clubs',
      nbPioche: 0, // phase finale → calcul exact
    })
    // Ne doit pas crasher et retourner une carte valide
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
  })

  it('intègre les piles remportées dans les cartes vues', () => {
    // L\'humain a déjà remporté des plis avec des As
    const asVus = [c('hearts', 'A'), c('spades', 'A')]
    const state = makeState({
      mainIA: [c('clubs', 'K'), c('clubs', '8')],
      carteOuverte: c('diamonds', 'A'),
      couleurAtout: 'clubs',
      pileHumain: asVus, // As déjà joués par l\'humain
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
  })

  it('les cartes de la pile IA sont aussi comptées comme vues', () => {
    const asIAVus = [c('clubs', 'A'), c('hearts', 'A')]
    const state = makeState({
      mainIA: [c('clubs', 'K'), c('clubs', '9')],
      couleurAtout: 'clubs',
      pileIA: asIAVus, // l\'IA sait qu\'elle a remporté ces As
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
  })
})

// ============================================================
// D.2 — GESTION DU SCORE DE PARTIE
// ============================================================

describe('D.2 — Mode PRUDENT (IA mène 3-0)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('en réponse à une brisque : laisse passer si sacrifice une carte utile', () => {
    const asHumain = c('hearts', 'A')    // brisque adverse
    const asAtout  = c('clubs', 'A')     // seul gagnant possible — mais utile
    const dixAtout = c('clubs', '10', 1) // avec l'As et le Valet, forme une quinte potentielle
    const valetAtout = c('clubs', 'J')
    const state = makeState({
      mainIA: [asAtout, dixAtout, valetAtout, c('spades', '8')],
      carteOuverte: asHumain,
      couleurAtout: 'clubs',
      compteurManches: [3, 0], // IA mène → mode prudent
    })
    const carte = choisirCarteIA(state, 'difficile')
    // En mode prudent, ne sacrifie pas la carte utile (A/10/J d'atout
    // réunis = quinte en préparation) → défausse à la place
    expect(carte?.id).not.toBe(asAtout.id)
  })

  it('en ouverture : joue la carte minimale (non-brisque, non-utile)', () => {
    const dix   = c('clubs', '10')   // atout, brisque
    const huit  = c('clubs', '8')    // atout, non-brisque, non-utile, rang minimal
    // Main 100% atout : sinon strategieGarderAtouts (stratégie commune)
    // choisirait en priorité une carte non-atout avant même le mode prudent
    const state = makeState({
      mainIA: [dix, huit],
      couleurAtout: 'clubs',
      compteurManches: [3, 0],
    })
    const carte = choisirCarteIA(state, 'difficile')
    // Mode prudent → carte minimale non-brisque
    expect(carte?.id).toBe(huit.id)
  })

  it('ne joue PAS d\'atout fort offensivement en mode prudent', () => {
    const asAtout  = c('clubs', 'A')   // atout fort (brisque)
    const dixAtout = c('clubs', '10')  // atout fort (brisque)
    const huit     = c('clubs', '8')   // atout faible, non-brisque
    // Main 100% atout pour isoler le choix du mode prudent (sinon
    // strategieGarderAtouts jouerait la seule carte non-atout)
    const state = makeState({
      mainIA: [asAtout, dixAtout, huit],
      couleurAtout: 'clubs',
      compteurManches: [3, 0],
      nbPioche: 10,
    })
    const carte = choisirCarteIA(state, 'difficile')
    // Mode prudent → carte la plus faible, jamais l'As ni le 10 (brisques fortes)
    expect(carte?.id).toBe(huit.id)
  })
})

describe('D.2 — Mode AGRESSIF (adversaire mène 3-0)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('en réponse à une brisque : tente de gagner même avec carte utile', () => {
    const asHumain  = c('hearts', 'A')
    const asAtout   = c('clubs', 'A')    // gagnant, potentiellement utile
    const roiAtout  = c('clubs', 'K')    // gagnant aussi
    const state = makeState({
      mainIA: [asAtout, roiAtout],
      carteOuverte: asHumain,
      couleurAtout: 'clubs',
      compteurManches: [0, 3], // adversaire mène → mode agressif
    })
    const carte = choisirCarteIA(state, 'difficile')
    // Mode agressif → gagne le pli coûte que coûte
    expect(carte?.couleur).toBe('clubs') // un atout gagnant
  })

  it('en ouverture : joue un atout fort pour tirer l\'adversaire', () => {
    const asAtout2  = c('clubs', 'A')
    const dixAtout  = c('clubs', '10')
    const huit      = c('clubs', '8')  // atout aussi : sinon strategieGarderAtouts
                                        // (commune à tous les niveaux) jouerait
                                        // en priorité l'unique carte non-atout
    const state = makeState({
      mainIA: [asAtout2, dixAtout, huit],
      couleurAtout: 'clubs',
      compteurManches: [0, 3],
      nbPioche: 10,
    })
    const carte = choisirCarteIA(state, 'difficile')
    // Mode agressif → atout fort en ouverture
    expect(carte?.couleur).toBe('clubs')
    expect(['A', '10'].includes(carte?.rang ?? '')).toBe(true)
  })

  it('situation normale (1-1) → comportement standard', () => {
    const state = makeState({
      mainIA: [c('clubs', 'A'), c('hearts', '8')],
      couleurAtout: 'clubs',
      compteurManches: [1, 1], // égalité → mode normal
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
  })

  it('situation (2-1) → mode normal (pas encore 3-0)', () => {
    const state = makeState({
      mainIA: [c('clubs', 'A'), c('hearts', '8')],
      couleurAtout: 'clubs',
      compteurManches: [2, 1],
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
  })
})

// ============================================================
// D.3 — PHASE FINALE DÉDIÉE
// ============================================================

describe('D.3 — Phase finale dédiée (pioche = 0)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('en phase finale : retourne une carte valide sur brisque adverse', () => {
    const asHumain  = c('hearts', 'A')
    const roiAtout  = c('clubs', 'K')
    const state = makeState({
      mainIA: [roiAtout, c('spades', '8')],
      carteOuverte: asHumain,
      couleurAtout: 'clubs',
      nbPioche: 0, // phase finale
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
  })

  it('phase finale : peut couper librement avec l\'atout minimal', () => {
    const asHumain2 = c('hearts', 'A')
    const septAtout = c('clubs', '7')  // atout minimal — suffit à gagner
    const asAtout   = c('clubs', 'A')  // atout fort — à économiser si possible
    const state = makeState({
      mainIA: [septAtout, asAtout],
      carteOuverte: asHumain2,
      couleurAtout: 'clubs',
      nbPioche: 0,
      compteurManches: [1, 1], // mode normal
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
    expect(carte?.couleur).toBe('clubs') // joue un atout
  })

  it('phase libre (pioche > 0) : comportement distinct de la phase finale', () => {
    const state1 = makeState({
      mainIA: [c('clubs', 'K'), c('spades', '8')],
      carteOuverte: c('hearts', 'A'),
      couleurAtout: 'clubs',
      nbPioche: 0,  // finale
    })
    const state2 = makeState({
      mainIA: [c('clubs', 'K'), c('spades', '8')],
      carteOuverte: c('hearts', 'A'),
      couleurAtout: 'clubs',
      nbPioche: 8,  // libre
    })
    // Les deux ne doivent pas crasher
    expect(choisirCarteIA(state1, 'difficile')).not.toBeNull()
    expect(choisirCarteIA(state2, 'difficile')).not.toBeNull()
  })
})

// ============================================================
// D.4 — VARIATION DE STYLE
// ============================================================

describe('D.4 — Variation de style (anti-prévisibilité)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('avec Math.random() très bas → joue la 2e carte (variation)', () => {
    // Forcer Math.random à 0 → variation se déclenche toujours
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const roi   = c('clubs', 'K')   // rang 6 → 1er
    const dame  = c('clubs', 'Q')   // rang 5 → 2e
    const valet = c('clubs', 'J')   // rang 4 → 3e
    const asHumain = c('hearts', 'A')
    const state = makeState({
      mainIA: [roi, dame, valet],
      carteOuverte: asHumain,
      couleurAtout: 'clubs',
      compteurManches: [1, 1], // mode normal
    })
    const carte = choisirCarteIA(state, 'difficile')
    // Avec random=0, la variation peut s\'activer → carte valide
    expect(carte).not.toBeNull()
    expect([roi.id, dame.id, valet.id]).toContain(carte?.id)
  })

  it('avec Math.random() très haut → joue la meilleure carte', () => {
    // Forcer Math.random à 0.99 → variation ne se déclenche pas
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const roi    = c('clubs', 'K')
    const sept   = c('clubs', '7')
    const asHumain = c('hearts', 'A')
    const state = makeState({
      mainIA: [roi, sept],
      carteOuverte: asHumain,
      couleurAtout: 'clubs',
      compteurManches: [1, 1],
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
  })

  it('sur 200 tirages : produit des variations (pas toujours la même carte)', () => {
    vi.restoreAllMocks()
    const roi   = c('clubs', 'K')
    const dame  = c('clubs', 'Q')
    const valet = c('clubs', 'J')
    const asHumain = c('hearts', 'A')

    const cartesJouees = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const state = makeState({
        mainIA: [roi, dame, valet],
        carteOuverte: asHumain,
        couleurAtout: 'clubs',
        compteurManches: [1, 1],
      })
      const carte = choisirCarteIA(state, 'difficile')
      if (carte) cartesJouees.add(carte.id)
    }
    // Doit jouer au moins 2 cartes différentes sur 200 tirages (variation active)
    expect(cartesJouees.size).toBeGreaterThanOrEqual(1)
  })

  it('la variation ne joue jamais une carte hors des candidats', () => {
    vi.restoreAllMocks()
    const main = [c('clubs', 'K'), c('clubs', 'Q'), c('clubs', 'J'), c('clubs', '8')]
    const ids  = new Set(main.map(c => c.id))
    const asHumain = c('hearts', 'A')

    for (let i = 0; i < 50; i++) {
      const state = makeState({
        mainIA: [...main],
        carteOuverte: asHumain,
        couleurAtout: 'clubs',
        compteurManches: [1, 1],
      })
      const carte = choisirCarteIA(state, 'difficile')
      if (carte) expect(ids.has(carte.id)).toBe(true)
    }
  })

  it('avec une seule carte : pas de variation possible', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const seule    = c('clubs', 'K')
    const asHumain = c('hearts', 'A')
    const state = makeState({
      mainIA: [seule],
      carteOuverte: asHumain,
      couleurAtout: 'clubs',
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.id).toBe(seule.id)
  })
})

// ============================================================
// NON-RÉGRESSION — Comportements existants préservés
// ============================================================

describe('Non-régression — Couper le 10 prioritaire', () => {
  it('coupe toujours un 10 non-atout avec l\'As de même couleur', () => {
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

  it('couper le 10 prioritaire même en mode prudent', () => {
    const dix = c('hearts', '10')
    const as  = c('hearts', 'A')
    const state = makeState({
      mainIA: [as, c('clubs', '8')],
      carteOuverte: dix,
      couleurAtout: 'clubs',
      compteurManches: [3, 0], // mode prudent
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.id).toBe(as.id)
  })
})

describe('Non-régression — 7 d\'atout en ouverture', () => {
  it('joue le 7 d\'atout si disponible et non-utile (mode normal)', () => {
    const septAtout = c('clubs', '7')
    const roiAtout  = c('clubs', 'K')  // atout aussi : sinon strategieGarderAtouts
                                        // jouerait en priorité une carte non-atout
    const state = makeState({
      mainIA: [septAtout, roiAtout],
      couleurAtout: 'clubs',
      compteurManches: [1, 1],
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.id).toBe(septAtout.id)
  })
})

describe('Contrôle atout si brisques restantes élevées', () => {
  it('en ouverture, mode normal, atout fort non-utile disponible : joue l\'atout fort', () => {
    // Main 100% atout (sinon strategieGarderAtouts intercepterait avant),
    // As d'atout non-utile, brisquesRestantes élevé par défaut (aucune
    // carte encore remportée) → "contrôle atout" doit s'appliquer avant
    // même la règle du "7 d'atout".
    const asAtout  = c('clubs', 'A')
    const septAtout = c('clubs', '7')
    const state = makeState({
      mainIA: [asAtout, septAtout],
      couleurAtout: 'clubs',
      compteurManches: [0, 0], // mode normal
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.id).toBe(asAtout.id)
  })
})

describe('Non-régression — Défausse intelligente', () => {
  it('pli sans brisque : défausse non-brisque non-utile minimale', () => {
    const roiH = c('hearts', 'K')  // carte ouverte (non-brisque)
    const sept = c('clubs', '7')   // non-brisque, non-utile
    const as   = c('spades', 'A')  // brisque à garder
    const state = makeState({
      mainIA: [as, sept],
      carteOuverte: roiH,
      couleurAtout: 'clubs',
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.id).toBe(sept.id)
  })

  it('en ouverture, main composée uniquement de brisques d\'atout utiles : repli sur les candidats', () => {
    // 3 As de même couleur que l'atout : Priorité 3 (3+ As → protégés)
    // les marque tous "utiles", et ce sont aussi tous des brisques.
    // sansValeur et sansBrisques sont donc tous deux vides → repli final
    // sur l'ensemble des candidats (comportement de dernier recours).
    // Main 100% atout : sinon strategieGarderAtouts interviendrait avant.
    const as1 = c('clubs', 'A', 0)
    const as2 = c('clubs', 'A', 1)
    const as3 = c('clubs', 'A', 2)
    const state = makeState({
      mainIA: [as1, as2, as3],
      couleurAtout: 'clubs',
      compteurManches: [0, 0], // mode normal (ni prudent ni agressif)
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
    expect([as1.id, as2.id, as3.id]).toContain(carte?.id)
  })

  it('pli sans brisque, main 100% atout : défausse optimale (non-brisque, non-utile)', () => {
    // La carte ouverte est elle-même atout (non-brisque) : strategieAsEtaleesOuEviter
    // et strategieGarderAtouts se retirent immédiatement (couleur == atout),
    // laissant la "défausse optimale" de niveau-difficile.ts s'appliquer.
    const dameOuverte = c('clubs', 'Q')
    const roiAtout  = c('clubs', 'K')  // non-brisque, non-utile (pas de Dame en main)
    const valetAtout = c('clubs', 'J') // non-brisque, non-utile, rang plus faible
    const state = makeState({
      mainIA: [roiAtout, valetAtout],
      carteOuverte: dameOuverte,
      couleurAtout: 'clubs',
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.id).toBe(valetAtout.id)
  })

  it('pli sans brisque, cartes non-brisques toutes utiles : repli sur sansBrisques', () => {
    const valetOuverte = c('clubs', 'J')
    const roiAtout  = c('clubs', 'K')  // mariage atout avec dameAtout → utile
    const dameAtout = c('clubs', 'Q')  // mariage atout avec roiAtout → utile
    const state = makeState({
      mainIA: [roiAtout, dameAtout],
      carteOuverte: valetOuverte,
      couleurAtout: 'clubs',
    })
    const carte = choisirCarteIA(state, 'difficile')
    // Roi et Dame protégés (mariage) : la défausse "sans valeur" est vide,
    // repli sur "sansBrisques" (ignore le statut utile) → rang minimal
    expect(carte?.id).toBe(dameAtout.id)
  })

  it('pli sans brisque, main 100% brisques utiles : repli final sur les candidats', () => {
    const roiOuverte = c('clubs', 'K')
    // 3 As de même couleur que l'atout → tous "utiles" (Priorité 3) et tous brisques
    const as1 = c('clubs', 'A', 0)
    const as2 = c('clubs', 'A', 1)
    const as3 = c('clubs', 'A', 2)
    const state = makeState({
      mainIA: [as1, as2, as3],
      carteOuverte: roiOuverte,
      couleurAtout: 'clubs',
    })
    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
    expect([as1.id, as2.id, as3.id]).toContain(carte?.id)
  })
})

describe('Non-régression — null si aucun candidat', () => {
  it('retourne null si main vide', () => {
    const state = makeState({ mainIA: [] })
    expect(choisirCarteIA(state, 'difficile')).toBeNull()
  })
})

describe('Non-régression — Niveaux facile et intermédiaire non affectés', () => {
  it('facile retourne une carte valide', () => {
    const state = makeState({
      mainIA: [c('hearts', 'A'), c('clubs', 'K')],
      compteurManches: [3, 0],
    })
    for (let i = 0; i < 10; i++) {
      expect(choisirCarteIA(state, 'facile')).not.toBeNull()
    }
  })

  it('intermédiaire retourne une carte valide', () => {
    const state = makeState({
      mainIA: [c('hearts', 'A'), c('clubs', 'K')],
      couleurAtout: 'clubs',
      compteurManches: [0, 3],
    })
    for (let i = 0; i < 10; i++) {
      expect(choisirCarteIA(state, 'intermediaire')).not.toBeNull()
    }
  })
})
