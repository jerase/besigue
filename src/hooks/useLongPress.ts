// ============================================================
// HOOK useLongPress
// ============================================================
//
// Détecte un appui maintenu (long-press) sur un élément, sans interférer
// avec un tap normal (clic / sélection de carte) ni avec un défilement
// tactile (swipe horizontal de la main sur mobile — cf. useEcranMobile).
//
// Principe :
//   - au pointerdown, on arme un minuteur de `seuilMs`
//   - si le pointeur bouge de plus de `toleranceDeplacementPx` avant
//     l'expiration du minuteur (= l'utilisateur fait défiler / glisse),
//     le minuteur est annulé : ce n'est pas un appui long
//   - si le pointeur est relâché avant l'expiration (= simple tap), le
//     minuteur est annulé également : `onDeclenche` n'est jamais appelé
//   - si le minuteur arrive à expiration sans mouvement ni relâchement,
//     `onDeclenche` est appelé une seule fois avec l'événement d'origine
//
// `arme` reflète l'état courant (utile pour un retour visuel — halo,
// léger agrandissement — signalant que le glisser-déposer est prêt).
// ============================================================

import { useCallback, useRef, useState } from 'react'

export interface OptionsLongPress {
 seuilMs?: number
 toleranceDeplacementPx?: number
}

export interface HandlersLongPress {
 onPointerDown: (e: React.PointerEvent) => void
 onPointerMove: (e: React.PointerEvent) => void
 onPointerUp: () => void
 onPointerLeave: () => void
 onPointerCancel: () => void
 arme: boolean
}

const SEUIL_MS_DEFAUT = 300
const TOLERANCE_DEPLACEMENT_PX_DEFAUT = 8

export function useLongPress(
 onDeclenche: (e: React.PointerEvent) => void,
 options: OptionsLongPress = {}
): HandlersLongPress {
 const seuilMs = options.seuilMs ?? SEUIL_MS_DEFAUT
 const toleranceDeplacementPx = options.toleranceDeplacementPx ?? TOLERANCE_DEPLACEMENT_PX_DEFAUT

 const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
 const origineRef = useRef<{ x: number; y: number } | null>(null)
 const [arme, setArme] = useState(false)

 const annuler = useCallback(() => {
 if (timerRef.current !== null) {
 clearTimeout(timerRef.current)
 timerRef.current = null
 }
 origineRef.current = null
 setArme(false)
 }, [])

 const onPointerDown = useCallback((e: React.PointerEvent) => {
 annuler()
 origineRef.current = { x: e.clientX, y: e.clientY }
 timerRef.current = setTimeout(() => {
 timerRef.current = null
 setArme(true)
 onDeclenche(e)
 }, seuilMs)
 }, [annuler, onDeclenche, seuilMs])

 const onPointerMove = useCallback((e: React.PointerEvent) => {
 if (!origineRef.current) return
 const dx = e.clientX - origineRef.current.x
 const dy = e.clientY - origineRef.current.y
 if (Math.hypot(dx, dy) > toleranceDeplacementPx) {
 annuler()
 }
 }, [annuler, toleranceDeplacementPx])

 return {
 onPointerDown,
 onPointerMove,
 onPointerUp: annuler,
 onPointerLeave: annuler,
 onPointerCancel: annuler,
 arme,
 }
}
