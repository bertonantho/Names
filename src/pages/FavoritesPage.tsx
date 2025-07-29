import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HeartIcon,
  HandThumbDownIcon,
  TrashIcon,
  PlusIcon,
  UserPlusIcon,
  UsersIcon,
  FolderIcon,
  ShareIcon,
  PencilIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartIconSolid,
  HandThumbDownIcon as HandThumbDownIconSolid,
  FolderIcon as FolderIconSolid,
} from '@heroicons/react/24/solid';
import { useFavorites } from '../hooks/useFavorites';
import { useCollections } from '../hooks/useCollections';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { isConfigured } from '../lib/supabase';
import type {
  Favorite,
  Dislike,
  Collection,
  CollectionWithDetails,
} from '../lib/supabase';

type ViewMode = 'collections' | 'personal-favorites' | 'dislikes';

export const FavoritesPage: React.FC = () => {
  const { user } = useAuth();
  const {
    favorites,
    dislikes,
    loading: favoritesLoading,
    error: favoritesError,
    removeFavorite,
    removeDislike,
    refreshData,
  } = useFavorites();

  const {
    collections,
    selectedCollection,
    loading: collectionsLoading,
    error: collectionsError,
    createCollection,
    selectCollection,
    inviteToCollection,
    refreshCollections,
  } = useCollections();

  const [viewMode, setViewMode] = useState<ViewMode>('collections');
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const handleRemoveFavorite = async (nameText: string, nameGender: string) => {
    const itemId = `${nameText}-${nameGender}`;
    setDeletingItem(itemId);
    try {
      await removeFavorite(nameText, nameGender);
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    } finally {
      setDeletingItem(null);
    }
  };

  const handleRemoveDislike = async (nameText: string, nameGender: string) => {
    const itemId = `${nameText}-${nameGender}`;
    setDeletingItem(itemId);
    try {
      await removeDislike(nameText, nameGender);
    } catch (error) {
      console.error('Failed to remove dislike:', error);
    } finally {
      setDeletingItem(null);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    try {
      await createCollection({
        name: newCollectionName.trim(),
        description: newCollectionDescription.trim() || undefined,
        is_public: false,
      });
      setNewCollectionName('');
      setNewCollectionDescription('');
      setShowCreateCollection(false);
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  const handleInviteToCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollection || !inviteEmail.trim()) return;

    try {
      await inviteToCollection(
        selectedCollection.id,
        inviteEmail.trim(),
        'collaborator'
      );
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (error) {
      console.error('Failed to send invitation:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'owner':
        return '👑 Owner';
      case 'collaborator':
        return '🤝 Collaborator';
      case 'viewer':
        return '👁️ Viewer';
      default:
        return role;
    }
  };

  // Show message if Supabase is not configured
  if (!isConfigured) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Collections & Favorites
          </h1>
          <p className="text-gray-600">
            Organize your names into collections and collaborate with your
            partner.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🔧 Setup Required
          </h2>
          <p className="text-gray-700 mb-4">
            The collections and favorites functionality requires Supabase to be
            configured. Once you set up Supabase, you'll be able to create
            collections and collaborate with others.
          </p>
          <p className="text-sm text-gray-600">
            Please configure your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
            environment variables.
          </p>
        </div>
      </div>
    );
  }

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Collections & Favorites
          </h1>
          <p className="text-gray-600">
            Organize your names into collections and collaborate with your
            partner.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <FolderIcon className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Sign in to create collections
          </h2>
          <p className="text-gray-600 mb-6">
            Create an account or sign in to start organizing your favorite names
            into collections and share them with others.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/login"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const loading = favoritesLoading || collectionsLoading;
  const error = favoritesError || collectionsError;

  if (loading && collections.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Collections & Favorites
        </h1>
        <p className="text-gray-600">
          Organize your names into collections and collaborate with others.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => {
              refreshData();
              refreshCollections();
            }}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('collections')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              viewMode === 'collections'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderIcon className="w-4 h-4" />
              Collections ({collections.length})
            </div>
          </button>
          <button
            onClick={() => setViewMode('personal-favorites')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              viewMode === 'personal-favorites'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <HeartIcon className="w-4 h-4" />
              Personal Favorites ({favorites.length})
            </div>
          </button>
          <button
            onClick={() => setViewMode('dislikes')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              viewMode === 'dislikes'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <HandThumbDownIcon className="w-4 h-4" />
              Dislikes ({dislikes.length})
            </div>
          </button>
        </div>
      </div>

      {/* Collections View */}
      {viewMode === 'collections' && (
        <div className="space-y-6">
          {/* Collections Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Collections
            </h2>
            <button
              onClick={() => setShowCreateCollection(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              New Collection
            </button>
          </div>

          {/* Collections Grid */}
          {collections.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <FolderIconSolid className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No collections yet
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first collection to organize your favorite names and
                share them with others.
              </p>
              <button
                onClick={() => setShowCreateCollection(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Collection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => selectCollection(collection.id)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FolderIconSolid className="w-8 h-8 text-blue-500" />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {collection.name}
                        </h3>
                        {collection.description && (
                          <p className="text-sm text-gray-600">
                            {collection.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <UsersIcon className="w-4 h-4" />
                        {collection.member_count || 0} members
                      </span>
                      <span className="flex items-center gap-1">
                        <HeartIcon className="w-4 h-4" />
                        {collection.favorite_count || 0} names
                      </span>
                    </div>
                    {collection.is_public && <ShareIcon className="w-4 h-4" />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Collection Details */}
          {selectedCollection && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedCollection.name}
                  </h3>
                  {selectedCollection.description && (
                    <p className="text-gray-600 mt-1">
                      {selectedCollection.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedCollection.user_role === 'owner' && (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <UserPlusIcon className="w-4 h-4" />
                      Invite
                    </button>
                  )}
                </div>
              </div>

              {/* Members */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">
                  Members ({selectedCollection.members.length})
                </h4>
                <div className="space-y-2">
                  {selectedCollection.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {member.user?.full_name?.charAt(0) ||
                              member.user?.email?.charAt(0) ||
                              '?'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {member.user?.full_name || member.user?.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getRoleDisplay(member.role)}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Joined{' '}
                        {formatDate(member.joined_at || member.invited_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Favorites in Collection */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Names ({selectedCollection.favorites.length})
                </h4>
                {selectedCollection.favorites.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <HeartIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No names in this collection yet.</p>
                    <p className="text-sm">
                      Add names from the search or browse pages.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCollection.favorites.map((favorite) => (
                      <div
                        key={favorite.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <HeartIconSolid className="w-5 h-5 text-red-500" />
                          <div>
                            <Link
                              to={`/name/${favorite.name_text}`}
                              className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              {favorite.name_text}
                            </Link>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>
                                {favorite.name_gender === 'M' ? 'Boy' : 'Girl'}
                              </span>
                              {favorite.added_by_user && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Added by{' '}
                                    {favorite.added_by_user.full_name ||
                                      favorite.added_by_user.email}
                                  </span>
                                </>
                              )}
                            </div>
                            {favorite.notes && (
                              <p className="text-sm text-gray-600 mt-1 italic">
                                "{favorite.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(favorite.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Personal Favorites Tab */}
      {viewMode === 'personal-favorites' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {favorites.length === 0 ? (
            <div className="p-8 text-center">
              <HeartIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No personal favorites yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start adding names to your personal favorites to see them here.
              </p>
              <Link
                to="/search"
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Browse Names
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {favorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <HeartIconSolid className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <Link
                          to={`/name/${favorite.name_text}`}
                          className="text-lg font-medium text-gray-900 hover:text-red-600 transition-colors"
                        >
                          {favorite.name_text}
                        </Link>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="capitalize">
                            {favorite.name_gender === 'M' ? 'Boy' : 'Girl'}
                          </span>
                          <span>•</span>
                          <span>Added {formatDate(favorite.created_at)}</span>
                          {favorite.collection && (
                            <>
                              <span>•</span>
                              <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800">
                                {favorite.collection.name}
                              </span>
                            </>
                          )}
                        </div>
                        {favorite.notes && (
                          <p className="text-sm text-gray-600 mt-1 italic">
                            "{favorite.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleRemoveFavorite(
                          favorite.name_text,
                          favorite.name_gender
                        )
                      }
                      disabled={
                        deletingItem ===
                        `${favorite.name_text}-${favorite.name_gender}`
                      }
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove from favorites"
                    >
                      {deletingItem ===
                      `${favorite.name_text}-${favorite.name_gender}` ? (
                        <LoadingSpinner />
                      ) : (
                        <TrashIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dislikes Tab (unchanged) */}
      {viewMode === 'dislikes' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {dislikes.length === 0 ? (
            <div className="p-8 text-center">
              <HandThumbDownIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No dislikes yet
              </h3>
              <p className="text-gray-600 mb-4">
                Mark names you don't like to improve your recommendations.
              </p>
              <Link
                to="/search"
                className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Browse Names
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {dislikes.map((dislike) => (
                <div
                  key={dislike.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <HandThumbDownIconSolid className="w-6 h-6 text-amber-500" />
                      </div>
                      <div>
                        <div className="text-lg font-medium text-gray-900">
                          {dislike.name_text}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="capitalize">
                            {dislike.name_gender === 'M' ? 'Boy' : 'Girl'}
                          </span>
                          <span>•</span>
                          <span>Added {formatDate(dislike.created_at)}</span>
                        </div>
                        {dislike.reason && (
                          <p className="text-sm text-gray-600 mt-1 italic">
                            "{dislike.reason}"
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleRemoveDislike(
                          dislike.name_text,
                          dislike.name_gender
                        )
                      }
                      disabled={
                        deletingItem ===
                        `${dislike.name_text}-${dislike.name_gender}`
                      }
                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Remove from dislikes"
                    >
                      {deletingItem ===
                      `${dislike.name_text}-${dislike.name_gender}` ? (
                        <LoadingSpinner />
                      ) : (
                        <TrashIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Collection Modal */}
      {showCreateCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Collection
            </h3>
            <form onSubmit={handleCreateCollection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Baby Names 2024"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your collection..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateCollection(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && selectedCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Invite to "{selectedCollection.name}"
            </h3>
            <form onSubmit={handleInviteToCollection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="partner@example.com"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {(collections.length > 0 ||
        favorites.length > 0 ||
        dislikes.length > 0) && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Your Activity Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {collections.length}
              </div>
              <div className="text-sm text-gray-600">Collections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {favorites.length}
              </div>
              <div className="text-sm text-gray-600">Personal Favorites</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {dislikes.length}
              </div>
              <div className="text-sm text-gray-600">Dislikes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {collections.reduce(
                  (sum, collection) => sum + (collection.member_count || 0),
                  0
                )}
              </div>
              <div className="text-sm text-gray-600">Total Collaborators</div>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4 text-center">
            Create collections to organize names and collaborate with your
            partner! 👶💕
          </p>
        </div>
      )}
    </div>
  );
};
