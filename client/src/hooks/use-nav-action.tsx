import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface NavAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface NavActionContextType {
  action: NavAction | null;
  setAction: (action: NavAction | null) => void;
}

const NavActionContext = createContext<NavActionContextType>({
  action: null,
  setAction: () => {},
});

export function NavActionProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<NavAction | null>(null);
  return (
    <NavActionContext.Provider value={{ action, setAction }}>
      {children}
    </NavActionContext.Provider>
  );
}

export function useNavActionContext() {
  return useContext(NavActionContext);
}

/**
 * Register a page-specific action button in the bottom nav bar.
 * Pass null to hide the button. Automatically clears on unmount.
 *
 * @example
 * useNavAction(editing ? null : { label: "Edit", icon: Pencil, onClick: () => setEditing(true) }, [editing]);
 */
export function useNavAction(action: NavAction | null, deps: readonly unknown[]) {
  const { setAction } = useContext(NavActionContext);
  useEffect(() => {
    setAction(action);
    return () => setAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
