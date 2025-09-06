/**
 * 🎁 정산 센터 관리 훅
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import rewardService from '@/lib/services/rewardService'
import { 
  PendingRewardMission, 
  RewardSummary, 
  BatchRewardRequest,
  RewardCenterState,
  DateGroupedMissions 
} from '@/lib/types/reward'

export function useRewardCenter() {
  const { profile } = useAuth()
  
  const [state, setState] = useState<RewardCenterState>({
    pendingMissions: [],
    selectedMissionIds: [],
    groupedByDate: {},
    summary: {
      totalPending: 0,
      totalAmount: 0,
      urgentCount: 0
    },
    isLoading: false
  })

  const [isProcessing, setIsProcessing] = useState(false)

  // 정산 대기 미션 목록 새로고침
  const refreshPendingMissions = useCallback(async () => {
    if (!profile?.id || profile.user_type !== 'parent') return

    setState(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      console.log('🔄 정산 대기 미션 새로고침')
      
      const [missions, summary] = await Promise.all([
        rewardService.getPendingRewardMissions(profile.id),
        rewardService.getRewardSummary(profile.id)
      ])

      const groupedByDate = rewardService.groupMissionsByDate(missions)

      // 스마트 기본 선택 (3일 이상된 미션들)
      const smartSelection = rewardService.getSmartSelection(missions)

      setState(prev => ({
        ...prev,
        pendingMissions: missions,
        groupedByDate,
        summary,
        selectedMissionIds: smartSelection,
        isLoading: false
      }))

      console.log('✅ 정산 대기 미션 새로고침 완료:', missions.length, '개')

    } catch (error) {
      console.error('❌ 정산 대기 미션 새로고침 실패:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: '정산 대기 미션을 불러올 수 없습니다.'
      }))
    }
  }, [profile])

  // 미션 선택/해제
  const toggleMissionSelection = useCallback((missionId: string) => {
    setState(prev => ({
      ...prev,
      selectedMissionIds: prev.selectedMissionIds.includes(missionId)
        ? prev.selectedMissionIds.filter(id => id !== missionId)
        : [...prev.selectedMissionIds, missionId]
    }))
  }, [])

  // 모든 미션 선택/해제
  const toggleSelectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedMissionIds: prev.selectedMissionIds.length === prev.pendingMissions.length
        ? []
        : prev.pendingMissions.map(m => m.id)
    }))
  }, [])

  // 날짜별 미션 선택/해제
  const toggleDateSelection = useCallback((date: string) => {
    setState(prev => {
      const dateMissions = prev.groupedByDate[date]?.missions || []
      const dateMissionIds = dateMissions.map(m => m.id)
      const allSelected = dateMissionIds.every(id => prev.selectedMissionIds.includes(id))

      return {
        ...prev,
        selectedMissionIds: allSelected
          ? prev.selectedMissionIds.filter(id => !dateMissionIds.includes(id))
          : [...new Set([...prev.selectedMissionIds, ...dateMissionIds])]
      }
    })
  }, [])

  // 스마트 선택 (오래된 미션들)
  const applySmartSelection = useCallback(() => {
    const smartSelection = rewardService.getSmartSelection(state.pendingMissions)
    setState(prev => ({
      ...prev,
      selectedMissionIds: smartSelection
    }))
  }, [state.pendingMissions])

  // 선택된 미션들의 총액 계산
  const selectedTotalAmount = state.pendingMissions
    .filter(mission => state.selectedMissionIds.includes(mission.id))
    .reduce((sum, mission) => sum + mission.reward, 0)

  // 일괄 정산 처리
  const processBatchReward = useCallback(async (parentNote?: string) => {
    if (state.selectedMissionIds.length === 0) {
      throw new Error('정산할 미션을 선택해주세요.')
    }

    setIsProcessing(true)

    try {
      const request: BatchRewardRequest = {
        missionIds: state.selectedMissionIds,
        parentNote
      }

      console.log('💰 일괄 정산 처리 시작:', request)
      
      const result = await rewardService.processBatchReward(request)
      
      console.log('✅ 일괄 정산 처리 완료:', result)

      // 목록 새로고침
      await refreshPendingMissions()

      return result

    } catch (error) {
      console.error('❌ 일괄 정산 처리 실패:', error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [state.selectedMissionIds, refreshPendingMissions])

  // 개별 정산 처리
  const processSingleReward = useCallback(async (missionId: string, parentNote?: string) => {
    setIsProcessing(true)

    try {
      console.log('💰 개별 정산 처리 시작:', missionId)
      
      const result = await rewardService.processSingleReward(missionId, parentNote)
      
      console.log('✅ 개별 정산 처리 완료:', result)

      // 목록 새로고침
      await refreshPendingMissions()

      return result

    } catch (error) {
      console.error('❌ 개별 정산 처리 실패:', error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [refreshPendingMissions])

  // 모든 미션 정산
  const processAllRewards = useCallback(async (parentNote?: string) => {
    if (state.pendingMissions.length === 0) {
      throw new Error('정산할 미션이 없습니다.')
    }

    // 모든 미션 선택
    setState(prev => ({
      ...prev,
      selectedMissionIds: prev.pendingMissions.map(m => m.id)
    }))

    // 정산 처리
    return processBatchReward(parentNote)
  }, [state.pendingMissions, processBatchReward])

  // 컴포넌트 마운트시 데이터 로드
  useEffect(() => {
    if (profile?.user_type === 'parent') {
      refreshPendingMissions()
    }
  }, [profile, refreshPendingMissions])

  // 실시간 구독 설정
  useEffect(() => {
    if (!profile?.id || profile.user_type !== 'parent') return

    console.log('🔔 정산 실시간 구독 시작')
    
    const unsubscribe = rewardService.subscribeToMissionCompletions(
      profile.id,
      () => {
        console.log('🆕 새로운 미션 완료 감지 - 데이터 새로고침')
        
        // 데이터 새로고침
        loadData()
      }
    )

    return unsubscribe
  }, [profile])

  return {
    // 상태
    ...state,
    selectedTotalAmount,
    selectedCount: state.selectedMissionIds.length,
    isProcessing,

    // 액션
    refreshPendingMissions,
    toggleMissionSelection,
    toggleSelectAll,
    toggleDateSelection,
    applySmartSelection,
    processBatchReward,
    processSingleReward,
    processAllRewards,

    // 유틸리티
    isAllSelected: state.selectedMissionIds.length === state.pendingMissions.length,
    hasUrgentMissions: state.summary.urgentCount > 0,
    isEmpty: state.pendingMissions.length === 0
  }
}

export default useRewardCenter