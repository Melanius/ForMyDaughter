'use client'

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Mission, MissionInstance } from '@/lib/types/mission'
import missionSupabaseService from '@/lib/services/missionSupabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { getTodayKST, nowKST, addDaysKST } from '@/lib/utils/dateUtils'

// 쿼리 키 팩토리
export const missionKeys = {
  all: ['missions'] as const,
  lists: () => [...missionKeys.all, 'list'] as const,
  list: (date: string) => [...missionKeys.lists(), date] as const,
  details: () => [...missionKeys.all, 'detail'] as const,
  detail: (id: string) => [...missionKeys.details(), id] as const,
}

// 날짜별 미션 데이터 가져오는 쿼리 훅
interface MissionsQueryResult {
  missions: Mission[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMissionsQuery(selectedDate: string): MissionsQueryResult {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: missionKeys.list(selectedDate),
    queryFn: async (): Promise<Mission[]> => {
      console.log('🔍 미션 쿼리 실행:', selectedDate)
      if (!profile?.id) return []

      const dateMissions = await missionSupabaseService.getFamilyMissionInstances(selectedDate)
      console.log('📝 미션 데이터 로드:', dateMissions.length, '개')
      
      // Mission 형태로 변환 (기존 UI 호환성을 위해)
      const compatibleMissions: Mission[] = dateMissions
        .filter(instance => instance.userId)
        .map(instance => ({
          id: instance.id,
          userId: instance.userId!,
          title: instance.title,
          description: instance.description,
          reward: instance.reward,
          isCompleted: instance.isCompleted,
          completedAt: instance.completedAt || '',
          isTransferred: instance.isTransferred || false,
          category: instance.category,
          missionType: instance.missionType === 'daily' ? '데일리' : '이벤트',
          date: instance.date,
          templateId: instance.templateId
        }))

      // 인접한 날짜들을 백그라운드에서 prefetch (KST 기준)
      const tomorrow = addDaysKST(selectedDate, 1)
      const yesterday = addDaysKST(selectedDate, -1)

      // 비동기적으로 prefetch (현재 쿼리 성능에 영향 없음)
      setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: missionKeys.list(tomorrow),
          queryFn: async () => {
            const missions = await missionSupabaseService.getFamilyMissionInstances(tomorrow)
            return missions.filter(instance => instance.userId).map(instance => ({
              id: instance.id,
              userId: instance.userId!,
              title: instance.title,
              description: instance.description,
              reward: instance.reward,
              isCompleted: instance.isCompleted,
              completedAt: instance.completedAt || '',
              isTransferred: instance.isTransferred || false,
              category: instance.category,
              missionType: instance.missionType === 'daily' ? '데일리' : '이벤트',
              date: instance.date,
              templateId: instance.templateId
            }))
          },
          staleTime: 2 * 60 * 1000, // 2분간 fresh
        })

        queryClient.prefetchQuery({
          queryKey: missionKeys.list(yesterday),
          queryFn: async () => {
            const missions = await missionSupabaseService.getFamilyMissionInstances(yesterday)
            return missions.filter(instance => instance.userId).map(instance => ({
              id: instance.id,
              userId: instance.userId!,
              title: instance.title,
              description: instance.description,
              reward: instance.reward,
              isCompleted: instance.isCompleted,
              completedAt: instance.completedAt || '',
              isTransferred: instance.isTransferred || false,
              category: instance.category,
              missionType: instance.missionType === 'daily' ? '데일리' : '이벤트',
              date: instance.date,
              templateId: instance.templateId
            }))
          },
          staleTime: 2 * 60 * 1000, // 2분간 fresh
        })
      }, 100) // 100ms 후에 prefetch

      return compatibleMissions
    },
    enabled: !!profile?.id, // profile이 있을 때만 실행
    staleTime: 5 * 60 * 1000, // 5분간 fresh (최적화: API 호출 감소)
    gcTime: 30 * 60 * 1000, // 30분간 캐시 유지
    // refetchInterval 제거: 사용자 행동 기반으로만 업데이트
  })

  return {
    missions: query.data || [] as Mission[],
    loading: query.isLoading,
    error: query.error ? '미션을 불러오는데 실패했습니다.' : null,
    refetch: query.refetch,
  }
}

