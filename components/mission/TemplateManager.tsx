'use client'

import { useState, useEffect } from 'react'
import { MissionTemplate, RecurringPattern } from '../../lib/types/mission'
import { MissionTemplateModal } from './MissionTemplateModal'
import { TemplateDeleteConfirmModal } from '../modals/TemplateDeleteConfirmModal'
import missionSupabaseService from '../../lib/services/missionSupabase'
import { getTodayKST } from '../../lib/utils/dateUtils'
import { useChildSelection } from '@/lib/contexts/ChildSelectionContext'

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
  const [editingTemplate, setEditingTemplate] = useState<MissionTemplate | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<MissionTemplate | null>(null)
  const { selectedChildId, availableChildren, isParent } = useChildSelection()

  useEffect(() => {
    if (selectedChildId !== null) {
      loadTemplates()
    }
  }, [selectedChildId])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      console.log(`📋 선택된 자녀: ${selectedChildId}에 대한 템플릿 로드 중...`)
      
      // 선택된 자녀의 템플릿만 조회 (공용 템플릿 포함)
      const allTemplates = await missionSupabaseService.getFamilyMissionTemplates(selectedChildId)
      
      // 데일리 템플릿만 필터링하고 제목 순으로 정렬
      const dailyTemplates = allTemplates
        .filter(t => t.missionType === 'daily')
        .sort((a, b) => a.title.localeCompare(b.title))
      
      console.log(`✅ ${dailyTemplates.length}개 템플릿 로드됨 (자녀: ${selectedChildId})`, {
        공용템플릿: dailyTemplates.filter(t => t.targetChildId === null).length,
        전용템플릿: dailyTemplates.filter(t => t.targetChildId === selectedChildId).length
      })
      
      setTemplates(dailyTemplates)
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
      selectedChildId,
      templateData
    })
    
    try {
      if (editingTemplate) {
        console.log('✏️ 템플릿 수정 모드 - updateMissionTemplate 호출 예정')
        // 템플릿 수정
        await missionSupabaseService.updateMissionTemplate(editingTemplate.id, {
          title: templateData.title,
          description: templateData.description,
          reward: templateData.reward,
          category: templateData.category,
          missionType: templateData.missionType,
          recurringPattern: templateData.recurringPattern,
          isActive: templateData.isActive,
          targetChildId: templateData.targetChildId
        })
        console.log('✅ 템플릿 수정 완료')
      } else {
        console.log('➕ 새 템플릿 생성 모드 - addMissionTemplate 호출 예정')
        // 새 템플릿 생성: 선택된 자녀에게 할당 (공용으로 만들려면 null로 설정 가능)
        const newTemplateData = {
          ...templateData,
          targetChildId: templateData.targetChildId || selectedChildId // 기본값: 선택된 자녀
        }
        await missionSupabaseService.addMissionTemplate(newTemplateData)
        console.log('✅ 새 템플릿 생성 완료 (대상 자녀:', newTemplateData.targetChildId, ')')
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

  const handleDeleteTemplate = (template: MissionTemplate) => {
    setTemplateToDelete(template)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async (deleteToday: boolean) => {
    if (!templateToDelete) return

    try {
      await missionSupabaseService.deleteTemplateWithTodayMissions(templateToDelete.id, deleteToday)
      console.log('✅ 템플릿 삭제 완료:', templateToDelete.title, { deleteToday })
      await loadTemplates() // 템플릿 목록 새로고침
    } catch (error) {
      console.error('템플릿 삭제 실패:', error)
      alert('템플릿 삭제에 실패했습니다.')
    } finally {
      setTemplateToDelete(null)
    }
  }

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false)
    setTemplateToDelete(null)
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

  if (selectedChildId === null) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">자녀를 선택해주세요.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">템플릿을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg">📅</span>
          <span className="text-sm font-medium text-gray-800">데일리 미션 템플릿</span>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
            {templates.filter(t => t.isActive).length}개 활성화
          </span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>

      {/* 템플릿 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            <p>템플릿이 없습니다.</p>
          </div>
        ) : (
          templates.map(template => (
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

      {/* 템플릿 모달 */}
      {showModal && (
        <MissionTemplateModal
          onClose={handleCloseModal}
          onSave={handleSaveTemplate}
          editingTemplate={editingTemplate}
          selectedChildId={selectedChildId}
        />
      )}
      
      {/* 템플릿 삭제 확인 모달 */}
      <TemplateDeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        template={templateToDelete}
      />
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
  const { availableChildren } = useChildSelection()
  
  // 대상 자녀 정보 가져오기
  const getTargetChildInfo = () => {
    if (template.targetChildId === null) {
      return { name: '공용', icon: '👨‍👩‍👧‍👦', style: 'bg-blue-100 text-blue-800' }
    }
    
    const targetChild = availableChildren.find(child => child.id === template.targetChildId)
    return {
      name: targetChild ? `${targetChild.name} 전용` : '알 수 없음',
      icon: '👶',
      style: 'bg-purple-100 text-purple-800'
    }
  }
  
  const targetInfo = getTargetChildInfo()
  return (
    <div className={`p-4 rounded-lg border-2 transition-all ${
      template.isActive 
        ? (template.missionType === 'daily' ? 'border-blue-200 bg-blue-50' : 'border-purple-200 bg-purple-50')
        : 'border-gray-200 bg-gray-50 opacity-75'
    }`}>
      {/* 템플릿 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {/* 대상 자녀 배지 (가장 먼저 표시) */}
          <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${targetInfo.style}`}>
            <span>{targetInfo.icon}</span>
            <span>{targetInfo.name}</span>
          </span>
          
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