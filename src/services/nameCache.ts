import { NameData } from './namesApi';

interface CacheEntry {
  data: NameData[];
  timestamp: number;
  filters: string;
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

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCache(cached)) {
      return this.filterExcluded(cached.data, excludedNames);
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
          const hasRecentUsage =
            (name.yearlyData['2024'] || 0) > 0 ||
            (name.yearlyData['2023'] || 0) > 0;
          return letterMatch && hasRecentUsage;
        });

        allNames.push(...filteredChunk);
        chunkIndex++;

        // Stop early if we have enough names
        if (allNames.length >= targetCount * 2) break;
      }
    }

    // Shuffle and cache
    const shuffledNames = allNames.sort(() => Math.random() - 0.5);

    // Cache the result
    this.setCachedNames(cacheKey, shuffledNames);

    return this.filterExcluded(shuffledNames, excludedNames);
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
  private setCachedNames(key: string, names: NameData[]): void {
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
    });
  }

  // Get cached names if available
  getCachedNames(filters: {
    gender: 'M' | 'F' | 'all';
    minLetters: number;
    maxLetters: number;
  }): NameData[] | null {
    const cacheKey = this.getCacheKey(filters);
    const cached = this.cache.get(cacheKey);

    if (cached && this.isValidCache(cached)) {
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
