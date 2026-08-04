// ============================================================
// TESTS — useEcranMobile
// ============================================================
//
// jsdom n'implémente pas window.matchMedia : on le simule pour chaque
// scénario (pointeur grossier + écran étroit → mobile ; sinon → desktop),
// ainsi que la réaction à un changement dynamique (ex. redimensionnement,
// rotation d'écran, changement de mode d'entrée).
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEcranMobile, REQUETE_ECRAN_MOBILE } from '../../src/hooks/useEcranMobile'

type Ecouteur = (event: MediaQueryListEvent) => void

function creerMediaQueryListFactice(matchesInitial: boolean) {
  const ecouteurs = new Set<Ecouteur>()
  const mql: Partial<MediaQueryList> & { _declencher: (matches: boolean) => void } = {
    matches: matchesInitial,
    media: REQUETE_ECRAN_MOBILE,
    addEventListener: vi.fn((type: string, cb: EventListenerOrEventListenerObject) => {
      if (type === 'change') ecouteurs.add(cb as Ecouteur)
    }),
    removeEventListener: vi.fn((type: string, cb: EventListenerOrEventListenerObject) => {
      if (type === 'change') ecouteurs.delete(cb as Ecouteur)
    }),
    _declencher: (matches: boolean) => {
      (mql as { matches: boolean }).matches = matches
      ecouteurs.forEach(cb => cb({ matches } as MediaQueryListEvent))
    },
  }
  return mql as MediaQueryList & { _declencher: (matches: boolean) => void }
}

function installerMatchMedia(matchesInitial: boolean) {
  const mql = creerMediaQueryListFactice(matchesInitial)
  window.matchMedia = vi.fn().mockReturnValue(mql)
  return mql
}

afterEach(() => {
  vi.unstubAllGlobals()
  // @ts-expect-error - nettoyage volontaire entre les tests
  delete window.matchMedia
})

describe('useEcranMobile', () => {
  it('retourne false quand le média ne correspond pas (grand écran / souris)', () => {
    installerMatchMedia(false)
    const { result } = renderHook(() => useEcranMobile())
    expect(result.current).toBe(false)
  })

  it('retourne true quand le média correspond (tactile + écran étroit)', () => {
    installerMatchMedia(true)
    const { result } = renderHook(() => useEcranMobile())
    expect(result.current).toBe(true)
  })

  it('interroge bien la media query pointeur grossier + largeur max', () => {
    installerMatchMedia(false)
    renderHook(() => useEcranMobile())
    expect(window.matchMedia).toHaveBeenCalledWith(REQUETE_ECRAN_MOBILE)
  })

  it('réagit à un changement dynamique (ex. rotation, redimensionnement)', () => {
    const mql = installerMatchMedia(false)
    const { result } = renderHook(() => useEcranMobile())
    expect(result.current).toBe(false)

    act(() => {
      mql._declencher(true)
    })

    expect(result.current).toBe(true)
  })

  it('se désabonne de la media query au démontage', () => {
    const mql = installerMatchMedia(false)
    const { unmount } = renderHook(() => useEcranMobile())
    unmount()
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('ne plante pas si matchMedia est indisponible (environnement dégradé)', () => {
    // @ts-expect-error - simulation d'un environnement sans matchMedia
    delete window.matchMedia
    const { result } = renderHook(() => useEcranMobile())
    expect(result.current).toBe(false)
  })
})
