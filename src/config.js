const APP_CONFIG = {
  googleClientId: '__GOOGLE_CLIENT_ID__',
  driveConfigFile: 'cga_config.json',
  driveFaceFile: 'cga_face_data.json',
  driveHistoryFile: 'cga_conversation_history.json',
  storageKey: 'cga_session',
  configKey: 'cga_config',
  apiKeyKey: 'cga_gemini_api_key',
  modelKey: 'cga_gemini_model',
  kbUrlKey: 'cga_knowledge_url',
  languageKey: 'cga_language',
  guestStorageKey: 'cga_guest_config',
  appName: 'Cognitive Avatar',
  scopes: 'https://www.googleapis.com/auth/drive.appdata',
  faceDescriptorsFile: 'cga_face_descriptors.json',
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

function encodeData(obj) {
  return btoa(JSON.stringify(obj));
}

function decodeData(raw) {
  try { return JSON.parse(atob(raw)); } catch { return null; }
}
