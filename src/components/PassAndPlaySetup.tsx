import React, { useState } from 'react';
import { BibleWord } from '../types';

interface PassAndPlaySetupProps {
  onWordCreated: (newWord: BibleWord) => void;
  onCancel: () => void;
  currentRound: number;
  creatorTeam: string;
  guesserTeam: string;
}

export default function PassAndPlaySetup({
  onWordCreated,
  onCancel,
  currentRound,
  creatorTeam,
  guesserTeam
}: PassAndPlaySetupProps) {
  const [word, setWord] = useState('');
  const [reference, setReference] = useState('');
  const [fact, setFact] = useState('');
  const [category, setCategory] = useState('Character');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [hideTyping, setHideTyping] = useState(true);
  const [errorCode, setErrorCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCode('');

    const cleanWord = word.trim().toUpperCase().replace(/[^A-Z]/g, '');

    if (cleanWord.length < 3) {
      setErrorCode('Word must consist of at least 3 letters.');
      return;
    }
    if (cleanWord.length > 15) {
      setErrorCode('Word must be 15 letters or fewer.');
      return;
    }

    const createdWord: BibleWord = {
      word: cleanWord,
      category,
      reference: reference.trim() || 'Local Custom Word',
      hint: 'A custom secret word.',
      fact: fact.trim() || 'Keep playing to discover more custom mysteries!',
      difficulty
    };

    onWordCreated(createdWord);
  };

  return (
    <div 
      className="max-w-md mx-auto bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xl"
      id="pass-n-play-form"
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-300 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
          Round {currentRound} Setup
        </div>
        <h3 className="font-serif text-2xl font-bold text-stone-800 dark:text-stone-100 mt-2">
          {creatorTeam} is Creator
        </h3>
        <p className="text-xs text-stone-500 mt-1 px-1">
          Pass the device to <strong className="text-amber-600 dark:text-amber-400 font-bold">{creatorTeam}</strong> to write a secret word for <strong className="text-stone-700 dark:text-stone-300 font-bold">{guesserTeam}</strong> to guess!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Secret Word */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Secret Word *
            </label>
            <button
              type="button"
              onClick={() => setHideTyping(!hideTyping)}
              className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline focus:outline-none"
            >
              {hideTyping ? 'Show Typing' : 'Hide Typing'}
            </button>
          </div>
          <input
            type={hideTyping ? 'password' : 'text'}
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="e.g. JERUSALEM"
            className="w-full px-4 py-2.5 bg-white dark:bg-stone-850 border border-stone-300 dark:border-stone-750 text-stone-800 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono tracking-widest text-center text-lg uppercase"
            maxLength={15}
            required
            id="input-secret-word"
          />
          <p className="text-[10px] text-stone-500 mt-1">
            Only letters A-Z (no spaces, numbers, or symbols).
          </p>
        </div>

        {/* Category Choice */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-stone-850 border border-stone-300 dark:border-stone-750 text-stone-800 dark:text-stone-100 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              id="select-custom-category"
            >
              <option value="Character">Character</option>
              <option value="Place">Place</option>
              <option value="Book">Book</option>
              <option value="Object">Object</option>
              <option value="Concept">Concept</option>
              <option value="Event">Event</option>
              <option value="Custom">Custom / Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Difficulty
            </label>
            <div className="flex rounded-xl border border-stone-300 dark:border-stone-750 overflow-hidden divide-x divide-stone-300 dark:divide-stone-750">
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
                  className={`flex-1 py-2 text-[10px] font-semibold uppercase focus:outline-none ${
                    difficulty === diff
                      ? 'bg-amber-500 text-white dark:bg-amber-600'
                      : 'bg-white dark:bg-stone-850 text-stone-600 dark:text-stone-300 hover:bg-stone-50'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scripture Reference */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            Scripture Reference (Optional)
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g., John 3:16, Genesis 1:1..."
            className="w-full px-3 py-2 bg-white dark:bg-stone-850 border border-stone-300 dark:border-stone-750 text-stone-800 dark:text-stone-100 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            id="input-custom-reference"
          />
        </div>

        {/* Fun Fact / Solution Reveal Detail */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            Theological Fact (Optional)
          </label>
          <textarea
            value={fact}
            onChange={(e) => setFact(e.target.value)}
            placeholder="Share an interesting Bible detail for when they solve it..."
            rows={2}
            className="w-full px-3 py-2 bg-white dark:bg-stone-850 border border-stone-300 dark:border-stone-750 text-stone-800 dark:text-stone-100 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
            maxLength={150}
            id="input-custom-fact"
          />
        </div>

        {errorCode && (
          <div className="p-3 bg-red-100 dark:bg-red-950/40 text-red-650 dark:text-red-400 text-xs rounded-xl text-center font-medium">
            {errorCode}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition shadow-md"
            id="submit-custom-word-btn"
          >
            Bless & Create
          </button>
        </div>
      </form>
    </div>
  );
}
