// ============================================================
// MATRICE DE RELATION — Cartes × Types de combinaisons
// ============================================================
//
// Pour chaque carte physique en main/étalée de l'IA, détermine TOUS
// les types de combinaisons auxquels elle reste éligible : mariage
// (atout/hors-atout), bésigue, quinte, carrés (normal/atout, par rang).
//
// Structure : matrice de relation — EligibiliteCarte[], une ligne par
// carte, chaque ligne portant sa PROPRE liste de types éligibles. Pas
// de pointeur entre cartes, pas de nœud parent/enfant : chaque cellule
// (carte, type) se recalcule intégralement à partir de l'état brut
// (main/étalées/usagesCartes/annonces), sans jamais réutiliser le
// résultat déjà calculé d'une AUTRE cellule.
//
// Corrige la faille confirmée : le mécanisme existant (ancien
// cartesUtilesAuxCombis, cf. helpers.ts) ne consultait JAMAIS
// state.usagesCartes — une carte déjà épuisée (utilisée dans tous les
// types auxquels elle pouvait prétendre) restait protégée pour
// toujours. Ici, l'éligibilité est explicitement filtrée par famille
// de réutilisation via usagesCartes :
//   - {mariage_atout, mariage_hors_atout}      → même famille
//   - {besigue}                                → famille solo
//   - {4_as, 4_as_atout}                       → même famille
//   - {4_roi, 4_roi_atout}                     → même famille
//   - {4_dame, 4_dame_atout}                   → même famille
//   - {4_valet, 4_valet_atout}                 → même famille
//   - {quinte}                                 → famille solo
// Une carte déjà utilisée dans UN type d'une famille est exclue de
// TOUS les types de CETTE famille, mais reste pleinement éligible aux
// types des AUTRES familles (jamais d'exclusivité entre familles
// différentes — ex. un Roi d'atout déjà utilisé dans mariage_atout
// reste éligible à 4_roi_atout).
//
// Utilisée pour :
//  (a) choisir quelle combinaison annoncer (via typesEligibles) ;
//  (b) décider quelles cartes protéger d'un sacrifice dans un pli
//      (remplace cartesUtilesAuxCombis, cf. helpers.ts).
// ============================================================

import type { Carte, Couleur, GameState, NomCombinaison, Rang, UsageCarteCombi } from '../../types'
import { combinaisonEncoreAtteignable } from './memoire'

export interface EligibiliteCarte {
  carteId: string
  typesEligibles: NomCombinaison[]
}

// ── Familles de réutilisation (cf. combinaisons.ts) ─────────────

const FAMILLE_MARIAGE: NomCombinaison[] = ['mariage_atout', 'mariage_hors_atout']
const FAMILLE_BESIGUE: NomCombinaison[] = ['besigue']
const FAMILLE_QUINTE: NomCombinaison[] = ['quinte']

type RangCarre = 'A' | 'K' | 'Q' | 'J'
const NOM_CARRE_NORMAL: Record<RangCarre, NomCombinaison> = {
  A: '4_as', K: '4_roi', Q: '4_dame', J: '4_valet',
}
const NOM_CARRE_ATOUT: Record<RangCarre, NomCombinaison> = {
  A: '4_as_atout', K: '4_roi_atout', Q: '4_dame_atout', J: '4_valet_atout',
}
const familleCarre = (rang: RangCarre): NomCombinaison[] => [NOM_CARRE_NORMAL[rang], NOM_CARRE_ATOUT[rang]]

/** Cette carte a-t-elle déjà été utilisée dans un type de cette famille ? */
function estExclueParUsage(usages: UsageCarteCombi[], carteId: string, famille: NomCombinaison[]): boolean {
  const entree = usages.find(u => u.carteId === carteId)
  if (!entree) return false
  return entree.combinaisonsUtilisees.some(nom => famille.includes(nom))
}

// ============================================================
// Calcul d'UNE cellule (carte) — indépendant des autres cartes
// ============================================================

/**
 * Calcule la ligne d'éligibilité d'UNE SEULE carte physique. Relit
 * l'état brut à chaque appel (main/étalées/usagesCartes/annonces) —
 * ne dépend du résultat calculé d'aucune autre carte.
 */
