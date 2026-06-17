import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { LOCAL_BIBLE_WORDS, getRandomLocalWord } from './src/wordsData';
import { BibleWord } from './src/types';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Initialize Gemini Client safely if the key is defined
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini API Client initialized successfully.');
  } catch (error) {
    console.error('Error initializing Gemini client:', error);
  }
} else {
  console.log('Gemini API key is not configured. Running in local dictionary mode.');
}

// API Routes

/**
 * GET /api/word
 * Fetches a random Bible-related word/name along with category, scripture reference, and hints.
 * Supports "difficulty" (easy/medium/hard) and "mode" (ai/local).
 * Uses Gemini if available, with standard fallback to local dictionary of words.
 */
app.get('/api/word', async (req: Request, res: Response) => {
  const difficultyInput = req.query.difficulty as string;
  const modePreference = req.query.mode as string; // 'ai' or 'local'
  const excludeListStr = req.query.exclude as string; // Comma-separated uppercase words

  const difficulty = (['easy', 'medium', 'hard'].includes(difficultyInput)
    ? difficultyInput
    : 'easy') as 'easy' | 'medium' | 'hard';

  const excludeList = excludeListStr ? excludeListStr.split(',') : [];

  // Check if we can/should use AI
  const useAI = aiClient && modePreference !== 'local';

  if (useAI && aiClient) {
    try {
      // Create a rigorous context to generate high quality Bible words
      const excludePhrase = excludeList.length > 0
        ? `DO NOT pick any of these already used words: ${excludeList.join(', ')}.`
        : '';

      const prompt = `Select a random Bible-related word or name with difficulty: ${difficulty}.
${excludePhrase}
The word must be a single word (3 to 14 letters long), containing ONLY letters (A-Z), no spaces, no hyphens.
Select from over 10,000 potential names, events, items, concepts, books, or cities in scripture. 
Make sure the reference is a genuine Bible passage, and the hint is engaging but gives players a fair chance to solve it.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are the ultimate Scripture Word Master for a Bible Hangman game. You output highly accurate, authentic theological data in strict JSON format. Keep the word as a single alphabetic string under 14 letters.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { 
                type: Type.STRING, 
                description: 'The target guessing word/name in ALL CAPS. Must be a single word (A-Z) with no spaces or punctuation, under 14 letters.' 
              },
              category: { 
                type: Type.STRING, 
                description: 'Must stand as exactly one of: Character, Place, Book, Object, Concept, Event' 
              },
              reference: { 
                type: Type.STRING, 
                description: 'The primary Scripture book, chapter, and verse where it is located, e.g., "Genesis 12:1"' 
              },
              hint: { 
                type: Type.STRING, 
                description: 'A direct but clever clue or definition describing this biblical entry (under 120 characters).' 
              },
              fact: { 
                type: Type.STRING, 
                description: 'An educational, inspiring theological detail or historical fun fact about it (under 180 characters).' 
              },
              difficulty: { 
                type: Type.STRING, 
                description: 'Must match the requested difficulty exactly: easy, medium, or hard' 
              }
            },
            required: ['word', 'category', 'reference', 'hint', 'fact', 'difficulty']
          }
        }
      });

      const responseText = response.text;
      if (responseText) {
        const parsed: BibleWord = JSON.parse(responseText.trim());
        // Clean up word formatting just in case
        parsed.word = parsed.word.toUpperCase().replace(/[^A-Z]/g, '');
        if (parsed.word.length >= 3 && parsed.word.length <= 15) {
          return res.json({
            ...parsed,
            source: 'gemini'
          });
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        console.log('Notice: Gemini API quota exceeded (status 429). Activating seamless high-fidelity local database fallback for continuous gameplay.');
        let filtered = LOCAL_BIBLE_WORDS.filter(w => w.difficulty === difficulty);
        if (excludeList.length > 0) {
          const freshWords = filtered.filter(w => !excludeList.includes(w.word.toUpperCase()));
          if (freshWords.length > 0) {
            filtered = freshWords;
          }
        }
        const pool = filtered.length > 0 ? filtered : LOCAL_BIBLE_WORDS;
        const randomIndex = Math.floor(Math.random() * pool.length);
        const selected = pool[randomIndex];
        return res.json({
          ...selected,
          source: 'local_fallback_quota'
        });
      } else {
        console.warn('Gemini API failed to generate word, falling back to local database:', errMsg);
      }
    }
  }

  // Fallback / Local mode
  let filtered = LOCAL_BIBLE_WORDS.filter(w => w.difficulty === difficulty);
  
  // Try to find one that has not been excluded
  if (excludeList.length > 0) {
    const freshWords = filtered.filter(w => !excludeList.includes(w.word.toUpperCase()));
    if (freshWords.length > 0) {
      filtered = freshWords;
    }
  }

  const pool = filtered.length > 0 ? filtered : LOCAL_BIBLE_WORDS;
  const randomIndex = Math.floor(Math.random() * pool.length);
  const selected = pool[randomIndex];

  return res.json({
    ...selected,
    source: 'local'
  });
});

/**
 * GET /api/passage
 * Resolves a scripture reference to its actual chapter or verse text.
 * Calls bible-api.com first because it is exceedingly fast, or queries Gemini as an expert fallback.
 */
app.get('/api/passage', async (req: Request, res: Response) => {
  const reference = req.query.reference as string;
  if (!reference || reference === 'Local Custom Word') {
    return res.status(400).json({ error: 'Valid reference is required' });
  }

  // 1. Try public free bible-api.com (World English Bible version)
  try {
    const response = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.text) {
        return res.json({
          reference: data.reference,
          text: data.text.trim(),
          translation: data.translation_name || 'World English Bible'
        });
      }
    }
  } catch (e) {
    console.warn(`bible-api.com did not resolve "${reference}". Querying Gemini fallback...`);
  }

  // 2. Fall back to Gemini API
  if (aiClient) {
    try {
      const prompt = `Fetch the official Bible passage text for the reference: "${reference}". 
Provide the exact verse or verses. Do not include introductory notes, essays, or personal greeting commentary. Just the exact text of the verses from the bible.`;
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are an accurate, reliable Bible passage study guide. Return the exact scripture text in a clean JSON format.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reference: { type: Type.STRING },
              text: { 
                type: Type.STRING, 
                description: 'The exact scripture text of the Bible passage reference.' 
              },
              translation: { 
                type: Type.STRING, 
                description: 'The translation name used, e.g., KJV, NET, WEB.' 
              }
            },
            required: ['reference', 'text', 'translation']
          }
        }
      });
      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        return res.json(parsed);
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        console.log('Notice: Gemini API quota exceeded (status 429) during passage lookup. Serving inspiring local fallback study help.');
      } else {
        console.error('Gemini passage lookup failed:', errMsg);
      }
    }
  }

  // 3. Fallback text
  return res.json({
    reference,
    text: 'Seek and you shall find! Please look up this bible reference in your favorite mobile Bible app or scripture study book.',
    translation: 'Study Guide'
  });
});



/**
 * POST /api/verify-custom-word
 * Validates a custom word made for Local 2-Player Pass-and-Play
 */
app.post('/api/verify-custom-word', (req: Request, res: Response) => {
  const { word } = req.body;
  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'Word is required' });
  }

  const cleanWord = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (cleanWord.length < 3) {
    return res.json({ valid: false, reason: 'Word must be at least 3 letters.' });
  }
  if (cleanWord.length > 15) {
    return res.json({ valid: false, reason: 'Word must be 15 letters or fewer.' });
  }

  return res.json({ valid: true, cleaned: cleanWord });
});

// Start server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Mounted Vite middleware for active developer preview.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production-built static assets.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on address http://0.0.0.0:${PORT}`);
  });
}

startServer();
