// ============================================================
// TESTS — Piste 2 : bonus du 7 d'atout intégré à l'évaluation du
// minimax de phase finale (minimaxFinale.ts)
//
// Avant piste 2 : l'évaluation ne comptait que le différentiel de
// brisques (As+10) et le bonus dernier pli — le bonus réel de +10 pts
// accordé par pli.ts au joueur qui JOUE le 7 d'atout (indépendamment
// du fait qu'il gagne le pli) n'était pas modélisé, alors même que le
// commentaire du module le reconnaissait explicitement.
//
// Après piste 2 : `bonusSeptAtout(joueur, carte, couleurAtout)` calcule
// ce bonus/malus, appliqué IMMÉDIATEMENT au tour où la carte est jouée
// (cf. `jouerCoup`), fidèle à la règle réelle de pli.ts.
//
// PROPRIÉTÉ MATHÉMATIQUE VÉRIFIÉE (importante pour comprendre la
// portée réelle de ce correctif) : en phase finale, les DEUX mains
// sont intégralement vidées avant la fin de la récursion (`terminee`
// exige mains[0] et mains[1] vides) — chaque carte initialement en
// main EST donc jouée exactement une fois, quel que soit l'ordre des
// coups choisis. Le nombre de 7 d'atout que l'IA (ou l'adversaire)
// finira par jouer d'ici la fin de la manche est donc entièrement fixé
// par la composition des mains de DÉPART, jamais par la stratégie.
// Conséquence : `bonusSeptAtout` ajoute une CONSTANTE additive
// identique à toutes les branches d'un même nœud de décision — il ne
// peut donc JAMAIS, à lui seul, changer la carte choisie par
// `choisirCarteMinimaxFinale` (max(X+c) = max(X)+c pour c constant).
// Cette propriété est vérifiée empiriquement ci-dessous (deux coups
// dont les valeurs incluent chacun le même total de bonus 7 d'atout
// aboutissent à une STRICTE égalité) plutôt que simplement supposée.
//
// La valeur de piste 2 est donc réelle mais precise : elle rend
// l'évaluation NUMÉRIQUEMENT fidèle aux points réellement comptés par
// le moteur (utile pour toute réutilisation future de cette valeur,
// ex. affichage, comparaison, extension du module), sans pour autant
// changer aucune décision de jeu dans l'usage actuel (recherche
// exhaustive jusqu'à épuisement des deux mains). Les tests
// ci-dessous documentent explicitement cette propriété plutôt que de
// prétendre à tort qu'elle changerait le comportement de l'IA.
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  bonusSeptAtout,
  BONUS_SEPT_ATOUT_MINIMAX,
  BONUS_DERNIER_PLI_MINIMAX,
  choisirCarteMinimaxFinale,
} from '../../src/core/ia/minimaxFinale'
import { choisirCarteIA } from '../../src/core/ia'
import { cartesJouablesPhaseFinale } from '../../src/core/pli'
import { initialiserPartie } from '../../src/core/init'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { creerCarte, creerJoker, COULEURS, RANGS, NB_JEUX } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur, Rang } from '../../src/types'

// ── Helpers (repris à l'identique de tests/unit/minimaxFinale.test.ts,
//    pour garantir des états de fin de manche cohérents sur 132 cartes) ──

let _pos = 0
const c = (couleur: Couleur, rang: Rang, jeu = 0): Carte =>
  rang === 'JOKER' ? creerJoker(couleur, jeu, _pos++) : creerCarte(couleur, rang, jeu, _pos++)

function baseState(couleurAtout: Couleur | null): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({ ...state, couleurAtout, pioche: [] })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [], pileRemportee: [] }
  joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [], pileRemportee: [] }
  return {
    ...base,
    joueurs,
    pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 1, cartes: [null, null] },
  }
}

function stateEndgameCoherent(
  couleurAtout: Couleur | null,
  mainIA: Carte[],
  nonVuesVoulues: Carte[]
): GameState {
  const reserves = new Map<string, number>()
  for (const carte of [...mainIA, ...nonVuesVoulues]) {
    const cle = `${carte.couleur}|${carte.rang}`
    reserves.set(cle, (reserves.get(cle) ?? 0) + 1)
  }
  const vues: Carte[] = []
  for (const couleur of COULEURS) {
    for (const rang of RANGS) {
      const cle = `${couleur}|${rang}`
      const reserve = reserves.get(cle) ?? 0
      for (let i = 0; i < NB_JEUX - reserve; i++) {
        vues.push(creerCarte(couleur, rang, i, 500_000 + vues.length))
      }
    }
    const cleJoker = `${couleur}|JOKER`
    const reserveJoker = reserves.get(cleJoker) ?? 0
    for (let i = 0; i < 1 - reserveJoker; i++) {
      vues.push(creerJoker(couleur, i, 500_000 + vues.length))
    }
  }

  const state = baseState(couleurAtout)
  const joueurs = [...state.joueurs] as typeof state.joueurs
  joueurs[0] = {
    ...joueurs[0],
    main: Array.from({ length: nonVuesVoulues.length }, (_, i) => c('clubs', '9', i)), // longueur réaliste uniquement
    pileRemportee: vues.slice(0, Math.ceil(vues.length / 2)),
  }
  joueurs[1] = {
    ...joueurs[1],
    main: mainIA,
    pileRemportee: vues.slice(Math.ceil(vues.length / 2)),
  }
  return { ...state, joueurs }
}

