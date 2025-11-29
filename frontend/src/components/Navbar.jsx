import { useState } from 'react';
import { Menu, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isAuthPage = ["/login", "/signup"].includes(location.pathname);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <Link to="/" className="font-bold text-xl bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
            SkillLink
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/jobs" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
            Find Work
          </Link>
          <Link to="/workers" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
            Hire Pros
          </Link>
          <Link to="#" className="text-foreground/80 hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link to="#" className="text-foreground/80 hover:text-foreground transition-colors">
            Support
          </Link>
        </div>

        {/* Auth Buttons (Desktop) */}
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
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-border p-4 space-y-4 animate-fade-in-up">
          <Link to="/jobs" className="block text-foreground/80 hover:text-foreground font-medium" onClick={() => setIsOpen(false)}>
            Find Work
          </Link>
          <Link to="/workers" className="block text-foreground/80 hover:text-foreground font-medium" onClick={() => setIsOpen(false)}>
            Hire Pros
          </Link>
          <Link to="#" className="block text-foreground/80 hover:text-foreground" onClick={() => setIsOpen(false)}>
            Pricing
          </Link>
          <Link to="#" className="block text-foreground/80 hover:text-foreground" onClick={() => setIsOpen(false)}>
            Support
          </Link>

          {/* Mobile Auth Buttons */}
          {!isAuthPage && (
            <div className="flex flex-col gap-2 pt-4">
              <Link to="/login" className="w-full" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full">Sign In</Button>
              </Link>
              <Link to="/signup" className="w-full" onClick={() => setIsOpen(false)}>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}