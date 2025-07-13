import React from 'react';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">
                Names
              </span>
            </Link>

            {/* Simple Navigation */}
            <nav className="hidden md:flex space-x-8">
              <Link
                to="/"
                className="text-gray-700 hover:text-primary font-medium"
              >
                Home
              </Link>
              <Link
                to="/search"
                className="text-gray-700 hover:text-primary font-medium"
              >
                Search
              </Link>
              <Link
                to="/ai-recommendations"
                className="text-gray-700 hover:text-primary font-medium"
              >
                AI Recommendations
              </Link>
              <Link
                to="/favorites"
                className="text-gray-700 hover:text-primary font-medium"
              >
                Favorites
              </Link>
              <Link
                to="/profile"
                className="text-gray-700 hover:text-primary font-medium"
              >
                Profile
              </Link>
            </nav>
          </div>
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
