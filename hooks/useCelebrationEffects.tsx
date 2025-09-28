'use client'

import { useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { celebrationService, CelebrationPayload } from '@/lib/services/celebrationService'
import { settlementService } from '@/lib/services/settlementService'
import { logger } from '@/lib/utils/logger'
import { Mission } from '@/lib/types/common'

interface CelebrationData {
  amount: number
  missionCount: number
}

interface UseCelebrationEffectsProps {
  missions: Mission[]
  openCelebrationModal: (data: CelebrationData) => void
}

export function useCelebrationEffects({
  missions,
  openCelebrationModal
}: UseCelebrationEffectsProps) {
  const { profile } = useAuth()

  // 자녀 계정일 때 축하 알림 리스너 설정
  useEffect(() => {
    if (!['son', 'daughter'].includes(profile?.user_type || '')) return

    const handleCelebration = (payload: CelebrationPayload) => {
      openCelebrationModal({
        amount: payload.amount,
        missionCount: payload.missionCount
      })
    }

    const channel = celebrationService.subscribeTocelebrations(profile?.id || '', handleCelebration)

    return () => {
      celebrationService.unsubscribe(channel)
    }
  }, [profile?.id, profile?.user_type, openCelebrationModal])

  // 자녀 계정의 미션 완료 시 자동 정산 체크 (부모에게 알림)
  useEffect(() => {
    if (!['son', 'daughter'].includes(profile?.user_type || '') || !profile?.parent_id) return

    const checkAutoSettlement = async () => {
      try {
        const settlementCheck = await settlementService.shouldTriggerAutoSettlement(profile?.id || '')
        
        if (settlementCheck.shouldTrigger) {
          logger.log('모든 미션 완료 - 자동 정산 알림 전송')
          
          // 부모에게 축하 알림 전송 (용돈 전달 팝업 트리거)
          await celebrationService.sendCelebrationNotification(
            profile.parent_id || '',
            settlementCheck.pendingSettlement.totalAmount,
            settlementCheck.pendingSettlement.totalCount
          )
          
          logger.log('부모에게 정산 알림 전송 완료', { amount: settlementCheck.pendingSettlement.totalAmount })
        }
      } catch (error) {
        console.error('자동 정산 체크 실패:', error)
      }
    }

    // 미션 상태가 변경될 때마다 체크
    checkAutoSettlement()
  }, [missions, profile?.id, profile?.user_type, profile?.parent_id])
}