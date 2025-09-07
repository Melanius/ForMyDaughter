'use client'

import { useState } from 'react'

interface AddMissionModalProps {
  onClose: () => void
  onAdd: (mission: { title: string; description: string; reward: number; category?: string; missionType?: string; date?: string }) => void
  editingMission?: { id: string; title: string; description?: string; reward: number; category?: string; missionType?: string } | null
  defaultDate?: string
}

export function AddMissionModal({ onClose, onAdd, editingMission, defaultDate }: AddMissionModalProps) {
  const [title, setTitle] = useState(editingMission?.title || '')
  const [reward, setReward] = useState(editingMission?.reward || 500)
  const [category, setCategory] = useState(editingMission?.category || '집안일')
  const [missionType, setMissionType] = useState('이벤트')
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = ['집안일', '공부', '운동', '독서', '건강', '예의', '기타']

  // 카테고리 아이콘 함수 (MissionTemplateModal과 동일)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) return
    
    setIsSubmitting(true)
    await onAdd({ 
      title: title.trim(), 
      description: '', 
      reward,
      category,
      missionType,
      ...(date && { date })
    })
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">{editingMission ? '미션 수정' : '이벤트 미션 추가'}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              미션 제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 방 청소하기"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              카테고리 *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => (
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              미션 날짜
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              보상 금액
            </label>
            <div className="relative">
              <input
                type="number"
                value={reward}
                onChange={(e) => setReward(Number(e.target.value))}
                min="100"
                step="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-2 text-gray-500">원</span>
            </div>
          </div>
          
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
{isSubmitting ? (editingMission ? '수정 중...' : '추가 중...') : (editingMission ? '미션 수정' : '이벤트 미션 추가')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}