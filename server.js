import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

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

const PREDEFINED_MOVIES = {
  "dead poets society": [
    { quote: "Carpe diem. Seize the day, boys. Make your lives extraordinary.", author: "John Keating (Dead Poets Society)" },
    { quote: "We don't read and write poetry because it's cute. We read and write poetry because we are members of the human race. And the human race is filled with passion.", author: "John Keating (Dead Poets Society)" },
    { quote: "No matter what anybody tells you, words and ideas can change the world.", author: "John Keating (Dead Poets Society)" },
    { quote: "There's a time for daring and there's a time for caution, and a wise man understands which is called for.", author: "John Keating (Dead Poets Society)" },
    { quote: "I went to the woods because I wanted to live deliberately. I wanted to live deep and suck out all the marrow of life.", author: "John Keating (Dead Poets Society)" },
    { quote: "But only in their dreams can men be truly free. 'Twas always thus, and always thus will be.", author: "John Keating (Dead Poets Society)" },
    { quote: "You must strive to find your own voice. Because the longer you wait to begin, the less likely you are to find it at all.", author: "John Keating (Dead Poets Society)" },
    { quote: "Boys, you must strive to find your own voice. Because the longer you wait to begin, the less likely you are to find it at all. Thoreau said, 'Most men lead lives of quiet desperation.' Don't be resigned to that. Break out!", author: "John Keating (Dead Poets Society)" }
  ],
  "pyaasa": [
    { quote: "Yeh duniya agar mil bhi jaye to kya hai?", author: "Vijay (Pyaasa)" },
    { quote: "Jane woh kaise log the jinke pyar ko pyar mila.", author: "Vijay (Pyaasa)" },
    { quote: "Jinhe naaz hai hind par woh kahan hain?", author: "Vijay (Pyaasa)" },
    { quote: "Humne to jab kaliyan mangi kaanton ka haar mila.", author: "Vijay (Pyaasa)" }
  ],
  "kaagaz ke phool": [
    { quote: "Waqt ne kiya kya haseen sitam, tum rahe na tum hum rahe na hum.", author: "Suresh (Kaagaz Ke Phool)" },
    { quote: "Dekhi zamaane ki yaari, bichhde sabhi baari baari.", author: "Suresh (Kaagaz Ke Phool)" },
    { quote: "Ek nayi duniya basayenge, ek naye asmaan ke neeche.", author: "Shanti (Kaagaz Ke Phool)" }
  ]
};

