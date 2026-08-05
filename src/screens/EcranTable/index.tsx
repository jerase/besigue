// ============================================================
// ÉCRAN TABLE — point d'entrée du dossier
// ============================================================
//
// Ce fichier ne fait que réexporter le composant principal et les
// fonctions pures publiques du dossier, pour que
// `import { EcranTable } from '../screens/EcranTable'`
// (ou `'./screens/EcranTable'` depuis App.tsx) continue de fonctionner
// à l'identique après la décomposition — TypeScript/Vite résolvent un
// import de dossier vers son index.tsx sans qu'aucun appelant n'ait à
// changer son chemin d'import.

export { EcranTable } from './EcranTable'
export { grouperCartesEtalees } from './logiqueEtalees'
export { reconcilierOrdreMain, trierMain, ORDRE_COULEURS_TRI } from './logiqueMain'
export type { GroupeEtalee } from './types'
