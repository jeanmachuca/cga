const APP_CONFIG = {
  googleClientId: '__GOOGLE_CLIENT_ID__',
  appName: 'Cognitive Avatar',
  scopes: 'https://www.googleapis.com/auth/drive.appdata',
  maxHistoryTurns: 15,
  defaultModel: 'gemini-3.5-flash',
  knowledgeBaseUrl: '',
  faceDetection: {
    descriptorThreshold: 0.6,
    snapshotCount: 3,
    snapshotIntervalMs: 1000,
    minConfidence: 0.5,
    modelUrl: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model',
  },
};

const STORAGE_KEYS = {
  session: 'cga_session',
  config: 'cga_config',
  apiKey: 'cga_gemini_api_key',
  model: 'cga_gemini_model',
  kbUrl: 'cga_knowledge_url',
  language: 'cga_language',
  face: 'cga_face',
  history: 'cga_history',
};

const DRIVE_MAP = {
  [STORAGE_KEYS.apiKey]: { type: 'config', field: 'apiKey' },
  [STORAGE_KEYS.model]: { type: 'config', field: 'model' },
  [STORAGE_KEYS.kbUrl]: { type: 'config', field: 'knowledgeBaseUrl' },
  [STORAGE_KEYS.face]: { type: 'face' },
  [STORAGE_KEYS.history]: { type: 'history' },
};

function isGoogleDriveUser() {
  return typeof Auth !== 'undefined' && Auth.isGoogleUser() && Auth.isTokenValid();
}

function localSave(key, value) {
  localStorage.setItem(key, btoa(JSON.stringify(value)));
}

function localLoad(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(atob(raw)); } catch { return null; }
}

function localRemove(key) {
  localStorage.removeItem(key);
}

async function saveConfig(key, value) {
  const mapping = DRIVE_MAP[key];
  if (mapping && isGoogleDriveUser()) {
    try {
      if (mapping.field) {
        const existing = await DriveVault.getFile(mapping.type) || {};
        existing[mapping.field] = value;
        await DriveVault.saveFile(mapping.type, existing);
      } else {
        await DriveVault.saveFile(mapping.type, value);
      }
      return;
    } catch (e) {
      console.warn(`DriveVault save failed for ${key}:`, e);
    }
  }
  localSave(key, value);
}

async function loadConfig(key) {
  const mapping = DRIVE_MAP[key];
  if (mapping && isGoogleDriveUser()) {
    try {
      const data = await DriveVault.getFile(mapping.type);
      if (data) return mapping.field ? data[mapping.field] : data;
    } catch (e) {
      console.warn(`DriveVault load failed for ${key}:`, e);
    }
  }
  return localLoad(key);
}

async function cleanConfig() {
  Object.values(STORAGE_KEYS).forEach(k => localRemove(k));
  localRemove('darkMode');
  if (typeof DriveVault !== 'undefined') DriveVault.clearCache();
}
