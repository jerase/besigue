// ============================================================
// LOGGER — IT-1
// Fichier de log JSON structuré pour debug
// ============================================================

import type { EntreeLog, FichierLog, NiveauLog } from '../types'

class Logger {
  private log: FichierLog
  private readonly CLE_STORAGE = 'besigue_log'
  private readonly MAX_ENTRIES = 2000

  constructor() {
    this.log = {
      version: '1.0',
      partieId: this.genererPartieId(),
      entries: [],
    }
  }

  private genererPartieId(): string {
    return `partie_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  private ajouter(niveau: NiveauLog, categorie: string, message: string, donnees?: unknown) {
    const entree: EntreeLog = {
      timestamp: Date.now(),
      niveau,
      categorie,
      message,
      donnees,
    }
    this.log.entries.push(entree)

    if (this.log.entries.length > this.MAX_ENTRIES) {
      this.log.entries = this.log.entries.slice(-this.MAX_ENTRIES)
    }

    try {
      localStorage.setItem(this.CLE_STORAGE, JSON.stringify(this.log))
    } catch {
      // Silencieux si localStorage indisponible (tests unitaires)
    }

    // Sortie console en dev
    try {
      if ((import.meta as any)?.env?.DEV) {
        const prefix = `[BÉSIGUE][${categorie}]`
        if (niveau === 'ERROR') console.error(prefix, message, donnees)
        else if (niveau === 'WARN') console.warn(prefix, message, donnees)
        else if (niveau === 'DEBUG') console.debug(prefix, message, donnees)
        else console.log(prefix, message, donnees)
      }
    } catch {
      // import.meta indisponible hors vite (tests node)
    }
  }

  info(categorie: string, message: string, donnees?: unknown) {
    this.ajouter('INFO', categorie, message, donnees)
  }
  warn(categorie: string, message: string, donnees?: unknown) {
    this.ajouter('WARN', categorie, message, donnees)
  }
  error(categorie: string, message: string, donnees?: unknown) {
    this.ajouter('ERROR', categorie, message, donnees)
  }
  debug(categorie: string, message: string, donnees?: unknown) {
    this.ajouter('DEBUG', categorie, message, donnees)
  }

  nouvellePartie(partieId?: string) {
    this.log = {
      version: '1.0',
      partieId: partieId ?? this.genererPartieId(),
      entries: [],
    }
    this.info('LOGGER', 'Nouvelle partie initialisée', { partieId: this.log.partieId })
  }

  exporterJSON(): string {
    return JSON.stringify(this.log, null, 2)
  }

  getLog(): FichierLog {
    return { ...this.log }
  }

  chargerDepuisStorage(): boolean {
    try {
      const data = localStorage.getItem(this.CLE_STORAGE)
      if (data) {
        this.log = JSON.parse(data) as FichierLog
        return true
      }
    } catch {
      // Ignore
    }
    return false
  }

  effacer() {
    this.log.entries = []
    try {
      localStorage.removeItem(this.CLE_STORAGE)
    } catch {
      // Silencieux
    }
  }
}

export const logger = new Logger()
