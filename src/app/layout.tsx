import type { Metadata } from "next";
import "./globals.css";
import { Cairo } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ConditionalSidebar from "@/components/ConditionalSidebar";

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "نظام الشكاوى",
  description: "نظام إدارة الشكاوى",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.className}>
      <body className={cairo.className}>
        <AuthProvider>
          <ProtectedRoute>
            <ConditionalSidebar>
              {children}
            </ConditionalSidebar>
          </ProtectedRoute>
        </AuthProvider>
      </body>
    </html>
  );
}
