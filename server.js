import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import Groq from 'groq-sdk';

import { connectDB, getDBStatus } from './config/db.js';
import User from './models/User.js';
import DiaryEntry from './models/DiaryEntry.js';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// In-Memory Fallback Stores for offline/unreachable DB states
const memoryUsers = new Map();
const memoryDiary = [];

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB Atlas / Local Database
connectDB();

// API Signup
app.post(['/api/signup', '/api/auth/signup'], async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (getDBStatus()) {
      let user = await User.findOne({ email: cleanEmail });
      if (user) {
        return res.status(400).json({ message: 'User already exists with this email.' });
      }
      user = new User({ email: cleanEmail, password });
      await user.save();
      return res.status(201).json({ message: 'Account created successfully!', email: cleanEmail });
    } else {
      if (memoryUsers.has(cleanEmail)) {
        return res.status(400).json({ message: 'User already exists with this email.' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      memoryUsers.set(cleanEmail, { email: cleanEmail, password: hashedPassword });
      return res.status(201).json({ message: 'Account created successfully!', email: cleanEmail });
    }
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: err.message || 'Signup failed' });
  }
});

// API Login
app.post(['/api/login', '/api/auth/login'], async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (getDBStatus()) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(400).json({ message: 'Invalid email or password.' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid email or password.' });
      }
      return res.json({ message: 'Login successful!', email: cleanEmail });
    } else {
      let userObj = memoryUsers.get(cleanEmail);
      if (!userObj) {
        // Auto register demo user for seamless offline login
        const hashedPassword = await bcrypt.hash(password, 10);
        userObj = { email: cleanEmail, password: hashedPassword };
        memoryUsers.set(cleanEmail, userObj);
      }
      const isMatch = await bcrypt.compare(password, userObj.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid email or password.' });
      }
      return res.json({ message: 'Login successful!', email: cleanEmail });
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: err.message || 'Login failed' });
  }
});

// =========================================================================
// REAL-TIME QUOTE ENGINE (LIVE EXTERNAL FETCHING & ANCIENT PHILOSOPHER VIBE)
// =========================================================================

