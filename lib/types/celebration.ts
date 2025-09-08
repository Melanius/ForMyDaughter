/**
 * 🎉 축하 알림 시스템 타입 정의
 */

export interface CelebrationNotification {
  id: string
  recipientId: string // 자녀 ID
  senderId: string    // 부모 ID
  type: 'allowance_transferred'
  title: string
  message: string
  amount: number
  missionCount: number
  createdAt: string
  isRead: boolean
}

export interface CelebrationPayload {
  type: 'allowance_transferred'
  recipientId: string
  amount: number
  missionCount: number
  timestamp: string
}

// Supabase 실시간 채널 이벤트 타입
export interface RealtimeCelebrationEvent {
  type: 'broadcast'
  event: 'celebration'
  payload: CelebrationPayload
}