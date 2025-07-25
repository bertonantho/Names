import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
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
            <nav className="hidden md:flex space-x-8">
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
