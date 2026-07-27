import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import quoteRoutes from './routes/quotes.js';
import diaryRoutes from './routes/diary.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB Atlas / Local Database
connectDB();

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/diary', diaryRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'Every Feeling Has a Meaning',
    timestamp: new Date().toISOString()
  });
});

// Fallback to index.html for Single Page App routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Express server
app.listen(PORT, () => {
  console.log(`✨ "Every Feeling Has a Meaning" Server running at: http://localhost:${PORT}`);
});
