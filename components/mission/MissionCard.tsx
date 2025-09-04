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
    <div className={`p-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl ${
      mission.isCompleted 
        ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-200' 
        : mission.isTransferred
        ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-200'
        : 'bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 hover:border-orange-300'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            {mission.isCompleted && <span className="text-3xl animate-pulse">🎉</span>}
            {mission.isTransferred && !mission.isCompleted && <span className="text-2xl">💰</span>}
            {!mission.isCompleted && !mission.isTransferred && <span className="text-2xl">🎯</span>}
            <h3 className={`text-lg font-bold ${
              mission.isCompleted ? 'text-green-800' : 'text-gray-800'
            }`}>
              {mission.title}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            {mission.missionType && (
              <span className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${
                mission.missionType === '데일리' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-purple-500 text-white'
              }`}>
                <span>{mission.missionType === '데일리' ? '📅' : '⭐'}</span>
                <span>{mission.missionType}</span>
              </span>
            )}
            {mission.category && (
              <span className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-full font-medium">
                {mission.category}
              </span>
            )}
          </div>
          
          {mission.description && (
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">{mission.description}</p>
          )}
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-xl">💰</span>
              <span className="text-xl font-bold text-green-600">{mission.reward.toLocaleString()}원</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-sm font-medium ${
                mission.isCompleted ? 'text-green-600' : 
                mission.isTransferred ? 'text-blue-600' : 'text-orange-600'
              }`}>
                {mission.isCompleted ? '✅ 완료' : 
                 mission.isTransferred ? '💰 전달됨' : '⏳ 대기중'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 ml-4">
          {!mission.isCompleted ? (
            <>
              <button
                onClick={() => handleAction(onComplete)}
                disabled={isProcessing || mission.isTransferred}
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-2xl transition-all duration-200 text-sm font-bold disabled:from-gray-300 disabled:to-gray-300 shadow-lg hover:shadow-xl"
              >
                <span>{isProcessing ? '⏳' : '✅'}</span>
                <span>{isProcessing ? '처리중' : '완료!'}</span>
              </button>
              {userType === 'parent' && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAction(onEdit)}
                    disabled={isProcessing || mission.isTransferred}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 px-3 py-1 rounded-md transition-colors text-xs font-medium disabled:bg-gray-100 disabled:text-gray-400 border border-slate-200"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleAction(onDelete)}
                    disabled={isProcessing || mission.isTransferred}
                    className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 px-3 py-1 rounded-md transition-colors text-xs font-medium disabled:bg-gray-100 disabled:text-gray-400 border border-red-200"
                  >
                    삭제
                  </button>
                </div>
              )}
            </>
          ) : mission.isTransferred ? (
            <div className="text-center">
              <div className="flex items-center gap-1 text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded-xl mb-2 font-medium">
                <span>전달 완료</span>
              </div>
              <button
                onClick={() => handleAction(onUndoTransfer)}
                disabled={isProcessing}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 px-3 py-1 rounded-md transition-colors text-xs font-medium disabled:bg-gray-100 disabled:text-gray-400 border border-gray-200"
              >
                되돌리기
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => handleAction(onUndoComplete)}
                disabled={isProcessing}
                className="bg-orange-100 hover:bg-orange-200 text-orange-700 hover:text-orange-800 px-4 py-2 rounded-md transition-colors text-sm font-medium disabled:bg-gray-100 disabled:text-gray-400 border border-orange-200"
              >
                취소
              </button>
              {userType === 'parent' && (
                <>
                  <button
                    onClick={() => handleAction(onEdit)}
                    disabled={isProcessing}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 px-3 py-1 rounded-md transition-colors text-xs font-medium disabled:bg-gray-100 disabled:text-gray-400 border border-slate-200"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleAction(onDelete)}
                    disabled={isProcessing}
                    className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 px-3 py-1 rounded-md transition-colors text-xs font-medium disabled:bg-gray-100 disabled:text-gray-400 border border-red-200"
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