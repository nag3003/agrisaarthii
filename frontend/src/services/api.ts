import { logger } from '../utils/logger';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : "http://localhost:8000/api";

/**
 * Enhanced fetch wrapper with error handling and logging
 */
async function safeFetch(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'No error body');
      logger.warn('API', `Request failed: ${url}`, { status: res.status, error: errorText });
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res;
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      // Handled by global logger, but we catch it here to prevent app crash
      logger.debug('API', `Request aborted: ${url}`);
    } else {
      logger.error('API', `Fetch failed: ${url}`, { error: error.message });
    }
    throw error;
  }
}

export async function checkHealth() {
  try {
    const res = await safeFetch(`${API_BASE}/health`);
    return res.json();
  } catch (error) {
    return { status: "offline" };
  }
}

export async function sendVoice(audioUri: string) {
  // In React Native, we need to create a file object for FormData
  const formData = new FormData();

  // @ts-ignore
  formData.append('audio', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'voice_query.m4a',
  });

  const res = await safeFetch(`${API_BASE}/voice/transcribe`, {
    method: "POST",
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return res.json();
}

export async function getAdvice(text: string, context: any = {}) {
  const res = await safeFetch(`${API_BASE}/query/advice`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, context }),
  });

  return res.json();
}

export async function getCalendar(crop: string) {
  const res = await safeFetch(`${API_BASE}/knowledge/calendar?crop=${crop}`);
  return res.json();
}

export async function getWeather(lat: number, lon: number) {
  const res = await safeFetch(`${API_BASE}/weather?lat=${lat}&lon=${lon}`);
  return res.json();
}

export async function getSensors() {
  const res = await safeFetch(`${API_BASE}/iot/sensors`);
  return res.json();
}

export async function controlMotor(action: string) {
  const res = await safeFetch(`${API_BASE}/iot/motor`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  return res.json();
}

export async function sendFeedback(adviceId: string, actionTaken: boolean, details: string = "") {
  const res = await safeFetch(`${API_BASE}/feedback/outcome`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ advice_id: adviceId, action_taken: actionTaken, details, farmer_id: "f-123" }),
  });
  return res.json();
}

export async function getPredictiveAlerts() {
  const res = await safeFetch(`${API_BASE}/alerts/predictive`);
  return res.json();
}

export async function syncBatch(batch: any[]) {
  const res = await safeFetch(`${API_BASE}/sync/batch`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch, farmer_id: "f-123" }),
  });
  return res.json();
}

export async function diagnoseCrop(imageUri: string) {
  try {
    const formData = new FormData();

    // @ts-ignore
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'crop_photo.jpg',
    });

    // Try real API first
    const res = await safeFetch(`${API_BASE}/advisory/diagnosis`, {
      method: "POST",
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.json();
  } catch (error) {
    logger.warn('API', 'Diagnosis API failed, falling back to Mock AI', { error });

    // MOCK RESPONSE FOR DEMO/OFFLINE MODE
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      diagnosis: "Early Blight (Mock)",
      confidence: 88,
      remedy: "• Remove affected leaves immediately.\n• Apply copper-based fungicide.\n• Improve air circulation around plants.\n• Avoid overhead watering to reduce moisture on leaves."
    };
  }
}
