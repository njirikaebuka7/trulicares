import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import GetStartedModal from '@/components/ui/GetStartedModal';
import logoImg from '@/assets/logo.png';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/caregivers', label: 'Caregivers' },
  { to: '/resources', label: 'Resources' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showGetStarted, setShowGetStarted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const visibleNavLinks = navLinks.filter(link => link.to !== '/caregivers' || user?.role === 'family');

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[72px]">
            {/* Logo */}
            <Link to="/" className="flex items-center shrink-0" onClick={() => setMobileOpen(false)}>
              <img src={logoImg} alt="TruliCares" className="h-9 w-auto" />
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-1">
              {visibleNavLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                    location.pathname === link.to
                      ? 'text-brand-700 bg-brand-50'
                      : 'text-gray-600 hover:text-brand-700 hover:bg-gray-50'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop actions */}
            <div className="hidden lg:flex items-center gap-3">
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-brand-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user?.name}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-fade-in-up">
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4" /> Dashboard
                      </Link>
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                    Login
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setShowGetStarted(true)}>
                    Get Started
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 animate-fade-in-up">
            <div className="px-4 py-4 space-y-1">
              {visibleNavLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'block px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                    location.pathname === link.to
                      ? 'text-brand-700 bg-brand-50'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-gray-100 space-y-2">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 rounded-xl text-sm font-medium text-brand-700 bg-brand-50"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" fullWidth onClick={() => { navigate('/login'); setMobileOpen(false); }}>
                      Login
                    </Button>
                    <Button variant="primary" fullWidth onClick={() => { setShowGetStarted(true); setMobileOpen(false); }}>
                      Get Started
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      <GetStartedModal open={showGetStarted} onClose={() => setShowGetStarted(false)} />
    </>
  );
}
