// src/api/api.js
import axios from 'axios'

// ============================================================================
// ⚙️ AXIOS INSTANCE CONFIGURATION
// ============================================================================
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Default timeout: 10 seconds (override per-request if needed)
  timeout: 10000,
  // Don't send cookies by default (use Bearer token instead)
  withCredentials: false,
  // Validate status codes (only 2xx are considered success)
  validateStatus: (status) => status >= 200 && status < 300,
})

// ============================================================================
// 🔐 REQUEST INTERCEPTOR: Attach Auth Token
// ============================================================================
api.interceptors.request.use(
  (config) => {
    // Skip token attachment for public endpoints
    const publicEndpoints = [
      '/auth/login',
      '/auth/register', 
      '/auth/forgot-password',
      '/auth/reset-password',
      '/users/public',
    ]
    
    const isPublic = publicEndpoints.some(endpoint => 
      config.url?.includes(endpoint)
    )
    
    if (!isPublic) {
      const token = localStorage.getItem('token')
      
      if (token) {
        // Ensure proper Bearer format, avoid double-prefixing
        const existingAuth = config.headers.Authorization || config.headers.authorization
        
        if (!existingAuth || !existingAuth.toLowerCase().startsWith('bearer ')) {
          config.headers.Authorization = `Bearer ${token}`
        }
      }
      // No token for protected endpoint - let backend handle 401
    }
    
    // Add request timestamp for debugging slow requests
    config.metadata = { startTime: Date.now() }
    
    return config
  },
  (error) => {
    console.error('❌ Request interceptor error:', {
      message: error.message,
      url: error.config?.url,
      method: error.config?.method,
    })
    return Promise.reject(error)
  }
)

// ============================================================================
// 📡 RESPONSE INTERCEPTOR: Global Error Handling
// ============================================================================
api.interceptors.response.use(
  // ✅ Success: log response time, return data
  (response) => {
    const duration = Date.now() - (response.config.metadata?.startTime || Date.now())
    
    // Log slow requests (>3s) for performance monitoring
    if (duration > 3000) {
      console.warn('🐌 Slow response:', {
        url: response.config.url,
        method: response.config.method,
        duration: `${duration}ms`,
        status: response.status,
      })
    }
    
    return response
  },
  
  // ❌ Error: Handle gracefully
  async (error) => {
    const { config, response, request, message } = error
    const duration = Date.now() - (config?.metadata?.startTime || Date.now())
    
    // ========== NETWORK ERRORS (no response from server) ==========
    if (!response && request) {
      const isTimeout = message?.includes('timeout') || message?.includes('ECONNABORTED')
      
      console.error('🌐 Network Error:', {
        url: config?.url,
        method: config?.method,
        type: isTimeout ? 'TIMEOUT' : 'CONNECTION_FAILED',
        duration: `${duration}ms`,
        message: isTimeout 
          ? `Request timed out after ${config?.timeout || 10000}ms` 
          : 'Cannot reach server - check internet connection or CORS',
      })
      
      // Enhance error for UI handling
      error.isNetworkError = true
      error.isTimeout = isTimeout
      error.userMessage = isTimeout
        ? 'Request timed out. Please check your connection and try again.'
        : 'Cannot connect to server. Please check your internet connection.'
      
      return Promise.reject(error)
    }
    
    // ========== HTTP ERROR RESPONSES ==========
    const status = response?.status
    const data = response?.data
    const url = config?.url
    
    // Don't spam console for expected auth errors during login flow
    const isAuthEndpoint = url?.includes('/auth/') || url?.includes('/users/profile')
    const isExpectedAuthError = isAuthEndpoint && (status === 401 || status === 400)
    
    if (!isExpectedAuthError) {
      console.error('❌ API Error:', {
        url,
        method: config?.method,
        status,
        duration: `${duration}ms`,
        message: data?.message || data?.error || message,
        // Only log response data if not sensitive
        data: status !== 401 ? (data || 'No data') : '[REDACTED]',
      })
    }
    
    // ========== SPECIFIC STATUS CODE HANDLING ==========
    switch (status) {
      case 401: // Unauthorized
        // Token expired/invalid - only auto-logout if NOT on auth endpoints
        if (!isAuthEndpoint) {
          console.warn('🔑 Token rejected (401) - clearing session')
          
          // Clear auth data
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          
          // Dispatch event for global auth state management
          try {
            window.dispatchEvent(new CustomEvent('auth:unauthorized', {
              detail: { url, message: data?.message }
            }))
          } catch (e) {
            console.warn('Failed to dispatch auth event:', e)
          }
        }
        error.isAuthError = true
        break
        
      case 403: // Forbidden
        error.isForbidden = true
        error.userMessage = data?.message || 'You do not have permission to perform this action.'
        break
        
      case 404: // Not Found
        error.userMessage = data?.message || 'Resource not found.'
        break
        
      case 409: // Conflict (e.g., duplicate email)
        error.isConflict = true
        break
        
      case 422: // Validation Error
        error.isValidationError = true
        error.errors = data?.errors || data?.details
        break
        
      case 429: // Rate Limited
        error.isRateLimited = true
        const retryAfter = response?.headers?.['retry-after']
        error.userMessage = retryAfter
          ? `Too many requests. Please wait ${retryAfter} seconds.`
          : 'Too many requests. Please slow down.'
        break
        
      case 500: // Server Error
      case 502: // Bad Gateway
      case 503: // Service Unavailable
      case 504: // Gateway Timeout
        error.isServerError = true
        error.userMessage = 'Server error. Please try again later.'
        break
        
      default:
        // Generic client error
        if (status >= 400 && status < 500) {
          error.userMessage = data?.message || `Request failed with status ${status}`
        }
    }
    
    // Attach helpful metadata for error handling in components
    error.status = status
    error.endpoint = url
    error.responseData = data
    
    return Promise.reject(error)
  }
)

// ============================================================================
// 🛠️ UTILITY METHODS
// ============================================================================

/**
 * Check if API is reachable (health check)
 * @returns {Promise<boolean>}
 */
api.isAvailable = async (timeout = 3000) => {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    
    await api.get('/health', { 
      signal: controller.signal,
      timeout 
    })
    
    clearTimeout(timer)
    return true
  } catch {
    return false
  }
}

/**
 * Clear auth-related interceptors (for testing/logout)
 */
api.clearAuth = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

/**
 * Set token manually (for testing or manual auth flow)
 * @param {string} token 
 */
api.setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token)
  } else {
    localStorage.removeItem('token')
  }
}

/**
 * Create a cancellable request with timeout
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {{ signal: AbortSignal, cancel: () => void }}
 */
export const createCancellableRequest = (timeoutMs = 10000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  return {
    signal: controller.signal,
    cancel: () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }
}

/**
 * Check if user is authenticated (basic token check)
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('token')
  if (!token) return false
  
  // Basic JWT expiry check (doesn't verify signature)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const now = Date.now() / 1000
    return payload.exp ? payload.exp > now : true
  } catch {
    return false
  }
}

// ============================================================================
// 📤 EXPORT
// ============================================================================
export default api
