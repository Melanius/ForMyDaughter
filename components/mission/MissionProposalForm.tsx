/**
 * 🎯 미션 제안 폼 컴포넌트
 * 
 * 자녀가 부모에게 미션을 제안하는 폼
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useCreateMissionProposal } from '@/hooks/useMissionProposals'
import familyCompatibilityService from '@/lib/services/familyCompatibilityService'
import { CreateMissionProposalRequest, MissionProposalType } from '@/lib/types/missionProposal'
import { MISSION_CATEGORIES, getMissionCategory } from '@/lib/constants/missionCategories'
import { ProposalSuccessModal } from '@/components/modals/ProposalSuccessModal'
import { getTodayKST } from '@/lib/utils/dateUtils'

interface MissionProposalFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}


const MISSION_TYPE_OPTIONS: Array<{ value: MissionProposalType; label: string; description: string; icon: string }> = [
  {
    value: 'daily',
    label: '매일 하는 미션',
    description: '매일 반복해서 할 수 있는 미션이에요',
    icon: '🔄'
  },
  {
    value: 'event',
    label: '한 번만 하는 미션',
    description: '특별히 한 번만 하는 미션이에요',
    icon: '⭐'
  }
]

export default function MissionProposalForm({ isOpen, onClose, onSuccess }: MissionProposalFormProps) {
  const { user, profile } = useAuth()
  const createProposal = useCreateMissionProposal()
  
  const [formData, setFormData] = useState<CreateMissionProposalRequest>({
    title: '',
    description: '',
    mission_type: 'daily',
    reward_amount: 100,
    category: '집안일', // 🆕 기본 카테고리
    start_date: getTodayKST(), // 🆕 기본값은 오늘
    parent_id: ''
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [parentId, setParentId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showSuccessModal, setShowSuccessModal] = useState(false) // 🆕 성공 모달 상태

  // 부모 ID 조회
  useEffect(() => {
    const fetchParentId = async () => {
      if (!user || profile?.user_type !== 'child') {
        setLoading(false)
        return
      }

      try {
        const familyData = await familyCompatibilityService.getCurrentUserWithFamily()
        
        // 부모 ID 찾기
        let targetParentId = ''
        
        if (familyData.family) {
          // 새로운 가족 시스템에서 부모 찾기
          const parent = familyData.family.members.find(
            member => member.role === 'father' || member.role === 'mother'
          )
          if (parent) {
            targetParentId = parent.user_id
          }
        }
        
        if (!targetParentId && familyData.profile.parent_id) {
          // 레거시 시스템에서 부모 ID 사용
          targetParentId = familyData.profile.parent_id
        }

        if (targetParentId) {
          setParentId(targetParentId)
          setFormData(prev => ({ ...prev, parent_id: targetParentId }))
        } else {
          setErrors({ general: '부모 정보를 찾을 수 없습니다' })
        }
      } catch (error) {
        console.error('부모 정보 조회 실패:', error)
        setErrors({ general: '부모 정보 조회 중 오류가 발생했습니다' })
      }
      
      setLoading(false)
    }

    if (isOpen) {
      fetchParentId()
    }
  }, [isOpen, user, profile])

  // 폼 필드 업데이트
  const updateField = <K extends keyof CreateMissionProposalRequest>(
    field: K,
    value: CreateMissionProposalRequest[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 필드 변경 시 해당 오류 제거
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // 폼 검증
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = '미션 제목을 입력해주세요'
    } else if (formData.title.length > 100) {
      newErrors.title = '미션 제목은 100자 이하로 입력해주세요'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = '미션 설명은 500자 이하로 입력해주세요'
    }

    if (formData.reward_amount < 0) {
      newErrors.reward_amount = '보상은 0원 이상으로 설정해주세요'
    } else if (formData.reward_amount > 10000) {
      newErrors.reward_amount = '보상은 10,000원 이하로 설정해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (!parentId) {
      setErrors({ general: '부모 정보가 없습니다' })
      return
    }

    try {
      await createProposal.mutateAsync(formData)
      
      // 성공 시 폼 리셋
      setFormData({
        title: '',
        description: '',
        mission_type: 'daily',
        reward_amount: 100,
        category: '집안일',
        start_date: getTodayKST(),
        parent_id: parentId
      })
      setErrors({})
      
      // 🆕 성공 모달 표시
      onClose() // 먼저 폼 닫기
      setShowSuccessModal(true) // 성공 모달 열기
      onSuccess?.()
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : '미션 제안에 실패했습니다' })
    }
  }

  // 자녀가 아니면 표시하지 않음
  if (!user || profile?.user_type !== 'child') {
    return null
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <span className="text-2xl mr-2">💡</span>
            <h2 className="text-xl font-bold text-gray-800">미션 제안하기</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">부모 정보 확인 중...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 일반 오류 메시지 */}
            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm">⚠️ {errors.general}</p>
              </div>
            )}

            {/* 미션 타입 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                어떤 종류의 미션인가요?
              </label>
              <div className="space-y-2">
                {MISSION_TYPE_OPTIONS.map(option => (
                  <label key={option.value} className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="mission_type"
                      value={option.value}
                      checked={formData.mission_type === option.value}
                      onChange={(e) => updateField('mission_type', e.target.value as MissionProposalType)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{option.icon}</span>
                        <span className="font-medium text-gray-800">{option.label}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 미션 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                미션 제목 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="어떤 미션을 하고 싶나요?"
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                maxLength={100}
              />
              {errors.title && (
                <p className="text-red-500 text-xs mt-1">{errors.title}</p>
              )}
            </div>

            {/* 미션 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                미션 설명 (선택)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="미션에 대해 자세히 설명해주세요"
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
                rows={3}
                maxLength={500}
              />
              {errors.description && (
                <p className="text-red-500 text-xs mt-1">{errors.description}</p>
              )}
            </div>

            {/* 🆕 카테고리 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                어떤 종류의 미션인가요?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MISSION_CATEGORIES.map(category => (
                  <label key={category.value} className="flex items-center cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="category"
                      value={category.value}
                      checked={formData.category === category.value}
                      onChange={(e) => updateField('category', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-lg mr-2">{category.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{category.label}</div>
                      <div className="text-xs text-gray-500">{category.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 🆕 시작 날짜 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                미션을 언제부터 시작할까요?
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
                min={getTodayKST()}
                lang="ko-KR"
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.start_date ? 'border-red-300' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                style={{ 
                  direction: 'ltr',
                  textAlign: 'center'
                }}
              />
              {errors.start_date && (
                <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                💡 기본값은 오늘이에요. 미리 계획하고 싶다면 연/월/일 순으로 선택해보세요!
              </p>
            </div>

            {/* 보상 금액 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                원하는 보상 금액
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.reward_amount}
                  onChange={(e) => updateField('reward_amount', parseInt(e.target.value) || 0)}
                  placeholder="100"
                  min="0"
                  max="10000"
                  className={`w-full px-4 py-3 pr-8 rounded-xl border ${
                    errors.reward_amount ? 'border-red-300' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <span className="absolute right-3 top-3 text-gray-500">원</span>
              </div>
              {errors.reward_amount && (
                <p className="text-red-500 text-xs mt-1">{errors.reward_amount}</p>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={createProposal.isPending || !formData.title.trim()}
                className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createProposal.isPending ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    제안 중...
                  </div>
                ) : (
                  '부모님께 제안하기'
                )}
              </button>
            </div>
          </form>
        )}

        {/* 도움말 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <div className="flex items-start">
            <span className="text-blue-500 text-lg mr-2">💡</span>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-800 mb-1">도움말</h4>
              <p className="text-xs text-blue-600">
                제안한 미션은 부모님이 검토한 후 승인되면 실제 미션이 됩니다. 
                구체적이고 현실적인 미션을 제안해보세요!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 🆕 성공 모달 */}
      <ProposalSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        childName={profile?.full_name || undefined}
      />
    </div>
  )
}