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

  // 반복 패턴 이모지 (템플릿과 동일)
  const getPatternEmoji = (recurringPattern?: string) => {
    if (!recurringPattern) {
      // missionType으로 fallback
      return mission.missionType === '데일리' ? '☀️' : '⭐'
    }
    
    switch (recurringPattern) {
      case 'daily': return '☀️'
      case 'weekdays': return '🎒'
      case 'weekends': return '🏖️'
      case 'weekly_sun':
      case 'weekly_mon':
      case 'weekly_tue':
      case 'weekly_wed':
      case 'weekly_thu':
      case 'weekly_fri':
      case 'weekly_sat':
        return '📋'
      default: return '☀️'
    }
  }

  // 반복 패턴 라벨
  const getPatternLabel = (recurringPattern?: string, missionType?: string) => {
    if (!recurringPattern) {
      return missionType || '이벤트'
    }
    
    switch (recurringPattern) {
      case 'daily': return '매일'
      case 'weekdays': return '평일만'
      case 'weekends': return '주말만'
      case 'weekly_sun': return '매주 일요일'
      case 'weekly_mon': return '매주 월요일'
      case 'weekly_tue': return '매주 화요일'
      case 'weekly_wed': return '매주 수요일'
      case 'weekly_thu': return '매주 목요일'
      case 'weekly_fri': return '매주 금요일'
      case 'weekly_sat': return '매주 토요일'
      default: return missionType || '이벤트'
    }
  }

  // 카테고리별 색상 시스템
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case '집안일':
        return 'bg-green-100 text-green-700 border-green-200'
      case '공부':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case '운동':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case '독서':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case '건강':
        return 'bg-pink-100 text-pink-700 border-pink-200'
      case '예의':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200'
      case '기타':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  // 카테고리 아이콘
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '집안일': return '🏠'
      case '공부': return '📚'
      case '운동': return '⚽'
      case '독서': return '📖'
      case '건강': return '💪'
      case '예의': return '🙏'
      case '기타': return '📝'
      default: return '📝'
    }
  }

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
          {/* 1. Pattern/Category 태그가 가장 위에 */}
          <div className="flex items-center gap-2 mb-3">
            {(mission.recurringPattern || mission.missionType) && (
              <span className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${
                (mission.recurringPattern || mission.missionType === '데일리')
                  ? 'bg-blue-500 text-white' 
                  : 'bg-purple-500 text-white'
              }`}>
                <span>{getPatternEmoji(mission.recurringPattern)}</span>
                <span>{getPatternLabel(mission.recurringPattern, mission.missionType)}</span>
              </span>
            )}
            {mission.category && (
              <span className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border ${getCategoryStyle(mission.category)}`}>
                <span>{getCategoryIcon(mission.category)}</span>
                <span>{mission.category}</span>
              </span>
            )}
          </div>
          
          {/* 2. 제목이 그 다음에 */}
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
          
          {/* 부모 계정에서만 금액/상태를 여기에 표시 */}
          {userType === 'parent' && (
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
          )}
        </div>
        
        <div className="flex flex-col gap-2 ml-4">
          {!mission.isCompleted ? (
            <>
              {/* 자녀만 완료 버튼 표시 */}
              {userType !== 'parent' && (
                <>
                  <button
                    onClick={() => handleAction(onComplete)}
                    disabled={isProcessing || mission.isTransferred}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-2xl transition-all duration-200 text-sm font-bold disabled:from-gray-300 disabled:to-gray-300 shadow-lg hover:shadow-xl mb-3"
                  >
                    <span>{isProcessing ? '⏳' : '✅'}</span>
                    <span>{isProcessing ? '처리중' : '완료!'}</span>
                  </button>
                  
                  {/* 3. 자녀 계정에서 완료 버튼 아래에 금액/상태 표시 */}
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-lg">💰</span>
                      <span className="text-lg font-bold text-green-600">{mission.reward.toLocaleString()}원</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-sm font-medium ${
                        mission.isCompleted ? 'text-green-600' : 
                        mission.isTransferred ? 'text-blue-600' : 'text-orange-600'
                      }`}>
                        {mission.isCompleted ? '✅ 완료' : 
                         mission.isTransferred ? '💰 전달됨' : '⏳ 대기중'}
                      </span>
                    </div>
                  </div>
                </>
              )}
              {/* 부모 관리 버튼들 */}
              {userType === 'parent' && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleAction(onEdit)}
                    disabled={isProcessing || mission.isTransferred}
                    className="w-full bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium border-2 border-blue-200 hover:border-blue-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleAction(onDelete)}
                    disabled={isProcessing || mission.isTransferred}
                    className="w-full bg-white hover:bg-red-50 text-red-600 hover:text-red-700 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium border-2 border-red-200 hover:border-red-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200"
                  >
                    삭제
                  </button>
                </div>
              )}
            </>
          ) : mission.isTransferred ? (
            <div className="text-center">
              <div className="flex items-center justify-center text-sm text-blue-700 bg-blue-100 px-4 py-2.5 rounded-lg mb-3 font-medium">
                전달 완료
              </div>
              {userType === 'parent' && (
                <button
                  onClick={() => handleAction(onUndoTransfer)}
                  disabled={isProcessing}
                  className="w-full bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-700 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium border-2 border-gray-200 hover:border-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  전달 되돌리기
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 자녀만 완료 취소 버튼 표시 */}
              {userType !== 'parent' && (
                <>
                  <button
                    onClick={() => handleAction(onUndoComplete)}
                    disabled={isProcessing}
                    className="bg-orange-100 hover:bg-orange-200 text-orange-700 hover:text-orange-800 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium disabled:bg-gray-100 disabled:text-gray-400 border-2 border-orange-200 hover:border-orange-300 mb-3"
                  >
                    완료 취소
                  </button>
                  
                  {/* 자녀 계정에서 완료 취소 버튼 아래에 금액/상태 표시 */}
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-lg">💰</span>
                      <span className="text-lg font-bold text-green-600">{mission.reward.toLocaleString()}원</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-sm font-medium ${
                        mission.isCompleted ? 'text-green-600' : 
                        mission.isTransferred ? 'text-blue-600' : 'text-orange-600'
                      }`}>
                        {mission.isCompleted ? '✅ 완료' : 
                         mission.isTransferred ? '💰 전달됨' : '⏳ 대기중'}
                      </span>
                    </div>
                  </div>
                </>
              )}
              {/* 부모 관리 버튼들 */}
              {userType === 'parent' && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleAction(onEdit)}
                    disabled={isProcessing}
                    className="w-full bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium border-2 border-blue-200 hover:border-blue-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleAction(onDelete)}
                    disabled={isProcessing}
                    className="w-full bg-white hover:bg-red-50 text-red-600 hover:text-red-700 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium border-2 border-red-200 hover:border-red-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200"
                  >
                    삭제
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
})