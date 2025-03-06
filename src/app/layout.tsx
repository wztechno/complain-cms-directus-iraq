import type { Metadata } from "next";
import "./globals.css";
import { Cairo } from "next/font/google";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "نظام الشكاوى",
  description: "نظام إدارة الشكاوى",
};

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable}`}>
      <body className="font-sans">
        <Sidebar />
        <main className="min-h-screen bg-gray-100">
          {children}
        </main>
      </body>
    </html>
  );
}
