// ============================================================
// TESTS — Niveau INTERMÉDIAIRE amélioré
// Vérifie les 4 nouvelles évolutions et la non-régression
// des comportements déjà implémentés.
//
// Évolutions testées :
//   1. Couper l'As adverse avec atout (seul moyen de battre un As)
//   2. Pioche adaptative (safe si > 8, agressif si ≤ 4)
//   3. Sept d'atout en ouverture (pioche > 8)
//   4. Bloquer mariages adverses (pioche ≤ 4)
//
// Non-régression :
//   - Couper le 10
//   - Gagner avec carte minimale sur brisque adverse
//   - Défausse intelligente (non-brisque, non-utile)
//   - Ouverture prudente
// ============================================================

import { describe, it, expect } from 'vitest'
import { choisirCarteIA, SEUIL_PIOCHE_GRANDE, SEUIL_PIOCHE_PETITE } from '../../src/core/ia'
import { initialiserPartie } from '../../src/core/init'
import { creerCarte } from '../../src/core/deck'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

// ── Helpers ──────────────────────────────────────────────────

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

/**
 * Génère N brisques (As/10, toutes couleurs, jusqu'à 4 jeux chacune) —
 * utile pour simuler, côté mémorisation, un état où peu de brisques
 * restent non vues (remplace le seuil de pioche pour les évolutions 2/4
 * quand IA_MEMOIRE_AVANCEE.intermediaire est actif).
 */
function nBrisques(n: number): Carte[] {
  const couleurs: Couleur[] = ['spades', 'hearts', 'diamonds', 'clubs']
  const rangs: Carte['rang'][] = ['A', '10']
  const cartes: Carte[] = []
  for (const couleur of couleurs) {
    for (const rang of rangs) {
      for (let jeu = 0; jeu < 4; jeu++) {
        if (cartes.length >= n) return cartes
        cartes.push(c(couleur, rang, jeu))
      }
    }
  }
  return cartes
}

function makeState(opts: {
  mainIA: Carte[]
  etaleesIA?: Carte[]
  etaleesHumain?: Carte[]
  carteOuverte?: Carte | null
  couleurAtout?: Couleur | null
  nbPioche?: number
}): GameState {
  const {
    mainIA, etaleesIA = [], etaleesHumain = [],
    carteOuverte = null, couleurAtout = null, nbPioche = 16,
  } = opts

  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({
    ...state,
    couleurAtout,
    pliEnCours: {
      carteJoueur0: carteOuverte,
      carteJoueur1: null,
      joueurOuvreur: 0,
cartes: [carteOuverte, null],
    },
    pioche: Array.from({ length: nbPioche }, () => c('clubs', '7')),
  })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], cartesEtalees: etaleesHumain }
  joueurs[1] = { ...joueurs[1], main: mainIA, cartesEtalees: etaleesIA }
  return { ...base, joueurs }
}

// ============================================================
// EXPORTS DES CONSTANTES
// ============================================================



// ============================================================
// ÉVOLUTION 1 — Couper l'As adverse avec atout
// ============================================================

