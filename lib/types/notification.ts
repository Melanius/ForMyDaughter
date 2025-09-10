/**
 * 📢 알림 시스템 타입 정의
 * 
 * 미션 제안 승인/거절 알림을 관리하는 타입들
 */

export type NotificationType = 'proposal_approved' | 'proposal_rejected'

export interface Notification {
  id: string
  user_id: string // 알림을 받을 사용자
  type: NotificationType
  title: string
  message: string
  data?: {
    proposal_id?: string
    proposal_title?: string
    category?: string
    reward?: number
    start_date?: string
    rejection_reason?: string
  }
  is_read: boolean
  created_at: string
  updated_at: string
}

export interface CreateNotificationRequest {
  user_id: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
}

export interface NotificationApiResponse<T = any> {
  data: T | null
  error: string | null
  success: boolean
}

export interface NotificationStats {
  total_notifications: number
  unread_notifications: number
}