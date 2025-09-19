/**
 * 💰 거래 내역 상세 모달
 * 
 * 용돈 거래의 상세 정보를 표시하고, 미션과의 연결 관계를 보여주는 모달
 */

'use client'

import React, { useState, useEffect } from 'react'
import { AllowanceTransaction, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/types/allowance'
import { Mission } from '@/lib/types/mission'
import missionSupabaseService from '@/lib/services/missionSupabase'
import { formatDateKST } from '@/lib/utils/dateUtils'
import { isParentRole } from '@/lib/utils/roleUtils'

interface TransactionDetailModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: AllowanceTransaction | null
  userType: 'parent' | 'child'
  onEdit?: (transaction: AllowanceTransaction) => void
  onDelete?: (transactionId: string) => void
}

interface RelatedMission {
  id: string
  title: string
  category: string
  date: string
  reward: number
  completedAt?: string
}

export function TransactionDetailModal({ 
  isOpen, 
  onClose, 
  transaction, 
  userType,
  onEdit,
  onDelete 
}: TransactionDetailModalProps) {
  const [relatedMissions, setRelatedMissions] = useState<RelatedMission[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && transaction) {
      loadRelatedMissions()
    }
  }, [isOpen, transaction])

  const loadRelatedMissions = async () => {
    if (!transaction) return

    // 미션 완료 수입인 경우 관련 미션들 조회
    if (transaction.category === INCOME_CATEGORIES.MISSION) {
      setLoading(true)
      try {
        // 거래 날짜 기준으로 해당 일의 완료된 미션들 조회
        const missions = await missionSupabaseService.getUserMissions(
          transaction.userId, 
          transaction.date.split('T')[0] // YYYY-MM-DD 형식으로 변환
        )
        
        const completedMissions = missions
          .filter(mission => mission.isCompleted)
          .map(mission => ({
            id: mission.id,
            title: mission.title,
            category: mission.category,
            date: mission.date,
            reward: mission.reward,
            completedAt: mission.completedAt
          }))
        
        setRelatedMissions(completedMissions)
      } catch (error) {
        console.error('관련 미션 조회 실패:', error)
        setRelatedMissions([])
      } finally {
        setLoading(false)
      }
    } else {
      setRelatedMissions([])
    }
  }

  const getCategoryIcon = (category: string) => {
    if (category === INCOME_CATEGORIES.MISSION) return '🎯'
    if (category === INCOME_CATEGORIES.ALLOWANCE) return '💝'
    if (category === INCOME_CATEGORIES.GIFT) return '🎁'
    if (category === EXPENSE_CATEGORIES.FOOD) return '🍔'
    if (category === EXPENSE_CATEGORIES.ENTERTAINMENT) return '🎮'
    if (category === EXPENSE_CATEGORIES.EDUCATION) return '📚'
    if (category === EXPENSE_CATEGORIES.SHOPPING) return '🛒'
    if (category === EXPENSE_CATEGORIES.TRANSPORT) return '🚌'
    return '💰'
  }

  const getTransactionTypeInfo = () => {
    if (!transaction) return { label: '', color: '', bgColor: '' }
    
    if (transaction.amount > 0) {
      return {
        label: '수입',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      }
    } else {
      return {
        label: '지출',
        color: 'text-red-600', 
        bgColor: 'bg-red-50'
      }
    }
  }

  const canEdit = () => {
    if (!transaction) return false
    const isMissionTransaction = transaction.category === INCOME_CATEGORIES.MISSION
    return !isMissionTransaction // 미션완료는 수정 불가
  }

  const canDelete = () => {
    if (!transaction) return false
    const isMissionTransaction = transaction.category === INCOME_CATEGORIES.MISSION
    
    if (isParentRole(userType)) {
      return isMissionTransaction // 부모는 미션완료만 삭제 가능
    } else {
      return !isMissionTransaction // 자녀는 미션완료 제외 모든 것 삭제 가능
    }
  }

  if (!isOpen || !transaction) return null

  const typeInfo = getTransactionTypeInfo()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <span className="text-2xl mr-3">{getCategoryIcon(transaction.category)}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-800">거래 상세</h2>
              <p className="text-sm text-gray-600">{formatDateKST(new Date(transaction.date))}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* 거래 정보 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 금액 및 타입 */}
          <div className={`${typeInfo.bgColor} rounded-xl p-4 mb-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{typeInfo.label}</p>
                <p className={`text-2xl font-bold ${typeInfo.color}`}>
                  {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}원
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${typeInfo.color} ${typeInfo.bgColor}`}>
                {transaction.category}
              </div>
            </div>
          </div>

          {/* 거래 내용 */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">거래 내용</label>
              <p className="text-gray-800 bg-gray-50 rounded-lg p-3">
                {transaction.description || '설명 없음'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">카테고리</label>
              <div className="flex items-center">
                <span className="mr-2">{getCategoryIcon(transaction.category)}</span>
                <span className="text-gray-800">{transaction.category}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">거래 시간</label>
              <p className="text-gray-800">
                {formatDateKST(new Date(transaction.date), 'yyyy년 MM월 dd일 HH:mm')}
              </p>
            </div>

            {/* 관련 미션 정보 (미션 완료 수입인 경우) */}
            {transaction.category === INCOME_CATEGORIES.MISSION && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">관련 미션</label>
                {loading ? (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                      <span className="text-blue-700">관련 미션 조회 중...</span>
                    </div>
                  </div>
                ) : relatedMissions.length > 0 ? (
                  <div className="space-y-2">
                    {relatedMissions.map((mission) => (
                      <div key={mission.id} className="bg-green-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-800">{mission.title}</p>
                            <p className="text-xs text-green-600">{mission.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-700">{mission.reward.toLocaleString()}원</p>
                            {mission.completedAt && (
                              <p className="text-xs text-green-600">
                                {formatDateKST(new Date(mission.completedAt), 'HH:mm')} 완료
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-xs text-yellow-700">
                        💡 이 거래는 위 미션들의 완료 보상으로 자동 생성되었습니다.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600 text-sm">관련 미션 정보를 찾을 수 없습니다.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            닫기
          </button>
          
          {canEdit() && onEdit && (
            <button
              onClick={() => {
                onEdit(transaction)
                onClose()
              }}
              className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              수정
            </button>
          )}
          
          {canDelete() && onDelete && (
            <button
              onClick={() => {
                if (confirm('이 거래를 삭제하시겠습니까?')) {
                  onDelete(transaction.id)
                  onClose()
                }
              }}
              className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
            >
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  )
}