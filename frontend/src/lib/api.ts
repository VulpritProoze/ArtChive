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
            originalRequest._retry = true
            return api(originalRequest)
        }
        
        return Promise.reject(error)
    }
)

export default api