/**
 * 🚫 미션 제안 거절 알림 모달
 * 
 * 부모가 자녀의 미션 제안을 거절했을 때 자녀에게 보여주는 알림 모달
 */

'use client'

import React, { useEffect } from 'react'

interface RejectionNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  proposalTitle: string
  rejectionReason: string
  category?: string
  autoCloseDelay?: number // 자동 닫기 지연 시간 (기본 6초)
}

export function RejectionNotificationModal({ 
  isOpen, 
  onClose, 
  proposalTitle,
  rejectionReason,
  category,
  autoCloseDelay = 6000 
}: RejectionNotificationModalProps) {

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
      <div className="bg-white rounded-2xl max-w-sm w-full mx-4 p-6 shadow-xl">
        {/* 헤더 */}
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">💭</div>
          <h2 className="text-xl font-bold text-orange-800 mb-2">
            제안이 거절되었어요
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            부모님께서 더 좋은 방향으로<br/>
            개선해보라고 하셨어요
          </p>
        </div>

        {/* 거절된 미션 정보 */}
        <div className="bg-orange-50 rounded-lg p-4 mb-4">
          <div className="text-center">
            <h3 className="text-orange-800 font-bold text-base mb-1">{proposalTitle}</h3>
            {category && (
              <span className="text-orange-700 text-sm">📂 {category}</span>
            )}
          </div>
        </div>

        {/* 거절 사유 */}
        <div className="bg-red-50 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <span className="text-red-600 text-lg mr-2 mt-0.5">📝</span>
            <div className="flex-1">
              <p className="text-red-800 text-sm font-medium mb-2">
                부모님의 메시지
              </p>
              <div className="bg-white rounded-lg p-3 border border-red-100">
                <p className="text-red-700 text-sm leading-relaxed">
                  "{rejectionReason}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 격려 메시지 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <span className="text-blue-600 text-lg mr-2">💪</span>
            <div>
              <p className="text-blue-800 text-sm font-medium mb-1">
                포기하지 말아요!
              </p>
              <p className="text-blue-700 text-xs leading-relaxed">
                부모님의 조언을 참고해서<br/>
                더 멋진 미션을 다시 제안해보세요
              </p>
            </div>
          </div>
        </div>

        {/* 다음 단계 안내 */}
        <div className="bg-green-50 rounded-lg p-3 mb-4">
          <div className="text-center">
            <span className="text-green-600 text-base mr-2">✨</span>
            <span className="text-green-800 text-sm font-medium">
              도전하는 마음이 가장 소중해요!
            </span>
          </div>
        </div>

        {/* 버튼들 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            새로 제안하러 가기
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