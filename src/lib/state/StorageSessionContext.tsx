import React, { createContext, useCallback, useContext, useReducer } from "react";

interface StorageSessionValue {
  draftDisabled: boolean;
  disableDraftForSession: () => void;
}

const StorageSessionContext = createContext<StorageSessionValue | null>(null);

function reducer(state: boolean, action: "DISABLE"): boolean {
  if (action === "DISABLE") return true;
  return state;
}

export function StorageSessionProvider({
  children,
}: {
  children?: React.ReactNode;
}): React.ReactElement {
  const [draftDisabled, dispatch] = useReducer(reducer, false);

  const disableDraftForSession = useCallback(() => {
    dispatch("DISABLE");
  }, []);

  return React.createElement(
    StorageSessionContext.Provider,
    { value: { draftDisabled, disableDraftForSession } },
    children
  );
}

export function useStorageSession(): StorageSessionValue {
  const ctx = useContext(StorageSessionContext);
  if (ctx === null) {
    throw new Error("useStorageSession must be used inside StorageSessionProvider");
  }
  return ctx;
}
