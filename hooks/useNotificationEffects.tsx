'use client'

import { useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { usePendingProposals } from '@/hooks/useMissionProposals'
import { useRejectionNotifications } from '@/hooks/useRejectionNotifications'

import { Notification } from '@/lib/types/notification'

interface UseNotificationEffectsProps {
  openProposalNotification: () => void
  openRejectionNotification: (notification: Notification) => void
  resetAllModals: () => void
}

export function useNotificationEffects({
  openProposalNotification,
  openRejectionNotification,
  resetAllModals
}: UseNotificationEffectsProps) {
  const { profile } = useAuth()

  // 부모 계정 미션 제안 확인
  const { 
    data: pendingProposals = [], 
    isLoading: isLoadingProposals 
  } = usePendingProposals(['father', 'mother'].includes(profile?.user_type || '') ? profile?.id : undefined)

  // 자녀 계정 거절 알림 확인
  const {
    data: rejectionNotifications = [],
    isLoading: isLoadingRejections
  } = useRejectionNotifications()

  // 사용자 타입 변경 시 모든 모달 상태 초기화
  useEffect(() => {
    resetAllModals()
  }, [profile?.user_type, resetAllModals])

  // 부모 로그인 시 대기 중인 제안 알림
  useEffect(() => {
    if (['father', 'mother'].includes(profile?.user_type || '') && 
        pendingProposals.length > 0 && 
        !isLoadingProposals) {
      // 로그인 후 잠시 지연해서 알림 표시 (UX 개선)
      const timer = setTimeout(() => {
        openProposalNotification()
      }, 1500)
      
      return () => clearTimeout(timer)
    }
  }, [profile?.user_type, pendingProposals.length, isLoadingProposals, openProposalNotification])

  // 자녀 로그인 시 거절 알림 체크
  useEffect(() => {
    if (['son', 'daughter'].includes(profile?.user_type || '') && 
        rejectionNotifications.length > 0 && 
        !isLoadingRejections) {
      // 가장 최신 거절 알림 선택
      const latestNotification = rejectionNotifications[0]
      
      // 로그인 후 잠시 지연해서 알림 표시 (UX 개선)
      const timer = setTimeout(() => {
        openRejectionNotification(latestNotification)
      }, 2000) // 다른 모달들과 겹치지 않도록 2초 지연
      
      return () => clearTimeout(timer)
    }
  }, [profile?.user_type, rejectionNotifications.length, isLoadingRejections, openRejectionNotification])

  return {
    pendingProposals,
    rejectionNotifications
  }
}