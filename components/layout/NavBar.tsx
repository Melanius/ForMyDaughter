'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { usePathname } from 'next/navigation'
import { memo } from 'react'

export const NavigationBar = memo(function NavigationBar() {
  const { user, profile, loading } = useAuth()
  const pathname = usePathname()

  // 인증 페이지에서는 네비게이션 바 숨김
  if (pathname === '/login' || pathname === '/signup') {
    return null
  }

  return (
    <nav className="bg-white border-b border-orange-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* 로고 - 모바일 최적화 */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="text-lg sm:text-2xl">🌱</span>
                <div>
                  <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                    MoneySeed
                  </span>
                  <div className="text-xs text-gray-500 -mt-1 hidden sm:block">스마트 용돈 관리</div>
                </div>
              </div>
            </Link>
          </div>
          
          {/* 태블릿/PC 환경에서만 표시되는 탭 네비게이션 */}
          {!loading && user && profile && (
            <div className="hidden md:flex items-center bg-gray-50 rounded-2xl p-1 border border-gray-200">
              <Link 
                href="/" 
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  pathname === '/' 
                    ? 'bg-white text-orange-600 shadow-sm border border-orange-200' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                }`}
              >
                미션
              </Link>
              
              <Link 
                href="/allowance" 
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  pathname.startsWith('/allowance') 
                    ? 'bg-white text-green-600 shadow-sm border border-green-200' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                }`}
              >
                {profile.user_type === 'parent' ? '자녀 지갑' : '지갑'}
              </Link>
              
              <Link 
                href="/chat" 
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  pathname.startsWith('/chat') 
                    ? 'bg-white text-blue-600 shadow-sm border border-blue-200' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                }`}
              >
                채팅
              </Link>
              
              <Link 
                href="/family" 
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  pathname.startsWith('/family') 
                    ? 'bg-white text-purple-600 shadow-sm border border-purple-200' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                }`}
              >
                가족
              </Link>
            </div>
          )}

          {/* 사용자 정보 */}
          <div className="flex items-center">
            {!loading && user && profile ? (
              <div className="flex items-center space-x-4">
                {/* 환영 메시지 - 데스크톱에서만 표시 */}
                <div className="hidden lg:block text-right">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">안녕하세요,</span>
                    <span className="text-sm font-semibold text-gray-800">{profile.full_name || '사용자'}님</span>
                    <span className="text-lg">
                      {profile.user_type === 'parent' ? '👨‍👩‍👧‍👦' : '🧒'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {profile.user_type === 'parent' ? '부모님' : '자녀'} 계정
                  </div>
                </div>
                
                {/* 사용자 프로필 - 모바일 최적화 */}
                <div className="flex items-center space-x-2 sm:space-x-3 bg-gradient-to-r from-orange-50 to-pink-50 rounded-2xl px-2 sm:px-4 py-2 border border-orange-100">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm ${
                      profile.user_type === 'parent' 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' 
                        : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                    }`}>
                      {profile.full_name?.charAt(0) || 'U'}
                    </div>
                    {/* 모바일에서는 사용자 타입 숨김, 이름만 표시 */}
                    <div className="block lg:hidden">
                      <p className="text-sm font-semibold text-gray-800">{profile.full_name || '사용자'}</p>
                    </div>
                  </div>
                  <div className="border-l border-orange-200 pl-2 sm:pl-3">
                    <LogoutButton />
                  </div>
                </div>
              </div>
            ) : !loading && !user ? (
              <div className="flex space-x-2 sm:space-x-3">
                <Link 
                  href="/login" 
                  className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  로그인
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 px-3 sm:px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  시작하기
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                <span className="text-gray-600 text-sm">로딩 중...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
})