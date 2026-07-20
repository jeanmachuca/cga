const Auth = (() => {
  let currentUser = null;
  let accessToken = null;
  let tokenExpiry = 0;
  let listeners = [];
  let restored = false;

  function loadSession() {
    const raw = localStorage.getItem(APP_CONFIG.storageKey);
    if (raw) {
      try {
        currentUser = JSON.parse(raw);
      } catch { currentUser = null; }
    }
  }

  function saveSession(user) {
    currentUser = user;
    if (user) {
      localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(APP_CONFIG.storageKey);
      localStorage.removeItem('cga_gemini_api_key');
      localStorage.removeItem('cga_gemini_model');
      localStorage.removeItem('cga_knowledge_url');
      localStorage.removeItem('cga_config');
    }
  }

  function notify() {
    listeners.forEach(fn => fn(currentUser));
  }

  function getUser() { return currentUser; }
  function getToken() { return accessToken; }
  function isSignedIn() { return !!currentUser; }
  function isGoogleUser() { return !!currentUser && !currentUser.uid.startsWith('guest_'); }
  function isTokenValid() { return !!accessToken && Date.now() < tokenExpiry; }

  function onAuthChange(fn) {
    listeners.push(fn);
    if (currentUser && restored) fn(currentUser);
    return () => { listeners = listeners.filter(f => f !== fn); };
  }

  function signIn(credential) {
    const payload = JSON.parse(atob(credential.split('.')[1]));
    const user = {
      uid: payload.sub,
      name: payload.name,
      email: payload.email,
      photoURL: payload.picture,
    };
    saveSession(user);
    requestDriveAccess({ prompt: 'consent' });
    return user;
  }

  function requestDriveAccess(opts) {
    if (!window.google?.accounts?.oauth2) return;

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: APP_CONFIG.googleClientId,
      scope: APP_CONFIG.scopes,
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          console.warn('Drive access denied:', tokenResponse.error);
          notify();
          return;
        }
        accessToken = tokenResponse.access_token;
        tokenExpiry = Date.now() + (tokenResponse.expires_in || 3600) * 1000 - 60000;
        DriveVault.testConnection().then(ok => {
          if (!ok) {
            console.warn('Drive vault unavailable — config will use browser storage only');
            accessToken = null;
          }
          notify();
        });
      },
      error_callback: (err) => {
        console.warn('Drive token error:', err);
        notify();
      },
    });
    tokenClient.requestAccessToken(opts || { prompt: 'consent' });
  }

  function restoreSession() {
    loadSession();
    if (currentUser && isGoogleUser() && !accessToken) {
      requestDriveAccess({ prompt: '' });
    } else {
      notify();
    }
    restored = true;
  }

  function signOut() {
    currentUser = null;
    accessToken = null;
    tokenExpiry = 0;
    saveSession(null);
    if (typeof DriveVault !== 'undefined') DriveVault.clearCache();
    if (window.google?.accounts?.id) {
      google.accounts.id.disableAutoSelect();
    }
    notify();
  }

  function renderButton(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (APP_CONFIG.googleClientId && APP_CONFIG.googleClientId !== '__GOOGLE_CLIENT_ID__' && window.google?.accounts?.id) {
      try {
        google.accounts.id.initialize({
          client_id: APP_CONFIG.googleClientId,
          callback: ({ credential }) => { if (credential) signIn(credential); },
        });
        google.accounts.id.renderButton(container, {
          theme: 'outline', size: 'large', width: 250,
        });
      } catch (e) {
        console.warn('GIS init failed:', e);
      }
    }

    const guestBtn = document.createElement('button');
    guestBtn.className = 'auth-guest-btn';
    guestBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg> Continue as Guest';
    guestBtn.onclick = guestSignIn;
    container.appendChild(guestBtn);
  }

  function guestSignIn() {
    const id = 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const user = {
      uid: id,
      name: 'Guest',
      email: '',
      photoURL: '',
    };
    saveSession(user);
    notify();
  }

  return { getUser, getToken, isSignedIn, isGoogleUser, isTokenValid, onAuthChange, signIn, signOut, renderButton, guestSignIn, restoreSession };
})();
