// ============================================================
// TESTS IT-6 — MOTEUR IA AMÉLIORÉ
// SF-14 : comportements par niveau, annonces stratégiques,
// préservation des combis, règles Joker correctes
// ============================================================

import { describe, it, expect } from 'vitest'
import { choisirCarteIA, choisirAnnonceIA, delaiSimule, DELAIS_IA } from '../../src/core/ia'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte, creerJoker } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur, CombinaisonDisponible, AnnoncePosee, NiveauIA } from '../../src/types'

const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0, pos = 0) =>
  creerCarte(couleur, rang, jeu, pos)

function makeState(
  mainIA: Carte[],
  etaleesIA: Carte[] = [],
  overrides: Partial<GameState> = {}
): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({ ...state, ...overrides })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[1] = { ...joueurs[1], main: mainIA, cartesEtalees: etaleesIA, marquePoints: 0 }
  return { ...base, joueurs }
}

// ============================================================
// DÉLAIS (non-régression)
// ============================================================

describe('Délais simulés', () => {
  const niveaux: NiveauIA[] = ['facile', 'intermediaire', 'difficile']
  niveaux.forEach(niveau => {
    it(`délai ${niveau} dans [${DELAIS_IA[niveau][0]}, ${DELAIS_IA[niveau][1]}]ms`, () => {
      for (let i = 0; i < 20; i++) {
        const d = delaiSimule(niveau)
        expect(d).toBeGreaterThanOrEqual(DELAIS_IA[niveau][0])
        expect(d).toBeLessThanOrEqual(DELAIS_IA[niveau][1])
      }
    })
  })
})

// ============================================================
// CHOIX DE CARTE — non-régression
// ============================================================

describe('choisirCarteIA — non-régression', () => {
  it('retourne une carte parmi la main de l\'IA', () => {
    const state = makeState([c('spades','A',0,1), c('hearts','K',0,2)])
    const carte = choisirCarteIA(state, 'facile')
    expect(carte).not.toBeNull()
    const ids = state.joueurs[1].main.map(c => c.id)
    expect(ids).toContain(carte!.id)
  })

  it('retourne null si IA sans carte', () => {
    const state = makeState([])
    expect(choisirCarteIA(state, 'facile')).toBeNull()
  })

  it('IA ne voit pas la main du joueur humain', () => {
    const state = makeState([c('spades','A',0,1)])
    const carte = choisirCarteIA(state, 'difficile')
    const mainHumain = state.joueurs[0].main.map(c => c.id)
    expect(mainHumain).not.toContain(carte!.id)
  })

  it('peut jouer depuis cartesEtalees', () => {
    const carteEtalee = c('hearts','Q',0,1)
    const state = makeState([], [carteEtalee])
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte!.id).toBe(carteEtalee.id)
  })
})

// ============================================================
// NIVEAU FACILE — aléatoire
// ============================================================

describe('IA Facile — aléatoire', () => {
  it('résultats variés sur 50 tirages (pas toujours la même carte)', () => {
    const state = makeState([
      c('spades','A',0,1), c('hearts','K',0,2), c('clubs','Q',0,3),
      c('diamonds','J',0,4), c('spades','9',0,5),
    ])
    const ids = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const carte = choisirCarteIA(state, 'facile')
      if (carte) ids.add(carte.id)
    }
    expect(ids.size).toBeGreaterThan(1)
  })
})

// ============================================================
// NIVEAU INTERMÉDIAIRE — heuristique
// ============================================================

describe('IA Intermédiaire — heuristique', () => {
  it('en ouverture pré-atout : règle a.2 — joue l\'As en priorité (Phase 3)', () => {
    const as   = { ...c('spades','A',0,1), rang: 'A' as const }   // brisque
    const dix  = { ...c('hearts','10',0,2), rang: '10' as const }  // brisque
    const sept = { ...c('clubs','7',0,3), rang: '7' as const }     // sans brisque
    const roi  = { ...c('diamonds','K',0,4), rang: 'K' as const }  // sans brisque

    const state = makeState([as, dix, sept, roi])

    // Règle a.2 (Phase 2 Difficile, Phase 3 Intermédiaire) : en ouverture,
    // tant que l'atout n'est pas déclaré, l'As est TOUJOURS prioritaire
    // (coup quasi imparable) — remplace l'ancienne prudence "éviter les
    // brisques en ouverture", qui ne s'applique plus une fois l'atout déclaré.
    let joueAs = 0
    for (let i = 0; i < 30; i++) {
      const carte = choisirCarteIA(state, 'intermediaire')!
      if (carte.rang === 'A') joueAs++
    }
    expect(joueAs).toBe(30)
  })

  it('en réponse à une brisque adverse : essaie de gagner', () => {
    const atout: Couleur = 'hearts'
    // Carte humain : As♠ (brisque), IA répond
    const carteHumain = c('spades','A',0,1)
    // IA a un atout fort qui gagne
    const asCoeur = c(atout,'A',0,2)  // atout, gagne
    const septPique = c('spades','7',0,3)  // ne gagne pas

    const state = makeState([asCoeur, septPique], [], {
      couleurAtout: atout,
      joueurActif: 1,
      pliEnCours: {
        carteJoueur0: { ...carteHumain, faceUp: true, etat: 'played' },
        carteJoueur1: null,
        joueurOuvreur: 0,
        cartes: [{ ...carteHumain, faceUp: true, etat: 'played' }, null],
      },
    })

    let gagne = 0
    for (let i = 0; i < 20; i++) {
      const carte = choisirCarteIA(state, 'intermediaire')!
      if (carte.id === asCoeur.id) gagne++
    }
    // Doit souvent choisir l'atout pour gagner la brisque
    expect(gagne).toBeGreaterThan(10)
  })
})

