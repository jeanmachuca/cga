import { stop, speak } from './speech.js';
import { loadConfig, saveAzureConfig, getChatResponse, isConfigValid, loadHistory, getConfig } from './ai.js';
import {
    updateStatusText, updateVoices, toggleTheme, updateAuthUI,
    showConfigForm, hideConfigForm,
    showCamera, hideCamera, updateCameraStatus,
    showOnboardingOverlay, hideOnboardingOverlay, updateOnboardingText,
    updateTrainingProgress, hideTrainingProgress, t,
    showMainApp, saveLanguage, restoreLanguage,
} from './ui.js';
import {
    initializeSpeechRecognition, speechRecognition, setListening, isListening,
    setupSpeechRecognitionHandlers, startSpeechRecognition, stopSpeechRecognition,
    setOnboardingState, getOnboardingState, setOnboardingName, getOnboardingName,
    setAppReady, isAppReady,
} from './state.js';

let authUser = null;

if (!initializeSpeechRecognition()) {
    console.warn('Speech recognition initialization failed');
}

export function toggleListening() {
    if (!speechRecognition) {
        updateStatusText('recognitionNotSupported');
        return;
    }
    const micButton = document.getElementById('micButton');
    if (!isListening()) {
        const languageCode = 'en-US';
        setupSpeechRecognitionHandlers(
            () => {
                setListening(true);
                micButton.classList.add('listening');
                updateStatusText('listening');
            },
            async (event) => {
                const transcript = event.results[0][0].transcript;
                document.getElementById('textToSpeak').value = transcript;
                setListening(false);
                micButton.classList.remove('listening');
                setTimeout(() => handleUserInput(transcript), 500);
            },
            (event) => {
                if (event.error !== 'no-speech') {
                    console.error('Speech recognition error:', event.error);
                }
                stopListening();
            },
            () => { stopListening(); }
        );
        if (!startSpeechRecognition(languageCode)) {
            updateStatusText('errorStartingRecognition');
            stopListening();
        }
    } else {
        stopListening();
    }
}

function stopListening() {
    stopSpeechRecognition();
    setListening(false);
    document.getElementById('micButton').classList.remove('listening');
    updateStatusText('');
}

function autoListen() {
    if (!speechRecognition || isListening()) return;
    const micButton = document.getElementById('micButton');
    setupSpeechRecognitionHandlers(
        () => {
            setListening(true);
            micButton.classList.add('listening');
            updateStatusText('listening');
        },
        async (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('textToSpeak').value = transcript;
            setListening(false);
            micButton.classList.remove('listening');
            setTimeout(() => handleUserInput(transcript), 500);
        },
        (event) => {
            if (event.error !== 'no-speech') {
                console.error('Speech recognition error:', event.error);
            }
            stopListening();
        },
        () => { stopListening(); }
    );
    startSpeechRecognition('en-US');
}

async function handleUserInput(text) {
    const state = getOnboardingState();
    if (state !== 'idle') {
        await handleOnboardingInput(text);
        return;
    }
    updateStatusText('thinking');
    const response = await getChatResponse(text);
    if (response) {
        document.getElementById('textToSpeak').value = response;
        speakWithAutoListen(response);
    }
}

function speakWithAutoListen(text) {
    speak(text, () => {
        setTimeout(() => autoListen(), 500);
    });
}

async function handleOnboardingInput(text) {
    const state = getOnboardingState();
    const lower = text.toLowerCase().trim();

    if (state === 'asking_name') {
        const name = text.trim();
        setOnboardingName(name);
        setOnboardingState('asking_camera');
        const msg = t('onboardingAskCamera', { name });
        speakWithAutoListen(msg);
        return;
    }

    if (state === 'asking_camera') {
        const approved = /\b(yes|ok|sure|yeah|yep|of course|go ahead|permission|allow|please)\b/i.test(lower);
        if (approved) {
            setOnboardingState('training');
            await startFaceTraining();
        } else {
            setOnboardingState('idle');
            hideOnboardingOverlay();
            hideCamera();
            speakWithAutoListen("No problem! We can continue without face recognition. What would you like to learn?");
        }
        return;
    }
}

