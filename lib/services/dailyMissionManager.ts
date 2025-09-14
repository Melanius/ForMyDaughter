/**
 * 🎯 통합 데일리 미션 관리자
 * 중복 생성 방지 및 단일 책임 원칙 적용
 */

import { withMissionLock } from '../utils/missionLock'
import missionSupabaseService from './missionSupabase'
import { getTodayKST } from '../utils/dateUtils'
import { missionLogger } from '../utils/logger'
import { isParentRole, isChildRole } from '../utils/roleUtils'

export class DailyMissionManager {
  private static instance: DailyMissionManager

  private constructor() {}

  static getInstance(): DailyMissionManager {
    if (!DailyMissionManager.instance) {
      DailyMissionManager.instance = new DailyMissionManager()
    }
    return DailyMissionManager.instance
  }

  /**
   * 🎯 데일리 미션 자동 생성 (중복 방지)
   * @param userId 사용자 ID
   * @param date 날짜 (선택적, 기본값: 오늘)
   * @returns 생성된 미션 개수
   */
  async ensureDailyMissions(userId: string, date?: string): Promise<number> {
    const targetDate = date || getTodayKST()
    
    missionLogger.log(`🎯 데일리 미션 자동 생성 요청: userId=${userId}, date=${targetDate}`)

    // 락으로 보호된 미션 생성
    const result = await withMissionLock(userId, targetDate, async () => {
      return await this.generateDailyMissionsInternal(userId, targetDate)
    })

    return result ?? 0
  }

  /**
   * 🔍 오늘의 데일리 미션 존재 여부 확인
   * @param userId 사용자 ID (선택적)
   * @param date 날짜 (선택적, 기본값: 오늘)
   * @returns 데일리 미션 개수
   */
  async checkExistingDailyMissions(userId?: string, date?: string): Promise<number> {
    const targetDate = date || getTodayKST()
    
    try {
      const missions = await missionSupabaseService.getFamilyMissionInstances(targetDate)
      const dailyMissions = missions.filter(m => {
        const isDaily = m.missionType === 'daily'
        const isForUser = userId ? m.userId === userId : true
        return isDaily && isForUser
      })
      
      missionLogger.log(`🔍 기존 데일리 미션 확인: ${dailyMissions.length}개 (date=${targetDate}, userId=${userId || 'all'})`)
      return dailyMissions.length
    } catch (error) {
      missionLogger.error('기존 데일리 미션 확인 실패:', error)
      return 0
    }
  }

  /**
   * 🏠 가족 전체의 데일리 미션 확보
   * 부모가 사용하거나 자녀 로그인 시 호출
   * @param date 날짜 (선택적, 기본값: 오늘)
   * @returns 생성된 총 미션 개수
   */
  async ensureFamilyDailyMissions(date?: string): Promise<number> {
    const targetDate = date || getTodayKST()
    
    try {
      // 현재 사용자 정보 획득
      const { profile, childrenIds } = await missionSupabaseService.getCurrentUser()
      
      let totalCreated = 0
      let targetUserIds: string[] = []

      if (isParentRole(profile.user_type)) {
        // 부모: 모든 자녀에게 미션 생성
        targetUserIds = childrenIds
        missionLogger.log(`👨‍👩‍👧‍👦 부모 계정: ${childrenIds.length}명의 자녀에게 미션 생성`)
      } else {
        // 자녀: 본인에게만 미션 생성
        targetUserIds = [profile.id]
        missionLogger.log(`👦 자녀 계정: 본인에게만 미션 생성`)
      }

      // 각 사용자별로 미션 생성
      for (const userId of targetUserIds) {
        const created = await this.ensureDailyMissions(userId, targetDate)
        totalCreated += created
      }

      missionLogger.log(`✨ 가족 데일리 미션 생성 완료: 총 ${totalCreated}개`)
      return totalCreated

    } catch (error) {
      missionLogger.error('가족 데일리 미션 생성 실패:', error)
      throw error
    }
  }

  /**
   * 🔧 내부 미션 생성 로직 (락으로 보호됨)
   * @private
   */
  private async generateDailyMissionsInternal(userId: string, date: string): Promise<number> {
    try {
      missionLogger.log(`🛠️ 내부 미션 생성 시작: userId=${userId}, date=${date}`)

      // 1. 기존 미션 중복 체크
      const existingCount = await this.checkExistingDailyMissions(userId, date)
      if (existingCount > 0) {
        missionLogger.log(`✅ 기존 데일리 미션 존재 (${existingCount}개), 생성 건너뜀`)
        return 0
      }

      // 2. 템플릿 기반 미션 생성
      const createdCount = await missionSupabaseService.generateDailyMissions(date)
      
      missionLogger.log(`✨ 새로운 데일리 미션 생성 완료: ${createdCount}개`)
      return createdCount

    } catch (error) {
      missionLogger.error('내부 미션 생성 실패:', error)
      throw error
    }
  }
}

// 싱글톤 인스턴스 익스포트
export const dailyMissionManager = DailyMissionManager.getInstance()

/**
 * 🚀 자녀 로그인 시 데일리 미션 체크 (AuthProvider용)
 * @param userId 자녀 사용자 ID
 * @param date 날짜 (선택적)
 */
export async function checkDailyMissionsOnChildLogin(userId: string, date?: string): Promise<void> {
  try {
    missionLogger.log(`👦 자녀 로그인 데일리 미션 체크: userId=${userId}`)
    
    const targetDate = date || getTodayKST()
    const existingCount = await dailyMissionManager.checkExistingDailyMissions(userId, targetDate)
    
    if (existingCount === 0) {
      missionLogger.warn(`🚨 자녀 ${userId}의 데일리 미션 없음 - 자동 생성`)
      const created = await dailyMissionManager.ensureDailyMissions(userId, targetDate)
      missionLogger.log(`✨ 자녀 로그인 미션 생성 완료: ${created}개`)
    } else {
      missionLogger.log(`✅ 자녀 ${userId}의 데일리 미션 확인됨: ${existingCount}개`)
    }
  } catch (error) {
    missionLogger.error('자녀 로그인 미션 체크 실패:', error)
  }
}