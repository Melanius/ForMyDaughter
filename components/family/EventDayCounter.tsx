'use client'

import { useState, useEffect } from 'react'
import { EventWithDDay, EVENT_EMOJIS } from '@/lib/types/events'
import eventService from '@/lib/services/eventService'

interface EventDayCounterProps {
  familyId: string
  onClick?: () => void
}

export function EventDayCounter({ familyId, onClick }: EventDayCounterProps) {
  const [nextEvent, setNextEvent] = useState<EventWithDDay | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNextEvent()
  }, [familyId])

  const loadNextEvent = async () => {
    try {
      setLoading(true)
      const upcomingEvents = await eventService.getUpcomingEvents(familyId, 1)
      setNextEvent(upcomingEvents[0] || null)
    } catch (error) {
      console.error('다가오는 이벤트 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-pink-50 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center cursor-pointer hover:bg-pink-100 transition-colors">
        <div className="text-lg sm:text-2xl mb-1 sm:mb-2">⏳</div>
        <div className="text-lg sm:text-2xl font-bold text-pink-600">...</div>
        <div className="text-xs sm:text-sm text-gray-600">로딩 중</div>
      </div>
    )
  }

  if (!nextEvent) {
    return (
      <div 
        className="bg-pink-50 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center cursor-pointer hover:bg-pink-100 transition-colors"
        onClick={onClick}
      >
        <div className="text-lg sm:text-2xl mb-1 sm:mb-2">📅</div>
        <div className="text-lg sm:text-2xl font-bold text-pink-600">+</div>
        <div className="text-xs sm:text-sm text-gray-600">이벤트 추가</div>
      </div>
    )
  }

  return (
    <div 
      className="bg-pink-50 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center cursor-pointer hover:bg-pink-100 transition-colors"
      onClick={onClick}
    >
      <div className="text-lg sm:text-2xl mb-1 sm:mb-2">
        {EVENT_EMOJIS[nextEvent.event_type]}
      </div>
      <div className="text-lg sm:text-2xl font-bold text-pink-600">
        {nextEvent.dday_text}
      </div>
      <div className="text-xs sm:text-sm text-gray-600 truncate">
        {nextEvent.title}
      </div>
    </div>
  )
}