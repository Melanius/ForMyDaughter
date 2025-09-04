'use client'

import { useState, useRef } from 'react'
import { CalendarModal } from '../ui/CalendarModal'
import { getTodayKST } from '@/lib/utils/dateUtils'

interface CompactDateNavigatorProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export function CompactDateNavigator({ selectedDate, onDateChange }: CompactDateNavigatorProps) {
  const [showCalendar, setShowCalendar] = useState(false)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isLongPressing, setIsLongPressing] = useState(false)

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

  const handlePrevDate = () => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() - 1)
    onDateChange(currentDate.toISOString().split('T')[0])
  }

  const handleNextDate = () => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() + 1)
    onDateChange(currentDate.toISOString().split('T')[0])
  }

  const handleGoToToday = () => {
    const today = getTodayKST()
    onDateChange(today)
  }

  // 길게 누르기 이벤트 핸들러
  const handleMouseDown = () => {
    setIsLongPressing(false)
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true)
      // 길게 누르기 시 오늘로 이동
      handleGoToToday()
    }, 500)
  }

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (!isLongPressing) {
      // 짧은 클릭 시 캘린더 모달 표시
      setShowCalendar(true)
    }
    setIsLongPressing(false)
  }

  const handleMouseLeave = () => {
    // 마우스가 영역을 벗어날 때는 타이머만 정리하고 액션은 수행하지 않음
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    setIsLongPressing(false)
  }

  const dateDisplay = formatDateDisplay(selectedDate)

  return (
    <>
      <div className="grid grid-cols-[28px_1fr_28px] items-center gap-1 min-w-[200px]">
        {/* 이전 날짜 버튼 */}
        <button
          onClick={handlePrevDate}
          className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
        >
          <span className="text-sm">◀</span>
        </button>

        {/* 중앙 날짜 표시 (고정폭) */}
        <div
          className={`px-3 py-1 rounded-full cursor-pointer select-none transition-all duration-200 text-xs font-medium text-center min-w-[120px] ${
            dateDisplay.isToday
              ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
        >
          {dateDisplay.display}
        </div>

        {/* 다음 날짜 버튼 */}
        <button
          onClick={handleNextDate}
          className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
        >
          <span className="text-sm">▶</span>
        </button>
      </div>

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