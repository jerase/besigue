// ============================================================
// PANNEAU SCORE — IT-2
// Scores permanents, atout, phase (SF-13.5)
// ============================================================

import React from 'react'
import type { GameState } from '../../types'
import { NOM_COULEUR, SYMBOLE_COULEUR } from '../../types'

interface PanneauScoreProps {
  state: GameState
  onPause: () => void
}

export const PanneauScore: React.FC<PanneauScoreProps> = ({ state, onPause }) => {
  const [j0, j1] = state.joueurs

  return (
    <div className="flex items-center justify-between gap-4 bg-[#0d1f3c]/90 border-b border-white/10 px-4 py-2 backdrop-blur">
      {/* Joueur 0 */}
      <ScoreJoueur
        nom={j0.nom}
        points={j0.marquePoints}
        estActif={state.joueurActif === 0}
        estHumain
      />

      {/* Centre : atout + phase + pause */}
      <div className="flex flex-col items-center gap-1 min-w-20">
        <AtoutBadge couleurAtout={state.couleurAtout} />
        <PhaseBadge phase={state.phase} />
        <button
          onClick={onPause}
          className="mt-1 text-white/30 hover:text-white/60 text-xs cursor-pointer transition-colors"
          title="Menu pause"
        >
          ⏸ Pause
        </button>
      </div>

      {/* Joueur 1 / IA */}
      <ScoreJoueur
        nom={j1.nom}
        points={j1.marquePoints}
        estActif={state.joueurActif === 1}
        estIA={j1.type === 'ia'}
      />
    </div>
  )
}

// ── Score d'un joueur ─────────────────────────────────────────

const ScoreJoueur: React.FC<{
  nom: string
  points: number
  estActif: boolean
  estHumain?: boolean
  estIA?: boolean
}> = ({ nom, points, estActif, estIA }) => (
  <div className={`flex flex-col items-center min-w-24 transition-all ${estActif ? 'opacity-100' : 'opacity-50'}`}>
    <div className="flex items-center gap-1.5">
      {estActif && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
      <span className="text-xs text-white/50 font-medium truncate max-w-24">
        {estIA ? '🤖' : '👤'} {nom}
      </span>
    </div>
    <span className={`text-2xl font-bold tabular-nums ${estActif ? 'text-amber-300' : 'text-white/60'}`}
      style={{ fontFamily: 'Georgia, serif' }}>
      {points.toLocaleString('fr-FR')}
    </span>
    <span className="text-[10px] text-white/25">pts</span>
  </div>
)

// ── Badge atout ───────────────────────────────────────────────

const AtoutBadge: React.FC<{ couleurAtout: string | null }> = ({ couleurAtout }) => {
  if (!couleurAtout) {
    return (
      <div className="flex flex-col items-center">
        <span className="text-xs text-white/25">Atout</span>
        <span className="text-lg text-white/20">?</span>
      </div>
    )
  }
  const isRouge = couleurAtout === 'hearts' || couleurAtout === 'diamonds'
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-white/25">Atout</span>
      <span
        className="text-2xl font-bold"
        style={{ color: isRouge ? '#e74c3c' : '#ecf0f1' }}
        title={NOM_COULEUR[couleurAtout as keyof typeof NOM_COULEUR]}
      >
        {SYMBOLE_COULEUR[couleurAtout as keyof typeof SYMBOLE_COULEUR]}
      </span>
    </div>
  )
}

// ── Badge phase ───────────────────────────────────────────────

const PhaseBadge: React.FC<{ phase: string }> = ({ phase }) => {
  const config = {
    libre:    { label: 'Phase libre',   classe: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    finale:   { label: '⚡ FINALE',     classe: 'text-red-400 bg-red-400/10 border-red-400/20' },
    terminee: { label: 'Terminée',      classe: 'text-white/30 bg-white/5 border-white/10' },
  }[phase] ?? { label: phase, classe: 'text-white/30 bg-white/5 border-white/10' }

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.classe}`}>
      {config.label}
    </span>
  )
}

export default PanneauScore