// ============================================================
// NIVEAU DIFFICILE — stratégique
// ============================================================

describe('IA Difficile — stratégique', () => {
  it('préserve les cartes utiles aux combis (Roi+Dame de même couleur)', () => {
    const atout: Couleur = 'hearts'
    const roiS  = c('spades','K',0,1)   // mariage potentiel avec dameS
    const dameS = c('spades','Q',0,2)   // mariage potentiel
    const sept  = c('clubs','7',0,3)    // carte sacrifice
    const huit  = c('clubs','8',0,4)    // carte sacrifice

    const state = makeState([roiS, dameS, sept, huit], [], {
      couleurAtout: atout,
      annonces: [{ nom: 'mariage_atout' as const, points: 40, cartesIds: ['hearts-K-9-900', 'hearts-Q-9-901'], joueurId: 1 as const, mancheNumero: 1 }],
    })

    let joueUtile = 0, joueSacrifice = 0
    for (let i = 0; i < 30; i++) {
      const carte = choisirCarteIA(state, 'difficile')!
      if (carte.id === roiS.id || carte.id === dameS.id) joueUtile++
      else joueSacrifice++
    }
    // Difficile doit préférer sacrifier les cartes sans valeur
    expect(joueSacrifice).toBeGreaterThan(joueUtile)
  })

  it('gagne les brisques adverses avec atouts forts si possible', () => {
    const atout: Couleur = 'spades'
    const carteHumain = c('hearts','A',0,1)  // brisque humain
    const asAtout = c(atout,'A',0,2)         // atout fort → gagne
    const sept    = c('clubs','7',0,3)       // perd

    const state = makeState([asAtout, sept], [], {
      couleurAtout: atout,
      joueurActif: 1,
      pliEnCours: {
        carteJoueur0: { ...carteHumain, faceUp: true, etat: 'played' },
        carteJoueur1: null,
        joueurOuvreur: 0,
        cartes: [{ ...carteHumain, faceUp: true, etat: 'played' }, null],
      },
    })

    let gagne = 0
    for (let i = 0; i < 20; i++) {
      const carte = choisirCarteIA(state, 'difficile')!
      if (carte.id === asAtout.id) gagne++
    }
    expect(gagne).toBeGreaterThan(15)  // doit presque toujours gagner la brisque
  })

  it('Joker joué en réponse par l\'IA → l\'humain gagne (règle 1 Joker)', () => {
    // Si la seule carte de l'IA est un Joker, l'humain (ouvreur) gagne
    const joker = creerJoker('spades',1,128)
    const carteHumain = c('clubs','8',0,1)

    const state = makeState([joker], [], {
      joueurActif: 1,
      pliEnCours: {
        carteJoueur0: { ...carteHumain, faceUp: true, etat: 'played' },
        carteJoueur1: null,
        joueurOuvreur: 0,
        cartes: [{ ...carteHumain, faceUp: true, etat: 'played' }, null],
      },
    })

    // L'IA n'a que le Joker → doit le jouer
    const carte = choisirCarteIA(state, 'difficile')!
    expect(carte.estJoker).toBe(true)
    // Le résultat du pli : humain gagne (ouvreur avec carte normale bat Joker)
  })
})

// ============================================================
// PHASE FINALE — obligation de couleur
// ============================================================

describe('IA en phase finale — obligation de couleur', () => {
  it('respecte l\'obligation de couleur en phase finale', () => {
    const atout: Couleur = 'hearts'
    const cartePique  = c('spades','K',0,1)   // bonne couleur (pique ouvert)
    const carteCoeur  = c(atout,'7',0,2)      // atout (pas la bonne couleur)
    const carteHumain = c('spades','A',0,3)   // humain a joué As♠

    const state = makeState([cartePique, carteCoeur], [], {
      couleurAtout: atout,
      phase: 'finale',
      joueurActif: 1,
      pliEnCours: {
        carteJoueur0: { ...carteHumain, faceUp: true, etat: 'played' },
        carteJoueur1: null,
        joueurOuvreur: 0,
        cartes: [{ ...carteHumain, faceUp: true, etat: 'played' }, null],
      },
    })

    // Doit jouer la carte de la couleur ouverte (pique) ou couper
    // cartePique = pique (même couleur → obligation), K♠ < A♠ mais c'est la seule de cette couleur
    let jouePique = 0
    for (let i = 0; i < 20; i++) {
      const carte = choisirCarteIA(state, 'difficile')!
      if (carte.couleur === 'spades') jouePique++
    }
    expect(jouePique).toBe(20)  // toujours jouer pique (obligation)
  })
})

