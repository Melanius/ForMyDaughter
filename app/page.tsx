'use client'

import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/utils/logger'
import { MissionSection } from '../components/dashboard/MissionSection'
import { FloatingActionButton } from '../components/ui/FloatingActionButton'
import { ActionSelectionModal } from '../components/ui/ActionSelectionModal'
import { RewardNotificationBadge } from '../components/reward/RewardNotificationBadge'

const TemplateManager = lazy(() => import('../components/mission/TemplateManager').then(module => ({ default: module.TemplateManager })))
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
import { Mission } from '../lib/types/mission'
import { useAuth } from '@/components/auth/AuthProvider'
import { ChildSelectionProvider, useSelectedChild } from '@/lib/contexts/ChildSelectionContext'
import { ParentWelcomeModal } from '@/components/family/ParentWelcomeModal'
import { useFirstLoginGuide } from '@/hooks/useFirstLoginGuide'
import ChildSelector from '@/components/child-selection/ChildSelector'
import missionSupabaseService from '../lib/services/missionSupabase'
import streakService from '../lib/services/streak'
import syncService from '../lib/services/sync'
import enhancedSyncService from '../lib/services/enhancedSync'
import { createClient } from '@/lib/supabase/client'
import { DailyMissionWelcomeModal } from '../components/modals/DailyMissionWelcomeModal'
import { NoMissionModal } from '../components/modals/NoMissionModal'
import MissionProposalForm from '../components/mission/MissionProposalForm'
import MissionProposalManager from '../components/mission/MissionProposalManager'
import { ProposalNotificationModal } from '../components/notifications/ProposalNotificationModal'
import { usePendingProposals } from '../hooks/useMissionProposals'
import { CelebrationModal } from '../components/modals/CelebrationModal'
import { useDailyMissionWelcome } from '../hooks/useDailyMissionWelcome'
import celebrationService from '../lib/services/celebrationService'
import { CelebrationPayload } from '../lib/types/celebration'
import { getTodayKST, nowKST } from '../lib/utils/dateUtils'
import { isParentRole, isChildRole } from '@/lib/utils/roleUtils'
import settlementService from '../lib/services/settlementService'

// Lazy load AllowanceRequestButton for child users
const AllowanceRequestButton = lazy(() => import('../components/allowance/AllowanceRequestButton').then(module => ({ default: module.default })))

