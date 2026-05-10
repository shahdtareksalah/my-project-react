import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'http://192.168.1.55:8000';
export const API_PATHS = {
  mockRead: '/ai/mock/read/',
  mockDescribe: '/ai/mock/describe/',
} as const;
const ACCESS_TOKEN_KEY = 'smartaid_access_token';
const REFRESH_TOKEN_KEY = 'smartaid_refresh_token';

type HttpMethod = 'GET' | 'POST' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  requiresAuth?: boolean;
  headers?: Record<string, string>;
  isFormData?: boolean;
};

type BackendErrorData = {
  detail?: string;
  message?: string;
  error?: string;
  non_field_errors?: string[];
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
  const { method = 'GET', body, requiresAuth = true, headers: customHeaders, isFormData = false } = options;
  const url = buildUrl(path);
  const { access } = await getStoredTokens();

  const execute = async (token: string | null) => {
 const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };
    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }    if (requiresAuth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(url, {
      method,
      headers,
body:
        body === undefined
          ? undefined
          : isFormData
          ? (body as FormData)
          : JSON.stringify(body),    });
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
export const apiPostFormData = (path: string, body: FormData, requiresAuth = true) =>
  apiRequest(path, { method: 'POST', body, requiresAuth, isFormData: true });

export const apiDelete = (path: string, body?: unknown, requiresAuth = true) =>
  apiRequest(path, { method: 'DELETE', body, requiresAuth });
export function createImageFormData(imageUri: string) {
  const filename = imageUri.split('/').pop() ?? `capture-${Date.now()}.jpg`;
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeType =
    ext === 'png'
      ? 'image/png'
      : ext === 'webp'
      ? 'image/webp'
      : ext === 'heic'
      ? 'image/heic'
      : 'image/jpeg';

  const formData = new FormData();
  formData.append(
    'image',
    {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as unknown as Blob
  );

  return formData;
}

export function extractApiErrorMessage(data: unknown, status: number) {
  if (data && typeof data === 'object') {
    const payload = data as BackendErrorData;
    if (payload.detail) return String(payload.detail);
    if (payload.message) return String(payload.message);
    if (payload.error) return String(payload.error);
    if (Array.isArray(payload.non_field_errors) && payload.non_field_errors.length > 0) {
      return payload.non_field_errors.join(', ');
    }
  }

  if (status === 400) return 'Bad request. Please capture a valid image and try again.';
  return `Request failed with status ${status}.`;
}