// ============================================================
// bonusSeptAtout — fonction pure
// ============================================================

describe('Piste 2 — bonusSeptAtout (fonction pure)', () => {
  it('retourne 0 si aucun atout n\'est déclaré (couleurAtout = null)', () => {
    expect(bonusSeptAtout(1, c('clubs', '7'), null)).toBe(0)
  })

  it('retourne 0 pour un Joker (jamais assimilé au 7 d\'atout)', () => {
    expect(bonusSeptAtout(1, creerJoker('clubs', 0, 9001), 'clubs')).toBe(0)
  })

  it('retourne 0 pour une carte qui n\'est pas un 7', () => {
    expect(bonusSeptAtout(1, c('clubs', '8'), 'clubs')).toBe(0)
  })

  it('retourne 0 pour un 7 d\'une couleur différente de l\'atout', () => {
    expect(bonusSeptAtout(1, c('hearts', '7'), 'clubs')).toBe(0)
  })

  it('retourne +10 quand l\'IA (joueur 1) joue le 7 d\'atout', () => {
    expect(bonusSeptAtout(1, c('clubs', '7'), 'clubs')).toBe(10)
  })

  it('retourne -10 quand l\'adversaire (joueur 0) joue le 7 d\'atout', () => {
    expect(bonusSeptAtout(0, c('clubs', '7'), 'clubs')).toBe(-10)
  })

  it('BONUS_SEPT_ATOUT_MINIMAX vaut 10, aligné sur la règle réelle de pli.ts (+10 pts)', () => {
    expect(BONUS_SEPT_ATOUT_MINIMAX).toBe(10)
  })

  it('même magnitude que le bonus dernier pli (les deux bonus réels valent 10 pts dans le jeu)', () => {
    expect(BONUS_SEPT_ATOUT_MINIMAX).toBe(BONUS_DERNIER_PLI_MINIMAX)
  })
})

// ============================================================
// Propriété d'invariance à l'ordre — vérifiée empiriquement
// ============================================================

describe('Piste 2 — le bonus 7 d\'atout ne change jamais le choix (invariance à l\'ordre)', () => {
  // Scénario vérifié à la main ET par instrumentation du module :
  //   IA : 7♣ (atout faible, non-brisque) + K♣ (atout fort, non-brisque)
  //   Adversaire (déduit) : 9♣ (atout intermédiaire) + 8♥ (non-atout)
  // Que l'IA ouvre avec 7♣ ou avec K♣, elle finit par jouer SES DEUX
  // cartes (dont le 7♣) avant la fin de la manche : les deux choix
  // valent exactement 20 (0 brisque de différentiel + le bonus du 7
  // d'atout, joué par l'IA dans les deux cas, + le bonus dernier pli
  // remporté par l'IA dans les deux cas). Le module doit donc choisir
  // la carte qui apparaît EN PREMIER dans l'ordre de state.joueurs[1].main
  // (comportement du tie-break de `choisirCarteMinimaxFinale`, qui ne
  // remplace la meilleure carte que sur une inégalité STRICTE).

  it('main IA = [7♣, K♣] → choisit 7♣ (premier de la main, valeurs à égalité)', () => {
    const septAtout = c('clubs', '7')
    const roiAtout = c('clubs', 'K')
    const neufClub = c('clubs', '9')
    const huitCoeur = c('hearts', '8')

    const state = stateEndgameCoherent('clubs', [septAtout, roiAtout], [neufClub, huitCoeur])
    state.joueurs[1].main = [septAtout, roiAtout]

    const carte = choisirCarteMinimaxFinale([septAtout, roiAtout], state)
    expect(carte.id).toBe(septAtout.id)
  })

  it('main IA = [K♣, 7♣] (ordre inversé) → choisit K♣ (premier de la main, mêmes valeurs à égalité)', () => {
    const septAtout = c('clubs', '7')
    const roiAtout = c('clubs', 'K')
    const neufClub = c('clubs', '9')
    const huitCoeur = c('hearts', '8')

    const state = stateEndgameCoherent('clubs', [septAtout, roiAtout], [neufClub, huitCoeur])
    state.joueurs[1].main = [roiAtout, septAtout]

    const carte = choisirCarteMinimaxFinale([roiAtout, septAtout], state)
    expect(carte.id).toBe(roiAtout.id)
    // Confirme empiriquement que le SEUL facteur qui décide ici est
    // l'ordre d'itération, pas une préférence pour le 7 d'atout : la
    // présence du bonus n'introduit donc aucun biais de décision — il
    // enrichit uniquement la valeur numérique calculée (cohérence avec
    // pli.ts), sans jamais l'emporter sur les brisques ou le dernier pli.
  })
})

