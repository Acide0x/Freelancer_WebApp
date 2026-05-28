// frontend/src/context/AuthContext.jsx
"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import api from "@/api/api"

// ─── Create Context ──────────────────────────────────────────────────────────
const AuthContext = createContext(null)

// ─── Provider Component ──────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch current user profile
  const fetchUser = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // ✅ This calls /api/auth/me (which we aliased to /users/profile)
      const response = await api.get("/auth/me")
      
      if (response?.data?.user) {
        setUser(response.data.user)
        // Ensure user is persisted
        localStorage.setItem("user", JSON.stringify(response.data.user))
      }
    } catch (err) {
      console.error("❌ Failed to fetch user:", {
        status: err.response?.status,
        message: err.response?.data?.message,
        url: err.config?.url,
      })
      
      setError(err.userMessage || err.message || "Failed to load user")
      
      // ONLY clear auth on true 401 (invalid token), not 404 (wrong endpoint)
      if (err.response?.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Login function
  const login = useCallback(async (credentials) => {
    try {
      setError(null)
      const response = await api.post("/users/login", credentials)
      
      const { token, user } = response.data
      if (token && user) {
        localStorage.setItem("token", token)
        localStorage.setItem("user", JSON.stringify(user))
        setUser(user)
        return { success: true, user }
      }
      return { success: false, error: response.data?.message || "Login failed" }
    } catch (err) {
      console.error("❌ Login error:", err)
      return { 
        success: false, 
        error: err.userMessage || err.response?.data?.message || err.message || "Login failed" 
      }
    }
  }, [])

  // Signup function
  const signup = useCallback(async (userData) => {
    try {
      setError(null)
      const response = await api.post("/users/signup", userData)
      
      const { token, user } = response.data
      if (token && user) {
        localStorage.setItem("token", token)
        localStorage.setItem("user", JSON.stringify(user))
        setUser(user)
        return { success: true, user }
      }
      return { success: false, error: response.data?.message || "Signup failed" }
    } catch (err) {
      console.error("❌ Signup error:", err)
      return { 
        success: false, 
        error: err.userMessage || err.response?.data?.message || err.message || "Signup failed" 
      }
    }
  }, [])

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Attempt backend logout (optional)
      await api.post("/users/logout").catch(() => {})
    } finally {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      setUser(null)
    }
  }, [])

  // Load user on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem("token")
    const userStr = localStorage.getItem("user")
    
    if (token && userStr) {
      try {
        const parsedUser = JSON.parse(userStr)
        setUser(parsedUser)
      } catch {
        // Invalid JSON, clear and fetch fresh
        localStorage.removeItem("token")
        localStorage.removeItem("user")
      }
    }
    setLoading(false)
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    loading,
    error,
    login,
    signup,
    logout,
    refreshUser: fetchUser,
    isAuthenticated: !!user,
  }), [user, loading, error, login, signup, logout, fetchUser])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Custom Hook: useAuth ✅ THIS IS THE EXPORT THAT WAS MISSING ─────────────
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// ─── Default Export (optional, for backwards compatibility) ──────────────────
export default AuthContext