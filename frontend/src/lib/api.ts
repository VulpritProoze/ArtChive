import axios, { AxiosError } from 'axios'
import type { AxiosResponse, AxiosRequestConfig } from 'axios'

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

let isRefreshing = false
let failedQueue: Array<{ resolve: (value: any) => void, reject: (reason: any) => void }> = []

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if(error) prom.reject(error)
        else prom.resolve(token)
    })
    failedQueue = []
}

api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }
        
        // if unauthorized, retry request
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/')
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                }).then(token => {
                    originalRequest.headers = originalRequest.headers || {}
                    originalRequest.headers['Authorization'] = `Bearer ${token}`
                    return api(originalRequest)
                })
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                const res = await api.post('/api/core/auth/token/refresh/', {}, { withCredentials: true })
                const newAccessToken = res.data.access

                originalRequest.headers = originalRequest.headers || {}

                api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`

                processQueue(null, newAccessToken)

                return api(originalRequest)
            } catch(refreshError) {
                processQueue(refreshError)
                window.dispatchEvent(new Event('auth:logout'))
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }
        
        return Promise.reject(error)
    }
)

export default api