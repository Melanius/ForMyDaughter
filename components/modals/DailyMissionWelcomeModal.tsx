'use client'

import { useState } from 'react'

interface DailyMissionWelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  childName?: string
}

export function DailyMissionWelcomeModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  childName 
}: DailyMissionWelcomeModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleConfirm = async () => {
    try {
      setIsGenerating(true)
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('데일리 미션 생성 실패:', error)
      alert('미션 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🎯</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            안녕{childName ? `, ${childName}` : ''}! 👋
          </h2>
          <p className="text-gray-600 text-lg">
            아직 못한 미션이 있어요!
          </p>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="text-center mb-8">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <p className="text-orange-800 font-medium text-lg">
              📋 오늘 할 일을 확인해볼까요?
            </p>
            <p className="text-orange-600 text-sm mt-2">
              아직 끝내지 못한 미션들이 기다리고 있어요
            </p>
          </div>
          
          <div className="text-sm text-gray-500 space-y-1">
            <p>💪 미션을 하나씩 완료해보세요</p>
            <p>💰 다 끝내면 용돈을 받을 수 있어요</p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="flex-1 px-4 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
          >
            나중에
          </button>
          <button
            onClick={handleConfirm}
            disabled={isGenerating}
            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 font-medium flex items-center justify-center"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                생성 중...
              </>
            ) : (
              '미션 보러 가기'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}