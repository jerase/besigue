// ============================================================
// ÉCRAN 06 — RÈGLES DU JEU
// ============================================================

import React, { useState } from 'react'

interface ReglesProps {
 onRetour: () => void
}

type Section = 'presentation' | 'combinaisons' | 'deroulement'

export const EcranRegles: React.FC<ReglesProps> = ({ onRetour }) => {
 const [section, setSection] = useState<Section>('presentation')

 return (
 <div className="min-h-screen bg-[#0a1628] flex flex-col">
 {/* En-tête */}
 <div className="bg-[#0d1f3c] border-b border-white/10 px-6 py-4 flex items-center gap-4">
 <button
 onClick={onRetour}
 className="text-white/40 hover:text-white/70 text-sm transition-colors cursor-pointer"
 >
 ← Retour
 </button>
 <h1 className="text-xl font-bold text-amber-300" style={{ fontFamily: 'Georgia, serif' }}>
 Règles du Bésigue
 </h1>
 </div>

 {/* Navigation sections */}
 <div className="flex gap-1 p-3 bg-[#0d1f3c]/50 border-b border-white/10 overflow-x-auto">
 {([
 ['presentation', '📜 Présentation'],
 ['combinaisons', '🃏 Combinaisons'],
 ['deroulement', '🎮 Déroulement'],
 ] as [Section, string][]).map(([id, label]) => (
 <button key={id} onClick={() => setSection(id)}
 className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all cursor-pointer ${
 section === id
 ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
 : 'text-white/40 hover:text-white/60 hover:bg-white/5'
 }`}>
 {label}
 </button>
))}
 </div>

 {/* Contenu */}
 <div className="flex-1 overflow-y-auto px-6 py-6 max-w-2xl mx-auto w-full">
 {section === 'presentation' && <SectionPresentation />}
 {section === 'combinaisons' && <SectionCombinaisons />}
 {section === 'deroulement' && <SectionDeroulement />}
 </div>
 </div>
)
}

// ── Présentation ──────────────────────────────────────────────

const SectionPresentation: React.FC = () => (
 <div className="space-y-6 text-sm text-white/70 leading-relaxed">
 <TitreSection>Le Bésigue</TitreSection>
 <p>
 Le Bésigue est un jeu de cartes français classique pour 2 joueurs,
 joué avec <strong className="text-white/90">4 jeux de 32 cartes + 4 jokers</strong> soit <strong className="text-white/90">132 cartes</strong> au total.
 </p>
 <p>
 L'objectif est d'atteindre <strong className="text-white/90">1 000 points</strong> en remportant des plis
 et en annonçant des combinaisons de cartes.
 </p>

 <TitreSection>L'atout</TitreSection>
 <p>
 Il n'y a <strong className="text-white/90">pas d'atout au départ</strong>. La couleur d'atout est définie
 par le premier joueur qui pose un <em>mariage</em> (Roi + Dame de même couleur).
 Ce mariage s'appelle le <strong className="text-amber-300">mariage_Atout</strong> et vaut 40 points.
 </p>

 <TitreSection>Victoire</TitreSection>
 <p>
 Le premier joueur à atteindre <strong className="text-white/90">1 000 points</strong> remporte la manche.
 Si son adversaire n'a pas encore <strong className="text-white/90">750 points</strong>, la victoire est <em>en bas de table</em> et compte double.
 </p>
 <p className="text-amber-300/70 italic">
 Le vainqueur est alors salué comme <strong>Charles Bézigue</strong> !
 </p>
 </div>
)

// ── Combinaisons ──────────────────────────────────────────────

const SectionCombinaisons: React.FC = () => (
 <div className="space-y-4">
 <TitreSection>Tableau des combinaisons</TitreSection>
 <div className="overflow-x-auto">
 <table className="w-full text-sm border-collapse">
 <thead>
 <tr className="border-b border-white/20">
 <th className="text-left py-2 pr-4 text-white/40 font-medium text-xs uppercase tracking-widest">Combinaison</th>
 <th className="text-left py-2 pr-4 text-white/40 font-medium text-xs uppercase tracking-widest">Composition</th>
 <th className="text-right py-2 text-white/40 font-medium text-xs uppercase tracking-widest">Points</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 text-white/70">
 <LigneCombi nom="Mariage atout" compo="Roi + Dame de la couleur d'atout" pts={40} />
 <LigneCombi nom="Mariage hors atout" compo="Roi + Dame d'une autre couleur" pts={20} />
 <LigneCombi nom="Quinte" compo="As + 10 + Valet de la couleur d'atout" pts={250} accent />
 <LigneCombi nom="Sept d'atout" compo="7 de la couleur d'atout" pts={10} />
 <LigneCombi nom="Bésigue (1er)" compo="Dame ♠ + Valet ♦ (1re fois)" pts={100} accent />
 <LigneCombi nom="Bésigue (suivants)" compo="Dame ♠ + Valet ♦" pts={40} />
 <LigneCombi nom="4 As atout" compo="4 As de la couleur d'atout" pts={200} accent />
 <LigneCombi nom="4 Rois atout" compo="4 Rois de la couleur d'atout" pts={160} />
 <LigneCombi nom="4 Dames atout" compo="4 Dames de la couleur d'atout" pts={120} />
 <LigneCombi nom="4 Valets atout" compo="4 Valets de la couleur d'atout" pts={80} />
 <LigneCombi nom="4 As" compo="4 As (couleurs mélangées, Joker OK)" pts={100} />
 <LigneCombi nom="4 Rois" compo="4 Rois (couleurs mélangées, Joker OK)" pts={80} />
 <LigneCombi nom="4 Dames" compo="4 Dames (couleurs mélangées, Joker OK)" pts={60} />
 <LigneCombi nom="4 Valets" compo="4 Valets (couleurs mélangées, Joker OK)" pts={40} />
 </tbody>
 </table>
 </div>

 <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-4 text-xs text-white/50 space-y-1.5">
 <p>• 1 seule annonce par pli remporté.</p>
 <p>• Une carte déjà utilisée dans une combinaison ne peut pas reformer la même combinaison.</p>
 <p>• Les Jokers remplacent n'importe quelle carte dans les carrés normaux (pas les carrés d'atout).</p>
 </div>
 </div>
)

// ── Déroulement ───────────────────────────────────────────────

const SectionDeroulement: React.FC = () => (
 <div className="space-y-6 text-sm text-white/70 leading-relaxed">
 <TitreSection>Un tour en phase libre</TitreSection>
 <ol className="space-y-3 list-none">
 {[
 ['1', 'Le joueur actif joue une carte de sa main (double-clic pour jouer).'],
 ['2', 'L\'adversaire joue une carte de sa main.'],
 ['3', 'Le vainqueur du pli est déterminé selon les règles de l\'atout.'],
 ['4', 'Le vainqueur peut annoncer une combinaison s\'il en possède une.'],
 ['5', 'Le vainqueur pioche, puis l\'adversaire pioche.'],
 ['6', 'Le vainqueur du pli prend la main.'],
 ].map(([n, txt]) => (
 <li key={n} className="flex gap-3">
 <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs flex items-center justify-center font-bold">
 {n}
 </span>
 <span>{txt}</span>
 </li>
))}
 </ol>

 <TitreSection>Phase finale</TitreSection>
 <p>
 Quand la pioche est épuisée, la <strong className="text-red-400">phase finale</strong> commence.
 Les joueurs sont désormais <strong className="text-white/90">obligés de fournir la couleur</strong> demandée,
 ou de couper à l'atout. Plus aucune combinaison ne peut être annoncée.
 </p>
 <p>
 Le vainqueur du dernier pli reçoit un bonus de <strong className="text-white/90">+10 points</strong>.
 </p>

 <TitreSection>Brisques (fin de manche)</TitreSection>
 <p>
 À la fin, chaque joueur compte ses <em>brisques</em> (As et 10 dans sa pile de plis remportés).
 Il y en a <strong className="text-white/90">32 en tout</strong>.
 </p>
 <p>
 Celui qui en a le plus marque <strong className="text-white/90">brisques × 10 pts</strong>.
 L'autre perd <strong className="text-white/90">200 pts</strong>. En cas d'égalité, chacun gagne <strong className="text-white/90">+160 pts</strong>.
 (Ces règles ne s'appliquent que si le joueur a déjà atteint 200 pts.)
 </p>
 </div>
)

// ── Composants utilitaires ────────────────────────────────────

const TitreSection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
 <h2 className="text-base font-bold text-amber-300 border-b border-amber-400/20 pb-2" style={{ fontFamily: 'Georgia, serif' }}>
 {children}
 </h2>
)

const LigneCombi: React.FC<{
 nom: string; compo: string; pts: number; accent?: boolean
}> = ({ nom, compo, pts, accent }) => (
 <tr className={accent ? 'bg-amber-500/5' : ''}>
 <td className={`py-2.5 pr-4 font-medium ${accent ? 'text-amber-300' : 'text-white/80'}`}>{nom}</td>
 <td className="py-2.5 pr-4 text-white/50">{compo}</td>
 <td className={`py-2.5 text-right font-bold tabular-nums ${accent ? 'text-amber-400' : 'text-white/70'}`}>{pts}</td>
 </tr>
)

export default EcranRegles