// 미션 추가 뮤테이션
export function useAddMissionMutation(selectedDate: string) {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (newMission: {
      title: string
      description: string
      reward: number
      category?: string
      missionType?: string
      date?: string
    }) => {
      const createdId = await missionSupabaseService.addMissionInstance({
        templateId: null,
        date: newMission.date || selectedDate,
        title: newMission.title,
        description: newMission.description,
        reward: newMission.reward,
        category: newMission.category || '기타',
        missionType: newMission.missionType === '이벤트' ? 'event' : 'daily',
        isCompleted: false,
        isTransferred: false
      })

      const mission: Mission = {
        id: createdId,
        userId: profile?.id || '',
        title: newMission.title,
        description: newMission.description,
        reward: newMission.reward,
        category: newMission.category || '기타',
        missionType: newMission.missionType || '데일리',
        isCompleted: false,
        completedAt: '',
        isTransferred: false,
        date: newMission.date || selectedDate,
        templateId: null
      }

      return { mission, createdId }
    },
    onSuccess: ({ mission }) => {
      // 현재 날짜의 캐시를 업데이트
      queryClient.setQueryData<Mission[]>(
        missionKeys.list(selectedDate),
        (oldMissions) => oldMissions ? [...oldMissions, mission] : [mission]
      )

      // 관련된 쿼리들을 무효화
      queryClient.invalidateQueries({ queryKey: missionKeys.lists() })
    },
    onError: (error) => {
      console.error('미션 추가 실패:', error)
    },
  })
}

// 미션 완료 뮤테이션
export function useCompleteMissionMutation(selectedDate: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (missionId: string) => {
      await missionSupabaseService.completeMission(missionId)
      return missionId
    },
    onSuccess: (missionId) => {
      // 옵티미스틱 업데이트
      queryClient.setQueryData<Mission[]>(
        missionKeys.list(selectedDate),
        (oldMissions) => 
          oldMissions?.map(mission =>
            mission.id === missionId
              ? { ...mission, isCompleted: true, completedAt: nowKST() }
              : mission
          ) || []
      )
    },
    onError: (error, missionId) => {
      console.error('미션 완료 실패:', error)
      // 실패 시 캐시 무효화하여 서버 상태와 동기화
      queryClient.invalidateQueries({ queryKey: missionKeys.list(selectedDate) })
    },
  })
}

// 미션 완료 취소 뮤테이션
export function useUncompleteMissionMutation(selectedDate: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (missionId: string) => {
      await missionSupabaseService.uncompleteMission(missionId)
      return missionId
    },
    onSuccess: (missionId) => {
      // 옵티미스틱 업데이트
      queryClient.setQueryData<Mission[]>(
        missionKeys.list(selectedDate),
        (oldMissions) => 
          oldMissions?.map(mission =>
            mission.id === missionId
              ? { ...mission, isCompleted: false, completedAt: '' }
              : mission
          ) || []
      )
    },
    onError: (error) => {
      console.error('미션 완료 취소 실패:', error)
      queryClient.invalidateQueries({ queryKey: missionKeys.list(selectedDate) })
    },
  })
}

// 미션 수정 뮤테이션
export function useUpdateMissionMutation(selectedDate: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ missionId, updates }: {
      missionId: string
      updates: {
        title?: string
        description?: string
        reward?: number
        category?: string
        missionType?: string
      }
    }) => {
      const missionTypeForSupabase = updates.missionType === '이벤트' ? 'event' : 'daily'
      
      await missionSupabaseService.updateMissionInstance(missionId, {
        ...updates,
        missionType: missionTypeForSupabase
      })
      
      return { missionId, updates }
    },
    onSuccess: ({ missionId, updates }) => {
      // 옵티미스틱 업데이트
      queryClient.setQueryData<Mission[]>(
        missionKeys.list(selectedDate),
        (oldMissions) => 
          oldMissions?.map(mission =>
            mission.id === missionId
              ? { ...mission, ...updates }
              : mission
          ) || []
      )
    },
    onError: (error) => {
      console.error('미션 수정 실패:', error)
      queryClient.invalidateQueries({ queryKey: missionKeys.list(selectedDate) })
    },
  })
}

// 미션 삭제 뮤테이션
export function useDeleteMissionMutation(selectedDate: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (missionId: string) => {
      await missionSupabaseService.deleteMissionInstance(missionId)
      return missionId
    },
    onSuccess: (missionId) => {
      // 옵티미스틱 업데이트
      queryClient.setQueryData<Mission[]>(
        missionKeys.list(selectedDate),
        (oldMissions) => oldMissions?.filter(mission => mission.id !== missionId) || []
      )
    },
    onError: (error) => {
      console.error('미션 삭제 실패:', error)
      queryClient.invalidateQueries({ queryKey: missionKeys.list(selectedDate) })
    },
  })
}

// 미션 전달 상태 업데이트 (로컬 캐시만 업데이트)
export function useUpdateMissionTransferStatus(selectedDate: string) {
  const queryClient = useQueryClient()

  return (missionIds: string[], isTransferred: boolean) => {
    queryClient.setQueryData<Mission[]>(
      missionKeys.list(selectedDate),
      (oldMissions) => 
        oldMissions?.map(mission => 
          missionIds.includes(mission.id) 
            ? { ...mission, isTransferred }
            : mission
        ) || []
    )
  }
}