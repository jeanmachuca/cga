# Cognitive Avatar (CGA)

An AI research assistant that **knows you**. CGA uses face recognition to identify you across sessions, speaks naturally via text-to-speech, and helps you learn, investigate, and research any topic.

## Features

- **Face Recognition** — CGA recognizes you across sessions using 128-dimension face descriptors
- **Onboarding Flow** — First-time setup: CGA asks your name, trains face recognition, and welcomes you
- **Auto-Listen** — After CGA speaks, the mic automatically activates for your next input
- **Research Assistant** — Always-on AI chat mode for learning and investigation
- **Knowledge Base** — Fetch content from a configurable URL to feed the AI as context
- **Conversation History** — Persistent history stored in Google Drive (or localStorage for guests)
- **Web Speech API** — Text-to-speech with mouth animation, speech recognition for voice input

## Setting Up Google Auth

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google Drive API**

### 2. Configure OAuth Consent Screen

1. Go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Select **External** user type
3. Fill in app name: "Cognitive Avatar"
4. Add your email as developer contact
5. Save and continue through scopes and test users
6. In **Testing** mode, add your Google email as a test user

### 3. Create OAuth Client ID

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: "Cognitive Avatar"
5. **Authorized JavaScript origins** — add `https://jeanmachuca.github.io`
6. **Authorized redirect URIs** — add `https://jeanmachuca.github.io/cga/`
7. Copy the **Client ID**

### 4. Add to GitHub Secrets

1. Go to your fork's repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `GOOGLE_CLIENT_ID`
4. Value: the Client ID from step 3
5. Push to `main` — GitHub Actions deploys with your credentials injected

## Usage

1. Open the app in a modern browser
2. Sign in with Google (recommended) or continue as Guest
3. **First visit:** CGA greets you, asks your name, and trains face recognition
4. **Subsequent visits:** CGA recognizes you automatically
5. Type or speak your question — CGA researches and responds
6. Configure Azure OpenAI settings for the AI backend
7. Optionally add a Knowledge Base URL in settings for additional context

## Architecture

```
src/
  config.js          — App configuration
  auth.js            — Google Identity Services auth
  drive-vault.js     — Google Drive / localStorage vault
  index.html         — Entry point
  js/
    main.js          — Orchestrator with onboarding state machine
    ai.js            — Azure OpenAI + conversation history + knowledge base
    speech.js        — TTS with auto-listen callback
    state.js         — Shared state (onboarding, camera, listening)
    ui.js            — DOM manipulation + onboarding UI
    constants.js     — i18n strings + system prompt
    face.js          — Face detection, training, and recognition
  css/styles.css     — Neumorphic design with camera styles
  img/               — Avatar images
```

## License

MIT

