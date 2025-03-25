'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
          setUserInfo(JSON.parse(storedUserInfo));
        } catch (e) {
          console.error('Error parsing stored user info:', e);
          // Invalid user info - remove it
          localStorage.removeItem('user_info');
        }
      }
    }
    setLoading(false);
  }, []);

  const fetchUserInfo = async (accessToken: string): Promise<UserInfo> => {
    // Fetch user details including role and policies information
    const response = await fetch('https://complaint.top-wp.com/users/me?fields[]=*&fields[]=role.*&fields[]=policies.*', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user information');
    }
    
    const userData = await response.json();
    console.log('User data fetched:', userData.data);
    return userData.data;
  };

  const login = async (email: string, password: string) => {
    try {
      // First authenticate with email and password
      const response = await fetch('https://complaint.top-wp.com/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          mode: 'cookie',
        }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      const accessToken = data.data.access_token;

      if (!accessToken) {
        throw new Error('No access token received');
      }

      // Store token in localStorage
      localStorage.setItem('auth_token', accessToken);
      setToken(accessToken);
      setIsAuthenticated(true);
      
      try {
        // Now fetch user information including role
        const userDetails = await fetchUserInfo(accessToken);
        setUserInfo(userDetails);
        
        // Store user info in localStorage
        localStorage.setItem('user_info', JSON.stringify(userDetails));
        
        console.log('User logged in with role:', userDetails.role?.id);
      } catch (error) {
        console.error('Error fetching user details:', error);
        // Continue even if user details fetch fails
      }

      // Redirect to complaints page
      router.push('/complaints');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    setToken(null);
    setUserInfo(null);
    setIsAuthenticated(false);
    router.push('/login');
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