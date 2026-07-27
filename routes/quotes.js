import express from 'express';
import Groq from 'groq-sdk';

const router = express.Router();

// Curated fallbacks by Moon phase & category for offline/demo reliability
const FALLBACK_QUOTES = {
  full: {
    Clarity: [
      { quote: "The moon does not fight the darkness, nor does it hide from it. It simply shines with whatever light it has gathered.", author: "Marcus Aurelius & The Lunar Mind" },
      { quote: "Everything becomes remarkably transparent when you realize clarity is not about having all answers, but accepting what is right in front of you.", author: "Astral Meditations" },
      { quote: "In the glaring light of full realization, truth is rarely subtle. It stands stark, unapologetic, and beautiful.", author: "Celestial Philosophy" }
    ],
    Wholeness: [
      { quote: "You are not a broken mirror trying to piece itself together; you are the night sky holding both light and void in perfect equilibrium.", author: "Starlight Dialogues" },
      { quote: "To feel whole is to accept that even the shadowed side of your soul is part of the same glowing sphere.", author: "Cosmic Reflections" }
    ],
    Absurdism: [
      { quote: "The universe is a grand cosmic joke, and under the full moon, the only sensible response is to laugh with quiet reverence.", author: "Albert Camus & The Night" },
      { quote: "We are star-stuff spinning on a rock in endless space; do not take your small heartbreaks more seriously than the galaxy itself.", author: "Lunar Paradox" }
    ],
    Existential: [
      { quote: "To exist is to be meaningful without a manual. The full moon asks for no justification, and neither should you.", author: "Jean-Paul Sartre & Moonbeams" },
      { quote: "We are observers created by the universe to marvel at its own vast, silent grandeur.", author: "Carl Sagan Cosmic Resonance" }
    ],
    Love: [
      { quote: "True love does not eclipse the other; it lights up the dark spaces both had kept hidden in fear.", author: "Rumi & The Full Tide" },
      { quote: "Under a clear full sky, love is not a promise of tomorrow, but an overwhelming truth of now.", author: "Ethereal Whispers" }
    ],
    Grief: [
      { quote: "Grief is the price we pay for having loved so fully. It shines like a beacon of how deeply we cared.", author: "Lunar Elegies" },
      { quote: "The full moon reminds us that what reaches its peak must fade, yet the sky never forgets its light.", author: "Silent Solace" }
    ]
  },
  crescent: {
    Solitude: [
      { quote: "Solitude is not emptiness; it is the sacred quiet where your true voice learns how to sing without an audience.", author: "Rainer Maria Rilke" },
      { quote: "The crescent moon carries only a sliver of light, yet it holds the entire shadow in gentle arms.", author: "Nocturnal Journal" }
    ],
    Melancholy: [
      { quote: "There is a quiet beauty in melancholy—it is the heart's way of remembering how deeply it can feel.", author: "Fernando Pessoa & Crescent Shadow" },
      { quote: "Rain on glass, a crescent sky, and a thought that drifts into the dark like perfume on midnight air.", author: "Midnight Reflections" }
    ],
    Longing: [
      { quote: "Longing is the bridge between who you are tonight and who you dream of becoming under tomorrow's stars.", author: "Celestial Echoes" },
      { quote: "We crave what is just beyond our reach, not because we lack it, but because the reach itself expands our soul.", author: "Lunar Wanderer" }
    ],
    Introspection: [
      { quote: "Turn your gaze inward. The soft crescent light reveals what the bright sun always burns away.", author: "Taoist Night Verses" },
      { quote: "In the subtle curve of the crescent moon, learn the grace of quiet growth in the dark.", author: "Inner Horizon" }
    ],
    Hope: [
      { quote: "Even when the light is reduced to a tiny silver arc, it holds the seed of a full moon to come.", author: "Cosmic Hope" },
      { quote: "A crescent moon proves that even in partial darkness, beauty remains unbroken.", author: "Silver Lining Verses" }
    ],
    Love: [
      { quote: "I love you like the crescent moon loves the midnight sky—quietly, softly, and with a gentle ache.", author: "Poetic Shadow" }
    ]
  }
};

// MOVIE MODE Fallbacks for iconic films
const MOVIE_FALLBACKS = {
  interstellar: [
    { quote: "Love is the one thing we're capable of perceiving that transcends dimensions of time and space.", author: "Interstellar Cinematic Echo" },
    { quote: "We used to look up at the sky and wonder at our place in the stars. Now we just look down and worry about our place in the dirt.", author: "Interstellar Mood" }
  ],
  inception: [
    { quote: "An idea is like a virus. Resilient. Highly contagious. And even the smallest seed of an idea can grow to define or destroy you.", author: "Inception Dream Logic" },
    { quote: "You're waiting for a train. A train that will take you far away. You know where you hope this train will take you, but you can't be sure.", author: "Inception Subconscious" }
  ],
  "eternal sunshine": [
    { quote: "How painful it is to forget someone, but how much more painful to realize they are erasing you from their mind.", author: "Eternal Sunshine Resonance" },
    { quote: "Meet me in Montauk under the silver crescent moon.", author: "Eternal Sunshine Solitude" }
  ],
  "la la land": [
    { quote: "Here's to the fools who dream, crazy as they may seem. Here's to the hearts that ache, here's to the mess we make.", author: "La La Land Celestial Nostalgia" }
  ],
  "blade runner": [
    { quote: "All those moments will be lost in time, like tears in rain. Time to die... or to shine beneath the stars.", author: "Blade Runner Absurdist Truth" }
  ]
};