// ============================================================
// Non-régression — obligations de couleur/coupe toujours respectées
// en présence d'un 7 d'atout dans le pli
// ============================================================

describe('Piste 2 — non-régression : légalité des coups inchangée avec un 7 d\'atout en jeu', () => {
  it('un 7 d\'atout ouvert impose toujours l\'obligation de fournir la couleur (règles de pli.ts inchangées)', () => {
    const septAtoutHumain = c('clubs', '7')  // ouverture adverse avec le 7 d'atout (rang minimal)
    const dixClubIA = c('clubs', '10')       // seule carte d'atout de l'IA → doit la fournir
    const huitCoeurIA = c('hearts', '8')     // couleur différente → exclue par l'obligation de fournir

    const state = stateEndgameCoherent('clubs', [dixClubIA, huitCoeurIA], [c('spades', '9')])
    state.joueurs[1].main = [dixClubIA, huitCoeurIA]
    state.pliEnCours = {
      carteJoueur0: septAtoutHumain, carteJoueur1: null, joueurOuvreur: 0,
      cartes: [septAtoutHumain, null],
    }

    const candidats = cartesJouablesPhaseFinale([dixClubIA, huitCoeurIA], septAtoutHumain, 'clubs')
    // Obligation de fournir la couleur d'atout : seul le 10♣ est légal, le 8♥ est exclu
    expect(candidats.map(cc => cc.id)).toEqual([dixClubIA.id])

    const carte = choisirCarteMinimaxFinale(candidats, state)
    expect(carte.id).toBe(dixClubIA.id)
  })

  it('deux cartes d\'atout disponibles face à un 7 d\'atout ouvert : les deux "montent" (rang > 7) et restent légales', () => {
    const septAtoutHumain = c('clubs', '7')
    const dixClubIA = c('clubs', '10')
    const huitClubIA = c('clubs', '8') // rang > 7 : "monte" aussi, reste légal (pas d'exclusion)

    const candidats = cartesJouablesPhaseFinale([dixClubIA, huitClubIA], septAtoutHumain, 'clubs')
    expect(candidats.map(cc => cc.id).sort()).toEqual([dixClubIA.id, huitClubIA.id].sort())
  })

  it('l\'IA peut jouer son propre 7 d\'atout sans crasher ni sortir des coups légaux', () => {
    const septAtoutIA = c('clubs', '7')
    const carteOuverteHumain = c('hearts', 'K')

    const state = stateEndgameCoherent('clubs', [septAtoutIA], [c('hearts', '9')])
    state.joueurs[1].main = [septAtoutIA]
    state.pliEnCours = {
      carteJoueur0: carteOuverteHumain, carteJoueur1: null, joueurOuvreur: 0,
      cartes: [carteOuverteHumain, null],
    }

    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.id).toBe(septAtoutIA.id) // seule carte en main → forcée, mais doit rester stable
  })
})

// ============================================================
// Non-régression — scénarios existants du minimax INCHANGÉS
// (aucun d'eux ne comporte de 7 d'atout ; ils doivent produire
// exactement les mêmes choix qu'avant la piste 2)
// ============================================================

describe('Piste 2 — non-régression : décisions historiques du minimax préservées', () => {
  it('ouvre toujours avec l\'atout FORT plutôt que faible (scénario historique sans 7 d\'atout, inchangé)', () => {
    const asClub = c('clubs', 'A')
    const neufClub = c('clubs', '9')
    const dixClub = c('clubs', '10')
    const huitCoeur = c('hearts', '8')

    const state = stateEndgameCoherent('clubs', [asClub, neufClub], [dixClub, huitCoeur])
    state.joueurs[1].main = [asClub, neufClub]

    const carte = choisirCarteMinimaxFinale([asClub, neufClub], state)
    expect(carte.id).toBe(asClub.id)
  })

  it('BONUS_DERNIER_PLI_MINIMAX reste inchangé à 10 (non affecté par la piste 2)', () => {
    expect(BONUS_DERNIER_PLI_MINIMAX).toBe(10)
  })
})
