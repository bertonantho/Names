# Names API to Supabase API Correspondence Guide

This document provides a complete mapping between your current `namesApi.ts` (using `processed_names.json`) and the enhanced `supabaseApi.ts` system.

## 🎯 Function Correspondence Table

| **namesApi.ts Function**                 | **supabaseApi.ts Equivalent**            | **Status**      | **Notes**                                         |
| ---------------------------------------- | ---------------------------------------- | --------------- | ------------------------------------------------- |
| `loadProcessedData()`                    | `loadProcessedData()`                    | ✅ **Complete** | Aggregates all Supabase data into namesApi format |
| `searchNames(options)`                   | `searchNames(options)`                   | ✅ **Complete** | Enhanced with all advanced filters                |
| `getNameDetails(name, sex)`              | `getNameDetails(name, sex)`              | ✅ **Complete** | Identical functionality                           |
| `getPopularNamesByYear(year, sex?)`      | `getPopularNamesByYear(year, sex?)`      | ✅ **Complete** | Enhanced with proper NameData format              |
| `getTrendingNames(sex?)`                 | `getTrendingNames(sex?)`                 | ✅ **Complete** | Uses Supabase trending function                   |
| `getDepartmentData(name, sex, year)`     | `getDepartmentData(name, sex, year)`     | ✅ **Complete** | Uses Supabase department function                 |
| `getSummary()`                           | `getSummary()`                           | ✅ **Complete** | Generates complete summary from Supabase          |
| `findSimilarNames(name, sex, limit)`     | `findSimilarNames(name, sex, limit)`     | ✅ **Complete** | Advanced similarity algorithm included            |
| `findNamesWithSimilarCharacteristics()`  | `findNamesWithSimilarCharacteristics()`  | ✅ **Complete** | Letter/syllable analysis included                 |
| `calculateNameSimilarity()`              | `calculateNameSimilarity()`              | ✅ **Complete** | Identical phonetic algorithm                      |
| `countLetters()` / `countSyllables()`    | `countLetters()` / `countSyllables()`    | ✅ **Complete** | Identical utility functions                       |
| `generateAIRecommendations()`            | `generateAIRecommendations()`            | ✅ **Complete** | Full AI recommendation engine                     |
| `generateGemmaEnhancedRecommendations()` | `generateGemmaEnhancedRecommendations()` | ✅ **Complete** | Gemma AI integration included                     |
| `getAvailableYearsForName()`             | `getAvailableYearsForName()`             | ✅ **Complete** | Identical functionality                           |

## 🔄 Migration Steps

### Step 1: Update Import Statements

**Before (using processed_names.json):**

```typescript
import {
  searchNames,
  getNameDetails,
  findSimilarNames,
  generateAIRecommendations,
  // ... other imports
} from '../services/namesApi';
```

**After (using Supabase):**

```typescript
import {
  searchNames,
  getNameDetails,
  findSimilarNames,
  generateAIRecommendations,
  // ... other imports
} from '../services/supabaseApi';
```

### Step 2: No Code Changes Required!

All function signatures are **identical** between `namesApi.ts` and `supabaseApi.ts`. Your existing components will work without any changes.

### Step 3: Update Component Imports

Replace all imports from `namesApi` to `supabaseApi` in these files:

- `src/pages/HomePage.tsx`
- `src/pages/SearchPage.tsx`
- `src/pages/NameDetailsPage.tsx`
- `src/pages/AIRecommendationsPage.tsx`
- Any other components using name data

## 📊 Data Structure Compatibility

### NameData Interface

Both APIs return the same `NameData` interface:

```typescript
interface NameData {
  name: string;
  sex: 'M' | 'F';
  yearlyData: Record<string, number>; // year -> birth count
  rankings: Record<string, number>; // year -> rank
  totalBirths: number;
  firstYear: number;
  lastYear: number;
  peakYear: number;
  peakBirths: number;
  trend: 'rising' | 'falling' | 'stable';
  totalCount?: number; // For compatibility
}
```

