import type { Metadata } from "next";
import "./globals.css";
import { Cairo } from "next/font/google";
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
      <head>
        <meta name="color-scheme" content="light" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, * {
                color-scheme: light !important;
              }
              
              html {
                background-color: white !important;
                color: black !important;
              }
              
              body {
                background-color: white !important;
                color: black !important;
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Aggressive light mode enforcement
              (function() {
                function forceLightMode() {
                  const html = document.documentElement;
                  const body = document.body;
                  
                  // Remove dark mode attributes
                  html.removeAttribute('native-dark-active');
                  html.removeAttribute('data-theme');
                  html.classList.remove('dark');
                  
                  // Force light mode properties
                  html.style.setProperty('color-scheme', 'light', 'important');
                  html.style.setProperty('background-color', 'white', 'important');
                  html.style.setProperty('color', 'black', 'important');
                  
                  if (body) {
                    body.style.setProperty('background-color', 'white', 'important');
                    body.style.setProperty('color', 'black', 'important');
                    body.style.setProperty('color-scheme', 'light', 'important');
                  }
                  
                  // Force meta tag
                  let metaColorScheme = document.querySelector('meta[name="color-scheme"]');
                  if (!metaColorScheme) {
                    metaColorScheme = document.createElement('meta');
                    metaColorScheme.name = 'color-scheme';
                    document.head.appendChild(metaColorScheme);
                  }
                  metaColorScheme.content = 'light';
                  
                  // Override any CSS media queries
                  const style = document.createElement('style');
                  style.textContent = \`
                    html, body, * {
                      color-scheme: light !important;
                    }
                    @media (prefers-color-scheme: dark) {
                      html, body {
                        background-color: white !important;
                        color: black !important;
                        color-scheme: light !important;
                      }
                    }
                  \`;
                  document.head.appendChild(style);
                }
                
                // Run immediately
                forceLightMode();
                
                // Run when DOM is loaded
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', forceLightMode);
                } else {
                  forceLightMode();
                }
                
                // Run when page is fully loaded
                window.addEventListener('load', forceLightMode);
                
                // Monitor for any changes and force light mode
                const observer = new MutationObserver(function(mutations) {
                  let shouldForce = false;
                  mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes') {
                      const target = mutation.target;
                      if (target === document.documentElement) {
                        if (target.hasAttribute('native-dark-active') || 
                            target.hasAttribute('data-theme') || 
                            target.classList.contains('dark') ||
                            target.style.colorScheme === 'dark') {
                          shouldForce = true;
                        }
                      }
                    }
                  });
                  if (shouldForce) {
                    forceLightMode();
                  }
                });
                
                observer.observe(document.documentElement, {
                  attributes: true,
                  attributeFilter: ['native-dark-active', 'data-theme', 'class', 'style'],
                  subtree: false
                });
                
                // Periodic check
                setInterval(forceLightMode, 1000);
              })();
            `,
          }}
        />
      </head>
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
