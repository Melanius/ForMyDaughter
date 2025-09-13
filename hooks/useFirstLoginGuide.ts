import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import familyService from '@/lib/services/familyService'

/**
 * 부모 계정 첫 로그인 가이드 관리 훅
 */
export function useFirstLoginGuide() {
  const { user, profile } = useAuth()
  const [showGuide, setShowGuide] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkFirstLogin()
  }, [user, profile])

  const checkFirstLogin = async () => {
    try {
      setLoading(true)

      // 로그인하지 않았거나 프로필이 없으면 가이드 숨김
      if (!user || !profile) {
        setShowGuide(false)
        return
      }

      // 자녀 계정은 가이드 불필요 (이미 가족 연결됨)
      if (profile.user_type !== 'parent') {
        setShowGuide(false)
        return
      }

      // localStorage에서 가이드 표시 여부 확인
      const guideShownKey = `first-login-guide-shown-${user.id}`
      const hasShownGuide = localStorage.getItem(guideShownKey)
      
      if (hasShownGuide) {
        setShowGuide(false)
        return
      }

      // 가족이 있는지 확인
      const hasFamily = await familyService.getCurrentUserFamily()
      
      // 부모 계정이고 가족이 없으면 가이드 표시
      if (!hasFamily) {
        setShowGuide(true)
      }

    } catch (error) {
      console.error('첫 로그인 확인 오류:', error)
      setShowGuide(false)
    } finally {
      setLoading(false)
    }
  }

  const markGuideAsShown = () => {
    if (user) {
      const guideShownKey = `first-login-guide-shown-${user.id}`
      localStorage.setItem(guideShownKey, 'true')
    }
    setShowGuide(false)
  }

  const resetGuideFlag = () => {
    if (user) {
      const guideShownKey = `first-login-guide-shown-${user.id}`
      localStorage.removeItem(guideShownKey)
    }
  }

  return {
    showGuide,
    loading,
    markGuideAsShown,
    resetGuideFlag,
    userName: profile?.full_name
  }
}