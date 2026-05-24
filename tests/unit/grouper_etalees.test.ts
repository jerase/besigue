// ============================================================
// TESTS — grouperCartesEtalees (mariages + bésigues superposés)
// Vérifie le groupement visuel des cartes étalées :
//   - Mariage (roi + dame) → groupe 'mariage'
//   - Bésigue (dame♠ + valet♦) → groupe 'besigue'
//   - Autres cartes → groupe 'seule'
//   - Carte orpheline (partenaire joué) → 'seule'
//   - Pas de doublons, pas de carte dans deux groupes
// ============================================================

import { describe, it, expect } from 'vitest'
import { grouperCartesEtalees } from '../../src/screens/EcranTable'
import { creerCarte } from '../../src/core/deck'
import type { AnnoncePosee, Carte } from '../../src/types'

// ── Helpers ──────────────────────────────────────────────────

let _pos = 0
const c = (couleur: Carte['couleur'], rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

const annonce = (
  joueurId: 0 | 1,
  nom: AnnoncePosee['nom'],
  cartesIds: string[]
): AnnoncePosee => ({
  joueurId,
  nom,
  cartesIds,
  points: 0,
  mancheNumero: 1,
})

// ============================================================
// 1. CAS DE BASE — AUCUNE COMBINAISON
// ============================================================

describe('Cartes sans combinaison', () => {
  it('liste vide → résultat vide', () => {
    expect(grouperCartesEtalees([], [], 0)).toEqual([])
  })

  it('carte seule sans annonce → groupe seule', () => {
    const as = c('hearts', 'A')
    const groupes = grouperCartesEtalees([as], [], 0)
    expect(groupes).toHaveLength(1)
    expect(groupes[0].type).toBe('seule')
    if (groupes[0].type === 'seule') expect(groupes[0].carte.id).toBe(as.id)
  })

  it('trois cartes sans annonce → trois groupes seule', () => {
    const cartes = [c('hearts', 'A'), c('spades', '10'), c('diamonds', 'K')]
    const groupes = grouperCartesEtalees(cartes, [], 0)
    expect(groupes).toHaveLength(3)
    groupes.forEach(g => expect(g.type).toBe('seule'))
  })
})

// ============================================================
// 2. MARIAGES (ROI + DAME)
// ============================================================

describe('Mariage (roi + dame)', () => {
  it('mariage atout annoncé → groupe mariage avec roi et dame', () => {
    const roi  = c('hearts', 'K')
    const dame = c('hearts', 'Q')
    const annonces = [annonce(0, 'mariage_atout', [roi.id, dame.id])]

    const groupes = grouperCartesEtalees([roi, dame], annonces, 0)
    expect(groupes).toHaveLength(1)
    expect(groupes[0].type).toBe('mariage')
    if (groupes[0].type === 'mariage') {
      expect(groupes[0].roi.id).toBe(roi.id)
      expect(groupes[0].dame.id).toBe(dame.id)
    }
  })

  it('mariage hors atout annoncé → groupe mariage', () => {
    const roi  = c('spades', 'K')
    const dame = c('spades', 'Q')
    const annonces = [annonce(0, 'mariage_hors_atout', [roi.id, dame.id])]

    const groupes = grouperCartesEtalees([roi, dame], annonces, 0)
    expect(groupes).toHaveLength(1)
    expect(groupes[0].type).toBe('mariage')
  })

  it('dame rencontrée avant le roi dans la liste → roi bien placé en dessous', () => {
    const roi  = c('clubs', 'K')
    const dame = c('clubs', 'Q')
    const annonces = [annonce(0, 'mariage_hors_atout', [roi.id, dame.id])]

    // On passe la dame EN PREMIER dans cartesEtalees
    const groupes = grouperCartesEtalees([dame, roi], annonces, 0)
    expect(groupes).toHaveLength(1)
    if (groupes[0].type === 'mariage') {
      expect(groupes[0].roi.rang).toBe('K')
      expect(groupes[0].dame.rang).toBe('Q')
    }
  })

  it('deux mariages différents → deux groupes mariage', () => {
    const roi1  = c('hearts', 'K', 0)
    const dame1 = c('hearts', 'Q', 0)
    const roi2  = c('spades', 'K', 0)
    const dame2 = c('spades', 'Q', 0)
    const annonces = [
      annonce(0, 'mariage_atout',      [roi1.id, dame1.id]),
      annonce(0, 'mariage_hors_atout', [roi2.id, dame2.id]),
    ]

    const groupes = grouperCartesEtalees([roi1, dame1, roi2, dame2], annonces, 0)
    expect(groupes).toHaveLength(2)
    groupes.forEach(g => expect(g.type).toBe('mariage'))
  })

  it('roi seul (dame déjà jouée) → groupe seule', () => {
    const roi  = c('hearts', 'K')
    const dame = c('hearts', 'Q')
    // La dame n'est PAS dans cartesEtalees (elle a été jouée)
    const annonces = [annonce(0, 'mariage_atout', [roi.id, dame.id])]

    const groupes = grouperCartesEtalees([roi], annonces, 0)
    expect(groupes).toHaveLength(1)
    expect(groupes[0].type).toBe('seule')
  })

  it("annonce d'un autre joueur → pas de groupement", () => {
    const roi  = c('hearts', 'K')
    const dame = c('hearts', 'Q')
    // Annonce du joueur 1, mais on groupe pour le joueur 0
    const annonces = [annonce(1, 'mariage_atout', [roi.id, dame.id])]

    const groupes = grouperCartesEtalees([roi, dame], annonces, 0)
    expect(groupes).toHaveLength(2)
    groupes.forEach(g => expect(g.type).toBe('seule'))
  })
})

// ============================================================
// 3. BÉSIGUE (DAME♠ + VALET♦)
// ============================================================

describe('Bésigue (dame♠ + valet♦)', () => {
  it('bésigue annoncé → groupe besigue avec dame et valet', () => {
    const dame  = c('spades',   'Q')
    const valet = c('diamonds', 'J')
    const annonces = [annonce(0, 'besigue', [dame.id, valet.id])]

    const groupes = grouperCartesEtalees([dame, valet], annonces, 0)
    expect(groupes).toHaveLength(1)
    expect(groupes[0].type).toBe('besigue')
    if (groupes[0].type === 'besigue') {
      expect(groupes[0].dame.id).toBe(dame.id)
      expect(groupes[0].valet.id).toBe(valet.id)
    }
  })

  it('valet rencontré avant la dame → dame bien en dessous', () => {
    const dame  = c('spades',   'Q')
    const valet = c('diamonds', 'J')
    const annonces = [annonce(0, 'besigue', [dame.id, valet.id])]

    // On passe le valet EN PREMIER
    const groupes = grouperCartesEtalees([valet, dame], annonces, 0)
    expect(groupes).toHaveLength(1)
    if (groupes[0].type === 'besigue') {
      expect(groupes[0].dame.rang).toBe('Q')
      expect(groupes[0].valet.rang).toBe('J')
    }
  })

  it('dame seule (valet déjà joué) → groupe seule', () => {
    const dame  = c('spades',   'Q')
    const valet = c('diamonds', 'J')
    const annonces = [annonce(0, 'besigue', [dame.id, valet.id])]

    const groupes = grouperCartesEtalees([dame], annonces, 0)
    expect(groupes).toHaveLength(1)
    expect(groupes[0].type).toBe('seule')
  })

  it('deux bésigues (double bésigue) → deux groupes besigue', () => {
    const dame1  = c('spades',   'Q', 0)
    const valet1 = c('diamonds', 'J', 0)
    const dame2  = c('spades',   'Q', 1)
    const valet2 = c('diamonds', 'J', 1)
    const annonces = [
      annonce(0, 'besigue', [dame1.id, valet1.id]),
      annonce(0, 'besigue', [dame2.id, valet2.id]),
    ]

    const groupes = grouperCartesEtalees([dame1, valet1, dame2, valet2], annonces, 0)
    expect(groupes).toHaveLength(2)
    groupes.forEach(g => expect(g.type).toBe('besigue'))
  })

  it("annonce bésigue d'un autre joueur → pas de groupement", () => {
    const dame  = c('spades',   'Q')
    const valet = c('diamonds', 'J')
    const annonces = [annonce(1, 'besigue', [dame.id, valet.id])]

    const groupes = grouperCartesEtalees([dame, valet], annonces, 0)
    expect(groupes).toHaveLength(2)
    groupes.forEach(g => expect(g.type).toBe('seule'))
  })
})

// ============================================================
// 4. COMBINAISONS MIXTES (mariage + bésigue + cartes seules)
// ============================================================

describe('Combinaisons mixtes', () => {
  it('mariage + bésigue + carte seule → 3 groupes distincts', () => {
    const roi   = c('hearts',   'K')
    const dameH = c('hearts',   'Q')
    const dameS = c('spades',   'Q')
    const valet = c('diamonds', 'J')
    const as    = c('clubs',    'A')

    const annonces = [
      annonce(0, 'mariage_atout', [roi.id, dameH.id]),
      annonce(0, 'besigue',       [dameS.id, valet.id]),
    ]
    const cartes = [roi, dameH, dameS, valet, as]
    const groupes = grouperCartesEtalees(cartes, annonces, 0)

    expect(groupes).toHaveLength(3)
    const types = groupes.map(g => g.type)
    expect(types).toContain('mariage')
    expect(types).toContain('besigue')
    expect(types).toContain('seule')
  })

  it('aucune carte en double dans les groupes', () => {
    const roi   = c('hearts',   'K')
    const dameH = c('hearts',   'Q')
    const dameS = c('spades',   'Q')
    const valet = c('diamonds', 'J')
    const as    = c('clubs',    'A')

    const annonces = [
      annonce(0, 'mariage_atout', [roi.id, dameH.id]),
      annonce(0, 'besigue',       [dameS.id, valet.id]),
    ]
    const groupes = grouperCartesEtalees([roi, dameH, dameS, valet, as], annonces, 0)

    // Collecter tous les IDs de cartes dans les groupes
    const ids: string[] = []
    for (const g of groupes) {
      if (g.type === 'mariage') { ids.push(g.roi.id, g.dame.id) }
      else if (g.type === 'besigue') { ids.push(g.dame.id, g.valet.id) }
      else { ids.push(g.carte.id) }
    }
    // Pas de doublon
    expect(new Set(ids).size).toBe(ids.length)
    // Toutes les cartes présentes
    expect(ids.sort()).toEqual([roi, dameH, dameS, valet, as].map(c => c.id).sort())
  })

  it('mariage prioritaire sur bésigue si dame♠ est dans les deux', () => {
    // Scénario : dame♠ mariée ET dans un bésigue
    // Le groupement mariage passe en premier (ordre de la boucle)
    const roi   = c('spades',   'K')
    const dameS = c('spades',   'Q')
    const valet = c('diamonds', 'J')

    const annonces = [
      annonce(0, 'mariage_hors_atout', [roi.id, dameS.id]),
      annonce(0, 'besigue',            [dameS.id, valet.id]),
    ]
    const groupes = grouperCartesEtalees([roi, dameS, valet], annonces, 0)

    // La dame ne peut être dans qu'un seul groupe
    const ids: string[] = []
    for (const g of groupes) {
      if (g.type === 'mariage') { ids.push(g.roi.id, g.dame.id) }
      else if (g.type === 'besigue') { ids.push(g.dame.id, g.valet.id) }
      else { ids.push(g.carte.id) }
    }
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain(dameS.id)
  })

  it('bésigue du joueur 1 groupé pour joueur 1 seulement', () => {
    const dame  = c('spades',   'Q')
    const valet = c('diamonds', 'J')
    const annonces = [annonce(1, 'besigue', [dame.id, valet.id])]

    // Pour le joueur 1 → groupe bésigue
    const groupes1 = grouperCartesEtalees([dame, valet], annonces, 1)
    expect(groupes1).toHaveLength(1)
    expect(groupes1[0].type).toBe('besigue')

    // Pour le joueur 0 → pas de groupement
    const groupes0 = grouperCartesEtalees([dame, valet], annonces, 0)
    expect(groupes0).toHaveLength(2)
    groupes0.forEach(g => expect(g.type).toBe('seule'))
  })
})

// ============================================================
// 5. NON-RÉGRESSION — MARIAGES (comportement inchangé)
// ============================================================

describe('Non-régression mariages (comportement inchangé après ajout bésigue)', () => {
  it('mariage seul sans bésigue → comportement identique', () => {
    const roi  = c('diamonds', 'K')
    const dame = c('diamonds', 'Q')
    const annonces = [annonce(0, 'mariage_hors_atout', [roi.id, dame.id])]

    const groupes = grouperCartesEtalees([roi, dame], annonces, 0)
    expect(groupes).toHaveLength(1)
    expect(groupes[0].type).toBe('mariage')
  })

  it('carte sans combinaison toujours en seule', () => {
    const dix = c('clubs', '10')
    const groupes = grouperCartesEtalees([dix], [], 0)
    expect(groupes[0].type).toBe('seule')
    if (groupes[0].type === 'seule') expect(groupes[0].carte.id).toBe(dix.id)
  })
})
