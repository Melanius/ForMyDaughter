/**
 * 📢 알림 서비스
 * 
 * 미션 제안 승인/거절 알림을 관리하는 서비스
 */

import { createClient } from '@/lib/supabase/client'
import { nowKST } from '@/lib/utils/dateUtils'
import {
  Notification,
  CreateNotificationRequest,
  NotificationApiResponse,
  NotificationStats
} from '@/lib/types/notification'

class NotificationService {
  private supabase = createClient()

  /**
   * 📝 알림 생성
   */
  async createNotification(request: CreateNotificationRequest): Promise<NotificationApiResponse<Notification>> {
    try {
      const notificationData = {
        user_id: request.user_id,
        type: request.type,
        title: request.title,
        message: request.message,
        data: request.data || {},
        is_read: false,
        created_at: nowKST(),
        updated_at: nowKST()
      }

      const { data, error } = await this.supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single()

      if (error) {
        console.error('알림 생성 실패:', error)
        return { data: null, error: '알림 생성에 실패했습니다', success: false }
      }

      console.log('✅ 알림 생성 완료:', data.id)
      return { data, error: null, success: true }

    } catch (error) {
      console.error('알림 생성 중 오류:', error)
      return { data: null, error: '알림 생성 중 오류가 발생했습니다', success: false }
    }
  }

  /**
   * 📋 사용자별 읽지 않은 알림 조회
   */
  async getUnreadNotifications(userId: string): Promise<NotificationApiResponse<Notification[]>> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('읽지 않은 알림 조회 실패:', error)
        return { data: null, error: '알림 조회에 실패했습니다', success: false }
      }

      return { data: data || [], error: null, success: true }

    } catch (error) {
      console.error('알림 조회 중 오류:', error)
      return { data: null, error: '알림 조회 중 오류가 발생했습니다', success: false }
    }
  }

  /**
   * ✅ 알림 읽음 처리
   */
  async markAsRead(notificationId: string): Promise<NotificationApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ 
          is_read: true,
          updated_at: nowKST()
        })
        .eq('id', notificationId)

      if (error) {
        console.error('알림 읽음 처리 실패:', error)
        return { data: null, error: '알림 처리에 실패했습니다', success: false }
      }

      return { data: true, error: null, success: true }

    } catch (error) {
      console.error('알림 읽음 처리 중 오류:', error)
      return { data: null, error: '알림 처리 중 오류가 발생했습니다', success: false }
    }
  }

  /**
   * 🗑️ 알림 삭제
   */
  async deleteNotification(notificationId: string): Promise<NotificationApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        console.error('알림 삭제 실패:', error)
        return { data: null, error: '알림 삭제에 실패했습니다', success: false }
      }

      return { data: true, error: null, success: true }

    } catch (error) {
      console.error('알림 삭제 중 오류:', error)
      return { data: null, error: '알림 삭제 중 오류가 발생했습니다', success: false }
    }
  }

  /**
   * 📊 알림 통계 조회
   */
  async getNotificationStats(userId: string): Promise<NotificationApiResponse<NotificationStats>> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('is_read')
        .eq('user_id', userId)

      if (error) {
        console.error('알림 통계 조회 실패:', error)
        return { data: null, error: '통계 조회에 실패했습니다', success: false }
      }

      const total = data.length
      const unread = data.filter(item => !item.is_read).length

      const stats: NotificationStats = {
        total_notifications: total,
        unread_notifications: unread
      }

      return { data: stats, error: null, success: true }

    } catch (error) {
      console.error('알림 통계 조회 중 오류:', error)
      return { data: null, error: '통계 조회 중 오류가 발생했습니다', success: false }
    }
  }

  /**
   * 🎯 미션 제안 승인 알림 생성 (헬퍼 메소드)
   */
  async createApprovalNotification(
    childId: string, 
    proposalTitle: string, 
    category: string,
    reward: number,
    startDate: string
  ): Promise<NotificationApiResponse<Notification>> {
    return this.createNotification({
      user_id: childId,
      type: 'proposal_approved',
      title: '🎉 미션 제안이 승인되었어요!',
      message: `"${proposalTitle}" 미션이 승인되어 미션 목록에 추가되었습니다.`,
      data: {
        proposal_title: proposalTitle,
        category,
        reward,
        start_date: startDate
      }
    })
  }

  /**
   * 🚫 미션 제안 거절 알림 생성 (헬퍼 메소드)  
   */
  async createRejectionNotification(
    childId: string,
    proposalTitle: string,
    category: string,
    rejectionReason: string
  ): Promise<NotificationApiResponse<Notification>> {
    return this.createNotification({
      user_id: childId,
      type: 'proposal_rejected',
      title: '💭 미션 제안이 거절되었어요',
      message: `"${proposalTitle}" 미션 제안에 대한 부모님의 의견을 확인해보세요.`,
      data: {
        proposal_title: proposalTitle,
        category,
        rejection_reason: rejectionReason
      }
    })
  }
}

// 싱글톤 인스턴스
const notificationService = new NotificationService()
export default notificationService