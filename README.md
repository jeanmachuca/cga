# Talking Avatar

A web-based talking avatar with Google authentication and secure API key storage via Google Drive. Supports English and Spanish with synchronized mouth animation.

[![Sponsor](https://img.shields.io/badge/Sponsor-GitHub-d81b60)](https://github.com/sponsors/jeanmachuca)

## Features

- Language switching between English and Spanish
- Synchronized mouth animation with speech
- **Google Sign-In** with API key vault in Google Drive (App Data Folder)
- Guest mode fallback (localStorage)
- Echo Mode (repeat) and Chat Mode (Azure OpenAI)
- Dark/light theme
- Responsive design

## Live Demo

[https://jeanmachuca.github.io/talking_avatar/src/](https://jeanmachuca.github.io/talking_avatar/src/)

## How It Works

1. Sign in with Google (or continue as Guest)
2. First time: enter your Azure OpenAI credentials (API key, resource name, deployment name)
3. Credentials are saved to your Google Drive App Data Folder (hidden, API-only)
4. Returning users: credentials load automatically from Drive
5. Type text or use speech recognition — avatar speaks with animated mouth

## Security

- **Google users:** API key stored in Google Drive App Data Folder (encrypted at rest, hidden from Drive UI)
- **Guest users:** API key stored in browser localStorage (visible in DevTools — not recommended for production)
- Access tokens are revoked on sign-out
- No API keys logged to console

## Technical Details

- **Auth:** Google Identity Services (GIS) + Google Drive API
- **Speech:** Web Speech API (TTS + recognition)
- **Storage:** Google Drive App Data Folder (primary) / localStorage (guest fallback)
- **AI:** Azure OpenAI Chat Completions API
- **Design:** Vanilla JS, no build tools, no dependencies

## Setting Up Google Auth (for Forkers)

If you fork this project, you need your own Google OAuth credentials.

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to [APIs & Services](https://console.cloud.google.com/apis/library)
4. Enable **Google Drive API**

### 2. Configure OAuth Consent Screen

1. Go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Select **External** user type
3. Fill in app name: "Talking Avatar"
4. Add your email as developer contact
5. Save and continue through scopes and test users
6. In **Testing** mode, add your Google email as a test user

### 3. Create OAuth Client ID

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: "Talking Avatar"
5. **Authorized JavaScript origins** — add `https://<your-username>.github.io`
6. **Authorized redirect URIs** — add `https://<your-username>.github.io/<repo-name>/src/`
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
3. Select language (English/Spanish) and mode (Echo/Chat)
4. If using Chat Mode: enter your Azure OpenAI credentials
5. Type text or click the microphone to speak
6. Click "Speak" to make the avatar talk

## Browser Support

- Chrome (full)
- Edge (full)
- Firefox (full)
- Safari (partial — Web Speech API limited on iOS)

## License

MIT License
