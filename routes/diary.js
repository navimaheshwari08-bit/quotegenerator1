import express from 'express';
import DiaryEntry from '../models/DiaryEntry.js';
import { authMiddleware } from './auth.js';
import { getDBStatus } from '../config/db.js';

const router = express.Router();

// In-memory fallback diary store if MongoDB is offline
const inMemoryDiary = [];

// GET /api/diary - Retrieve user's saved quotes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    if (getDBStatus()) {
      const entries = await DiaryEntry.find({ userId }).sort({ createdAt: -1 });
      return res.json({ entries });
    } else {
      // In-memory fallback
      const userEntries = inMemoryDiary
        .filter(item => item.userId.toString() === userId.toString())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ entries: userEntries });
    }
  } catch (error) {
    console.error('Error fetching diary entries:', error);
    res.status(500).json({ error: 'Failed to retrieve diary entries' });
  }
});

// POST /api/diary - Save a quote to personal Moon Diary
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { quote, author, moonPhase, category, movieTitle, isMovieMode, userInput, note } = req.body;

    if (!quote) {
      return res.status(400).json({ error: 'Quote content is required to save to diary' });
    }

    if (getDBStatus()) {
      const entry = new DiaryEntry({
        userId,
        quote,
        author: author || 'Anonymous Mind',
        moonPhase: moonPhase || 'full',
        category: category || 'General',
        movieTitle: movieTitle || null,
        isMovieMode: !!isMovieMode,
        userInput: userInput || '',
        note: note || ''
      });

      await entry.save();
      return res.status(201).json({ message: 'Saved to Moon Diary', entry });
    } else {
      // In-memory fallback
      const newEntry = {
        _id: 'diary_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId,
        quote,
        author: author || 'Anonymous Mind',
        moonPhase: moonPhase || 'full',
        category: category || 'General',
        movieTitle: movieTitle || null,
        isMovieMode: !!isMovieMode,
        userInput: userInput || '',
        note: note || '',
        createdAt: new Date().toISOString()
      };

      inMemoryDiary.unshift(newEntry);
      return res.status(201).json({ message: 'Saved to Moon Diary (Demo Mode)', entry: newEntry });
    }
  } catch (error) {
    console.error('Error saving diary entry:', error);
    res.status(500).json({ error: 'Failed to save quote to diary' });
  }
});

// DELETE /api/diary/:id - Remove a saved quote entry
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const entryId = req.params.id;

    if (getDBStatus()) {
      const deleted = await DiaryEntry.findOneAndDelete({ _id: entryId, userId });
      if (!deleted) {
        return res.status(404).json({ error: 'Entry not found or unauthorized' });
      }
      return res.json({ message: 'Diary entry deleted successfully', id: entryId });
    } else {
      // In-memory fallback
      const index = inMemoryDiary.findIndex(item => item._id === entryId && item.userId.toString() === userId.toString());
      if (index === -1) {
        return res.status(404).json({ error: 'Entry not found or unauthorized' });
      }
      inMemoryDiary.splice(index, 1);
      return res.json({ message: 'Diary entry deleted successfully', id: entryId });
    }
  } catch (error) {
    console.error('Error deleting diary entry:', error);
    res.status(500).json({ error: 'Failed to delete diary entry' });
  }
});

export default router;
