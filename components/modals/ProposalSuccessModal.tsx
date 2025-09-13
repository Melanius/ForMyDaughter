/**
 * 🎉 미션 제안 성공 알림 모달
 * 
 * 자녀가 미션 제안을 성공적으로 완료했을 때 표시되는 축하 모달
 */

'use client'

import React, { useEffect } from 'react'

interface ProposalSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  childName?: string
  autoCloseDelay?: number // 자동 닫기 지연 시간 (기본 3초)
}

export function ProposalSuccessModal({ 
  isOpen, 
  onClose, 
  childName,
  autoCloseDelay = 3000 
}: ProposalSuccessModalProps) {
  
  // 자동 닫기 타이머
  useEffect(() => {
    if (isOpen && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, autoCloseDelay)
      
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isOpen, autoCloseDelay, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl max-w-sm w-full mx-4 p-6 shadow-xl animate-bounce-in">
        {/* 축하 아이콘 */}
        <div className="text-center mb-4">
          <div className="text-6xl mb-2 animate-bounce">🎉</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            미션 제안을 완료했어요!
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            {childName ? `${childName}님의` : '귀하의'} 미션 제안이<br/>
            부모님께 전달되었습니다
          </p>
        </div>

        {/* 진행 과정 안내 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <span className="text-blue-600 text-lg mr-2">ℹ️</span>
            <div>
              <p className="text-blue-800 text-sm font-medium mb-1">
                다음 단계
              </p>
              <p className="text-blue-700 text-xs leading-relaxed">
                부모님이 검토하신 후 승인하시면<br/>
                미션이 자동으로 생성됩니다
              </p>
            </div>
          </div>
        </div>

        {/* 격려 메시지 */}
        <div className="bg-green-50 rounded-lg p-3 mb-4">
          <div className="text-center">
            <span className="text-green-600 text-base mr-2">✨</span>
            <span className="text-green-800 text-sm font-medium">
              스스로 계획하는 모습이 멋져요!
            </span>
          </div>
        </div>

        {/* 닫기 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            확인
          </button>
        </div>

        {/* 자동 닫기 안내 */}
        {autoCloseDelay > 0 && (
          <p className="text-center text-xs text-gray-400 mt-2">
            {Math.ceil(autoCloseDelay / 1000)}초 후 자동으로 닫힙니다
          </p>
        )}
      </div>
    </div>
  )
}

// CSS 애니메이션을 위한 스타일 (global.css에 추가할 내용)
/*
@keyframes bounce-in {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-bounce-in {
  animation: bounce-in 0.6s ease-out;
}
*/