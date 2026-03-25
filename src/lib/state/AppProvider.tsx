import React, { createContext, useCallback, useEffect, useState } from "react";
import type { AppSettings, Entitlement, StorageAdapter } from "@/lib/types";

const FREE_MAX_RESIDENCE_YEARS = 10;

export interface AppState {
  settings: AppSettings;
  entitlement: Entitlement;
  loading: boolean;
  setEntitlement: (next: Entitlement) => Promise<void>;
  setSettings: (next: AppSettings) => Promise<void>;
  getEffectiveEntitlement: (currentUserId: string) => Entitlement;
}

const DEFAULT_SETTINGS: AppSettings = {
  hasSeenSimulationDisclaimer: false,
  createdAt: 0,
  updatedAt: 0,
};

const DEFAULT_ENTITLEMENT: Entitlement = {
  id: "",
  isPremium: false,
  premiumSince: null,
  ownerUserId: null,
  maxResidenceYears: FREE_MAX_RESIDENCE_YEARS,
  createdAt: 0,
  updatedAt: 0,
};

const MISSING_PROVIDER_ERROR = "useAppState must be used inside an AppProvider";

export const AppStateContext = createContext<AppState>({
  settings: DEFAULT_SETTINGS,
  entitlement: DEFAULT_ENTITLEMENT,
  loading: true,
  setEntitlement: async () => {
    throw new Error(MISSING_PROVIDER_ERROR);
  },
  setSettings: async () => {
    throw new Error(MISSING_PROVIDER_ERROR);
  },
  getEffectiveEntitlement: () => {
    throw new Error(MISSING_PROVIDER_ERROR);
  },
});

interface AppProviderProps {
  storage: StorageAdapter;
  children?: React.ReactNode;
}

export function AppProvider({ storage, children }: AppProviderProps): React.ReactElement {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [entitlement, setEntitlementState] = useState<Entitlement>(DEFAULT_ENTITLEMENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([storage.getSettings(), storage.getEntitlement()])
      .then(([settingsResult, entitlementResult]) => {
        if (settingsResult.ok) setSettingsState(settingsResult.data);
        if (entitlementResult.ok) setEntitlementState(entitlementResult.data);
      })
      .catch(() => {
        // hydration failed — keep defaults
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const setEntitlement = useCallback(
    async (next: Entitlement): Promise<void> => {
      const result = await storage.setEntitlement(next);
      if (result.ok) {
        setEntitlementState(next);
      }
    },
    [storage],
  );

  const setSettings = useCallback(
    async (next: AppSettings): Promise<void> => {
      const result = await storage.setSettings(next);
      if (result.ok) {
        setSettingsState(next);
      }
    },
    [storage],
  );

  const getEffectiveEntitlement = useCallback(
    (currentUserId: string): Entitlement => {
      if (entitlement.isPremium && entitlement.ownerUserId !== currentUserId) {
        return {
          ...entitlement,
          isPremium: false,
          maxResidenceYears: FREE_MAX_RESIDENCE_YEARS,
        };
      }
      return entitlement;
    },
    [entitlement],
  );

  const value: AppState = {
    settings,
    entitlement,
    loading,
    setEntitlement,
    setSettings,
    getEffectiveEntitlement,
  };

  return React.createElement(AppStateContext.Provider, { value }, children);
}
