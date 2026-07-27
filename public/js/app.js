/**
 * 🌙 "EVERY FEELING HAS A MEANING" - AUTH GATED FRONTEND APP
 */

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    moonPhase: 'full',
    category: 'Clarity',
    isMovieMode: false,
    userInput: '',
    currentQuote: null,
    sessionHistory: [],
    token: localStorage.getItem('moon_auth_token') || null,
    user: JSON.parse(localStorage.getItem('moon_user') || 'null'),
    diaryEntries: [],
    diaryFilter: 'all'
  };

  // Views & Header
  const navControls = document.getElementById('navControls');
  const lockedView = document.getElementById('lockedView');
  const unlockedApp = document.getElementById('unlockedApp');

  // Lock Auth Form Elements
  const lockLoginTab = document.getElementById('lockLoginTab');
  const lockSignupTab = document.getElementById('lockSignupTab');
  const lockAuthForm = document.getElementById('lockAuthForm');
  const lockAuthEmail = document.getElementById('lockAuthEmail');
  const lockAuthPassword = document.getElementById('lockAuthPassword');
  const lockAuthSubmitBtn = document.getElementById('lockAuthSubmitBtn');
  const lockAuthErrorMsg = document.getElementById('lockAuthErrorMsg');
  let isLockAuthModeLogin = true;

  // Unlocked App Elements
  const fullMoonCard = document.getElementById('fullMoonCard');
  const crescentMoonCard = document.getElementById('crescentMoonCard');
  const movieModeBtn = document.getElementById('movieModeBtn');
  
  const categoryPills = document.getElementById('categoryPills');
  const userInputText = document.getElementById('userInputText');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const inputFieldWrap = userInputText?.closest('.input-field-wrap');
  
  const suggestionsContainer = document.getElementById('suggestionsContainer');
  const movieSuggestionsContainer = document.getElementById('movieSuggestionsContainer');

  const generateQuoteBtn = document.getElementById('generateQuoteBtn');
  const refreshQuoteBtn = document.getElementById('refreshQuoteBtn');
  const copyQuoteBtn = document.getElementById('copyQuoteBtn');
  const saveQuoteBtn = document.getElementById('saveQuoteBtn');
  
  const quoteBody = document.getElementById('quoteBody');
  const quoteLoader = document.getElementById('quoteLoader');
  const quoteText = document.getElementById('quoteText');
  const quoteAuthor = document.getElementById('quoteAuthor');
  const quotePhaseBadge = document.getElementById('quotePhaseBadge');
  const quoteCategoryBadge = document.getElementById('quoteCategoryBadge');
  const quoteMovieBadge = document.getElementById('quoteMovieBadge');
  const sessionCount = document.getElementById('sessionCount');

  // Diary Elements
  const diaryDrawer = document.getElementById('diaryDrawer');
  const diaryOverlay = document.getElementById('diaryOverlay');
  const diaryList = document.getElementById('diaryList');
  const diaryFilters = document.getElementById('diaryFilters');
  const closeDiaryBtn = document.getElementById('closeDiaryBtn');

  // Save Modal Elements
  const saveModalOverlay = document.getElementById('saveModalOverlay');
  const closeSaveModalBtn = document.getElementById('closeSaveModalBtn');
  const cancelSaveBtn = document.getElementById('cancelSaveBtn');
  const confirmSaveBtn = document.getElementById('confirmSaveBtn');
  const saveModalQuoteText = document.getElementById('saveModalQuoteText');
  const saveNoteText = document.getElementById('saveNoteText');

  const toastContainer = document.getElementById('toastContainer');

  // Initialize
  const init = async () => {
    initStarfieldCanvas();
    if (state.token && state.user) {
      const isValid = await verifySession();
      if (isValid) {
        showUnlockedView();
        await fetchDiaryEntries();
        generateQuote();
      } else {
        showLockedView();
      }
    } else {
      showLockedView();
    }
  };

  // View Switchers & Corner Email Update
  const showLockedView = () => {
    lockedView.classList.remove('hidden');
    unlockedApp.classList.add('hidden');

    navControls.innerHTML = `
      <span class="corner-user-badge" style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: var(--text-secondary);">
        <i class="fa-solid fa-lock"></i> Access Locked
      </span>
    `;
  };

  const showUnlockedView = () => {
    lockedView.classList.add('hidden');
    unlockedApp.classList.remove('hidden');

    // Display user email cleanly in the top right corner!
    const userEmailStr = state.user ? state.user.email : 'User';
    navControls.innerHTML = `
      <span class="corner-user-badge" title="Logged in account">
        <i class="fa-solid fa-circle-user"></i> ${escapeHTML(userEmailStr)}
      </span>
      <button class="nav-btn" id="openDiaryBtn">
        <i class="fa-solid fa-book-bookmark"></i>
        <span>Diary</span>
        <span class="diary-count-badge" id="diaryCount">${state.diaryEntries.length}</span>
      </button>
      <button class="logout-btn" id="logoutBtn" title="Sign out">
        <i class="fa-solid fa-right-from-bracket"></i> Logout
      </button>
    `;

    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('openDiaryBtn')?.addEventListener('click', () => toggleDiary(true));
  };

  // Lock Screen Auth Handlers
  lockLoginTab.addEventListener('click', () => {
    isLockAuthModeLogin = true;
    lockLoginTab.classList.add('active');
    lockSignupTab.classList.remove('active');
    lockAuthSubmitBtn.querySelector('span').textContent = 'Sign In to Access App';
    lockAuthErrorMsg.classList.add('hidden');
  });

  lockSignupTab.addEventListener('click', () => {
    isLockAuthModeLogin = false;
    lockSignupTab.classList.add('active');
    lockLoginTab.classList.remove('active');
    lockAuthSubmitBtn.querySelector('span').textContent = 'Create Account & Unlock';
    lockAuthErrorMsg.classList.add('hidden');
  });

  lockAuthForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = lockAuthEmail.value.trim();
    const password = lockAuthPassword.value.trim();

    if (!email || !password) return;

    lockAuthSubmitBtn.disabled = true;
    lockAuthSubmitBtn.querySelector('span').textContent = 'Authenticating...';
    lockAuthErrorMsg.classList.add('hidden');

    const endpoint = isLockAuthModeLogin ? '/api/auth/login' : '/api/auth/signup';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (response.ok && data.token) {
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('moon_auth_token', data.token);
        localStorage.setItem('moon_user', JSON.stringify(data.user));

        showToast(`✨ Welcome, ${state.user.email}! Access unlocked.`);
        showUnlockedView();
        await fetchDiaryEntries();
        generateQuote();
      } else {
        lockAuthErrorMsg.textContent = data.error || 'Authentication failed';
        lockAuthErrorMsg.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Auth error:', err);
      lockAuthErrorMsg.textContent = 'Server connection failed. Please try again.';
      lockAuthErrorMsg.classList.remove('hidden');
    } finally {
      lockAuthSubmitBtn.disabled = false;
      lockAuthSubmitBtn.querySelector('span').textContent = isLockAuthModeLogin ? 'Sign In to Access App' : 'Create Account & Unlock';
    }
  });

  const verifySession = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (!res.ok) {
        logout();
        return false;
      }
      return true;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const logout = () => {
    state.token = null;
    state.user = null;
    state.diaryEntries = [];
    localStorage.removeItem('moon_auth_token');
    localStorage.removeItem('moon_user');
    showLockedView();
    showToast('Logged out successfully.');
  };

  // Moon Phase Switch
  const setMoonPhase = (phase) => {
    state.moonPhase = phase;
    document.body.className = `theme-${phase}`;

    if (phase === 'full') {
      fullMoonCard.classList.add('active');
      crescentMoonCard.classList.remove('active');
      if (['Solitude', 'Melancholy', 'Longing', 'Introspection'].includes(state.category)) {
        setCategory('Clarity');
      }
    } else {
      crescentMoonCard.classList.add('active');
      fullMoonCard.classList.remove('active');
      if (['Clarity', 'Wholeness', 'Existential', 'Absurdism'].includes(state.category)) {
        setCategory('Solitude');
      }
    }
    showToast(`Switched to ${phase === 'full' ? '🌕 Full Moon' : '🌙 Crescent Moon'} mode.`);
  };

  fullMoonCard?.addEventListener('click', () => setMoonPhase('full'));
  crescentMoonCard?.addEventListener('click', () => setMoonPhase('crescent'));

  // Category Pills
  const setCategory = (cat) => {
    state.category = cat;
    document.querySelectorAll('.pill-btn').forEach(btn => {
      if (btn.getAttribute('data-cat') === cat) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  };

  categoryPills?.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill-btn');
    if (pill) setCategory(pill.getAttribute('data-cat'));
  });

  // Movie Mode Toggle Pill
  movieModeBtn?.addEventListener('click', () => {
    state.isMovieMode = !state.isMovieMode;
    if (state.isMovieMode) {
      movieModeBtn.classList.add('active');
      inputFieldWrap?.classList.add('movie-active');
      userInputText.placeholder = 'Enter movie title (e.g. Interstellar, Eternal Sunshine)...';
      suggestionsContainer.classList.add('hidden');
      movieSuggestionsContainer.classList.remove('hidden');
      showToast('🎥 Movie Mode Activated');
    } else {
      movieModeBtn.classList.remove('active');
      inputFieldWrap?.classList.remove('movie-active');
      userInputText.placeholder = 'What is in your heart tonight? (or movie title in Movie Mode)...';
      movieSuggestionsContainer.classList.add('hidden');
      suggestionsContainer.classList.remove('hidden');
    }
  });

  // Suggestion Chip clicks
  document.querySelectorAll('.sugg-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      userInputText.value = chip.getAttribute('data-val');
      clearInputBtn.classList.add('visible');
      userInputText.focus();
    });
  });

  userInputText?.addEventListener('input', () => {
    if (userInputText.value.trim().length > 0) clearInputBtn.classList.add('visible');
    else clearInputBtn.classList.remove('visible');
  });

  clearInputBtn?.addEventListener('click', () => {
    userInputText.value = '';
    clearInputBtn.classList.remove('visible');
    userInputText.focus();
  });

  // AI Quote Generation
  const generateQuote = async () => {
    if (!state.token) return;

    state.userInput = userInputText.value.trim();
    quoteBody.classList.add('hidden');
    quoteLoader.classList.remove('hidden');

    try {
      const response = await fetch('/api/quotes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moonPhase: state.moonPhase,
          category: state.category,
          userInput: state.userInput,
          isMovieMode: state.isMovieMode,
          history: state.sessionHistory
        })
      });

      const data = await response.json();
      if (data.quote) {
        state.currentQuote = data;
        if (!state.sessionHistory.includes(data.quote)) {
          state.sessionHistory.push(data.quote);
        }
        renderQuoteCard(data);
      }
    } catch (err) {
      console.error('Quote gen error:', err);
      showToast('⚠️ Could not connect to AI server.', 'error');
    } finally {
      quoteLoader.classList.add('hidden');
      quoteBody.classList.remove('hidden');
    }
  };

  const renderQuoteCard = (quoteData) => {
    quoteText.textContent = `"${quoteData.quote}"`;
    quoteAuthor.textContent = `— ${quoteData.author}`;
    quotePhaseBadge.textContent = quoteData.moonPhase === 'full' ? '🌕 Full Moon' : '🌙 Crescent Moon';
    quoteCategoryBadge.textContent = quoteData.category;

    if (quoteData.isMovieMode && quoteData.userInput) {
      quoteMovieBadge.textContent = `🎥 ${quoteData.userInput}`;
      quoteMovieBadge.classList.remove('hidden');
    } else {
      quoteMovieBadge.classList.add('hidden');
    }

    sessionCount.textContent = state.sessionHistory.length;
  };

  generateQuoteBtn?.addEventListener('click', generateQuote);
  refreshQuoteBtn?.addEventListener('click', generateQuote);

  copyQuoteBtn?.addEventListener('click', () => {
    if (!state.currentQuote) return;
    navigator.clipboard.writeText(`"${state.currentQuote.quote}" ${quoteAuthor.textContent}`).then(() => {
      showToast('✨ Copied to clipboard!');
    });
  });

  // Save Modal & Diary Sync
  saveQuoteBtn?.addEventListener('click', () => {
    if (!state.currentQuote) return;
    saveModalQuoteText.textContent = `"${state.currentQuote.quote}"`;
    saveNoteText.value = '';
    saveModalOverlay.classList.remove('hidden');
  });

  closeSaveModalBtn?.addEventListener('click', () => saveModalOverlay.classList.add('hidden'));
  cancelSaveBtn?.addEventListener('click', () => saveModalOverlay.classList.add('hidden'));

  confirmSaveBtn?.addEventListener('click', async () => {
    if (!state.currentQuote) return;

    try {
      const response = await fetch('/api/diary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({
          quote: state.currentQuote.quote,
          author: state.currentQuote.author,
          moonPhase: state.currentQuote.moonPhase,
          category: state.currentQuote.category,
          movieTitle: state.currentQuote.isMovieMode ? state.currentQuote.userInput : null,
          isMovieMode: state.currentQuote.isMovieMode,
          userInput: state.currentQuote.userInput,
          note: saveNoteText.value.trim()
        })
      });

      if (response.ok) {
        showToast('📖 Saved to your Moon Diary!');
        saveModalOverlay.classList.add('hidden');
        await fetchDiaryEntries();
      }
    } catch (err) {
      console.error('Save error:', err);
    }
  });

  const fetchDiaryEntries = async () => {
    if (!state.token) return;
    try {
      const response = await fetch('/api/diary', {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      const data = await response.json();
      if (response.ok && data.entries) {
        state.diaryEntries = data.entries;
        const diaryCountBadge = document.getElementById('diaryCount');
        if (diaryCountBadge) diaryCountBadge.textContent = state.diaryEntries.length;
        renderDiaryList();
      }
    } catch (err) {
      console.error('Fetch diary error:', err);
    }
  };

  const renderDiaryList = () => {
    const filtered = state.diaryEntries.filter(entry => {
      if (state.diaryFilter === 'full') return entry.moonPhase === 'full';
      if (state.diaryFilter === 'crescent') return entry.moonPhase === 'crescent';
      if (state.diaryFilter === 'movie') return entry.isMovieMode;
      return true;
    });

    if (filtered.length === 0) {
      diaryList.innerHTML = `<div class="diary-empty"><p>No saved entries in your diary.</p></div>`;
      return;
    }

    diaryList.innerHTML = filtered.map(entry => `
      <div class="diary-item" data-id="${entry._id}">
        <div class="diary-item-header">
          <span>${entry.moonPhase === 'full' ? '🌕 Full' : '🌙 Crescent'} • ${entry.category}</span>
          <span>${new Date(entry.createdAt).toLocaleDateString()}</span>
        </div>
        <p class="diary-item-quote">"${entry.quote}"</p>
        <div class="diary-item-author">— ${entry.author}</div>
        ${entry.note ? `<div class="diary-item-note">${escapeHTML(entry.note)}</div>` : ''}
        <div class="diary-item-footer">
          ${entry.movieTitle ? `<span class="mini-tag movie-tag">🎥 ${escapeHTML(entry.movieTitle)}</span>` : '<span></span>'}
          <button class="delete-btn" onclick="deleteDiaryItem('${entry._id}')"><i class="fa-regular fa-trash-can"></i> Delete</button>
        </div>
      </div>
    `).join('');
  };

  window.deleteDiaryItem = async (entryId) => {
    if (!state.token) return;
    if (!confirm('Delete this diary entry?')) return;
    try {
      const response = await fetch(`/api/diary/${entryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (response.ok) {
        showToast('🗑️ Entry deleted.');
        state.diaryEntries = state.diaryEntries.filter(e => e._id !== entryId);
        const diaryCountBadge = document.getElementById('diaryCount');
        if (diaryCountBadge) diaryCountBadge.textContent = state.diaryEntries.length;
        renderDiaryList();
      }
    } catch (err) {
      console.error(err);
    }
  };

  diaryFilters?.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (btn) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.diaryFilter = btn.getAttribute('data-filter');
      renderDiaryList();
    }
  });

  const toggleDiary = (show) => {
    if (show) {
      diaryDrawer.classList.remove('hidden');
      diaryOverlay.classList.remove('hidden');
      fetchDiaryEntries();
    } else {
      diaryDrawer.classList.add('hidden');
      diaryOverlay.classList.add('hidden');
    }
  };

  closeDiaryBtn?.addEventListener('click', () => toggleDiary(false));
  diaryOverlay?.addEventListener('click', () => toggleDiary(false));

  const showToast = (msg) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  };

  const escapeHTML = (str) => {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
  };

  function initStarfieldCanvas() {
    const canvas = document.getElementById('starCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.2 + 0.3,
      alpha: Math.random(),
      speed: Math.random() * 0.01 + 0.003
    }));

    function animate() {
      ctx.clearRect(0, 0, width, height);
      stars.forEach(star => {
        star.alpha += star.speed;
        if (star.alpha > 0.9 || star.alpha < 0.2) star.speed = -star.speed;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    animate();
  }

  init();
});
