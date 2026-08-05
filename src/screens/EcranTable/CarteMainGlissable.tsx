// ============================================================
// COMPOSANT — carte de la main du joueur, réorganisable par glisser-déposer
// ============================================================
//
// Deux comportements selon le contexte (cf. useEcranMobile) :
//   - desktop (souris) : glisser-déposer immédiat, comme avant — un clic
//     et un début de glissé se distinguent déjà bien à la souris ;
//   - mobile (tactile + écran étroit) : le glisser-déposer n'est armé
//     qu'après un appui maintenu, pour ne jamais interférer avec un tap
//     qui sélectionne/joue la carte.

import React from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import type { Carte } from '../../types'
import { CarteComponent } from '../../components/ui/Carte'
import { useLongPress } from '../../hooks/useLongPress'

interface CarteMainGlissableProps {
 carte: Carte
 etat: 'faceUp' | 'selected' | 'disabled'
 taille: 'sm' | 'md'
 ecranMobile: boolean
 onClick?: (carte: Carte) => void
 onDoubleClick?: (carte: Carte) => void
}

export const CarteMainGlissable: React.FC<CarteMainGlissableProps> = ({
 carte, etat, taille, ecranMobile, onClick, onDoubleClick,
}) => {
 const controls = useDragControls()
 const longPress = useLongPress(
 (e) => controls.start(e),
 { seuilMs: 300, toleranceDeplacementPx: 8 }
)

 const proprietesGlissement = ecranMobile
 ? {
 dragListener: false,
 dragControls: controls,
 onPointerDown: longPress.onPointerDown,
 onPointerMove: longPress.onPointerMove,
 onPointerUp: longPress.onPointerUp,
 onPointerLeave: longPress.onPointerLeave,
 onPointerCancel: longPress.onPointerCancel,
 }
 : {}

 return (
 <Reorder.Item
 value={carte.id}
 as="div"
 className={`shrink-0 cursor-grab active:cursor-grabbing ${
 ecranMobile && longPress.arme ? 'ring-2 ring-amber-400/70 rounded-lg' : ''
 }`}
 whileDrag={{ scale: 1.08, zIndex: 10 }}
 {...proprietesGlissement}
 >
 <CarteComponent
 carte={{ ...carte, faceUp: true, etat }}
 taille={taille}
 onClick={onClick}
 onDoubleClick={onDoubleClick}
 />
 </Reorder.Item>
)
}
