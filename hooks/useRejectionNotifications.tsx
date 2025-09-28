/**
 * 🚫 거절 알림 시스템 React Query 훅
 * 
 * 자녀 계정용 미션 제안 거절 알림 관리
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/auth/AuthProvider'
import notificationService from '@/lib/services/notificationService'
import { Notification } from '@/lib/types/notification'
import { isChildRole } from '@/lib/utils/roleUtils'

/**
 * 🔑 Query Keys
 */
export const rejectionNotificationKeys = {
  all: ['rejectionNotifications'] as const,
  unread: (userId?: string) => [...rejectionNotificationKeys.all, 'unread', userId] as const,
}

/**
 * 🚫 읽지 않은 거절 알림 조회 훅 (자녀용)
 */
export function useRejectionNotifications() {
  const { user, profile } = useAuth()

  return useQuery({
    queryKey: rejectionNotificationKeys.unread(user?.id),
    queryFn: async () => {
      if (!user?.id) return []
      
      const response = await notificationService.getUnreadNotifications(user.id)
      if (!response.success) {
        console.error('거절 알림 조회 실패:', response.error)
        return []
      }
      
      // proposal_rejected 타입만 필터링
      const rejectionNotifications = (response.data || []).filter(
        (notification: Notification) => notification.type === 'proposal_rejected'
      )
      
      return rejectionNotifications
    },
    enabled: !!user && isChildRole(profile?.user_type),
    staleTime: 30 * 1000, // 30초
    refetchInterval: 60 * 1000, // 1분마다 자동 갱신
    refetchOnWindowFocus: true
  })
}

/**
 * ✅ 거절 알림 읽음 처리 훅
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await notificationService.markAsRead(notificationId)
      if (!response.success) {
        throw new Error(response.error || '알림 읽음 처리 실패')
      }
      return response.data
    },
    onSuccess: () => {
      // 알림 목록 새로고침
      queryClient.invalidateQueries({ queryKey: rejectionNotificationKeys.all })
      console.log('✅ 거절 알림이 읽음 처리되었습니다')
    },
    onError: (error) => {
      console.error('❌ 알림 읽음 처리 실패:', error)
    }
  })
}

/**
 * 🗑️ 거절 알림 삭제 훅
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await notificationService.deleteNotification(notificationId)
      if (!response.success) {
        throw new Error(response.error || '알림 삭제 실패')
      }
      return response.data
    },
    onSuccess: () => {
      // 알림 목록 새로고침
      queryClient.invalidateQueries({ queryKey: rejectionNotificationKeys.all })
      console.log('✅ 거절 알림이 삭제되었습니다')
    },
    onError: (error) => {
      console.error('❌ 알림 삭제 실패:', error)
    }
  })
}