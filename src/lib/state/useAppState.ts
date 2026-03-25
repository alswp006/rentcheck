import { useContext } from "react";
import { AppStateContext } from "./AppProvider";
import type { AppState } from "./AppProvider";

export function useAppState(): AppState {
  return useContext(AppStateContext);
}
