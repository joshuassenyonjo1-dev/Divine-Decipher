/**
 * Types & Interfaces for Bible Hangman
 */

export interface BibleWord {
  word: string;       // The word/name to guess (e.g., "ABRAHAM")
  category: string;   // e.g., "Character", "Place", "Book", "Object", "Concept", "Event"
  reference: string;  // Scripture reference (e.g., "Genesis 12:1")
  hint: string;       // Concise clue or definition
  fact: string;       // Engaging details or a fun fact about this biblical entry
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PlayerScore {
  name: string;
  score: number;
  roundsPlayed: number;
  correctGuesses: number;
  incorrectGuesses: number;
}

export type GameMode = 'solo' | 'coop' | 'pass-n-play';

export interface GameState {
  wordData: BibleWord;
  guessedLetters: string[];
  remainingGuesses: number;
  gameStatus: 'playing' | 'won' | 'lost';
  scoreAwarded: boolean;
  activePlayerIndex: number;
}
