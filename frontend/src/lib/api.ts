import axios, { AxiosError } from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL;

if (!apiBaseUrl) {
  console.warn(
    "[api] VITE_API_URL is not set. Falling back to http://localhost:8000. Server URL may not exist."
  );
}

const fallbackApiUrl = "http://localhost:8000";
const resolvedApiUrl = apiBaseUrl || fallbackApiUrl;

const api = axios.create({
  baseURL: resolvedApiUrl,
  withCredentials: true,
});

export const post = axios.create({
  baseURL: `${resolvedApiUrl}/api/post/`,
  withCredentials: true,
});

export const collective = axios.create({
  baseURL: `${resolvedApiUrl}/api/collective/`,
  withCredentials: true,
});

export const core = axios.create({
  baseURL: `${resolvedApiUrl}/api/core/`,
  withCredentials: true,
});

export const notification = axios.create({
  baseURL: `${resolvedApiUrl}/api/notifications/`,
  withCredentials: true,
});

export const gallery = axios.create({
  baseURL: `${resolvedApiUrl}/api/gallery/`,
  withCredentials: true,
});

// WebSocket Base URL
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

// Flag to prevent multiple refresh requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error?: unknown) => void;
}> = [];

const processQueue = (error: any) => {
  console.log("Processing queue with error:", error);
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Refresh token handler
const handleRefresh = async (): Promise<void> => {
  await api.post(
    "api/core/auth/token/refresh/",
    {},
    {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};

// Logout handler
const handleLogout = async () => {
  console.log("🚪 Logging out due to authentication failure");

  try {
    await api.post("api/core/auth/logout/", {}, { withCredentials: true });
  } catch (e) {}

  // Clear client-side storage
  if (typeof window !== "undefined") {
    // Show toast and redirect
    setTimeout(() => {
      window.location.href = "/login";
    }, 100);
  }
};

// Shared request interceptor (same for all instances)
const requestInterceptor = {
  onFulfilled: (config: InternalAxiosRequestConfig) => {
    return config;
  },
  onRejected: (error: AxiosError) => {
    return Promise.reject(error);
  },
};

// Shared response interceptor factory - creates interceptor for a specific instance
const createResponseInterceptor = (instance: typeof api) => {
  return async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 🚨 CRITICAL FIX 1: If this is the refresh endpoint itself failing, logout immediately
    if (
      error.config?.url?.includes("/token/refresh/") &&
      error.response?.status === 401
    ) {
      await handleLogout();
      return Promise.reject(error);
    }

    // 🚨 CRITICAL FIX 2: Skip auth routes to prevent infinite loops
    const isAuthRoute = error.config?.url?.includes("/auth/");
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
          // Retry with the same instance that made the original request
          return instance(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Call refresh token endpoint
      await handleRefresh();

      // Process queued requests
      processQueue(null);

      // Retry original request with the same instance that made it
      return instance(originalRequest);
    } catch (refreshError) {
      // Process queued requests with error
      processQueue(refreshError);

      // Logout since refresh failed
      await handleLogout();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  };
};

// Apply same interceptors to all instances (including main api)
const instances = [api, post, collective, core, notification, gallery];

instances.forEach((instance) => {
  // Request interceptor
  instance.interceptors.request.use(
    requestInterceptor.onFulfilled,
    requestInterceptor.onRejected
  );

  // Response interceptor - automatic token refresh
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Explicitly handle 204 No Content responses
      if (response.status === 204) {
        // 204 has no body, but we still return the response object
        return response;
      }
      return response;
    },
    createResponseInterceptor(instance)
  );
});

export default api;
