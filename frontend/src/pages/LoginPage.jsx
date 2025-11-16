"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Eye, EyeOff, Mail, Lock, LogIn, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import api from "@/api/api"

const LoginPage = () => {
  const [user, setUser] = useState(null)
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  // Use `useNavigate` for navigation and `useLocation` to get the current location state
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Check if the user is already logged in on mount
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData)) // Parse the stored user data
    }
  }, [])

  // Real-time validation
  const validateField = (name, value) => {
    let error = ""

    switch (name) {
      case "email":
        if (!value.trim()) error = "Email is required"
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Please enter a valid email address"
        break
      case "password":
        if (!value) error = "Password is required"
        else if (value.length < 6) error = "Password must be at least 6 characters"
        break
    }

    setFieldErrors((prev) => ({ ...prev, [name]: error }))
    return error === ""
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Real-time validation
    validateField(name, value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    // Validate all fields
    const isEmailValid = validateField("email", formData.email)
    const isPasswordValid = validateField("password", formData.password)

    if (!isEmailValid || !isPasswordValid) {
      setError("Please fix the errors below")
      return
    }

    setIsLoading(true)

    try {
      // Make sure your `api` instance is set up correctly
      const response = await api.post("/users/login", formData, {
        headers: { "Content-Type": "application/json" },
      })
      const data = response.data

      console.log("Response Data:", data) // Log the response data to console

      if (data.token) {
        localStorage.setItem("token", data.token) // Store the token
        localStorage.setItem("user", JSON.stringify(data.user)) // Store the user data as a string
        console.log("Stored Token:", localStorage.getItem("token")) // Log token to console
        console.log("Stored User:", localStorage.getItem("user")) // Log user data to console
        setUser(data.user) // Set the user data in state
        toast.success("Welcome back! Login successful")
        // Redirect logic
        const from = location.state?.from?.pathname || "/" // Get the referrer or default to "/"
        console.log("Redirecting to:", from)
        navigate(from, { replace: true }) // Navigate to the referrer or home
      } else {
        setError(data.message || "Login failed")
        toast.error(data.message || "Login failed")
      }
    } catch (error) {
      console.error("Fetch Error:", error)
      const message = error.response?.data?.message || error.message || "An error occurred. Please try again."
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = (provider) => {
    toast.info(`${provider} login will be implemented soon!`)
  }

  const handleForgotPassword = () => {
    toast.info("Password reset functionality will be implemented soon!")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your MartPlace account</p>
        </div>

        <Card className="border-green-200 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <LogIn className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-green-600">Sign In</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Social Login Options */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-gray-300 hover:bg-gray-50 bg-transparent"
                type="button"
                onClick={() => handleSocialLogin("Google")}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <Button
                variant="outline"
                className="w-full border-gray-300 hover:bg-gray-50 bg-transparent"
                type="button"
                onClick={() => handleSocialLogin("Facebook")}
              >
                <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Continue with Facebook
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with email</span>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    className={`pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500 ${
                      fieldErrors.email ? "border-red-500" : ""
                    }`}
                    onChange={handleChange}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                    required
                  />
                </div>
                {fieldErrors.email && (
                  <p id="email-error" className="text-sm text-red-600" role="alert">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    className={`pl-10 pr-10 border-gray-300 focus:border-green-500 focus:ring-green-500 ${
                      fieldErrors.password ? "border-red-500" : ""
                    }`}
                    onChange={handleChange}
                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="password-error" className="text-sm text-red-600" role="alert">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-green-600 hover:text-green-700 underline"
                >
                  Forgot your password?
                </button>
              </div>

              {/* Privacy Note */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-800">
                  🔒 Your login is secure and encrypted. We protect your privacy and never share your data.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white font-medium py-2.5"
                disabled={
                  !formData.email ||
                  !formData.password ||
                  isLoading ||
                  Object.values(fieldErrors).some((error) => error !== "")
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-4">
            <div className="text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link to="/signup" className="text-green-600 hover:text-green-700 font-medium underline">
                Create account
              </Link>
            </div>

            <div className="flex justify-center space-x-4 text-xs text-gray-500">
              <Link to="/contact" className="hover:text-gray-700 underline">
                Contact
              </Link>
              <Link to="/help" className="hover:text-gray-700 underline">
                Help
              </Link>
              <Link to="/privacy" className="hover:text-gray-700 underline">
                Privacy
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Additional Trust Signals */}
        <div className="text-center mt-6 text-xs text-gray-500">
          <p>Secure login powered by industry-standard encryption</p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
