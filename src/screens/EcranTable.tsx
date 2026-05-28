// ============================================================
// ÉCRAN TABLE — IT-4 (avec annonces)
// ============================================================

import React, { useState } from 'react'
import type { GameState, GameConfig, Carte, CombinaisonDisponible, AnnoncePosee } from '../types'
import { CarteComponent } from '../components/ui/Carte'
import { PanneauScore }   from '../components/ui/PanneauScore'
import { AnnouncementPanel, HistoriqueAnnonces } from '../components/ui/AnnouncementPanel'
import type { PhaseUI } from '../hooks/useGameEngine'

// ── Groupement des cartes étalées (mariages + bésigues superposés) ──

type GroupeEtalee =
  | { type: 'mariage'; roi: Carte; dame: Carte }
  | { type: 'besigue'; dame: Carte; valet: Carte }
  | { type: 'seule';   carte: Carte }

/**
 * Groupe les cartes étalées d'un joueur :
 * - paires de mariage (roi + dame) → superposées
 * - paires de bésigue (dame♠ + valet♦) → superposées
 * - toutes les autres cartes → isolées
 */
export function grouperCartesEtalees(
  cartesEtalees: Carte[],
  annonces: AnnoncePosee[],
  joueurId: 0 | 1
): GroupeEtalee[] {
  // --- Paires de mariage : [roiId, dameId]
  const pairesMarriage = annonces
    .filter(a =>
      a.joueurId === joueurId &&
      (a.nom === 'mariage_atout' || a.nom === 'mariage_hors_atout') &&
      a.cartesIds.length === 2
    )
    .map(a => ({ roiId: a.cartesIds[0], dameId: a.cartesIds[1] }))

  // --- Paires de bésigue : [dameId, valetId]  (ordre défini dans detecterBesigue)
  const pairesBesigue = annonces
    .filter(a =>
      a.joueurId === joueurId &&
      a.nom === 'besigue' &&
      a.cartesIds.length === 2
    )
    .map(a => ({ dameId: a.cartesIds[0], valetId: a.cartesIds[1] }))

  const dejaGroupees = new Set<string>()
  const groupes: GroupeEtalee[] = []

  for (const carte of cartesEtalees) {
    if (dejaGroupees.has(carte.id)) continue

    // 1. Chercher un mariage
    const paireMariage = pairesMarriage.find(
      p => p.roiId === carte.id || p.dameId === carte.id
    )
    if (paireMariage) {
      const autreId = paireMariage.roiId === carte.id ? paireMariage.dameId : paireMariage.roiId
      const autreCarte = cartesEtalees.find(c => c.id === autreId)
      if (autreCarte && !dejaGroupees.has(autreCarte.id)) {
        const roi  = carte.rang === 'K' ? carte : autreCarte
        const dame = carte.rang === 'Q' ? carte : autreCarte
        groupes.push({ type: 'mariage', roi, dame })
        dejaGroupees.add(roi.id)
        dejaGroupees.add(dame.id)
        continue
      }
    }

    // 2. Chercher un bésigue
    const paireBesigue = pairesBesigue.find(
      p => p.dameId === carte.id || p.valetId === carte.id
    )
    if (paireBesigue) {
      const autreId = paireBesigue.dameId === carte.id ? paireBesigue.valetId : paireBesigue.dameId
      const autreCarte = cartesEtalees.find(c => c.id === autreId)
      if (autreCarte && !dejaGroupees.has(autreCarte.id)) {
        const dame  = carte.rang === 'Q' ? carte : autreCarte
        const valet = carte.rang === 'J' ? carte : autreCarte
        groupes.push({ type: 'besigue', dame, valet })
        dejaGroupees.add(dame.id)
        dejaGroupees.add(valet.id)
        continue
      }
    }

    // 3. Carte isolée
    groupes.push({ type: 'seule', carte })
    dejaGroupees.add(carte.id)
  }

  return groupes
}

// ── Composant paire de mariage superposée ─────────────────────

interface CartesMarieeProps {
  roi: Carte
  dame: Carte
  taille: 'sm' | 'md'
  humainPeutJouer: boolean
  carteSelectionnee: string | null
  combisDisponibles: CombinaisonDisponible[]
  onClick: (carte: Carte) => void
  onDoubleClick: (carte: Carte) => void
}

