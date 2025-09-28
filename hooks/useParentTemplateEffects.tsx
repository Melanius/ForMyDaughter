'use client'

import { useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { isParentRole } from '@/lib/utils/roleUtils'
import { missionSupabaseService } from '@/lib/services/missionSupabaseService'
import { logger } from '@/lib/utils/logger'

export function useParentTemplateEffects() {
  const { profile } = useAuth()

  // 🔒 부모 기본 템플릿 생성 (세션당 한 번만, localStorage로 중복 실행 방지)
  useEffect(() => {
    const initializeParentTemplates = async () => {
      if (!profile || !isParentRole(profile.user_type)) return

      // 🔒 이미 이 세션에서 템플릿 체크를 했는지 확인
      const sessionKey = `template_check_${profile.id}_session`
      if (localStorage.getItem(sessionKey)) {
        logger.log('템플릿 체크 이미 완료됨 - 건너뜀')
        return
      }

      try {
        logger.log('부모 계정 감지 - 기본 템플릿 확인 시작')
        await missionSupabaseService.createDefaultTemplates()
        
        const allTemplates = await missionSupabaseService.getFamilyMissionTemplates()
        const activeDaily = allTemplates.filter(t => t.missionType === 'daily' && t.isActive)
        console.log(`📋 최종 확인 - 총 템플릿: ${allTemplates.length}개, 활성 데일리: ${activeDaily.length}개`)
        
        // 🔒 세션 체크 완료 플래그 설정
        localStorage.setItem(sessionKey, 'checked')
      } catch (error) {
        console.error('부모 템플릿 초기화 실패:', error)
      }
    }

    initializeParentTemplates()
  }, [profile?.id]) // profile.id가 변경될 때만 실행 (로그인/로그아웃시에만)
}