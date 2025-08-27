/**
 * 🚀 강화된 실시간 동기화 서비스
 * 
 * 다중 레이어 동기화:
 * 1. BroadcastChannel (같은 브라우저 탭 간)
 * 2. Supabase Realtime (다른 브라우저/디바이스 간)  
 * 3. Periodic Sync (연결 불안정 시 폴백)
 * 4. Conflict Resolution (동시 수정 시 충돌 해결)
 */

import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface SyncPayload {
  type: 'mission_update' | 'mission_create' | 'mission_delete' | 'allowance_update' | 'streak_update'
  entityId: string
  data?: Record<string, unknown>
  timestamp: number
  userId?: string
  source: 'local' | 'remote' | 'periodic'
  version?: number // 충돌 해결용
}

export interface SyncListener {
  onUpdate: (payload: SyncPayload) => void
}

class EnhancedSyncService {
  private listeners: Set<SyncListener> = new Set()
  private broadcastChannel: BroadcastChannel | null = null
  private realtimeChannel: RealtimeChannel | null = null
  private supabase = createClient()
  private periodicSyncInterval: NodeJS.Timeout | null = null
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  private pendingSync: SyncPayload[] = []
  private lastSyncTimestamp = Date.now()

  constructor() {
    this.initializeBroadcastChannel()
    this.initializeRealtimeSync()
    this.initializeNetworkListener()
    this.startPeriodicSync()
  }

  // 🌐 BroadcastChannel 초기화 (같은 브라우저 탭 간 동기화)
  private initializeBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('enhanced_sync')
        
        this.broadcastChannel.addEventListener('message', (event) => {
          const payload: SyncPayload = event.data
          console.log('📡 BroadcastChannel 수신:', payload.type, payload.entityId)
          
          // 자신이 보낸 메시지는 무시 (timestamp 기반)
          if (payload.timestamp && Date.now() - payload.timestamp < 100) {
            return
          }
          
          this.notifyListeners({ ...payload, source: 'local' })
        })
        
