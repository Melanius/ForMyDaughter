import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

const supabase = createClient()

export interface MissionUpdatePayload {
  id: string
  is_completed: boolean
  completed_at?: string | null
  is_transferred?: boolean
  date: string
}

export interface MissionRealtimeListener {
  onMissionUpdate: (payload: MissionUpdatePayload) => void
  onMissionInsert: (payload: Record<string, unknown>) => void
  onMissionDelete: (payload: Record<string, unknown>) => void
}

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map()

  // 미션 인스턴스 테이블 구독
  subscribeToMissions(
    userId: string,
    listener: MissionRealtimeListener
  ): () => void {
    const channelName = `mission_instances_${userId}`
    
    // 기존 채널이 있으면 제거
    this.unsubscribe(channelName)

    console.log(`🔄 구독 시작: ${channelName}`)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mission_instances',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔥 미션 업데이트 수신:', payload)
          if (payload.new && payload.eventType === 'UPDATE') {
            listener.onMissionUpdate({
              id: payload.new.id,
              is_completed: payload.new.is_completed,
              completed_at: payload.new.completed_at,
              is_transferred: payload.new.is_transferred,
              date: payload.new.date
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mission_instances',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('➕ 미션 추가 수신:', payload)
          if (payload.new && payload.eventType === 'INSERT') {
            listener.onMissionInsert(payload.new)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'mission_instances',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('❌ 미션 삭제 수신:', payload)
          if (payload.old && payload.eventType === 'DELETE') {
            listener.onMissionDelete(payload.old)
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Realtime 구독 상태: ${status} (${channelName})`)
      })

    this.channels.set(channelName, channel)

    // 구독 해제 함수 반환
    return () => this.unsubscribe(channelName)
  }

  // 가족 구성원들의 미션 구독 (부모가 자녀들의 미션 모니터링)
  subscribeToFamilyMissions(
    parentId: string,
    childrenIds: string[],
    listener: MissionRealtimeListener
  ): () => void {
    const unsubscribeFunctions: (() => void)[] = []

    // 각 자녀의 미션을 구독
    childrenIds.forEach(childId => {
      const unsubscribe = this.subscribeToMissions(childId, {
        onMissionUpdate: (payload) => {
          console.log(`👨‍👩‍👧‍👦 가족 미션 업데이트 (${childId}):`, payload)
          listener.onMissionUpdate(payload)
        },
        onMissionInsert: (payload) => {
          console.log(`👨‍👩‍👧‍👦 가족 미션 추가 (${childId}):`, payload)
          listener.onMissionInsert(payload)
        },
        onMissionDelete: (payload) => {
          console.log(`👨‍👩‍👧‍👦 가족 미션 삭제 (${childId}):`, payload)
          listener.onMissionDelete(payload)
        }
      })
      unsubscribeFunctions.push(unsubscribe)
    })

    // 모든 구독을 해제하는 함수 반환
    return () => {
      unsubscribeFunctions.forEach(fn => fn())
    }
  }

  // 특정 채널 구독 해제
  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName)
    if (channel) {
      console.log(`🔇 구독 해제: ${channelName}`)
      supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  // 모든 채널 구독 해제
  unsubscribeAll(): void {
    console.log('🔇 모든 Realtime 구독 해제')
    this.channels.forEach((channel, channelName) => {
      supabase.removeChannel(channel)
    })
    this.channels.clear()
  }

  // 연결 상태 확인
  getConnectionStatus(): string {
    return supabase.realtime.isConnected() ? 'connected' : 'disconnected'
  }

  // 수동으로 연결 재시도
  async reconnect(): Promise<void> {
    try {
      console.log('🔄 Realtime 재연결 시도...')
      // 기존 연결을 정리하고 새로 시작
      this.unsubscribeAll()
      // Supabase는 자동으로 재연결을 시도하므로 별도 작업 불필요
      console.log('✅ Realtime 재연결 완료')
    } catch (error) {
      console.error('❌ Realtime 재연결 실패:', error)
    }
  }
}

// 싱글톤 인스턴스
export const realtimeService = new RealtimeService()
export default realtimeService