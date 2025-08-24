'use client'

import React from 'react'
import { DateSummary } from '../lib/types/mission'

interface CalendarCellProps {
  date: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  summary?: DateSummary
  onClick: () => void
}

export default function CalendarCell({
  date,
  day,
  isCurrentMonth,
  isToday,
  isSelected,
  summary,
  onClick
}: CalendarCellProps) {
  // 날짜 상태 계산
  const hasData = Boolean(summary && summary.totalMissions > 0)
  const isCompleted = summary ? summary.completedMissions === summary.totalMissions && summary.totalMissions > 0 : false
  const hasIncomplete = summary ? summary.completedMissions < summary.totalMissions : false
  const completionRate = summary && summary.totalMissions > 0 
    ? (summary.completedMissions / summary.totalMissions) * 100 
    : 0

  // 스타일 계산
  const getDateStyles = () => {
    let baseStyles = 'relative h-16 p-1 cursor-pointer transition-all duration-200 rounded-lg flex flex-col items-center justify-start hover:bg-gray-50'
    
    // 현재 월이 아닌 날짜
    if (!isCurrentMonth) {
      baseStyles += ' text-gray-300 bg-gray-50'
    }
    
    // 오늘 날짜
    if (isToday) {
      baseStyles += ' ring-2 ring-blue-500 bg-blue-50'
    }
    
    // 선택된 날짜
    if (isSelected) {
      baseStyles += ' bg-blue-100 ring-2 ring-blue-600'
    }
    
    // 일요일/토요일 색상
    const dayOfWeek = new Date(date).getDay()
    if (isCurrentMonth) {
      if (dayOfWeek === 0) { // 일요일
        baseStyles += ' text-red-600'
      } else if (dayOfWeek === 6) { // 토요일
        baseStyles += ' text-blue-600'
      }
    }
    
    return baseStyles
  }

  // 미션 상태 인디케이터
  const renderMissionIndicator = () => {
    if (!hasData) return null
    
    return (
      <div className="w-full mt-1 space-y-1">
        {/* 미션 개수 표시 */}
        <div className="flex justify-center">
          <span className="text-xs font-medium text-gray-600">
            {summary?.completedMissions}/{summary?.totalMissions}
          </span>
        </div>
        
        {/* 진행률 바 */}
        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isCompleted 
                ? 'bg-green-500' 
                : hasIncomplete 
                  ? 'bg-yellow-500' 
                  : 'bg-gray-300'
            }`}
            style={{ width: `${completionRate}%` }}
          />
        </div>
        
        {/* 보상 표시 */}
        {summary && summary.earnedReward > 0 && (
          <div className="flex justify-center">
            <span className="text-xs font-medium text-green-600">
              +{summary.earnedReward.toLocaleString()}원
            </span>
          </div>
        )}
      </div>
    )
  }

  // 특별한 상태 배지
  const renderStatusBadge = () => {
    if (!hasData) return null
    
    if (isCompleted) {
      return (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      )
    }
    
    if (hasIncomplete && summary && summary.completedMissions > 0) {
      return (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">!</span>
        </div>
      )
    }
    
    return null
  }

  return (
    <button
      onClick={onClick}
      className={getDateStyles()}
      disabled={!isCurrentMonth}
      aria-label={`${date} ${hasData ? `미션 ${summary?.completedMissions}/${summary?.totalMissions} 완료` : '미션 없음'}`}
    >
      {/* 상태 배지 */}
      {renderStatusBadge()}
      
      {/* 날짜 숫자 */}
      <span className={`text-sm font-medium ${isToday ? 'font-bold' : ''}`}>
        {day}
      </span>
      
      {/* 미션 상태 인디케이터 */}
      {renderMissionIndicator()}
    </button>
  )
}