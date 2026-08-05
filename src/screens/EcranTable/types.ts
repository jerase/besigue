// ============================================================
// TYPES PARTAGÉS — écran table
// ============================================================
//
// Isolés dans leur propre module car utilisés à la fois par la logique
// pure de groupement (logiqueEtalees.ts) et par les composants de rendu
// (CartesGroupees.tsx) — évite toute dépendance circulaire entre les deux.

import type { Carte } from '../../types'

export type GroupeEtalee =
 | { type: 'mariage'; roi: Carte; dame: Carte }
 | { type: 'besigue'; dame: Carte; valet: Carte }
 | { type: 'seule'; carte: Carte }
