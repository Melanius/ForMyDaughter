/**
 * 브라우저 탭 간 실시간 동기화 서비스
 * localStorage 이벤트와 BroadcastChannel API를 사용하여
 * 동일한 브라우저의 다른 탭 간에 실시간 데이터 동기화를 제공
 */

export interface MissionSyncPayload {
  type: 'mission_update' | 'mission_create' | 'mission_delete'
  missionId: string
  data?: {
    isCompleted?: boolean
    completedAt?: string | null
    isTransferred?: boolean
    [key: string]: unknown
  }
  timestamp: number
  userId?: string
  date?: string
}

export interface SyncListener {
  onMissionUpdate: (payload: MissionSyncPayload) => void
}

class SyncService {
  private listeners: Set<SyncListener> = new Set()
  private broadcastChannel: BroadcastChannel | null = null
  private storageKey = 'mission_sync_event'

  constructor() {
    this.initializeBroadcastChannel()
    this.initializeStorageListener()
  }

  // BroadcastChannel 초기화 (최신 브라우저용)
  private initializeBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('mission_sync')
        this.broadcastChannel.addEventListener('message', (event) => {
          console.log('📡 BroadcastChannel 메시지 수신:', event.data)
          this.notifyListeners(event.data)
        })
        console.log('✅ BroadcastChannel 초기화 완료')
      }
    } catch (error) {
      console.warn('⚠️ BroadcastChannel 초기화 실패:', error)
    }
  }

  // localStorage 이벤트 리스너 초기화 (구형 브라우저 지원)
  private initializeStorageListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === this.storageKey && event.newValue) {
          try {
            // 빈 문자열이나 공백 문자열 체크
            const cleanValue = event.newValue.trim()
            if (!cleanValue) {
              console.warn('⚠️ localStorage에서 빈 값 감지, 무시함')
              return
            }
            
            const payload: MissionSyncPayload = JSON.parse(cleanValue)
            console.log('📦 localStorage 동기화 이벤트 수신:', payload)
            this.notifyListeners(payload)
          } catch (error) {
            console.error('❌ localStorage 이벤트 파싱 실패:', error, 'Raw value:', event.newValue)
          }
        }
      })
      console.log('✅ Storage 이벤트 리스너 설정 완료')
    }
  }

  // 리스너에게 이벤트 알림
  private notifyListeners(payload: MissionSyncPayload) {
    this.listeners.forEach(listener => {
      try {
        listener.onMissionUpdate(payload)
      } catch (error) {
        console.error('❌ 동기화 리스너 실행 오류:', error)
      }
    })
  }

  // 리스너 등록
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener)
    console.log(`📝 동기화 리스너 등록 (총 ${this.listeners.size}개)`)
    
    // 구독 해제 함수 반환
    return () => {
      this.listeners.delete(listener)
      console.log(`🗑️ 동기화 리스너 해제 (남은 ${this.listeners.size}개)`)
    }
  }

  // 미션 업데이트 이벤트 발생
  notifyMissionUpdate(missionId: string, data: Record<string, unknown>, userId?: string, date?: string) {
    const payload: MissionSyncPayload = {
      type: 'mission_update',
      missionId,
      data,
      timestamp: Date.now()
    }
    
    // Only add optional properties if they have values
    if (userId) {
      payload.userId = userId
    }
    if (date) {
      (payload as unknown as Record<string, unknown>)['date'] = date // Type assertion to add the date property
    }

    console.log('🔥 미션 업데이트 이벤트 발생:', payload)
    this.broadcastEvent(payload)
  }

  // 미션 생성 이벤트 발생
  notifyMissionCreate(missionId: string, data: Record<string, unknown>, userId?: string, date?: string) {
    const payload: MissionSyncPayload = {
      type: 'mission_create',
      missionId,
      data,
      timestamp: Date.now()
    }
    
    // Only add optional properties if they have values
    if (userId) {
      payload.userId = userId
    }
    if (date) {
      (payload as unknown as Record<string, unknown>)['date'] = date // Type assertion to add the date property
    }

    console.log('➕ 미션 생성 이벤트 발생:', payload)
    this.broadcastEvent(payload)
  }

  // 미션 삭제 이벤트 발생
  notifyMissionDelete(missionId: string, userId?: string, date?: string) {
    const payload: MissionSyncPayload = {
      type: 'mission_delete',
      missionId,
      timestamp: Date.now()
    }
    
    // Only add optional properties if they have values
    if (userId) {
      payload.userId = userId
    }
    if (date) {
      (payload as unknown as Record<string, unknown>)['date'] = date // Type assertion to add the date property
    }

    console.log('❌ 미션 삭제 이벤트 발생:', payload)
    this.broadcastEvent(payload)
  }

  // 이벤트를 모든 탭에 브로드캐스트
  private broadcastEvent(payload: MissionSyncPayload) {
    // BroadcastChannel 사용 (현재 탭 제외)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload)
      } catch (error) {
        console.error('❌ BroadcastChannel 전송 실패:', error)
      }
    }

    // localStorage 이벤트 사용 (폴백)
    try {
      // localStorage에 임시로 저장했다가 즉시 삭제하여 이벤트 트리거
      localStorage.setItem(this.storageKey, JSON.stringify(payload))
      setTimeout(() => {
        localStorage.removeItem(this.storageKey)
      }, 100)
    } catch (error) {
      console.error('❌ localStorage 이벤트 발생 실패:', error)
    }
  }

  // 주기적 동기화 (필요시)
  startPeriodicSync(intervalMs: number = 30000): () => void {
    const interval = setInterval(() => {
      // 필요시 데이터베이스에서 변경사항 확인
      console.log('🔄 주기적 동기화 체크')
      // 실제 구현은 필요에 따라 추가
    }, intervalMs)

    console.log(`⏰ 주기적 동기화 시작 (${intervalMs}ms 간격)`)

    // 정지 함수 반환
    return () => {
      clearInterval(interval)
      console.log('⏹️ 주기적 동기화 정지')
    }
  }

  // 정리
  cleanup() {
    if (this.broadcastChannel) {
      this.broadcastChannel.close()
      this.broadcastChannel = null
    }
    this.listeners.clear()
    console.log('🧹 SyncService 정리 완료')
  }
}

// 싱글톤 인스턴스
export const syncService = new SyncService()
export default syncService