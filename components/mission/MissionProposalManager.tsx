/**
 * 🎯 미션 제안 관리 컴포넌트 (부모용)
 * 
 * 자녀들이 제안한 미션을 검토하고 승인/거부할 수 있는 관리 페이지
 */

'use client'

import React, { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { 
  useMissionProposals, 
  useApproveMissionProposal, 
  useRejectMissionProposal,
  useMissionProposalStats
} from '@/hooks/useMissionProposals'
import { MissionProposalWithProfile, MissionProposalStatus } from '@/lib/types/missionProposal'
import { RejectionReasonModal } from '@/components/modals/RejectionReasonModal'

interface MissionProposalManagerProps {
  isOpen: boolean
  onClose: () => void
}

const DIFFICULTY_EMOJIS = ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐']

export default function MissionProposalManager({ isOpen, onClose }: MissionProposalManagerProps) {
  const { profile } = useAuth()
  const [selectedFilter, setSelectedFilter] = useState<MissionProposalStatus | 'all'>('pending')
  const [processingProposalId, setProcessingProposalId] = useState<string | null>(null)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [proposalToReject, setProposalToReject] = useState<MissionProposalWithProfile | null>(null)

  // 데이터 조회
  const { data: proposals = [], isLoading, refetch } = useMissionProposals({
    parent_id: profile?.id,
    status: selectedFilter === 'all' ? undefined : [selectedFilter]
  })

  const { data: stats } = useMissionProposalStats(profile?.id)

  // 뮤테이션
  const approveMutation = useApproveMissionProposal()
  const rejectMutation = useRejectMissionProposal()

  // 제안 승인
  const handleApprove = async (proposal: MissionProposalWithProfile, targetChildId?: string | null) => {
    setProcessingProposalId(proposal.id)
    try {
      await approveMutation.mutateAsync({
        proposal_id: proposal.id,
        target_child_id: targetChildId || proposal.child_id
      })
      await refetch()
    } catch (error) {
      console.error('제안 승인 실패:', error)
      alert('제안 승인에 실패했습니다')
    } finally {
      setProcessingProposalId(null)
    }
  }

  // 제안 거부 모달 열기
  const handleReject = (proposal: MissionProposalWithProfile) => {
    setProposalToReject(proposal)
    setShowRejectionModal(true)
  }

  // 실제 제안 거부 처리
  const handleConfirmReject = async (reason: string) => {
    if (!proposalToReject) return

    setProcessingProposalId(proposalToReject.id)
    setShowRejectionModal(false)
    
    try {
      await rejectMutation.mutateAsync({
        proposalId: proposalToReject.id,
        reason: reason.trim()
      })
      await refetch()
    } catch (error) {
      console.error('제안 거부 실패:', error)
      alert('제안 거부에 실패했습니다')
    } finally {
      setProcessingProposalId(null)
      setProposalToReject(null)
    }
  }

  // 부모가 아니면 표시하지 않음
  if (!profile || profile.user_type !== 'parent' || !isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <span className="text-2xl mr-3">💡</span>
            <div>
              <h2 className="text-xl font-bold text-gray-800">미션 제안 관리</h2>
              <p className="text-sm text-gray-600">자녀들의 미션 제안을 검토하고 승인해주세요</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* 통계 및 필터 */}
        <div className="p-6 border-b border-gray-200">
          {/* 통계 카드들 */}
          {stats && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total_proposals}</div>
                <div className="text-sm text-blue-600">전체 제안</div>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.pending_proposals}</div>
                <div className="text-sm text-orange-600">대기 중</div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.approved_proposals}</div>
                <div className="text-sm text-green-600">승인됨</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{stats.rejected_proposals}</div>
                <div className="text-sm text-red-600">거부됨</div>
              </div>
            </div>
          )}

          {/* 필터 탭 */}
          <div className="flex gap-2">
            {[
              { key: 'all' as const, label: '전체', icon: '📋' },
              { key: 'pending' as const, label: '대기 중', icon: '⏳' },
              { key: 'approved' as const, label: '승인됨', icon: '✅' },
              { key: 'rejected' as const, label: '거부됨', icon: '❌' }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  selectedFilter === filter.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{filter.icon}</span>
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* 제안 목록 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">제안 목록 로딩 중...</span>
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                {selectedFilter === 'pending' ? '대기 중인 제안이 없어요' : '제안이 없어요'}
              </h3>
              <p className="text-gray-600">
                {selectedFilter === 'pending' 
                  ? '자녀들이 새로운 미션을 제안하면 여기에 표시됩니다' 
                  : '선택한 필터에 해당하는 제안이 없습니다'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map(proposal => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isProcessing={processingProposalId === proposal.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🆕 거절 사유 입력 모달 */}
      <RejectionReasonModal
        isOpen={showRejectionModal}
        onClose={() => {
          setShowRejectionModal(false)
          setProposalToReject(null)
        }}
        onReject={handleConfirmReject}
        childName={proposalToReject?.child_profile.full_name}
        missionTitle={proposalToReject?.title}
      />
    </div>
  )
}

/**
 * 개별 제안 카드 컴포넌트
 */
interface ProposalCardProps {
  proposal: MissionProposalWithProfile
  onApprove: (proposal: MissionProposalWithProfile, targetChildId?: string | null) => void
  onReject: (proposal: MissionProposalWithProfile) => void
  isProcessing: boolean
}

function ProposalCard({ proposal, onApprove, onReject, isProcessing }: ProposalCardProps) {
  const [showOptions, setShowOptions] = useState(false)

  const getStatusBadge = (status: MissionProposalStatus) => {
    const badges = {
      pending: { color: 'bg-orange-100 text-orange-800', icon: '⏳', label: '대기 중' },
      approved: { color: 'bg-green-100 text-green-800', icon: '✅', label: '승인됨' },
      rejected: { color: 'bg-red-100 text-red-800', icon: '❌', label: '거부됨' }
    }
    const badge = badges[status]
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <span className="mr-1">{badge.icon}</span>
        {badge.label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <span className="text-lg mr-2">👧</span>
          <div>
            <div className="font-medium text-gray-800">{proposal.child_profile.full_name}</div>
            <div className="text-xs text-gray-500">{formatDate(proposal.proposed_at)}</div>
          </div>
        </div>
        {getStatusBadge(proposal.status)}
      </div>

      <div className="mb-3">
        <h4 className="font-medium text-gray-800 mb-1">{proposal.title}</h4>
        {proposal.description && (
          <p className="text-sm text-gray-600 mb-2">{proposal.description}</p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center">
            <span className="mr-1">📊</span>
            난이도: {DIFFICULTY_EMOJIS[proposal.difficulty - 1]}
          </div>
          <div className="flex items-center">
            <span className="mr-1">💰</span>
            보상: {proposal.reward_amount.toLocaleString()}원
          </div>
          <div className="flex items-center">
            <span className="mr-1">
              {proposal.mission_type === 'daily' ? '🔄' : '⭐'}
            </span>
            {proposal.mission_type === 'daily' ? '매일 하는 미션' : '한 번만 하는 미션'}
          </div>
        </div>
      </div>

      {/* 액션 버튼 (대기 중인 제안만) */}
      {proposal.status === 'pending' && (
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={() => onReject(proposal)}
            disabled={isProcessing}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? '처리 중...' : '거부'}
          </button>
          
          <div className="relative flex-1">
            <button
              onClick={() => setShowOptions(!showOptions)}
              disabled={isProcessing}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? '승인 중...' : '승인 ▼'}
            </button>
            
            {showOptions && !isProcessing && (
              <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px] z-10">
                <button
                  onClick={() => {
                    onApprove(proposal, proposal.child_id)
                    setShowOptions(false)
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                >
                  {proposal.child_profile.full_name} 전용
                </button>
                <button
                  onClick={() => {
                    onApprove(proposal, null)
                    setShowOptions(false)
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                >
                  모든 자녀 공용
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}