'use client'

import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MissionSection } from '../components/dashboard/MissionSection'
import { WalletSection } from '../components/dashboard/WalletSection'

const TemplateManager = lazy(() => import('../components/mission/TemplateManager').then(module => ({ default: module.TemplateManager })))
const PerformanceSection = lazy(() => import('../components/dashboard/PerformanceSection').then(module => ({ default: module.PerformanceSection })))
const StreakSection = lazy(() => import('../components/dashboard/StreakSection').then(module => ({ default: module.StreakSection })))
const MissionCompletionNotification = lazy(() => import('../components/notifications/MissionCompletionNotification'))
import { 
  useMissionsQuery,
  useAddMissionMutation,
  useCompleteMissionMutation,
  useUncompleteMissionMutation,
  useUpdateMissionMutation,
  useDeleteMissionMutation,
  useUpdateMissionTransferStatus,
  missionKeys
} from '../hooks/useMissionsQuery'
import { useAllowance } from '../hooks/useAllowance'
import { Mission } from '../lib/types/mission'
import { useAuth } from '@/components/auth/AuthProvider'
import missionSupabaseService from '../lib/services/missionSupabase'
import streakService from '../lib/services/streak'
import syncService from '../lib/services/sync'
import enhancedSyncService from '../lib/services/enhancedSync'
import { createClient } from '@/lib/supabase/client'
import { DailyMissionWelcomeModal } from '../components/modals/DailyMissionWelcomeModal'
import { useDailyMissionWelcome } from '../hooks/useDailyMissionWelcome'
import { getTodayKST, nowKST } from '../lib/utils/dateUtils'

