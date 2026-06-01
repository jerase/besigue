import React from 'react'
import { useGameEngine } from './hooks/useGameEngine'
import { EcranAccueil } from './screens/EcranAccueil'
import { EcranConfig } from './screens/EcranConfig'
import { EcranTable } from './screens/EcranTable'
import { EcranRegles } from './screens/EcranRegles'
import { EcranFinManche } from './screens/EcranFinManche'
import { EcranTutoriel } from './screens/EcranTutoriel'
import { MenuPause } from './screens/MenuPause'

function App() {
 const game = useGameEngine()
 const ecran = game.ecran

 return (
 <>
 {ecran === 'accueil' && (
 <EcranAccueil
 onNouvellePartie={game.allerConfig}
 onReprendrePartie={() => game.reprendrePartie()}
 onRegles={game.allerRegles}
 onTutoriel={game.allerTutoriel}
 />
)}
 {ecran === 'tutoriel' && (
 <EcranTutoriel onTerminer={game.allerConfig} />
)}
 {ecran === 'config' && (
 <EcranConfig onCommencer={game.demarrerPartie} onRetour={game.allerAccueil} />
)}
 {ecran === 'table' && game.state && game.config && (
 <EcranTable
 state={game.state}
 config={game.config}
 phaseUI={game.phaseUI}
 iaReflechit={game.iaReflechit}
 messageInfo={game.messageInfo}
 dernierPliVainqueur={game.dernierPliVainqueur}
 combisDisponibles={game.combisDisponibles}
 peutPasser={game.peutPasser}
 onPause={game.allerPause}
 onJouerCarte={game.jouerCarteHumain}
 onAnnoncer={game.annoncer}
 onPasser={game.passerAnnonce}
 />
)}
 {ecran === 'fin' && game.resultatManche && game.config && (
 <EcranFinManche
 resultat={game.resultatManche}
 config={game.config}
 onNouvelleManche={game.lancerNouvelleManche}
 onTerminer={game.abandonnerPartie}
 />
)}
 {ecran === 'pause' && (
 <MenuPause
 onReprendre={game.retourDepuisPause}
 onRegles={game.allerRegles}
 onAbandonner={game.abandonnerPartie}
 />
)}
 {ecran === 'regles' && (
 <EcranRegles onRetour={game.retourDepuisRegles} />
)}
 </>
)
}

export default App
