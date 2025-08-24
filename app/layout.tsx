import './globals.css'

// 로컬 폰트 사용으로 변경 (Google Fonts 연결 문제 해결)

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
      <head></head>
      <body>
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
          {children}
        </main>
      </body>
    </html>
  )
}