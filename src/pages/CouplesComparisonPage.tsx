import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HeartIcon,
  HandThumbDownIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  UserGroupIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartIconSolid,
  HandThumbDownIcon as HandThumbDownIconSolid,
  SparklesIcon,
} from '@heroicons/react/24/solid';
import {
  CouplesService,
  CoupleComparisonData,
} from '../services/couplesService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { isConfigured } from '../lib/supabase';

export const CouplesComparisonPage: React.FC = () => {
  const { user } = useAuth();
  const [leftPartnerEmail, setLeftPartnerEmail] = useState('');
  const [rightPartnerEmail, setRightPartnerEmail] = useState('');
  const [comparisonData, setComparisonData] =
    useState<CoupleComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatingEmails, setValidatingEmails] = useState(false);

  const handleCompareCouple = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leftPartnerEmail.trim() || !rightPartnerEmail.trim()) {
      setError('Please enter both partner emails');
      return;
    }

    if (leftPartnerEmail.trim() === rightPartnerEmail.trim()) {
      setError('Please enter different email addresses for each partner');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate both emails exist
      setValidatingEmails(true);
      const [leftValid, rightValid] = await Promise.all([
        CouplesService.validatePartnerEmail(leftPartnerEmail.trim()),
        CouplesService.validatePartnerEmail(rightPartnerEmail.trim()),
      ]);
      setValidatingEmails(false);

      if (!leftValid) {
        throw new Error(`No account found for ${leftPartnerEmail}`);
      }
      if (!rightValid) {
        throw new Error(`No account found for ${rightPartnerEmail}`);
      }

      // Get comparison data
      const data = await CouplesService.compareCouplePreferences(
        leftPartnerEmail.trim(),
        rightPartnerEmail.trim()
      );

      setComparisonData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to compare preferences');
      setComparisonData(null);
    } finally {
      setLoading(false);
      setValidatingEmails(false);
    }
  };

  const resetComparison = () => {
    setComparisonData(null);
    setError(null);
    setLeftPartnerEmail('');
    setRightPartnerEmail('');
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
              <h2 className="text-lg font-semibold text-amber-800">
                Feature Not Available
              </h2>
            </div>
            <p className="text-amber-700 mb-4">
              The couples comparison feature requires a Supabase database to
              store and compare user preferences. This feature is not available
              in the current configuration.
            </p>
            <Link
              to="/favorites"
              className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-800 font-medium"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Favorites
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-blue-800">
                Sign In Required
              </h2>
            </div>
            <p className="text-blue-700 mb-4">
              Please sign in to compare name preferences with your partner.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/favorites"
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <UserGroupIcon className="h-8 w-8 text-purple-600" />
              Couples Name Comparison
            </h1>
            <p className="text-gray-600 mt-2">
              Compare name preferences between two partners to find mutual
              favorites and potential conflicts
            </p>
          </div>
        </div>

        {!comparisonData ? (
          /* Search Form */
          <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl mx-auto">
            <form onSubmit={handleCompareCouple} className="space-y-6">
              <div className="text-center mb-6">
                <SparklesIcon className="h-12 w-12 text-purple-500 mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Find Your Perfect Names Together
                </h2>
                <p className="text-gray-600 text-sm mt-2">
                  Enter both partners' email addresses to compare name
                  preferences
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Left Partner Email
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={leftPartnerEmail}
                      onChange={(e) => setLeftPartnerEmail(e.target.value)}
                      placeholder="partner1@example.com"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Right Partner Email
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={rightPartnerEmail}
                      onChange={(e) => setRightPartnerEmail(e.target.value)}
                      placeholder="partner2@example.com"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    <p className="text-red-700 text-sm font-medium">Error</p>
                  </div>
                  <p className="text-red-700 text-sm">{error}</p>
                  {error.includes('database permissions') && (
                    <div className="mt-3 p-3 bg-red-100 rounded-lg">
                      <p className="text-red-800 text-xs">
                        <strong>Database Setup Required:</strong> To use the
                        couples comparison feature, run the SQL script in{' '}
                        <code>database/add_couples_policy.sql</code> in your
                        Supabase SQL editor.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || validatingEmails}
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading || validatingEmails ? (
                  <>
                    <LoadingSpinner />
                    {validatingEmails
                      ? 'Validating emails...'
                      : 'Comparing preferences...'}
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-5 w-5" />
                    Compare Preferences
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Comparison Results */
          <div className="space-y-8">
            {/* Results Header */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Comparison Results
                  </h2>
                  <p className="text-gray-600">
                    {comparisonData.leftPartnerEmail} vs{' '}
                    {comparisonData.rightPartnerEmail}
                  </p>
                </div>
                <button
                  onClick={resetComparison}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  New Comparison
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-6 rounded-lg">
                <div className="flex items-center gap-3">
                  <HeartIconSolid className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-green-700">
                      {comparisonData.mutualLikes.length}
                    </div>
                    <div className="text-sm text-green-600">Mutual Likes</div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="flex items-center gap-3">
                  <HeartIcon className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold text-blue-700">
                      {comparisonData.leftOnlyLikes.length}
                    </div>
                    <div className="text-sm text-blue-600">Left Only</div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-6 rounded-lg">
                <div className="flex items-center gap-3">
                  <HeartIcon className="h-8 w-8 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold text-purple-700">
                      {comparisonData.rightOnlyLikes.length}
                    </div>
                    <div className="text-sm text-purple-600">Right Only</div>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-6 rounded-lg">
                <div className="flex items-center gap-3">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold text-red-700">
                      {comparisonData.conflictingNames.length}
                    </div>
                    <div className="text-sm text-red-600">Conflicts</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mutual Likes */}
            {comparisonData.mutualLikes.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <HeartIconSolid className="h-6 w-6 text-green-600" />
                  Mutual Favorites ({comparisonData.mutualLikes.length})
                </h3>
                <p className="text-gray-600 mb-4">
                  Names that both partners love!
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {comparisonData.mutualLikes.map((match) => (
                    <Link
                      key={`${match.name_text}-${match.name_gender}`}
                      to={`/name/${match.name_text}`}
                      className="flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                            match.name_gender === 'M'
                              ? 'bg-blue-500'
                              : 'bg-pink-500'
                          }`}
                        >
                          {match.name_text.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900 group-hover:text-green-700 transition-colors">
                          {match.name_text}
                        </span>
                      </div>
                      <HeartIconSolid className="h-5 w-5 text-green-600" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Conflicting Names */}
            {comparisonData.conflictingNames.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  Conflicting Preferences (
                  {comparisonData.conflictingNames.length})
                </h3>
                <p className="text-gray-600 mb-4">
                  Names where one partner likes and the other dislikes
                </p>
                <div className="space-y-3">
                  {comparisonData.conflictingNames.map((conflict) => (
                    <div
                      key={`${conflict.name_text}-${conflict.name_gender}`}
                      className="flex items-center justify-between p-4 bg-red-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                            conflict.name_gender === 'M'
                              ? 'bg-blue-500'
                              : 'bg-pink-500'
                          }`}
                        >
                          {conflict.name_text.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">
                          {conflict.name_text}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {conflict.conflict === 'left_likes_right_dislikes' ? (
                            <HeartIconSolid className="h-5 w-5 text-green-600" />
                          ) : (
                            <HandThumbDownIconSolid className="h-5 w-5 text-red-600" />
                          )}
                          <span className="text-sm text-gray-600">Left</span>
                        </div>
                        <div className="text-gray-400">vs</div>
                        <div className="flex items-center gap-2">
                          {conflict.conflict === 'left_dislikes_right_likes' ? (
                            <HeartIconSolid className="h-5 w-5 text-green-600" />
                          ) : (
                            <HandThumbDownIconSolid className="h-5 w-5 text-red-600" />
                          )}
                          <span className="text-sm text-gray-600">Right</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Preferences */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Partner Only */}
              {comparisonData.leftOnlyLikes.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {comparisonData.leftPartnerEmail} Only (
                    {comparisonData.leftOnlyLikes.length})
                  </h3>
                  <div className="space-y-2">
                    {comparisonData.leftOnlyLikes
                      .slice(0, 10)
                      .map((favorite) => (
                        <Link
                          key={`${favorite.name_text}-${favorite.name_gender}`}
                          to={`/name/${favorite.name_text}`}
                          className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                              favorite.name_gender === 'M'
                                ? 'bg-blue-500'
                                : 'bg-pink-500'
                            }`}
                          >
                            {favorite.name_text.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                            {favorite.name_text}
                          </span>
                        </Link>
                      ))}
                    {comparisonData.leftOnlyLikes.length > 10 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        And {comparisonData.leftOnlyLikes.length - 10} more...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Right Partner Only */}
              {comparisonData.rightOnlyLikes.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {comparisonData.rightPartnerEmail} Only (
                    {comparisonData.rightOnlyLikes.length})
                  </h3>
                  <div className="space-y-2">
                    {comparisonData.rightOnlyLikes
                      .slice(0, 10)
                      .map((favorite) => (
                        <Link
                          key={`${favorite.name_text}-${favorite.name_gender}`}
                          to={`/name/${favorite.name_text}`}
                          className="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                              favorite.name_gender === 'M'
                                ? 'bg-blue-500'
                                : 'bg-pink-500'
                            }`}
                          >
                            {favorite.name_text.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900 group-hover:text-purple-700 transition-colors">
                            {favorite.name_text}
                          </span>
                        </Link>
                      ))}
                    {comparisonData.rightOnlyLikes.length > 10 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        And {comparisonData.rightOnlyLikes.length - 10} more...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Empty State */}
            {comparisonData.mutualLikes.length === 0 &&
              comparisonData.leftOnlyLikes.length === 0 &&
              comparisonData.rightOnlyLikes.length === 0 &&
              comparisonData.conflictingNames.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Preferences Found
                  </h3>
                  <p className="text-gray-600">
                    It looks like one or both partners haven't started liking
                    names yet. Try exploring some names first!
                  </p>
                  <Link
                    to="/search"
                    className="inline-flex items-center gap-2 mt-4 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <MagnifyingGlassIcon className="h-5 w-5" />
                    Explore Names
                  </Link>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};
