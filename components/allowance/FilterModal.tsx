'use client'

import { useState, useCallback } from 'react'
import { getDateRangeForFilter, validateDateRange } from '@/lib/utils/dateFilters'

export interface FilterOption {
  type: 'this_month' | 'last_month' | '3_months' | 'this_year' | 'custom'
  startDate?: string
  endDate?: string
}

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyFilter: (filter: FilterOption) => void
}

interface ValidationError {
  message: string
}

const FILTER_OPTIONS = [
  { type: 'this_month' as const, label: '이번 달', emoji: '📅' },
  { type: 'last_month' as const, label: '지난 달', emoji: '⬅️' },
  { type: '3_months' as const, label: '최근 3개월', emoji: '📊' },
  { type: 'this_year' as const, label: '올해', emoji: '🗓️' },
  { type: 'custom' as const, label: '직접 설정', emoji: '⚙️' }
] as const

export default function FilterModal({ isOpen, onClose, onApplyFilter }: FilterModalProps) {
  const [selectedType, setSelectedType] = useState<FilterOption['type']>('this_month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [error, setError] = useState<ValidationError | null>(null)

  if (!isOpen) return null

  const handleApply = useCallback(() => {
    setError(null)
    
    let filter: FilterOption = { type: selectedType }

    if (selectedType === 'custom') {
      const validationError = validateDateRange(customStartDate, customEndDate)
      if (validationError) {
        setError({ message: validationError })
        return
      }
      filter.startDate = customStartDate
      filter.endDate = customEndDate
    } else {
      const dateRange = getDateRangeForFilter(selectedType)
      filter = { ...filter, ...dateRange }
    }

    onApplyFilter(filter)
    onClose()
  }, [selectedType, customStartDate, customEndDate, onApplyFilter, onClose])
  
  const handleClose = useCallback(() => {
    setError(null)
    onClose()
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">
            필터 설정
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          {/* 필터 옵션들 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              기간 선택
            </label>
            <div className="space-y-2">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => setSelectedType(option.type)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-colors flex items-center space-x-3 ${
                    selectedType === option.type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{option.emoji}</span>
                  <span className="font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 오류 메시지 */}
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-800 text-sm font-medium">⚠️ {error.message}</p>
            </div>
          )}

          {/* 커스텀 날짜 선택 */}
          {selectedType === 'custom' && (
            <div className="mt-4 space-y-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시작일
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  종료일
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* 버튼들 */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              적용
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}