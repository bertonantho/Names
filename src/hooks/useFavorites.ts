import { useState, useEffect, useCallback } from 'react';
import { FavoritesService } from '../services/favoritesService';
import { useAuth } from './useAuth';
import { isConfigured } from '../lib/supabase';
import type {
  Favorite,
  Dislike,
  NameFromJson,
  NameWithInteraction,
} from '../lib/supabase';

interface UseFavoritesReturn {
  favorites: Favorite[];
  dislikes: Dislike[];
  loading: boolean;
  error: string | null;

  // Individual operations (now use nameText and nameGender)
  addFavorite: (
    nameText: string,
    nameGender: string,
    collectionName?: string
  ) => Promise<void>;
  removeFavorite: (nameText: string, nameGender: string) => Promise<void>;
  addDislike: (
    nameText: string,
    nameGender: string,
    reason?: string
  ) => Promise<void>;
  removeDislike: (nameText: string, nameGender: string) => Promise<void>;

  // Toggle operations
  toggleFavorite: (
    nameText: string,
    nameGender: string
  ) => Promise<{ action: 'added' | 'removed' }>;
  toggleDislike: (
    nameText: string,
    nameGender: string,
    reason?: string
  ) => Promise<{ action: 'added' | 'removed' }>;

  // Status checks
  isFavorited: (nameText: string, nameGender: string) => boolean;
  isDisliked: (nameText: string, nameGender: string) => boolean;
  getNameInteractionStatus: (
    nameText: string,
    nameGender: string
  ) => {
    isFavorited: boolean;
    isDisliked: boolean;
    favoriteId?: string;
    dislikeId?: string;
  };

  // Utilities
  refreshData: () => Promise<void>;
  getNamesWithInteractionStatus: (
    names: NameFromJson[]
  ) => Promise<NameWithInteraction[]>;
}

