import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User, AuthState } from '../types';
import { authService } from '../services/authService';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AuthState = {
  user: undefined,
  token: undefined,
  isAuthenticated: false,
  isLoading: true,
  error: undefined, // Add missing error property
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: undefined,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: undefined,
        token: undefined,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: undefined,
        token: undefined,
        isAuthenticated: false,
        isLoading: false,
        error: undefined,
      };
    case 'REFRESH_TOKEN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check for existing token on app start
    const initializeAuth = async () => {
      const token = localStorage.getItem('kiro_token');
      if (token) {
        try {
          const user = await authService.validateToken(token);
          dispatch({
            type: 'REFRESH_TOKEN_SUCCESS',
            payload: { user, token },
          });
        } catch (error) {
          localStorage.removeItem('kiro_token');
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const { user, token } = await authService.login(username, password);
      localStorage.setItem('kiro_token', token);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: 'Login failed' });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('kiro_token');
    dispatch({ type: 'LOGOUT' });
  };

  const refreshToken = async () => {
    const token = localStorage.getItem('kiro_token');
    if (token) {
      try {
        const { user, token: newToken } = await authService.refreshToken();
        localStorage.setItem('kiro_token', newToken);
        dispatch({
          type: 'REFRESH_TOKEN_SUCCESS',
          payload: { user, token: newToken },
        });
      } catch (error) {
        logout();
        throw error;
      }
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };