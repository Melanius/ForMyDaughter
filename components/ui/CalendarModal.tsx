'use client'

import { useState, useEffect } from 'react'
import { formatDateKST } from '@/lib/utils/dateUtils'

interface CalendarModalProps {
  isOpen: boolean
  selectedDate: string
  onSelectDate: (date: string) => void
  onClose: () => void
}

export function CalendarModal({ isOpen, selectedDate, onSelectDate, onClose }: CalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date(selectedDate)
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })

  useEffect(() => {
    if (isOpen) {
      const date = new Date(selectedDate)
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }, [isOpen, selectedDate])

  if (!isOpen) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const selectedDateObj = new Date(selectedDate)
  selectedDateObj.setHours(0, 0, 0, 0)

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    
    // 이전 달의 빈 공간
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // 이번 달의 날짜들
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const days = getDaysInMonth(currentMonth)

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const handleDateClick = (date: Date) => {
    const dateString = formatDateKST(date)
    onSelectDate(dateString)
    onClose()
  }

  const formatDateString = (date: Date) => {
    return formatDateKST(date)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <span className="text-gray-600">◀</span>
          </button>
          
          <h2 className="text-lg font-bold text-gray-800">
            {currentMonth.getFullYear()}년 {monthNames[currentMonth.getMonth()]}
          </h2>
          
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <span className="text-gray-600">▶</span>
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day, index) => (
            <div key={day} className={`text-center text-xs font-medium py-2 ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1 mb-6">
          {days.map((day, index) => (
            <div key={index} className="aspect-square">
              {day && (
                <button
                  onClick={() => handleDateClick(day)}
                  className={`w-full h-full rounded-lg text-sm font-medium transition-all duration-200 ${
                    formatDateString(day) === selectedDate
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
                      : formatDateString(day) === formatDateString(today)
                      ? 'bg-blue-100 text-blue-600 font-bold'
                      : day.getDay() === 0
                      ? 'text-red-500 hover:bg-red-50'
                      : day.getDay() === 6
                      ? 'text-blue-500 hover:bg-blue-50'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {day.getDate()}
                </button>
              )}
            </div>
          ))}
        </div>


        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium"
        >
          닫기
        </button>
      </div>
    </div>
  )
}