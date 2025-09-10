/**
 * 🚫 미션 없음 모달 컴포넌트
 * 
 * 자녀가 로그인했는데 미션이 없을 때 표시되는 모달
 * "제안하기" 버튼으로 미션 제안 폼을 열 수 있음
 */

'use client'

import { useState } from 'react'
import MissionProposalForm from '../mission/MissionProposalForm'

interface NoMissionModalProps {
  isOpen: boolean
  onClose: () => void
  childName?: string
}

export function NoMissionModal({ 
  isOpen, 
  onClose, 
  childName 
}: NoMissionModalProps) {
  const [showProposalForm, setShowProposalForm] = useState(false)

  const handleProposalSuccess = () => {
    setShowProposalForm(false)
    onClose()
    // 성공 토스트 메시지 (선택사항)
    // toast.success('미션 제안이 부모님께 전달되었어요!')
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
          {/* 헤더 */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">😔</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {childName ? `${childName}님` : '안녕하세요'}!
            </h2>
            <p className="text-gray-600">
              새로운 하루가 시작되었어요
            </p>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="text-center mb-8">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-orange-800 font-medium text-lg">
                📋 오늘의 미션이 없어요
              </p>
              <p className="text-orange-600 text-sm mt-2">
                부모님께 미션을 제안해보세요!
              </p>
            </div>
            
            <div className="text-sm text-gray-500 space-y-1">
              <p>💡 어떤 일을 하고 싶은지 제안해보세요</p>
              <p>✨ 부모님이 승인하시면 미션이 됩니다</p>
              <p>🎯 용돈도 함께 받을 수 있어요</p>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              나중에
            </button>
            <button
              onClick={() => setShowProposalForm(true)}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center"
            >
              <span className="mr-2">💡</span>
              제안하기
            </button>
          </div>

          {/* 도움말 */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <span className="text-blue-500 text-sm mr-2">💡</span>
              <div className="flex-1">
                <p className="text-xs text-blue-600">
                  <strong>도움말:</strong> 집안일, 공부, 운동 등 하고 싶은 일을 제안해보세요. 
                  부모님이 검토 후 미션으로 만들어주실 거예요!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 미션 제안 폼 */}
      <MissionProposalForm
        isOpen={showProposalForm}
        onClose={() => setShowProposalForm(false)}
        onSuccess={handleProposalSuccess}
      />
    </>
  )
}