export function calculerEligibiliteCarte(
  state: GameState,
  carte: Carte,
  joueurId: 0 | 1 = 1
): EligibiliteCarte {
  const usages = state.usagesCartes ?? []
  const annonces = state.annonces ?? []
  const joueur = state.joueurs[joueurId]
  const main = joueur.main
  const toutes = [...joueur.main, ...joueur.cartesEtalees]
  const atout = state.couleurAtout
  const types: NomCombinaison[] = []

  const exclue = (famille: NomCombinaison[]) => estExclueParUsage(usages, carte.id, famille)

  if (!carte.estJoker) {
    // ── Mariage (Roi + Dame de même couleur) ──────────────────
    if ((carte.rang === 'K' || carte.rang === 'Q') && !exclue(FAMILLE_MARIAGE)) {
      const rangPartenaire: Rang = carte.rang === 'K' ? 'Q' : 'K'
      const partenaireDispo = toutes.some(p =>
        !p.estJoker && p.rang === rangPartenaire && p.couleur === carte.couleur &&
        p.id !== carte.id && !estExclueParUsage(usages, p.id, FAMILLE_MARIAGE)
      )
      if (partenaireDispo) {
        const nomMariage: NomCombinaison =
          atout === null || carte.couleur === atout ? 'mariage_atout' : 'mariage_hors_atout'
        types.push(nomMariage)
      }
    }

    // ── Bésigue (Dame♠ + Valet♦) ───────────────────────────────
    const estDameSpades = carte.rang === 'Q' && carte.couleur === 'spades'
    const estValetDiamonds = carte.rang === 'J' && carte.couleur === 'diamonds'
    if ((estDameSpades || estValetDiamonds) && !exclue(FAMILLE_BESIGUE)) {
      const rangPartenaire: Rang = estDameSpades ? 'J' : 'Q'
      const couleurPartenaire: Couleur = estDameSpades ? 'diamonds' : 'spades'
      const partenaireDispo = toutes.some(p =>
        !p.estJoker && p.rang === rangPartenaire && p.couleur === couleurPartenaire &&
        !estExclueParUsage(usages, p.id, FAMILLE_BESIGUE)
      )
      if (partenaireDispo) types.push('besigue')
    }

    // ── Quinte (As + 10 + Valet d'atout) ───────────────────────
    // Gate spécifique (pas usagesCartes) : la quinte est un tirage
    // unique par joueur et par manche — cf. detecterQuinte
    // (combinaisons.ts), qui bloque sur state.annonces, pas sur une
    // exclusion carte par carte. Prérequis "mariage annoncé" idem
    // (comportement existant de cartesUtilesAuxCombis, plus permissif
    // que mariagesAtoutActifs : reste protecteur même si le mariage a
    // depuis été cassé dans le pli).
    if (
      atout !== null && carte.couleur === atout &&
      (carte.rang === 'A' || carte.rang === '10' || carte.rang === 'J')
    ) {
      const quinteDejaAnnoncee = annonces.some(a => a.joueurId === joueurId && a.nom === 'quinte')
      const mariageAtoutAnnonce = annonces.some(a => a.joueurId === joueurId && a.nom === 'mariage_atout')
      if (!quinteDejaAnnoncee) {
        // La quinte n'exige qu'UN SEUL exemplaire de chaque rang (As/10/
        // Valet) d'atout. Si l'IA détient PLUSIEURS cartes de même rang
        // d'atout (copies différentes, ex. deux As d'atout), une seule
        // est réellement « la pièce de la quinte » — les autres sont de
        // vrais doublons libres, exactement comme pour le mariage_atout
        // actif (cf. cartesProtegeesParCombinaisons ci-dessous, qui
        // distingue déjà la paire mariée précise d'un doublon non marié
        // via mariagesAtoutActifs). Sans cette distinction, TOUTES les
        // copies d'un même rang seraient protégées indéfiniment, y
        // compris un doublon qui ne sert à rien pour la quinte.
        // Choix stable et arbitraire (tri par id) pour départager de
        // façon déterministe QUELLE copie est « la » pièce protégée.
        const memeRangEnMain = main
          .filter(p => !p.estJoker && p.couleur === atout && p.rang === carte.rang)
          .sort((a, b) => a.id.localeCompare(b.id))
        const estLaPieceDeQuinte = memeRangEnMain.length > 0 && memeRangEnMain[0].id === carte.id

        if (estLaPieceDeQuinte) {
          const rangsQuinte: Rang[] = ['A', '10', 'J']
          if (mariageAtoutAnnonce) {
            const atteignable = rangsQuinte.every(rang => {
              const presente = main.filter(p => p.couleur === atout && p.rang === rang).length
              return combinaisonEncoreAtteignable(
                state, { rang, couleur: atout, quantiteRequise: 1, quantitePresente: presente }, joueurId
              )
            })
            if (atteignable) types.push('quinte')
          } else {
            const toutesPresentesEnMain = rangsQuinte.every(rang =>
              main.some(p => !p.estJoker && p.couleur === atout && p.rang === rang)
            )
            if (toutesPresentesEnMain) types.push('quinte')
          }
        }
      }
    }

    // ── Carrés (par rang, normal + atout) ──────────────────────
    if (carte.rang === 'A' || carte.rang === 'K' || carte.rang === 'Q' || carte.rang === 'J') {
      const rang = carte.rang as RangCarre
      const famille = familleCarre(rang)
      if (!exclue(famille)) {
        // Normal : toutes couleurs confondues, sans le Joker dans le
        // décompte de présence (cf. cartesUtilesAuxCombis existant).
        const presentTotal = toutes.filter(p =>
          !p.estJoker && p.rang === rang && !estExclueParUsage(usages, p.id, famille)
        ).length
        if (
          presentTotal >= 3 &&
          combinaisonEncoreAtteignable(state, { rang, quantiteRequise: 4, quantitePresente: presentTotal }, joueurId)
        ) {
          types.push(NOM_CARRE_NORMAL[rang])
        }

        // Atout : uniquement les cartes de la couleur d'atout (sous-
        // ensemble strict du cas normal ci-dessus — ne peut donc jamais
        // élargir la protection au-delà du cas normal, seulement
        // enrichir la liste des types pour le choix d'annonce).
        if (atout !== null && carte.couleur === atout) {
          const presentAtout = toutes.filter(p =>
            !p.estJoker && p.rang === rang && p.couleur === atout && !estExclueParUsage(usages, p.id, famille)
          ).length
          if (
            presentAtout >= 3 &&
            combinaisonEncoreAtteignable(
              state, { rang, couleur: atout, quantiteRequise: 4, quantitePresente: presentAtout }, joueurId
            )
          ) {
            types.push(NOM_CARRE_ATOUT[rang])
          }
        }
      }
    }
  } else {
    // ── Joker : complète un carré NORMAL (jamais un carré d'atout,
    // cf. detecterCarresAtout qui n'admet aucun Joker), uniquement
    // quand exactement 3 cartes non-Joker du même rang sont
    // disponibles (cf. detecterCarresNormaux).
    for (const rang of ['A', 'K', 'Q', 'J'] as RangCarre[]) {
      const famille = familleCarre(rang)
      const nomNormal = NOM_CARRE_NORMAL[rang]
      if (estExclueParUsage(usages, carte.id, [nomNormal])) continue
      const memeRang = toutes.filter(p =>
        !p.estJoker && p.rang === rang && !estExclueParUsage(usages, p.id, famille)
      ).length
      if (memeRang === 3) types.push(nomNormal)
    }
  }

  return { carteId: carte.id, typesEligibles: types }
}