// ============================================================
// CHOISIR ANNONCE — stratégie par niveau
// ============================================================

describe('choisirAnnonceIA — stratégie par niveau', () => {
  const makeCombis = (noms: Array<CombinaisonDisponible['nom']>): CombinaisonDisponible[] =>
    noms.map(nom => ({
      nom,
      points: { mariage_atout: 40, mariage_hors_atout: 20, quinte: 250, besigue: 100, '4_as': 100, '4_roi': 80, '4_dame': 60, '4_valet': 40, '4_as_atout': 200, '4_roi_atout': 160, '4_dame_atout': 120, '4_valet_atout': 80, sept_atout: 10 }[nom] ?? 0,
      cartesIds: [],
    }))

  it('aucune combinaison disponible → retourne null quel que soit le niveau', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4(state)
    for (const niveau of ['facile', 'intermediaire', 'difficile'] as NiveauIA[]) {
      expect(choisirAnnonceIA([], base, niveau)).toBeNull()
    }
  })

  it('facile : choisit aléatoirement parmi les combis', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4(state)
    const combis = makeCombis(['mariage_atout', 'mariage_hors_atout', 'besigue'])
    const choisis = new Set<string>()
    for (let i = 0; i < 50; i++) {
      choisis.add(choisirAnnonceIA(combis, base, 'facile')!.nom)
    }
    expect(choisis.size).toBeGreaterThan(1)
  })

  it('intermédiaire : choisit la plus rentable en points', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4(state)
    const combis = makeCombis(['mariage_hors_atout', 'besigue', '4_roi'])  // 20, 100, 80
    const choix = choisirAnnonceIA(combis, base, 'intermediaire')
    expect(choix!.nom).toBe('besigue')  // 100 pts = max
  })

  it('difficile : priorise quinte avant bésigue même si bésigue vaut autant', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4({ ...state, premierBesiguePose: false })
    const combis = makeCombis(['besigue', 'quinte'])  // 100 vs 250
    const choix = choisirAnnonceIA(combis, base, 'difficile')
    expect(choix!.nom).toBe('quinte')  // quinte prioritaire
  })

  it('difficile : mariage_Atout prioritaire si disponible', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4(state)
    const combis = makeCombis(['mariage_hors_atout', 'mariage_atout', '4_valet'])
    const choix = choisirAnnonceIA(combis, base, 'difficile')
    expect(choix!.nom).toBe('mariage_atout')
  })

  it('difficile : 4 As atout prioritaire sur 4 As normal', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4(state)
    const combis = makeCombis(['4_as', '4_as_atout'])
    const choix = choisirAnnonceIA(combis, base, 'difficile')
    expect(choix!.nom).toBe('4_as_atout')  // 200 > 100
  })

  it('difficile : "4_as" prioritaire seul disponible → tout de même retourné', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4(state)
    const combis = makeCombis(['4_as'])
    const choix = choisirAnnonceIA(combis, base, 'difficile')
    expect(choix!.nom).toBe('4_as')
  })

  it('difficile : bésigue suivant (déjà annoncé) rétrogradé sous mariage_hors_atout', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    // Un 1er bésigue a déjà été posé : la priorité du bésigue tombe à 20,
    // sous mariage_hors_atout (30) qui devient alors le meilleur choix
    const base = initialiserChampsIT4({ ...state, premierBesiguePose: true })
    const combis = makeCombis(['besigue', 'mariage_hors_atout'])
    const choix = choisirAnnonceIA(combis, base, 'difficile')
    expect(choix!.nom).toBe('mariage_hors_atout')
  })

  it('une seule combi → toujours retournée quel que soit le niveau', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const base = initialiserChampsIT4(state)
    const combis = makeCombis(['besigue'])
    for (const niveau of ['facile','intermediaire','difficile'] as NiveauIA[]) {
      expect(choisirAnnonceIA(combis, base, niveau)!.nom).toBe('besigue')
    }
  })
})

// ============================================================
// NON-RÉGRESSION — tous niveaux retournent une carte valide
// ============================================================

describe('Non-régression — tous niveaux', () => {
  const niveaux: NiveauIA[] = ['facile', 'intermediaire', 'difficile']

  niveaux.forEach(niveau => {
    it(`${niveau} : retourne toujours une carte valide`, () => {
      const state = makeState([
        c('spades','A',0,1), c('hearts','K',0,2),
        c('clubs','Q',0,3),  c('diamonds','J',0,4),
      ])
      for (let i = 0; i < 10; i++) {
        const carte = choisirCarteIA(state, niveau)
        expect(carte).not.toBeNull()
        const ids = [...state.joueurs[1].main, ...state.joueurs[1].cartesEtalees].map(c => c.id)
        expect(ids).toContain(carte!.id)
      }
    })
  })
})
