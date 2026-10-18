import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import type { Me } from "./types";

interface SessionValue {
  /** undefined while loading, null when nobody is signed in. */
  me: Me | null | undefined;
  refresh: () => Promise<Me | null>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue>({ me: undefined, refresh: async () => null, signOut: async () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const r = await api.me();
      const next = r.user ? (r as Me) : null;
      setMe(next);
      return next;
    } catch {
      setMe((cur) => (cur === undefined ? null : cur));
      return null;
    }
  }, []);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => {});
    setMe(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ me, refresh, signOut }), [me, refresh, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
