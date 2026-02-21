import { Platform } from 'react-native';
import { logger } from '../utils/logger';

export const API_BASE = (() => {
  if (Platform.OS === 'web') {
    // For web, use the hosted backend URL (Serveo tunnel or deployed backend)
    return "https://77f6193bc42e82.lhr.life/api";
  }
  // Only use Env var for Native/Production builds if needed
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;
  }
  return "http://10.212.10.29:8000/api"; // Fallback to LAN IP
})();

/**
 * Enhanced fetch wrapper with error handling and logging
 */
async function safeFetch(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const headers = {
      ...(options.headers || {}),
      'bypass-tunnel-reminder': 'true',
    };
    
    const res = await fetch(url, { 
      ...options, 
      headers,
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'No error body');
      logger.warn('API', `Request failed: ${url}`, { status: res.status, error: errorText });
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      logger.debug('API', `Request aborted or timed out: ${url}`);
      throw new Error('Connection timed out. Please check your internet or tunnel.');
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


// ... (imports)

export async function sendVoice(audioUri: string) {
  const formData = new FormData();
  let uploadUrl = "";

  try {
      uploadUrl = `${API_BASE}/voice/transcribe`;
      // DEBUG: Show initial alert to confirm function start
      if (Platform.OS === 'web') {
        console.log('[API] Starting sendVoice with URI:', audioUri);
      }

      if (Platform.OS === 'web') {
          console.log('[API] Fetching blob from URI:', audioUri);
          const response = await fetch(audioUri);
          const blob = await response.blob();
          console.log('[API] Blob retrieved successfully:', blob.type, blob.size, 'bytes');
          
          if (blob.size === 0) {
              console.error('[API] Blob size is 0! Recording failed.');
              if (Platform.OS === 'web') alert('Error: Recorded audio is empty (0 bytes).');
              throw new Error("Recorded audio is empty");
          }

          // Use webm extension for web blobs as they are usually webm or ogg
          const extension = blob.type.includes('webm') ? 'webm' : 
                            blob.type.includes('ogg') ? 'ogg' : 
                            blob.type.includes('wav') ? 'wav' : 'm4a';
          
          console.log(`[API] Appending file with extension: .${extension}`);
          formData.append('file', blob, `voice_query.${extension}`);
      } else {
        formData.append('file', {
          uri: audioUri,
          name: 'voice_query.m4a',
          type: 'audio/m4a',
        } as any);
      }
      
      uploadUrl = `${API_BASE}/voice/transcribe`;
      console.log('[API] Sending voice data to backend at:', uploadUrl);
      
      // DIRECT FETCH (Bypassing safeFetch to avoid header issues with FormData)
      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        headers: {
            // DO NOT set Content-Type here, let browser set it with boundary for FormData
            'Accept': 'application/json',
        }
      });
      
      if (!res.ok) {
          const errorText = await res.text();
          console.error('[API] Voice transcribe failed:', res.status, errorText);
          if (Platform.OS === 'web') alert(`Server Error ${res.status}: ${errorText}`);
          throw new Error(`Server error: ${res.status}`);
      }
      
      const json = await res.json();
      console.log('[API] Transcription success:', json);
      return json;
  } catch (error: any) {
              console.error('[API] sendVoice Error:', error);
              if (Platform.OS === 'web') alert(`Upload Failed to ${uploadUrl}: ${error.message}\nCheck console for details.`);
              throw error;
          }
}

export async function askJarvis(text: string) {
  const res = await safeFetch(`${API_BASE}/query/jarvis`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
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

export async function getMarketPrices(crop: string, location: string) {
  const res = await safeFetch(`${API_BASE}/market/prices`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ crop, location }),
  });
  return res.json();
}

export async function getLocationData(latitude: number, longitude: number) {
  const res = await safeFetch(`${API_BASE}/weather/location-data`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude }),
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

export async function diagnoseCrop(imageUri: string, description?: string) {
  try {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      if (imageUri.startsWith('http') && !imageUri.includes('localhost') && !imageUri.includes('127.0.0.1')) {
        // If it's a remote URL (like Unsplash), we can't always fetch it due to CORS
        // For the demo, we'll just send the URL and let the backend handle it or mock it
        formData.append('image_url', imageUri);
      } else {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('image', blob, 'crop_photo.jpg');
      }
    } else {
      // @ts-ignore
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'crop_photo.jpg',
      });
    }

    if (description) {
      formData.append('description', description);
    }

    // Try real API first
    // Note: Removing explicit Content-Type header for FormData as it breaks boundary generation on Web
    const res = await safeFetch(`${API_BASE}/advisory/diagnosis`, {
      method: "POST",
      body: formData,
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
