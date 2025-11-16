import { useState, useContext } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { ShoppingCart, Search, Menu, User, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AppContext } from "../context/AppContext"

export function Navbar() {
  const { getTotalItems, searchQuery, setSearchQuery } = useContext(AppContext)
  const totalItems = getTotalItems()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Check if we're on auth pages (signup/login)
  const isAuthPage = location.pathname === "/signup" || location.pathname === "/login"

  // Check if user is logged in (you can modify this based on your auth logic)
  const isLoggedIn = localStorage.getItem("token") && localStorage.getItem("user")
  const userData = isLoggedIn ? JSON.parse(localStorage.getItem("user")) : null

  const handleLinkClick = (path) => {
    setIsMenuOpen(false)
    navigate(path)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    navigate("/")
    window.location.reload() // Refresh to update the navbar state
  }

  // Minimal navbar for auth pages
  if (isAuthPage) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-center px-4">
          {/* Logo - Centered */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FM</span>
            </div>
            <span className="font-bold text-xl">FreshMart</span>
          </Link>
        </div>
      </header>
    )
  }

  // Full navbar for other pages
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Mobile Menu Toggle */}
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 rounded-md">
          <Menu size={20} />
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">FM</span>
          </div>
          <span className="font-bold text-xl">FreshMart</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-sm font-medium hover:text-green-600 transition-colors">
            Home
          </Link>
          <Link to="/categories" className="text-sm font-medium hover:text-green-600 transition-colors">
            Categories
          </Link>
          <Link to="/cart" className="text-sm font-medium hover:text-green-600 transition-colors">
            Cart
          </Link>
        </nav>

        {/* Right Side - Search, Cart, and Auth */}
        <div className="flex items-center space-x-4">
          {/* Search Bar (visible on medium screens and up) */}
          <div className="hidden sm:flex items-center relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64 focus:border-green-500 focus:ring-green-500"
            />
          </div>

          {/* Cart Icon */}
          <Link to="/cart">
            <Button variant="outline" size="icon" className="relative hover:border-green-500 bg-transparent">
              <ShoppingCart size={18} />
              {totalItems > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full flex items-center justify-center text-xs bg-green-600">
                  {totalItems}
                </Badge>
              )}
            </Button>
          </Link>

          {/* Auth Section */}
          {isLoggedIn ? (
            <div className="flex items-center space-x-2">
              {/* User Profile Button */}
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center space-x-2 hover:border-green-500 bg-transparent"
                onClick={() => navigate("/profile")}
              >
                <User size={16} />
                <span className="hidden md:inline">{userData?.fullName || userData?.username || "Profile"}</span>
              </Button>

              {/* Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              {/* Login Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
                className="hover:text-green-600 hover:bg-green-50"
              >
                <LogIn size={16} className="mr-1" />
                Login
              </Button>

              {/* Sign Up Button */}
              <Button
                size="sm"
                onClick={() => navigate("/signup")}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMenuOpen && (
        <div className="md:hidden bg-white shadow-lg p-4 space-y-4 border-t">
          {/* Mobile Search */}
          <div className="sm:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-full focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Mobile Navigation Links */}
          <Link
            to="/"
            onClick={() => handleLinkClick("/")}
            className="block py-2 text-lg hover:text-green-600 transition-colors"
          >
            Home
          </Link>
          <Link
            to="/categories"
            onClick={() => handleLinkClick("/categories")}
            className="block py-2 text-lg hover:text-green-600 transition-colors"
          >
            Categories
          </Link>
          <Link
            to="/cart"
            onClick={() => handleLinkClick("/cart")}
            className="block py-2 text-lg hover:text-green-600 transition-colors"
          >
            Cart
          </Link>

          {/* Mobile Auth Section */}
          <div className="pt-4 border-t space-y-2">
            {isLoggedIn ? (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start hover:border-green-500 bg-transparent"
                  onClick={() => handleLinkClick("/profile")}
                >
                  <User size={16} className="mr-2" />
                  {userData?.fullName || userData?.username || "Profile"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:text-green-600 hover:bg-green-50"
                  onClick={() => handleLinkClick("/login")}
                >
                  <LogIn size={16} className="mr-2" />
                  Login
                </Button>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleLinkClick("/signup")}
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
