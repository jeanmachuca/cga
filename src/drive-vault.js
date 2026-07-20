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

  function driveFileName(type) {
    return `${APP_CONFIG.appName.toLowerCase().replace(/ /g, '_')}_${type}.json`;
  }

  async function getFile(type) {
    if (cache[type]) return cache[type];

    const token = Auth.getToken();
    if (!token || !Auth.isTokenValid()) return null;

    try {
      const name = encodeURIComponent(driveFileName(type));
      const listRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'${name}'&fields=files(id)`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!listRes.ok) return null;
      const { files } = await listRes.json();
      if (files.length === 0) return null;

      const contentRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${files[0].id}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!contentRes.ok) return null;
      const data = await contentRes.json();
      cache[type] = data;
      return data;
    } catch (e) {
      console.warn(`Drive ${type} read failed:`, e);
      return null;
    }
  }

  async function saveFile(type, data) {
    cache[type] = data;

    const token = Auth.getToken();
    if (!token || !Auth.isTokenValid()) throw new Error('Not authenticated');

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const name = encodeURIComponent(driveFileName(type));

    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'${name}'&fields=files(id)`,
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
      const metadata = { name: driveFileName(type), parents: ['appDataFolder'] };
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

  function clearCache() {
    Object.keys(cache).forEach(k => delete cache[k]);
  }

  return { testConnection, isAvailable, getFile, saveFile, clearCache };
})();
