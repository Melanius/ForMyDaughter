'use client'

import { Mission } from '@/lib/types/mission'
import missionSupabaseService from './missionSupabase'
import { getTodayKST } from '@/lib/utils/dateUtils'

/**
 * 🏦 용돈 정산 서비스
 * 
 * 사용자 요구사항에 따른 정산 로직:
 * 1. 하루 모든 미션 완료 시 자동 정산 알림
 * 2. 일부 미션 완료 시 수동 용돈 요청
 * 3. 누적 미정산 용돈 합산 정산
 */
class SettlementService {
  /**
   * 특정 날짜의 모든 미션 조회 (데일리 + 스페셜)
   */
  async getAllMissionsForDate(userId: string, date: string): Promise<Mission[]> {
    try {
      const allMissions = await missionSupabaseService.getMissionsForDate(userId, date)
      return allMissions
    } catch (error) {
      console.error('특정 날짜 미션 조회 실패:', error)
      return []
    }
  }

  /**
   * 하루의 모든 미션이 완료되었는지 체크
   */
  async checkAllMissionsCompletedForDate(userId: string, date: string): Promise<{
    allCompleted: boolean
    totalMissions: number
    completedMissions: number
    pendingMissions: Mission[]
  }> {
    try {
      const allMissions = await this.getAllMissionsForDate(userId, date)
      const completedMissions = allMissions.filter(m => m.isCompleted && !m.isTransferred)
      const pendingMissions = completedMissions // 완료되었지만 정산되지 않은 미션들
      
      return {
        allCompleted: allMissions.length > 0 && allMissions.every(m => m.isCompleted),
        totalMissions: allMissions.length,
        completedMissions: completedMissions.length,
        pendingMissions
      }
    } catch (error) {
      console.error('미션 완료 체크 실패:', error)
      return {
        allCompleted: false,
        totalMissions: 0,
        completedMissions: 0,
        pendingMissions: []
      }
    }
  }

  /**
   * 모든 미정산 용돈 조회 (누적)
   * 데일리 + 스페셜 미션 모두 포함
   */
  async getAllPendingSettlements(userId: string): Promise<{
    totalAmount: number
    totalCount: number
    missions: Mission[]
    byDate: Record<string, { missions: Mission[], amount: number }>
  }> {
    try {
      // 완료되었지만 정산되지 않은 모든 미션 (날짜 관계없이)
      const pendingMissions = await missionSupabaseService.getAllPendingMissions(userId)
      
      const result = pendingMissions.reduce((acc, mission) => {
        const date = mission.date || 'unknown'
        
        if (!acc.byDate[date]) {
          acc.byDate[date] = { missions: [], amount: 0 }
        }
        
        // Mission 타입으로 변환
        const convertedMission: Mission = {
          id: mission.id,
          userId: mission.userId || userId,
          title: mission.title,
          description: mission.description,
          reward: mission.reward,
          isCompleted: mission.isCompleted,
          completedAt: mission.completedAt || '',
          isTransferred: mission.isTransferred || false,
          category: mission.category,
          missionType: mission.missionType === 'daily' ? '데일리' : '이벤트',
          date: mission.date,
          templateId: mission.templateId
        }
        
        acc.byDate[date].missions.push(convertedMission)
        acc.byDate[date].amount += convertedMission.reward
        acc.totalAmount += convertedMission.reward
        acc.totalCount += 1
        acc.missions.push(convertedMission)
        
        return acc
      }, {
        totalAmount: 0,
        totalCount: 0,
        missions: [] as Mission[],
        byDate: {} as Record<string, { missions: Mission[], amount: number }>
      })

      console.log(`💰 누적 미정산 용돈: ${result.totalAmount}원 (${result.totalCount}개 미션)`)
      
      // 🔍 settlementService 디버깅 로깅 추가
      const dailyMissions = result.missions.filter(m => m.missionType === '데일리')
      const eventMissions = result.missions.filter(m => m.missionType === '이벤트')
      
      console.log(`🔍 settlementService 변환 결과:`)
      console.log(`   - 데일리 미션: ${dailyMissions.length}개 (${dailyMissions.reduce((sum, m) => sum + m.reward, 0)}원)`)
      console.log(`   - 이벤트 미션: ${eventMissions.length}개 (${eventMissions.reduce((sum, m) => sum + m.reward, 0)}원)`)
      console.log(`   - 전체 미션: ${result.totalCount}개 (${result.totalAmount}원)`)
      
      return result
    } catch (error) {
      console.error('미정산 용돈 조회 실패:', error)
      return {
        totalAmount: 0,
        totalCount: 0,
        missions: [],
        byDate: {}
      }
    }
  }

