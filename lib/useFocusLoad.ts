import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import type { DependencyList } from "react";

import { errorMessageFromUnknown } from "@/lib/errors";

/**
 * Runs `loader` every time the screen regains focus, exposing the standard
 * loading/error state machine used across screens. `deps` controls when the
 * focus effect re-subscribes (same rules as `useCallback`).
 */
export function useFocusLoad<T>(loader: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);
      loaderRef.current()
        .then((result) => {
          if (!cancelled) {
            setData(result);
          }
        })
        .catch((e) => {
          if (!cancelled) {
            setError(errorMessageFromUnknown(e));
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
  );

  return { data, setData, loading, error, setError };
}
