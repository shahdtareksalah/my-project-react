import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'http://192.168.1.55:8000';

const ACCESS_TOKEN_KEY = 'smartaid_access_token';
const REFRESH_TOKEN_KEY = 'smartaid_refresh_token';

type HttpMethod = 'GET' | 'POST' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  requiresAuth?: boolean;
};

async function parseResponseBody(response: Response) {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function buildUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path}`;
}

export async function saveTokens(tokens: { access?: string; refresh?: string }) {
  if (tokens.access) {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  }
  if (tokens.refresh) {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
  }
}

export async function clearTokens() {
  await Promise.all([AsyncStorage.removeItem(ACCESS_TOKEN_KEY), AsyncStorage.removeItem(REFRESH_TOKEN_KEY)]);
}

export async function getStoredTokens() {
  const [access, refresh] = await Promise.all([
    AsyncStorage.getItem(ACCESS_TOKEN_KEY),
    AsyncStorage.getItem(REFRESH_TOKEN_KEY),
  ]);
  return { access, refresh };
}

async function refreshAccessToken() {
  const { refresh } = await getStoredTokens();
  if (!refresh) return null;

  const response = await fetch(buildUrl('/users/token/refresh/'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh }),
  });

  const data = await parseResponseBody(response);
  if (!response.ok || !data || typeof data !== 'object' || !('access' in data)) {
    await clearTokens();
    return null;
  }

  const nextAccess = String((data as { access: string }).access);
  await saveTokens({ access: nextAccess, refresh });
  return nextAccess;
}

export async function apiRequest(path: string, options: RequestOptions = {}) {
  const { method = 'GET', body, requiresAuth = true } = options;
  const url = buildUrl(path);
  const { access } = await getStoredTokens();

  const execute = async (token: string | null) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (requiresAuth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let response = await execute(access);

  if (response.status === 401 && requiresAuth) {
    const refreshedAccess = await refreshAccessToken();
    if (refreshedAccess) {
      response = await execute(refreshedAccess);
    }
  }

  const data = await parseResponseBody(response);
  return { response, data, url };
}

export const apiGet = (path: string, requiresAuth = true) =>
  apiRequest(path, { method: 'GET', requiresAuth });

export const apiPost = (path: string, body: unknown, requiresAuth = true) =>
  apiRequest(path, { method: 'POST', body, requiresAuth });

export const apiDelete = (path: string, body?: unknown, requiresAuth = true) =>
  apiRequest(path, { method: 'DELETE', body, requiresAuth });
