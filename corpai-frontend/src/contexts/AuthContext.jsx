/**
 * CorpAI — Contexto de Autenticação
 * Gerencia estado do usuário, login/logout, e persistência de sessão.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { login as apiLogin, logout as apiLogout, getMe, getToken, clearTokens } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar sessão ao montar
  useEffect(() => {
    async function checkAuth() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await getMe();
        setUser(userData);
      } catch (err) {
        clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  async function login(username, password) {
    await apiLogin(username, password);
    const userData = await getMe();
    setUser(userData);
    return userData;
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  const isAdmin = user?.role === 'admin';
  const isLiderSetor = user?.role === 'lider_setor';
  const canUpload = isAdmin || isLiderSetor;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAdmin,
      isLiderSetor,
      canUpload,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