function MissionPageContent() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const selectedChildId = useSelectedChild()
  const [selectedDate, setSelectedDate] = useState(() => getTodayKST())
  
  // 부모용 첫 로그인 가이드
  const { showGuide, markGuideAsShown, userName } = useFirstLoginGuide()
  const [activeTab, setActiveTab] = useState<'missions' | 'templates'>('missions')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [showProposalForm, setShowProposalForm] = useState(false)
  const [showProposalManager, setShowProposalManager] = useState(false)
  const [showProposalNotification, setShowProposalNotification] = useState(false)
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
  
  // 축하 모달 상태
  const [showCelebrationModal, setShowCelebrationModal] = useState(false)
  const [celebrationData, setCelebrationData] = useState<{
    amount: number
    missionCount: number
  }>({ amount: 0, missionCount: 0 })

  // 날짜 변경 핸들러
  const handleDateChange = useCallback((newDate: string) => {
    logger.log('날짜 변경', { from: selectedDate, to: newDate })
    setSelectedDate(newDate)
  }, [selectedDate])

  // React Query 훅 사용 (선택된 자녀 ID 적용)
  const {
    missions,
    loading: missionsLoading,
    error: missionsError,
    refetch: loadMissions
  } = useMissionsQuery(selectedDate, selectedChildId || undefined)

  // Mutation 훅들 (선택된 자녀 ID 적용)
  const addMissionMutation = useAddMissionMutation(selectedDate, selectedChildId || undefined)
  const completeMissionMutation = useCompleteMissionMutation(selectedDate, selectedChildId || undefined)
  const uncompleteMissionMutation = useUncompleteMissionMutation(selectedDate, selectedChildId || undefined)
  const updateMissionMutation = useUpdateMissionMutation(selectedDate, selectedChildId || undefined)
  const deleteMissionMutation = useDeleteMissionMutation(selectedDate, selectedChildId || undefined)
  const updateMissionTransferStatus = useUpdateMissionTransferStatus(selectedDate, selectedChildId || undefined)


  // 자녀 계정 데일리 미션 웰컴 모달
  const {
    showWelcomeModal,
    showNoMissionModal,
    isChecking: isCheckingDailyMissions,
    handleConfirmWelcome,
    handleCloseWelcome,
    handleCloseNoMissionModal
  } = useDailyMissionWelcome()

  // 부모 계정 미션 제안 확인
  const { 
    data: pendingProposals = [], 
    isLoading: isLoadingProposals 
  } = usePendingProposals(['father', 'mother'].includes(profile?.user_type) ? profile?.id : undefined)

  // 자녀 계정일 때 축하 알림 리스너 설정
  useEffect(() => {
    if (!['son', 'daughter'].includes(profile?.user_type)) return

    const handleCelebration = (payload: CelebrationPayload) => {
      setCelebrationData({
        amount: payload.amount,
        missionCount: payload.missionCount
      })
      setShowCelebrationModal(true)
    }

    const channel = celebrationService.subscribeTocelebrations(profile.id, handleCelebration)

    return () => {
      celebrationService.unsubscribe(channel)
    }
  }, [profile?.id, profile?.user_type])

  // 가족 연결 상태 확인
  useEffect(() => {
    const checkFamilyConnection = async () => {
      if (!isParentRole(profile?.user_type)) return

      try {
        const supabase = createClient()
        const { data: children, error } = await supabase
          .from('profiles')
          .select('id, full_name, family_code')
          .eq('parent_id', profile.id)
          .in('user_type', ['son', 'daughter', 'child'])
        
        if (!error && children && children.length > 0) {
          setConnectedChildren(children)
          setIsParentWithChild(true)
          logger.log('연결된 자녀 조회 완료', { count: children.length })
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

  // 자녀 계정의 미션 완료 시 자동 정산 체크 (부모에게 알림)
  useEffect(() => {
    if (!['son', 'daughter'].includes(profile?.user_type) || !profile?.parent_id) return

    const checkAutoSettlement = async () => {
      try {
        const settlementCheck = await settlementService.shouldTriggerAutoSettlement(profile.id)
        
        if (settlementCheck.shouldTrigger) {
          logger.log('모든 미션 완료 - 자동 정산 알림 전송')
          
          // 부모에게 축하 알림 전송 (용돈 전달 팝업 트리거)
          await celebrationService.sendCelebrationNotification(
            profile.parent_id || '',
            settlementCheck.pendingSettlement.totalAmount,
            settlementCheck.pendingSettlement.totalCount
          )
          
          logger.log('부모에게 정산 알림 전송 완료', { amount: settlementCheck.pendingSettlement.totalAmount })
        }
      } catch (error) {
        console.error('자동 정산 체크 실패:', error)
      }
    }

    // 미션 상태가 변경될 때마다 체크
    checkAutoSettlement()
  }, [missions, profile?.id, profile?.user_type, profile?.parent_id])

  // 🔒 부모 기본 템플릿 생성 (세션당 한 번만, localStorage로 중복 실행 방지)
  useEffect(() => {
    const initializeParentTemplates = async () => {
      if (!profile || !isParentRole(profile.user_type)) return

      // 🔒 이미 이 세션에서 템플릿 체크를 했는지 확인
      const sessionKey = `template_check_${profile.id}_session`
      if (localStorage.getItem(sessionKey)) {
        logger.log('템플릿 체크 이미 완료됨 - 건너뜀')
        return
      }

      try {
        logger.log('부모 계정 감지 - 기본 템플릿 확인 시작')
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

  // 사용자 타입 변경 시 모든 모달 상태 초기화
  useEffect(() => {
    // 모든 모달 상태 초기화
    setShowAddModal(false)
    setShowActionModal(false)
    setShowProposalForm(false)
    setShowProposalManager(false)
    setShowProposalNotification(false)
    setEditingMission(null)
  }, [profile?.user_type])

  // 부모 로그인 시 대기 중인 제안 알림
  useEffect(() => {
    if (['father', 'mother'].includes(profile?.user_type) && pendingProposals.length > 0 && !isLoadingProposals) {
      // 로그인 후 잠시 지연해서 알림 표시 (UX 개선)
      const timer = setTimeout(() => {
        setShowProposalNotification(true)
      }, 1500)
      
      return () => clearTimeout(timer)
    }
    // No cleanup needed for other cases
    return undefined
  }, [profile?.user_type, pendingProposals.length, isLoadingProposals])

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
        
        if (payload.type === 'mission_update') {
          // React Query 캐시 무효화로 자동 리패치
          queryClient.invalidateQueries({ queryKey: missionKeys.lists() })
        }
      }
    })

    // 주기적 데이터 새로고침 (상황별 동적 간격)
    const getRefreshInterval = () => {
      // 모바일 감지
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      
      if (['father', 'mother'].includes(profile?.user_type)) {
        // 부모 계정: 미션 완료 알림을 빨리 받아야 함
        return isMobile ? 60000 : 120000 // 모바일: 1분, 데스크톱: 2분
      } else {
        // 자녀 계정: 덜 빈번한 업데이트로 충분
        return isMobile ? 180000 : 300000 // 모바일: 3분, 데스크톱: 5분
      }
    }
    
    const refreshInterval = setInterval(() => {
      console.log('🔄 주기적 데이터 새로고침')
      queryClient.invalidateQueries({ queryKey: missionKeys.lists() })
    }, getRefreshInterval())

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
  }, [queryClient])

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

  const handleUndoTransfer = useCallback(async (missionId: string) => {
    const mission = Array.isArray(missions) ? missions.find(m => m.id === missionId) : undefined
    if (!mission || !mission.isTransferred) return

    try {
      // 미션 전달 상태만 변경 (allowance 관련 로직 제거)
      updateMissionTransferStatus([missionId], false)
    } catch (error) {
      console.error('전달 되돌리기 실패:', error)
      alert(error instanceof Error ? error.message : '전달 되돌리기에 실패했습니다.')
    }
  }, [missions, updateMissionTransferStatus])

  const handleStreakUpdate = useCallback((newStreak: number, bonusEarned: number) => {
    // 연속 달성 업데이트 (allowance 관련 로직은 지갑 페이지에서 처리)
    console.log('연속 달성 업데이트:', { newStreak, bonusEarned })
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false)
    setEditingMission(null)
  }, [])

  const handleFloatingButtonClick = useCallback(() => {
    if (['father', 'mother'].includes(profile?.user_type)) {
      setShowActionModal(true)
    } else {
      // 자녀는 미션 제안 폼 열기 - 다른 모달들 상태 초기화
      setShowAddModal(false)
      setShowActionModal(false)
      setEditingMission(null)
      setShowProposalForm(true)
    }
  }, [profile?.user_type])

  const handleActionSelect = useCallback((action: 'mission' | 'template' | 'proposals') => {
    setShowActionModal(false)
    if (action === 'mission') {
      setShowAddModal(true)
    } else if (action === 'template') {
      setActiveTab('templates')
    } else if (action === 'proposals') {
      setShowProposalManager(true)
    }
  }, [])

  if (missionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 p-8">
        <div className="max-w-4xl mx-auto text-center pt-20">
          <div className="text-6xl mb-6">🎯</div>
          <p className="text-gray-600 text-lg">미션을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (missionsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 p-8">
        <div className="max-w-4xl mx-auto text-center pt-20">
          <div className="text-6xl mb-6">❌</div>
          <p className="text-red-600 text-lg mb-6">
            {missionsError}
          </p>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: missionKeys.lists() })
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-2xl transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
        <div className="p-4 md:p-8 pb-20 md:pb-8">
          <div className="max-w-4xl mx-auto">
          
          {/* 부모 계정 정산 알림 배지 */}
          {['father', 'mother'].includes(profile?.user_type) && (
            <div className="mb-6 flex justify-center">
              <RewardNotificationBadge />
            </div>
          )}

          {/* 자녀 선택기 (부모 계정이고 자녀가 여러 명인 경우만 표시) */}
          <ChildSelector />

          <div className="mb-12">
            <div className="bg-white rounded-xl shadow-lg p-8">

            {activeTab === 'missions' ? (
              <>
                {/* 자녀 계정 용돈 요청 버튼 - 미션 카드 상단으로 이동 */}
                {['son', 'daughter'].includes(profile?.user_type) && (
                  <div className="mb-6">
                    <Suspense fallback={
                      <div className="bg-gray-100 rounded-xl p-4 animate-pulse">
                        <div className="h-24 bg-gray-200 rounded-lg"></div>
                      </div>
                    }>
                      <AllowanceRequestButton 
                        userId={profile.id}
                        parentId={profile.parent_id || undefined}
                        userType={profile.user_type}
                        connectedChildren={connectedChildren}
                        onRequestSent={(amount, missions) => {
                          console.log(`💰 용돈 요청 완료: ${amount}원 (${missions.length}개 미션)`)
                          // 페이지 새로고침하여 상태 업데이트
                          window.location.reload()
                        }}
                      />
                    </Suspense>
                  </div>
                )}
                
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
              </>
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

        
        <div className="text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            미션<span className="hidden sm:inline"> 어드벤처가</span> 시작!
          </p>
        </div>
      </div>

      {/* 자녀 계정 데일리 미션 웰컴 모달 */}
      {['son', 'daughter'].includes(profile?.user_type) && (
        <DailyMissionWelcomeModal
          isOpen={showWelcomeModal}
          onClose={handleCloseWelcome}
          onConfirm={async () => {
            await handleConfirmWelcome()
            queryClient.invalidateQueries({ queryKey: missionKeys.lists() }) // 모달 확인 후 미션 목록 새로고침
          }}
          {...(profile?.full_name && { childName: profile.full_name })}
        />
      )}

      {/* 미션 없음 모달 (자녀용) */}
      {['son', 'daughter'].includes(profile?.user_type) && (
        <NoMissionModal
          isOpen={showNoMissionModal}
          onClose={handleCloseNoMissionModal}
          {...(profile?.full_name && { childName: profile.full_name })}
        />
      )}

      {/* 부모 계정 미션 완료 알림 */}
      {['father', 'mother'].includes(profile?.user_type) && (
        <Suspense fallback={null}>
          <MissionCompletionNotification 
            connectedChildren={connectedChildren}
          />
        </Suspense>
      )}
      
      {/* Floating Action Button */}
      <FloatingActionButton onClick={handleFloatingButtonClick} />
      
      
      {/* Action Selection Modal (부모용) */}
      {['father', 'mother'].includes(profile?.user_type) && (
        <ActionSelectionModal
          isOpen={showActionModal}
          onClose={() => setShowActionModal(false)}
          onSelectAddMission={() => handleActionSelect('mission')}
          onSelectCreateTemplate={() => handleActionSelect('template')}
          onSelectManageProposals={() => handleActionSelect('proposals')}
          pendingProposalsCount={pendingProposals?.length || 0}
        />
      )}

      {/* 축하 모달 (자녀용) */}
      {['son', 'daughter'].includes(profile?.user_type) && (
        <CelebrationModal
          isOpen={showCelebrationModal}
          onClose={() => setShowCelebrationModal(false)}
          amount={celebrationData.amount}
          missionCount={celebrationData.missionCount}
        />
      )}

      {/* 미션 제안 폼 (자녀용) */}
      <MissionProposalForm
        isOpen={showProposalForm}
        onClose={() => setShowProposalForm(false)}
        onSuccess={() => {
          setShowProposalForm(false)
          console.log('✅ 미션 제안이 성공적으로 전송되었습니다')
        }}
      />

      {/* 제안 알림 모달 (부모용) */}
      {['father', 'mother'].includes(profile?.user_type) && (
        <ProposalNotificationModal
          isOpen={showProposalNotification}
          onClose={() => setShowProposalNotification(false)}
          onViewProposals={() => {
            setShowProposalNotification(false)
            setShowProposalManager(true)
          }}
          pendingCount={pendingProposals?.length || 0}
          latestProposals={pendingProposals?.slice(0, 3) || []}
        />
      )}

      {/* 미션 제안 관리 모달 (부모용) */}
      <MissionProposalManager
        isOpen={showProposalManager}
        onClose={() => setShowProposalManager(false)}
      />

      {/* 부모용 첫 로그인 가이드 모달 */}
      <ParentWelcomeModal
        isOpen={showGuide}
        onClose={markGuideAsShown}
        userName={userName || undefined}
      />
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <ChildSelectionProvider>
      <MissionPageContent />
    </ChildSelectionProvider>
  )
}
