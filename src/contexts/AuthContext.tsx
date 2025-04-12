'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/utils/api';

interface UserInfo {
  id: string;
  email: string;
  role?: {
    id: string;
    name?: string;
  };
  first_name?: string;
  last_name?: string;
  policies?: any[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  userInfo: UserInfo | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for token and user info in localStorage on initial load
    const storedToken = localStorage.getItem('auth_token');
    const storedUserInfo = localStorage.getItem('user_info');
    
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
      
      if (storedUserInfo) {
        try {
          const parsedUserInfo = JSON.parse(storedUserInfo);
          console.log("Loaded user info from localStorage:", parsedUserInfo);
          setUserInfo(parsedUserInfo);
        } catch (e) {
          console.error('Error parsing stored user info:', e);
          // Invalid user info - but don't remove it or log out automatically
          // We'll try to refresh the user info next time they perform an action
        }
      } else {
        console.warn('Auth token present but no user info found');
        // We have a token but no user info - don't log out, just show warning
      }
    }
    setLoading(false);
  }, []);

  const fetchUserInfo = async (accessToken: string): Promise<UserInfo> => {
    try {
      // Store token in localStorage first so fetchWithAuth can use it
      localStorage.setItem('auth_token', accessToken);
      
      // Fetch user details using our authenticated fetch function
      const userData = await fetchWithAuth('/users/me');
      
      if (!userData || !userData.data) {
        throw new Error('Failed to fetch user information');
      }
      
      console.log('User data fetched:', userData.data);
      return userData.data;
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log("Attempting login for:", email);
      
      // Clear any existing tokens or user info
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      localStorage.removeItem('current_user_id');
      localStorage.removeItem('reload_once');
      
      // Clear any lingering logout flag
      sessionStorage.removeItem('logged_out');
      
      // Always use the direct API endpoint
      const loginUrl = 'https://complaint.top-wp.com/auth/login';
      
      console.log(`Using login endpoint: ${loginUrl}`);
      
      // First authenticate with email and password
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          mode: 'json',
        }),
      });

      // Handle non-OK responses
      if (!response.ok) {
        let errorMsg = 'Login failed';
        let errorCode = 'UNKNOWN_ERROR';
        
        try {
          const errorData = await response.json();
          errorMsg = errorData?.errors?.[0]?.message || 'Invalid credentials';
          errorCode = errorData?.errors?.[0]?.extensions?.code || 'INVALID_CREDENTIALS';
          console.error('Login error response:', errorData);
        } catch (e) {
          console.error('Error parsing login error response', e);
        }
        
        throw new Error(`${errorMsg} (${errorCode})`);
      }

      // Parse the successful response
      const data = await response.json();
      console.log("Login response received");
      
      if (!data?.data?.access_token) {
        throw new Error('No access token received');
      }

      const accessToken = data.data.access_token;
      console.log("Successfully obtained auth token");
      
      // Store token in localStorage
      localStorage.setItem('auth_token', accessToken);
      setToken(accessToken);
      setIsAuthenticated(true);
      
      // Make sure we have complete user data before proceeding
      if (data.data.user) {
        const userData = {
          id: data.data.user.id,
          email: data.data.user.email,
          first_name: data.data.user.first_name || '',
          last_name: data.data.user.last_name || '',
          role: data.data.user.role || null,
          // Make sure policies is always an array
          policies: Array.isArray(data.data.user.policies) ? data.data.user.policies : []
        };
        
        console.log('Setting user data from login response:', userData);
        // Store in state
        setUserInfo(userData);
        // Store in localStorage with safety check
        try {
          localStorage.setItem('user_info', JSON.stringify(userData));
        } catch (e) {
          console.error('Error storing user info in localStorage:', e);
          // Continue anyway - we have it in memory
        }
      } else {
        console.warn('Login successful but no user data received');
      }
      
      // Redirect to complaints page after successful login
      router.push('/complaints');
    } catch (error: unknown) {
      console.error('Login error:', error);
      
      // Handle network errors specifically
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('Network error - likely a CORS issue or the API server is unreachable');
        alert('Unable to connect to the authentication server. Please check your network connection and try again.');
      } else {
        // For other errors, show the error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`Login failed: ${errorMessage}`);
      }
      
      // Clear any partial authentication state
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      setToken(null);
      setUserInfo(null);
      setIsAuthenticated(false);
      throw error;
    }
  };

  const logout = () => {
    console.log("Logout initiated");
    
    // Check if user is on the status/sub-category page
    const isOnStatusSubCategoryPage = window.location.pathname.includes('/status/sub-category');
    
    // Clear all relevant storage items
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('current_user_id');
    localStorage.removeItem('reload_once');
    
    // Clear application state
    setToken(null);
    setUserInfo(null);
    setIsAuthenticated(false);
    
    // Force page reload if on status/sub-category page before navigation
    if (isOnStatusSubCategoryPage) {
      console.log("User was on status/sub-category page, forcing reload");
      // Set flag to indicate we're coming from logout
      sessionStorage.setItem('logged_out', 'true');
      // Redirect to login page
      window.location.href = '/login';
    } else {
      // Normal navigation for other pages
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, userInfo, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}