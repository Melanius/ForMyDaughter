import './globals.css'
import TabNavigation from '../components/ui/TabNavigation'

export const metadata = {
  title: '우리 아이 용돈 관리',
  description: '아이들을 위한 재미있는 용돈 관리 앱',
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
          <TabNavigation />
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}