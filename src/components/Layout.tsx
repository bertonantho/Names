import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    closeMobileMenu();
  };

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('mobile-menu-open');
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Burger Menu */}
      <header className="bg-white shadow-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center"
              onClick={closeMobileMenu}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">
                Names
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                to="/"
                className="text-gray-700 hover:text-primary font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                to="/search"
                className="text-gray-700 hover:text-primary font-medium transition-colors"
              >
                Search
              </Link>
              <Link
                to="/ai-recommendations"
                className="text-gray-700 hover:text-primary font-medium transition-colors"
              >
                AI Recommendations
              </Link>

              {/* Authenticated Links */}
              {user && (
                <>
                  <Link
                    to="/favorites"
                    className="text-gray-700 hover:text-primary font-medium transition-colors"
                  >
                    Favorites
                  </Link>
                  <Link
                    to="/profile"
                    className="text-gray-700 hover:text-primary font-medium transition-colors"
                  >
                    Profile
                  </Link>
                </>
              )}

              {/* Auth Buttons */}
              <div className="flex items-center space-x-4">
                {!loading && (
                  <>
                    {user ? (
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <UserIcon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">
                            {user.user_metadata?.full_name || user.email}
                          </span>
                        </div>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <ArrowRightOnRectangleIcon className="w-4 h-4" />
                          <span className="text-sm">Sign Out</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <Link
                          to="/login"
                          className="text-gray-700 hover:text-primary font-medium transition-colors"
                        >
                          Login
                        </Link>
                        <Link
                          to="/signup"
                          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
                        >
                          Sign Up
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            </nav>

            {/* Mobile Burger Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={closeMobileMenu}
          />
        )}

        {/* Mobile Menu */}
        <div
          className={`absolute top-full left-0 right-0 bg-white shadow-lg transform transition-all duration-300 ease-in-out z-50 md:hidden ${
            isMobileMenuOpen
              ? 'translate-y-0 opacity-100'
              : '-translate-y-full opacity-0 pointer-events-none'
          }`}
        >
          <nav className="px-4 py-6 space-y-4">
            <Link
              to="/"
              className="block py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-primary font-medium transition-colors"
              onClick={closeMobileMenu}
            >
              🏠 Home
            </Link>
            <Link
              to="/search"
              className="block py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-primary font-medium transition-colors"
              onClick={closeMobileMenu}
            >
              🔍 Search
            </Link>
            <Link
              to="/ai-recommendations"
              className="block py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-primary font-medium transition-colors"
              onClick={closeMobileMenu}
            >
              🤖 AI Recommendations
            </Link>

            {/* Authenticated Mobile Links */}
            {user && (
              <>
                <Link
                  to="/favorites"
                  className="block py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-primary font-medium transition-colors"
                  onClick={closeMobileMenu}
                >
                  ❤️ Favorites
                </Link>
                <Link
                  to="/profile"
                  className="block py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-primary font-medium transition-colors"
                  onClick={closeMobileMenu}
                >
                  👤 Profile
                </Link>
              </>
            )}

            {/* Mobile Auth Section */}
            {!loading && (
              <div className="border-t border-gray-200 pt-4">
                {user ? (
                  <div className="space-y-3">
                    <div className="px-4 py-2 text-sm text-gray-600">
                      Signed in as {user.user_metadata?.full_name || user.email}
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center space-x-2 w-full py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Link
                      to="/login"
                      className="block py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-primary font-medium transition-colors"
                      onClick={closeMobileMenu}
                    >
                      🔑 Login
                    </Link>
                    <Link
                      to="/signup"
                      className="block py-3 px-4 rounded-lg bg-primary text-white hover:bg-primary-600 font-medium transition-colors text-center"
                      onClick={closeMobileMenu}
                    >
                      ✨ Sign Up
                    </Link>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Simple Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>
              &copy; 2024 Baby Names Explorer. Discover the perfect name for
              your little one.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
