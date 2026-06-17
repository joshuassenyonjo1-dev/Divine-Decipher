import React from 'react';

interface WordPlaceholderProps {
  word: string;
  guessedLetters: string[];
  revealAll: boolean;
}

export default function WordPlaceholder({
  word,
  guessedLetters,
  revealAll
}: WordPlaceholderProps) {
  const letters = word.toUpperCase().split('');

  return (
    <div 
      className="flex flex-wrap gap-2 sm:gap-3 justify-center items-center my-6 py-4 select-none"
      id="word-placeholder-container"
    >
      {letters.map((char, idx) => {
        const isLetter = /[A-Z]/.test(char);
        const isGuessed = guessedLetters.includes(char);
        const shouldShow = !isLetter || isGuessed || revealAll;
        const wasMissed = isLetter && !isGuessed && revealAll;

        return (
          <div
            key={idx}
            className="flex flex-col items-center justify-end"
            id={`placeholder-char-${idx}`}
          >
            {/* The revealed letter */}
            <span
              className={`
                text-2xl sm:text-4xl font-bold tracking-widest font-mono select-none
                min-h-[32px] sm:min-h-[44px] min-w-[20px] sm:min-w-[30px] text-center
                transition-all duration-500 transform
                ${shouldShow ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3'}
                ${wasMissed ? 'text-red-500 dark:text-red-400 font-medium' : isGuessed ? 'text-amber-600 dark:text-amber-400' : 'text-stone-800 dark:text-stone-100'}
              `}
            >
              {isLetter ? (shouldShow ? char : '') : char}
            </span>

            {/* Underline slot indicator */}
            <div
              className={`
                h-1 w-6 sm:w-8 mt-1 rounded-sm transition-colors duration-300
                ${!isLetter ? 'bg-transparent' : wasMissed ? 'bg-red-400/50 dark:bg-red-900/40' : isGuessed ? 'bg-amber-500 dark:bg-amber-600' : 'bg-stone-300 dark:bg-stone-700'}
              `}
            />
          </div>
        );
      })}
    </div>
  );
}
