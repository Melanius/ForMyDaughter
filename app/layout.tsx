import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { NavigationBar } from '@/components/layout/NavBar'
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundary'

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
        <ErrorBoundaryWrapper>
          <AuthProvider>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
              <NavigationBar />
              <main>
                {children}
              </main>
            </div>
          </AuthProvider>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  )
}