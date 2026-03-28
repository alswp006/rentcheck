import type { AppErrorCode } from '@/lib/types';

export function storageErr<C extends AppErrorCode>(
  code: C
): { ok: false; error: { code: C } } {
  return { ok: false, error: { code } };
}
