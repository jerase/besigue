import React, { useState } from 'react'

interface TutorielProps { onTerminer: () => void }
interface Etape { titre: string; emoji: string; contenu: React.ReactNode }

const RegleJoker: React.FC<{ regle: string; texte: string }> = ({ regle, texte }) => (
 <div className="flex gap-2 bg-white/5 rounded-lg px-3 py-2">
 <span className="text-amber-400 text-xs font-bold shrink-0">Règle {regle}</span>
 <span className="text-white/60 text-xs">{texte}</span>
 </div>
)

const ETAPES: Etape[] = [
 { titre: 'Bienvenue au Bésigue', emoji: '🂡', contenu: (
 <div className="space-y-3 text-sm text-white/70">
 <p>Le Bésigue est un jeu de cartes classique français pour <strong className="text-white/90">2 joueurs</strong>.</p>
 <p>Le jeu utilise <strong className="text-white/90">4 jeux de 32 cartes + 4 jokers = 132 cartes</strong>.</p>
 <p>But : atteindre <strong className="text-amber-300">1 000 points</strong> en remportant des plis et en annonçant des combinaisons.</p>
 </div>
)},
 { titre: 'La distribution', emoji: '🃏', contenu: (
 <div className="space-y-3 text-sm text-white/70">
 <p>Chaque joueur reçoit <strong className="text-white/90">9 cartes</strong>. Le reste forme la <strong className="text-white/90">pioche</strong>.</p>
 <div className="bg-amber-500/10 border border-amber-400/20 rounded-lg p-3">
 <p className="text-amber-300 text-xs font-bold mb-1">Ordre des rangs</p>
 <p className="text-white/60 text-xs font-mono">As &gt; 10 &gt; Roi &gt; Dame &gt; Valet &gt; 9 &gt; 8 &gt; 7</p>
 </div>
 </div>
)},
 { titre: "L'atout et le mariage", emoji: '♥', contenu: (
 <div className="space-y-3 text-sm text-white/70">
 <p>Pas d'atout au départ. La couleur d'atout est définie par le premier <strong className="text-amber-300">Mariage Atout</strong> (Roi + Dame) : <strong className="text-white/90">+40 pts</strong>.</p>
 <p>Tant qu'aucun mariage d'atout n'est posé, <strong className="text-white/90">aucune combinaison ne peut être annoncée</strong>.</p>
 <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3">
 <p className="text-blue-300 text-xs">Mariage hors-atout : <strong>+20 pts</strong></p>
 </div>
 </div>
)},
 { titre: 'Les Jokers', emoji: '★', contenu: (
 <div className="space-y-3 text-sm text-white/70">
 <p>4 Jokers dans le jeu. Leur résultat dépend de <strong className="text-white/90">qui joue en premier</strong> :</p>
 <div className="space-y-2">
 <RegleJoker regle="1" texte="Joker joué en second → l'ouvreur gagne toujours" />
 <RegleJoker regle="2a" texte="Joker ouvreur + atout en réponse → l'atout gagne" />
 <RegleJoker regle="2b" texte="Joker ouvreur + non-atout → le Joker gagne" />
 </div>
 </div>
)},
 { titre: 'Un tour de jeu', emoji: '🔄', contenu: (
 <div className="space-y-2 text-sm text-white/70">
 {[['1','Jouez une carte (clic = sélectionner, double-clic = jouer)'],
 ['2',"L'IA joue sa carte"],
 ['3','Le vainqueur du pli est déterminé'],
 ['4','Si vous gagnez : annoncez une combinaison (optionnel)'],
 ['5','Pioche (vainqueur en premier)'],
 ['6','Nouveau tour']
 ].map(([n,t]) => (
 <div key={n} className="flex gap-3">
 <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs flex items-center justify-center shrink-0 font-bold">{n}</span>
 <span className="text-xs leading-relaxed">{t}</span>
 </div>
))}
 </div>
)},
 { titre: 'Les combinaisons', emoji: '🎴', contenu: (
 <div className="space-y-2 text-sm">
 <p className="text-white/60 text-xs mb-2">Une seule annonce par pli remporté :</p>
 {[['Mariage Atout','40 pts','Roi + Dame de la couleur d\'atout'],
 ['Bésigue','100 pts','Dame ♠ + Valet ♦'],
 ['Quinte','250 pts','As + 10 + Valet d\'atout'],
 ['4 As d\'atout','200 pts','4 As de la couleur d\'atout'],
 ['4 As','100 pts','4 As (Joker autorisé)'],
 ].map(([nom,pts,desc]) => (
 <div key={nom} className="flex items-start gap-2 bg-white/5 rounded-lg px-3 py-2">
 <span className="text-amber-300 text-xs font-bold w-28 shrink-0">{nom}</span>
 <span className="text-emerald-400 text-xs font-bold w-16 shrink-0">{pts}</span>
 <span className="text-white/50 text-xs">{desc}</span>
 </div>
))}
 </div>
)},
 { titre: 'Phase finale & victoire', emoji: '⚡', contenu: (
 <div className="space-y-3 text-sm text-white/70">
 <p>Quand la pioche est épuisée → <strong className="text-red-300">phase finale</strong> : obligation de fournir la couleur.</p>
 <p>Le vainqueur du <strong className="text-white/90">dernier pli</strong> reçoit <strong className="text-amber-300">+10 pts</strong>.</p>
 <p>Les <strong className="text-white/90">brisques</strong> (As + 10 dans vos plis) sont comptées en fin de manche.</p>
 <div className="bg-amber-500/10 border border-amber-400/20 rounded-lg p-3">
 <p className="text-amber-300 text-xs font-bold">⭐ Charles Bézigue</p>
 <p className="text-xs text-white/60 mt-1">Si votre adversaire a moins de 750 pts quand vous atteignez 1000 → victoire en bas de table !</p>
 </div>
 </div>
)},
 { titre: 'Prêt à jouer !', emoji: '🏆', contenu: (
 <div className="space-y-4 text-sm text-white/70">
 <div className="bg-amber-500/10 border border-amber-400/20 rounded-xl p-4 space-y-2">
 <p className="text-amber-300 font-bold">Conseils :</p>
 <p className="text-xs">• Commencez en niveau <strong className="text-white/80">Facile</strong></p>
 <p className="text-xs">• Posez le mariage_Atout dès que possible</p>
 <p className="text-xs">• Les cartes étalées restent jouables dans un pli !</p>
 <p className="text-xs">• Le 7 d'atout donne +10 pts quand vous le jouez</p>
 </div>
 <p className="text-center text-amber-300/70 italic">Bonne chance ! ⭐</p>
 </div>
)},
]

