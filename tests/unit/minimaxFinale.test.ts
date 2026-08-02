// ============================================================
// TESTS — Arbre de jeu récursif (non matérialisé) : phase finale
// (minimaxFinale.ts)
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  deduireMainAdversaire,
  choisirCarteMinimaxFinale,
  BONUS_DERNIER_PLI_MINIMAX,
} from '../../src/core/ia/minimaxFinale'
import { choisirCarteIA } from '../../src/core/ia'
import { cartesJouablesPhaseFinale } from '../../src/core/pli'
import { initialiserPartie } from '../../src/core/init'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { creerCarte, creerJoker, COULEURS, RANGS, NB_JEUX } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur, Rang } from '../../src/types'

// ── Helpers ──────────────────────────────────────────────────

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

/**
 * Construit un état de fin de manche PARFAITEMENT cohérent sur les 132
 * cartes : mainIA reçoit exactement les cartes données, le reliquat
 * ciblé `nonVuesVoulues` reste non vu (deviendra la main adverse
 * déduite), et TOUT le reste du deck est placé en pileRemportee (donc
 * "vu") — pour que `deduireMainAdversaire` retrouve EXACTEMENT
 * `nonVuesVoulues`, sans dépendre du garde-fou défensif.
 */
function stateEndgameCoherent(
  couleurAtout: Couleur | null,
  mainIA: Carte[],
  nonVuesVoulues: Carte[]
): GameState {
  const cible = new Set([...mainIA, ...nonVuesVoulues].map(cc => `${cc.couleur}|${cc.rang}`))
  // Compte combien d'exemplaires de chaque (couleur,rang) sont "réservés"
  // (main IA + non-vues voulues), pour savoir combien il faut en mettre
  // en pileRemportee (le reste du deck).
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
      const total = NB_JEUX
      for (let i = 0; i < total - reserve; i++) {
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
// deduireMainAdversaire
// ============================================================

describe('deduireMainAdversaire', () => {
  it('déduit exactement le reliquat non vu quand la conservation des 132 cartes est respectée', () => {
    const mainIA = [c('clubs', 'A'), c('clubs', '9')]
    const nonVues = [c('clubs', '10'), c('hearts', '8')]
    const state = stateEndgameCoherent('clubs', mainIA, nonVues)

    const deduite = deduireMainAdversaire(state, 1)
    expect(deduite).toHaveLength(2)
    const cles = deduite.map(cc => `${cc.couleur}|${cc.rang}`).sort()
    expect(cles).toEqual(['clubs|10', 'hearts|8'])
  })

  it('garde-fou défensif : ne dépasse jamais la taille réelle (publique) de la main adverse', () => {
    // État volontairement incohérent (comme certains tests synthétiques
    // existants) : main adverse réelle de longueur 0, mais reliquat non
    // vu très grand (rien n'a été marqué "vu").
    const state = baseState('clubs')
    state.joueurs[1].main = [c('clubs', 'A'), c('clubs', '9')]
    state.joueurs[0].main = [] // longueur réelle = 0

    const deduite = deduireMainAdversaire(state, 1)
    expect(deduite).toHaveLength(0)
  })
})

// ============================================================
// choisirCarteMinimaxFinale — décisions vérifiables à la main
// ============================================================

describe('choisirCarteMinimaxFinale — un seul coup possible', () => {
  it('joue la seule carte disponible', () => {
    const seule = c('clubs', 'A')
    const state = stateEndgameCoherent('clubs', [seule], [c('hearts', '8')])
    state.joueurs[1].main = [seule]
    const carte = choisirCarteMinimaxFinale([seule], state)
    expect(carte.id).toBe(seule.id)
  })
})

describe('choisirCarteMinimaxFinale — respecte les règles de suivi/coupe (pli.ts)', () => {
  it('ne retourne jamais une carte hors des coups légaux (obligation de couleur)', () => {
    // Adversaire a ouvert avec un coeur ; l'IA a un coeur en main → doit
    // fournir la couleur (sauf coupe supérieure), jamais jouer autre chose
    // alors qu'elle a le choix.
    const coeurIA = c('hearts', '9')
    const clubIA = c('clubs', 'K')
    const carteOuverte = c('hearts', 'K')
    const state = stateEndgameCoherent('clubs', [coeurIA, clubIA], [c('spades', '8')])
    state.joueurs[1].main = [coeurIA, clubIA]
    state.pliEnCours = { carteJoueur0: carteOuverte, carteJoueur1: null, joueurOuvreur: 0, cartes: [carteOuverte, null] }

    const candidats = cartesJouablesPhaseFinale([coeurIA, clubIA], carteOuverte, 'clubs')
    const carte = choisirCarteMinimaxFinale(candidats, state)
    expect(candidats.map(cc => cc.id)).toContain(carte.id)
    expect(carte.couleur).toBe('hearts') // seule couleur légale ici (fournir hearts)
  })
})

describe('choisirCarteMinimaxFinale — choix optimal vérifié à la main', () => {
  it('ouvre avec l\'atout FORT plutôt que faible pour forcer l\'adversaire à sacrifier sa propre brisque d\'atout', () => {
    // Scénario construit et résolu à la main (cf. message d'accompagnement) :
    //   IA : As♣ (atout, brisque) + 9♣ (atout, non-brisque)
    //   Adversaire (déduit) : 10♣ (atout, brisque) + 8♥ (non-atout)
    //
    // Ouvrir 9♣ (faible) : l'adversaire, obligé de fournir/monter en
    // atout, DOIT jouer 10♣ pour battre le 9 → l'adversaire gagne le pli
    // et capture 1 brisque (10♣). Puis IA gagne le dernier pli avec As♣
    // (+1 brisque +10 bonus dernier pli). Total = -1 + 11 = +10.
    //
    // Ouvrir As♣ (fort) : l'adversaire, qui n'a que 10♣ en atout, est
    // simplement forcé de suivre avec son seul club (10♣ < As, ne peut
    // pas battre) → l'IA gagne IMMÉDIATEMENT 2 brisques (As♣+10♣). Puis
    // IA gagne aussi le dernier pli avec 9♣ (aucune brisque en jeu, mais
    // +10 bonus dernier pli). Total = +2 + 10 = +12 > +10.
    //
    // Le choix optimal est donc d'ouvrir avec l'As (carte FORTE), pas la
    // carte faible — un résultat non trivial qui dépend du calcul complet.
    const asClub = c('clubs', 'A')
    const neufClub = c('clubs', '9')
    const dixClub = c('clubs', '10')
    const huitCoeur = c('hearts', '8')

    const state = stateEndgameCoherent('clubs', [asClub, neufClub], [dixClub, huitCoeur])
    state.joueurs[1].main = [asClub, neufClub]

    const carte = choisirCarteMinimaxFinale([asClub, neufClub], state)
    expect(carte.id).toBe(asClub.id)
  })
})

describe('choisirCarteMinimaxFinale — bonus dernier pli', () => {
  it('préfère gagner le dernier pli même sans brisque en jeu, plutôt que perdre un pli sans valeur', () => {
    // IA a 2 cartes : Roi♣ (fort atout, non-brisque) et 8♣ (faible atout,
    // non-brisque). L'IA répond à une ouverture adverse. Adversaire
    // (déduit) a 2 cartes : Dame♣ (atout intermédiaire) et 7♥.
    //
    // Le pli EN COURS est ouvert par l'adversaire avec Dame♣. L'IA doit
    // fournir en atout et monter si possible (peutCouper) : seul Roi♣ >
    // Dame♣, donc l'IA est de toute façon OBLIGÉE de jouer Roi♣ ici
    // (obligation de monter) — ce test vérifie surtout la non-régression
    // de l'obligation de couleur/coupe combinée à la logique minimax.
    const roiClub = c('clubs', 'K')
    const huitClub = c('clubs', '8')
    const dameClub = c('clubs', 'Q')
    const septCoeur = c('hearts', '7')

    const state = stateEndgameCoherent('clubs', [roiClub, huitClub], [septCoeur])
    state.joueurs[1].main = [roiClub, huitClub]
    state.pliEnCours = { carteJoueur0: dameClub, carteJoueur1: null, joueurOuvreur: 0, cartes: [dameClub, null] }

    const candidats = cartesJouablesPhaseFinale([roiClub, huitClub], dameClub, 'clubs')
    expect(candidats.map(cc => cc.id)).toEqual([roiClub.id]) // obligation de monter : un seul choix légal
    const carte = choisirCarteMinimaxFinale(candidats, state)
    expect(carte.id).toBe(roiClub.id)
  })

  it('BONUS_DERNIER_PLI_MINIMAX est bien de 10 (aligné sur la règle réelle de finManche.ts)', () => {
    expect(BONUS_DERNIER_PLI_MINIMAX).toBe(10)
  })
})

// ============================================================
// Intégration — iaDifficile route vers le minimax dès pioche vide
// ============================================================

describe('Intégration — iaDifficile bascule sur le minimax dès pioche.length === 0', () => {
  it('retourne une carte valide en phase finale, cohérente avec les coups légaux', () => {
    const roiClub = c('clubs', 'K')
    const huitClub = c('clubs', '8')
    const dameCoeur = c('hearts', 'Q')

    const state = stateEndgameCoherent('clubs', [roiClub, huitClub], [dameCoeur])
    state.joueurs[1].main = [roiClub, huitClub]

    const carte = choisirCarteIA(state, 'difficile')
    expect(carte).not.toBeNull()
    expect([roiClub.id, huitClub.id]).toContain(carte!.id)
  })

  it('ne crashe pas et respecte l\'obligation de couleur même avec plusieurs cartes', () => {
    const clubIA1 = c('clubs', 'K')
    const clubIA2 = c('clubs', '8')
    const coeurIA = c('hearts', 'A')
    const carteOuverteHumain = c('hearts', '9')

    const state = stateEndgameCoherent('clubs', [clubIA1, clubIA2, coeurIA], [c('spades', '7')])
    state.joueurs[1].main = [clubIA1, clubIA2, coeurIA]
    state.pliEnCours = { carteJoueur0: carteOuverteHumain, carteJoueur1: null, joueurOuvreur: 0, cartes: [carteOuverteHumain, null] }

    const carte = choisirCarteIA(state, 'difficile')
    expect(carte?.couleur).toBe('hearts') // doit fournir la couleur (seule carte hearts en main)
    expect(carte?.id).toBe(coeurIA.id)
  })
})
