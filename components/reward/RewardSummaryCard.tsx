/**
 * 🎁 정산 요약 카드 컴포넌트
 */

'use client'

import { DollarSign, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { RewardSummary } from '@/lib/types/reward'

interface RewardSummaryCardProps {
  summary: RewardSummary
}

export function RewardSummaryCard({ summary }: RewardSummaryCardProps) {
  const { totalPending, totalAmount, urgentCount, oldestCompletion } = summary

  // 가장 오래된 완료일로부터 경과된 일수 계산
  const getOldestDays = () => {
    if (!oldestCompletion) return 0
    const diff = Date.now() - new Date(oldestCompletion).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  const oldestDays = getOldestDays()

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">정산 현황</h2>
          <p className="text-blue-100 text-sm">완료된 미션의 용돈을 전달해주세요</p>
        </div>
        <div className="p-3 bg-white/20 rounded-full">
          <DollarSign className="w-6 h-6" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 총 대기 미션 수 */}
        <div className="bg-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-sm">대기 미션</span>
            {urgentCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                긴급 {urgentCount}개
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{totalPending}</span>
            <span className="text-blue-100 text-sm">개</span>
          </div>
        </div>

        {/* 총 정산 금액 */}
        <div className="bg-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-sm">정산 금액</span>
            <DollarSign className="w-4 h-4 text-blue-100" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold">
              {totalAmount.toLocaleString()}
            </span>
            <span className="text-blue-100 text-sm">원</span>
          </div>
        </div>

        {/* 가장 오래된 미션 */}
        {oldestCompletion && (
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100 text-sm">가장 오래된 미션</span>
              <Clock className="w-4 h-4 text-blue-100" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{oldestDays}</span>
              <span className="text-blue-100 text-sm">일 전</span>
              {oldestDays >= 3 && (
                <AlertTriangle className="w-4 h-4 text-yellow-300" />
              )}
            </div>
          </div>
        )}

        {/* 상태 표시 */}
        <div className="bg-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-sm">상태</span>
            {urgentCount > 0 ? (
              <AlertTriangle className="w-4 h-4 text-yellow-300" />
            ) : totalPending > 0 ? (
              <Clock className="w-4 h-4 text-blue-100" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-300" />
            )}
          </div>
          <div className="text-sm">
            {urgentCount > 0 ? (
              <span className="text-yellow-300 font-medium">긴급 정산 필요</span>
            ) : totalPending > 0 ? (
              <span className="text-blue-100">정산 대기 중</span>
            ) : (
              <span className="text-green-300 font-medium">모두 정산 완료</span>
            )}
          </div>
        </div>
      </div>

      {/* 빠른 액세스 정보 */}
      {totalPending > 0 && (
        <div className="mt-4 p-3 bg-white/10 rounded-lg">
          <p className="text-sm text-blue-100">
            💡 <strong>팁:</strong> "오래된 미션 선택" 버튼으로 3일 이상된 미션을 한 번에 선택할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  )
}

export default RewardSummaryCard