import React from 'react';

interface KeyboardProps {
  guessedLetters: string[];
  wordLetters: string[];
  onLetterSelect: (letter: string) => void;
  disabled: boolean;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function Keyboard({
  guessedLetters,
  wordLetters,
  onLetterSelect,
  disabled
}: KeyboardProps) {
  return (
    <div className="w-full max-w-2xl mx-auto mt-6" id="virtual-keyboard">
      <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 sm:gap-2 justify-center">
        {ALPHABET.map((letter) => {
          const isGuessed = guessedLetters.includes(letter);
          const isCorrect = isGuessed && wordLetters.includes(letter);
          const isIncorrect = isGuessed && !wordLetters.includes(letter);

          let keyClass = 'bg-white hover:bg-stone-100 text-stone-800 border-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 dark:border-stone-700 hover:shadow-sm';

          if (isCorrect) {
            keyClass = 'bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600 dark:border-emerald-700 shadow-sm font-semibold scale-95 opacity-85';
          } else if (isIncorrect) {
            keyClass = 'bg-stone-200 text-stone-400 line-through border-stone-300 dark:bg-stone-900 dark:text-stone-600 dark:border-stone-800 scale-95 opacity-50';
          }

          return (
            <button
              key={letter}
              id={`key-${letter}`}
              onClick={() => !isGuessed && !disabled && onLetterSelect(letter)}
              disabled={isGuessed || disabled}
              className={`
                aspect-square sm:aspect-auto sm:py-3 rounded-lg border text-sm sm:text-base font-medium 
                flex items-center justify-center transition-all duration-200 select-none
                ${keyClass}
                ${isGuessed ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'}
              `}
              title={isGuessed ? `Already guessed ${letter}` : `Guess ${letter}`}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
