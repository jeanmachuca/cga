import { cleanMarkdown } from './speech.js';
import { updateStatusText } from './ui.js';
import { TEXTS } from './constants.js';

const config = {
    apiKey: '',
    model: '',
    knowledgeBaseUrl: '',
};

let conversationHistory = [];

export async function loadAppConfig() {
    config.apiKey = (await loadConfig(STORAGE_KEYS.apiKey)) || '';
    config.model = (await loadConfig(STORAGE_KEYS.model)) || APP_CONFIG.defaultModel;
    config.knowledgeBaseUrl = (await loadConfig(STORAGE_KEYS.kbUrl)) || '';
    populateForm();
}

function populateForm() {
    const apiKeyEl = document.getElementById('apiKey');
    const modelEl = document.getElementById('geminiModel');
    const kbEl = document.getElementById('knowledgeBaseUrl');
    if (apiKeyEl) apiKeyEl.value = config.apiKey;
    if (modelEl) modelEl.value = config.model || APP_CONFIG.defaultModel;
    if (kbEl) kbEl.value = config.knowledgeBaseUrl;
}

export async function saveAppConfig() {
    config.apiKey = document.getElementById('apiKey').value;
    config.model = document.getElementById('geminiModel').value || APP_CONFIG.defaultModel;
    config.knowledgeBaseUrl = document.getElementById('knowledgeBaseUrl')?.value || '';
    await saveConfig(STORAGE_KEYS.apiKey, config.apiKey);
    await saveConfig(STORAGE_KEYS.model, config.model);
    await saveConfig(STORAGE_KEYS.kbUrl, config.knowledgeBaseUrl);
    updateStatusText('configSaved');
}

export function isConfigValid() {
    return !!config.apiKey;
}

export function getConfig() { return config; }

export async function loadHistory() {
    const data = await loadConfig(STORAGE_KEYS.history);
    conversationHistory = (data && Array.isArray(data.turns)) ? data.turns : [];
}

export async function saveHistory() {
    const trimmed = conversationHistory.slice(-APP_CONFIG.maxHistoryTurns);
    await saveConfig(STORAGE_KEYS.history, { turns: trimmed });
}

export function addHistoryTurn(role, content) {
    conversationHistory.push({ role, content, ts: Date.now() });
    if (conversationHistory.length > APP_CONFIG.maxHistoryTurns + 5) {
        conversationHistory = conversationHistory.slice(-APP_CONFIG.maxHistoryTurns);
    }
}

export function getHistory() { return conversationHistory; }
export function clearHistory() { conversationHistory = []; }

async function fetchKnowledgeBase() {
    const url = config.knowledgeBaseUrl;
    if (!url) return null;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const text = await res.text();
        return text.slice(0, 3000);
    } catch (e) {
        console.warn('Knowledge base fetch failed:', e);
        return null;
    }
}

export async function getChatResponse(userInput) {
    if (!isConfigValid()) {
        updateStatusText('enterConfigFirst');
        return null;
    }

    const isSpanish = document.querySelector('input[name="language"]:checked')?.value === 'es';
    const model = config.model || APP_CONFIG.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

    const systemPrompt = TEXTS[isSpanish ? 'es' : 'en'].systemPrompt;
    let systemText = systemPrompt;

    const kbContent = await fetchKnowledgeBase();
    if (kbContent) {
        systemText += `\n\nAdditional context from knowledge base:\n${kbContent}`;
    }

    const contents = [];
    const recent = conversationHistory.slice(-10);
    for (const turn of recent) {
        contents.push({
            role: turn.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: turn.content }],
        });
    }
    contents.push({ role: 'user', parts: [{ text: userInput }] });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemText }] },
                contents,
            }),
        });

        if (!response.ok) {
            throw new Error(`Gemini API request failed: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = cleanMarkdown(data.candidates[0].content.parts[0].text);

        addHistoryTurn('user', userInput);
        addHistoryTurn('assistant', aiResponse);
        saveHistory();

        updateStatusText('aiResponseObtained');
        return aiResponse;
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        updateStatusText('errorGettingResponse');
        return null;
    }
}