const PREDEFINED_AUTHORS = {
  "fyodor dostoevsky": [
    { quote: "Pain and suffering are always inevitable for a large intelligence and a deep heart.", author: "Fyodor Dostoevsky" },
    { quote: "The soul is healed by being with children.", author: "Fyodor Dostoevsky" },
    { quote: "To go wrong in one's own way is better than to go right in someone else's.", author: "Fyodor Dostoevsky" },
    { quote: "It takes something more than intelligence to act intelligently.", author: "Fyodor Dostoevsky" },
    { quote: "Man is sometimes extraordinarily, passionately, in love with suffering.", author: "Fyodor Dostoevsky" },
    { quote: "The mystery of human existence lies not in just staying alive, but in finding something to live for.", author: "Fyodor Dostoevsky" }
  ],
  "franz kafka": [
    { quote: "A book must be the axe for the frozen sea within us.", author: "Franz Kafka" },
    { quote: "I am a cage, in search of a bird.", author: "Franz Kafka" },
    { quote: "By believing passionately in something that still does not exist, we create it.", author: "Franz Kafka" },
    { quote: "Youth is happy because it has the capacity to see beauty. Anyone who keeps the ability to see beauty never grows old.", author: "Franz Kafka" },
    { quote: "Meaningful things are always simple.", author: "Franz Kafka" }
  ]
};

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

    let quoteText = "";
    let quoteAuthor = "";

    // inputMode is authoritative: 'movie', 'author', or 'feeling'
    const isMovieMode  = (inputMode === 'movie');
    const isAuthorMode = (inputMode === 'author');
    const cleanInput   = specificInput ? specificInput.trim() : '';
    const cleanInputLC = cleanInput.toLowerCase();
    const historySet   = new Set(generatedQuoteHistory.map(q => typeof q === 'string' ? q.toLowerCase() : String(q.quote || q).toLowerCase()));

    // -----------------------------------------------------------------------
    // STEP 0: PREDEFINED HARDCODED MOVIES — exact match first, then partial
    // -----------------------------------------------------------------------
    if (isMovieMode && cleanInput) {
      // Try exact match
      let predefinedKey = Object.keys(PREDEFINED_MOVIES).find(k => k === cleanInputLC);
      // Try partial match (user typed part of the title)
      if (!predefinedKey) {
        predefinedKey = Object.keys(PREDEFINED_MOVIES).find(k => k.includes(cleanInputLC) || cleanInputLC.includes(k));
      }
      if (predefinedKey) {
        const movieQuotes = PREDEFINED_MOVIES[predefinedKey];
        const available = movieQuotes.filter(q => !historySet.has(q.quote.toLowerCase()));
        const selected = available.length > 0
          ? available[Math.floor(Math.random() * available.length)]
          : movieQuotes[Math.floor(Math.random() * movieQuotes.length)];
        quoteText  = selected.quote;
        quoteAuthor = selected.author;
      }
    } else if (isAuthorMode && cleanInput) {
      // Try exact match
      let predefinedKey = Object.keys(PREDEFINED_AUTHORS).find(k => k === cleanInputLC);
      // Try partial match
      if (!predefinedKey) {
        predefinedKey = Object.keys(PREDEFINED_AUTHORS).find(k => k.includes(cleanInputLC) || cleanInputLC.includes(k));
      }
      if (predefinedKey) {
        const authorQuotes = PREDEFINED_AUTHORS[predefinedKey];
        const available = authorQuotes.filter(q => !historySet.has(q.quote.toLowerCase()));
        const selected = available.length > 0
          ? available[Math.floor(Math.random() * available.length)]
          : authorQuotes[Math.floor(Math.random() * authorQuotes.length)];
        quoteText  = selected.quote;
        quoteAuthor = selected.author;
      }
    }

    // Alias for use in later steps
    const cleanMovieInput = cleanInput;

    // -----------------------------------------------------------------------
    // STEP 1: Try Groq AI for Live Real-Time Philosophical / Movie / Author Generation
    // -----------------------------------------------------------------------
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!quoteText && groqApiKey && groqApiKey.trim() !== '' && !groqApiKey.includes('your_groq_api_key')) {
      try {
        let systemPrompt = "";
        let userPrompt = "";

        if (isMovieMode && cleanMovieInput) {
          systemPrompt = `You are a film scholar and quote engine for "Every Feeling Has a Meaning".
The user has requested a quote from the movie: "${cleanMovieInput}".
STRICT RULES:
1. Verify if "${cleanMovieInput}" is a Movie. If it is a video game, TV show, book, or anything OTHER than a movie, output exactly: {"quote": "I can only reflect upon cinematic movies.", "author": "Night Sky"} and STOP.
2. If it is a movie, generate ONE real, iconic, 100% complete dialogue spoken in it. Support Global Cinema (Hollywood, Bollywood, etc).
3. State the exact character who spoke it in the author field (e.g., "Cooper (Interstellar)").
4. Must be a complete sentence ending with punctuation. Always provide the FULL quote without truncation.
5. DO NOT include any quotes referencing "Allah".
6. DO NOT repeat these past quotes: ${generatedQuoteHistory.slice(-20).join(" | ")}
7. Respond ONLY with valid JSON: {"quote": "Complete quote text.", "author": "Character Name (Film Title)"}`;
          userPrompt = `Give me an iconic dialogue from the movie: "${cleanMovieInput}"`;
        } else if (isAuthorMode && cleanMovieInput) {
          systemPrompt = `You are a literary and philosophical archivist for "Every Feeling Has a Meaning".
The user wants a quote specifically from: "${cleanMovieInput}".
STRICT RULES:
1. Identify the most likely famous author, philosopher, or poet based on "${cleanMovieInput}" (may be partial name).
2. Generate ONE profound, authentic, and complete quote originally written by this identified person.
3. State their exact full name in the author field.
4. Must be a complete sentence ending with punctuation. Always provide the FULL quote without truncation.
5. DO NOT include any quotes referencing "Allah".
6. DO NOT repeat these past quotes: ${generatedQuoteHistory.slice(-20).join(" | ")}
7. Respond ONLY with valid JSON: {"quote": "Complete quote text.", "author": "Author Full Name"}`;
          userPrompt = `Provide a meaningful quote by: "${cleanMovieInput}"`;
        } else {
          systemPrompt = `You are a profound philosopher for an app named "Every Feeling Has a Meaning".
The user will describe how they FEEL. Inspire them with deep, meaningful wisdom about that exact emotion.
Do NOT treat the user's input as an author name. It is a description of an emotional state.
STRICT RULES:
1. Generate ONE profound, complete quote matching the feeling of "${cleanMovieInput || 'the quiet of night'}".
2. Attribute it to a real classic philosopher (Marcus Aurelius, Nietzsche, Camus, Rilke, Seneca, Rumi, etc.) or "The Night Sky".
3. DO NOT include any quotes referencing "Allah".
4. DO NOT literally use words like "crescent" or "full" in the quote.
5. DO NOT repeat these past quotes: ${generatedQuoteHistory.slice(-20).join(" | ")}
6. Respond ONLY with valid JSON: {"quote": "Complete full quote text.", "author": "Philosopher Name"}`;
          userPrompt = `The user feels: "${cleanMovieInput || activeCategory}". Give a philosophical quote about this feeling.`;
        }

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.75,
            max_tokens: 500,
            response_format: { type: 'json_object' }
          })
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          let contentStr = groqData?.choices?.[0]?.message?.content;
          if (contentStr) {
            contentStr = contentStr.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(contentStr);
            if (parsed.quote && isCompleteSentence(parsed.quote) && !historySet.has(parsed.quote.trim().toLowerCase())) {
              quoteText = parsed.quote.trim();
              quoteAuthor = parsed.author || (isMovieMode ? `${cleanMovieInput} Cinema` : (isAuthorMode ? cleanMovieInput : 'Philosopher'));
            }
          }
        } else {
          const errBody = await groqRes.text();
          console.warn('Groq API error:', groqRes.status, errBody);
        }
      } catch (groqErr) {
        console.warn('Groq API warning:', groqErr.message);
      }
    }

    // -----------------------------------------------------------------------
    // STEP 2: If Movie Mode and Gemini didn't provide a quote, try Live Real-Time Wikiquote API Fetching
    // -----------------------------------------------------------------------
    if (!quoteText && isMovieMode && cleanMovieInput) {
      const liveMovieResult = await fetchRealTimeWikiquoteMovie(cleanMovieInput, historySet);
      if (liveMovieResult && isCompleteSentence(liveMovieResult.quote)) {
        quoteText = liveMovieResult.quote;
        quoteAuthor = liveMovieResult.author;
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
      } else if (isAuthorMode && cleanMovieInput) {
        let available = CLASSIC_PHILOSOPHERS.filter(item => !historySet.has(item.quote.toLowerCase()));
        
        const authorMatch = available.filter(item => item.author.toLowerCase().includes(cleanMovieInput.toLowerCase()));
        if (authorMatch.length > 0) {
            const selected = authorMatch[Math.floor(Math.random() * authorMatch.length)];
            quoteText = selected.quote;
            quoteAuthor = selected.author;
        } else {
            quoteText = `The words of ${cleanMovieInput} echo in the silence, though they escape my memory tonight.`;
            quoteAuthor = "Philosophical Archive";
        }
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
