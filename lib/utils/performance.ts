/**
 * 🚀 성능 최적화 유틸리티
 * 애플리케이션 성능 모니터링 및 최적화
 */

// 성능 메트릭 타입
interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  type: 'navigation' | 'resource' | 'measure' | 'custom'
}

// 성능 모니터링 클래스
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private observers: Map<string, PerformanceObserver> = new Map()

  constructor() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      this.initializeObservers()
    }
  }

  private initializeObservers() {
    try {
      // 네비게이션 타이밍 관찰
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            this.recordMetric('navigation.domContentLoaded', navEntry.domContentLoadedEventEnd - navEntry.fetchStart)
            this.recordMetric('navigation.loadComplete', navEntry.loadEventEnd - navEntry.fetchStart)
          }
        }
      })
      navObserver.observe({ entryTypes: ['navigation'] })
      this.observers.set('navigation', navObserver)

      // 리소스 로딩 관찰
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming
          if (resource.duration > 1000) { // 1초 이상 걸린 리소스만
            this.recordMetric(`resource.slow.${this.getResourceType(resource.name)}`, resource.duration)
          }
        }
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.set('resource', resourceObserver)

    } catch (error) {
      console.warn('Performance observers not supported:', error)
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript'
    if (url.includes('.css')) return 'stylesheet'
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image'
    if (url.includes('api/') || url.includes('supabase')) return 'api'
    return 'other'
  }

  recordMetric(name: string, value: number, type: PerformanceMetric['type'] = 'custom') {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      type
    })

    // 개발 환경에서만 로그
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${value.toFixed(2)}ms`)
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  clearMetrics() {
    this.metrics = []
  }

  // 메트릭 집계
  getAverageMetric(name: string): number {
    const metrics = this.metrics.filter(m => m.name === name)
    if (metrics.length === 0) return 0
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length
  }

  // 느린 메트릭 찾기 (상위 10%)
  getSlowMetrics(threshold: number = 1000): PerformanceMetric[] {
    return this.metrics.filter(m => m.value > threshold).sort((a, b) => b.value - a.value)
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.clearMetrics()
  }
}

// 전역 성능 모니터 인스턴스
export const performanceMonitor = new PerformanceMonitor()

// 성능 측정 데코레이터/래퍼
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: any[]) => {
    const start = performance.now()
    
    try {
      const result = fn(...args)
      
      // Promise인 경우
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          const end = performance.now()
          performanceMonitor.recordMetric(name, end - start)
        })
      }
      
      // 동기 함수인 경우
      const end = performance.now()
      performanceMonitor.recordMetric(name, end - start)
      return result
      
    } catch (error) {
      const end = performance.now()
      performanceMonitor.recordMetric(`${name}.error`, end - start)
      throw error
    }
  }) as T
}

// 컴포넌트 렌더링 성능 측정 훅
export function useRenderPerformance(componentName: string) {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now()
    
    // useLayoutEffect를 사용하여 렌더링 완료 시점 측정
    React.useLayoutEffect(() => {
      const end = performance.now()
      performanceMonitor.recordMetric(`render.${componentName}`, end - start)
    })
  }
}

// 디바운스된 함수 생성
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout
  
  return ((...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }) as T
}

// 스로틀된 함수 생성
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  let lastCall = 0
  
  return ((...args: any[]) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      return func(...args)
    }
  }) as T
}

// 메모이제이션 헬퍼
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map()
  
  return ((...args: any[]) => {
    const key = JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)
    }
    
    const result = fn(...args)
    cache.set(key, result)
    
    // 캐시 크기 제한 (메모리 누수 방지)
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }
    
    return result
  }) as T
}

// React import for useLayoutEffect
import React from 'react'