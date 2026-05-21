// ============================================================
// COMPOSANT CARTE — IT-1 (v3)
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
  sm: { w: 52,  h: 75  },
  md: { w: 80,  h: 116 },
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

export const CarteComponent: React.FC<CarteProps> = ({
  carte, onClick, onDoubleClick, taille = 'md', className = '',
}) => {
  const dim = TAILLE_MAP[taille]
  const estCliquable = !!onClick || !!onDoubleClick
  const estCachee = carte.etat === 'faceDown' || !carte.faceUp

  const stateClass = [
    carte.etat === 'selected'    && 'ring-2 ring-amber-400 ring-offset-1 -translate-y-3 shadow-lg shadow-amber-400/40',
    carte.etat === 'highlighted' && 'ring-2 ring-emerald-400 ring-offset-1 shadow-md shadow-emerald-400/30',
    carte.etat === 'disabled'    && 'opacity-40 cursor-not-allowed',
    carte.etat === 'played'      && 'shadow-xl scale-105',
    estCliquable && carte.etat !== 'disabled' && 'cursor-pointer hover:-translate-y-2 hover:shadow-lg',
    'transition-all duration-200 select-none inline-block relative',
    className,
  ].filter(Boolean).join(' ')

  const label = carte.estJoker
    ? `Joker ${NOM_COULEUR[carte.couleur]}`
    : estCachee ? 'Carte cachée'
    : `${NOM_RANG[carte.rang]} de ${NOM_COULEUR[carte.couleur]}`

  const go  = () => { if (carte.etat !== 'disabled') onClick?.(carte) }
  const dbl = () => { if (carte.etat !== 'disabled') onDoubleClick?.(carte) }

  const cardId = estCachee ? 'back' : bellotId(carte)

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
        <use href={`/svg-cards.svg#${cardId}`} x="0" y="0" width="100%" height="100%" />
      </svg>
    </div>
  )
}

// ─── Indicateurs couleur pour filtres/brisques dans DeckDisplay ──────────────
export const COULEUR_CSS: Record<string, string> = {
  spades: '#111', clubs: '#111', hearts: '#c0392b', diamonds: '#c0392b',
}
export { SYMBOLE_COULEUR }

export default CarteComponent