async function startFaceTraining() {
    const name = getOnboardingName();
    showCamera();
    updateCameraStatus('Starting camera...');

    const video = document.getElementById('cameraVideo');
    const ok = await Face.startCamera(video);
    if (!ok) {
        setOnboardingState('idle');
        hideCamera();
        hideOnboardingOverlay();
        speakWithAutoListen(t('cameraPermissionDenied'));
        return;
    }

    updateCameraStatus('Loading face models...');
    const modelsOk = await Face.loadModels();
    if (!modelsOk) {
        setOnboardingState('idle');
        Face.stopCamera();
        hideCamera();
        hideOnboardingOverlay();
        speakWithAutoListen('Failed to load face recognition. Continuing without it.');
        return;
    }

    const msg = t('onboardingTraining', { count: APP_CONFIG.faceDetection.snapshotCount });
    speakWithAutoListen(msg);

    const success = await Face.train(name, (current, total) => {
        updateTrainingProgress(current, total);
    }, (attempt, max) => {
        if (attempt === 1) {
            speakWithAutoListen(t('faceDetectHint'));
        }
    });

    hideTrainingProgress();
    Face.stopCamera();

    if (success) {
        await DriveVault.saveFile('face', Face.getStoredDescriptors());
        setOnboardingState('idle');
        hideOnboardingOverlay();
        hideCamera();
        speakWithAutoListen(t('onboardingComplete', { name }));
        checkAndShowConfig();
    } else {
        setOnboardingState('idle');
        hideOnboardingOverlay();
        hideCamera();
        speakWithAutoListen(t('faceDetectTimeout'));
        checkAndShowConfig();
    }
}

function checkAndShowConfig() {
    if (!isConfigValid()) {
        showConfigForm(Auth.isGoogleUser() ? 'google' : 'guest');
    } else {
        hideConfigForm();
    }
}

function tryShowMainApp() {
    if (isAppReady()) return;
    if (authUser && document.querySelector('input[name="language"]:checked')) {
        setAppReady(true);
        showMainApp();
        startSession();
    }
}

async function handleAuthChange(user) {
    authUser = user;
    updateAuthUI(user);

    if (user) {
        await loadConfig();
        await loadHistory();

        if (typeof DriveVault !== 'undefined' && Auth.isGoogleUser() && DriveVault.isAvailable() === false) {
            alert('Google Drive is not available. Config will be stored in browser only.');
        }

        hideConfigForm();
        tryShowMainApp();
    } else {
        hideConfigForm();
        hideCamera();
        if (typeof DriveVault !== 'undefined') DriveVault.clearCache();
    }
}

async function startSession() {
    const faceData = await DriveVault.getFile('face');
    if (faceData && faceData.descriptors) {
        Face.setStoredDescriptors(faceData);
        showCamera();
        updateCameraStatus('Recognizing face...');

        const video = document.getElementById('cameraVideo');
        const ok = await Face.startCamera(video);
        if (ok) {
            const modelsOk = await Face.loadModels();
            if (modelsOk) {
                await new Promise(r => setTimeout(r, 1500));
                const result = await Face.recognize();
                Face.stopCamera();
                hideCamera();
                if (result) {
                    speakWithAutoListen(t('faceRecognized', { name: result.name }));
                } else {
                    speakWithAutoListen(t('faceUnknown'));
                }
            } else {
                Face.stopCamera();
                hideCamera();
            }
        } else {
            hideCamera();
        }
    } else {
        setOnboardingState('asking_name');
        showOnboardingOverlay();
        speakWithAutoListen(t('onboardingGreeting'));
    }
}

window.toggleListening = toggleListening;
window.toggleTheme = toggleTheme;
window.onLanguageChange = function () {
    const lang = document.querySelector('input[name="language"]:checked').value;
    saveLanguage(lang);
    updateVoices();
    tryShowMainApp();
};
window.saveAzureConfig = async function () {
    await saveAzureConfig();
    hideConfigForm();
};

document.addEventListener('DOMContentLoaded', () => {
    restoreLanguage();
    Auth.onAuthChange(handleAuthChange);
    handleAuthChange(Auth.getUser());
});
