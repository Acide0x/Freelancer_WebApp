"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, Mail, Lock, LogIn, Loader2 } from "lucide-react"
import { toast } from "sonner"
import api from "@/api/api"

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      navigate(location.state?.from?.pathname || "/", { replace: true })
    }
  }, [navigate, location])

  const validateField = (name, value) => {
    let error = ""
    switch (name) {
      case "email":
        if (!value.trim()) error = "Email is required"
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Please enter a valid email"
        break
      case "password":
        if (!value) error = "Password is required"
        else if (value.length < 6) error = "Password must be at least 6 characters"
        break
    }
    setFieldErrors((prev) => ({ ...prev, [name]: error }))
    return !error
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    validateField(name, value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const isEmailValid = validateField("email", formData.email)
    const isPasswordValid = validateField("password", formData.password)

    if (!isEmailValid || !isPasswordValid) {
      toast.error("Please fix the form errors")
      return
    }

    setIsLoading(true)

    try {
      const response = await api.post("/users/login", formData)
      const { token, user } = response.data

      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))

      setFormData({ email: "", password: "" })
      setFieldErrors({})

      toast.success(`Welcome back, ${user.name}!`)
      const from = location.state?.from?.pathname || "/"
      navigate(from, { replace: true })
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Login failed. Please try again."
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = (provider) => {
    toast.info(`${provider} login will be available soon!`)
  }

  const handleForgotPassword = () => {
    toast.info("Password reset will be available soon!")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-green-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back to SkillLink</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        <Card className="border border-blue-200/60 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                <LogIn className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
                Sign In
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-gray-300 bg-white hover:bg-blue-50 text-gray-700"
                type="button"
                onClick={() => handleSocialLogin("Google")}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>

              <Button
                variant="outline"
                className="w-full border-gray-300 bg-white hover:bg-blue-50 text-gray-700"
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
                <Separator className="w-full bg-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-800">
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
                    className={`pl-10 pr-3 py-2 border ${
                      fieldErrors.email ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500`}
                    onChange={handleChange}
                    required
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-sm text-red-500">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-800">
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
                    className={`pl-10 pr-10 py-2 border ${
                      fieldErrors.password ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500`}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-sm text-red-500">{fieldErrors.password}</p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  Forgot your password?
                </button>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/50 rounded-lg p-3">
                <p className="text-xs text-blue-800 flex items-center">
                  <Lock className="w-3 h-3 mr-1" />
                  Your login is secure and encrypted. We protect your privacy.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium py-2.5 transition-all duration-200 shadow-md hover:shadow-lg"
                disabled={
                  !formData.email ||
                  !formData.password ||
                  isLoading ||
                  Object.values(fieldErrors).some((err) => err !== "")
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
              <Link to="/signup" className="font-medium bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent hover:opacity-80">
                Create account
              </Link>
            </div>

            <div className="flex justify-center space-x-4 text-xs text-gray-500">
              <Link to="/contact" className="hover:text-blue-600 underline">Contact</Link>
              <Link to="/help" className="hover:text-blue-600 underline">Help</Link>
              <Link to="/privacy" className="hover:text-blue-600 underline">Privacy</Link>
            </div>
          </CardFooter>
        </Card>

        <div className="text-center mt-6 text-xs text-gray-500">
          Secure login powered by industry-standard encryption
        </div>
      </div>
    </div>
  )
}

export default LoginPage