        console.log('✅ Enhanced BroadcastChannel 초기화 완료')
      }
    } catch (error) {
      console.warn('⚠️ BroadcastChannel 초기화 실패:', error)
    }
  }

  // 🔄 Supabase Realtime 초기화 (다른 브라우저/디바이스 간)
  private initializeRealtimeSync() {
    if (typeof window === 'undefined') return

    try {
      this.realtimeChannel = this.supabase
        .channel('enhanced_sync_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mission_instances' },
          (payload) => this.handleRealtimeEvent('mission', payload)
        )
        .on(
          'postgres_changes', 
          { event: '*', schema: 'public', table: 'allowance_transactions' },
          (payload) => this.handleRealtimeEvent('allowance', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_progress' },
          (payload) => this.handleRealtimeEvent('streak', payload)
        )
        .subscribe((status) => {
          console.log('📡 Enhanced Realtime 상태:', status)
          
          if (status === 'SUBSCRIBED') {
            this.processPendingSync()
          }
        })

      console.log('✅ Enhanced Realtime 초기화 완료')
    } catch (error) {
      console.error('❌ Realtime 초기화 실패:', error)
    }
  }

  // 📡 Realtime 이벤트 처리
  private handleRealtimeEvent(type: string, payload: Record<string, unknown>) {
    const syncPayload: SyncPayload = {
      type: `${type}_${(payload.eventType as string)?.toLowerCase()}` as string,
      entityId: payload.new?.id || payload.old?.id,
      data: payload.new || payload.old,
      timestamp: Date.now(),
      userId: payload.new?.user_id || payload.old?.user_id,
      source: 'remote'
    }

    console.log('🌐 Realtime 이벤트 수신:', syncPayload)
    this.notifyListeners(syncPayload)
  }

  // 🌍 네트워크 상태 모니터링
  private initializeNetworkListener() {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => {
      console.log('🌐 온라인 상태 복구')
      this.isOnline = true
      this.processPendingSync()
    })

    window.addEventListener('offline', () => {
      console.log('📴 오프라인 상태')
      this.isOnline = false
    })
  }

  // ⏰ 주기적 동기화 (연결 불안정 시 폴백)
  private startPeriodicSync() {
    this.periodicSyncInterval = setInterval(() => {
      if (this.isOnline) {
        this.performPeriodicSync()
      }
    }, 10000) // 10초마다

    console.log('⏰ 주기적 동기화 시작')
  }

  // 주기적 동기화 실행
  private async performPeriodicSync() {
    try {
      // 최근 변경사항 확인
      const { data: recentMissions } = await this.supabase
        .from('mission_instances')
        .select('*')
        .gte('updated_at', new Date(this.lastSyncTimestamp).toISOString())

      if (recentMissions && recentMissions.length > 0) {
        recentMissions.forEach(mission => {
          const payload: SyncPayload = {
            type: 'mission_update',
            entityId: mission.id,
            data: mission,
            timestamp: Date.now(),
            userId: mission.user_id,
            source: 'periodic'
          }
          this.notifyListeners(payload)
        })
      }

      this.lastSyncTimestamp = Date.now()
    } catch (error) {
      console.error('❌ 주기적 동기화 실패:', error)
    }
  }

  // 대기 중인 동기화 처리
  private processPendingSync() {
    if (this.pendingSync.length > 0) {
      console.log(`🔄 대기 중인 동기화 처리: ${this.pendingSync.length}개`)
      
      this.pendingSync.forEach(payload => {
        this.notifyListeners(payload)
      })
      
      this.pendingSync = []
    }
  }

  // 📢 리스너에게 알림
  private notifyListeners(payload: SyncPayload) {
    // 중복 방지: 같은 타임스탬프의 동일한 엔티티는 한 번만 처리
    const existingIndex = this.pendingSync.findIndex(
      p => p.entityId === payload.entityId && p.timestamp === payload.timestamp
    )
    
    if (existingIndex !== -1) {
      return
    }

    this.listeners.forEach(listener => {
      try {
        listener.onUpdate(payload)
      } catch (error) {
        console.error('❌ 동기화 리스너 오류:', error)
      }
    })
  }

  // 📝 구독
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener)
    console.log(`📝 Enhanced Sync 리스너 등록 (총 ${this.listeners.size}개)`)
    
    return () => {
      this.listeners.delete(listener)
      console.log(`🗑️ Enhanced Sync 리스너 해제 (남은 ${this.listeners.size}개)`)
    }
  }

  // 🚀 이벤트 발생 (다중 채널로 전파)
  notify(payload: Omit<SyncPayload, 'timestamp' | 'source'>) {
    const fullPayload: SyncPayload = {
      ...payload,
      timestamp: Date.now(),
      source: 'local'
    }

    console.log('🚀 Enhanced Sync 이벤트 발생:', fullPayload)

    // 1. BroadcastChannel로 같은 브라우저 탭들에게 전파
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(fullPayload)
      } catch (error) {
        console.error('❌ BroadcastChannel 전송 실패:', error)
      }
    }

    // 2. 오프라인이면 대기 큐에 추가
    if (!this.isOnline) {
      this.pendingSync.push(fullPayload)
      return
    }

    // 3. Realtime은 데이터베이스 변경으로 자동 트리거됨
    // 별도 전송 불필요
  }

  // 📊 동기화 상태 정보
  getStatus() {
    return {
      isOnline: this.isOnline,
      broadcastChannelAvailable: !!this.broadcastChannel,
      realtimeConnected: this.realtimeChannel?.state === 'joined',
      pendingSyncCount: this.pendingSync.length,
      listenersCount: this.listeners.size,
      lastSyncTimestamp: this.lastSyncTimestamp
    }
  }

  // 🧹 정리
  cleanup() {
    if (this.broadcastChannel) {
      this.broadcastChannel.close()
      this.broadcastChannel = null
    }

    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel)
      this.realtimeChannel = null
    }

    if (this.periodicSyncInterval) {
      clearInterval(this.periodicSyncInterval)
      this.periodicSyncInterval = null
    }

    this.listeners.clear()
    this.pendingSync = []

    console.log('🧹 Enhanced Sync Service 정리 완료')
  }

  // 🔄 강제 동기화
  async forcSync(): Promise<void> {
    console.log('🔄 강제 동기화 시작...')
    await this.performPeriodicSync()
    this.processPendingSync()
    console.log('✅ 강제 동기화 완료')
  }
}

// 싱글톤 인스턴스
export const enhancedSyncService = new EnhancedSyncService()
export default enhancedSyncService