// ============================================================
// Matrice complète — toutes les cartes en main + étalées
// ============================================================

export function calculerTableCombinaisons(
  state: GameState,
  joueurId: 0 | 1 = 1
): EligibiliteCarte[] {
  const joueur = state.joueurs[joueurId]
  const toutes = [...joueur.main, ...joueur.cartesEtalees]
  return toutes.map(carte => calculerEligibiliteCarte(state, carte, joueurId))
}

// ============================================================
// Dérivés — usages (a) et (b)
// ============================================================

/**
 * (b) Cartes à protéger d'un sacrifice : celles ayant au moins un type
 * éligible. Remplace cartesUtilesAuxCombis (helpers.ts).
 *
 * Gate phase finale : dès que `state.phase === 'finale'` (déclenché par
 * useGameEngine.ts, effectuerPioche, exactement quand la pioche se vide
 * — signal dédié et explicite, PAS `state.pioche.length === 0` utilisé
 * seul : plusieurs états de test construisent une pioche vide sans
 * vouloir représenter une vraie phase finale, cf.
 * tests/unit/cartes_utiles_atteignabilite.test.ts), AUCUNE combinaison
 * ne peut plus jamais être annoncée (useGameEngine.ts, proposerAnnonces :
 * `if (s.phase === 'finale') { effectuerPioche(...); return }` — la
 * proposition d'annonce est purement et simplement sautée). Toute
 * protection de carte au titre d'une combinaison future (mariage,
 * quinte, carré, bésigue) devient donc sans objet à partir de ce point :
 * il n'y a plus rien à préserver. Seul le bonus du 7 d'atout (+10 pts,
 * cf. pli.ts) reste actif en phase finale, mais ce n'est pas une
 * combinaison à annoncer — c'est un effet automatique appliqué à la
 * carte jouée, indépendant de toute protection. Retourne donc un
 * ensemble vide sans même calculer la matrice d'éligibilité.
 *
 * S'y ajoute, hors phase finale, une protection INDÉPENDANTE de la
 * matrice d'éligibilité ci-dessus : le Roi et la Dame d'un mariage_atout
 * encore ACTIF (state.mariagesAtoutActifs) restent protégés tant que ce
 * joueur n'a pas encore annoncé sa quinte — car la quinte (As+10+Valet
 * d'atout) exige EXPLICITEMENT un mariage_atout actif comme prérequis
 * (cf. detecterQuinte, combinaisons.ts : `mariagesActifs.length === 0
 * → return []`). Jouer ce Roi ou cette Dame romprait le mariage
 * (gererCassureMariageAtout) et rendrait la quinte définitivement
 * impossible pour la manche en cours, même si l'As/10/Valet d'atout
 * sont réunis ensuite. Cette protection s'applique MÊME si le Roi/la
 * Dame est par ailleurs "épuisé(e)" pour de nouvelles annonces
 * (mariage déjà annoncé une fois, donc exclu de FAMILLE_MARIAGE ci-
 * dessus) : le rôle de prérequis actif est distinct du rôle
 * d'éligibilité à une NOUVELLE annonce. Une fois la quinte annoncée,
 * le mariage a rempli son rôle de prérequis et n'a plus besoin d'être
 * protégé à ce titre (l'IA peut alors le casser si besoin).
 */
