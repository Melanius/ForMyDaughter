/**
 * 🎯 미션 제안 시스템 React Query 훅
 * 
 * 미션 제안 데이터 관리를 위한 커스텀 훅들
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/auth/AuthProvider'
import { useChildSelection } from '@/lib/contexts/ChildSelectionContext'
import missionProposalService from '@/lib/services/missionProposalService'
import {
  MissionProposalWithProfile,
  CreateMissionProposalRequest,
  ApproveMissionProposalRequest,
  MissionProposalFilters,
  MissionProposalStats
} from '@/lib/types/missionProposal'

/**
 * 🔑 Query Keys
 */
export const missionProposalKeys = {
  all: ['missionProposals'] as const,
  lists: () => [...missionProposalKeys.all, 'list'] as const,
  list: (filters: MissionProposalFilters) => [...missionProposalKeys.lists(), filters] as const,
  stats: (parentId?: string) => [...missionProposalKeys.all, 'stats', parentId] as const,
  pending: (parentId?: string) => [...missionProposalKeys.all, 'pending', parentId] as const,
}

/**
 * 📋 미션 제안 목록 조회 훅
 */
export function useMissionProposals(filters: MissionProposalFilters = {}) {
  const { user } = useAuth()

  return useQuery({
    queryKey: missionProposalKeys.list(filters),
    queryFn: async () => {
      const response = await missionProposalService.getProposals(filters)
      if (!response.success) {
        throw new Error(response.error || '제안 목록 조회 실패')
      }
      return response.data || []
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30초
    refetchOnWindowFocus: false
  })
}

/**
 * 📊 미션 제안 통계 조회 훅
 */
export function useMissionProposalStats(parentId?: string) {
  const { user, profile } = useAuth()

  return useQuery({
    queryKey: missionProposalKeys.stats(parentId),
    queryFn: async () => {
      const response = await missionProposalService.getProposalStats(parentId)
      if (!response.success) {
        throw new Error(response.error || '통계 조회 실패')
      }
      return response.data
    },
    enabled: !!user && profile?.user_type === 'parent',
    staleTime: 60 * 1000, // 1분
    refetchOnWindowFocus: false
  })
}

/**
 * 🆕 미션 제안 생성 훅 (자녀용)
 */
export function useCreateMissionProposal() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: CreateMissionProposalRequest) => {
      const response = await missionProposalService.createProposal(data)
      if (!response.success) {
        throw new Error(response.error || '미션 제안 생성 실패')
      }
      return response.data
    },
    onSuccess: () => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: missionProposalKeys.all })
      console.log('✅ 미션 제안이 생성되었습니다')
    },
    onError: (error) => {
      console.error('❌ 미션 제안 생성 실패:', error)
    }
  })
}

/**
 * ✅ 미션 제안 승인 훅 (부모용)
 */
export function useApproveMissionProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ApproveMissionProposalRequest) => {
      const response = await missionProposalService.approveProposal(data)
      if (!response.success) {
        throw new Error(response.error || '미션 제안 승인 실패')
      }
      return response.data
    },
    onSuccess: () => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: missionProposalKeys.all })
      queryClient.invalidateQueries({ queryKey: ['missionTemplates'] }) // 템플릿 목록도 갱신
      queryClient.invalidateQueries({ queryKey: ['missions'] }) // 미션 목록도 갱신
      console.log('✅ 미션 제안이 승인되었습니다')
    },
    onError: (error) => {
      console.error('❌ 미션 제안 승인 실패:', error)
    }
  })
}

/**
 * 🚫 미션 제안 거부 훅 (부모용)
 */
export function useRejectMissionProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ proposalId, reason }: { proposalId: string; reason?: string }) => {
      const response = await missionProposalService.rejectProposal(proposalId, reason)
      if (!response.success) {
        throw new Error(response.error || '미션 제안 거부 실패')
      }
      return response.data
    },
    onSuccess: () => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: missionProposalKeys.all })
      console.log('✅ 미션 제안이 거부되었습니다')
    },
    onError: (error) => {
      console.error('❌ 미션 제안 거부 실패:', error)
    }
  })
}

/**
 * 🔔 대기 중인 제안 확인 훅 (부모용 알림)
 */
export function usePendingProposals(parentId?: string) {
  const { user, profile } = useAuth()

  return useQuery({
    queryKey: missionProposalKeys.pending(parentId),
    queryFn: async () => {
      const response = await missionProposalService.getProposals({
        parent_id: parentId || user?.id,
        status: ['pending']
      })
      if (!response.success) {
        throw new Error(response.error || '대기 제안 조회 실패')
      }
      return response.data || []
    },
    enabled: !!user && profile?.user_type === 'parent',
    staleTime: 30 * 1000, // 30초
    refetchInterval: 60 * 1000, // 1분마다 자동 갱신
    refetchOnWindowFocus: true
  })
}

/**
 * 📝 자녀별 제안 목록 조회 훅
 */
export function useChildProposals() {
  const { user, profile } = useAuth()
  const { selectedChildId, currentUserId } = useChildSelection()

  // 부모인 경우 선택된 자녀의 제안, 자녀인 경우 자신의 제안
  const targetChildId = profile?.user_type === 'parent' ? selectedChildId : currentUserId

  return useQuery({
    queryKey: missionProposalKeys.list({ child_id: targetChildId || undefined }),
    queryFn: async () => {
      if (!targetChildId) return []
      
      const response = await missionProposalService.getProposals({
        child_id: targetChildId
      })
      if (!response.success) {
        throw new Error(response.error || '자녀 제안 목록 조회 실패')
      }
      return response.data || []
    },
    enabled: !!user && !!targetChildId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false
  })
}

/**
 * 🎯 미션 제안 폼 상태 관리 훅
 */
export function useMissionProposalForm(parentId: string) {
  const [formData, setFormData] = useState<CreateMissionProposalRequest>({
    title: '',
    description: '',
    mission_type: 'daily',
    difficulty: 1,
    reward_amount: 100,
    parent_id: parentId
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateField = (field: keyof CreateMissionProposalRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 필드 변경 시 해당 오류 제거
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

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

    if (formData.difficulty < 1 || formData.difficulty > 5) {
      newErrors.difficulty = '난이도는 1~5 사이로 선택해주세요'
    }

    if (formData.reward_amount < 0) {
      newErrors.reward_amount = '보상은 0원 이상으로 설정해주세요'
    } else if (formData.reward_amount > 100000) {
      newErrors.reward_amount = '보상은 100,000원 이하로 설정해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      mission_type: 'daily',
      difficulty: 1,
      reward_amount: 100,
      parent_id: parentId
    })
    setErrors({})
  }

  return {
    formData,
    errors,
    updateField,
    validateForm,
    resetForm,
    isValid: Object.keys(errors).length === 0 && formData.title.trim() !== ''
  }
}

// useState import 추가
import { useState } from 'react'