// ============================================================
// ARBRE DE JEU RÉCURSIF (NON MATÉRIALISÉ) — Phase finale
// ============================================================
//
// Dès que state.pioche.length === 0 (phase finale), la composition
// EXACTE de la main adverse devient déductible avec certitude (plus
// aucune carte n'est répartie entre pioche et main adverse — le
// reliquat non vu EST la main adverse). L'IA dispose donc d'une
// information complète : un vrai minimax à profondeur totale, avec
// élagage alpha-bêta, est légitime — pas une heuristique probabiliste.
//
// Structure : SEUL des 4 modules à nature arborescente réelle (chaque
// coup change réellement l'ensemble des coups futurs possibles). Mais
// l'arbre n'est JAMAIS matérialisé comme objet en mémoire — pas de
// classe de nœud, pas de Map<carte, enfant> persistée. Il n'existe que
// de façon implicite, porté par la pile d'appels de `minimax()`, sur
// le modèle canonique (échecs, dames, etc.) : chaque niveau de
// récursion régénère ses propres coups légaux à la volée à partir de
// l'état courant (via cartesJouablesPhaseFinale, réutilisé tel quel
// depuis pli.ts), sans jamais persister de structure de nœuds entre
// les appels.
//
// Terminaison : pas besoin de paramètre `profondeur` artificiel — la
// récursion retire strictement une carte à chaque appel (main du
// joueur actif), donc le nombre de cartes restantes DÉCROÎT
// strictement à chaque niveau : terminaison garantie dès que les deux
// mains sont vides, sans risque de boucle infinie.
//
// Objectif de l'évaluation (feuille de l'arbre = fin de manche) :
// maximiser le différentiel de brisques (As+10) capturées par l'IA sur
// le reste de la manche, bonus dernier pli inclus (+10 pour le
// vainqueur du tout dernier pli — règle DÉJÀ appliquée réellement par
// finManche.ts ; ce module se contente de l'anticiper dans son
// évaluation pour que l'IA priorise correctement la capture du
// dernier pli lors de sa recherche, sans dupliquer/modifier la règle
// réelle).
//
// Portée du différentiel évalué (piste 2) : brisques (As+10), bonus
// dernier pli, ET bonus du 7 d'atout (+10 pts pour le joueur qui LE
// JOUE — cf. appliquerPli dans pli.ts, bloc "Bonus 7 d'atout" — que ce
// coup gagne le pli ou non, et indépendamment de la couleur ouverte).
// Ce bonus est appliqué IMMÉDIATEMENT au tour où le 7 d'atout est joué
// (deltaSeptAtout, cf. jouerCoup ci-dessous), jamais différé jusqu'à la
// résolution du pli, pour rester fidèle à la règle réelle : c'est le
// fait de JOUER la carte qui déclenche le bonus, pas le fait de
// remporter le pli avec elle.
//
// Règles de suivi/coupe : entièrement déléguées à
// cartesJouablesPhaseFinale et resoudrePli (pli.ts), jamais
// réimplémentées ici — zéro divergence possible avec le moteur réel.
// ============================================================

import type { Carte, Couleur, GameState } from '../../types'
import { resoudrePli, cartesJouablesPhaseFinale } from '../pli'
import { valeurBrisque } from './helpers'
import { creerCarte, creerJoker } from '../deck'
import { cartesNonVues } from './memoire'

/** Bonus (pour l'IA) / malus (pour l'adversaire) attribué au vainqueur du tout dernier pli de la manche. */
export const BONUS_DERNIER_PLI_MINIMAX = 10

/**
 * Bonus (pour l'IA) / malus (pour l'adversaire) attribué au joueur qui
 * JOUE le 7 d'atout — cf. appliquerPli (pli.ts), bloc "Bonus 7 d'atout" :
 * `+10 pts` pour le siège qui pose la carte, que ce coup gagne le pli ou
 * non. Valeur identique à celle réellement appliquée par le moteur
 * (pli.ts) — même montant, pour rester fidèle à la règle réelle.
 */
export const BONUS_SEPT_ATOUT_MINIMAX = 10

/**
 * Bonus/malus immédiat (du point de vue IA − adversaire) déclenché par
 * le fait de JOUER `carte` — indépendant de la résolution du pli en
 * cours (contrairement à deltaBrisques, qui n'existe qu'au moment où
 * le pli se résout). Réplique fidèlement la condition de pli.ts :
 * carte non-Joker, rang '7', couleur === couleurAtout.
 *
 * Exportée (comme les autres petits helpers purs du module ia/,
 * ex. calculerValeurEspereeBrisque) pour être testée directement,
 * indépendamment de l'arbre minimax complet.
 */
export function bonusSeptAtout(joueur: 0 | 1, carte: Carte, couleurAtout: Couleur | null): number {
  if (!couleurAtout) return 0
  if (carte.estJoker || carte.rang !== '7' || carte.couleur !== couleurAtout) return 0
  return joueur === 1 ? BONUS_SEPT_ATOUT_MINIMAX : -BONUS_SEPT_ATOUT_MINIMAX
}

