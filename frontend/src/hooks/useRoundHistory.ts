import { useEffect, useState } from 'react';
import { apiFetch } from '#/lib/api';
import { useGameStore, type HistoryItem } from '#/store/game';

interface ApiHistoryItem {
  id: string;
  crashPoint: string;
  seedHash: string;
}

export function useRoundHistory(): { isLoading: boolean; error: Error | null } {
  const setHistory = useGameStore((s) => s.setHistory);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiFetch<ApiHistoryItem[]>('/games/rounds/history?limit=16')
      .then((items) => {
        if (cancelled) return;
        const parsed: HistoryItem[] = items.map((i) => ({
          id: i.id,
          seedHash: i.seedHash,
          crashPoint: Number.isNaN(parseFloat(i.crashPoint)) ? 1 : parseFloat(i.crashPoint),
        }));
        setHistory(parsed);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error('Failed to load history'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setHistory]);

  return { isLoading, error };
}
