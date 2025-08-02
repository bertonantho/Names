import React, { useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
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

interface SwipeFilters {
  gender: 'M' | 'F' | 'all';
  minLetters: number;
  maxLetters: number;
}

export const SwipePage: React.FC = () => {
  const [names, setNames] = useState<NameData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
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
  const rotate = useTransform(x, [-300, 300], [-30, 30]);
  const opacity = useTransform(
    x,
    [-300, -200, 0, 200, 300],
    [0, 0.5, 1, 0.5, 0]
  );

  // Color overlays for swipe feedback
  const likeOpacity = useTransform(x, [0, 150], [0, 1]);
  const dislikeOpacity = useTransform(x, [-150, 0], [1, 0]);

  const loadNames = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSummary();

      // Load all names from chunks
      const allNames: NameData[] = [];

      // Load boys data if needed
      if (filters.gender === 'M' || filters.gender === 'all') {
        for (let i = 0; i < 25; i++) {
          try {
            const response = await fetch(`/data/boys_chunk_${i}.json`);
            if (response.ok) {
              const chunk: NameData[] = await response.json();
              allNames.push(...chunk);
            } else {
              break; // No more chunks
            }
          } catch {
            break; // No more chunks
          }
        }
      }

      // Load girls data if needed
      if (filters.gender === 'F' || filters.gender === 'all') {
        for (let i = 0; i < 25; i++) {
          try {
            const response = await fetch(`/data/girls_chunk_${i}.json`);
            if (response.ok) {
              const chunk: NameData[] = await response.json();
              allNames.push(...chunk);
            } else {
              break; // No more chunks
            }
          } catch {
            break; // No more chunks
          }
        }
      }

      // Filter names based on criteria
      let filteredNames = allNames.filter((name) => {
        // Gender filter
        const genderMatch =
          filters.gender === 'all' || name.sex === filters.gender;

        // Letter count filter
        const letterCount = countLetters(name.name);
        const letterMatch =
          letterCount >= filters.minLetters &&
          letterCount <= filters.maxLetters;

        // Recent usage (has data for recent years)
        const hasRecentUsage =
          (name.yearlyData['2024'] || 0) > 0 ||
          (name.yearlyData['2023'] || 0) > 0;

        // Exclude already rated names
        const notRated =
          !isFavorited(name.name, name.sex) && !isDisliked(name.name, name.sex);

        return genderMatch && letterMatch && hasRecentUsage && notRated;
      });

      // Shuffle the array to get random order
      filteredNames = filteredNames.sort(() => Math.random() - 0.5);

      setNames(filteredNames);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error loading names:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, isFavorited, isDisliked]);

  useEffect(() => {
    loadNames();
  }, [loadNames]);

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      if (currentIndex >= names.length) return;

      const currentName = names[currentIndex];

      try {
        // Animate the card out with spring animation
        if (direction === 'right') {
          x.set(400);
        } else {
          x.set(-400);
        }

        // Save to database
        if (direction === 'right') {
          await addFavorite(currentName.name, currentName.sex);
        } else {
          await addDislike(currentName.name, currentName.sex, 'Swiped left');
        }

        // Wait for animation to complete, then show next card
        setTimeout(() => {
          setCurrentIndex((prev) => {
            const newIndex = prev + 1;
            console.log('Moving to next card:', newIndex, 'of', names.length);
            return newIndex;
          });
          x.set(0);
        }, 300);
      } catch (error) {
        console.error('Error updating name status:', error);
        // Reset position on error
        x.set(0);
      }
    },
    [currentIndex, names, addFavorite, addDislike, x]
  );

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = info.velocity.x;

    // Consider both offset and velocity for more responsive swiping
    if (info.offset.x > threshold || velocity > 500) {
      handleSwipe('right');
    } else if (info.offset.x < -threshold || velocity < -500) {
      handleSwipe('left');
    } else {
      // Animate back to center with spring
      x.set(0);
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
              {/* Next Card (background) */}
              {names[currentIndex + 1] && (
                <div className="absolute inset-0 bg-white rounded-3xl shadow-xl transform scale-95 opacity-50" />
              )}

              {/* Current Card */}
              <motion.div
                key={currentIndex}
                style={{ x, rotate, opacity }}
                drag="x"
                dragConstraints={{ left: -300, right: 300 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                className="bg-white rounded-3xl shadow-2xl p-8 text-center cursor-grab active:cursor-grabbing relative overflow-hidden"
                whileTap={{ scale: 1.05 }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                }}
              >
                {/* Like Overlay */}
                <motion.div
                  style={{ opacity: likeOpacity }}
                  className="absolute inset-0 bg-green-500/20 flex items-center justify-center pointer-events-none"
                >
                  <HeartIcon className="h-20 w-20 text-green-500" />
                </motion.div>

                {/* Dislike Overlay */}
                <motion.div
                  style={{ opacity: dislikeOpacity }}
                  className="absolute inset-0 bg-red-500/20 flex items-center justify-center pointer-events-none"
                >
                  <XMarkIcon className="h-20 w-20 text-red-500" />
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
          </p>
        </div>
      )}
    </div>
  );
};
