'use client'

import { useState, memo } from 'react'
import { Mission } from '@/lib/types/mission'

interface MissionCardProps {
  mission: Mission
  userType?: string
  onComplete: () => void
  onUndoComplete: () => void
  onEdit: () => void
  onDelete: () => void
  onUndoTransfer: () => void
}

export const MissionCard = memo(function MissionCard({
  mission,
  userType,
  onComplete,
  onUndoComplete,
  onEdit,
  onDelete,
  onUndoTransfer
}: MissionCardProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAction = async (action: () => void | Promise<void>) => {
    setIsProcessing(true)
    try {
      await action()
    } catch (error) {
      console.error('Mission action failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={`p-6 rounded-xl border-2 transition-all duration-200 ${
      mission.isCompleted 
        ? 'bg-green-50 border-green-200' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className={`text-lg font-semibold ${
              mission.isCompleted ? 'text-green-800 line-through' : 'text-gray-800'
            }`}>
              {mission.title}
            </h3>
            {mission.missionType && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                mission.missionType === '데일리' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {mission.missionType === '데일리' ? '📅 데일리' : '⭐ 이벤트'}
              </span>
            )}
            {mission.category && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                {mission.category}
              </span>
            )}
            {mission.isCompleted && <span className="text-2xl">✅</span>}
          </div>
          
          {mission.description && (
            <p className="text-gray-600 text-sm mb-3">{mission.description}</p>
          )}
          
          <div className="flex items-center gap-4">
            <span className="font-semibold text-green-600">{mission.reward.toLocaleString()}원</span>
            <span className="text-xs text-gray-500">
              {mission.isCompleted ? '완료됨' : '미완료'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 ml-4">
          {!mission.isCompleted ? (
            <>
              <button
                onClick={() => handleAction(onComplete)}
                disabled={isProcessing || mission.isTransferred}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium disabled:bg-gray-300"
              >
                {isProcessing ? '처리중...' : '완료'}
              </button>
              {userType === 'parent' && (
                <>
                  <button
                    onClick={() => handleAction(onEdit)}
                    disabled={isProcessing || mission.isTransferred}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-3 py-1 rounded transition-colors text-xs whitespace-nowrap disabled:bg-gray-300"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleAction(onDelete)}
                    disabled={isProcessing || mission.isTransferred}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 py-1 rounded transition-colors text-xs whitespace-nowrap disabled:bg-gray-300"
                  >
                    삭제
                  </button>
                </>
              )}
            </>
          ) : mission.isTransferred ? (
            <div className="text-center">
              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded mb-2">전달 완료</div>
              <button
                onClick={() => handleAction(onUndoTransfer)}
                disabled={isProcessing}
                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded transition-colors text-xs disabled:bg-gray-300"
              >
                되돌리기
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => handleAction(onUndoComplete)}
                disabled={isProcessing}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium disabled:bg-gray-300"
              >
                취소
              </button>
              {userType === 'parent' && (
                <>
                  <button
                    onClick={() => handleAction(onEdit)}
                    disabled={isProcessing}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-3 py-1 rounded transition-colors text-xs whitespace-nowrap disabled:bg-gray-300"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleAction(onDelete)}
                    disabled={isProcessing}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 py-1 rounded transition-colors text-xs whitespace-nowrap disabled:bg-gray-300"
                  >
                    삭제
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
})
}