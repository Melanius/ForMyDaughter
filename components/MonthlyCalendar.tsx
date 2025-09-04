'use client'

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DateSummary } from '../lib/types/mission'
import missionService from '../lib/services/mission'
import CalendarCell from './CalendarCell'

interface MonthlyCalendarProps {
  selectedDate: string
  onDateSelect: (date: string) => void
}

export default function MonthlyCalendar({ selectedDate, onDateSelect }: MonthlyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [dateSummaries, setDateSummaries] = useState<DateSummary[]>([])

  // 월 변경 시 날짜 요약 데이터 로드
  useEffect(() => {
    const loadMonthData = async () => {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1
      const summaries = await missionService.getMonthSummary(year, month)
      setDateSummaries(summaries)
    }
    loadMonthData()
  }, [currentMonth])

  // 이전/다음 월 이동
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  // 달력 데이터 생성
  const generateCalendarData = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    // 이번 달 첫날과 마지막날
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // 달력 시작일 (이전 달 날짜 포함)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    // 달력 종료일 (다음 달 날짜 포함)
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))
    
    const days: any[] = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const summary = dateSummaries.find(s => s.date === dateStr)
      const isCurrentMonth = currentDate.getMonth() === month
      const isToday = dateStr === new Date().toISOString().split('T')[0]
      const isSelected = dateStr === selectedDate
      
      days.push({
        date: dateStr,
        day: currentDate.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
        summary
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return days
  }

  const calendarDays = generateCalendarData()
  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ]

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* 달력 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="이전 달"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <h2 className="text-xl font-bold text-gray-800">
          {currentMonth.getFullYear()}년 {monthNames[currentMonth.getMonth()]}
        </h2>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="다음 달"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
          <div
            key={day}
            className={`text-center text-sm font-medium p-2 ${
              index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 달력 날짜 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayData, index) => 
          dayData.date ? (
            <CalendarCell
              key={`${dayData.date}-${index}`}
              date={dayData.date}
              day={dayData.day}
              isCurrentMonth={dayData.isCurrentMonth}
              isToday={dayData.isToday}
              isSelected={dayData.isSelected}
              summary={dayData.summary}
              onClick={() => onDateSelect(dayData.date!)}
            />
          ) : (
            <div key={`empty-${index}`} className="p-2" />
          )
        )}
      </div>
    </div>
  )
}