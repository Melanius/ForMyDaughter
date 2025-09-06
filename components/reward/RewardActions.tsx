/**
 * 🎯 정산 액션 버튼들 컴포넌트
 */

'use client'

import { DollarSign, Zap, CheckCircle2 } from 'lucide-react'

interface RewardActionsProps {
  totalPending: number
  totalAmount: number
  selectedCount: number
  selectedAmount: number
  isProcessing: boolean
  onProcessSelected: () => void
  onProcessAll: () => void
}

export function RewardActions({
  totalPending,
  totalAmount,
  selectedCount,
  selectedAmount,
  isProcessing,
  onProcessSelected,
  onProcessAll
}: RewardActionsProps) {
  if (totalPending === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          모든 미션이 정산 완료되었습니다! 🎉
        </h3>
        <p className="text-gray-600">
          완료된 미션이 있으면 이곳에 표시됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sticky bottom-4 shadow-lg">
      <div className="flex items-center justify-between">
        {/* 정산 정보 */}
        <div className="flex-1">
          <div className="flex items-center gap-4">
            {selectedCount > 0 ? (
              <>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600">{selectedCount}개 선택</span>
                  <span className="mx-1">•</span>
                  <span className="font-semibold text-green-600">
                    {selectedAmount.toLocaleString()}원
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  전체 {totalPending}개 중 {selectedCount}개 선택됨
                </div>
              </>
            ) : (
              <>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">전체 {totalPending}개 미션</span>
                  <span className="mx-1">•</span>
                  <span className="font-semibold text-green-600">
                    {totalAmount.toLocaleString()}원
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  정산할 미션을 선택해주세요
                </div>
              </>
            )}
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex gap-3">
          {/* 선택한 미션 정산 */}
          <button
            onClick={onProcessSelected}
            disabled={selectedCount === 0 || isProcessing}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedCount > 0 && !isProcessing
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>
                {isProcessing ? '처리 중...' : `선택 정산 (${selectedCount})`}
              </span>
            </div>
          </button>

          {/* 전체 정산 */}
          <button
            onClick={onProcessAll}
            disabled={totalPending === 0 || isProcessing}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              totalPending > 0 && !isProcessing
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>
                {isProcessing ? '처리 중...' : '전체 정산'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 빠른 정보 */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>💡 팁: 체크박스를 클릭하여 미션을 선택하세요</span>
          </div>
          <div>
            <span>전체 정산 시 {totalAmount.toLocaleString()}원이 전달됩니다</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RewardActions