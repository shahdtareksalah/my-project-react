import { Platform } from 'react-native';

const API_HOST = '192.168.1.17';
const API_PORT = '8000';

export const API_BASE_URL = `http://${API_HOST}:${API_PORT}`;

const ANDROID_FALLBACK_BASE_URLS = ['http://10.0.2.2:8000', 'http://127.0.0.1:8000'];
const IOS_FALLBACK_BASE_URLS = ['http://127.0.0.1:8000'];

export const buildApiUrl = (path: string) => `${API_BASE_URL}${path}`;

export const API_ENDPOINTS = {
  register: buildApiUrl('/users/register/'),
  login: buildApiUrl('/users/login/'),
};

const getFallbackBaseUrls = () => {
  const fallbackUrls =
    Platform.OS === 'android' ? ANDROID_FALLBACK_BASE_URLS : IOS_FALLBACK_BASE_URLS;

  return [API_BASE_URL, ...fallbackUrls];
};


const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const parseJsonSafely = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export const postWithFallback = async (path: string, payload: Record<string, unknown>) => {
  const baseUrls = getFallbackBaseUrls();
  let lastError: unknown = null;

  for (const baseUrl of baseUrls) {
    const url = `${baseUrl}${path}`;

    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await parseJsonSafely(response);
      return { response, data, usedUrl: url };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Unable to reach backend (${API_BASE_URL}). If using USB, run: adb reverse tcp:8000 tcp:8000. Error: ${(lastError as Error)?.message || 'Network request failed'
    }`
  );
};
