"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
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
      try {
        const parsed: User = JSON.parse(stored);
        fetch('/api/auth/validate', {
          headers: { 'x-user-id': String(parsed.id) },
        })
          .then(res => {
            if (res.status === 401) return null;
            return res.json();
          })
          .then(data => {
            if (!data || data.valid === false) {
              setUserState(null);
              localStorage.removeItem('ub_user');
            } else {
              setUserState(parsed);
            }
          })
          .catch(() => {
            setUserState(parsed);
          })
          .finally(() => setLoaded(true));
        return;
      } catch {}
    }
    setLoaded(true);
  }, []);

  const setUser = (u: User | null) => {
    setUserState(u);
    if (u) localStorage.setItem('ub_user', JSON.stringify(u));
    else localStorage.removeItem('ub_user');
  };

  if (!loaded) return <>{children}</>;
  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
