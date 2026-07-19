# Cognitive Avatar (CGA)

An AI research assistant that **knows you**. CGA uses face recognition to identify you across sessions, speaks naturally via text-to-speech, and helps you learn, investigate, and research any topic — all from a static website with zero backend.

## What is CGA?

CGA (Cognitive Avatar) is a voice-first AI assistant that runs entirely in the browser. It combines:

- **Face recognition** — CGA learns your face on first visit and recognizes you in future sessions using 128-dimensional face descriptors (face-api.js).
- **Conversational AI** — Powered by Google Gemini, CGA researches and answers any topic with voice-optimized responses.
- **Speech synthesis & recognition** — Full conversational loop: CGA speaks, mic auto-activates, you respond, CGA replies. Hands-free.
- **Persistent memory** — Conversation history and face data persist across sessions via Google Drive (signed-in) or localStorage (guest).
- **Knowledge base integration** — Point CGA at any public URL and it fetches that content as additional context for its answers.

CGA is designed as a personal research companion — not a general-purpose chatbot. It speaks concisely, avoids formatting, and paces its responses for natural voice interaction.

## Why a static web page?

CGA is a **purely static site** — HTML, CSS, and ES modules served from GitHub Pages. No server, no build step, no container, no backend.

**Why this matters:**

- **Zero infrastructure cost** — No servers to run, no databases to maintain, no deployment pipelines beyond `git push`.
- **Instant deployment** — Push to `main`, GitHub Actions builds and deploys in under a minute.
- **Portable** — Clone the repo, run `npx serve .`, and CGA runs locally. Works offline for face recognition once models are cached.
- **Privacy by design** — No server-side logging, no data processing on someone else's machine. Your conversations stay in your browser and your Google Drive.
- **Low barrier to fork** — Anyone can fork the repo, plug in their own API key, and have their own CGA instance in minutes.

The tradeoff is that API keys live in the browser. CGA solves this with a practical approach — see below.

## API Key Security Without a Backend

CGA uses the **GitHub Actions secret injection** pattern to keep API keys out of source code:

1. **At deploy time** — GitHub Actions reads secrets (`GOOGLE_CLIENT_ID`, etc.) and injects them into the built JavaScript files as string replacements.
2. **In source code** — The files contain placeholder strings like `__GOOGLE_CLIENT_ID__` that are never committed with real values.
3. **In the browser** — The injected values are visible in the served JavaScript (this is unavoidable without a backend), but they are never in the git repository.

**For the Gemini API key** (the AI backend), CGA takes a different approach: the user enters their own API key directly in the app on first visit. It is stored in Google Drive (for signed-in users) or localStorage (for guests). This means:

- No shared API key to leak — each user brings their own.
- No backend needed to proxy requests — the browser calls the Gemini API directly.
- The key never touches the repository — it lives only in the user's browser storage and optionally their Google Drive.

This is a pragmatic tradeoff: perfect security requires a backend proxy, but for a personal research tool, per-user keys in browser storage are sufficient.

## End User Quick Start

### Prerequisites

- A modern browser (Chrome recommended for best Web Speech API support)
- A Google API key from [AI Studio](https://aistudio.google.com/app/apikey) (for Gemini AI)
- Optionally: a Google account (for Drive-backed persistence and face recognition across devices)

### Steps

1. **Open the app** at [jeanmachuca.github.io/cga](https://jeanmachuca.github.io/cga/)
2. **Select your language** — English or Spanish
3. **Sign in** with Google (recommended) or continue as Guest
4. **Enter your Gemini API key** — CGA shows a setup screen on first visit. Paste your key and save.
5. **Onboarding** — CGA greets you and asks your name. Say your name into the mic.
6. **Face training** — CGA asks for camera permission, then takes 3 snapshots to learn your face.
7. **Start chatting** — Ask anything. CGA responds by voice and automatically listens for your reply.

### Voice Commands

| Command | English | Spanish |
|---------|---------|---------|
| Stop CGA | "stop", "halt", "shut up" | "para", "calla", "silencio", "alto" |
| Repeat last response | "repeat", "say again" | "repite", "repítelo", "otravez" |
| Clear input | "clear", "erase", "reset" | "borra", "limpia", "borrar" |

### Subsequent Visits

- **Signed-in users:** CGA recognizes your face automatically and greets you by name.
- **Guests:** Onboarding runs again (face data stays in localStorage but is device-local).

## Knowledge Base URL

The **Knowledge Base URL** setting lets you point CGA at any public webpage. When set, CGA fetches the content from that URL and includes it as additional context in every AI request.

**Use cases:**

- Point it at your company's documentation so CGA can answer questions about your internal tools.
- Point it at a textbook's companion site so CGA can reference specific material.
- Point it at a blog or wiki you want CGA to be well-versed in.

**How it works:**

1. Enter any public URL in the Knowledge Base field (Settings → Knowledge Base URL).
2. When you ask CGA a question, it fetches the URL content (first 3000 characters of extracted text).
3. The fetched content is injected into the AI prompt as additional context alongside your question.
4. CGA can then reference that material in its answers.

**Limitations:**

- Only plain text is extracted (HTML tags are stripped).
- Content is fetched on demand, not cached — each question triggers a fresh fetch.
- Maximum 3000 characters are sent to the AI to stay within token limits.
- The URL must be publicly accessible (no authentication supported).

## Architecture

```
src/
  config.js          — App configuration (Gemini API key, model, knowledge base URL)
  auth.js            — Google Identity Services auth + guest mode
  drive-vault.js     — Google Drive / localStorage vault for persistent data
  index.html         — Entry point (welcome screen, config onboarding, main app)
  js/
    main.js          — Orchestrator: onboarding state machine, voice commands, filter pipeline
    ai.js            — Gemini API + conversation history + knowledge base fetch
    speech.js        — TTS queue with auto-listen callback + Chrome keepalive
    state.js         — Shared state (onboarding, camera, listening, app ready)
    ui.js            — DOM manipulation, camera UI, onboarding overlay, training progress
    constants.js     — i18n strings (EN/ES), system prompts, voice command status texts
    face.js          — Face detection, training, and recognition (face-api.js)
  css/styles.css     — Neumorphic design with camera and onboarding styles
  img/               — Avatar images
```

## License

MIT
