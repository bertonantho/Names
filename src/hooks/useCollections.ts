import { useState, useEffect, useCallback } from 'react';
import { CollectionsService } from '../services/collectionsService';
import { useAuth } from './useAuth';
import { isConfigured } from '../lib/supabase';
import type {
  Collection,
  CollectionWithDetails,
  CollectionInvitation,
  CollectionRole,
} from '../lib/supabase';

interface UseCollectionsReturn {
  collections: Collection[];
  selectedCollection: CollectionWithDetails | null;
  loading: boolean;
  error: string | null;

  // Collection operations
  createCollection: (data: {
    name: string;
    description?: string;
    is_public?: boolean;
  }) => Promise<Collection>;
  updateCollection: (
    id: string,
    updates: { name?: string; description?: string; is_public?: boolean }
  ) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  selectCollection: (id: string) => Promise<void>;

  // Member management
  inviteToCollection: (
    collectionId: string,
    email: string,
    role?: CollectionRole
  ) => Promise<CollectionInvitation>;
  acceptInvitation: (token: string) => Promise<void>;
  removeMember: (collectionId: string, userId: string) => Promise<void>;
  leaveCollection: (collectionId: string) => Promise<void>;

  // Utilities
  refreshCollections: () => Promise<void>;
  refreshSelectedCollection: () => Promise<void>;
  getUserRole: (collectionId: string) => Promise<CollectionRole | null>;
  generateInvitationLink: (token: string) => string;
}

export const useCollections = (): UseCollectionsReturn => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] =
    useState<CollectionWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Load collections
  const loadCollections = useCallback(async () => {
    if (!user || !isConfigured) {
      setCollections([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const collectionsData = await CollectionsService.getCollections();
      setCollections(collectionsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load collections';
      setError(errorMessage);
      console.error('Error loading collections:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load collections when user changes
  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Create collection
  const createCollection = useCallback(
    async (data: {
      name: string;
      description?: string;
      is_public?: boolean;
    }) => {
      if (!isConfigured) {
        throw new Error('Supabase is not configured');
      }

      try {
        setError(null);
        const newCollection = await CollectionsService.createCollection(data);
        setCollections((prev) => [newCollection, ...prev]);
        return newCollection;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create collection';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  // Update collection
  const updateCollection = useCallback(
    async (
      id: string,
      updates: { name?: string; description?: string; is_public?: boolean }
    ) => {
      if (!isConfigured) {
        throw new Error('Supabase is not configured');
      }

      try {
        setError(null);
        const updatedCollection = await CollectionsService.updateCollection(
          id,
          updates
        );

        // Update in collections list
        setCollections((prev) =>
          prev.map((collection) =>
            collection.id === id ? updatedCollection : collection
          )
        );

        // Update selected collection if it's the one being updated
        if (selectedCollection?.id === id) {
          setSelectedCollection((prev) =>
            prev ? { ...prev, ...updatedCollection } : null
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update collection';
        setError(errorMessage);
        throw err;
      }
    },
    [selectedCollection?.id]
  );

  // Delete collection
  const deleteCollection = useCallback(
    async (id: string) => {
      if (!isConfigured) {
        throw new Error('Supabase is not configured');
      }

      try {
        setError(null);
        await CollectionsService.deleteCollection(id);

        // Remove from collections list
        setCollections((prev) =>
          prev.filter((collection) => collection.id !== id)
        );

        // Clear selected collection if it's the one being deleted
        if (selectedCollection?.id === id) {
          setSelectedCollection(null);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete collection';
        setError(errorMessage);
        throw err;
      }
    },
    [selectedCollection?.id]
  );

  // Select collection and load details
  const selectCollection = useCallback(async (id: string) => {
    if (!isConfigured) {
      throw new Error('Supabase is not configured');
    }

    setLoading(true);
    setError(null);

    try {
      const collectionDetails =
        await CollectionsService.getCollectionDetails(id);
      setSelectedCollection(collectionDetails);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to load collection details';
      setError(errorMessage);
      console.error('Error loading collection details:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Invite to collection
  const inviteToCollection = useCallback(
    async (
      collectionId: string,
      email: string,
      role: CollectionRole = 'collaborator'
    ) => {
      if (!isConfigured) {
        throw new Error('Supabase is not configured');
      }

      try {
        setError(null);
        const invitation = await CollectionsService.inviteToCollection({
          collectionId,
          email,
          role,
        });

        // Refresh selected collection to show new invitation
        if (selectedCollection?.id === collectionId) {
          await refreshSelectedCollection();
        }

        return invitation;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send invitation';
        setError(errorMessage);
        throw err;
      }
    },
    [selectedCollection?.id]
  );

  // Accept invitation
  const acceptInvitation = useCallback(
    async (token: string) => {
      if (!isConfigured) {
        throw new Error('Supabase is not configured');
      }

      try {
        setError(null);
        await CollectionsService.acceptInvitation(token);

        // Refresh collections to show new membership
        await loadCollections();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to accept invitation';
        setError(errorMessage);
        throw err;
      }
    },
    [loadCollections]
  );

  // Remove member
  const removeMember = useCallback(
    async (collectionId: string, userId: string) => {
      if (!isConfigured) {
        throw new Error('Supabase is not configured');
      }

      try {
        setError(null);
        await CollectionsService.removeMember(collectionId, userId);

        // Refresh selected collection to update members list
        if (selectedCollection?.id === collectionId) {
          await refreshSelectedCollection();
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to remove member';
        setError(errorMessage);
        throw err;
      }
    },
    [selectedCollection?.id]
  );

  // Leave collection
  const leaveCollection = useCallback(
    async (collectionId: string) => {
      if (!isConfigured) {
        throw new Error('Supabase is not configured');
      }

      try {
        setError(null);
        await CollectionsService.leaveCollection(collectionId);

        // Remove from collections list
        setCollections((prev) =>
          prev.filter((collection) => collection.id !== collectionId)
        );

        // Clear selected collection if user left it
        if (selectedCollection?.id === collectionId) {
          setSelectedCollection(null);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to leave collection';
        setError(errorMessage);
        throw err;
      }
    },
    [selectedCollection?.id]
  );

  // Get user role
  const getUserRole = useCallback(async (collectionId: string) => {
    if (!isConfigured) return null;

    try {
      return await CollectionsService.getUserRole(collectionId);
    } catch (err) {
      console.error('Error getting user role:', err);
      return null;
    }
  }, []);

  // Refresh collections
  const refreshCollections = useCallback(async () => {
    await loadCollections();
  }, [loadCollections]);

  // Refresh selected collection
  const refreshSelectedCollection = useCallback(async () => {
    if (selectedCollection?.id) {
      await selectCollection(selectedCollection.id);
    }
  }, [selectedCollection?.id, selectCollection]);

  // Generate invitation link
  const generateInvitationLink = useCallback((token: string) => {
    return CollectionsService.generateInvitationLink(token);
  }, []);

  return {
    collections,
    selectedCollection,
    loading,
    error,
    createCollection,
    updateCollection,
    deleteCollection,
    selectCollection,
    inviteToCollection,
    acceptInvitation,
    removeMember,
    leaveCollection,
    refreshCollections,
    refreshSelectedCollection,
    getUserRole,
    generateInvitationLink,
  };
};
