// ============================================================
// ÉCRAN TABLE — orchestration
// ============================================================
//
// Ce composant assemble les briques de l'écran de jeu (score, zone IA,
// zone centrale, main du joueur humain, panneau d'annonces) et porte
// l'état d'interaction propre à cet écran (carte sélectionnée, ordre
// d'affichage de la main). La logique pure et les sous-composants de
// rendu sont extraits dans des modules dédiés du même dossier :
//   - types.ts             : types partagés (GroupeEtalee)
//   - logiqueEtalees.ts     : groupement des cartes étalées (pur)
//   - logiqueMain.ts        : ordre / tri de la main (pur)
//   - CartesGroupees.tsx    : rendu mariage / bésigue / carte isolée
//   - CarteMainGlissable.tsx: carte de main glissable (drag-and-drop)
//   - ZoneCentrale.tsx      : pioche, atout, cartes du pli en cours

import React, { useState, useEffect } from 'react'
import { Reorder } from 'framer-motion'
import type { GameState, GameConfig, CombinaisonDisponible, Carte } from '../../types'
import { CarteComponent } from '../../components/ui/Carte'
import { PanneauScore } from '../../components/ui/PanneauScore'
import { AnnouncementPanel, HistoriqueAnnonces } from '../../components/ui/AnnouncementPanel'
import { compterBrisques } from '../../core/deck'
import type { PhaseUI } from '../../hooks/useGameEngine'
import { useEcranMobile } from '../../hooks/useEcranMobile'
import { grouperCartesEtalees } from './logiqueEtalees'
import { reconcilierOrdreMain, trierMain } from './logiqueMain'
import { RenduGroupe } from './CartesGroupees'
import { CarteMainGlissable } from './CarteMainGlissable'
import { ZoneCentrale } from './ZoneCentrale'

interface TableJeuProps {
 state: GameState
 config: GameConfig
 phaseUI: PhaseUI
 iaReflechit: boolean
 messageInfo: string
 dernierPliVainqueur: (0 | 1) | null
 combisDisponibles: CombinaisonDisponible[]
 peutPasser: boolean
 onPause: () => void
 onJouerCarte: (carteId: string) => void
 onAnnoncer: (combi: CombinaisonDisponible) => void
 onPasser: () => void
}

