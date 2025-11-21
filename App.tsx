
import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import GameOverModal from './components/GameOverModal';
import { GamePhase } from './types';
import { GAME_DURATION_MS } from './constants';
import { Clock } from 'lucide-react';

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.MENU);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Math.ceil(GAME_DURATION_MS / 1000));

  const handleScoreUpdate = (newScore: number) => {
    setScore(newScore);
  };

  const handleTimeUpdate = (seconds: number) => {
    setTimeLeft(seconds);
  };

  const handleGameOver = () => {
    setPhase(GamePhase.GAME_OVER);
  };

  const restartGame = () => {
    setScore(0);
    setPhase(GamePhase.PLAYING);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans text-gray-800 select-none">
      {/* Game Layer */}
      <div className="absolute inset-0 z-0">
        <GameCanvas
          phase={phase}
          setPhase={setPhase}
          onScoreUpdate={handleScoreUpdate}
          onTimeUpdate={handleTimeUpdate}
          onGameOver={handleGameOver}
        />
      </div>

      {/* HUD Layer */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-start pointer-events-none">
        {/* Score */}
        <div className="flex flex-col items-start">
          <div className="text-sm font-bold text-gray-500 tracking-widest uppercase">Score</div>
          <div className="text-5xl font-black text-gray-800 drop-shadow-sm mt-1">
            {score}
          </div>
        </div>

        {/* Center Instruction (Only visible when starting) */}
        {phase === GamePhase.PLAYING && score === 0 && (
           <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/10 backdrop-blur-md px-4 py-2 rounded-full text-xs font-medium text-gray-600 animate-pulse">
             Hold & Release to Jump
           </div>
        )}
        
        {/* Timer */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 text-gray-500">
             <Clock size={16} />
             <div className="text-sm font-bold tracking-widest uppercase">Time</div>
          </div>
          <div className={`text-5xl font-black mt-1 drop-shadow-sm tabular-nums ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
            {timeLeft}
          </div>
        </div>
      </div>

      {/* Start Screen */}
      {phase === GamePhase.MENU && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-gradient-to-b from-white/80 to-indigo-50/90 backdrop-blur-sm">
          <div className="mb-8 relative">
             {/* Simple Logo Graphic */}
             <div className="w-24 h-24 bg-indigo-600 rounded-2xl transform rotate-45 shadow-xl mx-auto flex items-center justify-center">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center">
                   <div className="w-8 h-8 bg-indigo-600 rounded-md"></div>
                </div>
             </div>
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-2">JUMP JUMP</h1>
          <p className="text-gray-500 mb-12 text-xl">Master the art of the leap</p>
          
          <button
            onClick={() => setPhase(GamePhase.PLAYING)}
            className="px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white text-2xl font-bold rounded-2xl shadow-indigo-500/30 shadow-xl transform transition hover:-translate-y-1 active:translate-y-0"
          >
            Start Game
          </button>
          
          <div className="mt-8 text-gray-400 text-sm flex items-center gap-2">
             <span>Powered by Gemini AI</span>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {phase === GamePhase.GAME_OVER && (
        <GameOverModal score={score} onRestart={restartGame} />
      )}
    </div>
  );
};

export default App;