export const EcranTutoriel: React.FC<TutorielProps> = ({ onTerminer }) => {
 const [idx, setIdx] = useState(0)
 const etape = ETAPES[idx]
 const derniere = idx === ETAPES.length - 1

 return (
 <div className="min-h-screen bg-[#0a1628] flex flex-col">
 <div className="bg-[#0d1f3c] border-b border-white/10 px-6 py-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <span className="text-2xl">{etape.emoji}</span>
 <div>
 <h1 className="text-base font-bold text-amber-300" style={{ fontFamily: 'Georgia, serif' }}>{etape.titre}</h1>
 <p className="text-xs text-white/30">Étape {idx + 1} / {ETAPES.length}</p>
 </div>
 </div>
 <button onClick={onTerminer} className="text-white/30 hover:text-white/60 text-sm cursor-pointer">Passer ✕</button>
 </div>
 <div className="h-1 bg-white/10">
 <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${((idx + 1) / ETAPES.length) * 100}%` }} />
 </div>
 <div className="flex-1 px-6 py-8 max-w-lg mx-auto w-full">{etape.contenu}</div>
 <div className="px-6 pb-8 max-w-lg mx-auto w-full">
 <div className="flex gap-3">
 {idx > 0 && (
 <button onClick={() => setIdx(i => i - 1)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl border border-white/10 cursor-pointer">← Précédent</button>
)}
 <button onClick={derniere ? onTerminer : () => setIdx(i => i + 1)} className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-[#0a1628] font-bold rounded-xl cursor-pointer shadow-lg shadow-amber-500/30">
 {derniere ? '🎮 Jouer !' : 'Suivant →'}
 </button>
 </div>
 <div className="flex justify-center gap-1.5 mt-4">
 {ETAPES.map((_, i) => (
 <button key={i} onClick={() => setIdx(i)} className={`h-2 rounded-full transition-all cursor-pointer ${i === idx ? 'bg-amber-400 w-4' : i < idx ? 'bg-amber-400/40 w-2' : 'bg-white/20 w-2'}`} />
))}
 </div>
 </div>
 </div>
)
}
