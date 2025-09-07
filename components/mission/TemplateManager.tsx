'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { MissionTemplate, RecurringPattern } from '../../lib/types/mission'
import { MissionTemplateModal } from './MissionTemplateModal'
import missionSupabaseService from '../../lib/services/missionSupabase'
import { getTodayKST } from '../../lib/utils/dateUtils'

// 즉시 미션 추가 모달을 lazy import
const AddMissionModal = lazy(() => import('./AddMissionModal').then(module => ({ default: module.AddMissionModal })))

// 반복 패턴을 한국어로 표시하는 함수
const getRecurringPatternLabel = (pattern?: RecurringPattern): string => {
  if (!pattern) return '매일'
  
  switch (pattern) {
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
    default: return '매일'
  }
}

// 반복 패턴 이모지 (템플릿과 동일)
const getPatternEmoji = (pattern?: RecurringPattern): string => {
  if (!pattern) return '☀️'
  
  switch (pattern) {
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

// 카테고리별 색상 시스템 (MissionCard와 동일)
const getCategoryStyle = (category?: string): string => {
  if (!category) return 'bg-gray-100 text-gray-700 border-gray-200'
  
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

// 카테고리 아이콘 (MissionCard와 동일)
const getCategoryIcon = (category?: string): string => {
  if (!category) return '📝'
  
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

export function TemplateManager() {
  const [templates, setTemplates] = useState<MissionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAddMissionModal, setShowAddMissionModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MissionTemplate | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const allTemplates = await missionSupabaseService.getFamilyMissionTemplates()
      // 데일리 템플릿을 먼저, 이벤트 템플릿을 나중에 정렬
      const sortedTemplates = allTemplates.sort((a, b) => {
        if (a.missionType !== b.missionType) {
          return a.missionType === 'daily' ? -1 : 1
        }
        return a.title.localeCompare(b.title)
      })
      setTemplates(sortedTemplates)
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTemplate = async (templateData: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('📋 TemplateManager - handleSaveTemplate 시작:', {
      isEditing: !!editingTemplate,
      editingTemplateId: editingTemplate?.id,
      templateData
    })
    
    try {
      if (editingTemplate) {
        console.log('✏️ 템플릿 수정 모드 - updateMissionTemplate 호출 예정')
        // 템플릿 수정
        await missionSupabaseService.updateMissionTemplate(editingTemplate.id, {
          title: templateData.title,
          description: '',
          reward: templateData.reward,
          category: templateData.category,
          missionType: templateData.missionType,
          recurringPattern: templateData.recurringPattern,
          isActive: templateData.isActive
        })
        console.log('✅ 템플릿 수정 완료')
      } else {
        console.log('➕ 새 템플릿 생성 모드 - addMissionTemplate 호출 예정')
        // 새 템플릿 생성
        await missionSupabaseService.addMissionTemplate(templateData)
        console.log('✅ 새 템플릿 생성 완료')
      }
      
      console.log('🔄 템플릿 목록 다시 로드 시작')
      await loadTemplates()
      console.log('✅ 템플릿 목록 로드 완료')

      // 새 템플릿이고 데일리 타입이며 활성화 상태라면 즉시 오늘 미션 생성
      if (!editingTemplate && templateData.missionType === 'daily' && templateData.isActive) {
        console.log('🚀 새 데일리 템플릿 활성화됨 - 즉시 오늘 미션 생성 시도')
        try {
          const today = getTodayKST()
          const createdCount = await missionSupabaseService.generateDailyMissions(today)
          console.log(`✨ 템플릿 활성화 후 ${createdCount}개 미션 즉시 생성됨`)
        } catch (error) {
          console.error('❌ 템플릿 활성화 후 즉시 미션 생성 실패:', error)
        }
      }
      
      setShowModal(false)
      setEditingTemplate(null)
      console.log('🎉 handleSaveTemplate 성공 완료')
    } catch (error) {
      console.error('❌ TemplateManager - Failed to save template:', error)
      throw error
    }
  }

  const handleEditTemplate = (template: MissionTemplate) => {
    console.log('🔧 TemplateManager - handleEditTemplate 호출:', {
      templateId: template.id,
      templateTitle: template.title,
      templateReward: template.reward
    })
    setEditingTemplate(template)
    setShowModal(true)
  }

  const handleDeleteTemplate = async (template: MissionTemplate) => {
    const confirmed = confirm(
      `정말로 "${template.title}" 템플릿을 삭제하시겠습니까?\n\n` +
      `삭제 후에는 이 템플릿으로 새로운 미션이 자동 생성되지 않습니다.`
    )
    
    if (confirmed) {
      try {
        await missionSupabaseService.deleteMissionTemplate(template.id)
        await loadTemplates()
      } catch (error) {
        console.error('Failed to delete template:', error)
        alert('템플릿 삭제 중 오류가 발생했습니다.')
      }
    }
  }

  const handleToggleActive = async (template: MissionTemplate) => {
    try {
      await missionSupabaseService.updateMissionTemplate(template.id, {
        isActive: !template.isActive
      })
      await loadTemplates()
    } catch (error) {
      console.error('Failed to toggle template:', error)
      alert('템플릿 상태 변경 중 오류가 발생했습니다.')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTemplate(null)
  }

  const handleAddMission = async (missionData: {
    title: string
    description: string
    reward: number
    category?: string
    missionType?: string
    date?: string
  }) => {
    try {
      console.log('📝 TemplateManager - 즉시 미션 추가:', missionData)
      
      const isEventMission = missionData.missionType === '이벤트'
      const instanceData = {
        templateId: null,
        date: missionData.date || getTodayKST(),
        title: missionData.title,
        description: missionData.description,
        reward: missionData.reward,
        category: missionData.category || '기타',
        missionType: isEventMission ? 'event' : 'daily',
        isCompleted: false,
        isTransferred: false
      } as const

      if (isEventMission) {
        // 이벤트 미션은 가족 전체에게 생성
        console.log('⭐ 이벤트 미션 - 가족 전체에게 생성')
        await missionSupabaseService.addEventMissionToFamily(instanceData)
      } else {
        // 일반 미션은 본인에게만 생성  
        console.log('☀️ 일반 미션 - 본인에게만 생성')
        await missionSupabaseService.addMissionInstance(instanceData)
      }

      console.log('✅ 즉시 미션 추가 성공')
      setShowAddMissionModal(false)
      
      // 성공 메시지 표시
      if (isEventMission) {
        alert('이벤트 미션이 모든 가족 구성원에게 추가되었습니다!')
      } else {
        alert('미션이 추가되었습니다!')
      }
    } catch (error) {
      console.error('❌ 즉시 미션 추가 실패:', error)
      alert('미션 추가 중 오류가 발생했습니다.')
    }
  }

  const handleCloseAddMissionModal = () => {
    setShowAddMissionModal(false)
  }

  const dailyTemplates = templates.filter(t => t.missionType === 'daily')
  const eventTemplates = templates.filter(t => t.missionType === 'event')

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">템플릿을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">미션 템플릿 관리</h2>
          <p className="text-sm text-gray-600 mt-1">
            반복 사용할 미션 템플릿을 만들고 관리하세요. 데일리 템플릿은 매일 자동으로 생성됩니다.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddMissionModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            ⚡ 즉시 미션 추가
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            📋 템플릿 추가
          </button>
        </div>
      </div>

      {/* 데일리 템플릿 섹션 */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-2xl">📅</span>
          <h3 className="text-xl font-semibold text-gray-800">데일리 미션 템플릿</h3>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
            {dailyTemplates.filter(t => t.isActive).length}개 활성화
          </span>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            💡 활성화된 데일리 템플릿은 매일 자동으로 미션을 생성합니다. 아이가 매일 해야 할 습관을 템플릿으로 만들어보세요.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dailyTemplates.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              <p>데일리 템플릿이 없습니다.</p>
              <p className="text-sm">첫 번째 데일리 미션 템플릿을 만들어보세요!</p>
            </div>
          ) : (
            dailyTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                onToggleActive={handleToggleActive}
              />
            ))
          )}
        </div>
      </div>

      {/* 이벤트 템플릿 섹션 */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-2xl">⭐</span>
          <h3 className="text-xl font-semibold text-gray-800">이벤트 미션 템플릿</h3>
          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
            {eventTemplates.length}개
          </span>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-purple-800">
            💫 특별한 날이나 이벤트를 위한 템플릿입니다. 수동으로 미션을 생성할 때 빠르게 선택할 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventTemplates.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              <p>이벤트 템플릿이 없습니다.</p>
              <p className="text-sm">특별한 미션 템플릿을 만들어보세요!</p>
            </div>
          ) : (
            eventTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                onToggleActive={handleToggleActive}
              />
            ))
          )}
        </div>
      </div>

      {/* 템플릿 모달 */}
      {showModal && (
        <MissionTemplateModal
          onClose={handleCloseModal}
          onSave={handleSaveTemplate}
          editingTemplate={editingTemplate}
        />
      )}

      {/* 즉시 미션 추가 모달 */}
      {showAddMissionModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
              <p>로딩 중...</p>
            </div>
          </div>
        }>
          <AddMissionModal
            onClose={handleCloseAddMissionModal}
            onAdd={handleAddMission}
            defaultDate={getTodayKST()}
          />
        </Suspense>
      )}
    </div>
  )
}

