'use client'

import { useState, useEffect } from 'react'
import { AddMissionModal } from '../components/mission/AddMissionModal'
import { TemplateManager } from '../components/mission/TemplateManager'
import { MissionInstance, Mission } from '../lib/types/mission'
import missionSupabaseService from '../lib/services/missionSupabase'
import allowanceSupabaseService from '../lib/services/allowanceSupabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { StreakDisplay } from '@/components/streak/StreakDisplay'
import { StreakSettingsModal } from '@/components/streak/StreakSettings'
import { StreakTester } from '@/components/streak/StreakTester'
import streakService from '@/lib/services/streak'
import syncService from '@/lib/services/sync'
import enhancedSyncService from '@/lib/services/enhancedSync'
import { createClient } from '@/lib/supabase/client'

// Mission 인터페이스는 lib/types/mission.ts에서 임포트

export default function HomePage() {
  const { profile } = useAuth()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [currentAllowance, setCurrentAllowance] = useState(7500)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMission, setEditingMission] = useState<Mission | null>(null)
  const [selectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [activeTab, setActiveTab] = useState<'missions' | 'templates'>('missions')
  const [showStreakSettings, setShowStreakSettings] = useState(false)
  const [celebrationTrigger, setCelebrationTrigger] = useState<{ streakCount: number; bonusAmount: number; timestamp: number } | null>(null)
  const [connectedChildren, setConnectedChildren] = useState<{id: string; full_name: string; family_code: string}[]>([])
  const [isParentWithChild, setIsParentWithChild] = useState(false)

  const loadMissions = async () => {
    try {
      // Supabase에서 가족 단위 미션 로드
      const dateMissions = await missionSupabaseService.getFamilyMissionInstances(selectedDate)
      
      // Mission 형태로 변환 (기존 UI 호환성을 위해)
      const compatibleMissions: Mission[] = dateMissions.map(instance => ({
        id: instance.id,
        userId: instance.userId, // 미션 소유자 ID 포함
        title: instance.title,
        description: instance.description,
        reward: instance.reward,
        isCompleted: instance.isCompleted,
        completedAt: instance.completedAt,
        isTransferred: instance.isTransferred,
        category: instance.category,
        missionType: instance.missionType === 'daily' ? '데일리' : '이벤트',
        date: instance.date,
        templateId: instance.templateId
      }))

      setMissions(compatibleMissions)
    } catch (error) {
      console.error('미션 로드 실패:', error)
    }
  }

  useEffect(() => {
    const initializeData = async () => {
      try {
        // 1. Supabase 기본 템플릿 확인 및 생성 (부모인 경우에만)
        if (profile?.user_type === 'parent') {
          console.log('🏗️ Supabase 기본 템플릿 확인 및 생성 시작...')
          await missionSupabaseService.createDefaultTemplates()
          
          // 템플릿 생성 확인
          const allTemplates = await missionSupabaseService.getFamilyMissionTemplates()
          const activeDaily = allTemplates.filter(t => t.missionType === 'daily' && t.isActive)
          console.log(`📋 총 템플릿: ${allTemplates.length}개, 활성 데일리: ${activeDaily.length}개`)
        }

        // 3. 부모-자녀 연결 상태 확인
        if (profile?.user_type === 'parent') {
          try {
            const supabase = createClient()
            const { data: children, error } = await supabase
              .from('profiles')
              .select('id, full_name, family_code')
              .eq('parent_id', profile.id)
              .eq('user_type', 'child')
            
            if (!error && children && children.length > 0) {
              setConnectedChildren(children)
              setIsParentWithChild(true)
              console.log('👨‍👩‍👧‍👦 연결된 자녀:', children.length, '명')
            } else {
              setConnectedChildren([])
              setIsParentWithChild(false)
            }
          } catch (error) {
            console.error('가족 연결 상태 확인 실패:', error)
            setIsParentWithChild(false)
          }
        }

        // 2. 선택된 날짜의 미션 로드 및 자동 생성
        const today = new Date().toISOString().split('T')[0]
        let dateMissions = await missionSupabaseService.getFamilyMissionInstances(selectedDate)
        
        // 미래 날짜이고 미션이 없으면 데일리 미션 자동 생성
        if (selectedDate >= today && dateMissions.length === 0) {
          console.log(`📅 ${selectedDate}에 미션 없음, 데일리 미션 생성 시도...`)
          const generatedCount = await missionSupabaseService.generateDailyMissions(selectedDate)
          console.log(`✨ ${generatedCount}개의 데일리 미션 생성됨`)
          dateMissions = await missionSupabaseService.getFamilyMissionInstances(selectedDate)
        } else if (selectedDate >= today) {
          console.log(`📋 ${selectedDate}에 이미 ${dateMissions.length}개 미션 존재`)
        }

        // Mission 형태로 변환 (기존 UI 호환성을 위해)
        const compatibleMissions: Mission[] = dateMissions.map(instance => ({
          id: instance.id,
          userId: instance.userId, // 미션 소유자 ID 포함
          title: instance.title,
          description: instance.description,
          reward: instance.reward,
          isCompleted: instance.isCompleted,
          completedAt: instance.completedAt,
          isTransferred: instance.isTransferred,
          category: instance.category,
          missionType: instance.missionType === 'daily' ? '데일리' : '이벤트',
          date: instance.date,
          templateId: instance.templateId
        }))

        setMissions(compatibleMissions)

        // 3. 용돈 정보 로드 (Supabase 기반 가족 공유)
        try {
          const currentBalance = await allowanceSupabaseService.getCurrentBalance()
          setCurrentAllowance(currentBalance)
        } catch (error) {
          console.error('Failed to load current balance:', error)
          setCurrentAllowance(0)
        }

      } catch (error) {
        console.error('Failed to initialize data:', error)
        // 에러 발생 시 기본값으로 설정
        setMissions([])
        setCurrentAllowance(7500)
      } finally {
        setLoading(false)
      }
    }

    initializeData()

    // Supabase 실시간 미션 동기화 구독
    const missionChannel = missionSupabaseService.subscribeToMissions((payload) => {
      console.log('🔄 Supabase 실시간 미션 변경 감지:', payload)
      loadMissions()
    })

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      console.log('🔇 Supabase 미션 실시간 동기화 구독 해제')
      missionChannel.unsubscribe()
    }
  }, [selectedDate, profile?.id, profile?.user_type])

  // 강화된 실시간 동기화 구독 (다중 브라우저 + 탭 간)
  useEffect(() => {
    console.log('🔄 강화된 실시간 동기화 구독 시작')

    // 기존 동기화 (같은 브라우저 탭 간)
    const legacyUnsubscribe = syncService.subscribe({
      onMissionUpdate: (payload) => {
        console.log('🔥 레거시 동기화 수신:', payload)
        
        if (payload.type === 'mission_update' && payload.data) {
          const data = payload.data
          setMissions(prev => 
            prev.map(mission => 
              mission.id === payload.missionId 
                ? { 
                    ...mission, 
                    isCompleted: data.isCompleted ?? mission.isCompleted,
                    completedAt: data.completedAt ?? mission.completedAt,
                    isTransferred: data.isTransferred ?? mission.isTransferred ?? false
                  }
                : mission
            )
          )
        } else if (payload.type === 'mission_create' && payload.data) {
          // 현재 날짜와 같은 미션만 추가
          if (payload.date === selectedDate) {
            const data = payload.data as Record<string, unknown>
            const newMission: Mission = {
              id: payload.missionId,
              userId: (data.user_id as string) || undefined,
              title: (data.title as string) || '',
              description: (data.description as string) || undefined,
              reward: (data.reward as number) || 0,
              isCompleted: (data.is_completed as boolean) || false,
              completedAt: (data.completed_at as string) || undefined,
              isTransferred: (data.is_transferred as boolean) || false,
              category: (data.category as string) || undefined,
              missionType: (data.mission_type as string) === 'daily' ? '데일리' : '이벤트',
              date: (data.date as string) || selectedDate,
              templateId: (data.template_id as string) || undefined
            }
            setMissions(prev => {
              // 중복 방지
              if (prev.find(m => m.id === payload.missionId)) return prev
              return [...prev, newMission]
            })
          }
        } else if (payload.type === 'mission_delete') {
          setMissions(prev => prev.filter(mission => mission.id !== payload.missionId))
        }
      }
    })

    // 강화된 동기화 (다중 브라우저 간 + Supabase Realtime)
    const enhancedUnsubscribe = enhancedSyncService.subscribe({
      onUpdate: (payload) => {
        console.log('⚡ 강화된 동기화 수신:', payload)
        
        // 미션 관련 동기화 처리
        if (payload.type === 'mission_update' && payload.data) {
          const data = payload.data
          setMissions(prev => 
            prev.map(mission => 
              mission.id === payload.entityId 
                ? { 
                    ...mission, 
                    isCompleted: (data.is_completed as boolean) ?? (data.isCompleted as boolean) ?? mission.isCompleted,
                    completedAt: (data.completed_at as string) ?? (data.completedAt as string) ?? mission.completedAt,
                    isTransferred: (data.is_transferred as boolean) ?? (data.isTransferred as boolean) ?? mission.isTransferred ?? false
                  }
                : mission
            )
          )
        } else if (payload.type === 'mission_create' && payload.data) {
          const data = payload.data
          const newMission: Mission = {
            id: payload.entityId,
            title: (data.title as string) || '',
            description: (data.description as string) || undefined,
            reward: (data.reward as number) || 0,
            isCompleted: (data.is_completed as boolean) || (data.isCompleted as boolean) || false,
            completedAt: (data.completed_at as string) || (data.completedAt as string) || undefined,
            isTransferred: (data.is_transferred as boolean) || (data.isTransferred as boolean) || false,
            category: (data.category as string) || undefined,
            missionType: (data.mission_type as string) || (data.missionType as string) || undefined
          }
          setMissions(prev => {
            // 중복 방지
            if (prev.find(m => m.id === payload.entityId)) return prev
            return [...prev, newMission]
          })
        } else if (payload.type === 'mission_delete') {
          setMissions(prev => prev.filter(mission => mission.id !== payload.entityId))
        }
        
        // 용돈 관련 동기화 처리
        else if (payload.type === 'allowance_update' && payload.data) {
          const newBalance = (payload.data.balance as number) || (payload.data.current_balance as number)
          if (typeof newBalance === 'number') {
            setCurrentAllowance(newBalance)
            console.log('💰 용돈 동기화 업데이트:', newBalance)
          }
        }
        
        // 연속 완료 관련 동기화 처리
        else if (payload.type === 'streak_update' && payload.data) {
          console.log('🔥 연속 완료 동기화 업데이트:', payload.data)
          // StreakDisplay 컴포넌트에서 자체적으로 상태를 관리하므로
          // 여기서는 로그만 남김
        }
      }
    })

    // 동기화 상태 모니터링 (개발 환경에서만)
    const statusInterval = setInterval(() => {
      if (process.env.NODE_ENV === 'development') {
        const status = enhancedSyncService.getStatus()
        console.log('🔍 동기화 상태:', status)
      }
    }, 30000) // 30초마다

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      console.log('🔇 강화된 동기화 구독 해제')
      legacyUnsubscribe()
      enhancedUnsubscribe()
      clearInterval(statusInterval)
    }
  }, [selectedDate])

  useEffect(() => {
    if (!loading) {
      localStorage.setItem('missions', JSON.stringify(missions))
    }
  }, [missions, loading])

  useEffect(() => {
    if (!loading) {
      localStorage.setItem('currentAllowance', currentAllowance.toString())
    }
  }, [currentAllowance, loading])

  const handleMissionComplete = async (missionId: string) => {
    const mission = missions.find(m => m.id === missionId)
    if (mission && !mission.isCompleted && profile?.id) {
      try {
        // Supabase 기반 미션 완료 (거래 내역은 부모 승인 시에만 기록)
        await missionSupabaseService.completeMission(missionId)
        
        // 연속 완료 카운터 업데이트
        try {
          const streakResult = await streakService.updateStreak(profile.id)
          
          if (streakResult.shouldCelebrate) {
            // 축하 이펙트 트리거
            setCelebrationTrigger({
              streakCount: streakResult.newStreak,
              bonusAmount: streakResult.bonusEarned,
              timestamp: Date.now()
            })
          }
        } catch (streakError) {
          console.error('연속 카운터 업데이트 실패:', streakError)
          // 연속 카운터 실패해도 미션 완료는 유지
        }
        
        // UI 상태 업데이트
        setMissions(prev =>
          prev.map(mission =>
            mission.id === missionId
              ? { ...mission, isCompleted: true, completedAt: new Date().toISOString() }
              : mission
          )
        )

        // 강화된 동기화 알림
        enhancedSyncService.notify({
          type: 'mission_update',
          entityId: missionId,
          data: {
            isCompleted: true,
            completedAt: new Date().toISOString(),
            userId: profile.id
          },
          userId: profile.id
        })
      } catch (error) {
        console.error('Failed to complete mission:', error)
      }
    }
  }

  const handleUndoComplete = async (missionId: string) => {
    const mission = missions.find(m => m.id === missionId)
    if (mission && mission.isCompleted && !mission.isTransferred) {
      try {
        // Supabase 기반 미션 완료 취소
        await missionSupabaseService.uncompleteMission(missionId)
        
        // 미션과 연결된 용돈 수입 내역 삭제
        await allowanceSupabaseService.removeMissionIncome(missionId)
        
        // UI 상태 업데이트
        setMissions(prev =>
          prev.map(mission =>
            mission.id === missionId
              ? { ...mission, isCompleted: false, completedAt: undefined }
              : mission
          )
        )
      } catch (error) {
        console.error('Failed to uncomplete mission:', error)
      }
    }
  }

  const handleDeleteMission = async (missionId: string) => {
    const mission = missions.find(m => m.id === missionId)
    if (mission?.isTransferred) return
    
    if (confirm('정말로 이 미션을 삭제하시겠습니까?')) {
      try {
        // Supabase 기반 미션 삭제
        await missionSupabaseService.deleteMissionInstance(missionId)
        
        // UI 상태 업데이트
        setMissions(prev => prev.filter(mission => mission.id !== missionId))
      } catch (error) {
        console.error('Failed to delete mission:', error)
      }
    }
  }

  const handleEditMission = (mission: Mission) => {
    if (mission.isTransferred) return
    setEditingMission(mission)
    setShowAddModal(true)
  }

  const handleAddMission = async (newMission: { title: string; description: string; reward: number; category?: string; missionType?: string; date?: string }) => {
    try {      
      if (editingMission) {
        // 미션 수정 - 현재 MissionSupabaseService에는 updateMission 메서드가 없으므로 로그만 남김
        console.log('미션 수정 기능은 아직 구현되지 않았습니다.')
        
        // UI 상태 업데이트
        setMissions(prev =>
          prev.map(mission =>
            mission.id === editingMission.id
              ? { 
                  ...mission, 
                  title: newMission.title, 
                  description: newMission.description, 
                  reward: newMission.reward,
                  category: newMission.category,
                  missionType: newMission.missionType
                }
              : mission
          )
        )
        setEditingMission(null)
      } else {
        // 새 미션 추가 (Supabase 기반)
        const createdId = await missionSupabaseService.addMissionInstance({
          templateId: null, // 일회성 미션
          date: newMission.date || selectedDate,
          title: newMission.title,
          description: newMission.description,
          reward: newMission.reward,
          category: newMission.category || '기타',
          missionType: newMission.missionType === '이벤트' ? 'event' : 'daily',
          isCompleted: false,
          isTransferred: false
        })

        // UI 상태 업데이트
        const mission: Mission = {
          id: createdId,
          title: newMission.title,
          description: newMission.description,
          reward: newMission.reward,
          category: newMission.category,
          missionType: newMission.missionType,
          isCompleted: false
        }
        setMissions(prev => [...prev, mission])
      }
      
      setShowAddModal(false)
    } catch (error) {
      console.error('Failed to add/edit mission:', error)
      setShowAddModal(false)
    }
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setEditingMission(null)
  }

  const handleUndoTransfer = async (missionId: string) => {
    const mission = missions.find(m => m.id === missionId)
    if (mission && mission.isTransferred) {
      try {
        // Supabase 기반 미션 되돌리기
        await missionSupabaseService.uncompleteMission(missionId)
        
        // 미션 수입도 제거
        await allowanceSupabaseService.removeMissionIncome(missionId)

        // 현재 용돈에서 미션 보상 차감
        setCurrentAllowance(prev => prev - mission.reward)
        
        // UI 상태 업데이트
        setMissions(prev =>
          prev.map(m =>
            m.id === missionId
              ? { ...m, isTransferred: false }
              : m
          )
        )
      } catch (error) {
        console.error('Failed to undo transfer:', error)
      }
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-gray-800 mb-4">
          미션<span className="hidden sm:inline"> 어드벤처</span>
        </h1>
        <p className="text-lg sm:text-xl text-center text-gray-600 mb-8 sm:mb-12 px-4">
          재미있는 미션을 클리어하고 용돈을 모아보자!
        </p>
        
        <div className="mb-12">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* 탭 네비게이션 */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('missions')}
                className={`px-2 sm:px-6 py-2 sm:py-3 font-medium transition-colors text-sm sm:text-base ${
                  activeTab === 'missions'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                오늘<span className="hidden sm:inline">의 미션</span>
              </button>
              {profile?.user_type === 'parent' && (
                <button
                  onClick={() => setActiveTab('templates')}
                  className={`px-2 sm:px-6 py-2 sm:py-3 font-medium transition-colors text-sm sm:text-base ${
                    activeTab === 'templates'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  만들기
                </button>
              )}
            </div>

            {activeTab === 'missions' ? (
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                      {selectedDate === new Date().toISOString().split('T')[0] ? (
                        <>오늘<span className="hidden sm:inline">의 미션</span></>
                      ) : (
                        `${new Date(selectedDate).getMonth() + 1}월 ${new Date(selectedDate).getDate()}일`
                      )}
                    </h2>
                    <span className="text-xs sm:text-sm text-gray-500">{selectedDate}</span>
                  </div>
                  <div className="flex gap-2">
                    {profile?.user_type === 'parent' && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium flex-1 sm:flex-none"
                      >
                        추가
                      </button>
                    )}
                  </div>
                </div>
            
                  <div className="space-y-4">
                    {loading ? (
                      <div className="text-center py-8">
                        <p className="text-gray-600">미션을 불러오는 중...</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs sm:text-sm text-gray-400">미션: {missions.length}개</p>
                      
                        {missions.map(mission => (
                          <div key={mission.id} className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                            mission.isCompleted 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-white border-gray-200'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className={`text-lg font-semibold ${
                                    mission.isCompleted ? 'text-green-800 line-through' : 'text-gray-800'
                                  }`}>
                                    {mission.title}
                                  </h3>
                                  {mission.missionType && (
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                      mission.missionType === '데일리' 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : 'bg-purple-100 text-purple-800'
                                    }`}>
                                      {mission.missionType === '데일리' ? '📅 데일리' : '⭐ 이벤트'}
                                    </span>
                                  )}
                                  {mission.category && (
                                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                      {mission.category}
                                    </span>
                                  )}
                                  {mission.isCompleted && <span className="text-2xl">✅</span>}
                                </div>
                                {mission.description && (
                                  <p className="text-gray-600 text-sm mb-3">{mission.description}</p>
                                )}
                                <div className="flex items-center gap-4">
                                  <span className="font-semibold text-green-600">{mission.reward.toLocaleString()}원</span>
                                  <span className="text-xs text-gray-500">
                                    {mission.isCompleted ? '완료됨' : '미완료'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex flex-col gap-2 ml-4">
                                {!mission.isCompleted ? (
                                  <>
                                    <button
                                      onClick={() => handleMissionComplete(mission.id)}
                                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                                    >
                                      완료
                                    </button>
                                    {profile?.user_type === 'parent' && (
                                      <>
                                        <button
                                          onClick={() => handleEditMission(mission)}
                                          className="bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-3 py-1 rounded transition-colors text-xs whitespace-nowrap"
                                        >
                                          수정
                                        </button>
                                        <button
                                          onClick={() => handleDeleteMission(mission.id)}
                                          className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 py-1 rounded transition-colors text-xs whitespace-nowrap"
                                        >
                                          삭제
                                        </button>
                                      </>
                                    )}
                                  </>
                                ) : mission.isTransferred ? (
                                  <div className="text-center">
                                    <div className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded mb-2">전달 완료</div>
                                    <button
                                      onClick={() => handleUndoTransfer(mission.id)}
                                      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded transition-colors text-xs"
                                    >
                                      되돌리기
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleUndoComplete(mission.id)}
                                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                                    >
                                      취소
                                    </button>
                                    {profile?.user_type === 'parent' && (
                                      <>
                                        <button
                                          onClick={() => handleEditMission(mission)}
                                          className="bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-3 py-1 rounded transition-colors text-xs whitespace-nowrap"
                                        >
                                          수정
                                        </button>
                                        <button
                                          onClick={() => handleDeleteMission(mission.id)}
                                          className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 py-1 rounded transition-colors text-xs whitespace-nowrap"
                                        >
                                          삭제
                                        </button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
              </div>
            ) : (
              <TemplateManager />
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">
            {isParentWithChild ? (
              <>자녀<span className="hidden sm:inline"> 지갑</span></>
            ) : (
              <>내<span className="hidden sm:inline"> 지갑</span></>
            )}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-2xl sm:text-3xl font-bold text-green-600">{currentAllowance.toLocaleString()}원</p>
              <p className="text-sm sm:text-base text-gray-600">보유<span className="hidden sm:inline"> 금액</span></p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-2xl sm:text-3xl font-bold text-orange-600">{missions.filter(m => m.isCompleted && !m.isTransferred).reduce((sum, m) => sum + m.reward, 0).toLocaleString()}원</p>
              <p className="text-sm sm:text-base text-gray-600">받을<span className="hidden sm:inline"> 금액</span></p>
            </div>
          </div>
          {missions.filter(m => m.isCompleted && !m.isTransferred).length > 0 && (
            profile?.user_type === 'parent' ? (
              <button
                onClick={async () => {
                  // 부모 확인 다이얼로그
                  const pendingReward = missions.filter(m => m.isCompleted && !m.isTransferred).reduce((sum, m) => sum + m.reward, 0)
                  if (!confirm(`${pendingReward.toLocaleString()}원을 자녀에게 지급하시겠습니까?`)) {
                    return
                  }

                  try {
                    const pendingMissions = missions.filter(m => m.isCompleted && !m.isTransferred)
                    const today = new Date().toISOString().split('T')[0]
                    
                    // 1. 미션 상태를 전달 완료로 업데이트
                    const missionIds = pendingMissions.map(m => m.id)
                    await missionSupabaseService.transferMissions(missionIds)
                    
                    // 2. 각 미션의 원래 사용자(자녀)에게 거래 내역 추가
                    for (const mission of pendingMissions) {
                      // 미션의 userId를 확인하여 해당 자녀에게 거래 내역 추가
                      if (!mission.userId) {
                        console.error('미션에 userId가 없습니다:', mission)
                        continue
                      }
                      
                      await allowanceSupabaseService.addMissionIncomeForUser(
                        mission.userId,
                        mission.id, 
                        mission.reward, 
                        mission.title, 
                        today
                      )
                    }

                    // UI 상태 업데이트 - Supabase 서비스에서 현재 잔액 다시 가져오기
                    const updatedBalance = await allowanceSupabaseService.getCurrentBalance()
                    setCurrentAllowance(updatedBalance)
                    localStorage.setItem('currentAllowance', updatedBalance.toString())
                    
                    setMissions(prev => prev.map(m => 
                      m.isCompleted && !m.isTransferred 
                        ? { ...m, isTransferred: true }
                        : m
                    ))
                  } catch (error) {
                    console.error('Failed to transfer missions:', error)
                  }
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-4 sm:px-6 py-3 rounded-lg transition-colors font-medium text-sm sm:text-base"
              >
                용돈 전달 완료
              </button>
            ) : (
              <div className="bg-orange-100 border border-orange-300 text-orange-800 px-4 sm:px-6 py-3 rounded-lg text-center text-sm sm:text-base">
                <p className="font-medium">부모님 승인 대기중</p>
                <p className="text-xs sm:text-sm text-orange-600 mt-1">
                  완료한 미션의 용돈을 받으려면 부모님의 승인이 필요해요
                </p>
              </div>
            )
          )}
        </div>

        {/* 연속 완료 표시 */}
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">연속 완료 도전</h2>
            {profile?.user_type === 'parent' && (
              <button
                onClick={() => setShowStreakSettings(true)}
                className="text-gray-500 hover:text-gray-700 p-2"
                title="연속 완료 설정"
              >
                ⚙️
              </button>
            )}
          </div>
          <StreakDisplay 
            onStreakUpdate={(newStreak, bonusEarned) => {
              if (bonusEarned > 0) {
                // 용돈 잔액 업데이트
                setCurrentAllowance(prev => prev + bonusEarned)
              }
            }}
            triggerCelebration={celebrationTrigger}
          />
          
          {/* 개발 테스트 도구 (부모만 표시) */}
          <StreakTester />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">성과</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-green-50 rounded-lg p-3">
                <span className="text-sm sm:text-base text-gray-700">완료<span className="hidden sm:inline">한 미션</span></span>
                <span className="font-bold text-green-600">{missions.filter(m => m.isCompleted).length}개</span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 rounded-lg p-3">
                <span className="text-sm sm:text-base text-gray-700">진행중<span className="hidden sm:inline">인 미션</span></span>
                <span className="font-bold text-blue-600">{missions.filter(m => !m.isCompleted).length}개</span>
              </div>
              <div className="flex justify-between items-center bg-yellow-50 rounded-lg p-3">
                <span className="text-sm sm:text-base text-gray-700">획득<span className="hidden sm:inline"> 금액</span></span>
                <span className="font-bold text-green-600 text-sm sm:text-base">
                  {missions.filter(m => m.isCompleted).reduce((sum, m) => sum + m.reward, 0).toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">오늘</h3>
            <div className="text-center bg-blue-50 rounded-lg p-4">
              <p className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">{new Date().getDate()}</p>
              <p className="text-sm sm:text-base text-gray-600">{new Date().toLocaleDateString('ko-KR', { month: 'long', year: 'numeric' })}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                {new Date().toLocaleDateString('ko-KR', { weekday: 'long' })}
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-xs sm:text-sm text-gray-500">미션<span className="hidden sm:inline"> 어드벤처가</span> 시작!</p>
        </div>
      </div>
      
      {showAddModal && (
        <AddMissionModal
          onClose={handleCloseModal}
          onAdd={handleAddMission}
          editingMission={editingMission}
          defaultDate={selectedDate}
        />
      )}

      {/* 연속 완료 설정 모달 */}
      <StreakSettingsModal
        isOpen={showStreakSettings}
        onClose={() => setShowStreakSettings(false)}
        onSave={() => {
          // 설정이 변경되면 UI 새로고침
          window.location.reload()
        }}
      />
    </div>
  )
}