const TAILLE_PX = { sm: { w: 52, h: 75 }, md: { w: 80, h: 116 } }
// Décalage vertical de la dame par rapport au roi (px)
const OFFSET_Y = { sm: 14, md: 20 }
// Décalage horizontal léger pour que les deux cartes soient visibles
const OFFSET_X = { sm: 8, md: 12 }

const CartesMariees: React.FC<CartesMarieeProps> = ({
  roi, dame, taille, humainPeutJouer,
  carteSelectionnee, combisDisponibles, onClick, onDoubleClick,
}) => {
  const { w, h } = TAILLE_PX[taille]
  const offY = OFFSET_Y[taille]
  const offX = OFFSET_X[taille]
  // La zone englobante doit contenir les deux cartes décalées
  const totalW = w + offX
  const totalH = h + offY

  const etatCarte = (carte: Carte) => {
    if (!humainPeutJouer) return 'disabled' as const
    if (carteSelectionnee === carte.id) return 'selected' as const
    if (combisDisponibles.some(c => c.cartesIds.includes(carte.id))) return 'highlighted' as const
    return 'faceUp' as const
  }

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: totalW, height: totalH }}
      title="Mariage (Roi + Dame)"
    >
      {/* Roi — en dessous, décalé en haut à gauche */}
      <div className="absolute" style={{ top: 0, left: 0, zIndex: 1 }}>
        <CarteComponent
          carte={{ ...roi, faceUp: true, etat: etatCarte(roi) }}
          taille={taille}
          onClick={humainPeutJouer ? onClick : undefined}
          onDoubleClick={humainPeutJouer ? onDoubleClick : undefined}
        />
      </div>
      {/* Dame — au-dessus, décalée en bas à droite */}
      <div className="absolute" style={{ top: offY, left: offX, zIndex: 2 }}>
        <CarteComponent
          carte={{ ...dame, faceUp: true, etat: etatCarte(dame) }}
          taille={taille}
          onClick={humainPeutJouer ? onClick : undefined}
          onDoubleClick={humainPeutJouer ? onDoubleClick : undefined}
        />
      </div>
    </div>
  )
}

// ── Composant bésigue superposé (valet♦ sur dame♠) ───────────

interface CartesBesigueProps {
  dame: Carte
  valet: Carte
  taille: 'sm' | 'md'
  humainPeutJouer: boolean
  carteSelectionnee: string | null
  combisDisponibles: CombinaisonDisponible[]
  onClick: (carte: Carte) => void
  onDoubleClick: (carte: Carte) => void
}

const CartesBesigue: React.FC<CartesBesigueProps> = ({
  dame, valet, taille, humainPeutJouer,
  carteSelectionnee, combisDisponibles, onClick, onDoubleClick,
}) => {
  const { w, h } = TAILLE_PX[taille]
  const offY = OFFSET_Y[taille]
  const offX = OFFSET_X[taille]
  const totalW = w + offX
  const totalH = h + offY

  const etatCarte = (carte: Carte) => {
    if (!humainPeutJouer) return 'disabled' as const
    if (carteSelectionnee === carte.id) return 'selected' as const
    if (combisDisponibles.some(c => c.cartesIds.includes(carte.id))) return 'highlighted' as const
    return 'faceUp' as const
  }

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: totalW, height: totalH }}
      title="Bésigue (Dame\u2660 + Valet\u2666)"
    >
      {/* Dame♠ — en dessous */}
      <div className="absolute" style={{ top: 0, left: 0, zIndex: 1 }}>
        <CarteComponent
          carte={{ ...dame, faceUp: true, etat: etatCarte(dame) }}
          taille={taille}
          onClick={humainPeutJouer ? onClick : undefined}
          onDoubleClick={humainPeutJouer ? onDoubleClick : undefined}
        />
      </div>
      {/* Valet♦ — au-dessus, décalé */}
      <div className="absolute" style={{ top: offY, left: offX, zIndex: 2 }}>
        <CarteComponent
          carte={{ ...valet, faceUp: true, etat: etatCarte(valet) }}
          taille={taille}
          onClick={humainPeutJouer ? onClick : undefined}
          onDoubleClick={humainPeutJouer ? onDoubleClick : undefined}
        />
      </div>
    </div>
  )
}

