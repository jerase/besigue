// ============================================================
// COMPOSANTS — cartes étalées groupées (mariage / bésigue / seule)
// ============================================================

import React from 'react'
import type { Carte, CombinaisonDisponible } from '../../types'
import { CarteComponent } from '../../components/ui/Carte'
import type { GroupeEtalee } from './types'

const TAILLE_PX = { sm: { w: 52, h: 75 }, md: { w: 80, h: 116 } }
// Décalage vertical de la dame par rapport au roi (px)
const OFFSET_Y = { sm: 14, md: 20 }
// Décalage horizontal léger pour que les deux cartes soient visibles
const OFFSET_X = { sm: 8, md: 12 }

// ── Composant paire de mariage superposée ─────────────────────

interface CartesMarieeProps {
 roi: Carte
 dame: Carte
 taille: 'sm' | 'md'
 humainPeutJouer: boolean
 carteSelectionnee: string | null
 combisDisponibles: CombinaisonDisponible[]
 onClick: (carte: Carte) => void
 onDoubleClick: (carte: Carte) => void
}

const CartesMariees: React.FC<CartesMarieeProps> = ({
 roi, dame, taille, humainPeutJouer,
 carteSelectionnee, combisDisponibles, onClick, onDoubleClick,
}) => {
 const { w, h } = TAILLE_PX[taille]
 const offY = OFFSET_Y[taille]
 const offX = OFFSET_X[taille]
 // La zone englobante doit contenir les deux cartes décalées
 const totalW = w + offX
 const totalH = h + offY

 const etatCarte = (carte: Carte) => {
 if (!humainPeutJouer) return 'disabled' as const
 if (carteSelectionnee === carte.id) return 'selected' as const
 if (combisDisponibles.some(c => c.cartesIds.includes(carte.id))) return 'highlighted' as const
 return 'faceUp' as const
 }

 return (
 <div
 className="relative flex-shrink-0"
 style={{ width: totalW, height: totalH }}
 title="Mariage (Roi + Dame)"
 >
 {/* Roi — en dessous, décalé en haut à gauche */}
 <div className="absolute" style={{ top: 0, left: 0, zIndex: 1 }}>
 <CarteComponent
 carte={{ ...roi, faceUp: true, etat: etatCarte(roi) }}
 taille={taille}
 onClick={humainPeutJouer ? onClick : undefined}
 onDoubleClick={humainPeutJouer ? onDoubleClick : undefined}
 />
 </div>
 {/* Dame — au-dessus, décalée en bas à droite */}
 <div className="absolute" style={{ top: offY, left: offX, zIndex: 2 }}>
 <CarteComponent
 carte={{ ...dame, faceUp: true, etat: etatCarte(dame) }}
 taille={taille}
 onClick={humainPeutJouer ? onClick : undefined}
 onDoubleClick={humainPeutJouer ? onDoubleClick : undefined}
 />
 </div>
 </div>
)
}

// ── Composant bésigue superposé (valet♦ sur dame♠) ───────────

interface CartesBesigueProps {
 dame: Carte
 valet: Carte
 taille: 'sm' | 'md'
 humainPeutJouer: boolean
 carteSelectionnee: string | null
 combisDisponibles: CombinaisonDisponible[]
 onClick: (carte: Carte) => void
 onDoubleClick: (carte: Carte) => void
}

const CartesBesigue: React.FC<CartesBesigueProps> = ({
 dame, valet, taille, humainPeutJouer,
 carteSelectionnee, combisDisponibles, onClick, onDoubleClick,
}) => {
 const { w, h } = TAILLE_PX[taille]
 const offY = OFFSET_Y[taille]
 const offX = OFFSET_X[taille]
 const totalW = w + offX
 const totalH = h + offY

 const etatCarte = (carte: Carte) => {
 if (!humainPeutJouer) return 'disabled' as const
 if (carteSelectionnee === carte.id) return 'selected' as const
 if (combisDisponibles.some(c => c.cartesIds.includes(carte.id))) return 'highlighted' as const
 return 'faceUp' as const
 }

 return (
 <div
 className="relative flex-shrink-0"
 style={{ width: totalW, height: totalH }}
 title="Bésigue (Dame\u2660 + Valet\u2666)"
 >
 {/* Dame♠ — en dessous */}
 <div className="absolute" style={{ top: 0, left: 0, zIndex: 1 }}>
 <CarteComponent
 carte={{ ...dame, faceUp: true, etat: etatCarte(dame) }}
 taille={taille}
 onClick={humainPeutJouer ? onClick : undefined}
 onDoubleClick={humainPeutJouer ? onDoubleClick : undefined}
 />
 </div>
 {/* Valet♦ — au-dessus, décalé */}
 <div className="absolute" style={{ top: offY, left: offX, zIndex: 2 }}>
 <CarteComponent
 carte={{ ...valet, faceUp: true, etat: etatCarte(valet) }}
 taille={taille}
 onClick={humainPeutJouer ? onClick : undefined}
 onDoubleClick={humainPeutJouer ? onDoubleClick : undefined}
 />
 </div>
 </div>
)
}

// ── Rendu d'un groupe étalé (factorisation mariage / bésigue / seule) ──

interface RenduGroupeProps {
 groupe: GroupeEtalee
 taille: 'sm' | 'md'
 humainPeutJouer: boolean
 carteSelectionnee: string | null
 combisDisponibles: CombinaisonDisponible[]
 onClick: (carte: Carte) => void
 onDoubleClick: (carte: Carte) => void
}

export const RenduGroupe: React.FC<RenduGroupeProps> = ({
 groupe, taille, humainPeutJouer,
 carteSelectionnee, combisDisponibles, onClick, onDoubleClick,
}) => {
 const sharedProps = { taille, humainPeutJouer, carteSelectionnee, combisDisponibles, onClick, onDoubleClick }

 if (groupe.type === 'mariage') {
 return <CartesMariees roi={groupe.roi} dame={groupe.dame} {...sharedProps} />
 }
 if (groupe.type === 'besigue') {
 return <CartesBesigue dame={groupe.dame} valet={groupe.valet} {...sharedProps} />
 }

 const carte = groupe.carte
 const estSelectionnee = carteSelectionnee === carte.id
 const dansCombi = combisDisponibles.some(c => c.cartesIds.includes(carte.id))
 const etat = !humainPeutJouer
 ? 'disabled' as const
 : estSelectionnee ? 'selected' as const
 : dansCombi ? 'highlighted' as const
 : 'faceUp' as const
 return (
 <CarteComponent
 carte={{ ...carte, faceUp: true, etat }}
 taille={taille}
 onClick={humainPeutJouer ? onClick : undefined}
 onDoubleClick={humainPeutJouer ? onDoubleClick : undefined}
 />
)
}
