'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';

export default function ConditionalSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  // Define public routes that don't require authentication or sidebar
  const publicRoutes = ['/login', '/reset-password', '/test-routing'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    if (!authLoading) {
      // If user is not authenticated and not on a public route, redirect to login
      if (!isAuthenticated && !isPublicRoute) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    }
  }, [isAuthenticated, authLoading, isPublicRoute, router]);

  // Don't show sidebar on public routes
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Show loading state while checking authentication
  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  // If authenticated, show sidebar and content
  return (
    <>
      <Sidebar />
      <main className="min-h-screen bg-gray-100">
        {children}
      </main>
    </>
  );
} 