// ============================================================
// Déduction de la main adverse (jamais de lecture directe)
// ============================================================

/**
 * Reconstruit la main adverse EXACTE par déduction (cartesNonVues,
 * memoire.ts) — jamais par lecture directe de state.joueurs[0].main.
 *
 * Valide uniquement quand state.pioche.length === 0 : à ce moment,
 * le reliquat non vu (pioche + main adverse indifférenciées) EST
 * intégralement la main adverse, puisque la pioche est vide.
 *
 * Les identités précises (jeuIndex/position) n'ont aucune incidence
 * sur les règles de jeu (seuls rang/couleur/estJoker comptent pour
 * resoudrePli et cartesJouablesPhaseFinale) — les cartes synthétisées
 * ici portent des identifiants dédiés (hors plage réelle 0..131) pour
 * ne jamais entrer en collision avec de vraies cartes.
 */
export function deduireMainAdversaire(state: GameState, joueurId: 0 | 1 = 1): Carte[] {
  const adversaireId: 0 | 1 = joueurId === 1 ? 0 : 1
  const comptes = cartesNonVues(state, joueurId)
  const cartes: Carte[] = []
  let compteur = 0

  for (const { couleur, rang, quantiteNonVue } of comptes) {
    for (let i = 0; i < quantiteNonVue; i++) {
      const position = 1_000_000 + compteur++
      cartes.push(
        rang === 'JOKER'
          ? creerJoker(couleur, i, position)
          : creerCarte(couleur, rang, i, position)
      )
    }
  }

  // Garde-fou défensif : le NOMBRE de cartes en main adverse est une
  // information publique (on voit combien de cartes l'adversaire tient),
  // contrairement à leur identité — ce n'est donc pas une "lecture
  // directe" de la composition. En jeu réel (conservation exacte des 4
  // jeux), cette taille correspond TOUJOURS exactement à la déduction ;
  // cette borne ne fait rien en pratique. Elle protège uniquement contre
  // un état incohérent (ex. état de test synthétique ne conservant pas
  // les 132 cartes) qui ferait exploser la profondeur de récursion.
  const tailleReelle = state.joueurs[adversaireId].main.length
  return cartes.length > tailleReelle ? cartes.slice(0, tailleReelle) : cartes
}

// ============================================================
// État simplifié de fin de manche — porté uniquement par la pile
// d'appels (jamais persisté entre les appels récursifs)
// ============================================================

interface EtatFinalSimplifie {
  /** mains[0] = main humaine (déduite), mains[1] = main IA (réelle) */
  mains: [Carte[], Carte[]]
  couleurAtout: Couleur | null
  /** Carte déjà posée par l'ouvreur du pli EN COURS ; null si personne n'a encore joué dans ce pli */
  carteOuverte: Carte | null
  joueurOuvreur: 0 | 1
  joueurActif: 0 | 1
}

function terminee(etat: EtatFinalSimplifie): boolean {
  return etat.carteOuverte === null && etat.mains[0].length === 0 && etat.mains[1].length === 0
}

/** Coups légaux générés à la volée — jamais stockés. */
function coupsLegaux(etat: EtatFinalSimplifie): Carte[] {
  return cartesJouablesPhaseFinale(etat.mains[etat.joueurActif], etat.carteOuverte, etat.couleurAtout)
}

interface ResultatCoup {
  etat: EtatFinalSimplifie
  /** Différentiel de brisques (IA − adversaire) capturé PAR ce coup précis (0 si le pli n'est pas encore résolu). */
  deltaBrisques: number
  /**
   * Différentiel (IA − adversaire) du bonus 7 d'atout déclenché PAR ce
   * coup précis (piste 2) — s'applique dès que la carte est jouée,
   * QUE le pli se résolve ou non par ce même coup (contrairement à
   * deltaBrisques, qui n'existe qu'à la résolution).
   */
  deltaSeptAtout: number
  pliResolu: boolean
  vainqueurPli: (0 | 1) | null
}

