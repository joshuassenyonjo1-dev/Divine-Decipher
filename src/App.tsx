import React, { useState, useEffect, useCallback } from 'react';
import { BibleWord, PlayerScore, GameMode, GameState } from './types';
import { getRandomLocalWord } from './wordsData';
import HangmanDrawing from './components/HangmanDrawing';
import WordPlaceholder from './components/WordPlaceholder';
import Keyboard from './components/Keyboard';
import ScoreTracker from './components/ScoreTracker';
import PassAndPlaySetup from './components/PassAndPlaySetup';
import { 
  Sparkles, 
  HelpCircle, 
  RotateCcw, 
  Play, 
  BookOpen, 
  Info, 
  CheckCircle, 
  AlertCircle,
  Award,
  Users,
  Lightbulb,
  CornerDownRight,
  ChevronRight,
  UserCheck
} from 'lucide-react';

const STORAGE_KEYS = {
  PLAYERS: 'bible_hangman_players_v1',
  SCORES: 'bible_hangman_scores_v1',
  DUEL: 'bible_hangman_duel_v1'
};

export default function App() {
  // --- Game Mode & Settings ---
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [wordSource, setWordSource] = useState<'ai' | 'local'>('local');
  const [isAiSupported, setIsAiSupported] = useState(true);
  const [isAiQuotaExceeded, setIsAiQuotaExceeded] = useState(false);

  // --- Local Player Registry (Scores & Stats) ---
  const [players, setPlayers] = useState<PlayerScore[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PLAYERS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse stored players:', e);
    }
    // Default initial players
    return [
      { name: 'Peter', score: 0, roundsPlayed: 0, correctGuesses: 0, incorrectGuesses: 0 },
      { name: 'Mary', score: 0, roundsPlayed: 0, correctGuesses: 0, incorrectGuesses: 0 }
    ];
  });

  // --- Pass & Play Duel Scores ---
  const [passPlayScores, setPassPlayScores] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DUEL);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse stored duel scores:', e);
    }
    return { teamA: 0, teamB: 0 };
  });

  const [passPlayRound, setPassPlayRound] = useState(() => {
    try {
      const stored = localStorage.getItem('bible_hangman_pass_play_round_v1');
      if (stored) {
        return parseInt(stored, 10);
      }
    } catch (e) {}
    return 1;
  });

  // --- Applet UI Controls ---
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isPassNPlaySetup, setIsPassNPlaySetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revealedFacts, setRevealedFacts] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // --- History of Played Words (Avoid repetition) ---
  const [playedWords, setPlayedWords] = useState<string[]>([]);

  // --- Scripture Study Deep Passage states ---
  const [passageText, setPassageText] = useState<string | null>(null);
  const [passageLoading, setPassageLoading] = useState(false);
  const [passageError, setPassageError] = useState<string | null>(null);
  const [passageTranslation, setPassageTranslation] = useState<string | null>(null);

  const fetchBiblePassage = async (reference: string) => {
    if (!reference || reference === 'Local Custom Word') return;
    setPassageLoading(true);
    setPassageError(null);
    try {
      const response = await fetch(`/api/passage?reference=${encodeURIComponent(reference)}`);
      if (!response.ok) {
        throw new Error('Could not fetch passage.');
      }
      const data = await response.json();
      if (data && data.text) {
        setPassageText(data.text);
        setPassageTranslation(data.translation || 'WEB');
      } else {
        throw new Error('Passage field not found.');
      }
    } catch (err: any) {
      console.error(err);
      setPassageError('Passage text currently unavailable. Feel free to search key verses yourself!');
    } finally {
      setPassageLoading(false);
    }
  };

  // --- Active Game Session State ---
  const [gameState, setGameState] = useState<GameState>({
    wordData: {
      word: 'JESUS',
      category: 'Character',
      reference: 'Matthew 1:21',
      hint: 'The Savior, whose name means "Yahweh is salvation"',
      fact: 'Born in Bethlehem, raised in Nazareth, He represents the central figure of the New Testament.',
      difficulty: 'easy'
    },
    guessedLetters: [],
    remainingGuesses: 6,
    gameStatus: 'playing',
    scoreAwarded: false,
    activePlayerIndex: 0
  });

  // Keep track of the server connection
  const [serverId, setServerId] = useState<string>('detecting');

  // Sync players list to Local Storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
  }, [players]);

  // Sync pass Play duel scores and round to Local Storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DUEL, JSON.stringify(passPlayScores));
  }, [passPlayScores]);

  useEffect(() => {
    localStorage.setItem('bible_hangman_pass_play_round_v1', passPlayRound.toString());
  }, [passPlayRound]);

  // Check if server is running and what mode we are using
  useEffect(() => {
    fetch('/api/word?difficulty=easy')
      .then(res => res.json())
      .then(data => {
        if (data && data.word) {
          console.log('Server verified successfully.');
          setServerId('online');
          if (data.source === 'local_fallback_quota') {
            setIsAiQuotaExceeded(true);
            setWordSource('local');
          } else if (data.source === 'gemini') {
            setWordSource('ai');
          }
        }
      })
      .catch(err => {
        console.warn('Server endpoint error or pending start. Defaulting to local mode.', err);
        setServerId('local-only');
        setWordSource('local');
        setIsAiSupported(false);
      });
  }, []);

  /**
   * Loads a fresh random word either from our node backend or our secure local fallback lists.
   */
  const loadNewWord = useCallback(async (selectedDifficulty = difficulty, sourcePref = wordSource) => {
    setLoading(true);
    setMessage(null);
    setRevealedFacts(false);
    setPassageText(null);
    setPassageError(null);
    setPassageTranslation(null);

    const excludeParam = playedWords.join(',');
    const fallbackWord = getRandomLocalWord(selectedDifficulty);

    try {
      const response = await fetch(
        `/api/word?difficulty=${selectedDifficulty}&mode=${sourcePref}&exclude=${excludeParam}`
      );
      if (!response.ok) {
        throw new Error('Word fetching failed');
      }
      const data: BibleWord & { source?: string } = await response.json();
      
      if (data && data.word) {
        setGameState(prev => ({
          wordData: {
            word: data.word.toUpperCase().replace(/[^A-Z]/g, ''),
            category: data.category || 'Theme',
            reference: data.reference || 'Holy Bible',
            hint: data.hint || 'Mystery word from scripture.',
            fact: data.fact || 'Unlock this entry to read historical descriptions.',
            difficulty: data.difficulty || 'medium'
          },
          guessedLetters: [],
          remainingGuesses: 6,
          gameStatus: 'playing',
          scoreAwarded: false,
          activePlayerIndex: prev.activePlayerIndex % (players.length || 1)
        }));

        // Log word source and handle quota exceeded signal
        if (data.source === 'local_fallback_quota') {
          setIsAiQuotaExceeded(true);
          console.log(`Word loaded from local offline archive due to Gemini API rate-limits: "${data.word}"`);
        } else if (data.source === 'gemini') {
          setIsAiQuotaExceeded(false);
          console.log(`Word generated dynamically by Gemini: "${data.word}"`);
        } else {
          console.log(`Loaded static word: "${data.word}"`);
        }
      } else {
        throw new Error('Null word payload');
      }
    } catch (err) {
      console.warn('Network issue or offline client. Loading directly from local archive.', err);
      
      setGameState(prev => ({
        wordData: fallbackWord,
        guessedLetters: [],
        remainingGuesses: 6,
        gameStatus: 'playing',
        scoreAwarded: false,
        activePlayerIndex: prev.activePlayerIndex % (players.length || 1)
      }));
    } finally {
      setLoading(false);
    }
  }, [difficulty, wordSource, playedWords, players.length]);

  // Initial load
  useEffect(() => {
    loadNewWord(difficulty, wordSource);
  }, []);

  /**
   * Triggers turn/score updates when a game completes (Win or Loss).
   */
  const handleGameEnd = useCallback((status: 'won' | 'lost') => {
    if (gameState.scoreAwarded) return;

    const word = gameState.wordData.word;
    
    // Track played words history to avoid repeats in this active session
    setPlayedWords(prev => {
      const next = [...prev, word];
      if (next.length > 50) next.shift(); // Keep rotating cap
      return next;
    });

    if (gameMode === 'solo') {
      // Single Player Scorekeeping
      if (status === 'won') {
        const bonus = difficulty === 'hard' ? 25 : difficulty === 'medium' ? 15 : 10;
        setMessage({ text: `Praiseworthy! Correctly decoded. +${bonus} Scripture insights!`, type: 'success' });
      } else {
        setMessage({ text: `Gallows complete! The scripture mystery was: "${word}"`, type: 'error' });
      }
    } else if (gameMode === 'coop' && players.length > 0) {
      // Take Turns Co-op Multiplayer Scorekeeping (score depends strictly on correct/incorrect letter guesses, no end-of-round bonuses)
      setPlayers(prevPlayers => {
        return prevPlayers.map((p) => {
          return {
            ...p,
            roundsPlayed: p.roundsPlayed + 1
          };
        });
      });

      if (status === 'won') {
        const mvpName = players[gameState.activePlayerIndex]?.name || 'Current Player';
        setMessage({ 
          text: `Divine Triumph! ${mvpName} solved the mystery!`, 
          type: 'success' 
        });
      } else {
        setMessage({ 
          text: `Gallows complete! The mystery word was: "${word}"`, 
          type: 'error' 
        });
      }
    } else if (gameMode === 'pass-n-play') {
      // Team A vs Team B alternating Creator roles setup
      const creatorTeamName = passPlayRound % 2 !== 0 ? 'Team A' : 'Team B';
      const guesserTeamName = passPlayRound % 2 !== 0 ? 'Team B' : 'Team A';

      if (status === 'won') {
        // Guesser wins
        setPassPlayScores(prev => {
          const next = { ...prev };
          if (passPlayRound % 2 !== 0) {
            next.teamB += 1;
          } else {
            next.teamA += 1;
          }
          return next;
        });
        setMessage({ text: `Triumph! ${guesserTeamName} solved the secret word! (+1 Point)`, type: 'success' });
      } else {
        // Creator wins
        setPassPlayScores(prev => {
          const next = { ...prev };
          if (passPlayRound % 2 !== 0) {
            next.teamA += 1;
          } else {
            next.teamB += 1;
          }
          return next;
        });
        setMessage({ text: `Stumped! ${creatorTeamName} created a word that couldn't be solved! Word: "${word}" (+1 Point)`, type: 'error' });
      }
    }

    setGameState(prev => ({ ...prev, scoreAwarded: true }));
    setRevealedFacts(true); // Automatically show educational bible fact on round completion!
  }, [gameMode, gameState.wordData.word, gameState.activePlayerIndex, gameState.scoreAwarded, players, difficulty, passPlayRound]);

  /**
   * Action handler when a letter is guessed (either clicked on keyboard, or typed physically).
   */
  const makeGuess = useCallback((letter: string) => {
    if (gameState.gameStatus !== 'playing' || loading) return;

    const formattedLetter = letter.toUpperCase();
    if (gameState.guessedLetters.includes(formattedLetter)) return;

    const isCorrect = gameState.wordData.word.includes(formattedLetter);
    const nextGuessed = [...gameState.guessedLetters, formattedLetter];
    
    // Calculate remaining misses
    const incorrectGuesses = nextGuessed.filter(l => !gameState.wordData.word.includes(l)).length;
    const nextGuessesRemaining = 6 - incorrectGuesses;

    // Check if player won
    const wordLetters = gameState.wordData.word.split('');
    const hasWon = wordLetters.every(char => !/[A-Z]/.test(char) || nextGuessed.includes(char));
    const hasLost = nextGuessesRemaining <= 0;

    const nextStatus = hasWon ? 'won' : hasLost ? 'lost' : 'playing';

    // Update Individual Turn Statistics if Co-op Multiplayer
    if (gameMode === 'coop' && players.length > 0) {
      setPlayers(prevPlayers => {
        return prevPlayers.map((p, idx) => {
          if (idx === gameState.activePlayerIndex) {
            return {
              ...p,
              correctGuesses: p.correctGuesses + (isCorrect ? 1 : 0),
              incorrectGuesses: p.incorrectGuesses + (isCorrect ? 0 : 1),
              score: Math.max(0, p.score + (isCorrect ? 20 : -10))
            };
          }
          return p;
        });
      });
    }

    // Turn transition or rotation logic for Co-op Mode
    let nextPlayerIndex = gameState.activePlayerIndex;
    if (gameMode === 'coop' && !isCorrect && nextStatus === 'playing' && players.length > 0) {
      // Rotate to next player on incorrect guess!
      nextPlayerIndex = (gameState.activePlayerIndex + 1) % players.length;
    }

    setGameState(prev => ({
      ...prev,
      guessedLetters: nextGuessed,
      remainingGuesses: nextGuessesRemaining,
      gameStatus: nextStatus,
      activePlayerIndex: nextPlayerIndex
    }));
  }, [gameState, loading, gameMode, players.length]);

  // Monitor game state changes to trigger ending conditions
  useEffect(() => {
    if (gameState.gameStatus === 'won') {
      handleGameEnd('won');
    } else if (gameState.gameStatus === 'lost') {
      handleGameEnd('lost');
    }
  }, [gameState.gameStatus, handleGameEnd]);

  // --- Physical Keyboard Event Listener ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const char = e.key.toUpperCase();
      if (/^[A-Z]$/.test(char) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Ensure no inputs elements or setup overlays are currently focused
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea' && !isPassNPlaySetup) {
          e.preventDefault();
          makeGuess(char);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [makeGuess, isPassNPlaySetup]);

  // --- Setup for Custom Word (Pass & Play) ---
  const startPassAndPlayCustom = () => {
    setIsPassNPlaySetup(true);
    if (gameState.gameStatus !== 'playing') {
      setPassPlayRound(prev => prev + 1);
    }
  };

  const handleCustomWordCreated = (customWord: BibleWord) => {
    setIsPassNPlaySetup(false);
    setPassageText(null);
    setPassageError(null);
    setPassageTranslation(null);
    setGameState({
      wordData: customWord,
      guessedLetters: [],
      remainingGuesses: 6,
      gameStatus: 'playing',
      scoreAwarded: false,
      activePlayerIndex: 0
    });
    const creatorTeam = passPlayRound % 2 !== 0 ? 'Team A' : 'Team B';
    const guesserTeam = passPlayRound % 2 !== 0 ? 'Team B' : 'Team A';
    setMessage({ 
      text: `Secret word successfully set by ${creatorTeam}! Pass the device. ${guesserTeam}, it's your turn to decipher it!`, 
      type: 'info' 
    });
    setRevealedFacts(false);
  };

  // --- Multiplayer Management Handlers ---
  const handleAddPlayer = (name: string) => {
    setPlayers(prev => {
      // Avoid duplicate player names
      if (prev.some(p => p.name.toLowerCase() === name.toLowerCase())) return prev;
      return [...prev, { name, score: 0, roundsPlayed: 0, correctGuesses: 0, incorrectGuesses: 0 }];
    });
  };

  const handleRemovePlayer = (index: number) => {
    setPlayers(prev => {
      const next = prev.filter((_, idx) => idx !== index);
      // Reset active player index if boundary exceeded
      if (gameState.activePlayerIndex >= next.length) {
        setGameState(g => ({ ...g, activePlayerIndex: 0 }));
      }
      return next;
    });
  };

  const handleResetScores = () => {
    setPlayers(p => p.map(player => ({ ...player, score: 0, roundsPlayed: 0, correctGuesses: 0, incorrectGuesses: 0 })));
    setPassPlayScores({ teamA: 0, teamB: 0 });
    setPassPlayRound(1);
  };

  const toggleGameMode = (mode: GameMode) => {
    setGameMode(mode);
    setPlayedWords([]);
    setMessage(null);
    setRevealedFacts(false);
    
    if (mode === 'pass-n-play') {
      setIsPassNPlaySetup(true);
      setPassPlayRound(1);
      setPassPlayScores({ teamA: 0, teamB: 0 });
    } else {
      setIsPassNPlaySetup(false);
      // Immediately pull fresh word matching parameters
      loadNewWord(difficulty, wordSource);
    }
  };

  const handleDifficultyChange = (diff: 'easy' | 'medium' | 'hard') => {
    setDifficulty(diff);
    if (gameMode !== 'pass-n-play') {
      loadNewWord(diff, wordSource);
    }
  };

  const handleWordSourceChange = (src: 'ai' | 'local') => {
    setWordSource(src);
    if (gameMode !== 'pass-n-play') {
      loadNewWord(difficulty, src);
    }
  };

  // Extract variables for render
  const currentWord = gameState.wordData.word;
  const wordLetters = currentWord.split('');
  const isFinished = gameState.gameStatus !== 'playing';
  const hasWon = gameState.gameStatus === 'won';
  const missesCount = 6 - gameState.remainingGuesses;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* HEADER BAR */}
      <header className="py-4 px-6 border-b border-stone-200 dark:border-stone-900 bg-white/75 dark:bg-stone-950/75 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center border border-amber-500/40">
              <BookOpen className="w-5.5 h-11 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="font-serif text-xl sm:text-2xl font-extrabold tracking-wide uppercase text-stone-900 dark:text-stone-100 flex items-center justify-center sm:justify-start gap-1">
                Divine <span className="text-amber-600 dark:text-amber-400 font-sans tracking-normal">Decipher</span>
              </h1>
              <p className="text-[10px] text-stone-500 max-w-[280px] sm:max-w-md">
                Unscramble sacred vocabulary, characters, and books, and discover scripture history details.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Helpful Guide Toggle */}
            <button
              onClick={() => setShowHowToPlay(!showHowToPlay)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-stone-200 dark:border-stone-850 bg-stone-50 hover:bg-stone-100 dark:bg-stone-900 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition shadow-xs"
              id="how-to-play-btn"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>How To Play</span>
            </button>

            {/* AI Capability indicator pill */}
            <div className="flex items-center gap-1.5 mx-1 px-2.5 py-1 rounded-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-850">
              <div className={`w-2 h-2 rounded-full ${
                isAiQuotaExceeded 
                  ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]' 
                  : serverId === 'online' 
                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' 
                    : 'bg-stone-400'
              }`} />
              <span className="text-[9px] font-mono font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider" title="Express Web connection status">
                {isAiQuotaExceeded 
                  ? 'AI Resting (Local Active)' 
                  : serverId === 'online' 
                    ? 'Gemini AI Active' 
                    : 'Standard Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* CORE CONTENT */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-6 px-4 sm:px-6">
        
        {/* HOW TO PLAY PANEL BANNER (Conditional Slide In) */}
        {showHowToPlay && (
          <div 
            className="mb-6 p-5 bg-amber-500/10 border border-amber-300 dark:border-amber-900/50 rounded-2xl text-stone-700 dark:text-stone-300 transition-all text-xs"
            id="how-to-play-panel"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-serif font-bold text-sm text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                Scripture Scribe Rules
              </h3>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 text-xs font-bold font-mono"
              >
                ✕ Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1 bg-white/40 dark:bg-stone-950/20 p-3 rounded-xl border border-stone-220/20">
                <p className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-amber-500/15 flex items-center justify-center text-[10px] font-sans">1</span>
                  Solo mode
                </p>
                <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed">
                  Decipher random words selected from our vast scripture archive. Earn points based on selected difficulty, view detailed lessons, and expand your biblical knowledge.
                </p>
              </div>
              <div className="space-y-1 bg-white/40 dark:bg-stone-950/20 p-3 rounded-xl border border-stone-220/20">
                <p className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-amber-500/15 flex items-center justify-center text-[10px] font-sans">2</span>
                  Take Turns Co-op
                </p>
                <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed">
                  2 or more players take turns guessing letters. It is highly competitive: every correct letter awards <strong>+20 points</strong> and you KEEP your turn. Incorrect letters deduct <strong>-10 points</strong> and transfer the turn to the next player!
                </p>
              </div>
              <div className="space-y-1 bg-white/40 dark:bg-stone-950/20 p-3 rounded-xl border border-stone-220/20">
                <p className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-amber-500/15 flex items-center justify-center text-[10px] font-sans">3</span>
                  Pass & Play Custom
                </p>
                <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed">
                  One player writes a custom scripture word and lists clues. Hand the device over to a friend and watch them attempt to solve your custom riddle! Keep track of wins/losses.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CONTROLS BAR (MODES, DIFFICULTIES, AI SETTINGS) */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-900 px-4 py-3 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          
          {/* Game Modes Tab Segment */}
          <div className="flex bg-stone-100 dark:bg-stone-950 p-1.5 rounded-xl border border-stone-200/55 dark:border-stone-800/60 w-full md:w-auto" id="mode-tab-bar">
            {(['solo', 'coop', 'pass-n-play'] as const).map((mode) => {
              const isActive = gameMode === mode;
              const label = mode === 'solo' 
                ? 'Solo Study' 
                : mode === 'coop' 
                  ? 'Co-op Take Turns' 
                  : 'Pass & Play';
              return (
                <button
                  key={mode}
                  id={`mode-tab-${mode}`}
                  onClick={() => toggleGameMode(mode)}
                  className={`
                    flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 uppercase tracking-tight
                    ${isActive 
                      ? 'bg-amber-600 dark:bg-amber-500 text-white shadow-sm' 
                      : 'text-stone-600 dark:text-stone-300 hover:text-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900'
                    }
                  `}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
            
            {/* Difficulty Controls (Disabled during custom Pass-n-Play solving layout) */}
            {gameMode !== 'pass-n-play' && (
              <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-950 p-1 rounded-xl border border-stone-200/55 dark:border-stone-800/60 font-mono">
                <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 px-2 select-none">
                  Diff:
                </span>
                {(['easy', 'medium', 'hard'] as const).map((diff) => {
                  const isActive = difficulty === diff;
                  return (
                    <button
                      key={diff}
                      id={`diff-btn-${diff}`}
                      onClick={() => handleDifficultyChange(diff)}
                      className={`
                        px-2.5 py-1 text-[10px] font-bold rounded-md uppercase transition-all
                        ${isActive 
                          ? 'bg-stone-800 text-white dark:bg-stone-800 dark:text-stone-100 shadow-xs' 
                          : 'text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-900'
                        }
                      `}
                    >
                      {diff}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Word Engine Source Picker (Only shown when server confirms Gemini supports it) */}
            {gameMode !== 'pass-n-play' && isAiSupported && (
              <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-950 p-1 rounded-xl border border-stone-200/55 dark:border-stone-800/60 font-mono">
                <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 px-2 select-none">
                  Source:
                </span>
                <button
                  id="source-btn-local"
                  onClick={() => handleWordSourceChange('local')}
                  className={`
                    px-2 py-1 text-[10px] font-bold rounded-md uppercase transition-all
                    ${wordSource === 'local' 
                      ? 'bg-stone-800 text-white dark:bg-stone-800 dark:text-stone-100 shadow-xs' 
                      : 'text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-900'
                    }
                  `}
                >
                  Canon List
                </button>
                <button
                  id="source-btn-ai"
                  onClick={() => handleWordSourceChange('ai')}
                  className={`
                    px-2 py-1 text-[10px] font-bold rounded-md uppercase transition-all flex items-center gap-1
                    ${wordSource === 'ai' 
                      ? 'bg-amber-600 dark:bg-amber-500 text-white shadow-sm' 
                      : 'text-amber-600/80 dark:text-amber-400/80 hover:bg-stone-200 dark:hover:bg-stone-900'
                    }
                  `}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  Divine AI
                </button>
              </div>
            )}
          </div>
        </div>

        {/* AI Quota Fallback Reassuring Notice */}
        {isAiQuotaExceeded && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-stone-700 dark:text-stone-350 transition-all duration-500">
            <div className="flex items-center gap-2.5 text-xs text-center sm:text-left">
              <span className="text-base shrink-0 select-none">🕊️</span>
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-400">Divine AI Daily Free Quota Resting</p>
                <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                  To keep your study and word puzzles completely uninterrupted, we have seamlessly enabled lessons and word deciphers from our vast offline biblical lexicon database!
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsAiQuotaExceeded(false)}
              className="px-3 py-1 bg-amber-200/50 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-900 dark:text-amber-300 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 cursor-pointer"
            >
              Acknowledge
            </button>
          </div>
        )}

        {/* PASS & PLAY WORD WRITING FORM STATE */}
        {gameMode === 'pass-n-play' && isPassNPlaySetup ? (
          <div className="py-6">
            <PassAndPlaySetup
              currentRound={passPlayRound}
              creatorTeam={passPlayRound % 2 !== 0 ? 'Team A' : 'Team B'}
              guesserTeam={passPlayRound % 2 !== 0 ? 'Team B' : 'Team A'}
              onWordCreated={handleCustomWordCreated}
              onCancel={() => {
                setIsPassNPlaySetup(false);
                setGameMode('solo');
                loadNewWord(difficulty, wordSource);
              }}
            />
          </div>
        ) : (
          /* CORE PLAYING GRID */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: ANIMATED DRAWING */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-900 rounded-2xl p-5 shadow-xs">
                <div className="flex justify-between items-center mb-3">
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-100 text-stone-600 dark:bg-stone-950 dark:text-stone-300">
                    Gallows Stage: {missesCount}/6
                  </span>
                  {gameMode === 'pass-n-play' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold border border-amber-500/30 text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-500/10">
                      Duel Mode
                    </span>
                  )}
                  {gameMode === 'coop' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/10">
                      Co-Op Teamwork
                    </span>
                  )}
                </div>

                {/* Animated SVG drawing */}
                <HangmanDrawing
                  remainingGuesses={gameState.remainingGuesses}
                  isGameOver={isFinished}
                  hasWon={hasWon}
                />

                <div className="text-center mt-4">
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Remaining attempts before gallows is complete:
                  </p>
                  <p className={`text-xl font-mono font-black mt-1 ${gameState.remainingGuesses <= 2 ? 'text-red-500 animate-pulse' : 'text-stone-700 dark:text-stone-200'}`}>
                    {gameState.remainingGuesses}
                  </p>
                </div>
              </div>

              {/* LOCAL SCOREKEEPER PANEL & PLAYERS (Rendered in Left Pillar for desktop, or below on mobile) */}
              {gameMode === 'coop' && (
                <ScoreTracker
                  players={players}
                  activePlayerIndex={gameState.activePlayerIndex}
                  isCoopMode={true}
                  onAddPlayer={handleAddPlayer}
                  onRemovePlayer={handleRemovePlayer}
                  onResetScores={handleResetScores}
                />
              )}

              {gameMode === 'pass-n-play' && (
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-900 p-5 rounded-2xl shadow-xs">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-serif text-sm font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-amber-500" />
                      Team Duel Scoreboard
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      Round {passPlayRound}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center border-t border-b border-stone-150/60 dark:border-stone-800 py-3 my-2 font-mono">
                    <div className="border-r border-stone-100 dark:border-stone-800">
                      <p className={`text-[10px] uppercase font-bold ${passPlayRound % 2 !== 0 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500'}`}>
                        Team A {passPlayRound % 2 !== 0 ? '✍️ Creator' : '🔍 Guesser'}
                      </p>
                      <p className="text-lg font-bold text-stone-800 dark:text-stone-100">{passPlayScores.teamA}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-bold ${passPlayRound % 2 === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500'}`}>
                        Team B {passPlayRound % 2 === 0 ? '✍️ Creator' : '🔍 Guesser'}
                      </p>
                      <p className="text-lg font-bold text-stone-800 dark:text-stone-100">{passPlayScores.teamB}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={startPassAndPlayCustom}
                      className="flex-1 py-1.5 bg-stone-100 dark:bg-stone-950 hover:bg-stone-200 text-stone-700 dark:text-stone-200 text-[10px] font-bold uppercase rounded-lg transition"
                    >
                      Write New Word
                    </button>
                    <button
                      onClick={handleResetScores}
                      className="py-1.5 px-3 border border-stone-200 text-stone-450 hover:text-red-500 hover:border-red-500 text-[10px] rounded-lg transition"
                    >
                      Reset Duel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: CORE GAMEPLAY CONTROLS */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              
              {/* TARGET WORD REVEAL AREA */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-900 rounded-2xl p-6 shadow-xs flex flex-col items-center justify-center relative min-h-[190px]">
                
                {/* Loader overlay */}
                {loading && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-stone-950/80 z-20 rounded-2xl flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-3 font-medium select-none animate-pulse">
                      Inquiring the Holy Scriptures...
                    </p>
                  </div>
                )}

                {/* Theme & category badge tags */}
                <div className="flex gap-2 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-300 rounded-full">
                    Category: {gameState.wordData.category}
                  </span>
                </div>

                {/* Underline Placeholders */}
                <WordPlaceholder
                  word={currentWord}
                  guessedLetters={gameState.guessedLetters}
                  revealAll={isFinished}
                />
              </div>

              {/* GAME NOTIFICATION ALERTS */}
              {message && (
                <div 
                  id="game-alert-banner"
                  className={`
                    p-4 rounded-xl border flex items-center gap-3 transition-all duration-300
                    ${message.type === 'success' 
                      ? 'bg-emerald-500/10 text-emerald-800 border-emerald-300/40 dark:text-emerald-300 dark:bg-emerald-950/20' 
                      : message.type === 'error'
                        ? 'bg-red-500/10 text-red-800 border-red-300/40 dark:text-red-300 dark:bg-red-950/20'
                        : 'bg-blue-500/10 text-blue-800 border-blue-300/40 dark:text-blue-300'
                    }
                  `}
                >
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : message.type === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  ) : (
                    <Info className="w-5 h-5 text-blue-500 shrink-0" />
                  )}
                  <p className="text-xs sm:text-sm font-semibold leading-snug">
                    {message.text}
                  </p>
                </div>
              )}

              {/* CO-OP TURN INDICATOR BANNER */}
              {gameMode === 'coop' && !isFinished && players.length > 0 && (
                <div className="p-3 bg-amber-50/70 border border-amber-300/40 dark:bg-amber-950/10 dark:border-amber-900/30 rounded-xl flex items-center justify-between text-xs sm:text-sm">
                  <span className="flex items-center gap-2 font-medium text-stone-700 dark:text-stone-350">
                    <Users className="w-4 h-5 text-amber-500" />
                    Pending response: 
                    <strong className="text-amber-800 dark:text-amber-300 text-sm">
                      {players[gameState.activePlayerIndex]?.name || 'Player'}
                    </strong>
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">
                    Correct key +20 pts | Wrong -10 pts & passes turn
                  </span>
                </div>
              )}

              {/* VIRTUAL KEYBOARD OR ACTIONS AREA */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-900 rounded-2xl p-5 shadow-xs">
                
                {/* If round is completed as Win or Loss: render lesson detail description board instead of keys */}
                {isFinished ? (
                  <div className="text-center py-4" id="lesson-reveal-board">
                    <div className="inline-flex w-12 h-12 rounded-full bg-amber-500/10 items-center justify-center border border-amber-500/20 mb-3">
                      <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>

                    <h4 className="font-serif text-lg font-extrabold text-stone-800 dark:text-stone-100 uppercase tracking-widest">
                      Scripture Study Reveal
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
                      Review the historical details and study facts below to lock in what we learned from this sacred entry.
                    </p>

                    {/* Theological Fact card */}
                    {revealedFacts && (
                      <div className="transition-all duration-500">
                        <div className="mt-4 p-4 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-150 dark:border-stone-850 text-left max-w-xl mx-auto relative overflow-hidden transition-all duration-500">
                          <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-40 select-none">
                            <span className="text-[8px] font-mono font-bold tracking-widest">FACT FILE</span>
                            <BookOpen className="w-3 h-3 text-stone-400" />
                          </div>

                          <p className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <span className="text-xs">📜</span>
                            THE WORD IN CONTEXT: {currentWord}
                          </p>
                          <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed mt-2 font-medium">
                            {gameState.wordData.fact}
                          </p>
                        </div>

                        {gameState.wordData.reference && gameState.wordData.reference !== 'Local Custom Word' && (
                          <div className="mt-3 max-w-xl mx-auto border border-stone-150 dark:border-stone-800 rounded-xl overflow-hidden text-left bg-white dark:bg-stone-900 transition-all">
                            {!passageText ? (
                              <button
                                onClick={() => fetchBiblePassage(gameState.wordData.reference)}
                                disabled={passageLoading}
                                className="w-full px-4 py-3 bg-amber-500/5 hover:bg-amber-500/10 active:bg-amber-500/15 disabled:opacity-75 flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-300 font-mono transition duration-200"
                              >
                                <span className="flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-amber-500 animate-pulse" />
                                  📖 READ PASSAGE: {gameState.wordData.reference}
                                </span>
                                {passageLoading ? (
                                  <span className="flex items-center gap-1.5 font-sans font-normal text-[11px] text-stone-500 dark:text-stone-400">
                                    <svg className="animate-spin h-3.5 w-3.5 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Opening Scroll...
                                  </span>
                                ) : (
                                  <span className="text-[10px] uppercase font-bold text-stone-450 dark:text-stone-400 hover:text-amber-500">
                                    Click to Study &rarr;
                                  </span>
                                )}
                              </button>
                            ) : (
                              <div className="p-4 bg-amber-500/5 dark:bg-amber-550/5 border-l-4 border-amber-500 dark:border-amber-600 transition-all duration-300">
                                <div className="flex justify-between items-center mb-2 font-mono text-xs font-bold text-amber-800 dark:text-amber-400 border-b border-stone-200 dark:border-stone-800 pb-1.5">
                                  <span className="flex items-center gap-1.5">
                                    📖 SCRIPTURE: {gameState.wordData.reference}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                    {passageTranslation}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed italic font-serif py-1">
                                  "{passageText}"
                                </p>
                                <div className="mt-2 text-[10px] text-stone-500 flex justify-between items-center font-mono">
                                  <span>Perfect for further devotion & research.</span>
                                  <button
                                    onClick={() => setPassageText(null)}
                                    className="text-stone-400 hover:text-red-500 transition-colors uppercase font-bold text-[9px]"
                                  >
                                    Close Passage
                                  </button>
                                </div>
                              </div>
                            )}

                            {passageError && (
                              <div className="p-3 bg-red-100/60 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs text-center border-t border-red-300/20">
                                {passageError}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Next match controls */}
                    <div className="flex flex-col sm:flex-row shadow-xs bg-stone-50 dark:bg-stone-950 border border-stone-150/60 dark:border-stone-850 p-4 rounded-xl items-center justify-between gap-4 mt-6 max-w-xl mx-auto">
                      <div className="text-center sm:text-left">
                        <p className="text-xs text-stone-500">
                          {gameMode === 'pass-n-play' 
                            ? 'Ready to make another custom test?' 
                            : 'Ready for the next scripture mystery?'
                          }
                        </p>
                        <p className="text-xs font-bold text-stone-700 dark:text-stone-300 mt-1 leading-none">
                          Selected Category: {difficulty.toUpperCase()} • {isAiQuotaExceeded ? 'CANON (AI RESTING)' : wordSource === 'ai' ? 'GEMINI' : 'CANON'}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (gameMode === 'pass-n-play') {
                            startPassAndPlayCustom();
                          } else {
                            loadNewWord(difficulty, wordSource);
                          }
                        }}
                        className="py-2.5 px-6 bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition duration-200 shadow-md flex items-center justify-center gap-1.5 w-full sm:w-auto cursor-pointer"
                        id="next-round-btn"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Continue Campaign</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // PLAYING Keyboard layout
                  <>
                    <h5 className="text-[11px] font-mono font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest text-center mb-1.5">
                      Select alpha keys or press keys on your physical keyboard
                    </h5>
                    
                    <Keyboard
                      guessedLetters={gameState.guessedLetters}
                      wordLetters={wordLetters}
                      onLetterSelect={makeGuess}
                      disabled={isFinished}
                    />

                    {/* Utility options button panel */}
                    <div className="flex border-t border-stone-100 dark:border-stone-850 mt-4 pt-4 justify-between items-center text-xs">
                      <span className="text-stone-400">
                        Letters guessed: {gameState.guessedLetters.length}
                      </span>
                      {gameMode !== 'pass-n-play' && (
                        <button
                          onClick={() => loadNewWord(difficulty, wordSource)}
                          className="text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 font-bold transition flex items-center gap-1"
                          title="Generate a completely new word"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reroll Word</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="py-6 px-6 border-t border-stone-200 dark:border-stone-900 bg-white/50 dark:bg-stone-950/20 text-center text-xs text-stone-400 dark:text-stone-500 mt-12">
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="font-serif italic font-medium">
            "Thy word is a lamp unto my feet, and a light unto my path." — Psalm 119:105
          </p>
          <p className="text-[10px]">
            Divine Decipher. Constructed safely server-side with Google Gemini Integration support. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