export const useFavorites = (): UseFavoritesReturn => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [dislikes, setDislikes] = useState<Dislike[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Load favorites and dislikes data
  const loadData = useCallback(async () => {
    if (!user || !isConfigured) {
      setFavorites([]);
      setDislikes([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [favoritesData, dislikesData] = await Promise.all([
        FavoritesService.getFavorites(),
        FavoritesService.getDislikes(),
      ]);

      setFavorites(favoritesData);
      setDislikes(dislikesData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Error loading favorites/dislikes:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load data when user changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add favorite
  const addFavorite = useCallback(
    async (nameText: string, nameGender: string, collectionName?: string) => {
      if (!isConfigured) {
        throw new Error('Supabase is not configured');
      }

      try {
        setError(null);
        const newFavorite = await FavoritesService.addFavorite(
          nameText,
          nameGender,
          collectionName
        );
        setFavorites((prev) => [newFavorite, ...prev]);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to add favorite';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  // Remove favorite
  const removeFavorite = useCallback(
    async (nameText: string, nameGender: string) => {
      if (!isConfigured) {
        throw new Error('Supabase is not configured');
      }

      try {
        setError(null);
        await FavoritesService.removeFavorite(nameText, nameGender);
        setFavorites((prev) =>
          prev.filter(
            (fav) =>
              !(fav.name_text === nameText && fav.name_gender === nameGender)
          )
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to remove favorite';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  // Add dislike
  const addDislike = useCallback(
    async (nameText: string, nameGender: string, reason?: string) => {
      if (!isConfigured) {
        throw new Error('Supabase is not configured');
      }

      try {
        setError(null);
        const newDislike = await FavoritesService.addDislike(
          nameText,
          nameGender,
          reason
        );
        setDislikes((prev) => [newDislike, ...prev]);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to add dislike';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  // Remove dislike
  const removeDislike = useCallback(
    async (nameText: string, nameGender: string) => {
      if (!isConfigured) {
        throw new Error('Supabase is not configured');
      }

      try {
        setError(null);
        await FavoritesService.removeDislike(nameText, nameGender);
        setDislikes((prev) =>
          prev.filter(
            (dislike) =>
              !(
                dislike.name_text === nameText &&
                dislike.name_gender === nameGender
              )
          )
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to remove dislike';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  // Toggle favorite
  const toggleFavorite = useCallback(
    async (nameText: string, nameGender: string) => {
      if (!isConfigured) {
        throw new Error('Supabase is not configured');
      }

      try {
        setError(null);
        const result = await FavoritesService.toggleFavorite(
          nameText,
          nameGender
        );

        if (result.action === 'added' && result.favorite) {
          setFavorites((prev) => [result.favorite!, ...prev]);
        } else {
          setFavorites((prev) =>
            prev.filter(
              (fav) =>
                !(fav.name_text === nameText && fav.name_gender === nameGender)
            )
          );
        }

        return { action: result.action };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to toggle favorite';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  // Toggle dislike
  const toggleDislike = useCallback(
    async (nameText: string, nameGender: string, reason?: string) => {
      if (!isConfigured) {
        throw new Error('Supabase is not configured');
      }

      try {
        setError(null);
        const result = await FavoritesService.toggleDislike(
          nameText,
          nameGender,
          reason
        );

        if (result.action === 'added' && result.dislike) {
          setDislikes((prev) => [result.dislike!, ...prev]);
        } else {
          setDislikes((prev) =>
            prev.filter(
              (dislike) =>
                !(
                  dislike.name_text === nameText &&
                  dislike.name_gender === nameGender
                )
            )
          );
        }

        return { action: result.action };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to toggle dislike';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  // Check if name is favorited (from local state for performance)
  const isFavorited = useCallback(
    (nameText: string, nameGender: string): boolean => {
      return favorites.some(
        (fav) => fav.name_text === nameText && fav.name_gender === nameGender
      );
    },
    [favorites]
  );

  // Check if name is disliked (from local state for performance)
  const isDisliked = useCallback(
    (nameText: string, nameGender: string): boolean => {
      return dislikes.some(
        (dislike) =>
          dislike.name_text === nameText && dislike.name_gender === nameGender
      );
    },
    [dislikes]
  );

  // Get interaction status for a name
  const getNameInteractionStatus = useCallback(
    (nameText: string, nameGender: string) => {
      const favorite = favorites.find(
        (fav) => fav.name_text === nameText && fav.name_gender === nameGender
      );
      const dislike = dislikes.find(
        (dis) => dis.name_text === nameText && dis.name_gender === nameGender
      );

      return {
        isFavorited: !!favorite,
        isDisliked: !!dislike,
        favoriteId: favorite?.id,
        dislikeId: dislike?.id,
      };
    },
    [favorites, dislikes]
  );

  // Get names with interaction status
  const getNamesWithInteractionStatus = useCallback(
    async (names: NameFromJson[]): Promise<NameWithInteraction[]> => {
      // If Supabase is not configured, return names without interaction status
      if (!isConfigured) {
        return names.map((name) => ({
          ...name,
          is_favorited: false,
          is_disliked: false,
        }));
      }

      // If user is not logged in, use service method
      if (!user) {
        return await FavoritesService.getNamesWithInteractionStatus(names);
      }

      // If we have local data, use it for better performance
      return names.map((name) => {
        const status = getNameInteractionStatus(name.name, name.sex);
        return {
          ...name,
          is_favorited: status.isFavorited,
          is_disliked: status.isDisliked,
          favorite_id: status.favoriteId,
          dislike_id: status.dislikeId,
        };
      });
    },
    [user, getNameInteractionStatus]
  );

  return {
    favorites,
    dislikes,
    loading,
    error,
    addFavorite,
    removeFavorite,
    addDislike,
    removeDislike,
    toggleFavorite,
    toggleDislike,
    isFavorited,
    isDisliked,
    getNameInteractionStatus,
    refreshData: loadData,
    getNamesWithInteractionStatus,
  };
};
