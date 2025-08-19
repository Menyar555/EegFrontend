import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../utils/api';
import { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const logout = useCallback(() => {
    // Suppression de la gestion du token
    setUser(null);
    setAuthError(null);
  }, []);
  
  useEffect(() => {
    // Suppression de la vérification du token au chargement
    setIsLoading(false);
  }, []);
  
  useEffect(() => {
    // Suppression de l'intercepteur pour les erreurs 401
    // car nous n'utilisons plus de tokens
  }, [logout]);
  
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const { data } = await api.post('/auth/login', { email, password });
      // Stocker directement les informations utilisateur sans token
      setUser(data.user);
      return true;
    } catch (err: any) {
      const message = err.response?.data?.msg || 'Échec de la connexion';
      console.error("Login failed:", err);
      setAuthError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const register = useCallback(async (userData: any) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const { data } = await api.post('/auth/register', userData);
      // Après l'inscription, connecter directement l'utilisateur
      setUser(data.user);
      return true;
    } catch (err: any) {
      const message = err.response?.data?.msg || 'Échec de l\'inscription';
      console.error("Registration failed:", err);
      setAuthError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);
  
  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      error: authError,
      login,
      register,
      logout,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}