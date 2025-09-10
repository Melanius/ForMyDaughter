/**
 * 🔔 미션 제안 알림 모달
 * 
 * 부모가 로그인했을 때 새로운 미션 제안이 있으면 표시되는 알림 모달
 */

'use client'

import React from 'react'
import { MissionProposalWithProfile } from '@/lib/types/missionProposal'

interface ProposalNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  onViewProposals: () => void
  pendingCount: number
  latestProposals: MissionProposalWithProfile[]
}

export function ProposalNotificationModal({
  isOpen,
  onClose,
  onViewProposals,
  pendingCount,
  latestProposals
}: ProposalNotificationModalProps) {
  if (!isOpen) return null

  // 최신 3개 제안만 미리보기
  const previewProposals = latestProposals.slice(0, 3)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl max-w-md w-full mx-4 p-6 shadow-xl">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔔</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            새로운 미션 제안이 있어요!
          </h2>
          <p className="text-gray-600">
            자녀들이 {pendingCount}개의 미션을 제안했습니다
          </p>
        </div>

        {/* 제안 미리보기 */}
        <div className="space-y-3 mb-6">
          {previewProposals.map((proposal, index) => (
            <div key={proposal.id} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-start">
                <span className="text-lg mr-2">👧</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-blue-800 truncate">
                      {proposal.child_profile.full_name}
                    </span>
                    <span className="text-xs text-blue-600 ml-2">
                      💰 {proposal.reward_amount.toLocaleString()}원
                    </span>
                  </div>
                  <div className="text-sm text-blue-700 font-medium truncate mb-1">
                    {proposal.title}
                  </div>
                  <div className="flex items-center text-xs text-blue-600">
                    <span className="mr-2">
                      {proposal.mission_type === 'daily' ? '🔄 매일' : '⭐ 한번'}
                    </span>
                    <span>
                      {'⭐'.repeat(proposal.difficulty)} 난이도
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {pendingCount > 3 && (
            <div className="text-center text-sm text-gray-600">
              외 {pendingCount - 3}개 더 있습니다
            </div>
          )}
        </div>

        {/* 도움말 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <div className="flex items-start">
            <span className="text-amber-600 text-sm mr-2">💡</span>
            <p className="text-xs text-amber-800">
              자녀들이 스스로 하고 싶은 일들을 제안했어요. 
              검토 후 승인하시면 미션이 생성됩니다.
            </p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            나중에 확인
          </button>
          <button
            onClick={() => {
              onViewProposals()
              onClose()
            }}
            className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            지금 확인하기
          </button>
        </div>
      </div>
    </div>
  )
}