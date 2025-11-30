"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import api from "@/api/api"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: "customer",
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const navigate = useNavigate()

  const validateField = (name, value, confirmValue) => {
    let error = ""

    switch (name) {
      case "fullName":
        if (!value.trim()) error = "Full name is required"
        else if (value.length < 2) error = "Full name must be at least 2 characters"
        break
      case "email":
        if (!value.trim()) error = "Email is required"
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Please enter a valid email address"
        break
      case "password":
        if (!value) error = "Password is required"
        else if (value.length < 8) error = "Password must be at least 8 characters"
        else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(value))
          error = "Password must contain uppercase, lowercase, number, and special character"
        break
      case "confirmPassword":
        if (!value) error = "Please confirm your password"
        else if (value !== confirmValue) error = "Passwords do not match"
        break
      case "phone":
        if (!value.trim()) error = "Phone number is required"
        else if (!/^\+?[\d\s\-()]{10,}$/.test(value)) error = "Please enter a valid phone number"
        break
    }

    setFieldErrors((prev) => ({ ...prev, [name]: error }))
    return error === ""
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (name === "password" && formData.confirmPassword) {
      validateField("confirmPassword", formData.confirmPassword, value)
    } else if (name === "confirmPassword") {
      validateField(name, value, formData.password)
    } else {
      validateField(name, value)
    }
  }

  const handleRoleChange = (role) => {
    setFormData((prev) => ({ ...prev, role }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!acceptTerms) {
      setError("You must accept the Terms of Service and Privacy Policy to continue")
      return
    }

    const isFullNameValid = validateField("fullName", formData.fullName)
    const isEmailValid = validateField("email", formData.email)
    const isPasswordValid = validateField("password", formData.password)
    const isConfirmPasswordValid = validateField("confirmPassword", formData.confirmPassword, formData.password)
    const isPhoneValid = validateField("phone", formData.phone)

    if (!isFullNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid || !isPhoneValid) {
      setError("Please fix the errors below")
      return
    }

    setIsLoading(true)

    try {
      const { confirmPassword, ...signupData } = formData
      await api.post("/users/signup", signupData)

      setSuccess(true)
      toast.success("Account created successfully! Welcome to SkillLink.")
    } catch (err) {
      const message = err.response?.data?.message || "An error occurred. Please try again."
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = (provider) => {
    toast.info(`${provider} login will be implemented soon!`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-green-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join SkillLink</h1>
          <p className="text-gray-600">Find or offer specialized services</p>
        </div>

        {success ? (
          <Card className="border border-blue-200/60 shadow-xl">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Created Successfully!</h2>
                  <p className="text-gray-600 mb-4">
                    Your account has been created. You can now log in and start using SkillLink.
                  </p>
                  <Button
                    onClick={() => navigate("/login")}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium py-2.5 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Continue to Login
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-blue-200/60 shadow-xl">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
                  Sign Up
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

              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium text-gray-800">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={formData.fullName}
                      className={`pl-10 pr-3 py-2 border ${
                        fieldErrors.fullName ? "border-red-500" : "border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500`}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  {fieldErrors.fullName && (
                    <p className="text-sm text-red-500">{fieldErrors.fullName}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-800">Email Address *</Label>
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
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-sm text-red-500">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Role Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-800">I am a *</Label>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg border transition-colors ${
                        formData.role === "customer"
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                          : "border-gray-300 hover:bg-gray-50 text-gray-700"
                      }`}
                      onClick={() => handleRoleChange("customer")}
                    >
                      <User className="h-4 w-4" />
                      <span>Customer</span>
                    </button>
                    <button
                      type="button"
                      className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg border transition-colors ${
                        formData.role === "provider"
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                          : "border-gray-300 hover:bg-gray-50 text-gray-700"
                      }`}
                      onClick={() => handleRoleChange("provider")}
                    >
                      <Users className="h-4 w-4" />
                      <span>Provider</span>
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-800">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      className={`pl-10 pr-10 py-2 border ${
                        fieldErrors.password ? "border-red-500" : "border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500`}
                      onChange={handleInputChange}
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
                  {fieldErrors.password ? (
                    <p className="text-sm text-red-500">{fieldErrors.password}</p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Must be 8+ chars with uppercase, lowercase, number, and special char
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-800">Confirm Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      className={`pl-10 pr-10 py-2 border ${
                        fieldErrors.confirmPassword ? "border-red-500" : "border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500`}
                      onChange={handleInputChange}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-sm text-red-500">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-800">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      className={`pl-10 pr-3 py-2 border ${
                        fieldErrors.phone ? "border-red-500" : "border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500`}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="text-sm text-red-500">{fieldErrors.phone}</p>
                  )}
                </div>

                {/* Terms */}
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="acceptTerms"
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked)}
                      className="mt-1 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      required
                    />
                    <Label htmlFor="acceptTerms" className="text-sm text-gray-700 cursor-pointer">
                      I agree to the{" "}
                      <Link to="/terms" className="text-blue-600 hover:text-blue-700 underline">Terms of Service</Link>{" "}
                      and{" "}
                      <Link to="/privacy" className="text-blue-600 hover:text-blue-700 underline">Privacy Policy</Link>
                    </Label>
                  </div>
                  {!acceptTerms && error && (
                    <p className="text-sm text-red-500">You must accept the terms to continue</p>
                  )}
                </div>

                {/* Security Note */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/50 rounded-lg p-3">
                  <p className="text-xs text-blue-800 flex items-center">
                    <Lock className="w-3 h-3 mr-1" />
                    Your data is secure with us. We never share your info and use industry-standard encryption.
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium py-2.5 transition-all duration-200 shadow-md hover:shadow-lg"
                  disabled={
                    isLoading ||
                    !acceptTerms ||
                    Object.values(fieldErrors).some((err) => err !== "")
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-4">
              <div className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link to="/login" className="font-medium bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent hover:opacity-80">
                  Sign in here
                </Link>
              </div>

              <div className="text-center">
                <Link to="/forgot-password" className="text-sm text-gray-500 hover:text-blue-600 underline">
                  Forgot your password?
                </Link>
              </div>

              <div className="flex justify-center space-x-4 text-xs text-gray-500">
                <Link to="/contact" className="hover:text-blue-600 underline">Contact</Link>
                <Link to="/help" className="hover:text-blue-600 underline">Help</Link>
                <Link to="/privacy" className="hover:text-blue-600 underline">Privacy</Link>
              </div>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}