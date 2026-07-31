/**
 * Centralized API client for Kryozen Quick Chat.
 * 
 * All HTTP requests to the backend MUST use this utility to ensure:
 * 1. Correct base URL (VITE_API_URL for cross-origin Render deployment)
 * 2. Credentials included (HttpOnly cookie auth)
 * 3. Consistent error handling
 * 
 * This module is the single source of truth for backend URL resolution.
 * When migrating to a single-domain setup later, only this file changes.
 */

export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return '';
};

export const getMediaUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${formattedPath}`;
};

/**
 * Thin wrapper around fetch() that prepends the backend base URL
 * and includes credentials for cross-origin cookie authentication.
 */
export async function apiClient(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${getApiBaseUrl()}${path}`;
  
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
    },
  });
}

/**
 * Convenience for JSON POST/PATCH/PUT requests.
 */
export async function apiJson(
  path: string,
  options: RequestInit & { body?: any } = {}
): Promise<Response> {
  const { body, headers, ...rest } = options;
  
  return apiClient(path, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
