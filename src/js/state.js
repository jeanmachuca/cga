export let currentMode = 'chat';
export let speaking = false;
export let listening = false;
export let mouthInterval = null;
export let voices = [];
export let speechRecognition = null;

export let onboardingState = 'idle';
export let onboardingName = '';
export let cameraActive = false;
export let faceRecognized = false;

export function initializeSpeechRecognition() {
    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognition = new SpeechRecognition();
        speechRecognition.continuous = false;
        speechRecognition.interimResults = false;
        return true;
    } catch (e) {
        console.error('Speech recognition not supported:', e);
        return false;
    }
}

export function setupSpeechRecognitionHandlers(onStart, onResult, onError, onEnd) {
    if (!speechRecognition) return;
    speechRecognition.onstart = onStart;
    speechRecognition.onresult = onResult;
    speechRecognition.onerror = onError;
    speechRecognition.onend = onEnd;
}

export function startSpeechRecognition(language) {
    if (!speechRecognition) return false;
    try {
        speechRecognition.lang = language;
        speechRecognition.start();
        return true;
    } catch (e) {
        console.error('Speech recognition start error:', e);
        return false;
    }
}

export function stopSpeechRecognition() {
    if (!speechRecognition) return false;
    try {
        speechRecognition.stop();
        return true;
    } catch (e) {
        console.error('Speech recognition stop error:', e);
        return false;
    }
}

export function setCurrentMode(mode) { currentMode = mode; }
export function getCurrentMode() { return currentMode; }
export function setSpeaking(value) { speaking = value; }
export function isSpeaking() { return speaking; }
export function setListening(value) { listening = value; }
export function isListening() { return listening; }
export function setMouthInterval(interval) { mouthInterval = interval; }
export function getMouthInterval() { return mouthInterval; }
export function setVoices(newVoices) { voices = newVoices; }
export function getVoices() { return voices; }
export function setOnboardingState(state) { onboardingState = state; }
export function getOnboardingState() { return onboardingState; }
export function setOnboardingName(name) { onboardingName = name; }
export function getOnboardingName() { return onboardingName; }
export function setCameraActive(value) { cameraActive = value; }
export function isCameraActive() { return cameraActive; }
export function setFaceRecognized(value) { faceRecognized = value; }
export function isFaceRecognized() { return faceRecognized; }
