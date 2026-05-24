// ============================================================
// ÉCRAN FIN DE MANCHE — IT-8 (compteur de manches)
// ============================================================

import React from 'react'
import type { ResultatManche } from '../core/finManche'
import type { GameConfig } from '../types'

interface EcranFinMancheProps {
  resultat: ResultatManche
  config: GameConfig
  onNouvelleManche: () => void
  onTerminer: () => void
}

export const EcranFinManche: React.FC<EcranFinMancheProps> = ({
  resultat, config, onNouvelleManche, onTerminer,
}) => {
  const {
    brisques, bonusDernierPli, vainqueurManche, enBasTable,
    charlesBezigue, scoreFinJ0, scoreFinJ1,
    compteurManches, vainqueurPartie, centPoints,
  } = resultat

  const nomJ0 = config.nomJoueur1
  const nomJ1 = config.nomJoueur2
  const partieTerminee = vainqueurPartie !== null

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">

        {/* ── Titre ── */}
        <div className="text-center mb-8">
          {partieTerminee ? (
            <>
              <div className="text-5xl mb-3">🏆</div>
              <h1 className="text-3xl font-bold text-amber-300" style={{ fontFamily: 'Georgia, serif' }}>
                {vainqueurPartie === 0 ? nomJ0 : nomJ1} remporte la partie !
              </h1>
              {centPoints && (
                <div className="mt-3 px-4 py-3 bg-amber-500/20 border border-amber-400/40 rounded-xl">
                  <p className="text-amber-300 font-bold text-xl">⭐ Cent Points !</p>
                  <p className="text-amber-200/70 text-sm mt-1">
                    Victoire 4 — 0{charlesBezigue ? ' dont un Charles Bézigue' : ''} — Honneur suprême du Bésigue
                  </p>
                </div>
              )}
            </>
          ) : vainqueurManche !== null ? (
            <>
              <div className="text-4xl mb-3">🎴</div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                {vainqueurManche === 0 ? nomJ0 : nomJ1} gagne la manche !
              </h1>
              {charlesBezigue && (
                <div className="mt-2 px-3 py-2 bg-rose-500/15 border border-rose-400/30 rounded-xl">
                  <p className="text-rose-300 font-bold text-sm">⚡ Charles Bézigue ! +2 points de manche</p>
                  <p className="text-rose-200/60 text-xs mt-0.5">L'adversaire n'avait pas atteint 750 pts</p>
                </div>
              )}
              <p className="text-white/50 text-sm mt-3">La partie continue…</p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-3">🔄</div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                Fin de manche — Nouvelle manche !
              </h1>
              <p className="text-white/50 text-sm mt-2">Aucun joueur n'a atteint 1 000 points</p>
            </>
          )}
        </div>

        {/* ── Compteur de manches ── */}
        <div className="bg-white/5 border border-white/15 rounded-2xl overflow-hidden mb-4">
          <div className="grid grid-cols-3 bg-white/10 px-4 py-3 text-xs font-bold text-white/40 uppercase tracking-widest">
            <span>Compteur manches</span>
            <span className="text-center">{nomJ0}</span>
            <span className="text-center">{nomJ1}</span>
          </div>
          <div className="grid grid-cols-3 px-4 py-4 items-center">
            <span className="text-sm text-white/50">Manches gagnées</span>
            <CompteurManche
              valeur={compteurManches[0]}
              estVainqueur={vainqueurPartie === 0}
              estVainqueurManche={vainqueurManche === 0}
            />
            <CompteurManche
              valeur={compteurManches[1]}
              estVainqueur={vainqueurPartie === 1}
              estVainqueurManche={vainqueurManche === 1}
            />
          </div>
          <div className="px-4 pb-3 text-center">
            <span className="text-[11px] text-white/25">Premier à 4 points (adversaire à 0) remporte la partie</span>
          </div>
        </div>

        {/* ── Tableau scores de la manche ── */}
        <div className="bg-white/5 border border-white/15 rounded-2xl overflow-hidden mb-6">

          {/* En-tête */}
          <div className="grid grid-cols-3 bg-white/10 px-4 py-3 text-xs font-bold text-white/40 uppercase tracking-widest">
            <span>Détail manche</span>
            <span className="text-center">{nomJ0}</span>
            <span className="text-center">{nomJ1}</span>
          </div>

          {/* Brisques */}
          <LigneScore
            label={`Brisques (${brisques.casEgalite ? 'égalité' : brisques.gagnantBrisques === 0 ? '▲ ' + nomJ0 : '▲ ' + nomJ1})`}
            valJ0={brisques.brisquesJ0}
            valJ1={brisques.brisquesJ1}
            unite=" brisques"
          />

          {/* Delta brisques */}
          <LigneScore
            label={brisques.casEgalite ? 'Bonus égalité brisques' : 'Résultat brisques'}
            valJ0={brisques.deltaJ0}
            valJ1={brisques.deltaJ1}
            delta
            accent={brisques.deltaJ0 !== 0 || brisques.deltaJ1 !== 0}
          />

          {/* Bonus dernier pli */}
          <LigneScore
            label="Bonus dernier pli"
            valJ0={bonusDernierPli === 0 ? 10 : 0}
            valJ1={bonusDernierPli === 1 ? 10 : 0}
            delta
          />

          {/* Séparateur */}
          <div className="border-t border-white/20 mx-4" />

          {/* Total */}
          <div className="grid grid-cols-3 px-4 py-4 items-center">
            <span className="text-sm font-bold text-white uppercase tracking-widest">Total manche</span>
            <ScoreTotal score={scoreFinJ0} estVainqueur={vainqueurManche === 0} />
            <ScoreTotal score={scoreFinJ1} estVainqueur={vainqueurManche === 1} />
          </div>
        </div>

        {/* Seuil info */}
        <p className="text-center text-white/30 text-xs mb-6">
          Seuil de manche : 1 000 points
        </p>

        {/* ── Boutons ── */}
        <div className="flex flex-col gap-3">
          {!partieTerminee && (
            <button
              onClick={onNouvelleManche}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-[#0a1628] font-bold text-lg rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/30"
            >
              🎴 Nouvelle manche
            </button>
          )}
          <button
            onClick={onTerminer}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all cursor-pointer ${
              partieTerminee
                ? 'bg-amber-500 hover:bg-amber-400 text-[#0a1628] shadow-lg shadow-amber-500/30'
                : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/15'
            }`}
          >
            {partieTerminee ? '🏠 Retour à l\'accueil' : '✕ Abandonner la partie'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Composants utilitaires ────────────────────────────────────

const CompteurManche: React.FC<{
  valeur: number
  estVainqueur: boolean
  estVainqueurManche: boolean
}> = ({ valeur, estVainqueur, estVainqueurManche }) => (
  <div className="text-center">
    <div className={`text-4xl font-bold tabular-nums ${
      estVainqueur ? 'text-amber-300' : estVainqueurManche ? 'text-emerald-300' : 'text-white/70'
    }`} style={{ fontFamily: 'Georgia, serif' }}>
      {valeur}
    </div>
    <div className="text-xs text-white/30 mt-0.5">/ 4</div>
    {/* Indicateur visuel des manches */}
    <div className="flex justify-center gap-1 mt-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            i < valeur
              ? estVainqueur ? 'bg-amber-400' : 'bg-emerald-400'
              : 'bg-white/15'
          }`}
        />
      ))}
    </div>
    {estVainqueur && <div className="text-amber-400 text-xs mt-1">🏆 Vainqueur</div>}
    {!estVainqueur && estVainqueurManche && <div className="text-emerald-400 text-xs mt-1">✓ Manche</div>}
  </div>
)

