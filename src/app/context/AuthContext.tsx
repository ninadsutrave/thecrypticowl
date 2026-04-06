import { createContext, useContext, useState, ReactNode } from 'react';

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  sub: string;
}

interface AuthContextType {
  user: GoogleUser | null;
  signIn: (credential: string) => void;
  signOut: () => void;
  isSignedIn: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  signIn: () => {},
  signOut: () => {},
  isSignedIn: false,
});

const AUTH_KEY = 'tco-user';

function decodeJWTPayload(token: string): Record<string, string> | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const signIn = (credential: string) => {
    const payload = decodeJWTPayload(credential);
    if (!payload) return;
    const u: GoogleUser = {
      name: payload.name ?? '',
      email: payload.email ?? '',
      picture: payload.picture ?? '',
      sub: payload.sub ?? '',
    };
    setUser(u);
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(u));
    } catch {}
  };

  const signOut = () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, isSignedIn: user !== null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
