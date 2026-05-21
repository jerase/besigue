// ============================================================
// DECK DISPLAY — IT-1
// Affichage du deck complet pour tests visuels
// ============================================================

import React, { useState, useMemo } from 'react'
import type { Couleur, Deck } from '../../types'
import { NOM_COULEUR, SYMBOLE_COULEUR } from '../../types'
import { statsDeck, valeurBrisque } from '../../core/deck'
import { CarteComponent } from './Carte'
import type { Carte } from '../../types'

interface DeckDisplayProps {
  deck: Deck
  titre?: string
}

type Filtre = 'tous' | Couleur | 'jokers'

const COULEURS: Couleur[] = ['spades', 'hearts', 'diamonds', 'clubs']

const COULEUR_ACCENT: Record<Couleur, string> = {
  spades: '#64748b',
  clubs: '#64748b',
  hearts: '#ef4444',
  diamonds: '#f97316',
}

export const DeckDisplay: React.FC<DeckDisplayProps> = ({ deck, titre = 'Deck complet' }) => {
  const [filtre, setFiltre] = useState<Filtre>('tous')
  const [carteSelectionnee, setCarteSelectionnee] = useState<Carte | null>(null)

  const stats = useMemo(() => statsDeck(deck), [deck])

  const cartesAffichees = useMemo(() => {
    const cartesFaceUp: Carte[] = deck.cartes.map(c => ({ ...c, faceUp: true, etat: 'faceUp' as const }))
    if (filtre === 'tous') return cartesFaceUp
    if (filtre === 'jokers') return cartesFaceUp.filter(c => c.estJoker)
    return cartesFaceUp.filter(c => !c.estJoker && c.couleur === filtre)
  }, [deck, filtre])

  const handleClick = (carte: Carte) => {
    setCarteSelectionnee(prev => prev?.id === carte.id ? null : carte)
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <div className="border-b border-white/10 bg-[#0d1f3c] px-8 py-6">
        <h1 className="text-3xl font-bold tracking-wide text-amber-300" style={{ fontFamily: 'Georgia, serif' }}>
          {titre}
        </h1>
        <p className="mt-1 text-sm text-white/50">Itération 1 — Moteur de cartes</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <StatBadge label="Total" valeur={stats.total} couleur="#f59e0b" />
          <StatBadge label="Normales" valeur={stats.normales} couleur="#60a5fa" />
          <StatBadge label="Jokers" valeur={stats.jokers} couleur="#a78bfa" />
          <StatBadge label="Brisques" valeur={stats.brisquesTotal} couleur="#34d399" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-8 py-4 border-b border-white/10">
        <BoutonFiltre actif={filtre === 'tous'} onClick={() => setFiltre('tous')} label={`Tous (${deck.cartes.length})`} />
        {COULEURS.map(c => (
          <BoutonFiltre
            key={c}
            actif={filtre === c}
            onClick={() => setFiltre(c)}
            label={`${SYMBOLE_COULEUR[c]} ${NOM_COULEUR[c].split(' ')[1]} (${stats.parCouleur[c] ?? 0})`}
            accent={COULEUR_ACCENT[c]}
          />
        ))}
        <BoutonFiltre actif={filtre === 'jokers'} onClick={() => setFiltre('jokers')} label={`★ Jokers (${stats.jokers})`} accent="#a78bfa" />
      </div>

      <div className="px-8 py-6">
        <div className="flex flex-wrap gap-3">
          {cartesAffichees.map(carte => (
            <div key={carte.id} className="flex flex-col items-center gap-1">
              <CarteComponent
                carte={carteSelectionnee?.id === carte.id ? { ...carte, etat: 'selected' } : carte}
                taille="md"
                onClick={handleClick}
              />
              <span className="text-[9px] text-white/30 font-mono">j{carte.jeuIndex}</span>
              {valeurBrisque(carte) === 1 && (
                <span className="text-[9px] text-amber-400 font-bold">B</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {carteSelectionnee !== null && (
        <div className="fixed bottom-6 right-6 bg-[#1a2f50] border border-amber-400/30 rounded-xl p-4 shadow-2xl min-w-48">
          <h3 className="text-amber-300 font-bold text-sm mb-2">Carte sélectionnée</h3>
          <div className="text-xs text-white/70 space-y-1 font-mono">
            <p><span className="text-white/40">ID:</span> {carteSelectionnee.id}</p>
            <p><span className="text-white/40">Rang:</span> {carteSelectionnee.rang}</p>
            <p><span className="text-white/40">Couleur:</span> {carteSelectionnee.couleur}</p>
            <p><span className="text-white/40">Jeu:</span> {carteSelectionnee.jeuIndex}</p>
            <p><span className="text-white/40">Joker:</span> {carteSelectionnee.estJoker ? 'oui' : 'non'}</p>
            <p><span className="text-white/40">Brisque:</span> {valeurBrisque(carteSelectionnee)}</p>
          </div>
          <button onClick={() => setCarteSelectionnee(null)} className="mt-3 text-xs text-white/40 hover:text-white/70 cursor-pointer">
            ✕ Fermer
          </button>
        </div>
      )}

      <div className="px-8 py-4 border-t border-white/10">
        <h2 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-3">Répartition par rang</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.parRang).map(([rang, nb]) => (
            <div key={rang} className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-center">
              <div className="text-amber-300 font-bold text-sm">{rang}</div>
              <div className="text-white/50 text-xs">{nb}×</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const StatBadge: React.FC<{ label: string; valeur: number; couleur: string }> = ({ label, valeur, couleur }) => (
  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
    <span className="text-xs text-white/40">{label}</span>
    <span className="text-sm font-bold" style={{ color: couleur }}>{valeur}</span>
  </div>
)

const BoutonFiltre: React.FC<{ actif: boolean; onClick: () => void; label: string; accent?: string }> = ({
  actif, onClick, label, accent = '#f59e0b'
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border ${
      actif ? 'text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 border-transparent'
    }`}
    style={actif ? { backgroundColor: accent + '33', borderColor: accent + '66', color: accent } : {}}
  >
    {label}
  </button>
)

export default DeckDisplay
