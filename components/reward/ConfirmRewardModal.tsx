/**
 * ✅ 정산 확인 모달 컴포넌트
 */

'use client'

import { X, DollarSign, User, Clock, MessageSquare } from 'lucide-react'
import { PendingRewardMission } from '@/lib/types/reward'

interface ConfirmRewardModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  missions: PendingRewardMission[]
  totalAmount: number
  parentNote: string
  onParentNoteChange: (note: string) => void
  isProcessing: boolean
}

export function ConfirmRewardModal({
  isOpen,
  onClose,
  onConfirm,
  missions,
  totalAmount,
  parentNote,
  onParentNoteChange,
  isProcessing
}: ConfirmRewardModalProps) {
  if (!isOpen) return null

  // 자녀별 그룹핑
  const childGroups = missions.reduce((groups, mission) => {
    const childName = mission.childName
    if (!groups[childName]) {
      groups[childName] = []
    }
    groups[childName].push(mission)
    return groups
  }, {} as Record<string, PendingRewardMission[]>)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">용돈 전달 확인</h2>
              <p className="text-sm text-gray-600">다음 미션들을 정산하시겠습니까?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-4 max-h-[50vh] overflow-y-auto">
          {/* 정산 요약 */}
          <div className="bg-green-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">
                  총 {totalAmount.toLocaleString()}원
                </span>
                <span className="text-green-600">
                  ({missions.length}개 미션)
                </span>
              </div>
              <div className="text-sm text-green-600">
                {Object.keys(childGroups).length}명에게 전달
              </div>
            </div>
          </div>

          {/* 자녀별 미션 목록 */}
          <div className="space-y-4">
            {Object.entries(childGroups).map(([childName, childMissions]) => {
              const childTotal = childMissions.reduce((sum, m) => sum + m.reward, 0)
              
              return (
                <div key={childName} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* 자녀 헤더 */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-gray-900">{childName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">{childMissions.length}개 미션</span>
                        <span className="font-semibold text-green-600">
                          {childTotal.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 미션 목록 */}
                  <div className="divide-y divide-gray-100">
                    {childMissions.map(mission => (
                      <div key={mission.id} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {mission.title}
                            </div>
                            {mission.description && (
                              <div className="text-sm text-gray-600 mt-1">
                                {mission.description}
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              <span className="bg-gray-100 px-2 py-1 rounded-full">
                                {mission.category}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {mission.daysSinceCompletion}일 전 완료
                              </span>
                            </div>
                          </div>
                          <div className="ml-3 text-right">
                            <div className="font-semibold text-green-600">
                              {mission.reward.toLocaleString()}원
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 부모 메모 */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4 inline mr-1" />
              메모 (선택사항)
            </label>
            <textarea
              value={parentNote}
              onChange={(e) => onParentNoteChange(e.target.value)}
              placeholder="자녀에게 전달할 메시지를 입력하세요..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              disabled={isProcessing}
            />
            <div className="text-xs text-gray-500 mt-1">
              예: "이번 주도 미션을 열심히 완수해줘서 고마워! 🎉"
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            정산 후 각 자녀의 용돈 잔액에 자동으로 추가됩니다.
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  처리 중...
                </div>
              ) : (
                `용돈 전달하기 (${totalAmount.toLocaleString()}원)`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmRewardModal