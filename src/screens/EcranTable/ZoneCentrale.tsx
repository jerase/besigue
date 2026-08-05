// ============================================================
// COMPOSANTS — zone centrale (pioche, atout, cartes du pli en cours)
// ============================================================

import React from 'react'
import type { GameState, Carte } from '../../types'
import { CarteComponent } from '../../components/ui/Carte'
import { NB_CARTES_PIOCHE_INITIALE } from '../../core/init'

const JaugePioche: React.FC<{ nbCartes: number }> = ({ nbCartes }) => {
 const pct = Math.max(0, Math.min(1, nbCartes / NB_CARTES_PIOCHE_INITIALE))
 const hue = Math.round(pct * 120)
 const couleurJauge = `hsl(${hue}, 70%, 45%)`
 const couleurTexte = `hsl(${hue}, 80%, 65%)`
 const couleurGlow = `hsl(${hue}, 70%, 40%)`
 const estVide = nbCartes === 0
 const layers = Math.min(4, Math.ceil(nbCartes / 30))

 return (
 <div className="flex flex-col items-center gap-1.5 w-full">
 {estVide ? (
 <div className="w-14 h-16 rounded-lg border-2 border-dashed border-white/12 flex items-center justify-center">
 <span className="text-white/20 text-[10px]">Vide</span>
 </div>
) : (
 <div className="relative w-14 h-16">
 {Array.from({ length: layers }).map((_, i) => (
 <div key={i} className="absolute rounded-lg bg-[#1e3a6b] border border-[#2d5aa0]"
 style={{ width: 56, height: 62, top: -(i * 1.5), left: i, zIndex: i }} />
))}
 <div className="absolute inset-0 rounded-lg bg-[#1e3a6b] border border-[#4a7fd4] z-10 flex items-center justify-center">
 <span className="text-[#4a7fd4] text-lg opacity-50">♦</span>
 </div>
 </div>
)}
 <div className="w-full flex flex-col items-center gap-0.5">
 <div
 className="w-full h-3 rounded-full overflow-hidden"
 style={{ background: 'rgba(255,255,255,0.08)' }}
 title={`${nbCartes} / ${NB_CARTES_PIOCHE_INITIALE} cartes`}
 >
 <div
 className="h-full rounded-full transition-all duration-500"
 style={{
 width: `${pct * 100}%`,
 background: couleurJauge,
 boxShadow: pct > 0 ? `0 0 6px ${couleurGlow}` : 'none',
 }}
 />
 </div>
 <span
 className="text-xs font-bold tabular-nums"
 style={{ color: estVide ? 'rgba(255,255,255,0.25)' : couleurTexte }}
 >
 {nbCartes}
 <span className="text-[9px] font-normal opacity-60 ml-0.5">/ {NB_CARTES_PIOCHE_INITIALE}</span>
 </span>
 </div>
 </div>
)
}

const SlotCarte: React.FC<{ label: string; carte: Carte | null; estVainqueur: boolean }> = ({
 label, carte, estVainqueur,
}) => (
 <div className="flex flex-col items-center gap-1">
 <span className={`text-[10px] uppercase tracking-widest ${estVainqueur ? 'text-amber-400 font-bold' : 'text-white/25'}`}>
 {estVainqueur ? '★ ' : ''}{label}
 </span>
 {carte ? (
 <div className={estVainqueur ? 'ring-2 ring-amber-400/50 rounded-lg' : ''}>
 <CarteComponent carte={{ ...carte, etat: 'played' }} taille="md" />
 </div>
) : (
 <div className="w-20 h-[116px] rounded-lg border-2 border-dashed border-white/8 flex items-center justify-center">
 <span className="text-white/12 text-xs">—</span>
 </div>
)}
 </div>
)

export const ZoneCentrale: React.FC<{
 state: GameState
 dernierPliVainqueur: (0 | 1) | null
}> = ({ state, dernierPliVainqueur }) => {
 const { pliEnCours, couleurAtout } = state
 const nbCartesRestantes = state.pioche.length
 const c0 = pliEnCours.carteJoueur0
 const c1 = pliEnCours.carteJoueur1
 const isRouge = couleurAtout === 'hearts' || couleurAtout === 'diamonds'

 return (
 <div className="flex items-center justify-center gap-6 py-3 px-4 flex-shrink-0">
 <SlotCarte label="Vous" carte={c0} estVainqueur={dernierPliVainqueur === 0} />

 <div className="flex flex-col items-center gap-1.5 min-w-24">
 <JaugePioche nbCartes={nbCartesRestantes} />
 {couleurAtout ? (
 <div className="text-center leading-tight">
 <span className="text-[9px] text-white/20 block uppercase tracking-wider">Atout</span>
 <span className="text-xl font-bold" style={{ color: isRouge ? '#e74c3c' : '#ecf0f1' }}>
 {couleurAtout === 'hearts' ? '♥' : couleurAtout === 'diamonds' ? '♦' : couleurAtout === 'spades' ? '♠' : '♣'}
 </span>
 </div>
) : (
 <span className="text-[9px] text-white/15 italic">Atout ?</span>
)}
 </div>

 <SlotCarte label="IA" carte={c1} estVainqueur={dernierPliVainqueur === 1} />
 </div>
)
}
