'use client'

import { useState, useEffect } from 'react'
import { ChildProfile } from '@/lib/types/allowance-planner'
import allowancePlannerService from '@/lib/services/allowance-planner'

interface QuickSetupProps {
  selectedChild: ChildProfile | null
  onChildSelect: (child: ChildProfile) => void
  monthlyBudget: number
  onBudgetChange: (amount: number) => void
  children: ChildProfile[]
}

export function QuickSetup({
  selectedChild,
  onChildSelect,
  monthlyBudget,
  onBudgetChange,
  children
}: QuickSetupProps) {
  const [recommendedAmount, setRecommendedAmount] = useState<number>(0)

  useEffect(() => {
    if (selectedChild) {
      const recommendation = allowancePlannerService.getSmartRecommendation(selectedChild)
      setRecommendedAmount(recommendation.totalAmount)
      
      // 처음 선택 시 추천 금액으로 자동 설정
      if (monthlyBudget === 0) {
        onBudgetChange(recommendation.totalAmount)
      }
    }
  }, [selectedChild, monthlyBudget, onBudgetChange])

  const handleChildChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const childId = e.target.value
    const child = children.find(c => c.id === childId)
    if (child) {
      onChildSelect(child)
    }
  }

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseInt(e.target.value) || 0
    onBudgetChange(amount)
  }

  const useRecommended = () => {
    onBudgetChange(recommendedAmount)
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        1️⃣ 스마트 설정 <span className="text-sm text-gray-500">(30초)</span>
      </h3>
      
      <div className="space-y-6">
        {/* 자녀 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            자녀 선택
          </label>
          <div className="relative">
            <select
              value={selectedChild?.id || ''}
              onChange={handleChildChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">자녀를 선택해주세요</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.name} ({child.grade === 'elementary' ? '초등' : '중학'} {child.level}학년)
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-gray-400">▼</span>
            </div>
          </div>
        </div>

        {/* 월 목표 금액 */}
        {selectedChild && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              월 용돈 목표
            </label>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={monthlyBudget}
                  onChange={handleBudgetChange}
                  placeholder={`추천 ${recommendedAmount.toLocaleString()}원`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-gray-500">
                  원
                </span>
              </div>
              
              {/* 추천 금액 버튼 */}
              <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">💡</span>
                  <div>
                    <div className="text-sm font-medium text-blue-800">
                      AI 추천: {recommendedAmount.toLocaleString()}원
                    </div>
                    <div className="text-xs text-blue-600">
                      {selectedChild.grade === 'elementary' ? '초등' : '중학'} {selectedChild.level}학년 표준 금액
                    </div>
                  </div>
                </div>
                <button
                  onClick={useRecommended}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  적용
                </button>
              </div>

              {/* 과거 완료율 정보 */}
              {selectedChild.pastCompletionRate && (
                <div className="flex items-center bg-green-50 rounded-lg p-3">
                  <span className="text-green-600 mr-2">📊</span>
                  <div className="text-sm">
                    <span className="font-medium text-green-800">
                      {selectedChild.name}의 지난 달 완료율: {Math.round(selectedChild.pastCompletionRate * 100)}%
                    </span>
                    <div className="text-xs text-green-600 mt-1">
                      이 데이터를 바탕으로 추천 금액이 조정되었습니다
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}