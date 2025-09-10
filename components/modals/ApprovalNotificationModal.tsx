/**
 * ✅ 미션 제안 승인 알림 모달
 * 
 * 부모가 자녀의 미션 제안을 승인했을 때 자녀에게 보여주는 축하 모달
 */

'use client'

import React, { useEffect } from 'react'

interface ApprovalNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  proposalTitle: string
  category?: string
  reward?: number
  startDate?: string
  autoCloseDelay?: number // 자동 닫기 지연 시간 (기본 4초)
}

export function ApprovalNotificationModal({ 
  isOpen, 
  onClose, 
  proposalTitle,
  category,
  reward,
  startDate,
  autoCloseDelay = 4000 
}: ApprovalNotificationModalProps) {

  // 자동 닫기 타이머
  useEffect(() => {
    if (isOpen && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, autoCloseDelay)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen, autoCloseDelay, onClose])

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl max-w-sm w-full mx-4 p-6 shadow-xl animate-bounce-in">
        {/* 축하 아이콘 */}
        <div className="text-center mb-4">
          <div className="text-6xl mb-2 animate-bounce">🎉</div>
          <h2 className="text-xl font-bold text-green-800 mb-2">
            미션 제안이 승인되었어요!
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            부모님이 회원님의 제안을<br/>
            승인해주셨습니다
          </p>
        </div>

        {/* 승인된 미션 정보 */}
        <div className="bg-green-50 rounded-lg p-4 mb-4">
          <div className="text-center">
            <h3 className="text-green-800 font-bold text-lg mb-2">{proposalTitle}</h3>
            <div className="space-y-2">
              {category && (
                <div className="flex items-center justify-center">
                  <span className="text-green-700 text-sm">📂 {category}</span>
                </div>
              )}
              {reward && (
                <div className="flex items-center justify-center">
                  <span className="text-green-700 text-sm">💰 {reward.toLocaleString()}원</span>
                </div>
              )}
              {startDate && (
                <div className="flex items-center justify-center">
                  <span className="text-green-700 text-sm">📅 {formatDate(startDate)}부터</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 다음 단계 안내 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <span className="text-blue-600 text-lg mr-2">🚀</span>
            <div>
              <p className="text-blue-800 text-sm font-medium mb-1">
                미션이 생성되었어요!
              </p>
              <p className="text-blue-700 text-xs leading-relaxed">
                이제 미션 목록에서 확인하고<br/>
                완료해서 용돈을 받아보세요
              </p>
            </div>
          </div>
        </div>

        {/* 격려 메시지 */}
        <div className="bg-yellow-50 rounded-lg p-3 mb-4">
          <div className="text-center">
            <span className="text-yellow-600 text-base mr-2">⭐</span>
            <span className="text-yellow-800 text-sm font-medium">
              스스로 계획하고 실천하는 모습이 멋져요!
            </span>
          </div>
        </div>

        {/* 확인 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
          >
            미션 확인하러 가기
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