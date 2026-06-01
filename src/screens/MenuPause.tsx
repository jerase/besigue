// ============================================================
// MENU PAUSE
// ============================================================

import React from 'react'

interface PauseProps {
 onReprendre: () => void
 onRegles: () => void
 onAbandonner: () => void
}

export const MenuPause: React.FC<PauseProps> = ({
 onReprendre,
 onRegles,
 onAbandonner,
}) => {
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
 <div className="bg-[#0d1f3c] border border-white/20 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
 <h2 className="text-2xl font-bold text-amber-300 text-center mb-6" style={{ fontFamily: 'Georgia, serif' }}>
 Pause
 </h2>

 <div className="space-y-3">
 <BoutonPause
 onClick={onReprendre}
 variante="principal"
 label="▶ Reprendre la partie"
 />
 <BoutonPause
 onClick={onRegles}
 variante="ghost"
 label="📖 Règles du jeu"
 />
 <div className="border-t border-white/10 pt-3">
 <BoutonPause
 onClick={onAbandonner}
 variante="danger"
 label="✕ Abandonner la partie"
 />
 </div>
 </div>

 <p className="text-center text-white/20 text-xs mt-6">
 La partie est automatiquement sauvegardée.
 </p>
 </div>
 </div>
)
}

const BoutonPause: React.FC<{
 onClick: () => void
 label: string
 variante: 'principal' | 'ghost' | 'danger'
}> = ({ onClick, label, variante }) => {
 const classes = {
 principal: 'bg-amber-500 hover:bg-amber-400 text-[#0a1628] font-bold',
 ghost: 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10',
 danger: 'bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30',
 }[variante]

 return (
 <button
 onClick={onClick}
 className={`w-full py-3 px-5 rounded-xl text-sm transition-all duration-200 cursor-pointer text-center ${classes}`}
 >
 {label}
 </button>
)
}

export default MenuPause
