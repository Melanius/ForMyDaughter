'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  refreshingText?: string
  pullText?: string
  releaseText?: string
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  refreshingText = '새로고침 중...',
  pullText = '아래로 당겨서 새로고침',
  releaseText = '놓으면 새로고침'
}: UsePullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [canRelease, setCanRelease] = useState(false)
  
  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing) return
    
    const container = containerRef.current
    if (!container) return
    
    // 스크롤이 최상단에 있을 때만 pull-to-refresh 활성화
    if (container.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }, [isRefreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || isRefreshing) return
    
    currentY.current = e.touches[0].clientY
    const distance = Math.max(0, currentY.current - startY.current)
    
    if (distance > 0) {
      // 브라우저 기본 스크롤 방지
      e.preventDefault()
      
      const adjustedDistance = Math.min(distance * 0.5, threshold * 1.5)
      setPullDistance(adjustedDistance)
      setCanRelease(adjustedDistance >= threshold)
    }
  }, [isPulling, isRefreshing, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return
    
    setIsPulling(false)
    
    if (canRelease && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } catch (error) {
        console.error('새로고침 실패:', error)
      } finally {
        setTimeout(() => {
          setIsRefreshing(false)
          setPullDistance(0)
          setCanRelease(false)
        }, 500)
      }
    } else {
      // 애니메이션으로 원위치
      setPullDistance(0)
      setCanRelease(false)
    }
  }, [isPulling, canRelease, isRefreshing, onRefresh])

  // 마우스 이벤트 (웹 브라우저용)
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (isRefreshing) return
    
    const container = containerRef.current
    if (!container || container.scrollTop !== 0) return
    
    startY.current = e.clientY
    setIsPulling(true)
  }, [isRefreshing])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPulling || isRefreshing) return
    
    currentY.current = e.clientY
    const distance = Math.max(0, currentY.current - startY.current)
    
    if (distance > 0) {
      const adjustedDistance = Math.min(distance * 0.3, threshold * 1.5)
      setPullDistance(adjustedDistance)
      setCanRelease(adjustedDistance >= threshold)
    }
  }, [isPulling, isRefreshing, threshold])

  const handleMouseUp = useCallback(async () => {
    if (!isPulling) return
    
    setIsPulling(false)
    
    if (canRelease && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } catch (error) {
        console.error('새로고침 실패:', error)
      } finally {
        setTimeout(() => {
          setIsRefreshing(false)
          setPullDistance(0)
          setCanRelease(false)
        }, 500)
      }
    } else {
      setPullDistance(0)
      setCanRelease(false)
    }
  }, [isPulling, canRelease, isRefreshing, onRefresh])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 터치 이벤트
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    // 마우스 이벤트
    container.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp])

  // 상태에 따른 메시지
  const getMessage = () => {
    if (isRefreshing) return refreshingText
    if (canRelease) return releaseText
    if (isPulling) return pullText
    return ''
  }

  return {
    containerRef,
    isRefreshing,
    isPulling,
    pullDistance,
    canRelease,
    message: getMessage()
  }
}