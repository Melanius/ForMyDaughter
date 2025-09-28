'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { dailyMissionManager } from '@/lib/services/dailyMissionManager'
import { getTodayKST } from '@/lib/utils/dateUtils'
import missionSupabaseService from '@/lib/services/missionSupabase'

export function useDailyMissionWelcome() {
  const { profile } = useAuth()
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showNoMissionModal, setShowNoMissionModal] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  // 오늘 날짜 문자열 반환 (한국 시간 기준)
  const getTodayString = () => getTodayKST()

  // 로컬 스토리지 키 생성 (사용자별, 날짜별)
  const getStorageKey = () => {
    if (!profile?.id) return null
    return `daily_mission_check_${profile.id}_${getTodayString()}`
  }

  // 오늘 이미 체크했는지 확인
  const hasCheckedToday = () => {
    const key = getStorageKey()
    if (!key) return false
    
    try {
      return localStorage.getItem(key) === 'checked'
    } catch (error) {
      console.warn('Failed to check daily mission status:', error)
      return false
    }
  }

  // 오늘 체크 완료 표시
  const markCheckedToday = () => {
    const key = getStorageKey()
    if (key) {
      try {
        localStorage.setItem(key, 'checked')
      } catch (error) {
        console.warn('Failed to mark daily mission as checked:', error)
      }
    }
  }

  // 오늘의 데일리 미션이 이미 있는지 확인
  const checkTodayMissionsExist = async (): Promise<boolean> => {
    try {
      const today = getTodayString()
      const missionCount = await dailyMissionManager.checkExistingDailyMissions(profile?.id, today)
      return missionCount > 0
    } catch (error) {
      console.error('오늘 미션 확인 실패:', error)
      return false
    }
  }

  // 🎯 새로운 함수: 오늘 완료되지 않은 미션이 있는지 확인
  const checkIncompleteMissionsExist = async (): Promise<boolean> => {
    try {
      if (!profile?.id) return false
      
      const today = getTodayString()
      const todayMissions = await missionSupabaseService.getFamilyMissionInstances(today, profile.id)
      
      // 완료되지 않은 미션이 1개 이상 있는지 확인
      const incompleteMissions = todayMissions.filter(mission => !mission.isCompleted)
      
      console.log(`📋 오늘 미션 현황: 전체 ${todayMissions.length}개, 미완료 ${incompleteMissions.length}개`)
      
      return incompleteMissions.length > 0
    } catch (error) {
      console.error('미완료 미션 확인 실패:', error)
      return false
    }
  }

  // 데일리 미션 생성 (통합 관리자 사용)
  const generateTodayMissions = useCallback(async () => {
    try {
      if (!profile?.id) return false
      
      const today = getTodayString()
      const generatedCount = await dailyMissionManager.ensureDailyMissions(profile.id, today)
      console.log(`✨ ${generatedCount}개의 오늘 데일리 미션 생성됨`)
      return generatedCount > 0
    } catch (error) {
      console.error('데일리 미션 생성 실패:', error)
      throw error
    }
  }, [profile?.id])

  // 자녀 계정의 오늘 미션 체크 및 모달 표시 결정
  const checkDailyMissionWelcome = useCallback(async () => {
    // 자녀 계정이 아니면 체크하지 않음
    if (!profile || !['son', 'daughter'].includes(profile.user_type)) {
      return
    }

    // 이미 오늘 체크했다면 스킵
    if (hasCheckedToday()) {
      return
    }

    try {
      setIsChecking(true)
      
      // 🎯 새로운 로직: 완료되지 않은 미션이 있는지 확인
      const hasIncompleteMissions = await checkIncompleteMissionsExist()
      
      if (hasIncompleteMissions) {
        // 미완료 미션이 있으면 모달 표시 (내용이 "아직 못한 미션"으로 바뀜)
        setShowWelcomeModal(true)
        console.log('🎯 미완료 미션이 있어서 알림 모달 표시')
      } else {
        // 미션이 없거나 모두 완료된 경우
        const missionsExist = await checkTodayMissionsExist()
        if (!missionsExist) {
          // 미션이 아예 없으면 '미션 없음' 모달 표시
          setShowNoMissionModal(true)
          console.log('📋 오늘 미션이 없어서 미션 없음 모달 표시')
        } else {
          console.log('✅ 오늘 미션이 모두 완료되어 모달 표시하지 않음')
        }
      }
    } catch (error) {
      console.error('데일리 미션 체크 실패:', error)
    } finally {
      setIsChecking(false)
    }
  }, [profile])

  // 모달에서 확인 버튼 클릭시 실행
  const handleConfirmWelcome = useCallback(async () => {
    await generateTodayMissions()
    markCheckedToday() // 체크 완료 표시
    setShowWelcomeModal(false)
  }, [generateTodayMissions])

  // 모달 닫기
  const handleCloseWelcome = useCallback(() => {
    markCheckedToday() // 체크 완료 표시
    setShowWelcomeModal(false)
  }, [])

  // '미션 없음' 모달 닫기
  const handleCloseNoMissionModal = useCallback(() => {
    markCheckedToday() // 체크 완료 표시
    setShowNoMissionModal(false)
  }, [])

  // 프로필이 로드되면 체크 실행 (한 번만)
  useEffect(() => {
    if (profile && ['son', 'daughter'].includes(profile.user_type) && !isChecking && !hasCheckedToday()) {
      checkDailyMissionWelcome()
    }
  }, [profile?.id, profile?.user_type]) // 의존성 배열을 profile 전체가 아닌 필요한 속성만으로 제한

  return {
    showWelcomeModal,
    showNoMissionModal,
    isChecking,
    handleConfirmWelcome,
    handleCloseWelcome,
    handleCloseNoMissionModal,
    generateTodayMissions
  }
}