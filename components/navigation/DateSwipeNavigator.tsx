'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getTodayKST } from '@/lib/utils/dateUtils'

interface DateSwipeNavigatorProps {
  selectedDate: string
  onDateChange: (date: string) => void
  dateRange?: { past: number; future: number }
}

export function DateSwipeNavigator({
  selectedDate,
  onDateChange,
  dateRange = { past: 7, future: 7 }
}: DateSwipeNavigatorProps) {
  const [visibleDates, setVisibleDates] = useState<string[]>([])
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, startOffset: 0 })
  const dateWidthRef = useRef(90) // 각 날짜 아이템의 기본 너비 (gap 포함)

  // 날짜 배열 생성 함수 (메모이제이션)
  const generateDateRange = useCallback((centerDate: string, past: number, future: number): string[] => {
    const dates: string[] = []
    const center = new Date(centerDate)
    
    // 과거 날짜 추가 (past일 전부터)
    for (let i = past; i > 0; i--) {
      const date = new Date(center)
      date.setDate(center.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    // 중앙 날짜 (선택된 날짜)
    dates.push(centerDate)
    
    // 미래 날짜 추가 (future일 후까지)
    for (let i = 1; i <= future; i++) {
      const date = new Date(center)
      date.setDate(center.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    return dates
  }, [])

  // 날짜 포맷팅 함수 (메모이제이션)
  const formatDateDisplay = useCallback((dateStr: string): string => {
    const date = new Date(dateStr)
    const today = getTodayKST()
    
    if (dateStr === today) {
      return '오늘'
    }
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (dateStr === yesterday.toISOString().split('T')[0]) {
      return '어제'
    }
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (dateStr === tomorrow.toISOString().split('T')[0]) {
      return '내일'
    }
    
    return `${date.getMonth() + 1}/${date.getDate()}`
  }, [])

  // 요일 포맷팅 함수 (메모이제이션)
  const formatDayOfWeek = useCallback((dateStr: string): string => {
    const date = new Date(dateStr)
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return days[date.getDay()]
  }, [])

  // 드래그/터치 이벤트 핸들러들
  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true)
    setIsAnimating(false)
    dragStartRef.current = { x: clientX, startOffset: dragOffset }
  }, [dragOffset])

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return
    
    const deltaX = clientX - dragStartRef.current.x
    const newOffset = dragStartRef.current.startOffset + deltaX
    
    // 드래그 제한 (양쪽 끝에서 저항감 추가)
    const maxOffset = (dateRange.future - 1) * dateWidthRef.current
    const minOffset = -(dateRange.past - 1) * dateWidthRef.current
    
    let boundedOffset = newOffset
    if (newOffset > maxOffset) {
      boundedOffset = maxOffset + (newOffset - maxOffset) * 0.3 // 저항감
    } else if (newOffset < minOffset) {
      boundedOffset = minOffset + (newOffset - minOffset) * 0.3 // 저항감
    }
    
    setDragOffset(boundedOffset)
  }, [isDragging, dateRange.past, dateRange.future])

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return
    
    setIsDragging(false)
    setIsAnimating(true)
    
    // 가장 가까운 날짜로 스냅
    const snapIndex = Math.round(-dragOffset / dateWidthRef.current)
    const boundedSnapIndex = Math.max(
      -(dateRange.past - 1), 
      Math.min(dateRange.future - 1, snapIndex)
    )
    
    const newOffset = -boundedSnapIndex * dateWidthRef.current
    setDragOffset(newOffset)
    
    // 새로운 날짜 선택
    const centerIndex = dateRange.past
    const newDateIndex = centerIndex + boundedSnapIndex
    if (newDateIndex >= 0 && newDateIndex < visibleDates.length) {
      const newDate = visibleDates[newDateIndex]
      if (newDate !== selectedDate) {
        onDateChange(newDate)
      }
    }
    
    // 애니메이션 완료 후 정리
    setTimeout(() => {
      setIsAnimating(false)
      setDragOffset(0) // 중앙으로 리셋
    }, 300)
  }, [isDragging, dragOffset, selectedDate, onDateChange, visibleDates, dateRange.past, dateRange.future])

  // 마우스 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientX)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleDragMove(e.clientX)
  }, [handleDragMove])

  const handleMouseUp = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // 터치 이벤트 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX)
  }

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault() // 스크롤 방지
    handleDragMove(e.touches[0].clientX)
  }, [handleDragMove])

  const handleTouchEnd = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // 글로벌 이벤트 리스너 설정/해제
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  // 키보드 네비게이션 핸들러
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isDragging) return // 드래그 중에는 키보드 비활성화
    
    const currentIndex = visibleDates.indexOf(selectedDate)
    let newIndex: number
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        newIndex = Math.max(0, currentIndex - 1)
        if (newIndex !== currentIndex) {
          onDateChange(visibleDates[newIndex])
        }
        break
      case 'ArrowRight':
        e.preventDefault()
        newIndex = Math.min(visibleDates.length - 1, currentIndex + 1)
        if (newIndex !== currentIndex) {
          onDateChange(visibleDates[newIndex])
        }
        break
      case 'Home':
        e.preventDefault()
        onDateChange(visibleDates[0])
        break
      case 'End':
        e.preventDefault()
        onDateChange(visibleDates[visibleDates.length - 1])
        break
    }
  }, [isDragging, visibleDates, selectedDate, onDateChange])

  // 키보드 이벤트 리스너 설정
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // visibleDates 업데이트 (메모이제이션)
  const memoizedVisibleDates = useMemo(() => {
    return generateDateRange(selectedDate, dateRange.past, dateRange.future)
  }, [generateDateRange, selectedDate, dateRange.past, dateRange.future])

  useEffect(() => {
    setVisibleDates(memoizedVisibleDates)
    setDragOffset(0) // 새 날짜 선택 시 오프셋 리셋
  }, [memoizedVisibleDates])

  return (
    <div className="w-full mb-8">
      {/* 날짜 네비게이션 컨테이너 */}
      <div className="relative bg-white rounded-2xl shadow-lg mx-4 py-6 overflow-hidden">
        {/* 배경 데코레이션 */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-white to-purple-50 opacity-50"></div>
        
        <div 
          ref={containerRef}
          className="relative flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          role="listbox"
          aria-label="날짜 선택"
          tabIndex={0}
        >
          <div 
            className={`
              flex items-center gap-6 px-8
              ${isAnimating ? 'transition-all duration-500 ease-out' : ''}
              ${isDragging ? 'pointer-events-none' : ''}
            `}
            style={{
              transform: `translateX(${dragOffset}px)`,
              filter: isDragging ? 'none' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))'
            }}
          >
            {visibleDates.map((date, index) => {
              const isSelected = date === selectedDate
              const centerIndex = Math.floor(visibleDates.length / 2)
              const distanceFromCenter = Math.abs(index - centerIndex)
              
              // 중앙에서 멀어질수록 스케일과 투명도 조정
              const scale = Math.max(0.75, 1 - distanceFromCenter * 0.08)
              const opacity = Math.max(0.4, 1 - distanceFromCenter * 0.12)
              
              // 시각적 깊이감을 위한 블러 효과
              const blur = distanceFromCenter > 2 ? 'blur-sm' : ''
              
              return (
                <button
                  key={date}
                  onClick={() => !isDragging && onDateChange(date)}
                  disabled={isDragging}
                  className={`
                    relative flex flex-col items-center p-4 rounded-2xl transition-all duration-400 min-w-[80px]
                    backdrop-blur-sm border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400
                    ${isSelected 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-2xl shadow-blue-500/25 ring-2 ring-blue-300/50' 
                      : 'bg-white/80 hover:bg-white/90 text-gray-700 shadow-md hover:shadow-lg'
                    }
                    ${isDragging ? 'pointer-events-none' : 'hover:scale-110 active:scale-95'}
                    ${blur}
                  `}
                  style={{
                    transform: `scale(${scale}) ${isSelected ? 'translateY(-4px)' : ''}`,
                    opacity,
                  }}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`${formatDateDisplay(date)}, ${formatDayOfWeek(date)}요일, ${date}`}
                  tabIndex={isSelected ? 0 : -1}
                >
                  {/* 요일 */}
                  <div className={`
                    text-xs font-semibold mb-1 tracking-wide
                    ${isSelected ? 'text-blue-100' : 'text-gray-500'}
                  `}>
                    {formatDayOfWeek(date)}
                  </div>
                  
                  {/* 메인 날짜 표시 */}
                  <div className={`
                    font-bold transition-all duration-300
                    ${isSelected ? 'text-xl text-white' : 'text-lg text-gray-800'}
                  `}>
                    {formatDateDisplay(date)}
                  </div>
                  
                  {/* 날짜 숫자 */}
                  <div className={`
                    text-xs mt-1 font-medium
                    ${isSelected ? 'text-blue-100' : 'text-gray-400'}
                  `}>
                    {new Date(date).getDate()}일
                  </div>
                  
                  {/* 선택된 날짜 인디케이터 */}
                  {isSelected && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
        
        {/* 좌우 페이드 효과 - 더 부드럽게 */}
        <div className="absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none z-10"></div>
        <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10"></div>
        
        {/* 상단/하단 장식선 */}
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        
        {/* 드래그 인디케이터 - 더 시각적으로 */}
        {isDragging && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="flex items-center justify-center space-x-2 bg-black/80 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
              <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
              <span>날짜 선택중</span>
              <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            </div>
          </div>
        )}
      </div>
      
      {/* 선택된 날짜 상세 정보 - 더 예쁘게 */}
      <div className="text-center mt-6">
        <div className="inline-flex items-center justify-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-full shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="text-sm font-medium text-gray-700">
              {selectedDate}
            </div>
          </div>
        </div>
      </div>
      
      {/* 사용법 힌트 - 처음 방문자용 */}
      {!isDragging && (
        <div className="text-center mt-3 animate-fade-in">
          <div className="text-xs text-gray-400">
            ← 드래그하여 날짜 이동 →
          </div>
        </div>
      )}
    </div>
  )
}