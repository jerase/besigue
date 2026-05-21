// ============================================================
// PANNEAU D'ANNONCES — IT-4
// SF-10 : Proposer et afficher les combinaisons disponibles
// ============================================================

import React from 'react'
import type { CombinaisonDisponible, AnnoncePosee } from '../../types'
import { NOM_AFFICHE_COMBINAISON } from '../../types'

interface AnnouncementPanelProps {
  combisDisponibles: CombinaisonDisponible[]
  annonces: AnnoncePosee[]
  onAnnoncer: (combi: CombinaisonDisponible) => void
  onPasser: () => void
}

// Couleurs par type de combinaison
const COULEUR_COMBI: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  mariage_atout:      { bg: 'bg-amber-500/15',  border: 'border-amber-400/40',  text: 'text-amber-300',  badge: 'bg-amber-500/20 text-amber-300' },
  mariage_hors_atout: { bg: 'bg-yellow-500/10', border: 'border-yellow-400/30', text: 'text-yellow-300', badge: 'bg-yellow-500/15 text-yellow-300' },
  quinte:             { bg: 'bg-purple-500/15', border: 'border-purple-400/40', text: 'text-purple-300', badge: 'bg-purple-500/20 text-purple-300' },
  sept_atout:         { bg: 'bg-blue-500/10',   border: 'border-blue-400/30',   text: 'text-blue-300',   badge: 'bg-blue-500/15 text-blue-300' },
  besigue:            { bg: 'bg-rose-500/15',   border: 'border-rose-400/40',   text: 'text-rose-300',   badge: 'bg-rose-500/20 text-rose-300' },
  default:            { bg: 'bg-emerald-500/10',border: 'border-emerald-400/30',text: 'text-emerald-300',badge: 'bg-emerald-500/15 text-emerald-300' },
}

function getCouleur(nom: string) {
  return COULEUR_COMBI[nom] ?? COULEUR_COMBI.default
}

export const AnnouncementPanel: React.FC<AnnouncementPanelProps> = ({
  combisDisponibles,
  annonces,
  onAnnoncer,
  onPasser,
}) => {
  // Historique des 5 dernières annonces
  const dernieresAnnonces = [...annonces].reverse().slice(0, 5)

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-[#0a1628]/95 backdrop-blur border-t border-white/15 shadow-2xl">
      <div className="max-w-2xl mx-auto px-4 py-3">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-amber-300" style={{ fontFamily: 'Georgia, serif' }}>
              🎴 Annonce disponible
            </h3>
            <p className="text-[11px] text-white/40 mt-0.5">
              Choisissez une combinaison à annoncer, ou passez.
            </p>
          </div>
          <button
            onClick={onPasser}
            className="px-3 py-1.5 text-xs text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all cursor-pointer"
          >
            Passer →
          </button>
        </div>

        {/* ── Combinaisons disponibles ── */}
        <div className="flex flex-wrap gap-2 mb-3">
          {combisDisponibles.map((combi, i) => {
            const { bg, border, text, badge } = getCouleur(combi.nom)
            return (
              <button
                key={`${combi.nom}-${i}`}
                onClick={() => onAnnoncer(combi)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 ${bg} ${border}`}
              >
                <div className="text-left">
                  <div className={`text-sm font-bold ${text}`}>
                    {NOM_AFFICHE_COMBINAISON[combi.nom]}
                  </div>
                  <div className={`text-xs font-bold ${badge} px-1.5 py-0.5 rounded-full inline-block mt-0.5`}>
                    +{combi.points} pts
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Historique compact ── */}
        {dernieresAnnonces.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] text-white/25 uppercase tracking-widest shrink-0">Annonces :</span>
            {dernieresAnnonces.map((a, i) => {
              const { badge } = getCouleur(a.nom)
              return (
                <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${badge} border border-white/10`}>
                  J{a.joueurId} — {NOM_AFFICHE_COMBINAISON[a.nom]} (+{a.points})
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Historique complet des annonces (dans la table) ───────────

interface HistoriqueAnnoncesProps {
  annonces: AnnoncePosee[]
}

export const HistoriqueAnnonces: React.FC<HistoriqueAnnoncesProps> = ({ annonces }) => {
  if (annonces.length === 0) return null

  return (
    <div className="px-3 py-2 bg-black/20 border-t border-white/5">
      <div className="flex flex-wrap gap-1.5">
        {[...annonces].reverse().slice(0, 8).map((a, i) => {
          const { badge } = getCouleur(a.nom)
          return (
            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full ${badge} border border-white/10`}>
              J{a.joueurId} : {NOM_AFFICHE_COMBINAISON[a.nom]} +{a.points}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default AnnouncementPanel
