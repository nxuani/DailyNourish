
import { useCallback, useEffect, useState } from 'react';

import {
    searchFoods as searchProxyFoods,
} from '@/lib/fatsecret';

import {
    FoodResult,
    normalizeResults,
    rankResults,
} from './fatsecret-normalize';

export type { FoodResult };

// Cache search results to avoid unnecessary API requests.
const cache = new Map<string, FoodResult[]>();

/**
 * Search foods using the team's existing FatSecret proxy.
 * No direct FatSecret API calls or credentials are needed.
 */
export async function searchFoods(
  query: string
): Promise<FoodResult[]> {
  const q = query.trim();

  if (!q) return [];

  const cacheKey = q.toLowerCase();
  const cached = cache.get(cacheKey);

  if (cached) return cached;

  try {
    // Reuse the existing proxy integration.
    const response = await searchProxyFoods(q, {
      maxResults: 12,
    });

    // Convert proxy results into the format used by
    // the Add Food picker.
    const results = rankResults(
      normalizeResults(response),
      q
    );

    cache.set(cacheKey, results);

    return results;
  } catch (error) {
    console.error('FatSecret food search failed:', error);

    throw error instanceof Error
      ? error
      : new Error('Food search failed. Please try again.');
  }
}

/**
 * Search as the user types.
 * Waits 300ms after typing before sending a request.
 */
export function useFoodSearch(query: string) {
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const q = query.trim();

    if (!q) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const list = await searchFoods(q);

        if (!cancelled) {
          setResults(list);
          setError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setResults([]);
          setError(
            error instanceof Error
              ? error.message
              : 'Search failed. Please try again.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, attempt]);

  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  return {
    results,
    loading,
    error,
    retry,
  };
}
