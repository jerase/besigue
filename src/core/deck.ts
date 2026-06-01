// ============================================================
// MOTEUR DE DECK
// Création, mélange Fisher-Yates, gestion du deck
// ============================================================

import type { Carte, Couleur, Deck, Rang } from '../types'
import { VALEURS_BRISQUES } from '../types'

// 8 rangs × 4 couleurs × 4 jeux = 128 cartes + 4 jokers = 132 cartes
const COULEURS: Couleur[] = ['spades', 'hearts', 'diamonds', 'clubs']
const RANGS: Rang[] = ['A', '10', 'K', 'Q', 'J', '9', '8', '7']
const NB_JEUX = 4

// ============================================================
// CRÉATION D'UNE CARTE NORMALE
// ============================================================

export function creerCarte(
 couleur: Couleur,
 rang: Rang,
 jeuIndex: number,
 positionDeck: number
): Carte {
 return {
 id: `${couleur}-${rang}-${jeuIndex}-${positionDeck}`,
 couleur,
 rang,
 jeuIndex,
 estJoker: false,
 faceUp: false,
 etat: 'faceDown',
 }
}

// ============================================================
// CRÉATION D'UN JOKER
// 1 joker par couleur (couleur = visuel seulement)
// ============================================================

export function creerJoker(couleur: Couleur, jeuIndex: number, positionDeck: number): Carte {
 return {
 id: `joker-${couleur}-${jeuIndex}-${positionDeck}`,
 couleur,
 rang: 'JOKER',
 jeuIndex,
 estJoker: true,
 faceUp: false,
 etat: 'faceDown',
 }
}

// ============================================================
// CRÉATION DU DECK COMPLET
// 4 jeux × 32 cartes + 4 jokers = 132 cartes
// ============================================================

export function creerDeck(): Deck {
 const graine = Date.now()
 const cartes: Carte[] = []
 let position = 0

 // 4 jeux × 4 couleurs × 8 rangs = 128 cartes normales
 for (let jeuIndex = 0; jeuIndex < NB_JEUX; jeuIndex++) {
 for (const couleur of COULEURS) {
 for (const rang of RANGS) {
 cartes.push(creerCarte(couleur, rang, jeuIndex, position++))
 }
 }
 }

 // 4 jokers (1 par couleur, couleur = visuel seulement)
 for (let i = 0; i < COULEURS.length; i++) {
 cartes.push(creerJoker(COULEURS[i], i, position++))
 }

 return { cartes, graine }
}

// ============================================================
// ALGORITHME FISHER-YATES
// Mélange in-place du tableau de cartes
// ============================================================

export function melangerFisherYates(cartes: Carte[]): Carte[] {
 const melange = [...cartes]
 for (let i = melange.length - 1; i > 0; i--) {
 const j = Math.floor(Math.random() * (i + 1))
 ;[melange[i], melange[j]] = [melange[j], melange[i]]
 }
 return melange
}

// Version déterministe pour les tests (PRNG linéaire congruentiel)
export function melangerAvecGraine(cartes: Carte[], graine: number): Carte[] {
 const melange = [...cartes]
 let seed = graine
 const random = () => {
 seed = (seed * 1664525 + 1013904223) & 0xffffffff
 return (seed >>> 0) / 0x100000000
 }
 for (let i = melange.length - 1; i > 0; i--) {
 const j = Math.floor(random() * (i + 1))
 ;[melange[i], melange[j]] = [melange[j], melange[i]]
 }
 return melange
}

// ============================================================
// VALEUR BRISQUE D'UNE CARTE
// As=1, 10=1, tout le reste (y compris Joker)=0
// ============================================================

export function valeurBrisque(carte: Carte): number {
 return VALEURS_BRISQUES[carte.rang]
}

// ============================================================
// COMPTAGE DES BRISQUES DANS UNE PILE
// ============================================================

export function compterBrisques(pile: Carte[]): number {
 return pile.reduce((total, carte) => total + valeurBrisque(carte), 0)
}

// ============================================================
// VÉRIFICATION D'UNICITÉ DES IDs
// ============================================================

export function verifierUniciteIds(deck: Deck): boolean {
 const ids = new Set(deck.cartes.map(c => c.id))
 return ids.size === deck.cartes.length
}

// ============================================================
// STATISTIQUES DU DECK
// ============================================================

export interface StatsDeck {
 total: number
 normales: number
 jokers: number
 parCouleur: Record<Couleur, number>
 parRang: Record<string, number>
 brisquesTotal: number
}

export function statsDeck(deck: Deck): StatsDeck {
 const parCouleur: Record<string, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 }
 const parRang: Record<string, number> = {}
 let jokers = 0

 for (const carte of deck.cartes) {
 if (carte.estJoker) {
 jokers++
 } else {
 parCouleur[carte.couleur]++
 parRang[carte.rang] = (parRang[carte.rang] ?? 0) + 1
 }
 }

 const brisquesTotal = compterBrisques(deck.cartes)

 return {
 total: deck.cartes.length,
 normales: deck.cartes.length - jokers,
 jokers,
 parCouleur: parCouleur as Record<Couleur, number>,
 parRang,
 brisquesTotal,
 }
}

// ============================================================
// CRÉER ET MÉLANGER LE DECK
// ============================================================

export function creerDeckMelange(): Deck {
 const deck = creerDeck()
 return {
 ...deck,
 cartes: melangerFisherYates(deck.cartes),
 }
}
