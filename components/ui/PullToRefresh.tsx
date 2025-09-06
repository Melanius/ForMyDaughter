'use client'

import React, { ReactNode } from 'react'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { RotateCcw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  threshold?: number
  className?: string
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  className = ''
}) => {
  const {
    containerRef,
    isRefreshing,
    isPulling,
    pullDistance,
    canRelease,
    message
  } = usePullToRefresh({
    onRefresh,
    threshold,
    refreshingText: '새로고침 중...',
    pullText: '아래로 당겨서 새로고침',
    releaseText: '놓으면 새로고침'
  })

  const showIndicator = isPulling || isRefreshing
  const indicatorOpacity = Math.min(pullDistance / threshold, 1)
  const iconRotation = isRefreshing ? 360 : (pullDistance / threshold) * 180

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto h-full ${className}`}
      style={{
        transform: isPulling ? `translateY(${Math.min(pullDistance, threshold)}px)` : 'translateY(0)',
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull-to-refresh 인디케이터 */}
      {showIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-transparent z-10"
          style={{
            height: `${Math.max(pullDistance, threshold)}px`,
            opacity: indicatorOpacity,
            transform: `translateY(-${threshold - Math.min(pullDistance, threshold)}px)`
          }}
        >
          <div className="flex items-center space-x-2 text-blue-600">
            <RotateCcw
              className={`w-5 h-5 transition-all duration-300 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{
                transform: `rotate(${iconRotation}deg)`
              }}
            />
            <span className="text-sm font-medium">{message}</span>
          </div>
          
          {/* 진행률 표시 */}
          {!isRefreshing && (
            <div className="mt-2 w-20 h-1 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-200"
                style={{
                  width: `${Math.min((pullDistance / threshold) * 100, 100)}%`
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 컨텐츠 */}
      <div className={showIndicator ? 'pt-4' : ''}>
        {children}
      </div>
    </div>
  )
}