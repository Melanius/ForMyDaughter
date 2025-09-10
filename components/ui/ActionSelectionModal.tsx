'use client'

import { useState } from 'react'

interface ActionSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectAddMission: () => void
  onSelectCreateTemplate: () => void
  onSelectManageProposals?: () => void
  pendingProposalsCount?: number
}

export function ActionSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectAddMission, 
  onSelectCreateTemplate,
  onSelectManageProposals,
  pendingProposalsCount = 0
}: ActionSelectionModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 m-4 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-2">무엇을 하시겠어요?</h3>
          <p className="text-sm text-gray-600">원하시는 작업을 선택해주세요</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onSelectCreateTemplate}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-6 py-4 rounded-xl transition-all duration-200 font-medium text-left flex items-center gap-3 shadow-lg hover:shadow-xl"
          >
            <span className="text-2xl">📅</span>
            <div>
              <div className="font-semibold">미션 템플릿 관리</div>
              <div className="text-sm opacity-90">반복되는 미션을 관리합니다</div>
            </div>
          </button>

          <button
            onClick={onSelectAddMission}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-4 rounded-xl transition-all duration-200 font-medium text-left flex items-center gap-3 shadow-lg hover:shadow-xl"
          >
            <span className="text-2xl">🎯</span>
            <div>
              <div className="font-semibold">이벤트 미션 추가</div>
              <div className="text-sm opacity-90">특별한 일회성 미션을 추가합니다</div>
            </div>
          </button>

          {onSelectManageProposals && (
            <button
              onClick={onSelectManageProposals}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-4 rounded-xl transition-all duration-200 font-medium text-left flex items-center gap-3 shadow-lg hover:shadow-xl relative"
            >
              <span className="text-2xl">💡</span>
              <div className="flex-1">
                <div className="font-semibold">미션 제안 관리</div>
                <div className="text-sm opacity-90">자녀들의 미션 제안을 검토합니다</div>
              </div>
              {pendingProposalsCount && pendingProposalsCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {pendingProposalsCount > 9 ? '9+' : pendingProposalsCount}
                </div>
              )}
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium"
        >
          취소
        </button>
      </div>
    </div>
  )
}