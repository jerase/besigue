// ============================================================
// HOOK useEcranMobile
// ============================================================
//
// Détecte un contexte « mobile » au sens de l'interaction main :
// pointeur tactile (grossier) ET écran étroit — les deux signaux
// combinés, pas l'un ou l'autre isolément.
//
// Pourquoi cette combinaison précise plutôt qu'un seul critère :
//   - la largeur seule se déclencherait aussi sur une fenêtre desktop
//     redimensionnée étroite, où l'utilisateur a toujours une souris
//     (le clic/glissé n'y est pas ambigu, donc pas besoin d'appui long) ;
//   - le pointeur tactile seul se déclencherait sur une tablette large,
//     où la main tient sur une seule ligne (pas besoin de défilement
//     horizontal forcé).
//
// C'est ce mode qui pilote deux comportements dans EcranTable :
//   - Point A : la main passe en ligne unique défilante (au lieu du
//     retour à la ligne), pour respecter l'hypothèse d'ordre 1D du
//     glisser-déposer de framer-motion.
//   - Point C : le glisser-déposer d'une carte n'est armé qu'après un
//     appui maintenu, pour ne pas interférer avec un simple tap qui
//     sélectionne/joue une carte.
//
// Le seuil de largeur (640px) correspond au breakpoint `sm` standard
// de Tailwind, déjà la convention implicite du projet.

const LARGEUR_MAX_MOBILE_PX = 640
const REQUETE_ECRAN_MOBILE = `(pointer: coarse) and (max-width: ${LARGEUR_MAX_MOBILE_PX}px)`

import { useEffect, useState } from 'react'

function matchMediaDisponible(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

function lireEtatMobile(): boolean {
  if (!matchMediaDisponible()) return false
  return window.matchMedia(REQUETE_ECRAN_MOBILE).matches
}

export function useEcranMobile(): boolean {
  const [estMobile, setEstMobile] = useState<boolean>(lireEtatMobile)

  useEffect(() => {
    if (!matchMediaDisponible()) return

    const mql = window.matchMedia(REQUETE_ECRAN_MOBILE)
    const gererChangement = (event: MediaQueryListEvent) => setEstMobile(event.matches)

    // addEventListener est la norme actuelle ; addListener (legacy) reste
    // en repli pour d'anciens moteurs (Safari < 14) qui ne le supportent pas.
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', gererChangement)
      return () => mql.removeEventListener('change', gererChangement)
    }
    mql.addListener(gererChangement)
    return () => mql.removeListener(gererChangement)
  }, [])

  return estMobile
}

export { REQUETE_ECRAN_MOBILE, LARGEUR_MAX_MOBILE_PX }
