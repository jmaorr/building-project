"use client";

import { useState, useCallback, useEffect } from "react";

interface UseSkeletonLoadingOptions {
  /** Initial loading state */
  initialLoading?: boolean;
  /** Delay before setting loading to false (for smooth transitions) */
  transitionDelay?: number;
}

interface UseSkeletonLoadingReturn {
  /** Current loading state */
  isLoading: boolean;
  /** Function to set loading state */
  setLoading: (loading: boolean) => void;
  /** Wrapper function for async data loading */
  loadData: <T>(loader: () => Promise<T>) => Promise<T | undefined>;
}

/**
 * Hook for managing skeleton loading states with smooth transitions
 * 
 * @example
 * ```tsx
 * const { isLoading, loadData } = useSkeletonLoading();
 * 
 * useEffect(() => {
 *   loadData(async () => {
 *     const data = await fetchData();
 *     setData(data);
 *   });
 * }, []);
 * ```
 */
export function useSkeletonLoading(
  options: UseSkeletonLoadingOptions = {}
): UseSkeletonLoadingReturn {
  const { initialLoading = true, transitionDelay = 100 } = options;
  const [isLoading, setIsLoading] = useState(initialLoading);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const loadData = useCallback(
    async <T,>(loader: () => Promise<T>): Promise<T | undefined> => {
      setIsLoading(true);
      try {
        const result = await loader();
        // Small delay to ensure smooth transition
        setTimeout(() => {
          setIsLoading(false);
        }, transitionDelay);
        return result;
      } catch (error) {
        console.error("Error loading data:", error);
        setTimeout(() => {
          setIsLoading(false);
        }, transitionDelay);
        return undefined;
      }
    },
    [transitionDelay]
  );

  return {
    isLoading,
    setLoading,
    loadData,
  };
}