export const EcranTable: React.FC<TableJeuProps> = ({
 state, config, phaseUI, iaReflechit, messageInfo,
 dernierPliVainqueur, combisDisponibles, peutPasser,
 onPause, onJouerCarte, onAnnoncer, onPasser,
}) => {
 const [carteSelectionnee, setCarteSelectionnee] = useState<string | null>(null)
 const joueurHumain = state.joueurs[0]
 const joueurIA = state.joueurs[1]

 // Pendant la phase annonce, on ne joue pas de carte
 const humainPeutJouer = phaseUI === 'attente_joueur' && !peutPasser
 const annonces = state.annonces ?? []

 // Point A / Point C : mode mobile (tactile + écran étroit combinés,
 // cf. useEcranMobile) — pilote l'armement du glisser-déposer par appui long.
 const ecranMobile = useEcranMobile()

 // Ordre d'affichage libre de la main (glisser-déposer) — cf. reconcilierOrdreMain.
 // Dépendance directe sur joueurHumain.main : l'effet est idempotent (une
 // réconciliation sans changement réel de contenu retourne un tableau de
 // mêmes ids dans le même ordre), donc son déclenchement à chaque nouvelle
 // référence de main (même sans changement de contenu) est sans incidence.
 const [ordreMain, setOrdreMain] = useState<string[]>(() => joueurHumain.main.map(c => c.id))
 useEffect(() => {
 setOrdreMain(prev => {
 const nouveau = reconcilierOrdreMain(prev, joueurHumain.main)
 const inchange = nouveau.length === prev.length && nouveau.every((id, i) => id === prev[i])
 return inchange ? prev : nouveau
 })
 }, [joueurHumain.main])
 const mainOrdonnee = ordreMain
 .map(id => joueurHumain.main.find(c => c.id === id))
 .filter((c): c is Carte => c !== undefined)

 const handleClick = (carte: Carte) => {
 if (!humainPeutJouer) return
 setCarteSelectionnee(prev => prev === carte.id ? null : carte.id)
 }
 const handleDoubleClick = (carte: Carte) => {
 if (!humainPeutJouer) return
 setCarteSelectionnee(null)
 onJouerCarte(carte.id)
 }
 const handleJouerSelectionne = () => {
 if (carteSelectionnee) { onJouerCarte(carteSelectionnee); setCarteSelectionnee(null) }
 }
 const handleTrierMain = () => {
 setOrdreMain(trierMain(joueurHumain.main).map(c => c.id))
 }

 return (
 <div
 className="min-h-screen flex flex-col select-none overflow-hidden"
 style={{ background: 'linear-gradient(180deg,#0a2410 0%,#0d3320 50%,#0a2410 100%)' }}
 >
 {/* Score */}
 <PanneauScore state={state} onPause={onPause} />

 {/* Bandeau phase finale */}
 {state.phase === 'finale' && (
 <div className="bg-red-900/80 border-y border-red-500/40 px-4 py-1 text-center">
 <span className="text-red-300 text-xs font-bold tracking-widest uppercase">
 ⚡ Phase finale — Obligation de fournir la couleur
 </span>
 </div>
)}

 {/* Bandeau info / IA */}
 {(messageInfo || iaReflechit) && (
 <div className={`px-4 py-1 text-center text-xs border-b transition-all ${
 iaReflechit ? 'bg-blue-900/40 border-blue-500/20 text-blue-300' : 'bg-white/5 border-white/10 text-white/50'
 }`}>
 {iaReflechit && <span className="mr-2 animate-pulse">●</span>}
 {messageInfo}
 </div>
)}

 {/* Zone IA */}
 <div className="px-4 pt-3 pb-2 flex-shrink-0">
 <div className="flex items-center justify-between mb-1.5">
 <span className="text-xs text-white/30 font-medium flex items-center gap-1.5">
 🤖 {joueurIA.nom}
 {iaReflechit && <span className="text-blue-400 text-[10px] animate-pulse">réfléchit…</span>}
 </span>
 <span className="text-xs text-white/20 font-mono">
 {joueurIA.main.length + joueurIA.cartesEtalees.length} cartes
 </span>
 </div>
 <div className="flex flex-wrap gap-1.5 min-h-[62px]">
 {joueurIA.main.map(carte => (
 <CarteComponent
 key={carte.id}
 carte={{ ...carte, faceUp: false, etat: 'faceDown' }}
 taille="sm"
 />
))}
 {state.pliEnCours.carteJoueur1 && (
 <div className="ml-2 ring-2 ring-blue-400/40 rounded-lg">
 <CarteComponent
 carte={{ ...state.pliEnCours.carteJoueur1, faceUp: true, etat: 'played' }}
 taille="sm"
 />
 </div>
)}
 </div>
 {/* Cartes étalées IA — mariages et bésigues superposés */}
 {joueurIA.cartesEtalees.length > 0 && (
 <div className="mt-1.5">
 <span className="text-[9px] text-white/20 uppercase tracking-widest">Étalées IA</span>
 <div className="flex flex-wrap gap-2 mt-0.5 items-end">
 {grouperCartesEtalees(joueurIA.cartesEtalees, annonces, 1).map((groupe) => (
 <RenduGroupe
 key={groupe.type === 'mariage' ? `${groupe.roi.id}-${groupe.dame.id}`
 : groupe.type === 'besigue' ? `${groupe.dame.id}-${groupe.valet.id}`
 : groupe.carte.id}
 groupe={groupe}
 taille="sm"
 humainPeutJouer={false}
 carteSelectionnee={null}
 combisDisponibles={[]}
 onClick={() => {}}
 onDoubleClick={() => {}}
 />
))}
 </div>
 </div>
)}
 </div>

 <div className="mx-4 border-t border-white/10" />

 {/* Zone centrale */}
 <ZoneCentrale state={state} dernierPliVainqueur={dernierPliVainqueur} />

 <div className="mx-4 border-t border-white/10" />

 {/* Zone joueur humain */}
 <div className="px-4 pt-2 flex-shrink-0" style={{ paddingBottom: peutPasser ? '160px' : '12px' }}>
 <div className="flex items-center justify-between mb-1.5">
 <span className="text-xs text-white/50 font-medium">
 👤 {joueurHumain.nom} — {joueurHumain.main.length + joueurHumain.cartesEtalees.length} cartes
 </span>
 <div className="flex items-center gap-3">
 {carteSelectionnee && humainPeutJouer && (
 <button
 onClick={handleJouerSelectionne}
 className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-[#0a1628] text-xs font-bold rounded-lg cursor-pointer transition-colors"
 >
 ▶ Jouer
 </button>
)}
 <span className="text-xs text-white/30 font-mono">
 Brisques : {compterBrisques(joueurHumain.pileRemportee)}
 </span>
 </div>
 </div>

 {/* Main humain — glisser-déposer (Point C : appui long sur mobile,
 pour ne pas interférer avec un tap qui sélectionne/joue une carte)
 + tri automatique (Point F). Retour à la ligne multi-lignes, y
 compris sur écran mobile, à l'identique de l'affichage des dos de
 carte de l'IA ci-dessus (flex-wrap). */}
 <div className="flex items-center gap-2 mb-1">
 <span className="text-[10px] text-white/25 uppercase tracking-widest">Ma main</span>
 <button
 onClick={handleTrierMain}
 className="text-[10px] font-bold uppercase tracking-widest text-black bg-amber-400 hover:bg-amber-300 active:bg-amber-500 shadow-sm shadow-amber-400/30 rounded px-2.5 py-1 transition-colors"
 title="Trier la main par couleur puis par rang"
 >
 Trier ma main
 </button>
 </div>
 <Reorder.Group
 as="div"
 axis="x"
 values={ordreMain}
 onReorder={setOrdreMain}
 data-testid="main-joueur"
 className="flex flex-wrap gap-2 min-h-[100px]"
 >
 {mainOrdonnee.map(carte => {
 const estSelectionnee = carteSelectionnee === carte.id
 const etat = !humainPeutJouer ? 'disabled' : estSelectionnee ? 'selected' : 'faceUp'
 return (
 <CarteMainGlissable
 key={carte.id}
 carte={carte}
 etat={etat}
 taille={ecranMobile ? 'sm' : 'md'}
 ecranMobile={ecranMobile}
 onClick={humainPeutJouer ? handleClick : undefined}
 onDoubleClick={humainPeutJouer ? handleDoubleClick : undefined}
 />
)
 })}
 </Reorder.Group>

 {/* Cartes étalées humain — mariages et bésigues superposés, toutes cliquables */}
 {joueurHumain.cartesEtalees.length > 0 && (
 <div className="mt-2">
 <span className="text-[10px] text-white/25 uppercase tracking-widest">Étalées</span>
 <div className="flex flex-wrap gap-2 mt-1 items-end">
 {grouperCartesEtalees(joueurHumain.cartesEtalees, annonces, 0).map((groupe) => (
 <RenduGroupe
 key={groupe.type === 'mariage' ? `${groupe.roi.id}-${groupe.dame.id}`
 : groupe.type === 'besigue' ? `${groupe.dame.id}-${groupe.valet.id}`
 : groupe.carte.id}
 groupe={groupe}
 taille="sm"
 humainPeutJouer={humainPeutJouer}
 carteSelectionnee={carteSelectionnee}
 combisDisponibles={combisDisponibles}
 onClick={handleClick}
 onDoubleClick={handleDoubleClick}
 />
))}
 </div>
 </div>
)}
 </div>

 {/* Historique annonces */}
 <HistoriqueAnnonces annonces={annonces} />

 {/* Barre info */}
 <div className="flex items-center justify-between px-4 py-1 bg-black/20 border-t border-white/5 text-[10px] text-white/20 font-mono flex-shrink-0">
 <span>Manche {state.mancheNumero}</span>
 <span>Seuil {config.seuilVictoire.toLocaleString('fr-FR')} pts</span>
 <span>Pioche {state.pioche.length}</span>
 </div>

 {/* Panneau annonces (overlay bas) */}
 {peutPasser && combisDisponibles.length > 0 && (
 <AnnouncementPanel
 combisDisponibles={combisDisponibles}
 annonces={annonces}
 cartesJoueur={[...state.joueurs[0].main, ...state.joueurs[0].cartesEtalees]}
 onAnnoncer={onAnnoncer}
 onPasser={onPasser}
 />
)}
 </div>
)
}
