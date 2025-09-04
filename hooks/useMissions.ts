'use client'

import { useState, useEffect, useCallback } from 'react'
import { Mission, MissionInstance } from '@/lib/types/mission'
import missionSupabaseService from '@/lib/services/missionSupabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { nowKST } from '@/lib/utils/dateUtils'

export function useMissions(selectedDate: string) {
  const { profile } = useAuth()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMissions = useCallback(async () => {
    if (!profile?.id) return

    try {
      setLoading(true)
      setError(null)
      
      // Supabase에서 가족 단위 미션 로드
      const dateMissions = await missionSupabaseService.getFamilyMissionInstances(selectedDate)
      
      // Mission 형태로 변환 (기존 UI 호환성을 위해)
      const compatibleMissions: Mission[] = dateMissions
        .filter(instance => instance.userId) // userId가 있는 미션만 필터링
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

      setMissions(compatibleMissions)
    } catch (error) {
      console.error('미션 로드 실패:', error)
      setError('미션을 불러오는데 실패했습니다.')
      setMissions([])
    } finally {
      setLoading(false)
    }
  }, [selectedDate, profile?.id])

  const addMission = useCallback(async (newMission: {
    title: string
    description: string
    reward: number
    category?: string
    missionType?: string
    date?: string
  }) => {
    try {
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

      setMissions(prev => [...prev, mission])
      return createdId
    } catch (error) {
      console.error('미션 추가 실패:', error)
      throw new Error('미션 추가에 실패했습니다.')
    }
  }, [selectedDate])

  const completeMission = useCallback(async (missionId: string) => {
    try {
      await missionSupabaseService.completeMission(missionId)
      
      setMissions(prev =>
        prev.map(mission =>
          mission.id === missionId
            ? { ...mission, isCompleted: true, completedAt: nowKST() }
            : mission
        )
      )
    } catch (error) {
      console.error('미션 완료 실패:', error)
      throw new Error('미션 완료에 실패했습니다.')
    }
  }, [])

  const uncompleteMission = useCallback(async (missionId: string) => {
    const mission = missions.find(m => m.id === missionId)
    if (mission?.isTransferred) {
      throw new Error('이미 전달된 미션은 취소할 수 없습니다.')
    }

    try {
      await missionSupabaseService.uncompleteMission(missionId)
      
      setMissions(prev =>
        prev.map(mission =>
          mission.id === missionId
            ? { ...mission, isCompleted: false, completedAt: '' }
            : mission
        )
      )
    } catch (error) {
      console.error('미션 완료 취소 실패:', error)
      throw new Error('미션 완료 취소에 실패했습니다.')
    }
  }, [missions])

  const updateMission = useCallback(async (missionId: string, updates: {
    title?: string
    description?: string
    reward?: number
    category?: string
    missionType?: string
  }) => {
    const mission = missions.find(m => m.id === missionId)
    if (mission?.isTransferred) {
      throw new Error('이미 전달된 미션은 수정할 수 없습니다.')
    }

    try {
      const missionTypeForSupabase = updates.missionType === '이벤트' ? 'event' : 'daily'
      
      await missionSupabaseService.updateMissionInstance(missionId, {
        ...updates,
        missionType: missionTypeForSupabase
      })
      
      setMissions(prev =>
        prev.map(mission =>
          mission.id === missionId
            ? { ...mission, ...updates }
            : mission
        )
      )
    } catch (error) {
      console.error('미션 수정 실패:', error)
      throw new Error('미션 수정에 실패했습니다.')
    }
  }, [missions])

  const deleteMission = useCallback(async (missionId: string) => {
    const mission = missions.find(m => m.id === missionId)
    if (mission?.isTransferred) {
      throw new Error('이미 전달된 미션은 삭제할 수 없습니다.')
    }

    try {
      await missionSupabaseService.deleteMissionInstance(missionId)
      setMissions(prev => prev.filter(mission => mission.id !== missionId))
    } catch (error) {
      console.error('미션 삭제 실패:', error)
      throw new Error('미션 삭제에 실패했습니다.')
    }
  }, [missions])

  const updateMissionTransferStatus = useCallback((missionIds: string[], isTransferred: boolean) => {
    setMissions(prev => prev.map(m => 
      missionIds.includes(m.id) 
        ? { ...m, isTransferred }
        : m
    ))
  }, [])

  // 초기 로딩 및 날짜 변경 시 미션 로드
  useEffect(() => {
    loadMissions()
  }, [loadMissions])

  return {
    missions,
    loading,
    error,
    loadMissions,
    addMission,
    updateMission,
    completeMission,
    uncompleteMission,
    deleteMission,
    updateMissionTransferStatus
  }
}