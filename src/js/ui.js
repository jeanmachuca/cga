import { TEXTS } from './constants.js';
import { getOnboardingState, setCameraActive } from './state.js';

export function getSelectedLanguage() {
    const el = document.querySelector('input[name="language"]:checked');
    return el ? el.value : 'en';
}

export function t(key, replacements) {
    const lang = getSelectedLanguage();
    let str = TEXTS[lang][key] || TEXTS.en[key] || key;
    if (replacements) {
        for (const [k, v] of Object.entries(replacements)) {
            str = str.replace(`{${k}}`, v);
        }
    }
    return str;
}

export function updateStatusText(text) {
    const statusText = document.getElementById('statusText');
    if (!statusText) return;
    if (typeof text === 'string' && TEXTS.en[text]) {
        statusText.textContent = t(text);
    } else {
        statusText.textContent = text;
    }
}

export function updateVoices() {
    const texts = TEXTS[getSelectedLanguage()];
    const textarea = document.getElementById('textToSpeak');
    if (textarea) textarea.placeholder = texts.placeholder;
}

export function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

export function updateAuthUI(user) {
    const display = document.getElementById('userDisplay');
    const loginContainer = document.getElementById('loginContainer');

    if (user) {
        if (user.photoURL) {
            display.innerHTML = `<img src="${user.photoURL}" width="32" height="32" class="auth-avatar" alt=""><span class="auth-name">${user.name}</span>`;
        } else {
            const initial = (user.name || '?')[0].toUpperCase();
            display.innerHTML = `<div class="auth-avatar-fallback">${initial}</div><span class="auth-name">${user.name}</span>`;
        }
        loginContainer.innerHTML = '<button class="auth-signout-btn" onclick="Auth.signOut()">Sign Out</button>';
    } else {
        display.innerHTML = '';
        loginContainer.innerHTML = '';
        Auth.renderButton('loginContainer');
    }
}

export function showConfigOnboarding(userType) {
    const el = document.getElementById('configOnboarding');
    const warning = document.getElementById('configWarning');
    if (!el) return;

    el.classList.remove('hidden');

    if (userType === 'guest') {
        warning.textContent = 'API key stored in browser localStorage. Do not use in production.';
        warning.classList.add('visible');
    } else if (typeof DriveVault !== 'undefined' && DriveVault.isAvailable() === false) {
        warning.textContent = 'Google Drive unavailable. Config stored in browser only.';
        warning.classList.add('visible');
    } else {
        warning.textContent = 'API key saved securely to your Google Drive.';
        warning.classList.remove('visible');
    }
}

export function hideConfigOnboarding() {
    const el = document.getElementById('configOnboarding');
    if (el) el.classList.add('hidden');
}

export function showCamera(videoEl, overlayEl) {
    const container = document.querySelector('.camera-container');
    if (container) container.classList.add('visible');
    setCameraActive(true);
}

export function hideCamera() {
    const container = document.querySelector('.camera-container');
    if (container) container.classList.remove('visible');
    setCameraActive(false);
}

export function updateCameraStatus(text) {
    const el = document.getElementById('cameraStatus');
    if (el) el.textContent = text;
}

export function showOnboardingOverlay() {
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.classList.add('visible');
}

export function hideOnboardingOverlay() {
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.classList.remove('visible');
}

export function updateOnboardingText(text) {
    const el = document.getElementById('onboardingText');
    if (el) el.textContent = text;
}

export function updateTrainingProgress(current, total) {
    const el = document.getElementById('trainingProgress');
    if (el) {
        el.textContent = t('trainingInProgress', { current, total });
        el.classList.add('visible');
    }
}

export function hideTrainingProgress() {
    const el = document.getElementById('trainingProgress');
    el.classList.remove('visible');
}

export function showMainApp() {
    const mainApp = document.getElementById('mainApp');
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (mainApp) {
        mainApp.classList.remove('hidden');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                mainApp.classList.add('main-app-visible');
            });
        });
    }
    if (welcomeScreen) {
        welcomeScreen.classList.add('welcome-compact');
    }
}

export function saveLanguage(lang) {
    localStorage.setItem(APP_CONFIG.languageKey, encodeData(lang));
}

export function loadLanguage() {
    const raw = localStorage.getItem(APP_CONFIG.languageKey);
    const decoded = raw ? decodeData(raw) : null;
    return decoded || 'en';
}

export function restoreLanguage() {
    const saved = loadLanguage();
    const radio = document.querySelector(`input[name="language"][value="${saved}"]`);
    if (radio) {
        radio.checked = true;
        updateVoices();
    }
}

if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}
