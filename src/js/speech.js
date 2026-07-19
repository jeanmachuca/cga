import {
    speaking, voices,
    setSpeaking, isSpeaking,
    setMouthInterval, getMouthInterval,
    setVoices, getVoices
} from './state.js';

export const speechSynthesis = window.speechSynthesis;

speechSynthesis.onvoiceschanged = () => {
    setVoices(speechSynthesis.getVoices());
};

export function getSelectedVoice() {
    const selectedLanguage = document.querySelector('input[name="language"]:checked')?.value || 'en';
    if (selectedLanguage === 'en') {
        return getVoices().find(voice => voice.name.includes('Aaron'));
    } else {
        return getVoices().find(voice => voice.name.includes('Google español'));
    }
}

export function cleanMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/>\s(.*)/g, '$1')
        .replace(/\n\s*[-*+]\s/g, '\n')
        .replace(/\n\s*\d+\.\s/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function animateMouth() {
    const avatar = document.getElementById('avatar');
    avatar.classList.toggle('talking');
}

export function updateMouthAnimation() {
    if (!isSpeaking()) return;
    clearInterval(getMouthInterval());
    setMouthInterval(setInterval(animateMouth, 100));
}

export function stopMouthAnimation() {
    clearInterval(getMouthInterval());
    const avatar = document.getElementById('avatar');
    if (avatar) avatar.classList.remove('talking');
}

function finishSpeaking(onEnd) {
    stopKeepAlive();
    setSpeaking(false);
    stopMouthAnimation();
    if (onEnd) onEnd();
}

const speechQueue = [];
let isProcessingQueue = false;
let keepAliveInterval = null;

function startKeepAlive() {
    stopKeepAlive();
    keepAliveInterval = setInterval(() => {
        if (speechSynthesis.speaking) speechSynthesis.resume();
    }, 14000);
}

function stopKeepAlive() {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = null;
}

function waitForSpeechReady() {
    return new Promise((resolve) => {
        const check = () => {
            if (!speechSynthesis.speaking && !speechSynthesis.pending) {
                resolve();
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processQueue() {
    if (isProcessingQueue || speechQueue.length === 0) return;
    isProcessingQueue = true;

    const { text, onEnd } = speechQueue.shift();
    await waitForSpeechReady();

    const cleanText = cleanMarkdown(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const selectedVoice = getSelectedVoice();
    const isSpanish = document.querySelector('input[name="language"]:checked')?.value === 'es';

    if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
        utterance.rate = isSpanish ? 0.85 : 0.9;
        utterance.pitch = isSpanish ? 0.9 : 1.0;
    }

    const afterUtterance = async () => {
        await delay(100);
        await waitForSpeechReady();
        finishSpeaking(onEnd);
        isProcessingQueue = false;
        processQueue();
    };

    if (cleanText.length > 200) {
        const chunkSize = isSpanish ? 80 : 200;
        const chunks = cleanText.match(new RegExp(`.{1,${chunkSize}}(?=\\s|$)`, 'g')) || [];
        let currentChunk = 0;
        let active = true;

        const speakNextChunk = async () => {
            if (!active) return;
            currentChunk++;
            if (currentChunk < chunks.length) {
                await delay(100);
                await waitForSpeechReady();
                if (!active) return;
                const next = new SpeechSynthesisUtterance(chunks[currentChunk]);
                next.voice = selectedVoice;
                next.lang = selectedVoice?.lang;
                next.rate = isSpanish ? 0.85 : 0.9;
                next.pitch = isSpanish ? 0.9 : 1.0;
                next.onerror = (e) => { if (e.error !== 'interrupted') console.error('Chunk error:', e); };
                next.onend = speakNextChunk;
                next.onstart = () => updateMouthAnimation();
                next.onboundary = (e) => { if (e.name === 'word') updateMouthAnimation(); };
                speechSynthesis.speak(next);
            } else {
                active = false;
                await afterUtterance();
            }
        };

        utterance.onend = speakNextChunk;
    } else {
        utterance.onend = afterUtterance;
    }

    utterance.onstart = () => {
        updateMouthAnimation();
    };

    utterance.onboundary = (event) => {
        if (event.name === 'word') updateMouthAnimation();
    };

    utterance.onpause = () => stopMouthAnimation();
    utterance.onresume = () => updateMouthAnimation();

    utterance.onerror = async (event) => {
        if (event.error === 'interrupted') return;
        console.error('Speech synthesis error:', event);
        await afterUtterance();
    };

    setSpeaking(true);
    startKeepAlive();
    speechSynthesis.speak(utterance);
}

export function stop() {
    speechSynthesis.cancel();
    stopKeepAlive();
    speechQueue.length = 0;
    isProcessingQueue = false;
    setSpeaking(false);
    stopMouthAnimation();
}

export function speak(textOrEvent, onEnd) {
    let text;
    if (typeof textOrEvent === 'string') {
        text = textOrEvent;
    } else {
        text = document.getElementById('textToSpeak').value;
    }
    if (!text) return;

    speechQueue.push({ text, onEnd });
    processQueue();
}
