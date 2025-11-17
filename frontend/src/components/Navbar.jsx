import { useState } from 'react'
import { Menu, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation(); // Get current location to conditionally show buttons

  // Check if the current page is login or signup to hide auth buttons
  const isAuthPage = ["/login", "/signup"].includes(location.pathname);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <Link to="/" className="font-bold text-xl bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
            SkillLink
          </Link>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="#" className="text-foreground/80 hover:text-foreground transition-colors">Product</Link>
          <Link to="#" className="text-foreground/80 hover:text-foreground transition-colors">For Professionals</Link>
          <Link to="#" className="text-foreground/80 hover:text-foreground transition-colors">For Clients</Link>
          <Link to="#" className="text-foreground/80 hover:text-foreground transition-colors">Pricing</Link>
        </div>

        {/* Auth Buttons - Only show if not on auth pages */}
        {!isAuthPage && (
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-green-600 hover:bg-green-700 text-white">Get Started</Button>
            </Link>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-border p-4 space-y-4 animate-fade-in-up">
          <Link to="#" className="block text-foreground/80 hover:text-foreground">Product</Link>
          <Link to="#" className="block text-foreground/80 hover:text-foreground">For Professionals</Link>
          <Link to="#" className="block text-foreground/80 hover:text-foreground">For Clients</Link>
          <Link to="#" className="block text-foreground/80 hover:text-foreground">Pricing</Link>
          {/* Mobile Auth Buttons - Only show if not on auth pages */}
          {!isAuthPage && (
            <div className="flex gap-2 pt-4">
              <Link to="/login" className="flex-1">
                <Button variant="ghost" className="w-full">Sign In</Button>
              </Link>
              <Link to="/signup" className="flex-1">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}