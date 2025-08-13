import { NameData } from './namesApi';

interface CacheEntry {
  data: NameData[];
  timestamp: number;
  filters: string;
  excludedCount: number; // Track how many names were excluded when this cache was created
}

interface ChunkCache {
  [key: string]: NameData[];
}

class NameCacheService {
  private cache = new Map<string, CacheEntry>();
  private chunkCache: ChunkCache = {};
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_CACHE_SIZE = 50; // Maximum cached filter combinations

  // Generate cache key from filters
  private getCacheKey(filters: {
    gender: 'M' | 'F' | 'all';
    minLetters: number;
    maxLetters: number;
  }): string {
    return `${filters.gender}-${filters.minLetters}-${filters.maxLetters}`;
  }

  // Check if cache entry is still valid
  private isValidCache(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_DURATION;
  }

  // Load a single chunk with caching
  async loadChunk(gender: 'M' | 'F', chunkIndex: number): Promise<NameData[]> {
    const chunkKey = `${gender}_chunk_${chunkIndex}`;

    // Return from cache if available
    if (this.chunkCache[chunkKey]) {
      return this.chunkCache[chunkKey];
    }

    try {
      const genderPrefix = gender === 'M' ? 'boys' : 'girls';
      const response = await fetch(
        `/data/${genderPrefix}_chunk_${chunkIndex}.json`
      );

      if (!response.ok) {
        return []; // No more chunks
      }

      const chunk: NameData[] = await response.json();

      // Cache the chunk
      this.chunkCache[chunkKey] = chunk;

      return chunk;
    } catch (error) {
      console.warn(`Failed to load chunk ${chunkKey}:`, error);
      return [];
    }
  }

  // Load chunks progressively until we have enough names
  async loadNamesProgressively(
    filters: {
      gender: 'M' | 'F' | 'all';
      minLetters: number;
      maxLetters: number;
    },
    excludedNames: Set<string>,
    targetCount: number = 200
  ): Promise<NameData[]> {
    const cacheKey = this.getCacheKey(filters);

    // Check cache first - but invalidate if we have more excluded names or cache is stale
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCache(cached)) {
      const currentExcludedCount = excludedNames.size;
      const cachedExcludedCount = cached.excludedCount;

      // More aggressive cache invalidation - any increase in exclusions should refresh
      // Also check if we have enough names after filtering
      const filteredNames = this.filterExcluded(cached.data, excludedNames);
      if (
        currentExcludedCount > cachedExcludedCount ||
        filteredNames.length < targetCount * 0.3
      ) {
        console.log(
          `Cache invalidated: excluded count ${cachedExcludedCount} -> ${currentExcludedCount}, filtered names: ${filteredNames.length}`
        );
        this.cache.delete(cacheKey);
      } else {
        return filteredNames;
      }
    }

    const allNames: NameData[] = [];
    const genders = filters.gender === 'all' ? ['M', 'F'] : [filters.gender];

    // Load chunks progressively
    for (const gender of genders) {
      let chunkIndex = 0;

      while (allNames.length < targetCount && chunkIndex < 25) {
        const chunk = await this.loadChunk(gender as 'M' | 'F', chunkIndex);

        if (chunk.length === 0) break; // No more chunks

        // Filter chunk immediately to reduce memory usage
        const filteredChunk = chunk.filter((name) => {
          const letterCount = this.countLetters(name.name);
          const letterMatch =
            letterCount >= filters.minLetters &&
            letterCount <= filters.maxLetters;

          // More lenient recent usage check - include names from last 5 years
          const hasRecentUsage =
            (name.yearlyData['2024'] || 0) > 0 ||
            (name.yearlyData['2023'] || 0) > 0 ||
            (name.yearlyData['2022'] || 0) > 0 ||
            (name.yearlyData['2021'] || 0) > 0 ||
            (name.yearlyData['2020'] || 0) > 0;

          // Debug logging for troublesome cases
          if (letterMatch && !hasRecentUsage && letterCount <= 6) {
            console.log(
              `Excluded ${name.name} (${letterCount} letters) - no recent usage`
            );
          }

          return letterMatch && hasRecentUsage;
        });

        allNames.push(...filteredChunk);
        chunkIndex++;

        // Stop early if we have enough names
        if (allNames.length >= targetCount * 2) break;
      }
    }

    // Add debug logging for filter results
    console.log(
      `Filter applied - minLetters: ${filters.minLetters}, maxLetters: ${filters.maxLetters}, found ${allNames.length} names`
    );

    // Shuffle and cache
    const shuffledNames = allNames.sort(() => Math.random() - 0.5);

    // Cache the result with current excluded count
    this.setCachedNames(cacheKey, shuffledNames, excludedNames.size);

    const finalFiltered = this.filterExcluded(shuffledNames, excludedNames);
    console.log(
      `After excluding selected names: ${finalFiltered.length} names remaining`
    );

    return finalFiltered;
  }

  // Filter out excluded names
  filterExcluded(names: NameData[], excludedNames: Set<string>): NameData[] {
    return names.filter(
      (name) => !excludedNames.has(`${name.name}-${name.sex}`)
    );
  }

  // Count letters utility
  private countLetters(name: string): number {
    return name.replace(/[^a-zA-ZÀ-ÿ]/g, '').length;
  }

  // Cache filtered names
  private setCachedNames(
    key: string,
    names: NameData[],
    excludedCount: number = 0
  ): void {
    // Clean old cache entries if we're at the limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data: names,
      timestamp: Date.now(),
      filters: key,
      excludedCount,
    });
  }

  // Get cached names if available - now includes excluded count check
  getCachedNames(
    filters: {
      gender: 'M' | 'F' | 'all';
      minLetters: number;
      maxLetters: number;
    },
    excludedNames?: Set<string>
  ): NameData[] | null {
    const cacheKey = this.getCacheKey(filters);
    const cached = this.cache.get(cacheKey);

    if (cached && this.isValidCache(cached)) {
      // If excluded names provided, check if cache is still relevant
      if (excludedNames && excludedNames.size > cached.excludedCount) {
        console.log(
          `Cache outdated: excluded count ${cached.excludedCount} -> ${excludedNames.size}`
        );
        this.cache.delete(cacheKey);
        return null;
      }
      return cached.data;
    }

    return null;
  }

  // Create excluded names set from favorites and dislikes
  createExcludedSet(
    favorites: Array<{ name_text: string; name_gender: string }>,
    dislikes: Array<{ name_text: string; name_gender: string }>
  ): Set<string> {
    const excluded = new Set<string>();

    favorites.forEach((fav) =>
      excluded.add(`${fav.name_text}-${fav.name_gender}`)
    );
    dislikes.forEach((dis) =>
      excluded.add(`${dis.name_text}-${dis.name_gender}`)
    );

    return excluded;
  }

  // Clear all caches
  clearCache(): void {
    this.cache.clear();
    this.chunkCache = {};
  }

  // Get cache stats for debugging
  getCacheStats(): {
    filteredCacheSize: number;
    chunkCacheSize: number;
    oldestEntry: number;
  } {
    let oldestTimestamp = Date.now();

    for (const entry of this.cache.values()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    return {
      filteredCacheSize: this.cache.size,
      chunkCacheSize: Object.keys(this.chunkCache).length,
      oldestEntry: Date.now() - oldestTimestamp,
    };
  }
}

export const nameCache = new NameCacheService();
