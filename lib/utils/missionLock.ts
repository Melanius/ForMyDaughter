/**
 * 🔒 미션 생성 락(Lock) 시스템
 * 데일리 미션 중복 생성 방지를 위한 동시 실행 제어
 */

interface MissionLockState {
  userId: string
  date: string
  isLocked: boolean
  lockedAt: number
  lockDuration: number // 5분 (300초)
}

class MissionLockManager {
  private static instance: MissionLockManager
  private locks: Map<string, MissionLockState> = new Map()
  private readonly LOCK_DURATION = 5 * 60 * 1000 // 5분

  private constructor() {}

  static getInstance(): MissionLockManager {
    if (!MissionLockManager.instance) {
      MissionLockManager.instance = new MissionLockManager()
    }
    return MissionLockManager.instance
  }

  /**
   * 미션 생성 락 키 생성
   */
  private getLockKey(userId: string, date: string): string {
    return `daily_mission_${userId}_${date}`
  }

  /**
   * 락 획득 시도
   * @param userId 사용자 ID
   * @param date 날짜 (YYYY-MM-DD)
   * @returns 락 획득 성공 여부
   */
  acquireLock(userId: string, date: string): boolean {
    const lockKey = this.getLockKey(userId, date)
    const now = Date.now()
    const existingLock = this.locks.get(lockKey)

    // 기존 락이 있고 아직 유효한 경우
    if (existingLock && existingLock.isLocked) {
      const lockAge = now - existingLock.lockedAt
      if (lockAge < this.LOCK_DURATION) {
        return false // 락 획득 실패
      } else {
        // 락이 만료된 경우 자동 해제
        this.locks.delete(lockKey)
      }
    }

    // 새로운 락 생성
    this.locks.set(lockKey, {
      userId,
      date,
      isLocked: true,
      lockedAt: now,
      lockDuration: this.LOCK_DURATION
    })

    return true // 락 획득 성공
  }

  /**
   * 락 해제
   * @param userId 사용자 ID
   * @param date 날짜 (YYYY-MM-DD)
   */
  releaseLock(userId: string, date: string): void {
    const lockKey = this.getLockKey(userId, date)
    this.locks.delete(lockKey)
  }

  /**
   * 락 상태 확인
   * @param userId 사용자 ID
   * @param date 날짜 (YYYY-MM-DD)
   * @returns 락 상태
   */
  isLocked(userId: string, date: string): boolean {
    const lockKey = this.getLockKey(userId, date)
    const lock = this.locks.get(lockKey)
    
    if (!lock || !lock.isLocked) {
      return false
    }

    const lockAge = Date.now() - lock.lockedAt
    if (lockAge >= this.LOCK_DURATION) {
      this.locks.delete(lockKey)
      return false
    }

    return true
  }

  /**
   * 만료된 락 정리 (가비지 컬렉션)
   */
  cleanupExpiredLocks(): void {
    const now = Date.now()
    for (const [key, lock] of this.locks.entries()) {
      const lockAge = now - lock.lockedAt
      if (lockAge >= this.LOCK_DURATION) {
        this.locks.delete(key)
      }
    }
  }
}

export const missionLockManager = MissionLockManager.getInstance()

/**
 * 데일리 미션 생성을 락으로 보호하는 래퍼 함수
 * @param userId 사용자 ID
 * @param date 날짜 (YYYY-MM-DD)
 * @param generateFunction 미션 생성 함수
 * @returns 미션 생성 결과
 */
export async function withMissionLock<T>(
  userId: string,
  date: string,
  generateFunction: () => Promise<T>
): Promise<T | null> {
  // 락 획득 시도
  if (!missionLockManager.acquireLock(userId, date)) {
    console.log(`🔒 미션 생성 락이 이미 존재함: ${userId}, ${date}`)
    return null
  }

  try {
    console.log(`🔓 미션 생성 락 획득 성공: ${userId}, ${date}`)
    const result = await generateFunction()
    console.log(`✅ 미션 생성 완료: ${userId}, ${date}`)
    return result
  } catch (error) {
    console.error(`❌ 미션 생성 실패: ${userId}, ${date}`, error)
    throw error
  } finally {
    // 항상 락 해제
    missionLockManager.releaseLock(userId, date)
    console.log(`🔓 미션 생성 락 해제: ${userId}, ${date}`)
  }
}

// 주기적으로 만료된 락 정리 (5분마다)
if (typeof window !== 'undefined') {
  setInterval(() => {
    missionLockManager.cleanupExpiredLocks()
  }, 5 * 60 * 1000)
}