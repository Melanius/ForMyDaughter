'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5분간 데이터를 fresh로 간주 (최적화: API 호출 대폭 감소)
            staleTime: 5 * 60 * 1000,
            // 30분간 캐시 유지 (메모리 효율적 사용)
            gcTime: 30 * 60 * 1000,
            // 창 포커스 시만 refetch (사용자 행동 기반)
            refetchOnWindowFocus: true,
            // 네트워크 재연결 시 refetch
            refetchOnReconnect: true,
            // 실패 시 재시도 설정
            retry: (failureCount, error) => {
              // 404나 403 에러는 재시도하지 않음
              if (error instanceof Error && (error.message.includes('404') || error.message.includes('403'))) {
                return false
              }
              return failureCount < 3
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // 실패 시 재시도 설정
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 개발 환경에서만 DevTools 표시 */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  )
}