  /**
   * 오늘 미션 완료 상태 체크 및 자동 정산 여부 판단
   */
  async shouldTriggerAutoSettlement(userId: string): Promise<{
    shouldTrigger: boolean
    reason: 'all_completed_today' | 'no_auto_trigger'
    todayStatus: {
      allCompleted: boolean
      totalMissions: number
      completedMissions: number
    }
    pendingSettlement: {
      totalAmount: number
      totalCount: number
      missions: Mission[]
    }
  }> {
    const today = getTodayKST()
    
    try {
      // 1. 오늘 미션 완료 상태 체크
      const todayStatus = await this.checkAllMissionsCompletedForDate(userId, today)
      
      // 2. 모든 미정산 용돈 조회 (누적)
      const pendingSettlement = await this.getAllPendingSettlements(userId)
      
      // 3. 자동 정산 트리거 조건: 오늘의 모든 미션 완료
      const shouldTrigger = todayStatus.allCompleted && todayStatus.totalMissions > 0
      
      return {
        shouldTrigger,
        reason: shouldTrigger ? 'all_completed_today' : 'no_auto_trigger',
        todayStatus: {
          allCompleted: todayStatus.allCompleted,
          totalMissions: todayStatus.totalMissions,
          completedMissions: todayStatus.completedMissions
        },
        pendingSettlement: {
          totalAmount: pendingSettlement.totalAmount,
          totalCount: pendingSettlement.totalCount,
          missions: pendingSettlement.missions
        }
      }
    } catch (error) {
      console.error('자동 정산 체크 실패:', error)
      return {
        shouldTrigger: false,
        reason: 'no_auto_trigger',
        todayStatus: {
          allCompleted: false,
          totalMissions: 0,
          completedMissions: 0
        },
        pendingSettlement: {
          totalAmount: 0,
          totalCount: 0,
          missions: []
        }
      }
    }
  }

  /**
   * 수동 용돈 요청 (자녀가 버튼 클릭 시)
   */
  async requestManualSettlement(userId: string): Promise<{
    success: boolean
    totalAmount: number
    totalCount: number
    missions: Mission[]
    message: string
  }> {
    try {
      const pendingSettlement = await this.getAllPendingSettlements(userId)
      
      if (pendingSettlement.totalCount === 0) {
        return {
          success: false,
          totalAmount: 0,
          totalCount: 0,
          missions: [],
          message: '정산할 완료된 미션이 없습니다.'
        }
      }
      
      return {
        success: true,
        totalAmount: pendingSettlement.totalAmount,
        totalCount: pendingSettlement.totalCount,
        missions: pendingSettlement.missions,
        message: `${pendingSettlement.totalCount}개 미션 (${pendingSettlement.totalAmount}원) 정산 요청이 부모님께 전달되었습니다.`
      }
    } catch (error) {
      console.error('수동 용돈 요청 실패:', error)
      return {
        success: false,
        totalAmount: 0,
        totalCount: 0,
        missions: [],
        message: '용돈 요청 중 오류가 발생했습니다.'
      }
    }
  }
}

const settlementService = new SettlementService()
export default settlementService