/**
 * 🚫 미션 제안 거절 사유 입력 모달
 * 
 * 부모가 자녀의 미션 제안을 거절할 때 사유를 입력하는 모달
 */

'use client'

import React, { useState } from 'react'

interface RejectionReasonModalProps {
  isOpen: boolean
  onClose: () => void
  onReject: (reason: string) => void
  proposalTitle: string
  childName?: string
}

export function RejectionReasonModal({ 
  isOpen, 
  onClose, 
  onReject, 
  proposalTitle,
  childName 
}: RejectionReasonModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reason.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onReject(reason.trim())
      setReason('')
      onClose()
    } catch (error) {
      console.error('거절 처리 중 오류:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setReason('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl max-w-md w-full mx-4 p-6 shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="text-2xl mr-2">🚫</span>
            <h2 className="text-xl font-bold text-gray-800">미션 제안 거절</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* 제안 정보 */}
        <div className="bg-red-50 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <span className="text-red-600 text-lg mr-2">📝</span>
            <div>
              <p className="text-red-800 text-sm font-medium mb-1">거절할 제안</p>
              <p className="text-red-700 font-bold">{proposalTitle}</p>
              {childName && (
                <p className="text-red-600 text-xs mt-1">제안자: {childName}</p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 거절 사유 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              거절 사유를 알려주세요 *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="자녀가 이해할 수 있도록 구체적이고 친절하게 설명해주세요..."
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              rows={4}
              maxLength={200}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {reason.length}/200자
            </p>
          </div>

          {/* 안내 메시지 */}
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="flex items-start">
              <span className="text-yellow-600 text-base mr-2">💡</span>
              <p className="text-yellow-800 text-xs">
                거절 사유는 자녀에게 전달되어 다음 제안에 도움이 됩니다.
                건설적이고 격려하는 내용으로 작성해주세요.
              </p>
            </div>
          </div>

          {/* 버튼들 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || isSubmitting}
              className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  거절 중...
                </div>
              ) : (
                '거절하기'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}