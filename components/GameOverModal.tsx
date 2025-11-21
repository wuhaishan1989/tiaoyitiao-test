import React, { useEffect, useState } from 'react';
import { generateGameOverComment } from '../services/gemini';

interface GameOverModalProps {
  score: number;
  onRestart: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ score, onRestart }) => {
  const [comment, setComment] = useState<string>('Analyzing performance...');

  useEffect(() => {
    let isMounted = true;
    generateGameOverComment(score).then((text) => {
      if (isMounted) setComment(text);
    });
    return () => { isMounted = false; };
  }, [score]);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center transform transition-all scale-100">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Game Over</h2>
        <div className="text-6xl font-black text-indigo-600 mb-4">{score}</div>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-100">
          <p className="text-gray-600 italic text-lg leading-relaxed">
            "{comment}"
          </p>
          <div className="text-right mt-2">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">- Gemini Coach</span>
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-bold py-4 rounded-xl transition-colors shadow-lg active:transform active:scale-95"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default GameOverModal;
