import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  HeartIcon,
  FolderIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Search', href: '/search', icon: MagnifyingGlassIcon },
    { name: 'Favorites', href: '/favorites', icon: HeartIcon },
    { name: 'Collections', href: '/collections', icon: FolderIcon },
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}
      >
        <div
          className="fixed inset-0 bg-black bg-opacity-25"
          onClick={() => setMobileMenuOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-primary">Baby Names</h1>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm font-medium ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white shadow-lg">
          <div className="flex h-16 flex-shrink-0 items-center px-4">
            <h1 className="text-xl font-bold text-primary">
              Baby Names Explorer
            </h1>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto">
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.user_metadata?.full_name || user?.email}
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                Baby Names Explorer
              </h1>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
