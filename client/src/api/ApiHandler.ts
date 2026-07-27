import type { AxiosRequestConfig, AxiosResponse } from "axios"
import AxiosInstance from "./AxiosInstance"

/**
 * Reusable API request wrapper with global error handling.
 */
export class ApiHandler {
  /**
   * Send a GET request.
   */
  static async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await AxiosInstance.get(url, config)
      return response.data
    } catch (error: any) {
      this.handleError(error)
      throw error
    }
  }

  /**
   * Send a POST request.
   */
  static async post<T, U = any>(url: string, data?: U, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await AxiosInstance.post(url, data, config)
      return response.data
    } catch (error: any) {
      this.handleError(error)
      throw error
    }
  }

  /**
   * Send a PUT request.
   */
  static async put<T, U = any>(url: string, data?: U, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await AxiosInstance.put(url, data, config)
      return response.data
    } catch (error: any) {
      this.handleError(error)
      throw error
    }
  }

  /**
   * Send a DELETE request.
   */
  static async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await AxiosInstance.delete(url, config)
      return response.data
    } catch (error: any) {
      this.handleError(error)
      throw error
    }
  }

  /**
   * Standardize API error responses and check for session expiry (401).
   */
  private static handleError(error: any) {
    console.error("API Error:", error.response || error.message || error)

    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.message || "An error occurred on the server."

      if (status === 401) {
        // Clear expired local authentication flags
        localStorage.removeItem("token")
        localStorage.removeItem("authenticated")

        // Redirect back to login page if user is currently inside the app
        if (window.location.pathname !== "/login") {
          window.location.href = "/login"
        }
      }

      error.message = message
    } else if (error.request) {
      error.message = "No response from server. Please verify the backend service is running."
    } else {
      error.message = error.message || "An unexpected request error occurred."
    }
  }
}

export default ApiHandler