// ── Rendu d'un groupe étalé (factorisation mariage / bésigue / seule) ──

interface RenduGroupeProps {
  groupe: GroupeEtalee
  taille: 'sm' | 'md'
  humainPeutJouer: boolean
  carteSelectionnee: string | null
  combisDisponibles: CombinaisonDisponible[]
  onClick: (carte: Carte) => void
  onDoubleClick: (carte: Carte) => void
}

const RenduGroupe: React.FC<RenduGroupeProps> = ({
  groupe, taille, humainPeutJouer,
  carteSelectionnee, combisDisponibles, onClick, onDoubleClick,
}) => {
  const sharedProps = { taille, humainPeutJouer, carteSelectionnee, combisDisponibles, onClick, onDoubleClick }

  if (groupe.type === 'mariage') {
    return <CartesMariees roi={groupe.roi} dame={groupe.dame} {...sharedProps} />
  }
  if (groupe.type === 'besigue') {
    return <CartesBesigue dame={groupe.dame} valet={groupe.valet} {...sharedProps} />
  }

  const carte = groupe.carte
  const estSelectionnee = carteSelectionnee === carte.id
  const dansCombi = combisDisponibles.some(c => c.cartesIds.includes(carte.id))
  const etat = !humainPeutJouer
    ? 'disabled' as const
    : estSelectionnee ? 'selected' as const
    : dansCombi    ? 'highlighted' as const
    : 'faceUp' as const
  return (
    <CarteComponent
      carte={{ ...carte, faceUp: true, etat }}
      taille={taille}
      onClick={humainPeutJouer ? onClick : undefined}
      onDoubleClick={humainPeutJouer ? onDoubleClick : undefined}
    />
  )
}

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
  const joueurIA     = state.joueurs[1]

  // Pendant la phase annonce, on ne joue pas de carte
  const humainPeutJouer = phaseUI === 'attente_joueur' && !peutPasser
  const annonces = state.annonces ?? []

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
              {grouperCartesEtalees(joueurIA.cartesEtalees, annonces, 1).map((groupe, i) => (
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

        {/* Main humain */}
        <div className="flex flex-wrap gap-2 min-h-[100px]">
          {joueurHumain.main.map(carte => {
            const estSelectionnee = carteSelectionnee === carte.id
            const etat = !humainPeutJouer ? 'disabled' : estSelectionnee ? 'selected' : 'faceUp'
            return (
              <CarteComponent
                key={carte.id}
                carte={{ ...carte, faceUp: true, etat }}
                taille="md"
                onClick={humainPeutJouer ? handleClick : undefined}
                onDoubleClick={humainPeutJouer ? handleDoubleClick : undefined}
              />
            )
          })}
        </div>

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
        <span>Pioche {state.nbCartesRestantes}</span>
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

// ── Zone centrale ──────────────────────────────────────────────

const PIOCHE_MAX = 114

const JaugePioche: React.FC<{ nbCartes: number }> = ({ nbCartes }) => {
  const pct = Math.max(0, Math.min(1, nbCartes / PIOCHE_MAX))
  const hue = Math.round(pct * 120)
  const couleurJauge = `hsl(${hue}, 70%, 45%)`
  const couleurTexte = `hsl(${hue}, 80%, 65%)`
  const couleurGlow  = `hsl(${hue}, 70%, 40%)`
  const estVide = nbCartes === 0
  const layers = Math.min(4, Math.ceil(nbCartes / 30))

  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      {estVide ? (
        <div className="w-14 h-16 rounded-lg border-2 border-dashed border-white/12 flex items-center justify-center">
          <span className="text-white/20 text-[10px]">Vide</span>
        </div>
      ) : (
        <div className="relative w-14 h-16">
          {Array.from({ length: layers }).map((_, i) => (
            <div key={i} className="absolute rounded-lg bg-[#1e3a6b] border border-[#2d5aa0]"
              style={{ width: 56, height: 62, top: -(i * 1.5), left: i, zIndex: i }} />
          ))}
          <div className="absolute inset-0 rounded-lg bg-[#1e3a6b] border border-[#4a7fd4] z-10 flex items-center justify-center">
            <span className="text-[#4a7fd4] text-lg opacity-50">♦</span>
          </div>
        </div>
      )}
      <div className="w-full flex flex-col items-center gap-0.5">
        <div
          className="w-full h-3 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          title={`${nbCartes} / ${PIOCHE_MAX} cartes`}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct * 100}%`,
              background: couleurJauge,
              boxShadow: pct > 0 ? `0 0 6px ${couleurGlow}` : 'none',
            }}
          />
        </div>
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color: estVide ? 'rgba(255,255,255,0.25)' : couleurTexte }}
        >
          {nbCartes}
          <span className="text-[9px] font-normal opacity-60 ml-0.5">/ {PIOCHE_MAX}</span>
        </span>
      </div>
    </div>
  )
}

