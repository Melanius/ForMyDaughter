/**
 * 🎁 정산 관리 서비스 (임시 버전)
 * 완료된 미션의 용돈 전달 처리를 담당
 */

import { createClient } from '@/lib/supabase/client'
import { nowKST, getTodayKST } from '../utils/dateUtils'
import { 
  PendingRewardMission, 
  RewardSummary, 
  BatchRewardRequest, 
  BatchRewardResponse,
  DateGroupedMissions 
} from '@/lib/types/reward'

class RewardService {
  private supabase = createClient()

  /**
   * 🔍 정산 대기 중인 미션들 조회 (임시로 빈 배열 반환)
   * @param parentId 부모 사용자 ID
   * @returns 정산 대기 미션 목록
   */
  async getPendingRewardMissions(parentId: string): Promise<PendingRewardMission[]> {
    console.log('🔍 정산 대기 미션 조회 (임시로 빈 배열 반환):', parentId)
    return []
  }

  /**
   * 📊 정산 대기 요약 정보 (임시로 기본값 반환)
   * @param parentId 부모 사용자 ID
   * @returns 정산 요약 정보
   */
  async getRewardSummary(parentId: string): Promise<RewardSummary> {
    console.log('📊 정산 대기 요약 조회 (임시로 기본값 반환):', parentId)
    
    return {
      totalPending: 0,
      totalAmount: 0,
      urgentCount: 0
    }
  }

  /**
   * 📅 날짜별로 미션 그룹핑
   * @param missions 정산 대기 미션들
   * @returns 날짜별 그룹화된 미션들
   */
  groupMissionsByDate(missions: PendingRewardMission[]): Record<string, DateGroupedMissions> {
    return {}
  }

  /**
   * 💰 일괄 정산 처리 (임시로 비활성화)
   * @param request 정산 요청 정보
   * @returns 정산 처리 결과
   */
  async processBatchReward(request: BatchRewardRequest): Promise<BatchRewardResponse> {
    console.log('💰 일괄 정산 처리 (임시로 비활성화):', request)
    
    return {
      success: false,
      processedCount: 0,
      totalAmount: 0,
      message: '정산 기능이 준비 중입니다. 데이터베이스 마이그레이션이 필요합니다.'
    }
  }

  /**
   * 🚀 단일 미션 즉시 정산 (임시로 비활성화)
   * @param missionId 미션 ID
   * @param parentNote 부모 메모 (선택사항)
   */
  async processInstantReward(missionId: string, parentNote?: string): Promise<BatchRewardResponse> {
    console.log('🚀 단일 미션 즉시 정산 (임시로 비활성화):', missionId, parentNote)
    
    return {
      success: false,
      processedCount: 0,
      totalAmount: 0,
      message: '정산 기능이 준비 중입니다. 데이터베이스 마이그레이션이 필요합니다.'
    }
  }

  /**
   * 🔔 미션 완료 실시간 구독 (주기적 폴링으로 대체)
   * @param parentId 부모 사용자 ID
   * @param callback 콜백 함수
   * @returns 구독 해제 함수
   */
  subscribeToMissionCompletions(
    parentId: string, 
    callback: () => void
  ): () => void {
    console.log('🔔 정산 알림 구독 시작 (주기적 폴링):', parentId)

    // 실시간 구독 대신 주기적 폴링으로 대체 (안정성 확보)
    const pollInterval = setInterval(callback, 30000) // 30초마다 확인

    return () => {
      console.log('🔇 정산 알림 폴링 해제')
      clearInterval(pollInterval)
    }
  }
}

// 싱글톤 인스턴스 내보내기
const rewardService = new RewardService()
export default rewardService