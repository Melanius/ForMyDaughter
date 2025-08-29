'use client'

import { useState, useEffect } from 'react'
import { MissionTemplate } from '../../lib/types/mission'

interface MissionTemplateModalProps {
  onClose: () => void
  onSave: (template: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void
  editingTemplate?: MissionTemplate | null
}

export function MissionTemplateModal({ onClose, onSave, editingTemplate }: MissionTemplateModalProps) {
  const [title, setTitle] = useState(editingTemplate?.title || '')
  const [description, setDescription] = useState(editingTemplate?.description || '')
  const [reward, setReward] = useState(editingTemplate?.reward || 500)
  const [category, setCategory] = useState(editingTemplate?.category || '집안일')
  const [missionType, setMissionType] = useState<'daily' | 'event'>(editingTemplate?.missionType || 'daily')
  const [isActive, setIsActive] = useState(editingTemplate?.isActive !== undefined ? editingTemplate.isActive : true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = ['집안일', '공부', '운동', '독서', '건강', '예의', '기타']

  // editingTemplate가 변경될 때 상태를 업데이트
  useEffect(() => {
    console.log('🔄 MissionTemplateModal - editingTemplate 변경감지:', {
      editingTemplate: !!editingTemplate,
      templateId: editingTemplate?.id,
      templateTitle: editingTemplate?.title,
      templateReward: editingTemplate?.reward
    })
    
    if (editingTemplate) {
      setTitle(editingTemplate.title)
      setDescription(editingTemplate.description)
      setReward(editingTemplate.reward)
      setCategory(editingTemplate.category)
      setMissionType(editingTemplate.missionType)
      setIsActive(editingTemplate.isActive)
    } else {
      // 새 템플릿 생성시 초기값
      setTitle('')
      setDescription('')
      setReward(500)
      setCategory('집안일')
      setMissionType('daily')
      setIsActive(true)
    }
  }, [editingTemplate])
  
  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🔥 MissionTemplateModal - handleSubmit 시작:', {
      editingTemplate: !!editingTemplate,
      editingTemplateId: editingTemplate?.id,
      reward: reward,
      title: title.trim(),
      isSubmitting
    })
    
    e.preventDefault()
    
    if (!title.trim() || !description.trim()) {
      console.log('❌ MissionTemplateModal - 유효성 검사 실패: 제목 또는 설명 누락')
      alert('제목과 설명을 입력해주세요.')
      return
    }
    
    console.log('🚀 MissionTemplateModal - onSave 호출 준비:', {
      templateData: {
        title: title.trim(),
        description: description.trim(),
        reward,
        category,
        missionType,
        isActive
      }
    })
    
    setIsSubmitting(true)
    
    try {
      console.log('📞 MissionTemplateModal - onSave 함수 호출 중...')
      await onSave({
        title: title.trim(),
        description: description.trim(),
        reward,
        category,
        missionType,
        isActive
      })
      console.log('✅ MissionTemplateModal - onSave 완료')
    } catch (error) {
      console.error('❌ MissionTemplateModal - onSave 실패:', error)
      alert('템플릿 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
      console.log('🏁 MissionTemplateModal - handleSubmit 종료')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">
            {editingTemplate ? '미션 템플릿 수정' : '새 미션 템플릿 만들기'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 text-lg">💡</span>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">미션 템플릿이란?</p>
              <p>반복적으로 사용할 수 있는 미션의 기본 틀입니다. 데일리 템플릿은 매일 자동으로 생성되어 아이가 꾸준히 할 수 있는 습관을 만들어줍니다.</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 미션 유형 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              미션 유형 *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMissionType('daily')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  missionType === 'daily'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">📅</div>
                <div className="font-medium">데일리</div>
                <div className="text-xs text-gray-500">매일 반복</div>
              </button>
              
              <button
                type="button"
                onClick={() => setMissionType('event')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  missionType === 'event'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">⭐</div>
                <div className="font-medium">이벤트</div>
                <div className="text-xs text-gray-500">특별한 날</div>
              </button>
            </div>
          </div>

          {/* 템플릿 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              템플릿 제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 방 청소하기, 숙제 완료하기"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          {/* 상세 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상세 설명 *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="미션에 대한 자세한 설명을 입력해주세요. 아이가 이해하기 쉽게 구체적으로 적어주세요."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              required
            />
          </div>
          
          {/* 카테고리와 보상 금액 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                보상 금액
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={reward}
                  onChange={(e) => setReward(Number(e.target.value))}
                  min="100"
                  step="100"
                  max="10000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                />
                <span className="absolute right-3 top-3 text-gray-500">원</span>
              </div>
            </div>
          </div>

          {/* 활성화 상태 */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              템플릿 활성화 {missionType === 'daily' && '(체크하면 매일 자동으로 미션이 생성됩니다)'}
            </label>
          </div>

          {/* 미리보기 */}
          {title && description && (
            <div className={`p-4 rounded-lg border-2 ${
              missionType === 'daily'
                ? 'border-blue-200 bg-blue-50'
                : 'border-purple-200 bg-purple-50'
            }`}>
              <h4 className="font-medium text-gray-800 mb-2">템플릿 미리보기</h4>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  missionType === 'daily' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {missionType === 'daily' ? '📅 데일리' : '⭐ 이벤트'}
                </span>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {category}
                </span>
              </div>
              <h5 className="font-semibold text-gray-800">{title}</h5>
              <p className="text-sm text-gray-600 mb-2">{description}</p>
              <p className="text-sm font-semibold text-green-600">{reward.toLocaleString()}원</p>
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
              disabled={!title.trim() || !description.trim() || isSubmitting}
              className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
              {isSubmitting 
                ? (editingTemplate ? '수정 중...' : '생성 중...') 
                : (editingTemplate ? '템플릿 수정' : '템플릿 생성')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}