interface TemplateCardProps {
  template: MissionTemplate
  onEdit: (template: MissionTemplate) => void
  onDelete: (template: MissionTemplate) => void
  onToggleActive: (template: MissionTemplate) => void
}

function TemplateCard({ template, onEdit, onDelete, onToggleActive }: TemplateCardProps) {
  return (
    <div className={`p-4 rounded-lg border-2 transition-all ${
      template.isActive 
        ? (template.missionType === 'daily' ? 'border-blue-200 bg-blue-50' : 'border-purple-200 bg-purple-50')
        : 'border-gray-200 bg-gray-50 opacity-75'
    }`}>
      {/* 템플릿 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
            template.missionType === 'daily' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-purple-100 text-purple-800'
          }`}>
            <span>{getPatternEmoji(template.recurringPattern)}</span>
            <span>{getRecurringPatternLabel(template.recurringPattern)}</span>
          </span>
          <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getCategoryStyle(template.category)}`}>
            <span>{getCategoryIcon(template.category)}</span>
            <span>{template.category}</span>
          </span>
        </div>
        
        <button
          onClick={() => onToggleActive(template)}
          className={`text-sm px-2 py-1 rounded transition-colors ${
            template.isActive 
              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {template.isActive ? '활성' : '비활성'}
        </button>
      </div>

      {/* 템플릿 내용 */}
      <h4 className="font-semibold text-gray-800 mb-2">{template.title}</h4>
      <p className="font-semibold text-green-600 mb-4">{template.reward.toLocaleString()}원</p>

      {/* 액션 버튼 */}
      <div className="flex space-x-2">
        <button
          onClick={() => onEdit(template)}
          className="flex-1 text-sm px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          수정
        </button>
        <button
          onClick={() => onDelete(template)}
          className="flex-1 text-sm px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          삭제
        </button>
      </div>

      {/* 생성 날짜 */}
      <p className="text-xs text-gray-500 mt-2">
        생성: {new Date(template.createdAt).toLocaleDateString('ko-KR')}
      </p>
    </div>
  )
}