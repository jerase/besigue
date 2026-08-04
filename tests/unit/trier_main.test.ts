// ============================================================
// TESTS — trierMain (Point F : tri automatique de la main)
// ============================================================
//
// Vérifie le tri pur (couleur puis rang décroissant), son immutabilité,
// et sa compatibilité avec reconcilierOrdreMain (le résultat du tri doit
// pouvoir être adopté tel quel comme nouvel ordre d'affichage).
// ============================================================

import { describe, it, expect } from 'vitest'
import { trierMain, ORDRE_COULEURS_TRI, reconcilierOrdreMain } from '../../src/screens/EcranTable'
import { creerCarte, creerJoker } from '../../src/core/deck'
import type { Carte } from '../../src/types'

let _pos = 0
const c = (couleur: Carte['couleur'], rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

describe('trierMain', () => {
  it('regroupe les cartes par couleur', () => {
    const main = [c('diamonds', '9'), c('spades', 'A'), c('hearts', 'K'), c('clubs', 'Q')]
    const trie = trierMain(main)
    const couleurs = trie.map(carte => carte.couleur)
    // Chaque couleur doit apparaître en un seul bloc contigu
    const vues = new Set<string>()
    let couleurCourante: string | null = null
    for (const couleur of couleurs) {
      if (couleur !== couleurCourante) {
        expect(vues.has(couleur)).toBe(false) // pas de réapparition d'une couleur déjà close
        vues.add(couleur)
        couleurCourante = couleur
      }
    }
  })

  it('trie les couleurs selon ORDRE_COULEURS_TRI', () => {
    const main = [c('diamonds', '9'), c('clubs', '9'), c('hearts', '9'), c('spades', '9')]
    const trie = trierMain(main)
    const rangsCouleurs = trie.map(carte => ORDRE_COULEURS_TRI[carte.couleur])
    expect(rangsCouleurs).toEqual([...rangsCouleurs].sort((a, b) => a - b))
  })

  it('trie par rang décroissant à l\'intérieur d\'une même couleur (As en tête)', () => {
    const main = [c('spades', '9'), c('spades', 'A'), c('spades', 'J'), c('spades', 'K')]
    const trie = trierMain(main)
    expect(trie.map(carte => carte.rang)).toEqual(['A', 'K', 'J', '9'])
  })

  it('cas combiné : plusieurs couleurs, chacune triée par rang décroissant', () => {
    const main = [
      c('hearts', '7'), c('spades', 'Q'), c('hearts', 'A'),
      c('spades', '10'), c('clubs', 'J'),
    ]
    const trie = trierMain(main)
    expect(trie.map(carte => `${carte.couleur}-${carte.rang}`)).toEqual([
      'spades-10', 'spades-Q',
      'hearts-A', 'hearts-7',
      'clubs-J',
    ])
  })

  it('ne modifie pas le tableau d\'entrée (immutabilité)', () => {
    const main = [c('hearts', '7'), c('spades', 'Q'), c('hearts', 'A')]
    const copie = [...main]
    trierMain(main)
    expect(main).toEqual(copie)
  })

  it('gère les jokers sans lever d\'exception', () => {
    const main = [c('spades', 'A'), creerJoker('hearts', 0, _pos++), c('clubs', '9')]
    expect(() => trierMain(main)).not.toThrow()
    expect(trierMain(main)).toHaveLength(3)
  })

  it('main vide → tableau vide', () => {
    expect(trierMain([])).toEqual([])
  })

  it('son résultat, une fois converti en ids, est un ordre stable pour reconcilierOrdreMain', () => {
    const main = [c('diamonds', '9'), c('spades', 'A'), c('hearts', 'K')]
    const ordreTrie = trierMain(main).map(carte => carte.id)
    const reconcilie = reconcilierOrdreMain(ordreTrie, main)
    expect(reconcilie).toEqual(ordreTrie)
  })
})
