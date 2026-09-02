import axios from 'axios';
import type {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

const STRAPI_URL = (import.meta.env.STRAPI_URL || import.meta.env.PUBLIC_STRAPI_URL || '').replace(/\/$/, '');
const STRAPI_TOKEN = import.meta.env.STRAPI_TOKEN || import.meta.env.PUBLIC_STRAPI_TOKEN || '';

export const hasStrapi = STRAPI_URL && STRAPI_URL !== 'localhost:1337' && STRAPI_URL !== 'http://localhost:1337';
export const strapiBaseUrl = STRAPI_URL;

const apiClient: AxiosInstance = axios.create({
  baseURL: STRAPI_URL || 'http://localhost:1337',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    ...(STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {}),
  },
});

// Public content collections must not inherit a token with narrower permissions.
export const publicApiClient: AxiosInstance = axios.create({
  baseURL: STRAPI_URL || 'http://localhost:1337',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(undefined);
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const rutasSinAutenticacion = [
        '/auth/login', '/auth/forgot-password', '/auth/verify-code',
        '/auth/reset-password', '/auth/validar-credencial', '/auth/register',
      ];

      if (originalRequest.url && rutasSinAutenticacion.some(ruta => originalRequest.url!.includes(ruta))) {
        return Promise.reject(error);
      }

      if (originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post('/api/auth/refresh');
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);

        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          const isPublicRoute = currentPath === '/login' || currentPath.startsWith('/recuperar-contrasena');
          if (!isPublicRoute) {
            setTimeout(() => { window.location.href = '/login'; }, 3000);
          }
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;
      switch (status) {
        case 401: break;
        case 403: break;
        case 404: break;
        case 500: break;
      }
    }
    return Promise.reject(error);
  },
);

export const toQuery = (params: Record<string, string | number | boolean | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
};

export const flattenEntry = (item: unknown): Record<string, unknown> | null => {
  if (!item || typeof item !== 'object') return null;

  const record = item as Record<string, unknown>;
  if (record.attributes && typeof record.attributes === 'object') {
    const attrs = record.attributes as Record<string, unknown>;
    return {
      id: String(record.id ?? record.documentId ?? attrs.slug ?? ''),
      ...attrs,
    };
  }

  const {
    documentId, createdAt, updatedAt, publishedAt,
    locale, localizations, createdBy, updatedBy, ...rest
  } = record;

  return {
    id: String(record.id ?? documentId ?? rest.slug ?? ''),
    ...rest,
  };
};

export const prefixMediaUrl = (url: string, baseUrl = STRAPI_URL): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default apiClient;
