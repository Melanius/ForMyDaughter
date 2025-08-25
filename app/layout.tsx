import './globals.css'
import Link from 'next/link'

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
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-4xl mx-auto px-8 py-4">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800">MoneySeed 💰</h1>
                <div className="flex space-x-4">
                  <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
                    홈
                  </Link>
                  <Link href="/allowance" className="text-blue-600 hover:text-blue-800 font-medium">
                    용돈 관리
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}