/** Joue une carte depuis l'état courant → nouvel état + éventuel gain de brisques si le pli se résout. */
function jouerCoup(etat: EtatFinalSimplifie, carte: Carte): ResultatCoup {
  const joueur = etat.joueurActif
  const deltaSeptAtout = bonusSeptAtout(joueur, carte, etat.couleurAtout)
  const mainRestante = etat.mains[joueur].filter(c => c.id !== carte.id)
  const nouvellesMains: [Carte[], Carte[]] =
    joueur === 0 ? [mainRestante, etat.mains[1]] : [etat.mains[0], mainRestante]

  if (etat.carteOuverte === null) {
    // Ouverture du pli : pas encore de vainqueur, pas de gain de brisques
    // — mais le bonus 7 d'atout, lui, s'applique déjà (il ne dépend pas
    // de l'issue du pli, cf. bonusSeptAtout ci-dessus)
    return {
      etat: {
        mains: nouvellesMains,
        couleurAtout: etat.couleurAtout,
        carteOuverte: carte,
        joueurOuvreur: joueur,
        joueurActif: joueur === 0 ? 1 : 0,
      },
      deltaBrisques: 0,
      deltaSeptAtout,
      pliResolu: false,
      vainqueurPli: null,
    }
  }

  // Réponse : le pli se résout maintenant — réutilise resoudrePli tel quel
  const carteJ0 = etat.joueurOuvreur === 0 ? etat.carteOuverte : carte
  const carteJ1 = etat.joueurOuvreur === 0 ? carte : etat.carteOuverte
  const { vainqueur } = resoudrePli(carteJ0, carteJ1, etat.joueurOuvreur, etat.couleurAtout)
  const brisquesDuPli = valeurBrisque(etat.carteOuverte) + valeurBrisque(carte)

  return {
    etat: {
      mains: nouvellesMains,
      couleurAtout: etat.couleurAtout,
      carteOuverte: null,
      joueurOuvreur: vainqueur,
      joueurActif: vainqueur,
    },
    deltaBrisques: vainqueur === 1 ? brisquesDuPli : -brisquesDuPli,
    deltaSeptAtout,
    pliResolu: true,
    vainqueurPli: vainqueur,
  }
}

/** Valeur terminale d'un coup qui vient de résoudre le TOUT DERNIER pli de la manche. */
function valeurDernierPli(deltaBrisques: number, deltaSeptAtout: number, vainqueurPli: 0 | 1): number {
  return deltaBrisques + deltaSeptAtout + (vainqueurPli === 1 ? BONUS_DERNIER_PLI_MINIMAX : -BONUS_DERNIER_PLI_MINIMAX)
}

// ============================================================
// minimax(etat, alpha, beta) — arbre implicite, élagage alpha-bêta
// ============================================================
//
// Modèle canonique : à chaque appel, régénère ses coups légaux à la
// volée (coupsLegaux), explore chacun par appel récursif direct, et
// retourne au parent la valeur — aucune structure de nœuds n'est
// conservée entre les appels (rien n'est retourné à part un nombre).
//
// joueurActif === 1 (IA) → maximise le différentiel (IA − adversaire)
// joueurActif === 0 (adversaire) → minimise ce même différentiel
// (hypothèse : l'adversaire joue lui aussi au mieux de son intérêt)

function minimax(etat: EtatFinalSimplifie, alpha: number, beta: number): number {
  if (terminee(etat)) return 0

  const coups = coupsLegaux(etat)
  if (coups.length === 0) return 0 // repli défensif — ne devrait pas arriver (cf. terminee)

  const maximise = etat.joueurActif === 1
  let meilleur = maximise ? -Infinity : Infinity
  let a = alpha
  let b = beta

  for (const coup of coups) {
    const { etat: suivant, deltaBrisques, deltaSeptAtout, pliResolu, vainqueurPli } = jouerCoup(etat, coup)

    const valeur = pliResolu && terminee(suivant)
      ? valeurDernierPli(deltaBrisques, deltaSeptAtout, vainqueurPli!)
      : deltaBrisques + deltaSeptAtout + minimax(suivant, a, b)

    if (maximise) {
      if (valeur > meilleur) meilleur = valeur
      if (meilleur > a) a = meilleur
    } else {
      if (valeur < meilleur) meilleur = valeur
      if (meilleur < b) b = meilleur
    }
    if (b <= a) break // élagage alpha-bêta
  }

  return meilleur
}

// ============================================================
// Point d'entrée — remplace l'intégralité de la décision IA dès
// pioche.length === 0 (ouverture ET réponse)
// ============================================================

export function choisirCarteMinimaxFinale(candidats: Carte[], state: GameState): Carte {
  const carteOuverte = state.pliEnCours.carteJoueur0
  const mainIA = state.joueurs[1].main
  const mainAdversaireDeduite = deduireMainAdversaire(state, 1)

  const etatInitial: EtatFinalSimplifie = {
    mains: [mainAdversaireDeduite, mainIA],
    couleurAtout: state.couleurAtout,
    carteOuverte,
    joueurOuvreur: state.pliEnCours.joueurOuvreur,
    joueurActif: 1, // c'est le tour de l'IA (garanti par l'appelant)
  }

  const coups = coupsLegaux(etatInitial)
  if (coups.length === 0) {
    // Repli défensif — ne devrait jamais arriver si candidats est non vide
    return candidats[0]
  }

  let meilleureCarte = coups[0]
  let meilleureValeur = -Infinity
  let alpha = -Infinity
  const beta = Infinity

  for (const coup of coups) {
    const { etat: suivant, deltaBrisques, deltaSeptAtout, pliResolu, vainqueurPli } = jouerCoup(etatInitial, coup)

    const valeur = pliResolu && terminee(suivant)
      ? valeurDernierPli(deltaBrisques, deltaSeptAtout, vainqueurPli!)
      : deltaBrisques + deltaSeptAtout + minimax(suivant, alpha, beta)

    if (valeur > meilleureValeur) {
      meilleureValeur = valeur
      meilleureCarte = coup
    }
    if (valeur > alpha) alpha = valeur
  }

  return meilleureCarte
}
