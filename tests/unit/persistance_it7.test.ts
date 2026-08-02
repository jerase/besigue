// ============================================================
// TESTS IT-7 — PERSISTANCE & HISTORIQUE (SF-20)
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  sauvegarder, chargerSauvegarde, supprimerSauvegarde,
  sauvegardeExiste, horodatage,
  ajouterHistorique, chargerHistorique, effacerHistorique,
} from '../../src/utils/persistence'
import type { EntreeHistorique } from '../../src/utils/persistence'
import { initialiserPartie } from '../../src/core/init'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState } from '../../src/types'

// ── Mock localStorage ─────────────────────────────────────────
const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem:    (k: string) => store[k] ?? null,
  setItem:    (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear:      () => { Object.keys(store).forEach(k => delete store[k]) },
})
beforeEach(() => Object.keys(store).forEach(k => delete store[k]))

// ============================================================
// SAUVEGARDE / CHARGEMENT
// ============================================================

describe('Sauvegarde et chargement', () => {
  it('sauvegarder puis charger retourne la même sauvegarde', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    expect(sauvegarder(CONFIG_DEFAUT, state, [])).toBe(true)
    const save = chargerSauvegarde()
    expect(save).not.toBeNull()
    expect(save!.state.partieId).toBe(state.partieId)
    expect(save!.config.nomJoueur1).toBe(CONFIG_DEFAUT.nomJoueur1)
  })

  it('sauvegardeExiste : false avant, true après', () => {
    expect(sauvegardeExiste()).toBe(false)
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    sauvegarder(CONFIG_DEFAUT, state, [])
    expect(sauvegardeExiste()).toBe(true)
  })

  it('supprimerSauvegarde efface', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    sauvegarder(CONFIG_DEFAUT, state, [])
    supprimerSauvegarde()
    expect(sauvegardeExiste()).toBe(false)
    expect(chargerSauvegarde()).toBeNull()
  })

  it('chargerSauvegarde retourne null si rien', () => {
    expect(chargerSauvegarde()).toBeNull()
  })

  it('horodatage null sans sauvegarde', () => {
    expect(horodatage()).toBeNull()
  })

  it('horodatage non-null après sauvegarde', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    sauvegarder(CONFIG_DEFAUT, state, [])
    const ts = horodatage()
    expect(ts).not.toBeNull()
    expect(typeof ts).toBe('string')
  })

  it('JSON corrompu → null', () => {
    store['besigue_save'] = '{invalid'
    expect(chargerSauvegarde()).toBeNull()
  })

  it('version incompatible → null', () => {
    store['besigue_save'] = JSON.stringify({ version: '0.1', state: { partieId: 'x' }, config: {}, history: [] })
    expect(chargerSauvegarde()).toBeNull()
  })

  it('compatibilité : champs manquants IT-4/5/6 initialisés', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const ancien = { ...state, annonces: undefined, combisEnAttente: undefined, usagesCartes: undefined, mariagesAtoutActifs: undefined }
    store['besigue_save'] = JSON.stringify({ version: '1.0', timestamp: Date.now(), config: CONFIG_DEFAUT, state: ancien, history: [] })
    const save = chargerSauvegarde()
    expect(save).not.toBeNull()
    expect(save!.state.annonces).toEqual([])
    expect(save!.state.combisEnAttente).toEqual([[], []])
    expect(save!.state.usagesCartes).toEqual([])
    expect(save!.state.mariagesAtoutActifs).toEqual([[], []])
  })

  it('Étape 4 (Phase 1) — ancienne sauvegarde en forme objet {0,1} avec contenu migrée vers tableau, sans perte', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    // Simule une sauvegarde créée AVANT l'étape 4 : mariagesAtoutActifs/combisEnAttente
    // étaient alors des objets { 0: [...], 1: [...] }, pas des tableaux. Contrairement
    // au test précédent (champs absents), ici les champs sont présents avec du contenu
    // réel — le cas que `if (!champ)` ne détectait pas avant la correction.
    const ancienFormatObjet = {
      ...state,
      mariagesAtoutActifs: { 0: [['roi-id', 'dame-id']], 1: [] } as unknown as GameState['mariagesAtoutActifs'],
      combisEnAttente: { 0: [], 1: [{ nom: 'besigue', points: 40, cartesIds: ['a', 'b'] }] } as unknown as GameState['combisEnAttente'],
    }
    store['besigue_save'] = JSON.stringify({ version: '1.0', timestamp: Date.now(), config: CONFIG_DEFAUT, state: ancienFormatObjet, history: [] })

    const save = chargerSauvegarde()
    expect(save).not.toBeNull()
    // Migrée en tableau, ET le contenu du siège 0/1 est préservé (pas juste réinitialisé à vide)
    expect(Array.isArray(save!.state.mariagesAtoutActifs)).toBe(true)
    expect(save!.state.mariagesAtoutActifs[0]).toEqual([['roi-id', 'dame-id']])
    expect(save!.state.mariagesAtoutActifs[1]).toEqual([])

    expect(Array.isArray(save!.state.combisEnAttente)).toBe(true)
    expect(save!.state.combisEnAttente[0]).toEqual([])
    expect(save!.state.combisEnAttente[1]).toEqual([{ nom: 'besigue', points: 40, cartesIds: ['a', 'b'] }])
  })

  it('132 cartes conservées après sauvegarder/charger', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    sauvegarder(CONFIG_DEFAUT, state, [])
    const save = chargerSauvegarde()!
    const total = save.state.joueurs[0].main.length + save.state.joueurs[1].main.length + save.state.pioche.length
    expect(total).toBe(132)
  })

  it('scores conservés', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    const joueurs = [...state.joueurs] as typeof state.joueurs
    joueurs[0] = { ...joueurs[0], marquePoints: 450 }
    joueurs[1] = { ...joueurs[1], marquePoints: 320 }
    sauvegarder(CONFIG_DEFAUT, { ...state, joueurs }, [])
    const save = chargerSauvegarde()!
    expect(save.state.joueurs[0].marquePoints).toBe(450)
    expect(save.state.joueurs[1].marquePoints).toBe(320)
  })

  it('phase conservée', () => {
    const { state } = initialiserPartie(CONFIG_DEFAUT)
    sauvegarder(CONFIG_DEFAUT, { ...state, phase: 'finale' }, [])
    expect(chargerSauvegarde()!.state.phase).toBe('finale')
  })

  it('sauvegarde successive écrase la précédente', () => {
    const { state: s1 } = initialiserPartie(CONFIG_DEFAUT)
    const { state: s2 } = initialiserPartie(CONFIG_DEFAUT)
    sauvegarder(CONFIG_DEFAUT, s1, [])
    sauvegarder(CONFIG_DEFAUT, s2, [])
    expect(chargerSauvegarde()!.state.partieId).toBe(s2.partieId)
  })
})