const LigneScore: React.FC<{
  label: string
  valJ0: number
  valJ1: number
  unite?: string
  delta?: boolean
  accent?: boolean
}> = ({ label, valJ0, valJ1, unite = ' pts', delta, accent }) => (
  <div className={`grid grid-cols-3 px-4 py-3 items-center border-b border-white/5 ${accent ? 'bg-amber-500/5' : ''}`}>
    <span className="text-xs text-white/50">{label}</span>
    <ValeurScore val={valJ0} unite={unite} delta={delta} accent={accent} />
    <ValeurScore val={valJ1} unite={unite} delta={delta} accent={accent} />
  </div>
)

const ValeurScore: React.FC<{ val: number; unite: string; delta?: boolean; accent?: boolean }> = ({
  val, unite, delta, accent,
}) => {
  const prefix = delta && val > 0 ? '+' : ''
  const color = delta
    ? val > 0 ? 'text-emerald-400' : val < 0 ? 'text-red-400' : 'text-white/30'
    : accent ? 'text-amber-300' : 'text-white/70'
  return (
    <span className={`text-center text-sm font-bold tabular-nums ${color}`}>
      {val === 0 && delta ? '—' : `${prefix}${val}${unite}`}
    </span>
  )
}

const ScoreTotal: React.FC<{ score: number; estVainqueur: boolean }> = ({ score, estVainqueur }) => (
  <div className="text-center">
    <span className={`text-2xl font-bold tabular-nums ${estVainqueur ? 'text-amber-300' : 'text-white/70'}`}
      style={{ fontFamily: 'Georgia, serif' }}>
      {score.toLocaleString('fr-FR')}
    </span>
    <span className="text-xs text-white/30 ml-1">pts</span>
    {estVainqueur && <div className="text-amber-400 text-xs mt-0.5">✓ Manche</div>}
  </div>
)

export default EcranFinManche
