// ============================================================
// TESTS — Table de décision : choix de la couleur d'atout
// (tableChoixAtout.ts)
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  calculerLigneChoixAtout,
  calculerTableChoixAtout,
  meilleureCouleurAtout,
  meilleureCombiMariageAtout,
} from '../../src/core/ia/tableChoixAtout'
import { couleurMariagePotentielNonAnnonce } from '../../src/core/ia/strategies-avancees'
import { choisirAnnonceIA } from '../../src/core/ia'
import { detecterCombinaisonsDisponibles } from '../../src/core/combinaisons'
import { initialiserPartie } from '../../src/core/init'
import { initialiserChampsIT4 } from '../../src/core/combinaisons'
import { creerCarte } from '../../src/core/deck'
import { CONFIG_DEFAUT } from '../../src/types'
import type { GameState, Carte, Couleur } from '../../src/types'

let _pos = 0
const c = (couleur: Couleur, rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

function baseState(couleurAtout: Couleur | null = null): GameState {
  const { state } = initialiserPartie(CONFIG_DEFAUT)
  const base = initialiserChampsIT4({ ...state, couleurAtout })
  const joueurs = [...base.joueurs] as typeof base.joueurs
  joueurs[0] = { ...joueurs[0], main: [], cartesEtalees: [], pileRemportee: [] }
  joueurs[1] = { ...joueurs[1], main: [], cartesEtalees: [], pileRemportee: [] }
  return {
    ...base,
    joueurs,
    pioche: Array.from({ length: 16 }, () => c('clubs', '7', 0)),
    pliEnCours: { carteJoueur0: null, carteJoueur1: null, joueurOuvreur: 0, cartes: [null, null] },
  }
}

// ============================================================
// calculerLigneChoixAtout — chaque ligne, indépendamment
// ============================================================

describe('calculerLigneChoixAtout — ligne indépendante par couleur', () => {
  it('score de base = 0 si l\'IA n\'a aucune carte de cette couleur ET la quinte n\'est plus atteignable', () => {
    const state = baseState(null)
    state.joueurs[1].main = [c('hearts', 'K')]
    // Sans cela, la quinte pique resterait "mathématiquement atteignable"
    // (aucune carte pique vue) et ajouterait le bonus malgré une main vide
    // en pique — ce n'est pas ce que ce test isole.
    state.joueurs[0].cartesEtalees = [
      c('spades', 'A', 0), c('spades', 'A', 1), c('spades', 'A', 2), c('spades', 'A', 3),
    ]
    const ligne = calculerLigneChoixAtout(state, 'spades', 1)
    expect(ligne.couleur).toBe('spades')
    expect(ligne.score).toBe(0)
  })

  it('quinte reste "atteignable" (bonus) même sans carte en main, tant que rien n\'exclut mathématiquement les 3 cartes requises', () => {
    const state = baseState(null)
    state.joueurs[1].main = [c('hearts', 'K')] // rien en pique
    const ligne = calculerLigneChoixAtout(state, 'spades', 1)
    // 0 carte pique en main + bonus quinte (encore non vue, donc possible) + 0 brisque
    expect(ligne.score).toBe(15)
  })

  it('augmente avec le nombre de cartes de la couleur en main (facteur 1)', () => {
    const state = baseState(null)
    state.joueurs[1].main = [c('spades', 'K'), c('spades', '9'), c('spades', '8')]
    const avecTroisCartes = calculerLigneChoixAtout(state, 'spades', 1)

    const state2 = baseState(null)
    state2.joueurs[1].main = [c('spades', 'K')]
    const avecUneCarte = calculerLigneChoixAtout(state2, 'spades', 1)

    expect(avecTroisCartes.score).toBeGreaterThan(avecUneCarte.score)
  })

  it('ajoute le bonus quinte quand As+10+Valet de la couleur sont déjà en main', () => {
    const state = baseState(null)
    state.joueurs[1].main = [c('spades', 'K'), c('spades', 'A'), c('spades', '10'), c('spades', 'J')]
    const avecQuinte = calculerLigneChoixAtout(state, 'spades', 1)

    const state2 = baseState(null)
    state2.joueurs[1].main = [c('spades', 'K')] // pas de quinte possible en main, mais reste
    // mathématiquement atteignable (cartes non vues) → isoler ce facteur en
    // comparant directement à une couleur où l'IA a le même nombre de
    // cartes mais où on a également le Roi seul : les deux profitent donc
    // du même bonus "atteignable" (non vues) : on compare ici avec/sans
    // la présence certaine des 3 cartes en main plutôt que ce cas ambigu.
    const ligneRoiSeul = calculerLigneChoixAtout(state2, 'spades', 1)

    // avecQuinte a 4 cartes de la couleur (K,A,10,J) vs 1 (K) pour l'autre :
    // le facteur 1 (atouts en main) explique une partie de l'écart, donc on
    // vérifie seulement que le score est strictement supérieur.
    expect(avecQuinte.score).toBeGreaterThan(ligneRoiSeul.score)
  })

  it('quinte non atteignable (les 4 As de la couleur déjà vus ailleurs) : pas de bonus', () => {
    const state = baseState(null)
    // Les 4 As de pique sont déjà tous étalés côté adversaire → 0 non vu
    state.joueurs[0].cartesEtalees = [
      c('spades', 'A', 0), c('spades', 'A', 1), c('spades', 'A', 2), c('spades', 'A', 3),
    ]
    state.joueurs[1].main = [c('spades', 'K'), c('spades', '10'), c('spades', 'J')]

    const ligne = calculerLigneChoixAtout(state, 'spades', 1)
    // 3 cartes de la couleur (poids 2) + pas de bonus quinte (0) + 1 brisque,
    // le 10 (poids 5) — cf. constantes dans ia.config.ts
    expect(ligne.score).toBe(3 * 2 + 0 + 1 * 5)
  })

  it('augmente avec le nombre de brisques (As/10) déjà tenues en main (facteur 3)', () => {
    const state = baseState(null)
    state.joueurs[1].main = [c('spades', 'K'), c('spades', 'A'), c('spades', '10')]
    const avecBrisques = calculerLigneChoixAtout(state, 'spades', 1)

    const state2 = baseState(null)
    state2.joueurs[1].main = [c('spades', 'K'), c('spades', '9'), c('spades', '8')]
    const sansBrisques = calculerLigneChoixAtout(state2, 'spades', 1)

    expect(avecBrisques.score).toBeGreaterThan(sansBrisques.score)
  })

  it('deux couleurs sans aucun point commun : les lignes ne s\'influencent pas (calcul indépendant)', () => {
    const state = baseState(null)
    state.joueurs[1].main = [c('spades', 'A'), c('spades', '10'), c('hearts', 'K')]

    const ligneSpadesAvecHearts = calculerLigneChoixAtout(state, 'spades', 1)

    const stateSansHearts = baseState(null)
    stateSansHearts.joueurs[1].main = [c('spades', 'A'), c('spades', '10')]
    const ligneSpadesSansHearts = calculerLigneChoixAtout(stateSansHearts, 'spades', 1)

    // Retirer une carte hearts du jeu ne change rien à la ligne spades
    expect(ligneSpadesAvecHearts.score).toBe(ligneSpadesSansHearts.score)
  })
})

// ============================================================
// calculerTableChoixAtout — table triée
// ============================================================

describe('calculerTableChoixAtout', () => {
  it('retourne une ligne pour les 4 couleurs, triée par score décroissant', () => {
    const state = baseState(null)
    state.joueurs[1].main = [c('spades', 'A'), c('spades', '10'), c('hearts', 'K')]

    const table = calculerTableChoixAtout(state, 1)
    expect(table).toHaveLength(4)
    for (let i = 1; i < table.length; i++) {
      expect(table[i - 1].score).toBeGreaterThanOrEqual(table[i].score)
    }
    expect(table[0].couleur).toBe('spades') // 2 brisques certaines > 1 carte simple
  })

  it('égalité de score → départage par ordre canonique spades>hearts>diamonds>clubs', () => {
    const state = baseState(null)
    state.joueurs[1].main = [] // toutes les couleurs à score 0
    const table = calculerTableChoixAtout(state, 1)
    expect(table.map(l => l.couleur)).toEqual(['spades', 'hearts', 'diamonds', 'clubs'])
  })
})

// ============================================================
// meilleureCouleurAtout
// ============================================================

describe('meilleureCouleurAtout', () => {
  it('retourne null si aucune couleur candidate', () => {
    const state = baseState(null)
    expect(meilleureCouleurAtout(state, [], 1)).toBeNull()
  })

  it('retient la couleur candidate au score le plus élevé, pas la première de la liste', () => {
    const state = baseState(null)
    // hearts : rien de plus que le Roi/Dame du mariage lui-même
    state.joueurs[1].main = [
      c('hearts', 'K'), c('hearts', 'Q'),
      c('spades', 'K'), c('spades', 'Q'), c('spades', 'A'), c('spades', '10'),
    ]
    // candidates listées avec hearts en premier : si le code se contentait du
    // premier trouvé, il choisirait hearts — la table doit retenir spades.
    expect(meilleureCouleurAtout(state, ['hearts', 'spades'], 1)).toBe('spades')
  })
})

// ============================================================
// meilleureCombiMariageAtout
// ============================================================

describe('meilleureCombiMariageAtout', () => {
  it('retourne null si aucun mariage_atout dans la liste', () => {
    const state = baseState(null)
    expect(meilleureCombiMariageAtout([], state, 1)).toBeNull()
  })

  it('un seul candidat mariage_atout → retourné sans consulter la table (comportement inchangé)', () => {
    const state = baseState(null)
    const roi = c('hearts', 'K')
    const dame = c('hearts', 'Q')
    state.joueurs[1].main = [roi, dame]
    const combis = detecterCombinaisonsDisponibles(state, 1)
    const choix = meilleureCombiMariageAtout(combis, state, 1)
    expect(choix?.cartesIds).toEqual(expect.arrayContaining([roi.id, dame.id]))
  })

  it('plusieurs candidats → retient celui de la couleur au meilleur score', () => {
    const state = baseState(null)
    const roiHearts = c('hearts', 'K')
    const dameHearts = c('hearts', 'Q')
    const roiSpades = c('spades', 'K')
    const dameSpades = c('spades', 'Q')
    const asSpades = c('spades', 'A')
    const dixSpades = c('spades', '10')
    state.joueurs[1].main = [roiHearts, dameHearts, roiSpades, dameSpades, asSpades, dixSpades]

    const combis = detecterCombinaisonsDisponibles(state, 1)
    expect(combis.filter(cb => cb.nom === 'mariage_atout')).toHaveLength(2)

    const choix = meilleureCombiMariageAtout(combis, state, 1)
    expect(choix?.cartesIds).toEqual(expect.arrayContaining([roiSpades.id, dameSpades.id]))
  })
})

// ============================================================
// Convergence — couleurMariagePotentielNonAnnonce ET choisirAnnonceIA
// doivent retenir la MÊME couleur quand plusieurs mariages sont
// disponibles (exigence explicite : "faire converger vers la
// couleur gagnante").
// ============================================================

describe('Convergence multi-couleurs — mariage potentiel', () => {
  function stateAvecDeuxMariages(): GameState {
    const state = baseState(null)
    const roiHearts = c('hearts', 'K')
    const dameHearts = c('hearts', 'Q')
    const roiSpades = c('spades', 'K')
    const dameSpades = c('spades', 'Q')
    const asSpades = c('spades', 'A')
    const dixSpades = c('spades', '10')
    // hearts en premier dans la main → si un code se contentait du premier
    // trouvé par ordre de détection interne (spades>hearts...), il tomberait
    // sur spades de toute façon ici ; on vérifie donc surtout que spades
    // gagne bien PARCE QU'il a le meilleur score (brisques + atouts en main),
    // pas par accident d'ordre.
    state.joueurs[1].main = [roiHearts, dameHearts, roiSpades, dameSpades, asSpades, dixSpades]
    return state
  }

  it('couleurMariagePotentielNonAnnonce retient la couleur gagnante (spades, mieux dotée)', () => {
    const state = stateAvecDeuxMariages()
    expect(couleurMariagePotentielNonAnnonce(state)).toBe('spades')
  })

  it('choisirAnnonceIA (difficile) retient le mariage_atout de la couleur gagnante', () => {
    const state = stateAvecDeuxMariages()
    const combis = detecterCombinaisonsDisponibles(state, 1)
    const choix = choisirAnnonceIA(combis, state, 'difficile')
    expect(choix?.nom).toBe('mariage_atout')
    const spadesId = state.joueurs[1].main.find(cc => cc.couleur === 'spades' && cc.rang === 'K')!.id
    expect(choix?.cartesIds).toContain(spadesId)
  })

  it('choisirAnnonceIA (intermédiaire) retient la même couleur que difficile', () => {
    const state = stateAvecDeuxMariages()
    const combis = detecterCombinaisonsDisponibles(state, 1)
    const choixInter = choisirAnnonceIA(combis, state, 'intermediaire')
    const choixDiff = choisirAnnonceIA(combis, state, 'difficile')
    expect(choixInter?.cartesIds).toEqual(choixDiff?.cartesIds)
  })

  it('couleurMariagePotentielNonAnnonce et choisirAnnonceIA(difficile) convergent vers les mêmes cartes', () => {
    const state = stateAvecDeuxMariages()
    const couleurRetenue = couleurMariagePotentielNonAnnonce(state)
    const combis = detecterCombinaisonsDisponibles(state, 1)
    const choix = choisirAnnonceIA(combis, state, 'difficile')
    const carteChoisie = state.joueurs[1].main.find(cc => choix?.cartesIds.includes(cc.id))
    expect(carteChoisie?.couleur).toBe(couleurRetenue)
  })
})
