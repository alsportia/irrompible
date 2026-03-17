"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  name: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType>({ user: null, setUser: () => {} });

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('ub_user');
    if (stored) {
      try { setUserState(JSON.parse(stored)); } catch {}
    }
    setLoaded(true);
  }, []);

  const setUser = (u: User | null) => {
    setUserState(u);
    if (u) localStorage.setItem('ub_user', JSON.stringify(u));
    else localStorage.removeItem('ub_user');
  };

  if (!loaded) return null;
  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
