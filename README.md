# 🌙 Every Feeling Has a Meaning

> A mood-driven AI quote generator and personal celestial diary application built with Node.js, Express, MongoDB Atlas, HTML5, Vanilla CSS, and Groq AI (LLaMA 3.3 70B).

---

## 🌟 Overview

**"Every Feeling Has a Meaning"** channels emotional states and celestial moon phases into tailored, poetic quotes. It features a locked authentication entry screen, interactive Moon Phase selector (🌕 Full Moon vs 🌙 Crescent Moon), Movie Mode for cinematic mood quotes, session quote deduplication, and a cloud-synced personal Moon Diary.

---

## ✨ Features

- **🤖 AI Quote Generation (Groq + LLaMA 3.3 70B)**:
  - Generates quotes shaped by Moon Phase, Emotional Categories, User Input, and Movie Mode.
  - Smart offline fallback engine included for zero-downtime testing.
- **🔐 Auth & Access Gating System**:
  - Gated application access requiring login/signup.
  - Passwords hashed with `bcryptjs` before storage.
  - Displays user email in the top right corner upon login.
  - Session persistence via `localStorage` and JWT token headers.
- **🎥 Movie Mode**:
  - Enter iconic film names (e.g., *Interstellar*, *Eternal Sunshine of the Spotless Mind*, *Inception*) to generate quotes matching their emotional depth.
- **🌕 Two Lunar Emotional Modes**:
  - **🌕 Full Moon**: Clarity, Wholeness, Existential Truth, Absurdism.
  - **🌙 Crescent Moon**: Solitude, Melancholy, Longing, Introspection.
- **📖 Personal Moon Diary**:
  - Save quotes with custom reflections/notes to MongoDB Atlas.
  - Filter diary entries by Moon Phase, Movie Mode, or Category.
  - Delete entries anytime with instant cloud sync.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, Vanilla CSS (Glassmorphic Dark Space Theme), Vanilla JavaScript, Canvas Starfield |
| **Backend** | Node.js, Express v5 |
| **Database** | MongoDB Atlas (Mongoose) with In-Memory Demo Fallback |
| **AI API** | Groq API (`llama-3.3-70b-versatile`) |
| **Auth** | JSON Web Token (JWT) & bcryptjs |

---

## 🚀 Quick Start & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/niteshcipher/project1.git
   cd project1
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/every_feeling_db
   JWT_SECRET=super_secret_moon_key_2026_feelings
   GROQ_API_KEY=gsk_your_groq_api_key_here
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

5. **Open in browser**:
   Navigate to `http://localhost:3000`

---

## 📜 License

Distributed under the ISC License.
