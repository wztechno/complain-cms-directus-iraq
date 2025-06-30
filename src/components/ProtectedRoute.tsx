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

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/reset-password', '/test-routing'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Handle authentication redirect
  useEffect(() => {
    if (!loading && !isAuthenticated && !isPublicRoute) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router, pathname, isPublicRoute]);

  // Fetch user information when authenticated
  useEffect(() => {
    const getUserInfo = async () => {
      // Only fetch user info if authenticated and not on public routes
      if (isAuthenticated && !isPublicRoute) {
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
  }, [isAuthenticated, loading, pathname, isPublicRoute]);

  if (loading || loadingUserInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
} 