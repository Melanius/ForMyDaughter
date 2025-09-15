'use client'

import { useState, useRef } from 'react'
import { AllowanceTransaction, INCOME_CATEGORIES } from '../../lib/types/allowance'
import { isParentRole } from '@/lib/utils/roleUtils'
import { Trash2, Edit } from 'lucide-react'

interface SwipeableTransactionItemProps {
  transaction: AllowanceTransaction
  userType: 'parent' | 'child'
  onEdit?: (transaction: AllowanceTransaction) => void
  onDelete?: (transactionId: string) => void
}

export function SwipeableTransactionItem({
  transaction,
  userType,
  onEdit,
  onDelete
}: SwipeableTransactionItemProps) {
  const [translateX, setTranslateX] = useState(0)
  const [showActions, setShowActions] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const startXRef = useRef(0)
  const isDraggingRef = useRef(false)

  // 권한 검증
  const canDelete = () => {
    const isMissionTransaction = transaction.category === INCOME_CATEGORIES.MISSION
    
    if (isParentRole(userType)) {
      return isMissionTransaction // 부모는 미션완료만 삭제 가능
    } else {
      return !isMissionTransaction // 자녀는 미션완료 제외 모든 것 삭제 가능
    }
  }

  const canEdit = () => {
    const isMissionTransaction = transaction.category === INCOME_CATEGORIES.MISSION
    return !isMissionTransaction // 미션완료는 수정 불가
  }

  // 터치 시작
  const handleTouchStart = (e: React.TouchEvent) => {
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

  // 터치 이동
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const deltaX = touch.clientX - startXRef.current
    
    // 드래그 중임을 표시
    if (Math.abs(deltaX) > 10) {
      isDraggingRef.current = true
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        setLongPressTimer(null)
      }
    }

    // 왼쪽으로만 스와이프 가능 (액션 버튼 노출)
    if (deltaX < 0) {
      const maxSwipe = 120 // 최대 스와이프 거리
      const newTranslateX = Math.max(deltaX, -maxSwipe)
      setTranslateX(newTranslateX)
    }
  }

  // 터치 종료
  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }

    // 스와이프 거리에 따라 액션 버튼 노출/숨김 결정
    if (translateX < -60) {
      setTranslateX(-120) // 액션 버튼 완전 노출
      setShowActions(true)
    } else {
      setTranslateX(0) // 원래 위치로 복원
      setShowActions(false)
    }

    isDraggingRef.current = false
  }

  // 액션 버튼 숨김
  const hideActions = () => {
    setTranslateX(0)
    setShowActions(false)
  }

  // 삭제 처리
  const handleDelete = () => {
    if (canDelete() && onDelete) {
      if (confirm('정말로 이 거래 내역을 삭제하시겠습니까?')) {
        onDelete(transaction.id)
        hideActions()
      }
    }
  }

  // 수정 처리
  const handleEdit = () => {
    if (canEdit() && onEdit) {
      onEdit(transaction)
      hideActions()
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-gray-100 bg-white shadow-sm">
      {/* 액션 버튼 배경 */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center bg-red-50">
        <div className="flex h-full">
          {canEdit() && onEdit && (
            <button
              onClick={handleEdit}
              className="flex items-center justify-center w-16 h-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
              <Edit className="w-5 h-5" />
            </button>
          )}
          {canDelete() && onDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center justify-center w-16 h-full bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 거래 내역 아이템 */}
      <div
        className="relative bg-white p-4 transition-transform duration-200 ease-out touch-pan-y"
        style={{
          transform: `translateX(${translateX}px)`,
          zIndex: 1
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={showActions ? hideActions : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div>
              <p className="font-medium text-gray-800 text-base">{transaction.description}</p>
              <p className="text-sm text-gray-600 mt-1">{transaction.category}</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className={`font-bold text-lg ${
              transaction.type === 'income' ? 'text-green-600' : 'text-pink-600'
            }`}>
              {transaction.type === 'income' ? '+' : '-'}
              {transaction.amount.toLocaleString()}원
            </p>
            <p className="text-xs text-gray-500 mt-1">{transaction.date}</p>
          </div>
        </div>
      </div>

      {/* 롱프레스 액션 오버레이 */}
      {showActions && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-10">
          <div className="flex space-x-4">
            {canEdit() && onEdit && (
              <button
                onClick={handleEdit}
                className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors"
              >
                <Edit className="w-6 h-6" />
              </button>
            )}
            {canDelete() && onDelete && (
              <button
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transition-colors"
              >
                <Trash2 className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}