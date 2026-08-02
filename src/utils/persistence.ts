// ============================================================
// PERSISTANCE
// Sauvegarde / restauration dans localStorage
// ============================================================

import type { GameConfig, GameState, ActionJeu, Sauvegarde } from '../types'
import { logger } from './logger'

const CLE_SAVE = 'besigue_save'
const CLE_HISTO = 'besigue_historique'
const VERSION = '1.0'

// ── Sauvegarde automatique ────────────────────────────────────

export function sauvegarder(
 config: GameConfig,
 state: GameState,
 history: ActionJeu[]
): boolean {
 try {
 const save: Sauvegarde = {
 version: VERSION,
 timestamp: Date.now(),
 config,
 state,
 history,
 }
 localStorage.setItem(CLE_SAVE, JSON.stringify(save))
 logger.debug('SAVE', 'Sauvegarde effectuée', { partieId: state.partieId })
 return true
 } catch (err) {
 logger.error('SAVE', 'Échec sauvegarde', err)
 return false
 }
}

// ── Migration Étape 4 (Phase 1) ─────────────────────────────────
//
// mariagesAtoutActifs et combisEnAttente sont passés de Record<0|1,T>
// à T[] (tableau indexé par siège). Une sauvegarde localStorage créée
// avant ce changement contient encore l'ancienne forme objet
// { 0: [...], 1: [...] }. Cette fonction migre l'une ou l'autre forme
// (ou l'absence du champ, pour une sauvegarde encore plus ancienne)
// vers la forme tableau attendue par le code actuel.
function migrerVersTableauParSiege<T>(champ: unknown): T[][] {
 if (Array.isArray(champ)) return champ as T[][]
 if (champ && typeof champ === 'object') {
 const obj = champ as Record<string, T[]>
 return [obj[0] ?? obj['0'] ?? [], obj[1] ?? obj['1'] ?? []]
 }
 return [[], []]
}

// ── Chargement ────────────────────────────────────────────────

export function chargerSauvegarde(): Sauvegarde | null {
 try {
 const raw = localStorage.getItem(CLE_SAVE)
 if (!raw) return null
 const save = JSON.parse(raw) as Sauvegarde
 if (save.version !== VERSION) {
 logger.warn('SAVE', 'Version sauvegarde incompatible', { version: save.version })
 return null
 }
 if (!save.state.annonces) save.state.annonces = []
 if (!save.state.usagesCartes) save.state.usagesCartes = []
 // Étape 4 (Phase 1) : mariagesAtoutActifs/combisEnAttente sont désormais des
 // tableaux indexés par siège (auparavant Record<0|1,T>). Une sauvegarde plus
 // ancienne peut encore contenir l'ancienne forme objet { 0: [...], 1: [...] }
 // — un simple test de présence (`if (!champ)`) ne la détecterait pas, car un
 // objet non-vide est "vrai". Migration explicite par forme, pas seulement par absence.
 save.state.mariagesAtoutActifs = migrerVersTableauParSiege(save.state.mariagesAtoutActifs)
 save.state.combisEnAttente = migrerVersTableauParSiege(save.state.combisEnAttente)
 logger.info('SAVE', 'Sauvegarde chargée', { partieId: save.state.partieId, timestamp: save.timestamp })
 return save
 } catch (err) {
 logger.error('SAVE', 'Échec chargement sauvegarde', err)
 return null
 }
}

// ── Suppression ───────────────────────────────────────────────

export function supprimerSauvegarde(): void {
 try {
 localStorage.removeItem(CLE_SAVE)
 logger.info('SAVE', 'Sauvegarde supprimée')
 } catch {
 // Silencieux
 }
}

export function sauvegardeExiste(): boolean {
 try {
 return localStorage.getItem(CLE_SAVE) !== null
 } catch {
 return false
 }
}

// ── Historique des parties terminées ────────────────

export interface EntreeHistorique {
 partieId: string
 date: number
 vainqueur: string
 scoreJ0: number
 scoreJ1: number
 nomJ0: string
 nomJ1: string
 nbBrisquesJ0: number
 nbBrisquesJ1: number
 charlesBezigue: boolean
 mancheNumero: number
}

export function ajouterHistorique(entree: EntreeHistorique): void {
 try {
 const raw = localStorage.getItem(CLE_HISTO)
 const histo: EntreeHistorique[] = raw ? JSON.parse(raw) : []
 histo.unshift(entree)
 // Garder les 20 dernières parties
 const truncated = histo.slice(0, 20)
 localStorage.setItem(CLE_HISTO, JSON.stringify(truncated))
 logger.info('HISTO', 'Partie ajoutée à l\'historique', { partieId: entree.partieId })
 } catch (err) {
 logger.error('HISTO', 'Échec ajout historique', err)
 }
}

export function chargerHistorique(): EntreeHistorique[] {
 try {
 const raw = localStorage.getItem(CLE_HISTO)
 return raw ? JSON.parse(raw) : []
 } catch {
 return []
 }
}

export function horodatage(): string | null {
 try {
 const raw = localStorage.getItem(CLE_SAVE)
 if (!raw) return null
 const save = JSON.parse(raw) as Sauvegarde
 return new Date(save.timestamp).toLocaleString('fr-FR')
 } catch { return null }
}

export function effacerHistorique(): void {
 try { localStorage.removeItem(CLE_HISTO) } catch { /* silencieux */ }
}
