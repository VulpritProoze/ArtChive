import axios, { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    withCredentials: true,
})

export const post = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/post/`,
    withCredentials: true,
})

export const collective = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/collective/`,
    withCredentials: true,
})

export const core = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/core/`,
    withCredentials: true,
})

export const notification = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/notifications/`,
    withCredentials: true,
})

export const gallery = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/gallery/`,
    withCredentials: true,
})

// WebSocket Base URL
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

// Flag to prevent multiple refresh requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error?: unknown) => void;
}> = [];

const processQueue = (error: any) => {
  console.log('Processing queue with error:', error);
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Logout handler
const handleLogout = async () => {
  console.log('🚪 Logging out due to authentication failure');
  
  try {
    await api.post('api/core/auth/logout/', {}, { withCredentials: true });
  } catch (e) {
  }
  
  // Clear client-side storage
  if (typeof window !== 'undefined') {
    // Show toast and redirect
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  }
};

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - MAIN LOGIC
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 🚨 CRITICAL FIX 1: If this is the refresh endpoint itself failing, logout immediately
    if (error.config?.url?.includes('/token/refresh/') && error.response?.status === 401) {
      await handleLogout();
      return Promise.reject(error);
    }

    // 🚨 CRITICAL FIX 2: Skip auth routes to prevent infinite loops
    const isAuthRoute = error.config?.url?.includes('/auth/');
    if (isAuthRoute) {
      return Promise.reject(error);
    }

    // If error is not 401 or request already retried, reject
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }


    // If refresh is already in progress, add to queue
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => {
          return api(originalRequest);
        })
        .catch(err => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Call refresh token endpoint
      await api.post(
        'api/core/auth/token/refresh/',
        {},
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Process queued requests
      processQueue(null);

      // Retry original request
      return api(originalRequest);
    } catch (refreshError) {
      // Process queued requests with error
      processQueue(refreshError);
      
      // Logout since refresh failed
      await handleLogout();
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// 🚨 SIMPLIFIED interceptors for other instances - no refresh logic, just logout on 401
const instances = [post, collective, core, notification, gallery];

instances.forEach(instance => {
  // Request interceptor
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - SIMPLE: just logout on 401, no refresh attempts
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    async (error: AxiosError) => {

      // Skip auth routes
      if (error.config?.url?.includes('/auth/')) {
        return Promise.reject(error);
      }

      // Logout on 401
      if (error.response?.status === 401) {
        await handleLogout();
      }
      
      return Promise.reject(error);
    }
  );
});

export default api;