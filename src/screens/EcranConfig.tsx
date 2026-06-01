// ============================================================
// ÉCRAN 02 — CONFIGURATION
// ============================================================

import React, { useState } from 'react'
import type { GameConfig, NiveauIA } from '../types'
import { CONFIG_DEFAUT } from '../types'

interface ConfigProps {
 onCommencer: (config: GameConfig) => void
 onRetour: () => void
}

export const EcranConfig: React.FC<ConfigProps> = ({ onCommencer, onRetour }) => {
 const [nomJoueur1, setNomJoueur1] = useState(CONFIG_DEFAUT.nomJoueur1)
 const [niveauIA, setNiveauIA] = useState<NiveauIA>(CONFIG_DEFAUT.niveauIA)

 const handleCommencer = () => {
 const config: GameConfig = {
 ...CONFIG_DEFAUT,
 nomJoueur1: nomJoueur1.trim() || 'Joueur',
 nomJoueur2: 'IA',
 typeJoueur2: 'ia',
 niveauIA,
 }
 onCommencer(config)
 }

 return (
 <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center px-4">
 <div className="w-full max-w-lg">

 {/* En-tête */}
 <div className="mb-8">
 <button
 onClick={onRetour}
 className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors cursor-pointer mb-6"
 >
 ← Retour
 </button>
 <h1 className="text-3xl font-bold text-amber-300" style={{ fontFamily: 'Georgia, serif' }}>
 Nouvelle partie
 </h1>
 <p className="text-white/40 text-sm mt-1">Configurez votre partie de Bésigue</p>
 </div>

 <div className="space-y-6">

 {/* Nom du joueur */}
 <div className="bg-white/5 border border-white/10 rounded-xl p-5">
 <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-3">
 Votre nom
 </label>
 <input
 type="text"
 value={nomJoueur1}
 onChange={e => setNomJoueur1(e.target.value)}
 maxLength={20}
 placeholder="Joueur"
 className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-amber-400/50 focus:bg-white/15 transition-all text-base"
 />
 </div>

 {/* Adversaire */}
 <div className="bg-white/5 border border-white/10 rounded-xl p-5">
 <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-3">
 Adversaire
 </label>
 <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-lg px-4 py-3">
 <span className="text-2xl">🤖</span>
 <div>
 <div className="text-white font-medium">Intelligence Artificielle</div>
 <div className="text-white/40 text-xs">Mode solo</div>
 </div>
 </div>
 </div>

 {/* Niveau IA */}
 <div className="bg-white/5 border border-white/10 rounded-xl p-5">
 <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-3">
 Niveau de difficulté
 </label>
 <div className="grid grid-cols-3 gap-2">
 {([ 'facile', 'intermediaire', 'difficile' ] as NiveauIA[]).map(niveau => (
 <BoutonNiveau
 key={niveau}
 niveau={niveau}
 actif={niveauIA === niveau}
 onClick={() => setNiveauIA(niveau)}
 />
))}
 </div>
 <p className="mt-3 text-xs text-white/30">
 {niveauIA === 'facile' && 'IA aléatoire — Joue au hasard, idéal pour apprendre.'}
 {niveauIA === 'intermediaire' && 'IA heuristique — Évite de donner des brisques, annonces stratégiques.'}
 {niveauIA === 'difficile' && 'IA stratégique — Mémorise les cartes jouées, anticipe vos coups.'}
 </p>
 </div>

 {/* Paramètres fixes */}
 <div className="bg-white/5 border border-white/10 rounded-xl p-5">
 <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-3">
 Paramètres de la partie
 </label>
 <div className="space-y-2 text-sm">
 <ParamLigne label="Deck" valeur="4 jeux de 32 cartes + 4 jokers (132 cartes)" />
 <ParamLigne label="Cartes distribuées" valeur="9 par joueur" />
 <ParamLigne label="Seuil de victoire" valeur="1 000 points" />
 </div>
 </div>

 {/* Bouton Commencer */}
 <button
 onClick={handleCommencer}
 className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-[#0a1628] font-bold text-lg rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/30 cursor-pointer"
 >
 Commencer la partie
 </button>
 </div>
 </div>
 </div>
)
}

// ── Bouton niveau IA ──────────────────────────────────────────

const LABELS_NIVEAU: Record<NiveauIA, { label: string; emoji: string; couleur: string }> = {
 facile: { label: 'Facile', emoji: '😊', couleur: 'emerald' },
 intermediaire: { label: 'Intermédiaire', emoji: '🧠', couleur: 'blue' },
 difficile: { label: 'Difficile', emoji: '🔥', couleur: 'red' },
}

const BoutonNiveau: React.FC<{
 niveau: NiveauIA; actif: boolean; onClick: () => void
}> = ({ niveau, actif, onClick }) => {
 const { label, emoji } = LABELS_NIVEAU[niveau]
 return (
 <button
 onClick={onClick}
 className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border transition-all duration-200 cursor-pointer ${
 actif
 ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
 : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70'
 }`}
 >
 <span className="text-xl">{emoji}</span>
 <span className="text-xs font-semibold">{label}</span>
 </button>
)
}

const ParamLigne: React.FC<{ label: string; valeur: string }> = ({ label, valeur }) => (
 <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
 <span className="text-white/40">{label}</span>
 <span className="text-white/70 font-medium">{valeur}</span>
 </div>
)

export default EcranConfig
