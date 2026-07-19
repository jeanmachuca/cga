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
    setSpeaking(false);
    const btn = document.getElementById('speakButton');
    if (btn) btn.disabled = false;
    stopMouthAnimation();
    if (onEnd) onEnd();
}

export function stop() {
    speechSynthesis.cancel();
    setSpeaking(false);
    const btn = document.getElementById('speakButton');
    if (btn) btn.disabled = false;
    stopMouthAnimation();
}

export function speak(textOrEvent, onEnd) {
    if (isSpeaking()) return;

    let text;
    if (typeof textOrEvent === 'string') {
        text = textOrEvent;
    } else {
        text = document.getElementById('textToSpeak').value;
    }
    if (!text) return;

    setSpeaking(true);
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

    if (cleanText.length > 200) {
        const chunkSize = isSpanish ? 80 : 200;
        const chunks = cleanText.match(new RegExp(`.{1,${chunkSize}}(?=\\s|$)`, 'g')) || [];
        let currentChunk = 0;
        let active = true;

        const speakNext = () => {
            if (!active) return;
            currentChunk++;
            if (currentChunk < chunks.length) {
                setTimeout(() => {
                    if (!active) return;
                    const next = new SpeechSynthesisUtterance(chunks[currentChunk]);
                    next.voice = selectedVoice;
                    next.lang = selectedVoice?.lang;
                    next.rate = isSpanish ? 0.85 : 0.9;
                    next.pitch = isSpanish ? 0.9 : 1.0;
                    next.onerror = (e) => { if (e.error !== 'interrupted') console.error('Chunk error:', e); };
                    next.onend = speakNext;
                    next.onstart = () => updateMouthAnimation();
                    next.onboundary = (e) => { if (e.name === 'word') updateMouthAnimation(); };
                    speechSynthesis.speak(next);
                }, isSpanish ? 500 : 100);
            } else {
                active = false;
                finishSpeaking(onEnd);
            }
        };

        utterance.onend = speakNext;
    } else {
        utterance.onend = () => finishSpeaking(onEnd);
    }

    utterance.onstart = () => {
        const btn = document.getElementById('speakButton');
        if (btn) btn.disabled = true;
        updateMouthAnimation();
    };

    utterance.onboundary = (event) => {
        if (event.name === 'word') updateMouthAnimation();
    };

    utterance.onpause = () => stopMouthAnimation();
    utterance.onresume = () => updateMouthAnimation();

    utterance.onerror = (event) => {
        if (event.error === 'interrupted') return;
        console.error('Speech synthesis error:', event);
        finishSpeaking(onEnd);
    };

    speechSynthesis.speak(utterance);
}
