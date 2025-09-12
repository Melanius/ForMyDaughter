/**
 * 🗓️ 가족 이벤트 타입 정의
 */

export type EventType = 'birthday' | 'anniversary' | 'custom'

export interface FamilyEvent {
  id: string
  family_id: string
  title: string
  event_date: string // YYYY-MM-DD format
  event_type: EventType
  created_by: string
  created_at: string
  updated_at: string
}

export interface FamilyEventWithCreator extends FamilyEvent {
  creator: {
    id: string
    full_name: string
    avatar_url?: string
  }
}

export interface CreateEventRequest {
  title: string
  event_date: string
  event_type: EventType
}

export interface UpdateEventRequest {
  title?: string
  event_date?: string
  event_type?: EventType
}

export interface EventWithDDay extends FamilyEvent {
  dday: number // 음수: 지남, 0: 오늘, 양수: 남음
  dday_text: string // "D-12", "D-Day", "D+5"
}

// 이벤트 타입별 이모지
export const EVENT_EMOJIS: Record<EventType, string> = {
  birthday: '🎂',
  anniversary: '💕',
  custom: '🎉'
}

// 이벤트 타입별 한국어 이름
export const EVENT_TYPE_NAMES: Record<EventType, string> = {
  birthday: '생일',
  anniversary: '기념일',
  custom: '특별한 날'
}