// List of Classic Philosophers, Existentialists & Nocturnal Poets
const CLASSIC_PHILOSOPHERS = [
  { quote: "The moon does not fight the darkness, nor does it hide from it. It simply shines with whatever light it has gathered.", author: "Marcus Aurelius" },
  { quote: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { quote: "In the depth of winter, I finally learned that within me there lay an invincible summer.", author: "Albert Camus" },
  { quote: "Solitude is not emptiness; it is the sacred quiet where your true voice learns how to sing.", author: "Rainer Maria Rilke" },
  { quote: "There is a quiet beauty in melancholy—it is the heart's way of remembering how deeply it can feel.", author: "Fernando Pessoa" },
  { quote: "We are star-stuff spinning on a rock in endless space; love and truth remain our brightest beacons.", author: "Carl Sagan" },
  { quote: "To live is to suffer, to survive is to find some meaning in the suffering.", author: "Friedrich Nietzsche" },
  { quote: "You have power over your mind - not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { quote: "Life can only be understood backwards; but it must be lived forwards.", author: "Søren Kierkegaard" },
  { quote: "The privilege of a lifetime is to become who you truly are.", author: "Carl Jung" },
  { quote: "The wound is the place where the Light enters you.", author: "Rumi" },
  { quote: "Do not spoil what you have by desiring what you have not; remember that what you now have was once among the things you only hoped for.", author: "Epicurus" },
  { quote: "Every man takes the limits of his own field of vision for the limits of the world.", author: "Arthur Schopenhauer" },
  { quote: "Pain is inevitable. Suffering is optional.", author: "Haruki Murakami" },
  { quote: "The unexamined life is not worth living.", author: "Socrates" }
];

// Helper: Sentence completeness check
function isCompleteSentence(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  
  // Filter out forbidden words per user request (only allah related)
  if (lower.includes('allah')) {
    return false;
  }
  
  return trimmed.length >= 10;
}

// Live External Fetcher 1: Fetch live quotes from online APIs
async function fetchRealTimeQuoteOnline() {
  try {
    const endpoints = [
      'https://dummyjson.com/quotes/random',
      'https://favqs.com/api/qotd',
      'https://api.freeapi.app/api/v1/public/quotes/quote/random'
    ];

    const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(randomEndpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      let quote = null;
      let author = null;

      if (data?.quote?.body) {
        quote = data.quote.body;
        author = data.quote.author;
      } else if (data?.quote) {
        quote = data.quote;
        author = data.author;
      } else if (data?.data?.content) {
        quote = data.data.content;
        author = data.data.author;
      }

      if (quote && isCompleteSentence(quote)) {
        return { quote: quote.trim(), author: author ? author.trim() : "Philosophical Mind" };
      }
    }
  } catch (err) {
    // Graceful fallback to next provider
  }
  return null;
}

// Live External Fetcher 2: Real-time Wikiquote API for Movies & Dialogue
async function fetchRealTimeWikiquoteMovie(movieTitle, historySet) {
  try {
    const searchUrl = `https://en.wikiquote.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(movieTitle)}&utf8=&format=json`;
    
    const searchController = new AbortController();
    const searchTimeoutId = setTimeout(() => searchController.abort(), 3500);
    const searchRes = await fetch(searchUrl, { signal: searchController.signal });
    clearTimeout(searchTimeoutId);
    
    const searchData = await searchRes.json();
    
    let targetTitle = `${movieTitle} (film)`;
    if (searchData?.query?.search?.length > 0) {
      const results = searchData.query.search;
      const filmMatch = results.find(r => r.title.toLowerCase().includes('(film)') || r.title.toLowerCase() === movieTitle.toLowerCase());
      targetTitle = filmMatch ? filmMatch.title : results[0].title;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const pageUrl = `https://en.wikiquote.org/w/api.php?action=query&titles=${encodeURIComponent(targetTitle)}&prop=extracts&format=json&explaintext=true`;

    const res = await fetch(pageUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const pages = data?.query?.pages;
      if (pages) {
        const pageKey = Object.keys(pages)[0];
        const extractText = pages[pageKey]?.extract;
        if (extractText && extractText.length > 50) {
          // Parse lines looking for quotes and character headers
          const lines = extractText.split('\n');
          let currentCharacter = `${movieTitle} Character`;
          const candidateQuotes = [];

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('== ') && trimmed.endsWith(' ==')) {
              currentCharacter = trimmed.replace(/^==\s*|\s*==$/g, '').trim();
            } else if (trimmed.length > 25 && isCompleteSentence(trimmed) && !trimmed.startsWith('*') && !trimmed.startsWith('=')) {
              let cleanQuote = trimmed.replace(/\[.*?\]\s*/g, '').trim();
              if (isCompleteSentence(cleanQuote)) {
                if (!historySet || !historySet.has(cleanQuote.toLowerCase())) {
                  candidateQuotes.push({ quote: cleanQuote, author: `${currentCharacter} (${targetTitle.replace(' (film)', '')})` });
                }
              }
            }
          }

          if (candidateQuotes.length > 0) {
            return candidateQuotes[Math.floor(Math.random() * candidateQuotes.length)];
          }
        }
      }
    }
  } catch (err) {
    // Graceful fallback
  }
  return null;
}

// API Quote Generation Route
app.post(['/api/generate-quote', '/api/quotes/generate'], async (req, res) => {
  try {
    const { specificInput = '', inputMode = 'feeling', selectedMoon = 'full', activeCategory = 'All', generatedQuoteHistory = [] } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    let quoteText = "";
    let quoteAuthor = "";

    const isMovieMode = (inputMode === 'movie' || (specificInput && inputMode !== 'feeling' && inputMode !== 'author'));
    const isAuthorMode = (inputMode === 'author');
    const cleanMovieInput = specificInput ? specificInput.trim() : '';
    const historySet = new Set(generatedQuoteHistory.map(q => typeof q === 'string' ? q.toLowerCase() : String(q.quote || q).toLowerCase()));

    // -----------------------------------------------------------------------
    // STEP 1: If Movie Mode, try Live Real-Time Wikiquote API Fetching
    // -----------------------------------------------------------------------
    if (isMovieMode && cleanMovieInput) {
      const liveMovieResult = await fetchRealTimeWikiquoteMovie(cleanMovieInput, historySet);
      if (liveMovieResult && isCompleteSentence(liveMovieResult.quote)) {
        quoteText = liveMovieResult.quote;
        quoteAuthor = liveMovieResult.author;
      }
    }

    // -----------------------------------------------------------------------
    // STEP 2: Try Groq AI for Live Real-Time Philosophical / Movie Generation
    // -----------------------------------------------------------------------
    if (!quoteText && apiKey && apiKey.trim() !== '' && !apiKey.includes('your_groq_api_key')) {
      try {
        const groq = new Groq({ apiKey });

        let systemPrompt = "";
        let userPrompt = "";

        if (isMovieMode && cleanMovieInput) {
          systemPrompt = `You are a film scholar and quote engine for "Every Feeling Has a Meaning".
Generate ONE real, iconic, 100% complete dialogue spoken in the movie: "${cleanMovieInput}".
STRICT RULES:
1. The quote MUST be authentic dialogue from "${cleanMovieInput}". Support Hollywood, Bollywood, and Global Cinema. For Bollywood/foreign movies, provide the quote in its original language (e.g., Hinglish) or its English translation.
2. State the exact character who spoke it in author field (e.g., "Cooper (Interstellar)", "Kabir (ZNMD)").
3. Must be a complete sentence ending with punctuation.
4. DO NOT include any quotes referencing "Allah".
5. DO NOT repeat these past quotes: ${generatedQuoteHistory.slice(-5).join(" | ")}
6. JSON format: {"quote": "Complete quote text.", "author": "Character Name (Film Title)"}`;
          userPrompt = `Fetch iconic dialogue for movie: "${cleanMovieInput}"`;
        } else if (isAuthorMode && cleanMovieInput) {
          systemPrompt = `You are a literary and philosophical archivist for "Every Feeling Has a Meaning".
The user wants a quote specifically from the author/philosopher: "${cleanMovieInput}".
STRICT RULES:
1. Generate ONE profound, authentic, and complete quote originally spoken or written by "${cleanMovieInput}".
2. State the exact author name in the author field.
3. Must be a complete sentence ending with punctuation.
4. DO NOT include any quotes referencing "Allah".
5. DO NOT repeat these past quotes: ${generatedQuoteHistory.slice(-5).join(" | ")}
6. JSON format: {"quote": "Complete quote text.", "author": "Author Name"}`;
          userPrompt = `Provide a deep, meaningful quote by: "${cleanMovieInput}"`;
        } else {
          systemPrompt = `You are an old, profound philosopher for an app named "Every Feeling Has a Meaning".
The user will provide a word or phrase describing how they currently FEEL (e.g., "dead", "empty", "joyful", "lost").
Your goal is to inspire the user with deep, melancholic, sad, meaningful, and pure-feeling wisdom about that exact EMOTION/FEELING. 
Do NOT treat the user's input as an author's name or literal entity. It is a description of an emotional state.

STRICT RULES:
1. Generate ONE profound, complete quote about the feeling of "${cleanMovieInput || 'silence of the night'}".
2. State the exact classic philosopher's name who inspired it (e.g., Marcus Aurelius, Nietzsche, Camus, Rilke, Seneca, Rumi) or "The Night Sky".
3. DO NOT include any quotes referencing "Allah".
4. DO NOT literally use words like "crescent" or "full" in the quote.
5. DO NOT repeat these past quotes: ${generatedQuoteHistory.slice(-5).join(" | ")}
6. JSON format: {"quote": "Complete quote text.", "author": "Philosopher Name"}`;
          userPrompt = `The user feels: "${cleanMovieInput || activeCategory}". Provide a philosophical quote about this feeling.`;
        }

        const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 500,
          response_format: { type: "json_object" }
        });

        let contentStr = chatCompletion.choices[0]?.message?.content;
        if (contentStr) {
          contentStr = contentStr.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(contentStr);
          if (parsed.quote && isCompleteSentence(parsed.quote)) {
            quoteText = parsed.quote.trim();
            quoteAuthor = parsed.author || (isMovieMode ? `${cleanMovieInput} Cinema` : (isAuthorMode ? cleanMovieInput : "Old Philosopher"));
          }
        }
      } catch (groqErr) {
        console.warn('Groq API warning:', groqErr.message);
      }
    }

    // -----------------------------------------------------------------------
    // STEP 3: Live External Real-Time Quote API Fetching (Online APIs)
    // -----------------------------------------------------------------------
    if (!quoteText && !isMovieMode && !cleanMovieInput) {
      const onlineQuote = await fetchRealTimeQuoteOnline();
      if (onlineQuote && isCompleteSentence(onlineQuote.quote) && !historySet.has(onlineQuote.quote.toLowerCase())) {
        quoteText = onlineQuote.quote;
        quoteAuthor = onlineQuote.author;
      }
    }

    // -----------------------------------------------------------------------
    // STEP 4: Classic Philosopher & Deep Emotional Fallback Pool
    // -----------------------------------------------------------------------
    if (!quoteText) {
      if (isMovieMode && cleanMovieInput) {
        quoteText = `Great stories do not fade when the screen goes dark; they linger in the quiet thoughts of those who marveled at them.`;
        quoteAuthor = `${cleanMovieInput} Cinema`;
      } else {
        let available = CLASSIC_PHILOSOPHERS.filter(item => !historySet.has(item.quote.toLowerCase()));
        
        if (cleanMovieInput) {
            const feelingMatch = available.filter(item => item.quote.toLowerCase().includes(cleanMovieInput.toLowerCase()));
            if (feelingMatch.length > 0) {
                available = feelingMatch;
            }
        }

        const selected = available.length > 0
          ? available[Math.floor(Math.random() * available.length)]
          : CLASSIC_PHILOSOPHERS[Math.floor(Math.random() * CLASSIC_PHILOSOPHERS.length)];

        quoteText = selected.quote;
        quoteAuthor = selected.author;
      }
    }

    return res.json({
      choices: [
        {
          message: {
            content: JSON.stringify({ quote: quoteText, author: quoteAuthor })
          }
        }
      ]
    });

  } catch (err) {
    console.error('Generate quote error:', err);
    res.status(500).json({ message: 'Failed to generate quote' });
  }
});