export function cartesProtegeesParCombinaisons(state: GameState, joueurId: 0 | 1 = 1): Set<string> {
  if (state.phase === 'finale') return new Set<string>()

  const table = calculerTableCombinaisons(state, joueurId)
  const proteges = new Set<string>()
  for (const ligne of table) {
    if (ligne.typesEligibles.length > 0) proteges.add(ligne.carteId)
  }

  const annonces = state.annonces ?? []
  const quinteAnnoncee = annonces.some(a => a.joueurId === joueurId && a.nom === 'quinte')
  if (!quinteAnnoncee) {
    const mariagesActifs = state.mariagesAtoutActifs?.[joueurId] ?? []
    for (const [roiId, dameId] of mariagesActifs) {
      proteges.add(roiId)
      proteges.add(dameId)
    }
  }

  return proteges
}

/**
 * (a) Types de combinaisons auxquels au moins une carte de l'IA reste
 * éligible actuellement — utile pour orienter le choix d'annonce.
 */
export function typesEncoreEligibles(state: GameState, joueurId: 0 | 1 = 1): NomCombinaison[] {
  const table = calculerTableCombinaisons(state, joueurId)
  const types = new Set<NomCombinaison>()
  for (const ligne of table) {
    for (const t of ligne.typesEligibles) types.add(t)
  }
  return Array.from(types)
}
