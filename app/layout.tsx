import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { ChildSelectionProvider } from '@/lib/contexts/ChildSelectionContext'
import { NavigationBar } from '@/components/layout/NavBar'
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { Noto_Sans_KR } from 'next/font/google'

const notoSansKr = Noto_Sans_KR({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  title: 'MoneySeed - 스마트 용돈 관리',
  description: '부모와 자녀를 위한 스마트 용돈 관리 앱',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={notoSansKr.className}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Global error handler for unhandled promise rejections
              window.addEventListener('unhandledrejection', function(event) {
                console.warn('Unhandled promise rejection:', event.reason);
                event.preventDefault();
              });
              
              // Global error handler for runtime errors
              window.addEventListener('error', function(event) {
                console.warn('Global error:', event.error);
                event.preventDefault();
              });
              
              // Clear potentially corrupted localStorage on load
              try {
                if (typeof Storage !== 'undefined') {
                  const keys = Object.keys(localStorage);
                  keys.forEach(key => {
                    try {
                      const value = localStorage.getItem(key);
                      if (value && value.trim()) {
                        JSON.parse(value);
                      }
                    } catch (e) {
                      console.warn('Removing corrupted localStorage key:', key);
                      localStorage.removeItem(key);
                    }
                  });
                }
              } catch (e) {
                console.warn('localStorage cleanup failed:', e);
              }
            `,
          }}
        />
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              <ChildSelectionProvider>
                <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
                  <NavigationBar />
                  <main>
                    {children}
                  </main>
                  <MobileBottomNav />
                </div>
              </ChildSelectionProvider>
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}