// ============================================================
// HISTORIQUE
// ============================================================

describe('Historique des parties', () => {
  const entree = (overrides?: Partial<EntreeHistorique>): EntreeHistorique => ({
    partieId: `p_${Math.random()}`,
    date: Date.now(),
    vainqueur: 'Joueur',
    scoreJ0: 1050, scoreJ1: 620,
    nomJ0: 'Joueur', nomJ1: 'IA',
    nbBrisquesJ0: 18, nbBrisquesJ1: 14,
    charlesBezigue: false,
    mancheNumero: 1,
    ...overrides,
  })

  it('vide par défaut', () => {
    expect(chargerHistorique()).toEqual([])
  })

  it('ajouterHistorique persiste', () => {
    const e = entree()
    ajouterHistorique(e)
    expect(chargerHistorique()[0].partieId).toBe(e.partieId)
  })

  it('nouvelles parties en tête', () => {
    ajouterHistorique(entree({ partieId: 'old' }))
    ajouterHistorique(entree({ partieId: 'new' }))
    const h = chargerHistorique()
    expect(h[0].partieId).toBe('new')
    expect(h[1].partieId).toBe('old')
  })

  it('limité à 20 parties', () => {
    for (let i = 0; i < 25; i++) ajouterHistorique(entree({ partieId: `p${i}` }))
    expect(chargerHistorique()).toHaveLength(20)
  })

  it('effacerHistorique vide', () => {
    ajouterHistorique(entree())
    effacerHistorique()
    expect(chargerHistorique()).toEqual([])
  })

  it('charlesBezigue enregistré', () => {
    ajouterHistorique(entree({ charlesBezigue: true, scoreJ1: 600 }))
    const h = chargerHistorique()
    expect(h[0].charlesBezigue).toBe(true)
  })

  it('mancheNumero conservé', () => {
    ajouterHistorique(entree({ mancheNumero: 3 }))
    expect(chargerHistorique()[0].mancheNumero).toBe(3)
  })
})
