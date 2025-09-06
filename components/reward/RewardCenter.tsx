/**
 * 🎁 정산 센터 메인 컴포넌트
 */

'use client'

import { useState } from 'react'
import { ArrowLeft, CheckSquare, Square, DollarSign, Clock, AlertTriangle, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRewardCenter } from '@/lib/hooks/useRewardCenter'
import { RewardSummaryCard } from './RewardSummaryCard'
import { DateGroupCard } from './DateGroupCard' 
import { RewardActions } from './RewardActions'
import { ConfirmRewardModal } from './ConfirmRewardModal'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { EmptyState } from '../ui/EmptyState'

export function RewardCenter() {
  const router = useRouter()
  const rewardCenter = useRewardCenter()
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [parentNote, setParentNote] = useState('')

  const {
    pendingMissions,
    groupedByDate,
    summary,
    selectedMissionIds,
    selectedTotalAmount,
    selectedCount,
    isLoading,
    isProcessing,
    error,
    isEmpty,
    hasUrgentMissions,
    isAllSelected,
    toggleMissionSelection,
    toggleSelectAll,
    toggleDateSelection,
    applySmartSelection,
    processBatchReward,
    processAllRewards,
    refreshPendingMissions
  } = rewardCenter

  // 정산 확인 및 처리
  const handleConfirmReward = async () => {
    try {
      if (selectedCount === 0) return

      const result = await processBatchReward(parentNote.trim() || undefined)
      
      // 성공 알림
      alert(`🎉 정산 완료!\n${result.processedCount}개 미션, 총 ${result.totalAmount.toLocaleString()}원 전달`)
      
      setShowConfirmModal(false)
      setParentNote('')
      
    } catch (error) {
      console.error('정산 처리 실패:', error)
      alert('정산 처리 중 문제가 발생했습니다.')
    }
  }

  // 모든 미션 정산
  const handleProcessAll = async () => {
    try {
      const result = await processAllRewards()
      alert(`🎉 전체 정산 완료!\n${result.processedCount}개 미션, 총 ${result.totalAmount.toLocaleString()}원 전달`)
    } catch (error) {
      console.error('전체 정산 실패:', error)
      alert('정산 처리 중 문제가 발생했습니다.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="정산 센터 로딩 중..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  정산 센터
                </h1>
                <p className="text-sm text-gray-600">
                  완료된 미션의 용돈을 전달해주세요
                </p>
              </div>
            </div>

            {/* 새로고침 버튼 */}
            <button
              onClick={refreshPendingMissions}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              새로고침
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">오류</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* 요약 카드 */}
        <RewardSummaryCard summary={summary} />

        {/* 빈 상태 */}
        {isEmpty && (
          <EmptyState
            icon={<DollarSign className="w-12 h-12 text-gray-400" />}
            title="정산할 미션이 없습니다"
            description="모든 미션이 정산 완료되었거나 아직 완료된 미션이 없습니다."
            action={{
              label: "대시보드로 돌아가기",
              onClick: () => router.push('/')
            }}
          />
        )}

        {/* 정산 미션 목록 */}
        {!isEmpty && (
          <>
            {/* 제어 패널 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    {isAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    {isAllSelected ? '모두 해제' : '모두 선택'}
                  </button>

                  <button
                    onClick={applySmartSelection}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    오래된 미션 선택
                  </button>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  선택: {selectedCount}개 / 전체: {pendingMissions.length}개
                </div>
              </div>

              {/* 긴급 알림 */}
              {hasUrgentMissions && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">긴급 정산 필요</span>
                  </div>
                  <p className="text-red-700 text-sm mt-1">
                    3일 이상 지난 미션 {summary.urgentCount}개가 있습니다. 빠른 정산을 권장합니다.
                  </p>
                </div>
              )}

              {/* 선택 요약 */}
              {selectedCount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-green-800">
                      <span className="font-medium">선택된 미션: {selectedCount}개</span>
                      <span className="text-green-600 ml-2">
                        총 {selectedTotalAmount.toLocaleString()}원
                      </span>
                    </div>
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isProcessing ? '처리 중...' : '선택한 미션 정산하기'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 날짜별 미션 그룹 */}
            <div className="space-y-4">
              {Object.entries(groupedByDate)
                .sort(([dateA], [dateB]) => dateB.localeCompare(dateA)) // 최신 날짜부터
                .map(([date, group]) => (
                  <DateGroupCard
                    key={date}
                    group={group}
                    selectedMissionIds={selectedMissionIds}
                    onToggleMission={toggleMissionSelection}
                    onToggleDateSelection={toggleDateSelection}
                  />
                ))
              }
            </div>

            {/* 하단 액션 */}
            <RewardActions
              totalPending={summary.totalPending}
              totalAmount={summary.totalAmount}
              selectedCount={selectedCount}
              selectedAmount={selectedTotalAmount}
              isProcessing={isProcessing}
              onProcessSelected={() => setShowConfirmModal(true)}
              onProcessAll={handleProcessAll}
            />
          </>
        )}
      </div>

      {/* 정산 확인 모달 */}
      <ConfirmRewardModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmReward}
        missions={pendingMissions.filter(m => selectedMissionIds.includes(m.id))}
        totalAmount={selectedTotalAmount}
        parentNote={parentNote}
        onParentNoteChange={setParentNote}
        isProcessing={isProcessing}
      />
    </div>
  )
}

export default RewardCenter