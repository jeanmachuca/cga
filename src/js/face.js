let faceapi = null;

const Face = (() => {
  let modelsLoaded = false;
  let videoElement = null;
  let stream = null;
  let storedDescriptors = null;
  let userName = null;

  async function loadModels() {
    if (modelsLoaded) return true;
    try {
      faceapi = await import('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.esm.js');
      const modelUrl = APP_CONFIG.faceDetection.modelUrl;
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
      ]);
      modelsLoaded = true;
      return true;
    } catch (e) {
      console.error('Failed to load face models:', e);
      return false;
    }
  }

  async function startCamera(videoEl) {
    videoElement = videoEl;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      videoElement.srcObject = stream;
      await videoElement.play();
      return true;
    } catch (e) {
      console.error('Camera access denied:', e);
      return false;
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (videoElement) {
      videoElement.srcObject = null;
    }
  }

  async function detectFace() {
    if (!modelsLoaded || !videoElement || videoElement.readyState < 2) return null;
    try {
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.SsdMobilenetv1Options({ minConfidence: APP_CONFIG.faceDetection.minConfidence }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      return detection || null;
    } catch {
      return null;
    }
  }

  async function captureSnapshot() {
    const detection = await detectFace();
    if (!detection) return null;
    return Array.from(detection.descriptor);
  }

  async function train(name, onProgress, onRetry) {
    userName = name;
    const snapshots = [];
    const count = APP_CONFIG.faceDetection.snapshotCount;
    const interval = APP_CONFIG.faceDetection.snapshotIntervalMs;
    const maxAttempts = 15;
    let attempts = 0;

    for (let i = 0; i < count; i++) {
      if (onProgress) onProgress(i + 1, count);
      await new Promise(r => setTimeout(r, interval));
      const descriptor = await captureSnapshot();
      if (descriptor) {
        snapshots.push(descriptor);
        attempts = 0;
      } else {
        attempts++;
        if (attempts >= maxAttempts) return false;
        if (onRetry) onRetry(attempts, maxAttempts);
        i--;
      }
    }

    if (snapshots.length === 0) return false;

    storedDescriptors = { name, descriptors: snapshots };
    return true;
  }

  function euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  async function recognize() {
    if (!storedDescriptors) return null;
    const detection = await detectFace();
    if (!detection) return null;

    const liveDescriptor = Array.from(detection.descriptor);
    const threshold = APP_CONFIG.faceDetection.descriptorThreshold;

    let bestDistance = Infinity;
    for (const ref of storedDescriptors.descriptors) {
      const dist = euclideanDistance(liveDescriptor, ref);
      if (dist < bestDistance) bestDistance = dist;
    }

    if (bestDistance < threshold) {
      return { name: storedDescriptors.name, distance: bestDistance };
    }
    return { name: null, distance: bestDistance };
  }

  function setStoredDescriptors(data) {
    storedDescriptors = data;
    if (data) userName = data.name;
  }

  function getStoredDescriptors() { return storedDescriptors; }
  function getUserName() { return userName; }
  function isLoaded() { return modelsLoaded; }

  return {
    loadModels, startCamera, stopCamera,
    detectFace, captureSnapshot, train, recognize,
    setStoredDescriptors, getStoredDescriptors, getUserName, isLoaded,
  };
})();
