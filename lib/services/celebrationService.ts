/**
 * 🎉 축하 알림 서비스
 * 부모의 용돈 전달 완료 시 자녀에게 실시간 축하 메시지 전송
 */

import { createClient } from '@/lib/supabase/client'
import { CelebrationPayload, RealtimeCelebrationEvent } from '../types/celebration'
import { nowKST } from '../utils/dateUtils'
import { missionLogger } from '../utils/logger'

export class CelebrationService {
  private supabase = createClient()
  private channelName = 'celebration_channel'

  /**
   * 🎉 축하 알림 브로드캐스트 (부모 → 자녀)
   */
  async sendCelebrationNotification(recipientId: string, amount: number, missionCount: number): Promise<void> {
    try {
      const payload: CelebrationPayload = {
        type: 'allowance_transferred',
        recipientId,
        amount,
        missionCount,
        timestamp: nowKST()
      }

      missionLogger.log('🎉 축하 알림 전송 시작:', payload)

      // Supabase 실시간 브로드캐스트
      const channel = this.supabase.channel(this.channelName)
      
      await channel.send({
        type: 'broadcast',
        event: 'celebration',
        payload
      })

      missionLogger.log('✅ 축하 알림 전송 완료')
    } catch (error) {
      missionLogger.error('❌ 축하 알림 전송 실패:', error)
      throw error
    }
  }

  /**
   * 🎧 축하 알림 리스너 등록 (자녀용)
   */
  subscribeTocelebrations(
    userId: string,
    onCelebration: (payload: CelebrationPayload) => void
  ) {
    missionLogger.log('🎧 축하 알림 리스너 등록:', userId)

    const channel = this.supabase
      .channel(this.channelName)
      .on(
        'broadcast',
        { event: 'celebration' },
        (event: RealtimeCelebrationEvent) => {
          const { payload } = event
          
          // 해당 자녀에게만 알림 전달
          if (payload.recipientId === userId) {
            missionLogger.log('🎉 축하 알림 수신:', payload)
            onCelebration(payload)
          }
        }
      )
      .subscribe()

    return channel
  }

  /**
   * 🧹 리스너 정리
   */
  unsubscribe(channel: any) {
    if (channel) {
      channel.unsubscribe()
      missionLogger.log('🧹 축하 알림 리스너 정리 완료')
    }
  }
}

// 싱글톤 인스턴스
const celebrationService = new CelebrationService()
export default celebrationService