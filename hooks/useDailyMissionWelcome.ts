'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { dailyMissionManager } from '@/lib/services/dailyMissionManager'
import { getTodayKST } from '@/lib/utils/dateUtils'

export function useDailyMissionWelcome() {
  const { profile } = useAuth()
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
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
    return localStorage.getItem(key) === 'checked'
  }

  // 오늘 체크 완료 표시
  const markCheckedToday = () => {
    const key = getStorageKey()
    if (key) {
      localStorage.setItem(key, 'checked')
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
    if (!profile || profile.user_type !== 'child') {
      return
    }

    try {
      setIsChecking(true)
      
      // 오늘의 데일리 미션이 이미 있는지 확인
      const missionsExist = await checkTodayMissionsExist()
      
      // 데일리 미션이 없으면 모달 표시
      if (!missionsExist) {
        setShowWelcomeModal(true)
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
    setShowWelcomeModal(false)
  }, [generateTodayMissions])

  // 모달 닫기
  const handleCloseWelcome = useCallback(() => {
    setShowWelcomeModal(false)
  }, [])

  // 프로필이 로드되면 체크 실행
  useEffect(() => {
    if (profile && !isChecking) {
      checkDailyMissionWelcome()
    }
  }, [profile, isChecking])

  return {
    showWelcomeModal,
    isChecking,
    handleConfirmWelcome,
    handleCloseWelcome,
    generateTodayMissions
  }
}