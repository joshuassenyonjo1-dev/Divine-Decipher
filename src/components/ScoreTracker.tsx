import React, { useState } from 'react';
import { PlayerScore } from '../types';
import { Plus, Trash, User, Trophy, Flame } from 'lucide-react';

interface ScoreTrackerProps {
  players: PlayerScore[];
  activePlayerIndex?: number;
  isCoopMode: boolean;
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (index: number) => void;
  onResetScores: () => void;
}

export default function ScoreTracker({
  players,
  activePlayerIndex = 0,
  isCoopMode,
  onAddPlayer,
  onRemovePlayer,
  onResetScores
}: ScoreTrackerProps) {
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    onAddPlayer(newPlayerName.trim().substring(0, 15));
    setNewPlayerName('');
  };

  // Find the leader
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const highestScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : 0;

  return (
    <div 
      className="bg-stone-50/70 dark:bg-stone-900/30 border border-stone-200/50 dark:border-stone-800/80 p-5 rounded-2xl shadow-sm"
      id="score-tracker-card"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-serif text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Local Scribes
        </h3>
        {players.length > 0 && (
          <button
            onClick={onResetScores}
            className="text-[10px] text-stone-500 hover:text-red-500 dark:text-stone-400 dark:hover:text-red-400 border border-stone-200 dark:border-stone-800 px-2.5 py-1 rounded-lg hover:shadow-sm transition-all"
            id="reset-scores-button"
          >
            Reset Scores
          </button>
        )}
      </div>

      {players.length === 0 ? (
        <div className="text-center py-6 text-stone-500 dark:text-stone-400 text-xs">
          No scribe entered. Add players below to track stats!
        </div>
      ) : (
        <div className="space-y-2 mb-4 max-h-[220px] overflow-y-auto pr-1">
          {players.map((player, idx) => {
            const isCurrentScribe = isCoopMode && idx === activePlayerIndex;
            const isLeader = player.score > 0 && player.score === highestScore;

            return (
              <div
                key={idx}
                id={`player-${idx}`}
                className={`
                  flex items-center justify-between p-3 rounded-xl border transition-all duration-300
                  ${isCurrentScribe 
                    ? 'border-amber-400 dark:border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 scale-[1.02] shadow-sm' 
                    : 'border-stone-200/65 dark:border-stone-800 bg-white/50 dark:bg-stone-950/20'
                  }
                `}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div 
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${isCurrentScribe
                        ? 'bg-amber-500 text-white animate-pulse'
                        : isLeader
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                      }
                    `}
                  >
                    {isCurrentScribe ? '★' : player.name[0].toUpperCase()}
                  </div>
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-xs font-bold truncate ${isCurrentScribe ? 'text-amber-800 dark:text-amber-300' : 'text-stone-700 dark:text-stone-200'}`}>
                        {player.name}
                      </p>
                      {isCurrentScribe && (
                        <span className="bg-amber-500 text-white text-[8px] font-extrabold uppercase px-1 rounded">
                          Turn
                        </span>
                      )}
                      {isLeader && (
                        <span className="text-amber-500" title="Leading Scribe">
                          🏆
                        </span>
                      )}
                    </div>
                    {/* Tiny stats label */}
                    <p className="text-[10px] text-stone-500 dark:text-stone-400">
                      Rounds: {player.roundsPlayed} | Correct: {player.correctGuesses} | Wrong: {player.incorrectGuesses}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-stone-800 dark:text-stone-200">
                      {player.score} <span className="text-[9px] font-sans text-stone-400">pts</span>
                    </p>
                  </div>

                  <button
                    onClick={() => onRemovePlayer(idx)}
                    className="text-stone-400 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-stone-800 p-1 rounded-lg transition"
                    title={`Delete scribe ${player.name}`}
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form to Add Scribe */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="Scribe name..."
            maxLength={15}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-300 dark:bg-stone-950 dark:border-stone-850 text-stone-800 dark:text-stone-100 text-xs rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
            id="input-new-player-name"
          />
          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
        </div>
        <button
          type="submit"
          className="bg-stone-800 hover:bg-stone-700 dark:bg-stone-700 dark:hover:bg-stone-600 text-white p-1.5 rounded-xl transition flex items-center justify-center shadow-sm"
          title="Add player to scribe list"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