const ZoneCentrale: React.FC<{
  state: GameState
  dernierPliVainqueur: (0 | 1) | null
}> = ({ state, dernierPliVainqueur }) => {
  const { pliEnCours, nbCartesRestantes, couleurAtout } = state
  const c0 = pliEnCours.carteJoueur0
  const c1 = pliEnCours.carteJoueur1
  const isRouge = couleurAtout === 'hearts' || couleurAtout === 'diamonds'

  return (
    <div className="flex items-center justify-center gap-6 py-3 px-4 flex-shrink-0">
      <SlotCarte label="Vous" carte={c0} estVainqueur={dernierPliVainqueur === 0} />

      <div className="flex flex-col items-center gap-1.5 min-w-24">
        <JaugePioche nbCartes={nbCartesRestantes} />
        {couleurAtout ? (
          <div className="text-center leading-tight">
            <span className="text-[9px] text-white/20 block uppercase tracking-wider">Atout</span>
            <span className="text-xl font-bold" style={{ color: isRouge ? '#e74c3c' : '#ecf0f1' }}>
              {couleurAtout === 'hearts' ? '♥' : couleurAtout === 'diamonds' ? '♦' : couleurAtout === 'spades' ? '♠' : '♣'}
            </span>
          </div>
        ) : (
          <span className="text-[9px] text-white/15 italic">Atout ?</span>
        )}
      </div>

      <SlotCarte label="IA" carte={c1} estVainqueur={dernierPliVainqueur === 1} />
    </div>
  )
}

const SlotCarte: React.FC<{ label: string; carte: Carte | null; estVainqueur: boolean }> = ({
  label, carte, estVainqueur,
}) => (
  <div className="flex flex-col items-center gap-1">
    <span className={`text-[10px] uppercase tracking-widest ${estVainqueur ? 'text-amber-400 font-bold' : 'text-white/25'}`}>
      {estVainqueur ? '★ ' : ''}{label}
    </span>
    {carte ? (
      <div className={estVainqueur ? 'ring-2 ring-amber-400/50 rounded-lg' : ''}>
        <CarteComponent carte={{ ...carte, etat: 'played' }} taille="md" />
      </div>
    ) : (
      <div className="w-20 h-[116px] rounded-lg border-2 border-dashed border-white/8 flex items-center justify-center">
        <span className="text-white/12 text-xs">—</span>
      </div>
    )}
  </div>
)

const PiocheVisuel: React.FC<{ nbCartes: number }> = ({ nbCartes }) => {
  if (nbCartes === 0) {
    return (
      <div className="w-14 h-20 rounded-lg border-2 border-dashed border-white/12 flex items-center justify-center">
        <span className="text-white/20 text-[10px]">Vide</span>
      </div>
    )
  }
  const layers = Math.min(4, Math.ceil(nbCartes / 30))
  return (
    <div className="relative w-14 h-20">
      {Array.from({ length: layers }).map((_, i) => (
        <div key={i} className="absolute rounded-lg bg-[#1e3a6b] border border-[#2d5aa0]"
          style={{ width: 56, height: 78, top: -(i * 1.5), left: i, zIndex: i }} />
      ))}
      <div className="absolute inset-0 rounded-lg bg-[#1e3a6b] border border-[#4a7fd4] z-10 flex items-center justify-center">
        <span className="text-[#4a7fd4] text-xl opacity-50">♦</span>
      </div>
    </div>
  )
}

function compterBrisques(pile: Carte[]): number {
  return pile.filter(c => c.rang === 'A' || c.rang === '10').length
}

export default EcranTable
