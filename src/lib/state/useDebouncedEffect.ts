import { DependencyList, useEffect } from "react";

export function useDebouncedEffect(
  effect: () => void,
  deps: DependencyList,
  delayMs: number
): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = setTimeout(effect, delayMs);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delayMs]);
}
