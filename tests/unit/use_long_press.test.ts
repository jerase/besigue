// ============================================================
// TESTS — useLongPress
// ============================================================
//
// Vérifie la mécanique d'appui maintenu utilisée pour armer le
// glisser-déposer sur mobile (Point C) sans interférer avec :
//   - un tap normal (sélection/jeu d'une carte)
//   - un défilement tactile horizontal de la main (Point A)
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useLongPress } from '../../src/hooks/useLongPress'

function evt(x: number, y: number): ReactPointerEvent {
 return { clientX: x, clientY: y } as ReactPointerEvent
}

describe('useLongPress', () => {
 beforeEach(() => {
 vi.useFakeTimers()
 })
 afterEach(() => {
 vi.useRealTimers()
 })

 it('déclenche onDeclenche une fois le seuil atteint, pointeur immobile', () => {
 const onDeclenche = vi.fn()
 const { result } = renderHook(() => useLongPress(onDeclenche, { seuilMs: 300 }))

 act(() => result.current.onPointerDown(evt(10, 10)))
 expect(onDeclenche).not.toHaveBeenCalled()

 act(() => { vi.advanceTimersByTime(299) })
 expect(onDeclenche).not.toHaveBeenCalled()

 act(() => { vi.advanceTimersByTime(1) })
 expect(onDeclenche).toHaveBeenCalledTimes(1)
 })

 it('ne déclenche rien si le pointeur est relâché avant le seuil (tap normal)', () => {
 const onDeclenche = vi.fn()
 const { result } = renderHook(() => useLongPress(onDeclenche, { seuilMs: 300 }))

 act(() => result.current.onPointerDown(evt(10, 10)))
 act(() => { vi.advanceTimersByTime(150) })
 act(() => result.current.onPointerUp())
 act(() => { vi.advanceTimersByTime(1000) })

 expect(onDeclenche).not.toHaveBeenCalled()
 })

 it('ne déclenche rien si le pointeur se déplace au-delà de la tolérance (swipe/scroll)', () => {
 const onDeclenche = vi.fn()
 const { result } = renderHook(() =>
 useLongPress(onDeclenche, { seuilMs: 300, toleranceDeplacementPx: 8 })
 )

 act(() => result.current.onPointerDown(evt(10, 10)))
 act(() => result.current.onPointerMove(evt(30, 10))) // 20px > 8px
 act(() => { vi.advanceTimersByTime(1000) })

 expect(onDeclenche).not.toHaveBeenCalled()
 })

 it('tolère un micro-mouvement sous le seuil de tolérance (tremblement du doigt)', () => {
 const onDeclenche = vi.fn()
 const { result } = renderHook(() =>
 useLongPress(onDeclenche, { seuilMs: 300, toleranceDeplacementPx: 8 })
 )

 act(() => result.current.onPointerDown(evt(10, 10)))
 act(() => result.current.onPointerMove(evt(12, 11))) // ≈ 2.2px < 8px
 act(() => { vi.advanceTimersByTime(300) })

 expect(onDeclenche).toHaveBeenCalledTimes(1)
 })

 it('« arme » passe à true seulement au moment du déclenchement, pas avant', () => {
 const { result } = renderHook(() => useLongPress(() => {}, { seuilMs: 300 }))

 expect(result.current.arme).toBe(false)
 act(() => result.current.onPointerDown(evt(0, 0)))
 expect(result.current.arme).toBe(false)
 act(() => { vi.advanceTimersByTime(300) })
 expect(result.current.arme).toBe(true)
 })

 it('onPointerCancel annule le minuteur en cours', () => {
 const onDeclenche = vi.fn()
 const { result } = renderHook(() => useLongPress(onDeclenche, { seuilMs: 300 }))

 act(() => result.current.onPointerDown(evt(0, 0)))
 act(() => result.current.onPointerCancel())
 act(() => { vi.advanceTimersByTime(1000) })

 expect(onDeclenche).not.toHaveBeenCalled()
 })

 it('onPointerLeave annule le minuteur en cours', () => {
 const onDeclenche = vi.fn()
 const { result } = renderHook(() => useLongPress(onDeclenche, { seuilMs: 300 }))

 act(() => result.current.onPointerDown(evt(0, 0)))
 act(() => result.current.onPointerLeave())
 act(() => { vi.advanceTimersByTime(1000) })

 expect(onDeclenche).not.toHaveBeenCalled()
 })

 it('un nouvel appui après annulation redémarre proprement le minuteur', () => {
 const onDeclenche = vi.fn()
 const { result } = renderHook(() => useLongPress(onDeclenche, { seuilMs: 300 }))

 act(() => result.current.onPointerDown(evt(0, 0)))
 act(() => result.current.onPointerUp())
 act(() => result.current.onPointerDown(evt(0, 0)))
 act(() => { vi.advanceTimersByTime(300) })

 expect(onDeclenche).toHaveBeenCalledTimes(1)
 })

 it('n\'appelle onDeclenche qu\'une seule fois même si le minuteur dépasse largement le seuil', () => {
 const onDeclenche = vi.fn()
 const { result } = renderHook(() => useLongPress(onDeclenche, { seuilMs: 300 }))

 act(() => result.current.onPointerDown(evt(0, 0)))
 act(() => { vi.advanceTimersByTime(5000) })

 expect(onDeclenche).toHaveBeenCalledTimes(1)
 })

 it('utilise les valeurs par défaut (300ms, 8px) quand aucune option n\'est fournie', () => {
 const onDeclenche = vi.fn()
 const { result } = renderHook(() => useLongPress(onDeclenche))

 act(() => result.current.onPointerDown(evt(0, 0)))
 act(() => { vi.advanceTimersByTime(299) })
 expect(onDeclenche).not.toHaveBeenCalled()
 act(() => { vi.advanceTimersByTime(1) })
 expect(onDeclenche).toHaveBeenCalledTimes(1)
 })
})
