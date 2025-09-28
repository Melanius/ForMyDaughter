'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types/supabase'
import { authLogger } from '@/lib/utils/logger'

interface FirstLoginWelcomeModalProps {
  profile: Profile | null
  onComplete: () => void
}

export function FirstLoginWelcomeModal({ profile, onComplete }: FirstLoginWelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // 자녀 계정이고 첫 로그인인 경우에만 모달 표시
    if (profile && 
        ['son', 'daughter'].includes(profile.user_type) && 
        profile.is_first_login) {
      setIsOpen(true)
      authLogger.log('첫 로그인 환영 모달 표시', {
        userId: profile.id,
        userType: profile.user_type
      })
    }
  }, [profile])

  const handleClose = async () => {
    if (!profile) return
    
    setIsUpdating(true)
    
    try {
      // is_first_login을 false로 업데이트
      const { error } = await supabase
        .from('profiles')
        .update({ is_first_login: false })
        .eq('id', profile.id)

      if (error) throw error

      authLogger.log('첫 로그인 플래그 업데이트 완료', { userId: profile.id })
      
      setIsOpen(false)
      onComplete()
      
    } catch (error) {
      authLogger.error('첫 로그인 플래그 업데이트 실패:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  if (!isOpen || !profile) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 m-4 max-w-md w-full transform transition-all">
        {/* 환영 헤더 */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            환영해요!
          </h2>
          <p className="text-gray-600">
            {profile.full_name || '새로운 가족'}님이 우리 가족에 참여했어요
          </p>
        </div>

        {/* 메인 메시지 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <span className="text-2xl">💬</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                미션을 시작하기 전에
              </h3>
              <p className="text-gray-700 leading-relaxed">
                부모님과 상의해서 어떤 미션을 할지 함께 정해보세요. 
                미션을 직접 제안하거나 부모님이 만들어 주실 수도 있어요!
              </p>
            </div>
          </div>
        </div>

        {/* 도움말 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-amber-600">💡</span>
            <span className="font-medium text-amber-800">팁</span>
          </div>
          <p className="text-amber-700 text-sm">
            방 정리, 숙제하기, 설거지 돕기 등 
            실제로 할 수 있는 미션을 제안해보세요
          </p>
        </div>

        {/* 확인 버튼 */}
        <button
          onClick={handleClose}
          disabled={isUpdating}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isUpdating ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>준비 중...</span>
            </div>
          ) : (
            '좋아요! 미션 준비하러 가기 🚀'
          )}
        </button>
      </div>
    </div>
  )
}