import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  HeartIcon,
  HandThumbDownIcon,
  ArrowRightOnRectangleIcon,
  PencilIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const ProfilePage: React.FC = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { favorites, dislikes, loading: favoritesLoading } = useFavorites();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setSigningOut(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getUserInitials = (email: string, fullName?: string) => {
    if (fullName) {
      return fullName
        .split(' ')
        .map((name) => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  if (authLoading || favoritesLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You need to be signed in to view your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {getUserInitials(
                  user.email || '',
                  user.user_metadata?.full_name
                )}
              </span>
            </div>

            {/* User Info */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user.user_metadata?.full_name || 'User'}
              </h1>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500">
                Member since {formatDate(user.created_at || '')}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <PencilIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              {signingOut ? (
                <LoadingSpinner />
              ) : (
                <>
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  <span>Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Favorites Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Favorites</p>
              <p className="text-2xl font-bold text-red-600">
                {favorites.length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <HeartIcon className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => navigate('/favorites')}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              View all favorites →
            </button>
          </div>
        </div>

        {/* Dislikes Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dislikes</p>
              <p className="text-2xl font-bold text-amber-600">
                {dislikes.length}
              </p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <HandThumbDownIcon className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => navigate('/favorites')}
              className="text-sm text-amber-600 hover:text-amber-800 font-medium"
            >
              Manage dislikes →
            </button>
          </div>
        </div>

        {/* Total Preferences Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Preferences
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {favorites.length + dislikes.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Great start! Keep adding preferences for better recommendations.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>

        {favorites.length === 0 && dislikes.length === 0 ? (
          <div className="text-center py-8">
            <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No activity yet
            </h3>
            <p className="text-gray-600 mb-4">
              Start exploring names to see your activity here.
            </p>
            <button
              onClick={() => navigate('/search')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Names
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Combine and sort recent favorites and dislikes */}
            {[
              ...favorites.map((f) => ({ ...f, type: 'favorite' as const })),
              ...dislikes.map((d) => ({ ...d, type: 'dislike' as const })),
            ]
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )
              .slice(0, 5)
              .map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div
                    className={`p-2 rounded-lg ${
                      item.type === 'favorite'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-amber-100 text-amber-600'
                    }`}
                  >
                    {item.type === 'favorite' ? (
                      <HeartIcon className="w-4 h-4" />
                    ) : (
                      <HandThumbDownIcon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {item.type === 'favorite'
                        ? 'Added to favorites:'
                        : 'Added to dislikes:'}{' '}
                      <span className="font-bold">{item.name_text}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>
              ))}

            {favorites.length + dislikes.length > 5 && (
              <div className="text-center pt-4">
                <button
                  onClick={() => navigate('/favorites')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all activity →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Account Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Account Settings
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Email Address
              </h3>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Change
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Password</h3>
              <p className="text-sm text-gray-600">••••••••</p>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Change
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Delete Account
              </h3>
              <p className="text-sm text-gray-600">
                Permanently delete your account and all data
              </p>
            </div>
            <button className="text-sm text-red-600 hover:text-red-800 font-medium">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
