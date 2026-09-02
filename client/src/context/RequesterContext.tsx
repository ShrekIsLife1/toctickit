import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface Requester {
  id: number;
  name: string;
  email: string;
}

interface RequesterContextValue {
  requester: Requester | null;
  setRequester: (r: Requester) => void;
  clearRequester: () => void;
}

const STORAGE_KEY = "toktickit.selectedRequester";

const RequesterContext = createContext<RequesterContextValue | undefined>(undefined);

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [requester, setRequesterState] = useState<Requester | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRequesterState(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  function setRequester(r: Requester) {
    setRequesterState(r);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  }

  function clearRequester() {
    setRequesterState(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return (
    <RequesterContext.Provider value={{ requester, setRequester, clearRequester }}>
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester() {
  const ctx = useContext(RequesterContext);
  if (!ctx) throw new Error("useRequester must be used within a RequesterProvider");
  return ctx;
}