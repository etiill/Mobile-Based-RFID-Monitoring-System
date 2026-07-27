import axios from "axios"

/**
 * Centrally configured Axios instance.
 * Sets baseURL to Laravel server endpoint and injects local token in the request header.
 */
const AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
})

// Request interceptor to automatically append the Sanctum token
AxiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default AxiosInstance
