'use client'

import { useState, useEffect, useRef } from 'react'
import { CalendarModal } from '../ui/CalendarModal'
import { getTodayKST, addDaysKST } from '@/lib/utils/dateUtils'

interface SmartDateNavigatorProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export function SmartDateNavigator({ selectedDate, onDateChange }: SmartDateNavigatorProps) {
  const [showCalendar, setShowCalendar] = useState(false)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isLongPressing, setIsLongPressing] = useState(false)

  // 터치/마우스 이벤트를 위한 상태
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date()
    const tomorrow = new Date()
    
    today.setHours(0, 0, 0, 0)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)

    const timeToday = today.getTime()
    const timeYesterday = yesterday.getTime()
    const timeTomorrow = tomorrow.getTime()
    const timeDate = date.getTime()
    
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[date.getDay()]

    if (timeDate === timeToday) {
      return { display: `오늘 ${month}/${day} (${weekday})`, isToday: true }
    } else if (timeDate === timeYesterday) {
      return { display: `어제 ${month}/${day} (${weekday})`, isToday: false }
    } else if (timeDate === timeTomorrow) {
      return { display: `내일 ${month}/${day} (${weekday})`, isToday: false }
    } else {
      const dayDiff = Math.floor((timeDate - timeToday) / (1000 * 60 * 60 * 24))
      if (dayDiff > 0) {
        return { display: `${dayDiff}일 후 ${month}/${day} (${weekday})`, isToday: false }
      } else {
        return { display: `${Math.abs(dayDiff)}일 전 ${month}/${day} (${weekday})`, isToday: false }
      }
    }
  }

  const formatDateSub = (date: Date) => {
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[date.getDay()]
    return `${month}월 ${day}일 (${weekday})`
  }

  const handlePrevDate = () => {
    onDateChange(addDaysKST(selectedDate, -1))
  }

  const handleNextDate = () => {
    onDateChange(addDaysKST(selectedDate, 1))
  }

  const handleGoToToday = () => {
    onDateChange(getTodayKST())
  }

  // 길게 누르기 이벤트 핸들러
  const handleMouseDown = () => {
    setIsLongPressing(false)
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true)
      setShowCalendar(true)
    }, 500) // 0.5초 후 캘린더 모달 표시
  }

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (!isLongPressing) {
      // 짧은 클릭은 오늘로 이동
      handleGoToToday()
    }
    setIsLongPressing(false)
  }

  // 스와이프 제스처 처리
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
    handleMouseDown() // 길게 누르기도 함께 처리
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    handleMouseUp()
    
    if (touchStartX === null) return
    
    const touchEndX = e.changedTouches[0].clientX
    const diffX = touchStartX - touchEndX
    const minSwipeDistance = 50

    if (Math.abs(diffX) > minSwipeDistance) {
      if (diffX > 0) {
        // 왼쪽으로 스와이프 -> 다음 날
        handleNextDate()
      } else {
        // 오른쪽으로 스와이프 -> 이전 날
        handlePrevDate()
      }
    }
    
    setTouchStartX(null)
  }

  const dateDisplay = formatDateDisplay(selectedDate)
  const isToday = dateDisplay.isToday

  return (
    <>
      <div 
        ref={containerRef}
        className="flex items-center justify-between bg-white rounded-2xl shadow-lg p-4 mb-6 mx-2"
      >
        {/* 이전 날짜 버튼 */}
        <button
          onClick={handlePrevDate}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-200 text-gray-600 hover:text-gray-800 active:scale-95"
        >
          <span className="text-lg font-bold">◀</span>
        </button>

        {/* 중앙 날짜 표시 영역 */}
        <div 
          className={`flex-1 mx-4 text-center cursor-pointer select-none transition-all duration-200 rounded-xl p-3 ${
            isToday 
              ? 'bg-gradient-to-r from-orange-100 to-pink-100 border-2 border-orange-200' 
              : 'hover:bg-gray-50'
          }`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className={`text-xl font-bold ${isToday ? 'text-orange-600' : 'text-gray-800'}`}>
            {dateDisplay.main}
          </div>
          <div className={`text-sm ${isToday ? 'text-orange-500' : 'text-gray-500'}`}>
            {dateDisplay.sub}
          </div>
        </div>

        {/* 다음 날짜 버튼 */}
        <button
          onClick={handleNextDate}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-200 text-gray-600 hover:text-gray-800 active:scale-95"
        >
          <span className="text-lg font-bold">▶</span>
        </button>
      </div>

      {/* 오늘로 돌아가기 버튼 (오늘이 아닐 때만 표시) */}
      {!isToday && (
        <div className="flex justify-center mb-4">
          <button
            onClick={handleGoToToday}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            오늘로 돌아가기
          </button>
        </div>
      )}

      {/* 캘린더 모달 */}
      <CalendarModal
        isOpen={showCalendar}
        selectedDate={selectedDate}
        onSelectDate={onDateChange}
        onClose={() => setShowCalendar(false)}
      />
    </>
  )
}