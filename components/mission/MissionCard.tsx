'use client'

import { useState, memo, useRef } from 'react'
import { Mission } from '@/lib/types/mission'
import { Trash2, Edit } from 'lucide-react'

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
  const [showActions, setShowActions] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const startXRef = useRef(0)
  const isDraggingRef = useRef(false)

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

  // 부모용 터치 핸들러 (롱프레스 액션)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (userType !== 'parent') return
    
    const touch = e.touches[0]
    startXRef.current = touch.clientX
    isDraggingRef.current = false

    // 롱프레스 타이머 시작
    const timer = setTimeout(() => {
      if (!isDraggingRef.current) {
        setShowActions(true)
        // 진동 피드백 (지원하는 경우)
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      }
    }, 500) // 0.5초

    setLongPressTimer(timer)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (userType !== 'parent') return
    
    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - startXRef.current)
    
    // 드래그 중임을 표시
    if (deltaX > 10) {
      isDraggingRef.current = true
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        setLongPressTimer(null)
      }
    }
  }

  const handleTouchEnd = () => {
    if (userType !== 'parent') return
    
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
    isDraggingRef.current = false
  }

  // 액션 버튼 숨김
  const hideActions = () => {
    setShowActions(false)
  }

  // 삭제 처리
  const handleDeleteAction = () => {
    if (confirm('정말로 이 미션을 삭제하시겠습니까?')) {
      handleAction(onDelete)
      hideActions()
    }
  }

  // 수정 처리
  const handleEditAction = () => {
    handleAction(onEdit)
    hideActions()
  }

  return (
    <div 
      className={`relative p-3 sm:p-6 rounded-lg sm:rounded-2xl transition-all duration-200 shadow-md sm:shadow-lg hover:shadow-lg sm:hover:shadow-xl ${
        mission.isCompleted 
          ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-200' 
          : mission.isTransferred
          ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-200'
          : 'bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 hover:border-orange-300'
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={showActions ? hideActions : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* 1. Pattern/Category/Proposal 태그가 가장 위에 */}
          <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
            {/* 🆕 제안 배지 - 가장 먼저 표시 */}
            {mission.isFromProposal && (
              <span className="flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-3 sm:py-1 text-xs font-medium rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                <span className="text-xs">💡</span>
                <span className="hidden sm:inline">자녀 제안</span>
                <span className="sm:hidden">제안</span>
              </span>
            )}
            {(mission.recurringPattern || mission.missionType) && (
              <span className={`flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-3 sm:py-1 text-xs font-medium rounded-full ${
                (mission.recurringPattern || mission.missionType === '데일리')
                  ? 'bg-blue-500 text-white' 
                  : 'bg-purple-500 text-white'
              }`}>
                <span className="text-xs">{getPatternEmoji(mission.recurringPattern)}</span>
                <span>{getPatternLabel(mission.recurringPattern, mission.missionType)}</span>
              </span>
            )}
            {mission.category && (
              <span className={`flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-3 sm:py-1 text-xs font-medium rounded-full border ${getCategoryStyle(mission.category)}`}>
                <span className="text-xs">{getCategoryIcon(mission.category)}</span>
                <span>{mission.category}</span>
              </span>
            )}
          </div>
          
          {/* 2. 제목이 그 다음에 */}
          <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
            <h3 className={`text-base sm:text-lg font-bold ${
              mission.isCompleted ? 'text-green-800' : 'text-gray-800'
            }`}>
              {mission.title}
            </h3>
          </div>
          
          {/* 금액/상태 정보 표시 */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1">
              <span className="text-base sm:text-xl font-bold text-green-600">{mission.reward.toLocaleString()}원</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-xs sm:text-sm font-medium ${
                mission.isCompleted ? 'text-green-600' : 
                mission.isTransferred ? 'text-blue-600' : 'text-orange-600'
              }`}>
                {mission.isCompleted ? '✅ 완료' : 
                 mission.isTransferred ? '💰 전달됨' : '⏳ 대기중'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-1 sm:gap-2 ml-2 sm:ml-4">
          {!mission.isCompleted ? (
            <>
              {/* 자녀만 완료 버튼 표시 - 개선된 UI */}
              {userType !== 'parent' && (
                <>
                  <button
                    onClick={() => handleAction(onComplete)}
                    disabled={isProcessing || mission.isTransferred}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl transition-all duration-200 text-sm sm:text-base font-bold disabled:from-gray-300 disabled:to-gray-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 mb-2 sm:mb-3"
                  >
                    <span className="text-lg sm:text-xl">{isProcessing ? '⏳' : '🎯'}</span>
                    <span>{isProcessing ? '처리중...' : '미션 완료!'}</span>
                    {!isProcessing && <span className="text-lg sm:text-xl">✨</span>}
                  </button>
                  
                </>
              )}
              {/* 부모 관리 버튼들 - 롱프레스로 대체됨 */}
              {userType === 'parent' && !showActions && (
                <div className="flex items-center justify-center">
                  <div className="bg-gray-100 px-3 py-2 rounded-lg">
                    <p className="text-xs text-gray-600 text-center">길게 눌러서<br/>수정/삭제</p>
                  </div>
                </div>
              )}
            </>
          ) : mission.isTransferred ? (
            <div className="text-center">
              <div className="flex items-center justify-center text-xs sm:text-sm text-blue-700 bg-blue-100 px-2 py-1.5 sm:px-4 sm:py-2.5 rounded-md sm:rounded-lg mb-2 sm:mb-3 font-medium">
                전달완료
              </div>
              {userType === 'parent' && (
                <button
                  onClick={() => handleAction(onUndoTransfer)}
                  disabled={isProcessing}
                  className="w-full bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-700 px-2 py-1.5 sm:px-4 sm:py-2.5 rounded-md sm:rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium border border-gray-200 hover:border-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  되돌리기
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 자녀만 완료 취소 버튼 표시 - 개선된 UI */}
              {userType !== 'parent' && (
                <>
                  <button
                    onClick={() => handleAction(onUndoComplete)}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-700 hover:text-orange-800 px-4 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl transition-all duration-200 text-sm sm:text-base font-medium disabled:bg-gray-100 disabled:text-gray-400 border-2 border-orange-200 hover:border-orange-300 transform hover:scale-105 active:scale-95 mb-2 sm:mb-3 shadow-md hover:shadow-lg"
                  >
                    <span className="text-lg sm:text-xl">🔄</span>
                    <span>완료 취소</span>
                  </button>
                  
                </>
              )}
              {/* 부모 관리 버튼들 - 롱프레스로 대체됨 */}
              {userType === 'parent' && !showActions && (
                <div className="flex items-center justify-center">
                  <div className="bg-gray-100 px-3 py-2 rounded-lg">
                    <p className="text-xs text-gray-600 text-center">길게 눌러서<br/>수정/삭제</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 롱프레스 액션 오버레이 (부모용) */}
      {showActions && userType === 'parent' && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-10 rounded-lg sm:rounded-2xl">
          <div className="flex space-x-4">
            <button
              onClick={handleEditAction}
              className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors flex items-center justify-center"
            >
              <Edit className="w-6 h-6" />
            </button>
            <button
              onClick={handleDeleteAction}
              className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transition-colors flex items-center justify-center"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
})