'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function ConditionalSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <main className="min-h-screen bg-gray-100">
        {children}
      </main>
    </>
  );
} 