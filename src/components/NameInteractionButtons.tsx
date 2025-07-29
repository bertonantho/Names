import React, { useState } from 'react';
import { HeartIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartIconSolid,
  HandThumbDownIcon as HandThumbDownIconSolid,
} from '@heroicons/react/24/solid';
import { useFavorites } from '../hooks/useFavorites';
import { useAuth } from '../hooks/useAuth';
import { isConfigured } from '../lib/supabase';

interface NameInteractionButtonsProps {
  nameText: string; // The actual name string (e.g., "Emma")
  nameGender: string; // 'M' or 'F'
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  className?: string;
  onAuthRequired?: () => void;
}

export const NameInteractionButtons: React.FC<NameInteractionButtonsProps> = ({
  nameText,
  nameGender,
  size = 'medium',
  showLabels = false,
  className = '',
  onAuthRequired,
}) => {
  const { user } = useAuth();
  const {
    toggleFavorite,
    toggleDislike,
    isFavorited,
    isDisliked,
    loading: favoritesLoading,
  } = useFavorites();

  const [actionLoading, setActionLoading] = useState<
    'favorite' | 'dislike' | null
  >(null);

  // If Supabase is not configured, don't show the buttons
  if (!isConfigured) {
    return null;
  }

  const isCurrentlyFavorited = isFavorited(nameText, nameGender);
  const isCurrentlyDisliked = isDisliked(nameText, nameGender);

  // Size configurations
  const sizeClasses = {
    small: {
      button: 'p-1.5',
      icon: 'w-4 h-4',
      text: 'text-xs',
    },
    medium: {
      button: 'p-2',
      icon: 'w-5 h-5',
      text: 'text-sm',
    },
    large: {
      button: 'p-3',
      icon: 'w-6 h-6',
      text: 'text-base',
    },
  };

  const config = sizeClasses[size];

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      onAuthRequired?.();
      return;
    }

    if (actionLoading) return;

    try {
      setActionLoading('favorite');
      const result = await toggleFavorite(nameText, nameGender);

      // Optional: Show toast notification
      console.log(
        `${result.action === 'added' ? 'Added' : 'Removed'} "${nameText}" ${result.action === 'added' ? 'to' : 'from'} favorites`
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Handle error (could show toast notification)
    } finally {
      setActionLoading(null);
    }
  };

  const handleDislikeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      onAuthRequired?.();
      return;
    }

    if (actionLoading) return;

    try {
      setActionLoading('dislike');
      const result = await toggleDislike(nameText, nameGender);

      // Optional: Show toast notification
      console.log(
        `${result.action === 'added' ? 'Added' : 'Removed'} "${nameText}" ${result.action === 'added' ? 'to' : 'from'} dislikes`
      );
    } catch (error) {
      console.error('Error toggling dislike:', error);
      // Handle error (could show toast notification)
    } finally {
      setActionLoading(null);
    }
  };

  const favoriteButtonClasses = `
    ${config.button} 
    rounded-lg 
    transition-all 
    duration-200 
    flex 
    items-center 
    gap-2
    ${
      isCurrentlyFavorited
        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 hover:text-red-600'
    }
    ${actionLoading === 'favorite' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
    ${!user ? 'opacity-75' : ''}
  `.trim();

  const dislikeButtonClasses = `
    ${config.button} 
    rounded-lg 
    transition-all 
    duration-200 
    flex 
    items-center 
    gap-2
    ${
      isCurrentlyDisliked
        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 hover:text-amber-600'
    }
    ${actionLoading === 'dislike' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
    ${!user ? 'opacity-75' : ''}
  `.trim();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Favorite Button */}
      <button
        onClick={handleFavoriteClick}
        disabled={actionLoading === 'favorite' || favoritesLoading}
        className={favoriteButtonClasses}
        title={
          !user
            ? 'Sign in to save favorites'
            : isCurrentlyFavorited
              ? `Remove "${nameText}" from favorites`
              : `Add "${nameText}" to favorites`
        }
      >
        {isCurrentlyFavorited ? (
          <HeartIconSolid className={config.icon} />
        ) : (
          <HeartIcon className={config.icon} />
        )}
        {showLabels && (
          <span className={config.text}>
            {isCurrentlyFavorited ? 'Favorited' : 'Favorite'}
          </span>
        )}
      </button>

      {/* Dislike Button */}
      <button
        onClick={handleDislikeClick}
        disabled={actionLoading === 'dislike' || favoritesLoading}
        className={dislikeButtonClasses}
        title={
          !user
            ? 'Sign in to mark dislikes'
            : isCurrentlyDisliked
              ? `Remove "${nameText}" from dislikes`
              : `Add "${nameText}" to dislikes`
        }
      >
        {isCurrentlyDisliked ? (
          <HandThumbDownIconSolid className={config.icon} />
        ) : (
          <HandThumbDownIcon className={config.icon} />
        )}
        {showLabels && (
          <span className={config.text}>
            {isCurrentlyDisliked ? 'Disliked' : 'Dislike'}
          </span>
        )}
      </button>
    </div>
  );
};
