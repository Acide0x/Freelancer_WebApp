import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Menu,
  X,
  Zap,
  User,
  LogOut,
  Settings,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const userRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = ["/login", "/signup"].includes(location.pathname);

  const getUserFromStorage = () => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        return { ...parsed, _id: parsed.id || parsed._id };
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const refreshUser = () => {
    const currentUser = getUserFromStorage();
    if (JSON.stringify(currentUser) !== JSON.stringify(userRef.current)) {
      userRef.current = currentUser;
      setUser(currentUser);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleStorageChange = (e) => {
      if (e.key === "user") {
        refreshUser();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    const interval = setInterval(refreshUser, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    userRef.current = null;
    setUser(null);
    if (!isAuthPage) {
      navigate("/login", { replace: true });
    }
  };
  console.log("Saved user:", user);

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

        {/* Desktop: Auth or Profile */}
        <div className="hidden md:flex items-center gap-3">
          {!user && !isAuthPage ? (
            <>
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-green-600 hover:bg-green-700 text-white">Get Started</Button>
              </Link>
            </>
          ) : user ? (
            <>
              {/* Notification Bell */}
              <button className="p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Notifications">
                <Bell className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="p-0 h-auto w-auto">
                    <Avatar className="h-9 w-9 border">
                      <AvatarImage
                        src={user.profilePic || "/placeholder.svg"}
                        alt={user.fullName || "User"}
                      />
                      <AvatarFallback>
                        {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1">
                  <div className="px-3 py-2 border-b mb-1">
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
                  </div>

                  {user.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link to="/admindashboard" className="flex items-center text-sm px-3 py-2 rounded-md">
                        <Settings className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem asChild>
                    <Link to="/workersdashboard" className="flex items-center text-sm px-3 py-2 rounded-md">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center text-sm px-3 py-2 rounded-md">
                      <User className="h-4 w-4 mr-2" />
                      View Profile
                    </Link>
                  </DropdownMenuItem>

                  <Separator className="my-1" />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center text-sm px-3 py-2 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}
        </div>

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
        <div className="md:hidden border-t border-border p-4 space-y-4">
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

          {!isAuthPage && (
            <div className="flex flex-col gap-2 pt-4">
              {user ? (
                <>
                  <div className="flex items-center gap-3 p-2">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage
                        src={user.profilePic || "/placeholder.svg"}
                        alt={user.fullName || "User"}
                      />
                      <AvatarFallback>
                        {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                    </div>
                  </div>

                  {/* 👇 MOBILE DASHBOARD LINK */}
                  <Link to="/workersdashboard" className="w-full" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full justify-start">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    className="w-full text-red-500"
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="w-full" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full">Sign In</Button>
                  </Link>
                  <Link to="/signup" className="w-full" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}