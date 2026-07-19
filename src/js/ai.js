import { cleanMarkdown } from './speech.js';
import { updateStatusText } from './ui.js';
import { TEXTS } from './constants.js';

const config = {
    apiKey: '',
    azureResourceName: '',
    deploymentName: '',
    knowledgeBaseUrl: '',
};

let conversationHistory = [];

export async function loadConfig() {
    if (typeof Auth !== 'undefined' && Auth.isGoogleUser() && Auth.getToken()) {
        try {
            const driveConfig = await DriveVault.getFile('config');
            if (driveConfig) {
                config.apiKey = driveConfig.apiKey || '';
                config.azureResourceName = driveConfig.resourceName || '';
                config.deploymentName = driveConfig.deploymentName || '';
                config.knowledgeBaseUrl = driveConfig.knowledgeBaseUrl || '';
                populateForm();
                return;
            }
        } catch (e) {
            console.warn('Failed to load config from Drive:', e);
        }
    }

    config.apiKey = localStorage.getItem('cga_azure_api_key') || '';
    config.azureResourceName = localStorage.getItem('cga_azure_resource') || '';
    config.deploymentName = localStorage.getItem('cga_azure_deployment') || '';
    config.knowledgeBaseUrl = localStorage.getItem('cga_knowledge_url') || '';
    populateForm();
}

function populateForm() {
    const apiKeyEl = document.getElementById('apiKey');
    const resourceEl = document.getElementById('azureResourceName');
    const deploymentEl = document.getElementById('deploymentName');
    const kbEl = document.getElementById('knowledgeBaseUrl');
    if (apiKeyEl) apiKeyEl.value = config.apiKey;
    if (resourceEl) resourceEl.value = config.azureResourceName;
    if (deploymentEl) deploymentEl.value = config.deploymentName;
    if (kbEl) kbEl.value = config.knowledgeBaseUrl;
}

export async function saveAzureConfig() {
    config.azureResourceName = document.getElementById('azureResourceName').value;
    config.deploymentName = document.getElementById('deploymentName').value;
    config.knowledgeBaseUrl = document.getElementById('knowledgeBaseUrl')?.value || '';
    await persistConfig();
}

async function persistConfig() {
    const data = {
        apiKey: config.apiKey,
        resourceName: config.azureResourceName,
        deploymentName: config.deploymentName,
        knowledgeBaseUrl: config.knowledgeBaseUrl,
    };

    if (typeof Auth !== 'undefined' && Auth.isGoogleUser() && Auth.getToken()) {
        try {
            await DriveVault.saveFile('config', data);
            updateStatusText('configSaved');
            return;
        } catch (e) {
            console.warn('Failed to save config to Drive:', e);
        }
    }

    localStorage.setItem('cga_azure_api_key', config.apiKey);
    localStorage.setItem('cga_azure_resource', config.azureResourceName);
    localStorage.setItem('cga_azure_deployment', config.deploymentName);
    localStorage.setItem('cga_knowledge_url', config.knowledgeBaseUrl);
    updateStatusText('configSaved');
}

export function isConfigValid() {
    return config.apiKey && config.azureResourceName && config.deploymentName;
}

export function getConfig() { return config; }

export async function loadHistory() {
    try {
        const data = await DriveVault.getFile('history');
        if (data && Array.isArray(data.turns)) {
            conversationHistory = data.turns;
            return;
        }
    } catch (e) {
        console.warn('Failed to load history:', e);
    }
    conversationHistory = [];
}

export async function saveHistory() {
    const trimmed = conversationHistory.slice(-APP_CONFIG.maxHistoryTurns);
    try {
        await DriveVault.saveFile('history', { turns: trimmed });
    } catch (e) {
        console.warn('Failed to save history:', e);
    }
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
    const azureEndpoint = `https://${config.azureResourceName}.openai.azure.com`;
    const apiVersion = '2024-02-15-preview';

    const messages = [];

    const systemPrompt = TEXTS[isSpanish ? 'es' : 'en'].systemPrompt;
    messages.push({ role: 'system', content: systemPrompt });

    if (conversationHistory.length > 0) {
        const recent = conversationHistory.slice(-10);
        for (const turn of recent) {
            messages.push({ role: turn.role === 'assistant' ? 'assistant' : 'user', content: turn.content });
        }
    }

    const kbContent = await fetchKnowledgeBase();
    if (kbContent) {
        messages.push({ role: 'system', content: `Additional context from knowledge base:\n${kbContent}` });
    }

    messages.push({ role: 'user', content: userInput });

    try {
        const response = await fetch(`${azureEndpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${apiVersion}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': config.apiKey,
            },
            body: JSON.stringify({
                messages,
                max_tokens: 500,
                temperature: 0.7,
                top_p: 0.95,
                frequency_penalty: 0,
                presence_penalty: 0.3,
            }),
        });

        if (!response.ok) {
            throw new Error(`Azure OpenAI API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const aiResponse = cleanMarkdown(data.choices[0].message.content);

        addHistoryTurn('user', userInput);
        addHistoryTurn('assistant', aiResponse);
        saveHistory();

        updateStatusText('aiResponseObtained');
        return aiResponse;
    } catch (error) {
        console.error('Error calling Azure OpenAI API:', error);
        updateStatusText('errorGettingResponse');
        return null;
    }
}
