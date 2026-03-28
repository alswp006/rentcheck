import { useState, useEffect } from 'react';
import type { HistoryEntry } from '@/lib/types';
import { historyStorage } from '@/lib/storage/historyStorage';

const DEFAULT_PAGE_SIZE = 20;

interface UseHistoryResult {
  loading: boolean;
  items: HistoryEntry[];
  error: { code: string } | null;
}

export function useHistory(): UseHistoryResult {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<{ code: string } | null>(null);

  useEffect(() => {
    // Defer to next tick so loading=true is visible to consumers before resolving.
    // localStorage is synchronous so this resolves well within 200ms.
    const timer = setTimeout(() => {
      const result = historyStorage.list({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
      if (result.ok) {
        setItems(result.value.items);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return { loading, items, error };
}
