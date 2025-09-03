'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { usePathname } from 'next/navigation'
import { memo } from 'react'

export const NavigationBar = memo(function NavigationBar() {
  const { user, profile, loading } = useAuth()
  const pathname = usePathname()
  
  // 부모가 자녀와 연결되어 있는지 확인 (간단한 동기 검사)
  const isParentWithChild = profile?.user_type === 'parent' && profile?.id

  console.log('🎯 NavBar 렌더링 상태:', { 
    userType: profile?.user_type, 
    isParentWithChild,
    profileId: profile?.id,
    loading 
  })

  // 인증 페이지에서는 네비게이션 바 숨김
  if (pathname === '/login' || pathname === '/signup') {
    return null
  }

  const isActivePath = (path: string) => pathname === path

  return (
    <nav className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-500 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 text-white">
              <span className="text-xl font-bold tracking-tight">MoneySeed</span>
            </Link>
          </div>
          
          {/* 메인 메뉴 */}
          {!loading && user && profile && (
            <div className="hidden md:block">
              <div className="flex items-center space-x-1">
                <Link 
                  href="/" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActivePath('/') 
                      ? 'bg-white/20 text-white backdrop-blur-sm' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  홈
                </Link>
                {/* 지갑 링크 조건부 표시 */}
                {profile.user_type === 'child' ? (
                  // 자녀는 항상 '지갑' 표시
                  <Link 
                    href="/allowance" 
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActivePath('/allowance') 
                        ? 'bg-white/20 text-white backdrop-blur-sm' 
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    지갑
                  </Link>
                ) : isParentWithChild ? (
                  // 부모가 자녀와 연동된 경우 '자녀 지갑' 표시
                  <Link 
                    href="/allowance" 
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActivePath('/allowance') 
                        ? 'bg-white/20 text-white backdrop-blur-sm' 
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    자녀 지갑
                  </Link>
                ) : null}
                {profile.user_type === 'parent' && (
                  <Link 
                    href="/family" 
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActivePath('/family') 
                        ? 'bg-white/20 text-white backdrop-blur-sm' 
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    가족
                  </Link>
                )}
              </div>
            </div>
          )}
          
          {/* 사용자 정보 & 메뉴 */}
          <div className="flex items-center">
            {!loading && user && profile ? (
              <div className="flex items-center space-x-3">
                {/* 모바일 메뉴 */}
                <div className="md:hidden">
                  <div className="flex items-center space-x-2">
                    <Link 
                      href="/" 
                      className={`p-2 rounded-lg transition-colors ${
                        isActivePath('/') ? 'bg-white/20' : 'hover:bg-white/10'
                      }`}
                    >
                      <span className="text-white text-lg">홈</span>
                    </Link>
                    {/* 모바일 지갑 링크 조건부 표시 */}
                    {profile.user_type === 'child' ? (
                      // 자녀는 항상 '지갑' 표시
                      <Link 
                        href="/allowance" 
                        className={`p-2 rounded-lg transition-colors ${
                          isActivePath('/allowance') ? 'bg-white/20' : 'hover:bg-white/10'
                        }`}
                      >
                        <span className="text-white text-lg">지갑</span>
                      </Link>
                    ) : isParentWithChild ? (
                      // 부모가 자녀와 연동된 경우 '자녀 지갑' 표시
                      <Link 
                        href="/allowance" 
                        className={`p-2 rounded-lg transition-colors ${
                          isActivePath('/allowance') ? 'bg-white/20' : 'hover:bg-white/10'
                        }`}
                      >
                        <span className="text-white text-lg">자녀 지갑</span>
                      </Link>
                    ) : null}
                    {profile.user_type === 'parent' && (
                      <Link 
                        href="/family" 
                        className={`p-2 rounded-lg transition-colors ${
                          isActivePath('/family') ? 'bg-white/20' : 'hover:bg-white/10'
                        }`}
                      >
                        <span className="text-white text-lg">가족</span>
                      </Link>
                    )}
                  </div>
                </div>
                
                {/* 사용자 정보 */}
                <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      profile.user_type === 'parent' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-green-500 text-white'
                    }`}>
                      {profile.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium text-white">{profile.full_name || '사용자'}</p>
                      <p className="text-xs text-white/70">
                        {profile.user_type === 'parent' ? '부모님' : '자녀'}
                      </p>
                    </div>
                  </div>
                  <div className="border-l border-white/20 pl-3">
                    <LogoutButton />
                  </div>
                </div>
              </div>
            ) : !loading && !user ? (
              <div className="flex space-x-3">
                <Link 
                  href="/login" 
                  className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  로그인
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-white text-purple-600 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  시작하기
                </Link>
              </div>
            ) : (
              <div className="text-white/70 text-sm">로딩 중...</div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
})