'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCurrentUser } from '@/utils/api';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Handle authentication redirect
  useEffect(() => {
    if (!loading && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router, pathname]);

  // Fetch user information when authenticated
  useEffect(() => {
    const getUserInfo = async () => {
      // Only fetch user info if authenticated and not on login page
      if (isAuthenticated && pathname !== '/login') {
        setLoadingUserInfo(true);
        try {
          await fetchCurrentUser();
          console.log('User information with role details fetched and stored');
        } catch (error) {
          console.error('Error fetching user information:', error);
        } finally {
          setLoadingUserInfo(false);
        }
      }
    };

    if (!loading && isAuthenticated) {
      getUserInfo();
    }
  }, [isAuthenticated, loading, pathname]);

  if (loading || loadingUserInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
} 