/**
 * 🚀 최적화된 쿼리 훅
 * React Query 기반 성능 최적화된 데이터 페칭
 */

import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query'
import { useMemo } from 'react'

// 기본 쿼리 옵션
const DEFAULT_QUERY_OPTIONS = {
  staleTime: 5 * 60 * 1000, // 5분
  gcTime: 10 * 60 * 1000,   // 10분 (cacheTime 대신 gcTime 사용)
  refetchOnWindowFocus: false,
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
}

// 실시간 데이터용 옵션
const REALTIME_QUERY_OPTIONS = {
  staleTime: 30 * 1000,     // 30초
  gcTime: 60 * 1000,        // 1분
  refetchInterval: 60 * 1000, // 1분마다 자동 새로고침
  refetchOnWindowFocus: true,
}

// 정적 데이터용 옵션
const STATIC_QUERY_OPTIONS = {
  staleTime: 30 * 60 * 1000, // 30분
  gcTime: 60 * 60 * 1000,    // 1시간
  refetchOnWindowFocus: false,
}

export type QueryType = 'default' | 'realtime' | 'static'

interface OptimizedQueryOptions<TData, TError> extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  type?: QueryType
}

/**
 * 최적화된 쿼리 훅
 */
export function useOptimizedQuery<TData = unknown, TError = Error>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options: OptimizedQueryOptions<TData, TError> = {}
): UseQueryResult<TData, TError> {
  const { type = 'default', ...restOptions } = options

  const queryOptions = useMemo(() => {
    let baseOptions = DEFAULT_QUERY_OPTIONS

    switch (type) {
      case 'realtime':
        baseOptions = { ...DEFAULT_QUERY_OPTIONS, ...REALTIME_QUERY_OPTIONS }
        break
      case 'static':
        baseOptions = { ...DEFAULT_QUERY_OPTIONS, ...STATIC_QUERY_OPTIONS }
        break
    }

    return {
      ...baseOptions,
      ...restOptions,
      queryKey,
      queryFn,
    }
  }, [queryKey, queryFn, type, restOptions])

  return useQuery(queryOptions)
}

/**
 * 미션 데이터용 특화 훅
 */
export function useMissionQuery<TData = unknown, TError = Error>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options: OptimizedQueryOptions<TData, TError> = {}
) {
  return useOptimizedQuery(queryKey, queryFn, {
    type: 'realtime',
    ...options,
  })
}

/**
 * 사용자 프로필용 특화 훅
 */
export function useProfileQuery<TData = unknown, TError = Error>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options: OptimizedQueryOptions<TData, TError> = {}
) {
  return useOptimizedQuery(queryKey, queryFn, {
    type: 'static',
    ...options,
  })
}

/**
 * 용돈 거래 내역용 특화 훅
 */
export function useAllowanceQuery<TData = unknown, TError = Error>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options: OptimizedQueryOptions<TData, TError> = {}
) {
  return useOptimizedQuery(queryKey, queryFn, {
    type: 'realtime',
    staleTime: 2 * 60 * 1000, // 2분 (용돈은 더 자주 업데이트)
    ...options,
  })
}