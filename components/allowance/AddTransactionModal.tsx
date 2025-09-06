'use client'

import { useState } from 'react'
import { AllowanceTransaction, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../../lib/types/allowance'
import { getTodayKST } from '@/lib/utils/dateUtils'

interface AddTransactionModalProps {
  onClose: () => void
  onAdd: (transaction: Omit<AllowanceTransaction, 'id' | 'createdAt'>) => void
  editingTransaction?: AllowanceTransaction | null
}

export default function AddTransactionModal({ onClose, onAdd, editingTransaction }: AddTransactionModalProps) {
  const [type, setType] = useState<'income' | 'expense'>(editingTransaction?.type || 'expense')
  const [amount, setAmount] = useState(editingTransaction?.amount || 0)
  const [description, setDescription] = useState(editingTransaction?.description || '')
  const [category, setCategory] = useState(editingTransaction?.category || '')
  const [date, setDate] = useState(editingTransaction?.date || getTodayKST())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const incomeCategories = Object.values(INCOME_CATEGORIES)
  const expenseCategories = Object.values(EXPENSE_CATEGORIES)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!description.trim() || amount < 1 || !category) {
      alert('모든 필드를 올바르게 입력해주세요.')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      await onAdd({
        type,
        amount,
        description: description.trim(),
        category,
        date
      })
    } catch (error) {
      console.error('Failed to add transaction:', error)
      alert('거래 내역 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case INCOME_CATEGORIES.MISSION: return '🎯'
      case INCOME_CATEGORIES.ALLOWANCE: return '💰'
      case INCOME_CATEGORIES.GIFT: return '🎁'
      case INCOME_CATEGORIES.BONUS: return '⭐'
      case EXPENSE_CATEGORIES.SNACK: return '🍪'
      case EXPENSE_CATEGORIES.TOY: return '🧸'
      case EXPENSE_CATEGORIES.BOOK: return '📚'
      case EXPENSE_CATEGORIES.STATIONERY: return '✏️'
      case EXPENSE_CATEGORIES.GAME: return '🎮'
      case EXPENSE_CATEGORIES.CLOTHES: return '👕'
      case EXPENSE_CATEGORIES.SAVING: return '🏦'
      default: return '📝'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">
            {editingTransaction ? '거래 내역 수정' : '새 거래 추가'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 타입 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              거래 유형
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setType('income')
                  setCategory('')
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  type === 'income'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">💰</div>
                <div className="font-medium">수입</div>
                <div className="text-xs text-gray-500">용돈, 선물 등</div>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setType('expense')
                  setCategory('')
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  type === 'expense'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">💸</div>
                <div className="font-medium">지출</div>
                <div className="text-xs text-gray-500">구매, 사용 등</div>
              </button>
            </div>
          </div>

          {/* 금액 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              금액 *
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                max="10000000000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                placeholder="금액을 입력하세요"
                required
              />
              <span className="absolute right-3 top-3 text-gray-500">원</span>
            </div>
          </div>

          {/* 설명 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명 *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={type === 'income' ? '어떻게 받았나요?' : '무엇을 샀나요?'}
              required
            />
          </div>

          {/* 카테고리 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              카테고리 *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(type === 'income' ? incomeCategories : expenseCategories).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`p-3 rounded-lg border transition-all text-center ${
                    category === cat
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-lg">{getCategoryIcon(cat)}</span>
                    <span className="text-xs font-medium">{cat}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 날짜 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              날짜
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              max={getTodayKST()}
            />
          </div>

          {/* 미리보기 */}
          {amount > 0 && description && category && (
            <div className={`p-4 rounded-lg border-2 ${
              type === 'income'
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}>
              <h4 className="font-medium text-gray-800 mb-2">미리보기</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getCategoryIcon(category)}</span>
                  <div>
                    <p className="font-medium">{description}</p>
                    <p className="text-sm text-gray-600">{date} • {category}</p>
                  </div>
                </div>
                <span className={`font-bold text-lg ${
                  type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {type === 'income' ? '+' : '-'}{amount.toLocaleString()}원
                </span>
              </div>
            </div>
          )}
          
          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!description.trim() || amount < 1 || !category || isSubmitting}
              className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
              {isSubmitting 
                ? (editingTransaction ? '수정 중...' : '추가 중...') 
                : (editingTransaction ? '수정하기' : '추가하기')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}