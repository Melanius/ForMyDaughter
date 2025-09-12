'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Edit, Trash2, Calendar } from 'lucide-react'
import { 
  FamilyEventWithCreator, 
  EventWithDDay, 
  CreateEventRequest, 
  EventType,
  EVENT_EMOJIS,
  EVENT_TYPE_NAMES 
} from '@/lib/types/events'
import eventService from '@/lib/services/eventService'

interface EventManageModalProps {
  isOpen: boolean
  onClose: () => void
  familyId: string
}

export function EventManageModal({ isOpen, onClose, familyId }: EventManageModalProps) {
  const [events, setEvents] = useState<EventWithDDay[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEvent, setNewEvent] = useState<CreateEventRequest>({
    title: '',
    event_date: '',
    event_type: 'custom'
  })

  useEffect(() => {
    if (isOpen) {
      loadEvents()
    }
  }, [isOpen, familyId])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const upcomingEvents = await eventService.getUpcomingEvents(familyId, 20)
      setEvents(upcomingEvents)
      
      // 생일 동기화
      await eventService.syncBirthdays(familyId)
    } catch (error) {
      console.error('이벤트 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newEvent.title.trim() || !newEvent.event_date) {
      alert('제목과 날짜를 입력해주세요.')
      return
    }

    try {
      await eventService.createEvent(familyId, newEvent)
      setNewEvent({ title: '', event_date: '', event_type: 'custom' })
      setShowAddForm(false)
      loadEvents()
      alert('🎉 이벤트가 추가되었습니다!')
    } catch (error) {
      console.error('이벤트 추가 실패:', error)
      alert('이벤트 추가에 실패했습니다.')
    }
  }

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (!confirm(`'${eventTitle}' 이벤트를 삭제하시겠습니까?`)) {
      return
    }

    try {
      await eventService.deleteEvent(eventId)
      loadEvents()
      alert('이벤트가 삭제되었습니다.')
    } catch (error) {
      console.error('이벤트 삭제 실패:', error)
      alert('이벤트 삭제에 실패했습니다.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-pink-500" />
            <h3 className="text-xl font-bold text-gray-800">가족 이벤트 관리</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* 이벤트 추가 버튼 */}
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              새 이벤트 추가
            </button>
          </div>

          {/* 이벤트 추가 폼 */}
          {showAddForm && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-gray-800 mb-3">새 이벤트 추가</h4>
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이벤트 제목
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="예: 결혼 10주년"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      날짜
                    </label>
                    <input
                      type="date"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      종류
                    </label>
                    <select
                      value={newEvent.event_type}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, event_type: e.target.value as EventType }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="custom">특별한 날</option>
                      <option value="anniversary">기념일</option>
                      <option value="birthday">생일</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    추가하기
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 이벤트 목록 */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">
              다가오는 이벤트 ({events.length}개)
            </h4>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-gray-600">로딩 중...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📅</div>
                <p className="text-gray-600">아직 등록된 이벤트가 없어요.</p>
                <p className="text-sm text-gray-500 mt-1">새 이벤트를 추가해보세요!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {EVENT_EMOJIS[event.event_type]}
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-800">{event.title}</h5>
                          <p className="text-sm text-gray-600">
                            {new Date(event.event_date).toLocaleDateString('ko-KR')} • {EVENT_TYPE_NAMES[event.event_type]}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                          event.dday === 0 ? 'bg-red-100 text-red-700' :
                          event.dday > 0 ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {event.dday_text}
                        </div>
                        
                        {event.event_type !== 'birthday' && (
                          <button
                            onClick={() => handleDeleteEvent(event.id, event.title)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}