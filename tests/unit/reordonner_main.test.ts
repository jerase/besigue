// ============================================================
// TESTS — reconcilierOrdreMain (ordre d'affichage libre de la main,
// glisser-déposer côté joueur humain)
// ============================================================
//
// Vérifie que la réconciliation entre l'ordre choisi par le joueur et
// le contenu réel de sa main (state.joueurs[0].main) respecte :
//   - la préservation de l'ordre choisi pour les cartes toujours en main
//   - la disparition des cartes qui ont quitté la main (jouées / étalées)
//   - l'ajout en fin de liste des cartes nouvellement arrivées (pioche,
//     nouvelle manche), jamais insérées au milieu d'un ordre existant
//   - l'idempotence (aucun changement si la main n'a pas changé)
// ============================================================

import { describe, it, expect } from 'vitest'
import { reconcilierOrdreMain } from '../../src/screens/EcranTable'
import { creerCarte } from '../../src/core/deck'
import type { Carte } from '../../src/types'

let _pos = 0
const c = (couleur: Carte['couleur'], rang: Carte['rang'], jeu = 0): Carte =>
  creerCarte(couleur, rang, jeu, _pos++)

describe('reconcilierOrdreMain', () => {
  it('à partir d\'un ordre vide, place les cartes dans leur ordre naturel', () => {
    const main = [c('spades', 'A'), c('hearts', 'K'), c('clubs', '9')]
    const ordre = reconcilierOrdreMain([], main)
    expect(ordre).toEqual(main.map(carte => carte.id))
  })

  it('préserve un ordre déjà choisi par le joueur quand la main ne change pas', () => {
    const as = c('spades', 'A')
    const roi = c('hearts', 'K')
    const neuf = c('clubs', '9')
    const main = [as, roi, neuf]

    // Le joueur a glissé le 9 en première position
    const ordreChoisi = [neuf.id, as.id, roi.id]
    const ordre = reconcilierOrdreMain(ordreChoisi, main)

    expect(ordre).toEqual(ordreChoisi)
  })

  it('retire de l\'ordre une carte qui a quitté la main (jouée), sans perturber le reste', () => {
    const as = c('spades', 'A')
    const roi = c('hearts', 'K')
    const neuf = c('clubs', '9')

    const ordreChoisi = [neuf.id, as.id, roi.id]
    // Le joueur a joué l'As : il n'est plus dans la main réelle
    const mainApresCoup = [roi, neuf]

    const ordre = reconcilierOrdreMain(ordreChoisi, mainApresCoup)

    expect(ordre).toEqual([neuf.id, roi.id])
  })

  it('ajoute une carte nouvellement piochée à la FIN de l\'ordre choisi, jamais au milieu', () => {
    const as = c('spades', 'A')
    const roi = c('hearts', 'K')
    const neuf = c('clubs', '9')
    const nouvelleCarte = c('diamonds', 'Q')

    const ordreChoisi = [neuf.id, as.id, roi.id]
    const mainApresPioche = [as, roi, neuf, nouvelleCarte]

    const ordre = reconcilierOrdreMain(ordreChoisi, mainApresPioche)

    expect(ordre).toEqual([neuf.id, as.id, roi.id, nouvelleCarte.id])
  })

  it('gère simultanément une carte jouée ET une carte piochée dans le même tour', () => {
    const as = c('spades', 'A')
    const roi = c('hearts', 'K')
    const neuf = c('clubs', '9')
    const nouvelleCarte = c('diamonds', 'Q')

    const ordreChoisi = [neuf.id, as.id, roi.id]
    // As joué, une nouvelle carte piochée
    const mainApresCoup = [roi, neuf, nouvelleCarte]

    const ordre = reconcilierOrdreMain(ordreChoisi, mainApresCoup)

    expect(ordre).toEqual([neuf.id, roi.id, nouvelleCarte.id])
  })

  it('repart sur l\'ordre naturel quand la main est entièrement renouvelée (nouvelle manche)', () => {
    const ancienneMain = [c('spades', 'A'), c('hearts', 'K')]
    const ordreChoisi = [ancienneMain[1].id, ancienneMain[0].id]

    const nouvelleMain = [c('clubs', '9'), c('diamonds', '8'), c('spades', '7')]
    const ordre = reconcilierOrdreMain(ordreChoisi, nouvelleMain)

    expect(ordre).toEqual(nouvelleMain.map(carte => carte.id))
  })

  it('est idempotent : réappliquer sur un résultat déjà réconcilié ne change rien', () => {
    const main = [c('spades', 'A'), c('hearts', 'K'), c('clubs', '9')]
    const ordreChoisi = [main[2].id, main[0].id, main[1].id]

    const premierPasse = reconcilierOrdreMain(ordreChoisi, main)
    const deuxiemePasse = reconcilierOrdreMain(premierPasse, main)

    expect(deuxiemePasse).toEqual(premierPasse)
  })

  it('main vide → ordre vide', () => {
    expect(reconcilierOrdreMain(['un-id-quelconque'], [])).toEqual([])
  })
})
