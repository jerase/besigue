import React, { useEffect, useState } from 'react'
import { sauvegardeExiste, horodatage, chargerHistorique, effacerHistorique, supprimerSauvegarde } from '../utils/persistence'
import type { EntreeHistorique } from '../utils/persistence'

interface AccueilProps {
 onNouvellePartie: () => void
 onReprendrePartie: () => void
 onRegles: () => void
 onTutoriel?: () => void
}

export const EcranAccueil: React.FC<AccueilProps> = ({
 onNouvellePartie, onReprendrePartie, onRegles, onTutoriel,
}) => {
 const [hasSave, setHasSave] = useState(false)
 const [saveDate, setSaveDate] = useState<string | null>(null)
 const [historique, setHistorique] = useState<EntreeHistorique[]>([])
 const [showHisto, setShowHisto] = useState(false)
 const [confirmSave, setConfirmSave] = useState(false)
 const [confirmHisto, setConfirmHisto] = useState(false)

 useEffect(() => {
 setHasSave(sauvegardeExiste())
 setSaveDate(horodatage())
 setHistorique(chargerHistorique())
 }, [])

 const handleEffacerHisto = () => { effacerHistorique(); setHistorique([]); setConfirmHisto(false) }
 const handleSupprimerSave = () => { supprimerSauvegarde(); setHasSave(false); setSaveDate(null); setConfirmSave(false) }

 return (
 <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center px-4 relative overflow-hidden">
 {/* Fond décoratif */}
 <div className="absolute inset-0 pointer-events-none select-none">
 <div className="absolute top-1/4 left-1/4 text-[12rem] opacity-[0.03] font-serif">♠</div>
 <div className="absolute top-1/3 right-1/4 text-[10rem] opacity-[0.03] font-serif text-red-500">♥</div>
 <div className="absolute bottom-1/4 left-1/3 text-[9rem] opacity-[0.03] font-serif text-red-500">♦</div>
 <div className="absolute bottom-1/3 right-1/3 text-[11rem] opacity-[0.03] font-serif">♣</div>
 </div>

 <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md">
 {/* Logo */}
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
 <p className="mt-2 text-white/40 text-sm tracking-widest uppercase">LA VERSION HAÏTIENNE DU JEU</p>
 </div>

 {/* Boutons */}
 <div className="flex flex-col gap-3 w-full">
 <Btn onClick={onNouvellePartie} icone="🃏" label="Nouvelle partie" variante="principal" />
 {hasSave && (
 <div className="flex flex-col gap-1.5">
 <div className="flex gap-2 items-stretch">
 <Btn
 onClick={onReprendrePartie}
 icone="↩"
 label="Reprendre la partie"
 variante="secondaire"
 badge={saveDate ? `Sauvegardé le ${saveDate}` : 'Sauvegarde disponible'}
 className="flex-1"
 />
 <button
 onClick={() => setConfirmSave(v => !v)}
 title="Supprimer la sauvegarde"
 className={`px-3 rounded-xl border transition-all cursor-pointer text-sm ${
 confirmSave
 ? 'bg-red-500/20 border-red-500/50 text-red-400'
 : 'bg-white/5 border-white/15 text-white/40 hover:text-red-400 hover:border-red-400/40 hover:bg-red-500/10'
 }`}
 >
 🗑
 </button>
 </div>
 {confirmSave && (
 <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
 <span className="text-xs text-red-300 flex-1">Supprimer cette sauvegarde ?</span>
 <button
 onClick={handleSupprimerSave}
 className="text-xs font-bold text-red-400 hover:text-red-300 cursor-pointer px-2 py-1 bg-red-500/20 rounded-lg transition-colors"
 >
 Oui, supprimer
 </button>
 <button
 onClick={() => setConfirmSave(false)}
 className="text-xs text-white/40 hover:text-white/70 cursor-pointer px-2 py-1 rounded-lg transition-colors"
 >
 Annuler
 </button>
 </div>
)}
 </div>
)}
 <div className="flex gap-2">
 <Btn onClick={onRegles} icone="📖" label="Règles" variante="ghost" className="flex-1" />
 {onTutoriel && <Btn onClick={onTutoriel} icone="🎓" label="Tutoriel" variante="ghost" className="flex-1" />}
 </div>
 {historique.length > 0 && (
 <Btn
 onClick={() => setShowHisto(v => !v)}
 icone="📊"
 label={`Historique (${historique.length})`}
 variante="ghost"
 />
)}
 </div>

 {/* Historique */}
 {showHisto && historique.length > 0 && (
 <div className="w-full bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
 <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
 <h2 className="text-sm font-bold text-white/50 uppercase tracking-widest">Parties récentes</h2>
 {confirmHisto ? (
 <div className="flex items-center gap-2">
 <span className="text-xs text-red-300">Confirmer ?</span>
 <button onClick={handleEffacerHisto} className="text-xs font-bold text-red-400 hover:text-red-300 cursor-pointer">Oui</button>
 <button onClick={() => setConfirmHisto(false)} className="text-xs text-white/40 hover:text-white/70 cursor-pointer">Non</button>
 </div>
) : (
 <button onClick={() => setConfirmHisto(true)} className="text-xs text-red-400/60 hover:text-red-400 cursor-pointer">Effacer tout</button>
)}
 </div>
 <div className="divide-y divide-white/5 max-h-60 overflow-y-auto">
 {historique.map((h, i) => <HistoRow key={i} h={h} />)}
 </div>
 </div>
)}

 {/* Dernière partie (compact) */}
 {!showHisto && historique.length > 0 && (
 <div className="w-full">
 <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Dernière partie</p>
 <HistoRow h={historique[0]} />
 </div>
)}

 <p className="text-amber-400 text-sm font-semibold tracking-wide drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">Jeu implémenté par Jacques ERASE</p>
 </div>
 </div>
)
}

const HistoRow: React.FC<{ h: EntreeHistorique }> = ({ h }) => {
 const date = new Date(h.date).toLocaleDateString('fr-FR', {
 day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
 })
 return (
 <div className="flex items-center justify-between px-4 py-2.5 bg-white/3">
 <div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-semibold text-white/80">{h.vainqueur}</span>
 {h.charlesBezigue && <span className="text-amber-400 text-xs">⭐</span>}
 <span className="text-white/30 text-xs">gagne</span>
 </div>
 <span className="text-white/30 text-[10px]">{h.nomJ0} {h.scoreJ0} – {h.scoreJ1} {h.nomJ1}</span>
 </div>
 <span className="text-white/25 text-[10px]">{date}</span>
 </div>
)
}

const Btn: React.FC<{
 onClick: () => void; icone: string; label: string
 variante: 'principal' | 'secondaire' | 'ghost'; badge?: string; className?: string
}> = ({ onClick, icone, label, variante, badge, className = '' }) => {
 const cls = {
 principal: 'bg-amber-500 hover:bg-amber-400 text-[#0a1628] font-bold shadow-lg shadow-amber-500/30',
 secondaire: 'bg-blue-600/80 hover:bg-blue-500 text-white font-semibold border border-blue-500/30',
 ghost: 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10',
 }[variante]
 return (
 <button onClick={onClick} className={`flex items-center gap-3 px-6 py-4 rounded-xl transition-all cursor-pointer ${cls} ${className}`}>
 <span className="text-xl shrink-0">{icone}</span>
 <span className="text-base">{label}</span>
 {badge && <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">{badge}</span>}
 </button>
)
}