export default function HomePage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(() => getTodayKST())
  const [activeTab, setActiveTab] = useState<'missions' | 'templates'>('missions')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMission, setEditingMission] = useState<Mission | null>(null)
  const [celebrationTrigger, setCelebrationTrigger] = useState<{ 
    streakCount: number
    bonusAmount: number
    timestamp: number 
  } | null>(null)
  const [connectedChildren, setConnectedChildren] = useState<{
    id: string
    full_name: string
    family_code: string
  }[]>([])
  const [isParentWithChild, setIsParentWithChild] = useState(false)
  const [walletRefreshTrigger, setWalletRefreshTrigger] = useState(0)

  // 날짜 변경 핸들러
  const handleDateChange = useCallback((newDate: string) => {
    console.log('🗓️ 날짜 변경:', selectedDate, '->', newDate)
    setSelectedDate(newDate)
  }, [selectedDate])

  // React Query 훅 사용
  const {
    missions,
    loading: missionsLoading,
    error: missionsError,
    refetch: loadMissions
  } = useMissionsQuery(selectedDate)

  // Mutation 훅들
  const addMissionMutation = useAddMissionMutation(selectedDate)
  const completeMissionMutation = useCompleteMissionMutation(selectedDate)
  const uncompleteMissionMutation = useUncompleteMissionMutation(selectedDate)
  const updateMissionMutation = useUpdateMissionMutation(selectedDate)
  const deleteMissionMutation = useDeleteMissionMutation(selectedDate)
  const updateMissionTransferStatus = useUpdateMissionTransferStatus(selectedDate)

  const {
    currentAllowance,
    loading: allowanceLoading,
    error: allowanceError,
    loadBalance,
    transferMissions,
    undoTransfer,
    updateBalance
  } = useAllowance()

  // 자녀 계정 데일리 미션 웰컴 모달
  const {
    showWelcomeModal,
    isChecking: isCheckingDailyMissions,
    handleConfirmWelcome,
    handleCloseWelcome
  } = useDailyMissionWelcome()

  // 가족 연결 상태 확인
  useEffect(() => {
    const checkFamilyConnection = async () => {
      if (profile?.user_type !== 'parent') return

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

    checkFamilyConnection()
  }, [profile])

  // 🔒 부모 기본 템플릿 생성 (세션당 한 번만, localStorage로 중복 실행 방지)
  useEffect(() => {
    const initializeParentTemplates = async () => {
      if (!profile || profile.user_type !== 'parent') return

      // 🔒 이미 이 세션에서 템플릿 체크를 했는지 확인
      const sessionKey = `template_check_${profile.id}_session`
      if (localStorage.getItem(sessionKey)) {
        console.log('🚫 이 세션에서 이미 템플릿 체크 완료됨 - 건너뜀')
        return
      }

      try {
        console.log('🏗️ 부모 계정 감지 - 기본 템플릿 확인 및 생성 로직 시작...')
        await missionSupabaseService.createDefaultTemplates()
        
        const allTemplates = await missionSupabaseService.getFamilyMissionTemplates()
        const activeDaily = allTemplates.filter(t => t.missionType === 'daily' && t.isActive)
        console.log(`📋 최종 확인 - 총 템플릿: ${allTemplates.length}개, 활성 데일리: ${activeDaily.length}개`)
        
        // 🔒 세션 체크 완료 플래그 설정
        localStorage.setItem(sessionKey, 'checked')
      } catch (error) {
        console.error('부모 템플릿 초기화 실패:', error)
      }
    }

    initializeParentTemplates()
  }, [profile?.id]) // profile.id가 변경될 때만 실행 (로그인/로그아웃시에만)

  // 📅 데일리 미션 생성은 오직 useDailyMissionWelcome 훅을 통해서만 수행됨
  // 자녀 계정의 첫 로그인 시에만 웰컴 모달을 통해 생성

  // 동기화 설정 (Supabase 실시간 구독 비활성화)
  useEffect(() => {
    console.log('🔄 동기화 구독 시작 (Supabase 실시간 제외)')

    // 레거시 동기화 (같은 브라우저 탭 간)
    const legacyUnsubscribe = syncService.subscribe({
      onMissionUpdate: (payload) => {
        console.log('🔥 레거시 동기화 수신:', payload)
        // React Query 캐시 무효화로 자동 리패치
        queryClient.invalidateQueries({ queryKey: missionKeys.lists() })
      }
    })

    // 강화된 동기화 (다중 브라우저 간)
    const enhancedUnsubscribe = enhancedSyncService.subscribe({
      onUpdate: (payload) => {
        console.log('⚡ 강화된 동기화 수신:', payload)
        
        if (payload.type === 'allowance_update' && payload.data) {
          const newBalance = (payload.data['balance'] as number) || (payload.data['current_balance'] as number)
          if (typeof newBalance === 'number') {
            updateBalance(newBalance)
            console.log('💰 용돈 동기화 업데이트:', newBalance)
          }
        } else if (payload.type === 'mission_update') {
          // React Query 캐시 무효화로 자동 리패치
          queryClient.invalidateQueries({ queryKey: missionKeys.lists() })
        }
      }
    })

    // 주기적 데이터 새로고침 (Supabase 실시간 구독 대체)
    const refreshInterval = setInterval(() => {
      console.log('🔄 주기적 데이터 새로고침')
      queryClient.invalidateQueries({ queryKey: missionKeys.lists() })
    }, 30000) // 30초마다 새로고침

    return () => {
      console.log('🔇 동기화 구독 해제')
      try {
        legacyUnsubscribe()
        enhancedUnsubscribe()
        clearInterval(refreshInterval)
      } catch (error) {
        console.error('구독 해제 중 오류:', error)
      }
    }
  }, [queryClient, updateBalance])

  // 이벤트 핸들러들
  const handleMissionComplete = useCallback(async (missionId: string) => {
    const mission = Array.isArray(missions) ? missions.find(m => m.id === missionId) : undefined
    if (!mission || mission.isCompleted || !profile?.id) return

    try {
      await completeMissionMutation.mutateAsync(missionId)
      
      // 연속 완료 카운터 업데이트
      try {
        const streakResult = await streakService.updateStreak(profile.id)
        
        if (streakResult.shouldCelebrate) {
          setCelebrationTrigger({
            streakCount: streakResult.newStreak,
            bonusAmount: streakResult.bonusEarned,
            timestamp: Date.now()
          })
        }
      } catch (streakError) {
        console.error('연속 카운터 업데이트 실패:', streakError)
      }

      // 강화된 동기화 알림
      enhancedSyncService.notify({
        type: 'mission_update',
        entityId: missionId,
        data: {
          isCompleted: true,
          completedAt: nowKST(),
          userId: profile.id
        },
        userId: profile.id
      })
    } catch (error) {
      console.error('미션 완료 실패:', error)
      alert('미션 완룄에 실패했습니다. 다시 시도해주세요.')
    }
  }, [missions, profile?.id, completeMissionMutation])

  const handleUndoComplete = useCallback(async (missionId: string) => {
    try {
      await uncompleteMissionMutation.mutateAsync(missionId)
    } catch (error) {
      console.error('미션 완료 취소 실패:', error)
      alert(error instanceof Error ? error.message : '미션 완료 취소에 실패했습니다.')
    }
  }, [uncompleteMissionMutation])

  const handleDeleteMission = useCallback(async (missionId: string) => {
    if (!confirm('정말로 이 미션을 삭제하시겠습니까?')) return

    try {
      await deleteMissionMutation.mutateAsync(missionId)
    } catch (error) {
      console.error('미션 삭제 실패:', error)
      alert(error instanceof Error ? error.message : '미션 삭제에 실패했습니다.')
    }
  }, [deleteMissionMutation])

  const handleEditMission = useCallback((mission: Mission) => {
    if (mission.isTransferred) return
    setEditingMission(mission)
    setShowAddModal(true)
  }, [])

  const handleAddMission = useCallback(async (newMission: {
    title: string
    description: string
    reward: number
    category?: string
    missionType?: string
    date?: string
  }) => {
    try {
      if (editingMission) {
        // 미션 수정
        await updateMissionMutation.mutateAsync({
          missionId: editingMission.id,
          updates: {
            title: newMission.title,
            description: newMission.description,
            reward: newMission.reward,
            ...(newMission.category && { category: newMission.category }),
            ...(newMission.missionType && { missionType: newMission.missionType })
          }
        })
        setEditingMission(null)
      } else {
        // 새 미션 추가
        await addMissionMutation.mutateAsync(newMission)
      }
      setShowAddModal(false)
    } catch (error) {
      console.error('미션 추가/수정 실패:', error)
      alert(error instanceof Error ? error.message : '미션 처리에 실패했습니다.')
      setShowAddModal(false)
    }
  }, [editingMission, addMissionMutation, updateMissionMutation])

  const handleTransferMissions = useCallback(async (allPendingMissions: Mission[]) => {
    try {
      console.log('🎯 전달할 전체 대기 미션 수:', allPendingMissions.length)
      const result = await transferMissions(allPendingMissions)
      if (result.success) {
        updateMissionTransferStatus(
          allPendingMissions.map(m => m.id),
          true
        )
        // WalletSection 새로고침 트리거
        setWalletRefreshTrigger(prev => prev + 1)
        console.log('✅ 전체 미션 전달 완료')
      }
    } catch (error) {
      console.error('미션 전달 실패:', error)
      alert(error instanceof Error ? error.message : '미션 전달에 실패했습니다.')
    }
  }, [transferMissions, updateMissionTransferStatus])

  const handleUndoTransfer = useCallback(async (missionId: string) => {
    const mission = Array.isArray(missions) ? missions.find(m => m.id === missionId) : undefined
    if (!mission || !mission.isTransferred) return

    try {
      await undoTransfer(missionId, mission.reward)
      updateMissionTransferStatus([missionId], false)
    } catch (error) {
      console.error('전달 되돌리기 실패:', error)
      alert(error instanceof Error ? error.message : '전달 되돌리기에 실패했습니다.')
    }
  }, [missions, undoTransfer, updateMissionTransferStatus])

  const handleStreakUpdate = useCallback((newStreak: number, bonusEarned: number) => {
    if (bonusEarned > 0) {
      updateBalance(currentAllowance + bonusEarned)
    }
  }, [currentAllowance, updateBalance])

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false)
    setEditingMission(null)
  }, [])

  const loading = missionsLoading || allowanceLoading

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (missionsError || allowanceError) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-red-600">
            {missionsError || allowanceError}
          </p>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: missionKeys.lists() })
              loadBalance()
            }}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
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
              <MissionSection
                missions={missions}
                loading={false}
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
                userType={profile?.user_type || 'child'}
                showAddModal={showAddModal}
                editingMission={editingMission}
                onShowAddModal={setShowAddModal}
                onAddMission={handleAddMission}
                onEditMission={handleEditMission}
                onDeleteMission={handleDeleteMission}
                onMissionComplete={handleMissionComplete}
                onUndoComplete={handleUndoComplete}
                onUndoTransfer={handleUndoTransfer}
                onCloseModal={handleCloseModal}
              />
            ) : (
              <Suspense fallback={
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">템플릿 관리 로딩 중...</p>
                </div>
              }>
                <TemplateManager />
              </Suspense>
            )}
          </div>
        </div>
        
        <WalletSection
          currentAllowance={currentAllowance}
          missions={missions}
          isParentWithChild={isParentWithChild}
          userType={profile?.user_type || 'child'}
          connectedChildren={connectedChildren}
          onTransferMissions={handleTransferMissions}
          refreshTrigger={walletRefreshTrigger}
        />

        <Suspense fallback={
          <div className="bg-white rounded-xl shadow-lg p-6 text-center mb-6">
            <div className="animate-spin h-8 w-8 border-b-2 border-purple-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">연속 완료 정보 로딩 중...</p>
          </div>
        }>
          <StreakSection
            userType={profile?.user_type || 'child'}
            celebrationTrigger={celebrationTrigger}
            onStreakUpdate={handleStreakUpdate}
          />
        </Suspense>

        <Suspense fallback={
          <div className="bg-white rounded-xl shadow-lg p-6 text-center mb-6">
            <div className="animate-spin h-8 w-8 border-b-2 border-green-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">성과 정보 로딩 중...</p>
          </div>
        }>
          <PerformanceSection missions={missions} />
        </Suspense>
        
        <div className="text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            미션<span className="hidden sm:inline"> 어드벤처가</span> 시작!
          </p>
        </div>
      </div>

      {/* 자녀 계정 데일리 미션 웰컴 모달 */}
      <DailyMissionWelcomeModal
        isOpen={showWelcomeModal}
        onClose={handleCloseWelcome}
        onConfirm={async () => {
          await handleConfirmWelcome()
          queryClient.invalidateQueries({ queryKey: missionKeys.lists() }) // 모달 확인 후 미션 목록 새로고침
        }}
        {...(profile?.full_name && { childName: profile.full_name })}
      />

      {/* 부모 계정 미션 완료 알림 */}
      {profile?.user_type === 'parent' && (
        <Suspense fallback={null}>
          <MissionCompletionNotification 
            connectedChildren={connectedChildren}
          />
        </Suspense>
      )}
    </div>
  )
}