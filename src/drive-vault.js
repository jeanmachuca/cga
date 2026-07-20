const DriveVault = (() => {
  const cache = {};
  let driveAvailable = null;

  async function testConnection() {
    const token = Auth.getToken();
    if (!token || !Auth.isTokenValid()) { driveAvailable = false; return false; }

    const testFileName = '__drive_test_' + Date.now();
    try {
      const metadata = { name: testFileName, parents: ['appDataFolder'] };
      const blob = new Blob(['{}'], { type: 'application/json' });
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      const createRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
      );

      if (!createRes.ok) {
        const err = await createRes.text();
        console.warn('Drive test create failed:', createRes.status, err);
        driveAvailable = false;
        return false;
      }

      const { id } = await createRes.json();

      const delRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );

      driveAvailable = delRes.ok || delRes.status === 404;
      return driveAvailable;
    } catch (e) {
      console.warn('Drive test error:', e);
      driveAvailable = false;
      return false;
    }
  }

  function isAvailable() { return driveAvailable; }

  async function readDriveFile(fileName) {
    const token = Auth.getToken();
    if (!token) return null;

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'${encodeURIComponent(fileName)}'&fields=files(id)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) return null;
    const { files } = await res.json();
    if (files.length === 0) return null;

    const content = await fetch(
      `https://www.googleapis.com/drive/v3/files/${files[0].id}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!content.ok) return null;
    return await content.json();
  }

  async function writeDriveFile(fileName, data) {
    const token = Auth.getToken();
    if (!token) throw new Error('Not authenticated');

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'${encodeURIComponent(fileName)}'&fields=files(id)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!listRes.ok) throw new Error('Failed to list Drive files');
    const { files } = await listRes.json();

    if (files.length > 0) {
      const updateRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${files[0].id}?uploadType=media`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: blob }
      );
      if (!updateRes.ok) throw new Error('Failed to update Drive file');
    } else {
      const metadata = { name: fileName, parents: ['appDataFolder'] };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);
      const createRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
      );
      if (!createRes.ok) throw new Error('Failed to create Drive file');
    }
  }

  function localStorageKey(type) {
    return `cga_${type}`;
  }

  async function getFile(type) {
    if (cache[type]) return cache[type];

    if (Auth.isGoogleUser() && Auth.isTokenValid()) {
      try {
        const data = await readDriveFile(APP_CONFIG[`drive${type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, m => m)}File`] || `${APP_CONFIG.appName.toLowerCase().replace(/ /g, '_')}_${type}.json`);
        if (data) { cache[type] = data; return data; }
      } catch (e) {
        console.warn(`Drive ${type} read failed:`, e);
      }
    }

    const raw = localStorage.getItem(localStorageKey(type));
    if (raw) {
      try { cache[type] = JSON.parse(raw); return cache[type]; } catch {}
    }

    return null;
  }

  async function saveFile(type, data) {
    cache[type] = data;

    if (Auth.isGoogleUser() && Auth.isTokenValid()) {
      try {
        const driveFileName = `${APP_CONFIG.appName.toLowerCase().replace(/ /g, '_')}_${type}.json`;
        await writeDriveFile(driveFileName, data);
        return;
      } catch (e) {
        console.warn(`Drive ${type} save failed:`, e);
      }
    }

    localStorage.setItem(localStorageKey(type), JSON.stringify(data));
  }

  function clearCache() {
    Object.keys(cache).forEach(k => delete cache[k]);
  }

  return { testConnection, isAvailable, getFile, saveFile, clearCache };
})();