// POST /api/quotes/generate
router.post('/generate', async (req, res) => {
  try {
    const {
      moonPhase = 'full',      // 'full' or 'crescent'
      category = 'Clarity',    // 'Clarity', 'Wholeness', 'Absurdism', 'Existential', 'Solitude', 'Melancholy', 'Longing', 'Introspection', 'Love', 'Grief', 'Hope'
      userInput = '',          // feeling description or movie name
      isMovieMode = false,     // boolean flag for Movie Mode
      history = []             // array of quote strings already shown this session
    } = req.body;

    const apiKey = process.env.GROQ_API_KEY;
    const historySet = new Set(history.map(q => q.trim().toLowerCase()));

    // Define Moon phase characteristics
    const moonKeywords = moonPhase === 'full'
      ? "🌕 Full Moon: Clarity, Wholeness, Existential Truth, Absurdism, Bold Revelation"
      : "🌙 Crescent Moon: Solitude, Melancholy, Longing, Quiet Introspection, Tender Nostalgia";

    // Attempt Groq API if API key is provided
    if (apiKey && apiKey.trim() !== '' && !apiKey.includes('your_groq_api_key')) {
      try {
        const groq = new Groq({ apiKey });

        let promptSystem = `You are a profound, poetic AI philosopher and mood sage for an app named "Every Feeling Has a Meaning".
Your task is to generate ONE single, deeply moving, original quote with an author/attribution.
Rules:
1. DO NOT repeat any of these previously shown quotes: ${JSON.stringify(history.slice(-10))}
2. Format output EXACTLY as JSON object: {"quote": "Your generated quote here", "author": "Attribution or Original Sage Name"}
3. Ensure the quote feels tailored to the current Moon Phase (${moonKeywords}), Emotional Category (${category}), and User Input context.`;

        let promptUser = `Moon Phase: ${moonPhase.toUpperCase()} MOON
Category: ${category}
${isMovieMode ? `Movie Mode Enabled! The user typed the film name: "${userInput}". Create a quote that encapsulates the emotional depth, atmosphere, and philosophical theme of this movie while harmonizing with the ${moonPhase} moon.` : `User Feeling/Thoughts: "${userInput || 'Navigating the silence of the night'}"`}

Generate a memorable, poetic 1 to 3 sentence quote that speaks directly to this state of mind.`;

        const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: promptSystem },
            { role: 'user', content: promptUser }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.8,
          max_tokens: 300,
          response_format: { type: "json_object" }
        });

        const rawContent = chatCompletion.choices[0]?.message?.content;
        if (rawContent) {
          const parsed = JSON.parse(rawContent);
          if (parsed.quote && !historySet.has(parsed.quote.trim().toLowerCase())) {
            return res.json({
              quote: parsed.quote,
              author: parsed.author || (isMovieMode ? `${userInput} Resonance` : 'Lunar Wisdom'),
              moonPhase,
              category,
              isMovieMode,
              userInput,
              source: 'groq-llama-3.3-70b'
            });
          }
        }
      } catch (groqError) {
        console.warn('⚠️ Groq API warning/fallback:', groqError.message);
      }
    }

    // Fallback logic if Groq is unavailable or returned a duplicate
    let candidatePool = [];

    // Check movie fallback first if movie mode is enabled
    if (isMovieMode && userInput) {
      const filmKey = userInput.trim().toLowerCase();
      for (const [key, quotes] of Object.entries(MOVIE_FALLBACKS)) {
        if (filmKey.includes(key) || key.includes(filmKey)) {
          candidatePool.push(...quotes);
        }
      }
    }

    // Add category fallbacks
    const phaseKey = moonPhase === 'crescent' ? 'crescent' : 'full';
    const phaseQuotes = FALLBACK_QUOTES[phaseKey];
    if (phaseQuotes && phaseQuotes[category]) {
      candidatePool.push(...phaseQuotes[category]);
    }

    // Flatten all category quotes for that phase as general fallback pool
    if (phaseQuotes) {
      Object.values(phaseQuotes).forEach(list => candidatePool.push(...list));
    }

    // Filter out quotes already in history
    let freshQuotes = candidatePool.filter(q => !historySet.has(q.quote.trim().toLowerCase()));

    // If all candidates seen, generate a dynamic variation using userInput
    let finalQuoteObj;
    if (freshQuotes.length > 0) {
      finalQuoteObj = freshQuotes[Math.floor(Math.random() * freshQuotes.length)];
    } else {
      // Dynamic fallback synthesized from userInput & moon
      if (isMovieMode && userInput) {
        finalQuoteObj = {
          quote: `Like the lingering haunting echo of ${userInput}, under the ${moonPhase} moon, every feeling reveals its timeless meaning.`,
          author: `${userInput} Solitude`
        };
      } else {
        finalQuoteObj = {
          quote: `Even in the deepest shadow of "${userInput || category}", the ${moonPhase} moon holds your feelings with quiet grace.`,
          author: 'The Lunar Mind'
        };
      }
    }

    return res.json({
      quote: finalQuoteObj.quote,
      author: finalQuoteObj.author,
      moonPhase,
      category,
      isMovieMode,
      userInput,
      source: 'fallback-engine'
    });

  } catch (error) {
    console.error('Quote route error:', error);
    res.status(500).json({ error: 'Failed to generate quote' });
  }
});

export default router;
