import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/users/isLoggedIn');
      setUser(res.data.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const res = await api.post('/users/login', { email, password });
    setUser(res.data.data.user);
  };

  const signup = async body => {
    const res = await api.post('/users/signup', body);
    setUser(res.data.data.user);
  };

  const logout = async () => {
    await api.get('/users/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, login, signup, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
