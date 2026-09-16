"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type TourHighlightContextValue = {
  activeTarget: string | null;
  setActiveTarget: (target: string | null) => void;
};

const TourHighlightContext = createContext<TourHighlightContextValue | null>(
  null,
);

export function TourHighlightProvider({ children }: { children: ReactNode }) {
  const [activeTarget, setActiveTarget] = useState<string | null>(null);

  const value = useMemo(
    () => ({ activeTarget, setActiveTarget }),
    [activeTarget],
  );

  return (
    <TourHighlightContext.Provider value={value}>
      {children}
    </TourHighlightContext.Provider>
  );
}

export function useTourHighlight() {
  const context = useContext(TourHighlightContext);

  if (!context) {
    return {
      activeTarget: null,
      setActiveTarget: () => undefined,
    };
  }

  return context;
}

/** Avoid hydration mismatches — tour UI only applies after client mount. */
export function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}

export function useTourHighlightActive(tourId: string) {
  const { activeTarget } = useTourHighlight();
  const hasMounted = useHasMounted();

  return hasMounted && activeTarget === tourId;
}
