// ============================================================
// ÉCRAN 01 — ACCUEIL (SF-05 ÉCRAN-01)
// ============================================================

import React, { useEffect, useState } from 'react'
import { sauvegardeExiste } from '../utils/persistence'
import type { EntreeHistorique } from '../utils/persistence'
import { chargerHistorique } from '../utils/persistence'

interface AccueilProps {
  onNouvellePartie: () => void
  onReprendrePartie: () => void
  onRegles: () => void
}

export const EcranAccueil: React.FC<AccueilProps> = ({
  onNouvellePartie,
  onReprendrePartie,
  onRegles,
}) => {
  const [hasSave, setHasSave] = useState(false)
  const [historique, setHistorique] = useState<EntreeHistorique[]>([])

  useEffect(() => {
    setHasSave(sauvegardeExiste())
    setHistorique(chargerHistorique())
  }, [])

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Fond décoratif */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 text-[12rem] opacity-[0.03] select-none font-serif">♠</div>
        <div className="absolute top-1/3 right-1/4 text-[10rem] opacity-[0.03] select-none font-serif text-red-500">♥</div>
        <div className="absolute bottom-1/4 left-1/3 text-[9rem] opacity-[0.03] select-none font-serif text-red-500">♦</div>
        <div className="absolute bottom-1/3 right-1/3 text-[11rem] opacity-[0.03] select-none font-serif">♣</div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md">
        {/* Logo & Titre */}
        <div className="text-center">
          <div className="flex justify-center gap-4 mb-4 text-5xl">
            <span className="text-white/20">♠</span>
            <span className="text-red-400/40">♥</span>
            <span className="text-amber-300">🂡</span>
            <span className="text-red-400/40">♦</span>
            <span className="text-white/20">♣</span>
          </div>
          <h1 className="text-6xl font-bold text-amber-300 tracking-[0.15em]" style={{ fontFamily: 'Georgia, serif' }}>
            BÉSIGUE
          </h1>
          <p className="mt-3 text-white/40 text-sm tracking-widest uppercase">
            Jeu de cartes français
          </p>
        </div>

        {/* Boutons principaux */}
        <div className="flex flex-col gap-3 w-full">
          <BoutonAccueil
            onClick={onNouvellePartie}
            variante="principal"
            icone="🃏"
            label="Nouvelle partie"
          />

          {hasSave && (
            <BoutonAccueil
              onClick={onReprendrePartie}
              variante="secondaire"
              icone="↩"
              label="Reprendre la partie"
              badge="Sauvegarde disponible"
            />
          )}

          <BoutonAccueil
            onClick={onRegles}
            variante="ghost"
            icone="📖"
            label="Règles du jeu"
          />
        </div>

        {/* Historique des parties */}
        {historique.length > 0 && (
          <div className="w-full">
            <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">
              Parties récentes
            </h2>
            <div className="space-y-2">
              {historique.slice(0, 3).map((h, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-2.5">
                  <div className="text-xs text-white/60">
                    <span className="font-semibold text-white/80">{h.vainqueur}</span>
                    <span className="text-white/30 ml-2">a gagné</span>
                  </div>
                  <div className="text-xs text-white/40 font-mono">
                    {h.scoreJ0} – {h.scoreJ1}
                  </div>
                  <div className="text-xs text-white/25">
                    {new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Version */}
        <p className="text-white/15 text-xs">IT-2 — Bésigue v0.2</p>
      </div>
    </div>
  )
}

// ── Bouton accueil ────────────────────────────────────────────

interface BoutonAccueilProps {
  onClick: () => void
  variante: 'principal' | 'secondaire' | 'ghost'
  icone: string
  label: string
  badge?: string
}

const BoutonAccueil: React.FC<BoutonAccueilProps> = ({ onClick, variante, icone, label, badge }) => {
  const classes = {
    principal: 'bg-amber-500 hover:bg-amber-400 text-[#0a1628] font-bold shadow-lg shadow-amber-500/30',
    secondaire: 'bg-blue-600/80 hover:bg-blue-500 text-white font-semibold border border-blue-500/30',
    ghost: 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10',
  }[variante]

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-3 px-6 py-4 rounded-xl text-left transition-all duration-200 cursor-pointer ${classes}`}
    >
      <span className="text-xl">{icone}</span>
      <span className="text-base">{label}</span>
      {badge && (
        <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  )
}

export default EcranAccueil
