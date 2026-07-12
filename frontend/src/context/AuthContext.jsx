import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);
const USER_KEY = "transitops_user";
const TOKEN_KEY = "transitops_token";

function readCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }) {
  const token = localStorage.getItem(TOKEN_KEY);
  const cached = token ? readCachedUser() : null;
  const [user, setUser] = useState(cached);
  // Skip boot screen when we already know who is logged in
  const [loading, setLoading] = useState(Boolean(token && !cached));

  useEffect(() => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (!currentToken) {
      setUser(null);
      writeCachedUser(null);
      setLoading(false);
      return;
    }
    api
      .me()
      .then((me) => {
        setUser(me);
        writeCachedUser(me);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        writeCachedUser(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { access_token } = await api.login(email, password);
    localStorage.setItem(TOKEN_KEY, access_token);
    const me = await api.me();
    setUser(me);
    writeCachedUser(me);
    return me;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    writeCachedUser(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
