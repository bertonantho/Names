import React, { useState, useEffect, useCallback } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  PanInfo,
  animate,
} from 'framer-motion';
import {
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon,
  HeartIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { NameData, countLetters } from '../services/namesApi';
import { getSummary } from '../services/splitJsonApi';
import { useFavorites } from '../hooks/useFavorites';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { nameCache } from '../services/nameCache';

interface SwipeFilters {
  gender: 'M' | 'F' | 'all';
  minLetters: number;
  maxLetters: number;
}

export const SwipePage: React.FC = () => {
  const [names, setNames] = useState<NameData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SwipeFilters>({
    gender: 'all',
    minLetters: 1,
    maxLetters: 15,
  });

  const {
    addFavorite,
    addDislike,
    isFavorited,
    isDisliked,
    favorites,
    dislikes,
  } = useFavorites();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-30, 30]);
  const scale = useTransform(x, [-300, 0, 300], [0.8, 1, 0.8]);

  // Color overlays for swipe feedback
  const likeOpacity = useTransform(x, [0, 100, 200], [0, 0.3, 0.8]);
  const dislikeOpacity = useTransform(x, [-200, -100, 0], [0.8, 0.3, 0]);
  const likeScale = useTransform(x, [0, 150], [0.5, 1.2]);
  const dislikeScale = useTransform(x, [-150, 0], [1.2, 0.5]);

  const loadNames = useCallback(async () => {
    setLoading(true);
    try {
      // Create excluded names set from current favorites and dislikes
      const excludedNames = nameCache.createExcludedSet(favorites, dislikes);

      // Check cache first - pass excluded names for better cache validation
      const cachedNames = nameCache.getCachedNames(filters, excludedNames);
      if (cachedNames) {
        const filteredNames = cachedNames.filter(
          (name) => !excludedNames.has(`${name.name}-${name.sex}`)
        );

        // Use a lower threshold and consider target count
        if (filteredNames.length >= 30) {
          setNames(filteredNames);
          setCurrentIndex(0);
          return;
        } else {
          console.log(
            'Not enough cached names after filtering, reloading...',
            filteredNames.length
          );
          nameCache.clearCache();
        }
      }

      // Load names progressively with caching
      const filteredNames = await nameCache.loadNamesProgressively(
        filters,
        excludedNames,
        300 // Target count - load enough for a good session
      );

      setNames(filteredNames);
      setCurrentIndex(0);

      // Log cache stats for debugging
      const stats = nameCache.getCacheStats();
      console.log('Cache stats:', stats);
    } catch (error) {
      console.error('Error loading names:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, favorites, dislikes]);

  // Load more names when running low
  const loadMoreNames = useCallback(async () => {
    if (loadingMore || currentIndex < names.length - 10) return;

    setLoadingMore(true);
    try {
      const excludedNames = nameCache.createExcludedSet(favorites, dislikes);
      const additionalNames = await nameCache.loadNamesProgressively(
        filters,
        excludedNames,
        100 // Load 100 more names
      );

      // Filter out names we already have and ensure no duplicates
      const existingNameSet = new Set(names.map((n) => `${n.name}-${n.sex}`));
      const newNames = additionalNames.filter(
        (name) => !existingNameSet.has(`${name.name}-${name.sex}`)
      );

      if (newNames.length > 0) {
        setNames((prev) => [...prev, ...newNames]);
        console.log(`Added ${newNames.length} new names to list`);
      } else {
        console.log('No new names to add - clearing cache to get fresh data');
        nameCache.clearCache();
      }
    } catch (error) {
      console.error('Error loading more names:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, currentIndex, names.length, favorites, dislikes, filters]);

  useEffect(() => {
    loadNames();
  }, [loadNames]);

  // Auto-load more names when getting close to the end
  useEffect(() => {
    if (currentIndex >= names.length - 20) {
      loadMoreNames();
    }
  }, [currentIndex, names.length, loadMoreNames]);

  // Auto-refresh names when we have new selections (more responsive)
  useEffect(() => {
    const totalSelections = favorites.length + dislikes.length;
    const lastRefreshSelections = parseInt(
      sessionStorage.getItem('lastRefreshSelections') || '0'
    );
    const selectionsSinceRefresh = totalSelections - lastRefreshSelections;

    // Refresh more frequently (every 10 selections) and when we're running low on names
    const shouldRefresh =
      (selectionsSinceRefresh >= 10 ||
        (selectionsSinceRefresh >= 5 && currentIndex >= names.length - 10)) &&
      totalSelections > 0;

    if (shouldRefresh) {
      console.log(
        `Refreshing names: ${selectionsSinceRefresh} new selections, index ${currentIndex}/${names.length}`
      );
      sessionStorage.setItem(
        'lastRefreshSelections',
        totalSelections.toString()
      );
      loadNames();
    }
  }, [
    favorites.length,
    dislikes.length,
    loadNames,
    names.length,
    currentIndex,
  ]);

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      if (currentIndex >= names.length) return;

      const currentName = names[currentIndex];

      try {
        // Save to database immediately (don't block animation)
        const savePromise =
          direction === 'right'
            ? addFavorite(currentName.name, currentName.sex)
            : addDislike(currentName.name, currentName.sex, 'Swiped left');

        // Animate card out smoothly
        const exitX = direction === 'right' ? 500 : -500;

        // Smooth exit animation
        await animate(x, exitX, { duration: 0.3, ease: 'easeOut' });

        // Move to next card immediately after animation
        setCurrentIndex((prev) => {
          const newIndex = prev + 1;
          console.log('Moving to next card:', newIndex, 'of', names.length);
          return newIndex;
        });

        // Reset position for next card
        x.set(0);
        y.set(0);

        // Await database save
        await savePromise;
      } catch (error) {
        console.error('Error updating name status:', error);
        // Smoothly reset position on error
        animate(x, 0, { type: 'spring', stiffness: 400, damping: 40 });
        animate(y, 0, { type: 'spring', stiffness: 400, damping: 40 });
      }
    },
    [currentIndex, names, addFavorite, addDislike, x, y]
  );

  const handleDragEnd = (_event: any, info: PanInfo) => {
    const threshold = 75; // Lower threshold for easier swiping
    const velocityThreshold = 300; // Lower velocity threshold
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // More sensitive swipe detection
    const shouldSwipeRight = offset > threshold || velocity > velocityThreshold;
    const shouldSwipeLeft =
      offset < -threshold || velocity < -velocityThreshold;

    if (shouldSwipeRight) {
      handleSwipe('right');
    } else if (shouldSwipeLeft) {
      handleSwipe('left');
    } else {
      // Smooth spring back to center
      animate(x, 0, {
        type: 'spring',
        stiffness: 500,
        damping: 30,
        mass: 0.8,
      });
      animate(y, 0, {
        type: 'spring',
        stiffness: 500,
        damping: 30,
        mass: 0.8,
      });
    }
  };

  const currentName = names[currentIndex];
  const hasNextName = currentIndex < names.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-safe">
        <button
          onClick={() => window.history.back()}
          className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </button>

        <h1 className="text-2xl font-bold text-white">Discover Names</h1>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white"
        >
          <AdjustmentsHorizontalIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-6"
        >
          <h3 className="font-semibold mb-4">Filters</h3>

          {/* Gender Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Gender</label>
            <select
              value={filters.gender}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  gender: e.target.value as 'M' | 'F' | 'all',
                }))
              }
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All</option>
              <option value="M">Boys</option>
              <option value="F">Girls</option>
            </select>
          </div>

          {/* Letter Count Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Number of Letters: {filters.minLetters} - {filters.maxLetters}
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Min</label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={filters.minLetters}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      minLetters: Math.min(
                        parseInt(e.target.value),
                        prev.maxLetters
                      ),
                    }))
                  }
                  className="w-full"
                />
                <span className="text-xs text-gray-600">
                  {filters.minLetters}
                </span>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Max</label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={filters.maxLetters}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      maxLetters: Math.max(
                        parseInt(e.target.value),
                        prev.minLetters
                      ),
                    }))
                  }
                  className="w-full"
                />
                <span className="text-xs text-gray-600">
                  {filters.maxLetters}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              loadNames();
              setShowFilters(false);
            }}
            className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium"
          >
            Apply Filters
          </button>
        </motion.div>
      )}

      {/* Cards Container */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-sm">
          {hasNextName ? (
            <>
              {/* Background Cards (simple stack effect) */}
              {names[currentIndex + 2] && (
                <div className="absolute inset-0 bg-white rounded-3xl shadow-lg transform scale-90 opacity-30 translate-y-2" />
              )}
              {names[currentIndex + 1] && (
                <div className="absolute inset-0 bg-white rounded-3xl shadow-xl transform scale-95 opacity-60 translate-y-1" />
              )}

              {/* Current Card */}
              <motion.div
                key={currentIndex}
                style={{ x, y, rotate, scale }}
                drag
                dragConstraints={{
                  left: -200,
                  right: 200,
                  top: -100,
                  bottom: 100,
                }}
                dragElastic={0.1}
                dragMomentum={false}
                onDragEnd={handleDragEnd}
                className="bg-white rounded-3xl shadow-2xl p-8 text-center cursor-grab active:cursor-grabbing relative overflow-hidden select-none z-10"
                whileTap={{ scale: 1.02 }}
                whileDrag={{ scale: 1.05, zIndex: 50 }}
              >
                {/* Like Overlay */}
                <motion.div
                  style={{ opacity: likeOpacity }}
                  className="absolute inset-0 bg-green-500/20 flex items-center justify-center pointer-events-none rounded-3xl"
                >
                  <motion.div style={{ scale: likeScale }}>
                    <HeartIcon className="h-16 w-16 text-green-500 drop-shadow-lg" />
                  </motion.div>
                </motion.div>

                {/* Dislike Overlay */}
                <motion.div
                  style={{ opacity: dislikeOpacity }}
                  className="absolute inset-0 bg-red-500/20 flex items-center justify-center pointer-events-none rounded-3xl"
                >
                  <motion.div style={{ scale: dislikeScale }}>
                    <XMarkIcon className="h-16 w-16 text-red-500 drop-shadow-lg" />
                  </motion.div>
                </motion.div>
                <div className="mb-6">
                  <h2 className="text-4xl font-bold text-gray-800 mb-2">
                    {currentName?.name}
                  </h2>
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                      {currentName?.sex === 'M' ? 'Boy' : 'Girl'}
                    </span>
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                      {countLetters(currentName?.name || '')} letters
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-700">
                      {currentName?.totalCount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Total births in France
                    </p>
                  </div>

                  {currentName?.yearlyData['2024'] && (
                    <div className="text-center">
                      <p className="text-lg font-medium text-gray-700">
                        {currentName.yearlyData['2024'].toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">Births in 2024</p>
                    </div>
                  )}
                </div>

                {/* Swipe Instructions */}
                <div className="flex justify-between items-center text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <XMarkIcon className="h-4 w-4" />
                    <span>Swipe left to dislike</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Swipe right to like</span>
                    <HeartIcon className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                No more names!
              </h2>
              <p className="text-gray-600 mb-6">
                You've gone through all the names with your current filters.
              </p>
              <button
                onClick={loadNames}
                className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium"
              >
                Restart
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-8 pb-safe">
        <button
          onClick={() => handleSwipe('left')}
          disabled={!hasNextName}
          className="bg-red-500 text-white p-4 rounded-full shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 transition-transform"
        >
          <XMarkIcon className="h-8 w-8" />
        </button>
        <button
          onClick={() => handleSwipe('right')}
          disabled={!hasNextName}
          className="bg-green-500 text-white p-4 rounded-full shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 transition-transform"
        >
          <HeartIcon className="h-8 w-8" />
        </button>
      </div>

      {/* Progress Indicator */}
      {hasNextName && (
        <div className="text-center mt-4">
          <p className="text-white/80 text-sm">
            {currentIndex + 1} of {names.length} names
            {loadingMore && ' • Loading more...'}
          </p>
        </div>
      )}
    </div>
  );
};
