// ============================================================
// COMPOSANT CARTE
// Cartes SVG David Bellot via sprite /svg-cards.svg
// viewBox carte Bellot : 169.075 × 244.640
// ============================================================

import React from 'react'
import type { Carte } from '../../types'
import { NOM_COULEUR, NOM_RANG, SYMBOLE_COULEUR } from '../../types'

interface CarteProps {
 carte: Carte
 onClick?: (carte: Carte) => void
 onDoubleClick?: (carte: Carte) => void
 taille?: 'sm' | 'md' | 'lg'
 className?: string
}

// Dimensions affichage (width × height en px)
const TAILLE_MAP = {
 sm: { w: 52, h: 75 },
 md: { w: 80, h: 116 },
 lg: { w: 110, h: 160 },
}

// Couleur Bellot : hearts, diamonds, clubs, spades
const SUIT_BELLOT: Record<string, string> = {
 hearts: 'heart', diamonds: 'diamond', clubs: 'club', spades: 'spade',
}

// Rang Bellot : 1 (as), 2-10, jack, queen, king
const RANK_BELLOT: Record<string, string> = {
 'A': '1', '10': '10', 'K': 'king', 'Q': 'queen', 'J': 'jack',
 '9': '9', '8': '8', '7': '7',
}

// ID Bellot complet : ex. "heart_king", "spade_1", "diamond_10"
function bellotId(carte: Carte): string {
 if (carte.estJoker) {
 // joker_red pour coeurs/carreaux, joker_black pour piques/trèfles
 return (carte.couleur === 'hearts' || carte.couleur === 'diamonds')
 ? 'joker_red' : 'joker_black'
 }
 const suit = SUIT_BELLOT[carte.couleur]
 const rank = RANK_BELLOT[carte.rang]
 return `${suit}_${rank}`
}

// Le sprite David Bellot a un viewBox global de 169.075 × 244.640
// Chaque carte est positionnée via transform dans ce SVG
// On utilise <use href="/svg-cards.svg#id"> dans un <svg> wrapper
const VB_W = 169.075
const VB_H = 244.640

// ─── Dos de carte personnalisé (indépendant du sprite Bellot) ───────────────
// Image fournie par l'utilisateur, centrée sur un cadre aux couleurs du drapeau haïtien
const DOS_IMAGE = '/dos-haiti.png'
const DOS_IMAGE_W = 265
const DOS_IMAGE_H = 259
const DOS_IMG_TARGET_W = 120
const DOS_IMG_TARGET_H = DOS_IMG_TARGET_W * (DOS_IMAGE_H / DOS_IMAGE_W)
const DOS_IMG_X = (VB_W - DOS_IMG_TARGET_W) / 2
const DOS_IMG_Y = VB_H / 2 - DOS_IMG_TARGET_H / 2

const CarteDosPersonnalise: React.FC = () => (
 <>
 <defs>
 <clipPath id="carteDosClip">
 <rect x="2" y="2" width={VB_W - 4} height={VB_H - 4} rx="10" ry="10" />
 </clipPath>
 </defs>
 <rect x="0" y="0" width={VB_W} height={VB_H} rx="12" ry="12" fill="#0b1c4a" />
 <g clipPath="url(#carteDosClip)">
 <rect x="0" y="0" width={VB_W} height={VB_H / 2} fill="#00209F" />
 <rect x="0" y={VB_H / 2} width={VB_W} height={VB_H / 2} fill="#D21034" />
 <rect
 x={DOS_IMG_X - 10}
 y={DOS_IMG_Y - 10}
 width={DOS_IMG_TARGET_W + 20}
 height={DOS_IMG_TARGET_H + 20}
 rx="10"
 fill="#ffffff"
 opacity="0.95"
 />
 <image
 href={DOS_IMAGE}
 x={DOS_IMG_X}
 y={DOS_IMG_Y}
 width={DOS_IMG_TARGET_W}
 height={DOS_IMG_TARGET_H}
 preserveAspectRatio="xMidYMid meet"
 />
 <rect
 x="10"
 y="10"
 width={VB_W - 20}
 height={VB_H - 20}
 rx="6"
 fill="none"
 stroke="#F1C40F"
 strokeWidth="1.5"
 />
 </g>
 <rect
 x="2"
 y="2"
 width={VB_W - 4}
 height={VB_H - 4}
 rx="10"
 ry="10"
 fill="none"
 stroke="#ffffff"
 strokeWidth="2"
 />
 </>
)

export const CarteComponent: React.FC<CarteProps> = ({
 carte, onClick, onDoubleClick, taille = 'md', className = '',
}) => {
 const dim = TAILLE_MAP[taille]
 const estCliquable = !!onClick || !!onDoubleClick
 const estCachee = carte.etat === 'faceDown' || !carte.faceUp

 const stateClass = [
 carte.etat === 'selected' && 'ring-2 ring-amber-400 ring-offset-1 -translate-y-3 shadow-lg shadow-amber-400/40',
 carte.etat === 'highlighted' && 'ring-2 ring-emerald-400 ring-offset-1 shadow-md shadow-emerald-400/30',
 carte.etat === 'disabled' && 'opacity-40 cursor-not-allowed',
 carte.etat === 'played' && 'shadow-xl scale-105',
 estCliquable && carte.etat !== 'disabled' && 'cursor-pointer hover:-translate-y-2 hover:shadow-lg',
 'transition-all duration-200 select-none inline-block relative',
 className,
 ].filter(Boolean).join(' ')

 const label = carte.estJoker
 ? `Joker ${NOM_COULEUR[carte.couleur]}`
 : estCachee ? 'Carte cachée'
 : `${NOM_RANG[carte.rang]} de ${NOM_COULEUR[carte.couleur]}`

 const go = () => { if (carte.etat !== 'disabled') onClick?.(carte) }
 const dbl = () => { if (carte.etat !== 'disabled') onDoubleClick?.(carte) }

 const cardId = bellotId(carte)

 return (
 <div
 role={estCliquable ? 'button' : 'img'}
 aria-label={label}
 tabIndex={estCliquable && carte.etat !== 'disabled' ? 0 : -1}
 onClick={go} onDoubleClick={dbl}
 onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && go()}
 className={stateClass}
 style={{ width: dim.w, height: dim.h }}
 >
 <svg
 width={dim.w}
 height={dim.h}
 viewBox={`0 0 ${VB_W} ${VB_H}`}
 xmlns="http://www.w3.org/2000/svg"
 xmlnsXlink="http://www.w3.org/1999/xlink"
 aria-hidden="true"
 style={{ display: 'block' }}
 >
 {estCachee
 ? <CarteDosPersonnalise />
 : <use href={`/svg-cards.svg#${cardId}`} x="0" y="0" width="100%" height="100%" />}
 </svg>
 </div>
)
}

export { SYMBOLE_COULEUR }
