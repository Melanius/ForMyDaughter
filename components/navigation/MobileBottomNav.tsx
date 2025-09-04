'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { memo } from 'react'

interface NavItem {
  icon: string
  label: string
  path: string
  activeIcon?: string
}

export const MobileBottomNav = memo(function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useAuth()

  // 인증 페이지에서는 하단 네비게이션 숨김
  if (pathname === '/login' || pathname === '/signup' || !profile) {
    return null
  }

  const navItems: NavItem[] = [
    {
      icon: '🎯',
      activeIcon: '🎯',
      label: '미션',
      path: '/'
    },
    {
      icon: '💰',
      activeIcon: '💰',
      label: '지갑',
      path: '/allowance'
    },
    {
      icon: '💬',
      activeIcon: '💬',
      label: '채팅',
      path: '/chat'
    },
    {
      icon: '👨‍👩‍👧‍👦',
      activeIcon: '👨‍👩‍👧‍👦',
      label: '가족',
      path: '/family'
    }
  ]

  const isActivePath = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  return (
    <>
      {/* 모바일에서만 표시 (md 미만) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
        <div className="flex items-center justify-around h-16 px-4">
          {navItems.map((item) => {
            const isActive = isActivePath(item.path)
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 transition-all duration-200 ${
                  isActive 
                    ? 'text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <span className={`text-xl mb-1 transition-transform duration-200 ${
                  isActive ? 'scale-110' : ''
                }`}>
                  {isActive ? (item.activeIcon || item.icon) : item.icon}
                </span>
                <span className={`text-xs font-medium truncate w-full text-center ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* 모바일에서 하단 네비게이션 높이만큼 여백 추가 */}
      <div className="md:hidden h-16" />
    </>
  )
})