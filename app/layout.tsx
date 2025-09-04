import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { NavigationBar } from '@/components/layout/NavBar'
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav'
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundary'
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
        <ErrorBoundaryWrapper>
          <QueryProvider>
            <AuthProvider>
              <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
                <NavigationBar />
                <main>
                  {children}
                </main>
                <MobileBottomNav />
              </div>
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  )
}