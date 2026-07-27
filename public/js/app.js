/**
 * "Every Feeling Has a Meaning" - Application Control Engine
 * Integrated Landing Page, Auth Portal, Moon Gateway & Personal Diary
 */

// Dynamically target local development or production backend
const API_BASE_URL = (() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || window.location.protocol === 'file:') {
        return (window.location.port ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}` : 'http://localhost:3000');
    }
    return window.location.origin;
})();

let selectedMoon = 'full';
let activeCategory = 'All';
let inputMode = 'feeling'; 
let authMode = 'login'; 
let isSubmitting = false; 

const generatedQuoteHistory = [];

$(document).ready(function() {

    // ==========================================
    // 0. Navigation Engine (Section Switcher)
    // ==========================================
    function navigateTo(targetSection) {
        const sections = ['#landing-section', '#auth-section', '#gateway-section', '#dashboard-section', '#diary-section'];
        sections.forEach(s => {
            if (s === `#${targetSection}-section`) {
                $(s).removeClass('d-none').hide().fadeIn(300);
            } else {
                $(s).addClass('d-none');
            }
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ==========================================
    // 1. UI Helper: Popup Toast Notifications
    // ==========================================
    function showNotification(message, type = 'success') {
        const bgClass = type === 'success' ? 'bg-success' : 'bg-danger';
        const icon = type === 'success' ? '✓' : '⚠️';

        $('.auth-toast').remove();

        const toastHtml = `
            <div class="auth-toast ${bgClass} text-white shadow-lg rounded p-3 position-fixed top-0 end-0 m-4" 
                 style="z-index: 9999; min-width: 280px; display: none;">
                <div class="d-flex align-items-center justify-content-between">
                    <div>
                        <span class="me-2 fs-5">${icon}</span>
                        <span>${message}</span>
                    </div>
                    <button type="button" class="btn-close btn-close-white ms-3 toast-close"></button>
                </div>
            </div>
        `;

        $('body').append(toastHtml);
        const $toast = $('.auth-toast');
        
        $toast.fadeIn(300);

        const timer = setTimeout(() => {
            $toast.fadeOut(300, function() { $(this).remove(); });
        }, 3500);

        $toast.find('.toast-close').on('click', function() {
            clearTimeout(timer);
            $toast.fadeOut(200, function() { $(this).remove(); });
        });
    }

    // ==========================================
    // 2. Authentication Engine & Session State
    // ==========================================
    checkExistingSession();

    function checkExistingSession() {
        const activeUser = localStorage.getItem('nightSkyActiveUser');
        if (activeUser) {
            updateUserBadges(activeUser);
            // Direct to Moon Selection Gateway on active session
            navigateTo('gateway');
        } else {
            // Display attractive Landing Page if unauthenticated
            navigateTo('landing');
        }
    }

    function updateUserBadges(email) {
        $('#user-badge, #gateway-user-badge').text(`👤 ${email}`);
    }

    function loginUser(email) {
        localStorage.setItem('nightSkyActiveUser', email);
        updateUserBadges(email);
        $('#auth-email').val('');
        $('#auth-password').val('');
        // Direct to Moon Selection Page immediately post-login
        navigateTo('gateway');
    }

    function logoutUser() {
        localStorage.removeItem('nightSkyActiveUser');
        showNotification('You have logged out.', 'success');
        navigateTo('landing');
    }

    // Landing Page Action Triggers
    $('#landing-login-btn').on('click', function() {
        const activeUser = localStorage.getItem('nightSkyActiveUser');
        if (activeUser) {
            navigateTo('gateway');
        } else {
            navigateTo('auth');
        }
    });

    $('#landing-explore-btn').on('click', function() {
        const activeUser = localStorage.getItem('nightSkyActiveUser');
        if (activeUser) {
            navigateTo('gateway');
        } else {
            navigateTo('auth');
        }
    });

    // Auth Navigation & Toggle
    $('#auth-back-home-btn').on('click', function() {
        navigateTo('landing');
    });

    $(document).on('click', '#auth-toggle-link', function(e) {
        e.preventDefault();
        if (isSubmitting) return;

        $('#auth-error').addClass('d-none').text('');
        
        if (authMode === 'login') {
            authMode = 'signup';
            $('#auth-title').text('Create an Account');
            $('#auth-subtitle').text('Join the night sky to save your emotional echoes');
            $('#auth-submit-btn').text('Sign Up');
            $('#auth-toggle-text').html('Already have an account? <a href="#" id="auth-toggle-link" class="text-warning">Login</a>');
        } else {
            authMode = 'login';
            $('#auth-title').text('Login to Night Sky');
            $('#auth-subtitle').text('Enter your details to access your personal Moon Diary');
            $('#auth-submit-btn').text('Login');
            $('#auth-toggle-text').html('Don\'t have an account? <a href="#" id="auth-toggle-link" class="text-warning">Sign Up</a>');
        }
    });

    // Form Submission
    $('#auth-form').on('submit', async function(e) {
        e.preventDefault();
        if (isSubmitting) return;

        const email = $('#auth-email').val().trim().toLowerCase();
        const password = $('#auth-password').val().trim();
        const $btn = $('#auth-submit-btn');
        const errorEl = $('#auth-error');

        errorEl.addClass('d-none').text('');

        if (!email || !password) {
            errorEl.removeClass('d-none').text('Please fill in all required fields.');
            return;
        }

        if (password.length < 6) {
            errorEl.removeClass('d-none').text('Password must be at least 6 characters long.');
            return;
        }

        isSubmitting = true;
        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span> Processing...');

        const endpoint = authMode === 'signup' ? '/api/signup' : '/api/login';

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `Authentication failed (${response.status})`);
            }

            const data = await response.json();
            showNotification(data.message || 'Success!', 'success');
            loginUser(data.email || email);

        } catch (err) {
            console.error('Auth error:', err);
            errorEl.removeClass('d-none').text(err.message || 'Cannot connect to server.');
            showNotification(err.message || 'Server connection failed.', 'error');
        } finally {
            isSubmitting = false;
            $btn.prop('disabled', false).text(authMode === 'login' ? 'Login' : 'Sign Up');
        }
    });

    // Logout Handlers
    $('#logout-btn, #gateway-logout-btn').on('click', function() {
        logoutUser();
    });

    // ==========================================
    // 3. Moon Gateway Controls & Back Buttons
    // ==========================================
    $('#gateway-back-home-btn').on('click', function() {
        navigateTo('landing');
    });

    $('.moon-card').on('click', function() {
        selectedMoon = $(this).data('moon');
        navigateTo('dashboard');
        generateLiveAIQuote();
    });

    $('#dashboard-back-moon-btn, #back-to-moons').on('click', function() {
        navigateTo('gateway');
    });

    // Diary View Controls & Back Buttons
    $('#view-diary-btn').on('click', function() {
        navigateTo('diary');
        loadUserDiary();
    });

    $('#close-diary-btn, #close-diary-btn-top').on('click', function() {
        navigateTo('dashboard');
    });

    // Category Buttons
    $('.cat-btn').on('click', function() {
        $('.cat-btn').removeClass('active');
        $(this).addClass('active');
        activeCategory = $(this).data('category');
        generateLiveAIQuote();
    });

    // Movie Mode Toggle
    $('#toggle-movie-mode').on('click', function() {
        if (inputMode === 'feeling') {
            inputMode = 'movie';
            $(this).text('💭 Switch to Feeling Mode');
            $('#grok-feeling-input').attr('placeholder', 'e.g., Interstellar, Dead Poets Society, Fight Club...');
        } else {
            inputMode = 'feeling';
            $(this).text('🎬 Switch to Movie Mode');
            $('#grok-feeling-input').attr('placeholder', 'e.g., I feel like a ghost drifting through a crowded room...');
        }
    });

    // ==========================================
    // 4. Personal Moon Diary Management
    // ==========================================
    $('#save-quote-btn').on('click', async function() {
        const activeUser = localStorage.getItem('nightSkyActiveUser');
        
        if (!activeUser) {
            showNotification('Please log in to save quotes to your diary.', 'error');
            navigateTo('auth');
            return;
        }

        const quote = $('#quote-text').text().replace(/^"|"$/g, '').trim();
        const author = $('#quote-author').text().replace(/^—\s*/, '').trim();

        if (!quote || quote.includes('Gaze into the cosmos')) {
            showNotification('No valid quote available to save.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/diary/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: activeUser, quote, author, moon: selectedMoon })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `Server error (${response.status})`);
            }

            const data = await response.json();
            showNotification(data.message || 'Quote saved to your personal diary!', 'success');

        } catch (err) {
            console.error('Error saving quote:', err);
            showNotification(err.message || 'Server error while saving quote.', 'error');
        }
    });

    async function loadUserDiary() {
        const activeUser = localStorage.getItem('nightSkyActiveUser');
        if (!activeUser) return;

        $('#diary-container').html('<div class="text-center text-muted p-4"><span class="spinner-border spinner-border-sm me-2"></span> Loading your entries...</div>');

        try {
            const response = await fetch(`${API_BASE_URL}/api/diary?email=${encodeURIComponent(activeUser)}`);
            
            if (!response.ok) {
                throw new Error(`Failed to retrieve diary (${response.status})`);
            }

            const quotes = await response.json();

            if (quotes.length > 0) {
                let html = '';
                quotes.forEach(item => {
                    html += `
                        <div class="col-12 col-md-10" id="diary-item-${item._id}">
                            <div class="card bg-dark text-white border-secondary mb-3 shadow-sm text-start">
                                <div class="card-body p-4">
                                    <p class="card-text fs-5">"${item.quote}"</p>
                                    <div class="d-flex justify-content-between align-items-center mt-3">
                                        <small class="text-warning">— ${item.author || 'Unknown'}</small>
                                        <button class="btn btn-outline-danger btn-sm delete-quote-btn" data-id="${item._id}">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                $('#diary-container').html(html);
            } else {
                $('#diary-container').html('<p class="text-muted text-center p-4">Your diary is empty. Start saving quotes from the night sky!</p>');
            }
        } catch (err) {
            console.error('Error loading diary:', err);
            $('#diary-container').html('<p class="text-danger text-center p-4">Unable to load diary entries from server.</p>');
        }
    }

    $(document).on('click', '.delete-quote-btn', async function() {
        const quoteId = $(this).data('id');
        const activeUser = localStorage.getItem('nightSkyActiveUser');

        try {
            const response = await fetch(`${API_BASE_URL}/api/diary/${quoteId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: activeUser })
            });

            if (response.ok) {
                $(`#diary-item-${quoteId}`).fadeOut(300, function() { $(this).remove(); });
                showNotification('Quote removed from diary.', 'success');
            } else {
                showNotification('Failed to delete quote.', 'error');
            }
        } catch (err) {
            console.error('Error deleting quote:', err);
            showNotification('Server error while deleting.', 'error');
        }
    });

    // ==========================================
    // 5. AI Quote Generation Engine
    // ==========================================
    function generateLiveAIQuote(specificInput = null) {
        $('#grok-loading').removeClass('d-none');

        fetch(`${API_BASE_URL}/api/generate-quote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                specificInput,
                inputMode,
                selectedMoon,
                activeCategory,
                generatedQuoteHistory
            })
        })
        .then(res => {
            if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            $('#grok-loading').addClass('d-none');
            let quoteObj = null;

            if (data?.choices?.[0]?.message?.content) {
                const content = data.choices[0].message.content.trim();
                try {
                    quoteObj = JSON.parse(content);
                } catch (err) {
                    console.warn('Could not parse AI content as JSON, using raw content.', err);
                    quoteObj = { quote: content, author: 'Night Sky Wisdom' };
                }
            }

            if (quoteObj?.quote) {
                generatedQuoteHistory.push(quoteObj.quote);
                $('#quote-text').fadeOut(150, function() {
                    $(this).text(`"${quoteObj.quote}"`).fadeIn(200);
                });
                $('#quote-author').fadeOut(150, function() {
                    $(this).text(`— ${quoteObj.author || 'Unknown'}`).fadeIn(200);
                });
            } else {
                showNotification('No quote was returned by the generator.', 'error');
            }
        })
        .catch(err => {
            $('#grok-loading').addClass('d-none');
            console.error("API Error:", err);
            showNotification("Failed to generate quote. Check backend server.", "error");
        });
    }

    // Dynamic UI Input Triggers
    $('#next-quote-btn').on('click', () => generateLiveAIQuote($('#grok-feeling-input').val().trim() || null));
    $('#grok-submit-btn').on('click', () => {
        const val = $('#grok-feeling-input').val().trim();
        generateLiveAIQuote(val || null);
    });
});
