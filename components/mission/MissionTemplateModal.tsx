'use client'

import { useState, useEffect } from 'react'
import { MissionTemplate, RecurringPattern } from '../../lib/types/mission'

interface MissionTemplateModalProps {
  onClose: () => void
  onSave: (template: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void
  editingTemplate?: MissionTemplate | null
}

export function MissionTemplateModal({ onClose, onSave, editingTemplate }: MissionTemplateModalProps) {
  const [title, setTitle] = useState(editingTemplate?.title || '')
  const [reward, setReward] = useState(editingTemplate?.reward || 500)
  const [category, setCategory] = useState(editingTemplate?.category || '집안일')
  const [missionType, setMissionType] = useState<'daily' | 'event'>('daily')
  const [recurringPattern, setRecurringPattern] = useState<RecurringPattern>(editingTemplate?.recurringPattern || 'daily')
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(0) // 0: 일요일, 1: 월요일, ..., 6: 토요일
  const [isActive, setIsActive] = useState(editingTemplate?.isActive !== undefined ? editingTemplate.isActive : true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = ['집안일', '공부', '운동', '독서', '건강', '예의', '기타']

  // 카테고리 아이콘 함수
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

  // 반복 패턴 타입들
  const basePatterns = [
    { id: 'daily', label: '매일', icon: '☀️', description: '매일 반복' },
    { id: 'weekdays', label: '평일', icon: '🎒', description: '월~금만' },
    { id: 'weekends', label: '주말', icon: '🏖️', description: '토~일만' },
    { id: 'weekly', label: '매주', icon: '📋', description: '매주 특정요일' }
  ]

  const daysOfWeek = [
    { id: 0, label: '일', fullLabel: '일요일' },
    { id: 1, label: '월', fullLabel: '월요일' },
    { id: 2, label: '화', fullLabel: '화요일' },
    { id: 3, label: '수', fullLabel: '수요일' },
    { id: 4, label: '목', fullLabel: '목요일' },
    { id: 5, label: '금', fullLabel: '금요일' },
    { id: 6, label: '토', fullLabel: '토요일' }
  ]

  // 현재 반복 패턴이 매주인지 확인
  const isWeeklyPattern = ['weekly_sun', 'weekly_mon', 'weekly_tue', 'weekly_wed', 'weekly_thu', 'weekly_fri', 'weekly_sat'].includes(recurringPattern)

  // 반복 패턴 변경 핸들러
  const handlePatternChange = (patternId: string) => {
    if (patternId === 'weekly') {
      // 매주 선택 시 기본적으로 일요일로 설정
      setSelectedDayOfWeek(0)
      setRecurringPattern('weekly_sun')
    } else {
      setRecurringPattern(patternId as RecurringPattern)
    }
  }

  // 요일 변경 핸들러
  const handleDayOfWeekChange = (dayId: number) => {
    setSelectedDayOfWeek(dayId)
    const dayPatterns = ['weekly_sun', 'weekly_mon', 'weekly_tue', 'weekly_wed', 'weekly_thu', 'weekly_fri', 'weekly_sat']
    setRecurringPattern(dayPatterns[dayId] as RecurringPattern)
  }

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
      setReward(editingTemplate.reward)
      setCategory(editingTemplate.category)
      const pattern = editingTemplate.recurringPattern || 'daily'
      setRecurringPattern(pattern)
      
      // 매주 패턴인 경우 요일 설정
      if (pattern.startsWith('weekly_')) {
        const dayMap = { 'weekly_sun': 0, 'weekly_mon': 1, 'weekly_tue': 2, 'weekly_wed': 3, 'weekly_thu': 4, 'weekly_fri': 5, 'weekly_sat': 6 }
        setSelectedDayOfWeek(dayMap[pattern as keyof typeof dayMap] || 0)
      }
      
      setIsActive(editingTemplate.isActive)
    } else {
      // 새 템플릿 생성시 초기값
      setTitle('')
      setReward(500)
      setCategory('집안일')
      setRecurringPattern('daily')
      setSelectedDayOfWeek(0)
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
    
    if (!title.trim()) {
      console.log('❌ MissionTemplateModal - 유효성 검사 실패: 제목 누락')
      alert('제목을 입력해주세요.')
      return
    }
    
    if (!category) {
      console.log('❌ MissionTemplateModal - 유효성 검사 실패: 카테고리 누락')
      alert('카테고리를 선택해주세요.')
      return
    }
    
    console.log('🚀 MissionTemplateModal - onSave 호출 준비:', {
      templateData: {
        title: title.trim(),
        reward,
        category,
        missionType,
        recurringPattern,
        isActive
      }
    })
    
    setIsSubmitting(true)
    
    try {
      console.log('📞 MissionTemplateModal - onSave 함수 호출 중...')
      await onSave({
        title: title.trim(),
        description: '',
        reward,
        category,
        missionType,
        recurringPattern,
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
            <span className="text-blue-600 text-lg">📅</span>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">반복 미션 템플릿</p>
              <p>선택한 패턴에 따라 자동으로 생성되는 미션 템플릿입니다. 아이가 꾸준히 할 수 있는 좋은 습관을 만들어주세요.</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* 보상 금액 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              보상 금액 *
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

          {/* 반복 패턴 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              반복 패턴 *
            </label>
            
            {/* 기본 패턴 선택 */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {basePatterns.map((pattern) => {
                const isSelected = (pattern.id === 'weekly' && isWeeklyPattern) || 
                                 (pattern.id !== 'weekly' && recurringPattern === pattern.id)
                
                return (
                  <button
                    key={pattern.id}
                    type="button"
                    onClick={() => handlePatternChange(pattern.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xl mb-1">{pattern.icon}</span>
                      <span className="font-medium text-xs">{pattern.label}</span>
                      <span className="text-xs text-gray-500 mt-0.5">{pattern.description}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 매주 선택 시 요일 선택 */}
            {isWeeklyPattern && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  요일 선택
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => handleDayOfWeekChange(day.id)}
                      className={`p-3 rounded-lg border transition-all text-center ${
                        selectedDayOfWeek === day.id
                          ? 'border-blue-500 bg-blue-100 text-blue-700'
                          : 'border-blue-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <div className="text-sm font-medium">{day.label}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  매주 {daysOfWeek[selectedDayOfWeek].fullLabel}에 미션이 생성됩니다
                </p>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-2">
              선택한 패턴에 따라 미션이 자동으로 생성됩니다
            </p>
          </div>

          {/* 카테고리 선택 */}
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
              템플릿 활성화 (체크하면 선택한 패턴에 따라 자동으로 미션이 생성됩니다)
            </label>
          </div>

          {/* 미리보기 */}
          {title && category && (
            <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
              <h4 className="font-medium text-gray-800 mb-2">템플릿 미리보기</h4>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  📅 {recurringPattern === 'daily' ? '매일' :
                      recurringPattern === 'weekdays' ? '평일만' :
                      recurringPattern === 'weekends' ? '주말만' :
                      isWeeklyPattern ? `매주 ${daysOfWeek[selectedDayOfWeek].fullLabel}` : '매일'}
                </span>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full flex items-center gap-1">
                  <span>{getCategoryIcon(category)}</span>
                  <span>{category}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h5 className="font-semibold text-gray-800">{title}</h5>
              </div>
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
              disabled={!title.trim() || !category || isSubmitting}
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