// API Save to Diary
app.post('/api/diary/save', async (req, res) => {
  try {
    const { email, quote, author, moon } = req.body;
    if (!email || !quote) {
      return res.status(400).json({ message: 'Email and quote required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (getDBStatus()) {
      let user = await User.findOne({ email: cleanEmail });
      if (!user) {
        user = new User({ email: cleanEmail, password: 'password123' });
        await user.save();
      }
      const entry = new DiaryEntry({
        userId: user._id,
        quote,
        author: author || 'The Night Sky',
        moonPhase: moon === 'crescent' ? 'crescent' : 'full'
      });
      await entry.save();
    } else {
      memoryDiary.unshift({
        _id: 'diary_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        email: cleanEmail,
        quote,
        author: author || 'The Night Sky',
        moon: moon || 'full',
        createdAt: new Date().toISOString()
      });
    }

    return res.status(201).json({ message: 'Quote saved to your personal diary!' });
  } catch (err) {
    console.error('Diary save error:', err);
    res.status(500).json({ message: 'Failed to save quote' });
  }
});

// API Get Diary
app.get('/api/diary', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({ message: 'Email query parameter required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (getDBStatus()) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) return res.json([]);
      const entries = await DiaryEntry.find({ userId: user._id }).sort({ createdAt: -1 });
      return res.json(entries);
    } else {
      const userEntries = memoryDiary.filter(item => item.email === cleanEmail);
      return res.json(userEntries);
    }
  } catch (err) {
    console.error('Diary fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch diary' });
  }
});

// API Delete Diary Entry
app.delete('/api/diary/:id', async (req, res) => {
  try {
    const quoteId = req.params.id;
    if (getDBStatus()) {
      await DiaryEntry.findByIdAndDelete(quoteId);
    } else {
      const idx = memoryDiary.findIndex(item => item._id === quoteId);
      if (idx !== -1) memoryDiary.splice(idx, 1);
    }
    return res.json({ message: 'Quote removed from diary.' });
  } catch (err) {
    console.error('Diary delete error:', err);
    res.status(500).json({ message: 'Failed to delete quote' });
  }
});

// Catch-all route to serve SPA index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✨ "Every Feeling Has a Meaning" Server running at: http://localhost:${PORT}`);
});
