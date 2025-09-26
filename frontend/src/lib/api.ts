import axios, { AxiosError } from 'axios'
import type { AxiosResponse, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'

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
    console.log('✅ Logout successful');
  } catch (e) {
    console.warn('Logout API call failed:', e);
  }
  
  // Clear client-side storage
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
    
    // Show toast and redirect
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  }
};

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log('🔄 API Request Interceptor triggered:', {
      url: config.url,
      method: config.method,
    });
    return config;
  },
  (error: AxiosError) => {
    console.error('❌ API Request Interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - MAIN LOGIC
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('✅ API Response Interceptor success:', {
      url: response.config.url,
      status: response.status
    });
    return response;
  },
  async (error: AxiosError) => {
    console.log('❌ API Response Interceptor caught error:', {
      url: error.config?.url,
      status: error.response?.status,
    });

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 🚨 CRITICAL FIX 1: If this is the refresh endpoint itself failing, logout immediately
    if (error.config?.url?.includes('/token/refresh/') && error.response?.status === 401) {
      console.log('🔴 Refresh token expired - forcing logout');
      await handleLogout();
      return Promise.reject(error);
    }

    // 🚨 CRITICAL FIX 2: Skip auth routes to prevent infinite loops
    const isAuthRoute = error.config?.url?.includes('/auth/');
    if (isAuthRoute) {
      console.log('Auth route detected, skipping refresh logic');
      return Promise.reject(error);
    }

    // If error is not 401 or request already retried, reject
    if (error.response?.status !== 401) {
      console.log('Not a 401 error, skipping refresh logic');
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      console.log('Request already retried, skipping');
      return Promise.reject(error);
    }

    console.log('🔐 401 detected, starting refresh logic...');

    // If refresh is already in progress, add to queue
    if (isRefreshing) {
      console.log('Refresh already in progress, adding to queue');
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => {
          console.log('Retrying queued request');
          return api(originalRequest);
        })
        .catch(err => {
          console.error('Queue request failed:', err);
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;
    console.log('Setting isRefreshing to true');

    try {
      console.log('🔄 Attempting token refresh...');
      
      // Call refresh token endpoint
      const refreshResponse = await api.post(
        'api/core/auth/token/refresh/',
        {},
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Token refresh successful:', refreshResponse.status);

      // Process queued requests
      processQueue(null);

      // Retry original request
      console.log('🔄 Retrying original request:', originalRequest.url);
      return api(originalRequest);
    } catch (refreshError) {
      console.error('❌ Token refresh failed:', refreshError);
      
      // Process queued requests with error
      processQueue(refreshError);
      
      // Logout since refresh failed
      await handleLogout();
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
      console.log('Setting isRefreshing to false');
    }
  }
);

// 🚨 SIMPLIFIED interceptors for other instances - no refresh logic, just logout on 401
const instances = [post, collective, core];

instances.forEach(instance => {
  // Request interceptor
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      console.log(`🔄 ${instance.defaults.baseURL} Request Interceptor:`, config.url);
      return config;
    },
    (error: AxiosError) => {
      console.error(`❌ ${instance.defaults.baseURL} Request Interceptor error:`, error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - SIMPLE: just logout on 401, no refresh attempts
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      console.log(`✅ ${instance.defaults.baseURL} Response success:`, response.status);
      return response;
    },
    async (error: AxiosError) => {
      console.log(`❌ ${instance.defaults.baseURL} Response error:`, error.response?.status);

      // Skip auth routes
      if (error.config?.url?.includes('/auth/')) {
        return Promise.reject(error);
      }

      // Logout on 401
      if (error.response?.status === 401) {
        console.log('🛑 401 detected - logging out');
        await handleLogout();
      }
      
      return Promise.reject(error);
    }
  );
});

export default api;