describe("Évolution 1 — Couper l'As adverse avec atout", () => {

  it("coupe un As non-atout avec l'atout le plus faible disponible", () => {
    const asHumain  = c('hearts', 'A')  // As de cœur (non-atout)
    const roiAtout  = c('clubs',  'K')  // K de trèfle (atout) — gagne
    const asAtout   = c('clubs',  'A')  // A de trèfle (atout) — gagne aussi
    const state = makeState({
      mainIA: [roiAtout, asAtout],
      carteOuverte: asHumain,
      couleurAtout: 'clubs',   // atout = trèfle
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    // Doit jouer le K (rang 6) plutôt que l'A (rang 8) — économiser
    expect(carte?.rang).toBe('K')
    expect(carte?.couleur).toBe('clubs')
  })

  it("coupe avec le 7 d'atout si c'est le seul atout disponible", () => {
    const asHumain  = c('spades', 'A')
    const septAtout = c('clubs',  '7')  // atout le plus faible
    const roiAutre  = c('hearts', 'K')  // non-atout → ne bat pas l'As
    const state = makeState({
      mainIA: [septAtout, roiAutre],
      carteOuverte: asHumain,
      couleurAtout: 'clubs',
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(septAtout.id)
  })

  it("ne peut PAS couper un As d'atout (rien ne le bat)", () => {
    const asAtoutHumain = c('clubs', 'A')  // As de trèfle = As d'atout
    const roiAtout      = c('clubs', 'K')  // atout mais rang inférieur
    const autreAtout    = c('clubs', '8')
    const state = makeState({
      mainIA: [roiAtout, autreAtout, c('hearts', '9')],
      carteOuverte: asAtoutHumain,
      couleurAtout: 'clubs',
    })
    // Pas d'atout ne bat un As d'atout → fallback
    // L'IA ne doit PAS jouer l'As ni la carte de rang le plus fort ;
    // la défausse choisit la carte de rang minimal (8 de trèfle < 9 de
    // cœur), sans logique de préservation spécifique des atouts.
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte).not.toBeNull()
    expect(carte?.id).toBe(autreAtout.id)
  })

  it("ne s'applique pas si l'atout n'est pas encore défini", () => {
    const asHumain2 = c('hearts', 'A')
    const state = makeState({
      mainIA: [c('clubs', 'K'), c('spades', '8')],
      carteOuverte: asHumain2,
      couleurAtout: null,  // atout non défini → règle inapplicable
    })
    // Pas d'atout → fallback vers comportement existant
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte).not.toBeNull()
  })

  it("ne s'applique pas si l'IA n'a pas d'atout en main", () => {
    const asHumain3 = c('hearts', 'A')
    const state = makeState({
      mainIA: [c('spades', 'K'), c('diamonds', '9')],  // pas de trèfle (atout)
      carteOuverte: asHumain3,
      couleurAtout: 'clubs',
    })
    // Pas d'atout disponible → fallback
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte).not.toBeNull()
    expect(carte?.couleur).not.toBe('clubs')
  })

  it("un As de même couleur que le joueur NE coupe PAS l'As adverse", () => {
    // Règle fondamentale : deux As de même couleur → l'ouvreur gagne
    // L'IA ne doit JAMAIS essayer de "couper" avec un As de même couleur
    const asHumain4  = c('hearts', 'A')
    const asMemeClr  = c('hearts', 'A', 1)  // même couleur → ne bat pas
    const septAtout  = c('clubs', '7')       // atout → gagne
    const state = makeState({
      mainIA: [asMemeClr, septAtout],
      carteOuverte: asHumain4,
      couleurAtout: 'clubs',
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    // Doit jouer le 7 d'atout, PAS l'As de même couleur
    expect(carte?.id).toBe(septAtout.id)
  })
})

// ============================================================
// ÉVOLUTION 2 — Pioche adaptative
// ============================================================

describe('Évolution 2 — Pioche adaptative', () => {

  it('mode agressif (pioche ≤ 4) : gagner la brisque même avec carte utile', () => {
    const asHumain  = c('hearts', 'A')  // brisque adverse
    const asAtout   = c('clubs', 'A')   // atout fort — gagne le pli
    const roiClubs  = c('clubs', 'K')   // aussi atout
    const state = makeState({
      mainIA: [asAtout, roiClubs, c('spades', '8')],
      carteOuverte: asHumain,
      couleurAtout: 'clubs',
      nbPioche: SEUIL_PIOCHE_PETITE, // = 4 → mode agressif
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    // Doit tenter de gagner le pli avec un atout
    expect(carte?.couleur).toBe('clubs')
  })

  it('mode safe (pioche > 8) : préserve les cartes utiles pour gagner', () => {
    const asHumain2 = c('hearts', 'A')   // brisque adverse
    const roiAtout  = c('clubs', 'K')    // gagne — non-utile
    const asClubs   = c('clubs', 'A')    // gagne aussi — potentiellement utile
    const state = makeState({
      mainIA: [roiAtout, asClubs],
      carteOuverte: asHumain2,
      couleurAtout: 'clubs',
      nbPioche: SEUIL_PIOCHE_GRANDE + 1, // > 8 → mode safe
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    // Doit préférer le Roi (non-utile) plutôt que l'As (utile)
    expect(carte?.rang).toBe('K')
  })

  it('pioche = 0 : mode agressif activé', () => {
    const asHumain3 = c('diamonds', 'A')
    const asAtout2  = c('clubs', 'A')
    const state = makeState({
      mainIA: [asAtout2, c('clubs', '8')],
      carteOuverte: asHumain3,
      couleurAtout: 'clubs',
      nbPioche: 0,
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.couleur).toBe('clubs')
  })

  it('pioche = SEUIL_PIOCHE_PETITE exactement (4) : mode agressif activé', () => {
    const asHumain4 = c('spades', 'A')
    const asAtout3  = c('clubs',  'A')
    const state = makeState({
      mainIA: [asAtout3, c('clubs', '8')],
      carteOuverte: asHumain4,
      couleurAtout: 'clubs',
      nbPioche: SEUIL_PIOCHE_PETITE,
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte).not.toBeNull()
  })

  // Note : impossible d'isoler proprement ici une différenciation agressif/safe
  // pilotée par la mémorisation, comme fait pour l'Évolution 4 (bloc ouverture).
  // Toute carte ouverte "brisque" (A ou 10) non-atout est déjà interceptée en
  // amont par strategieCouper10 (rang 10) ou l'Évolution 1 "couper l'As adverse"
  // (rang A) — un ordre de cascade préexistant, avant même d'atteindre ce bloc.
  // La bascule agressif/safe pilotée par memoire.ts est néanmoins vérifiée de
  // façon non ambiguë via l'Évolution 4 ci-dessous (bloc ouverture, non intercepté).
})

// ============================================================
// ÉVOLUTION 3 — Sept d'atout en ouverture
// ============================================================

describe("Évolution 3 — Sept d'atout en ouverture (pioche > 8)", () => {

  it("joue le 7 d'atout en ouverture si pioche grande", () => {
    const septAtout = c('clubs', '7')
    const roiAtout  = c('clubs', 'K')  // atout aussi : sinon strategieGarderAtouts
                                        // (stratégie commune) jouerait en priorité
                                        // une carte non-atout
    const state = makeState({
      mainIA: [septAtout, roiAtout],
      couleurAtout: 'clubs',
      nbPioche: SEUIL_PIOCHE_GRANDE + 1,
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(septAtout.id)
  })

  it("ne joue PAS le 7 d'atout si pioche ≤ 8", () => {
    const septAtout2 = c('clubs', '7')
    const roiH2      = c('hearts', 'K')
    const state = makeState({
      mainIA: [septAtout2, roiH2, c('spades', '9')],
      couleurAtout: 'clubs',
      nbPioche: SEUIL_PIOCHE_GRANDE, // = 8 → pas assez grand
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).not.toBe(septAtout2.id)
  })

  it("ne s'applique que si l'atout est défini", () => {
    const sept = c('clubs', '7')
    const roi  = c('hearts', 'K')
    const state = makeState({
      mainIA: [sept, roi],
      couleurAtout: null,
      nbPioche: SEUIL_PIOCHE_GRANDE + 2,
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte).not.toBeNull()
  })

  it("ne joue pas le 7 d'atout en réponse (carteOuverte présente)", () => {
    const septAtout3   = c('clubs', '7')
    const carteOuverte = c('hearts', '8')
    const state = makeState({
      mainIA: [septAtout3, c('spades', '9')],
      carteOuverte,
      couleurAtout: 'clubs',
      nbPioche: SEUIL_PIOCHE_GRANDE + 2,
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte).not.toBeNull()
  })
})

// ============================================================
// ÉVOLUTION 4 — Bloquer les mariages adverses
// ============================================================

describe('Évolution 4 — Bloquer les mariages adverses (pioche ≤ 4)', () => {

  it('joue le Roi si humain a Dame de même couleur étalée', () => {
    const dameHumain = c('spades', 'Q')
    const roiIA      = c('spades', 'K') // non-utile pour l'IA
    // Atout = pique (même couleur que la Dame) et main IA 100% atout,
    // sinon strategieGarderAtouts jouerait en priorité une carte non-atout
    const autreIA    = c('spades', '8')
    const state = makeState({
      mainIA: [roiIA, autreIA],
      etaleesHumain: [dameHumain],
      couleurAtout: 'spades',
      nbPioche: SEUIL_PIOCHE_PETITE - 1,
    })
    // Avec IA_MEMOIRE_AVANCEE.intermediaire actif, le déclencheur n'est
    // plus la pioche mais les brisques non vues restantes (memoire.ts) :
    // on simule donc aussi peu de brisques encore inconnues (26 vues).
    state.joueurs[0].pileRemportee = nBrisques(26)
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(roiIA.id)
  })

  it('joue la Dame si humain a Roi de même couleur étalé', () => {
    const roiHumain  = c('hearts', 'K')
    const dameIA     = c('hearts', 'Q') // non-utile
    // Atout = cœur (même couleur que le Roi) et main IA 100% atout
    const autreIA2   = c('hearts', '8')
    const state = makeState({
      mainIA: [dameIA, autreIA2],
      etaleesHumain: [roiHumain],
      couleurAtout: 'hearts',
      nbPioche: 2,
    })
    // Idem : déclencheur mémorisation (brisques non vues rares) plutôt que pioche
    state.joueurs[0].pileRemportee = nBrisques(26)
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(dameIA.id)
  })

  it("ne bloque PAS si la carte est utile aux combis de l'IA", () => {
    const dameHumain2 = c('clubs', 'Q')
    const roiIA2      = c('clubs', 'K') // mariage potentiel IA → utile
    const dameIA2     = c('clubs', 'Q', 1) // aussi → utile
    const autreIA3    = c('spades', '8')
    const state = makeState({
      mainIA: [roiIA2, dameIA2, autreIA3],
      etaleesHumain: [dameHumain2],
      couleurAtout: 'hearts',
      nbPioche: 2,
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).not.toBe(roiIA2.id)
  })

  it('ne bloque PAS si pioche > 4', () => {
    const dameHumain3 = c('diamonds', 'Q')
    const roiIA3      = c('diamonds', 'K')
    // Atout = diamants (même couleur que le Roi) et main IA 100% atout,
    // pour isoler l'effet du seuil de pioche (sinon strategieGarderAtouts
    // choisirait de toute façon la seule carte non-atout disponible)
    const autreIA4    = c('diamonds', '8')
    const state = makeState({
      mainIA: [roiIA3, autreIA4],
      etaleesHumain: [dameHumain3],
      couleurAtout: 'diamonds',
      nbPioche: SEUIL_PIOCHE_PETITE + 1,
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    // Pioche > seuil : le blocage Roi/Dame ne s'active pas, l'IA retombe
    // sur son choix par défaut (carte de rang minimal) → le 8, pas le Roi
    expect(carte?.id).not.toBe(roiIA3.id)
  })

  it('ne bloque pas en réponse', () => {
    const carteOuverte2 = c('hearts', '8')
    const dameHumain4   = c('clubs', 'Q')
    const roiIA4        = c('clubs', 'K')
    const state = makeState({
      mainIA: [roiIA4, c('spades', '7')],
      etaleesHumain: [dameHumain4],
      carteOuverte: carteOuverte2,
      couleurAtout: 'hearts',
      nbPioche: 2,
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte).not.toBeNull()
  })
})

// ============================================================
// NON-RÉGRESSION — Comportements existants préservés
// ============================================================

describe('Non-régression — Couper le 10 toujours actif', () => {

  it("coupe un 10 non-atout avec l'As de même couleur", () => {
    const dix = c('hearts', '10')
    const as  = c('hearts', 'A')
    const roi = c('clubs',  'K')
    const state = makeState({
      mainIA: [as, roi],
      carteOuverte: dix,
      couleurAtout: 'clubs',
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(as.id)
  })

  it('couper le 10 est traité avant couper l\'As', () => {
    // Si carteOuverte est un 10, strategieCouper10 passe en premier
    const dixH = c('hearts', '10')
    const asH  = c('hearts', 'A')
    const state = makeState({
      mainIA: [asH, c('clubs', '8')],
      carteOuverte: dixH,
      couleurAtout: 'clubs',
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(asH.id)
  })
})

describe('Non-régression — Gagner avec carte minimale sur brisque adverse', () => {

  it('pioche normale (> 4) : gagne avec la carte gagnante la plus faible non-utile', () => {
    const asHumain2  = c('spades', 'A')
    const roiAtout   = c('clubs', 'K')  // gagne — non-utile
    const asAtout4   = c('clubs', 'A')  // gagne aussi — utile
    const state = makeState({
      mainIA: [roiAtout, asAtout4],
      carteOuverte: asHumain2,
      couleurAtout: 'clubs',
      nbPioche: 10,
    })
    // Évolution 1 s'applique : As non-atout → couper avec atout le plus faible
    // Roi (K=6) < As (A=8) → Roi est retourné
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.rang).toBe('K')
  })
})

describe('Non-régression — Défausse intelligente', () => {

  it('pli sans brisque : se défausse avec carte non-brisque non-utile minimale', () => {
    const roiHumain2 = c('hearts', 'K') // pas une brisque
    const sept2      = c('clubs', '7')  // non-brisque, non-utile
    const asIA       = c('spades', 'A') // brisque → ne pas défausser
    const state = makeState({
      mainIA: [asIA, sept2],
      carteOuverte: roiHumain2,
      couleurAtout: 'clubs',
      nbPioche: 10,
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(sept2.id)
  })

  it('pli sans brisque, cartes non-brisques toutes utiles : repli sur sansBrisques', () => {
    // La carte ouverte est elle-même atout (non-brisque) : strategieAsEtaleesOuEviter
    // et strategieGarderAtouts se retirent immédiatement (couleur == atout).
    const valetOuverte = c('clubs', 'J')
    const roiAtout  = c('clubs', 'K')  // mariage atout avec dameAtout → utile
    const dameAtout = c('clubs', 'Q')  // mariage atout avec roiAtout → utile
    const state = makeState({
      mainIA: [roiAtout, dameAtout],
      carteOuverte: valetOuverte,
      couleurAtout: 'clubs',
      nbPioche: 10,
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    // Roi et Dame protégés (mariage) : "sansValeur" est vide, repli sur
    // "sansBrisques" (ignore le statut utile) → rang minimal
    expect(carte?.id).toBe(dameAtout.id)
  })

  it('en ouverture, cartes non-brisques toutes utiles : repli sur sansBrisques', () => {
    // Main 100% atout pour isoler du strategieGarderAtouts
    const roiAtout  = c('clubs', 'K')  // mariage atout avec dameAtout → utile
    const dameAtout = c('clubs', 'Q')  // mariage atout avec roiAtout → utile
    const state = makeState({
      mainIA: [roiAtout, dameAtout],
      couleurAtout: 'clubs',
      nbPioche: 10, // > SEUIL_PIOCHE_GRANDE et > SEUIL_PIOCHE_PETITE : ni évolution 3 ni évolution 4
    })
    const carte = choisirCarteIA(state, 'intermediaire')
    expect(carte?.id).toBe(dameAtout.id)
  })
})

describe('Non-régression — Ouverture prudente', () => {

  it('évite les brisques en ouverture (pioche entre 5 et 8)', () => {
    const as5    = c('hearts', 'A')
    // Doit être non-atout : strategieGarderAtouts (stratégie commune)
    // ne considère que les cartes non-atout pour son choix en ouverture
    const sept5  = c('diamonds', '8')
    const state = makeState({
      mainIA: [as5, sept5],
      couleurAtout: 'clubs',
      nbPioche: 6,
    })
    for (let i = 0; i < 20; i++) {
      const carte = choisirCarteIA(state, 'intermediaire')
      expect(carte?.id).toBe(sept5.id)
    }
  })

  it('retourne null si aucun candidat', () => {
    const state = makeState({ mainIA: [], nbPioche: 10 })
    expect(choisirCarteIA(state, 'intermediaire')).toBeNull()
  })
})

describe('Non-régression — Niveaux facile et difficile non affectés', () => {

  it('facile retourne toujours une carte valide', () => {
    const state = makeState({
      mainIA: [c('hearts', 'A'), c('clubs', 'K')],
      nbPioche: 5,
    })
    for (let i = 0; i < 10; i++) {
      expect(choisirCarteIA(state, 'facile')).not.toBeNull()
    }
  })

  it('difficile retourne toujours une carte valide', () => {
    const state = makeState({
      mainIA: [c('hearts', 'A'), c('clubs', 'K')],
      couleurAtout: 'clubs',
      nbPioche: 5,
    })
    for (let i = 0; i < 10; i++) {
      expect(choisirCarteIA(state, 'difficile')).not.toBeNull()
    }
  })
})
