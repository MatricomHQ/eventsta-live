
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { User } from '../types';
import * as api from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (provider: string, credentials?: string) => Promise<User | null>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const login = async (provider: string, credentials?: string): Promise<User | null> => {
    setIsLoading(true);
    try {
      const userData = await api.signIn(provider, credentials);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error("Login failed", error);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };
  
  const refreshUser = async () => {
      if (user) {
          try {
            const updatedUser = await api.getUserProfile();
            setUser(updatedUser);
          } catch(e) {
              console.error("Failed to refresh user", e);
          }
      }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
