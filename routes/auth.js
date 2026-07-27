import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { getDBStatus } from '../config/db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_moon_key_2026_feelings';

// In-memory fallback user store if MongoDB is offline
const inMemoryUsers = new Map();

// Helper to generate JWT token
const generateToken = (userId, email) => {
  return jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
};

// Auth middleware for protected routes
export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (getDBStatus()) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      const user = new User({ email: cleanEmail, password });
      await user.save();

      const token = generateToken(user._id, user.email);
      return res.status(201).json({
        message: 'Signup successful',
        token,
        user: { id: user._id, email: user.email }
      });
    } else {
      // In-Memory Fallback Mode
      if (inMemoryUsers.has(cleanEmail)) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const mockId = 'mem_' + Date.now();
      const userObj = { id: mockId, email: cleanEmail, password: hashedPassword };
      inMemoryUsers.set(cleanEmail, userObj);

      const token = generateToken(mockId, cleanEmail);
      return res.status(201).json({
        message: 'Signup successful (Demo In-Memory Mode)',
        token,
        user: { id: mockId, email: cleanEmail }
      });
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message || 'Server error during signup' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (getDBStatus()) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      const token = generateToken(user._id, user.email);
      return res.json({
        message: 'Login successful',
        token,
        user: { id: user._id, email: user.email }
      });
    } else {
      // In-Memory Fallback Mode
      const userObj = inMemoryUsers.get(cleanEmail);
      if (!userObj) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, userObj.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      const token = generateToken(userObj.id, userObj.email);
      return res.json({
        message: 'Login successful (Demo In-Memory Mode)',
        token,
        user: { id: userObj.id, email: userObj.email }
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
