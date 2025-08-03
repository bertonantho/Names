import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCollections } from '../hooks/useCollections';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { isConfigured } from '../lib/supabase';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export const InvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { acceptInvitation } = useCollections();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [collectionName, setCollectionName] = useState<string>('');

  useEffect(() => {
    if (user && token) {
      handleAcceptInvitation();
    }
  }, [user, token]);

  const handleAcceptInvitation = async () => {
    if (!token) {
      setError('Invalid invitation link');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await acceptInvitation(token);
      setSuccess(true);
      setCollectionName('the collection'); // We could enhance this to get the actual collection name

      // Redirect to collections page after a delay
      setTimeout(() => {
        navigate('/favorites');
      }, 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to accept invitation';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show setup message if Supabase is not configured
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Setup Required
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Collection invitations require Supabase to be configured.
            </p>
            <Link
              to="/"
              className="mt-4 inline-block font-medium text-primary hover:text-primary-hover"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Sign in to accept invitation
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You need to be signed in to accept a collection invitation.
            </p>
            <div className="mt-6 space-y-3">
              <Link
                to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                Sign In
              </Link>
              <Link
                to={`/signup?redirect=${encodeURIComponent(window.location.pathname)}`}
                className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Invitation Accepted!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You've successfully joined {collectionName}. You can now
              collaborate on baby names together!
            </p>
            <div className="mt-6">
              <Link
                to="/favorites"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Collections
              </Link>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Redirecting automatically in a few seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Invitation Error
            </h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <div className="mt-6 space-y-3">
              <button
                onClick={handleAcceptInvitation}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <Link
                to="/favorites"
                className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                Go to Collections
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Accepting Invitation
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we process your invitation...
          </p>
        </div>
      </div>
    </div>
  );
};