### Summary Data

The `getSummary()` function returns identical structure:

```typescript
interface NameSummary {
  totalNames: number;
  totalBirths: number;
  yearRange: { min: number; max: number };
  topNames: {
    boys: NameData[];
    girls: NameData[];
  };
}
```

## 🚀 Enhanced Features in Supabase Version

### 1. Advanced Search Filters

```typescript
const results = await searchNames({
  query: 'Gabriel',
  sex: 'M',
  minYear: 2000,
  maxYear: 2024,
  minCount: 100,
  minLetters: 4,
  maxLetters: 8,
  minSyllables: 2,
  maxSyllables: 3,
  minBirths2024: 50,
  minTrendingRate: 1.1,
  maxTrendingRate: 2.0,
  sortBy: 'trending',
  limit: 50,
});
```

### 2. AI Recommendations

```typescript
const context: FamilyContext = {
  lastName: 'Martin',
  existingChildren: [
    { name: 'Emma', gender: 'F' },
    { name: 'Louis', gender: 'M' },
  ],
  preferences: {
    gender: 'M',
    popularityLevel: 'moderate',
    maxLetters: 7,
    meaningImportance: 'high',
  },
};

const recommendations = await generateAIRecommendations(context);
const enhancedRecommendations =
  await generateGemmaEnhancedRecommendations(context);
```

### 3. Similarity Analysis

```typescript
// Find phonetically similar names
const similarNames = await findSimilarNames('Gabriel', 'M', 8);

// Find names with similar characteristics (length, syllables)
const similarCharacteristics = await findNamesWithSimilarCharacteristics(
  'Gabriel',
  'M',
  8
);

// Calculate similarity score between two names
const similarity = calculateNameSimilarity('Gabriel', 'Raphaël'); // Returns 0.0-1.0
```

## 🔧 Fallback System

The Supabase API includes automatic fallbacks:

1. **No Supabase Connection**: Falls back to mock data
2. **Invalid Configuration**: Returns sample data
3. **API Errors**: Graceful degradation with console warnings

## 📋 Required Supabase Setup

### 1. Environment Variables

Ensure these are set in your `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Database Schema

The `french-names-schema.sql` includes:

- ✅ `french_names` table (raw INSEE data)
- ✅ `departments` table (French departments)
- ✅ `name_statistics` table (aggregated data)
- ✅ All required functions (`get_name_details`, `search_names`, etc.)

### 3. Data Population

Use `migrate-to-supabase.js` to populate your Supabase tables with CSV data.

## 🎛️ Performance Considerations

### Supabase Advantages:

- **Real-time data**: Always up-to-date
- **Server-side filtering**: Faster complex queries
- **Scalable**: Handles large datasets efficiently
- **Indexed searches**: Optimized performance

### JSON File Advantages:

- **Faster initial load**: All data cached in memory
- **Offline capability**: Works without internet
- **Simple deployment**: No database setup required

## 🧪 Testing the Migration

1. **Keep both systems** during transition
2. **Test key functions** with both APIs
3. **Compare results** to ensure consistency
4. **Monitor performance** and user experience

## 📄 Migration Checklist

- [ ] Supabase database set up with schema
- [ ] CSV data migrated to Supabase tables
- [ ] Environment variables configured
- [ ] Updated imports in all components
- [ ] Tested core functionality
- [ ] Verified AI recommendations work
- [ ] Confirmed department data displays correctly
- [ ] Performance acceptable for your use case

## 🔚 Next Steps

After successful migration, you can:

1. **Remove `namesApi.ts`** and related JSON files
2. **Remove `process-csv-data.cjs`** (no longer needed)
3. **Delete `public/data/processed_names.json`**
4. **Clean up any unused imports**

The enhanced Supabase API provides the same interface with better performance, real-time updates, and advanced features like AI recommendations!
