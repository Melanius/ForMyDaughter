'use client'

import { useState, useEffect, memo } from 'react'
import { Mission } from '@/lib/types/mission'
import { useAuth } from '@/components/auth/AuthProvider'
import missionSupabaseService from '@/lib/services/missionSupabase'
import allowanceSupabaseService from '@/lib/services/allowanceSupabase'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WalletSectionProps {
  currentAllowance: number
  missions: Mission[]
  isParentWithChild: boolean
  userType?: string
  connectedChildren?: { id: string; full_name: string; family_code: string }[]
  onTransferMissions: (allPendingMissions: Mission[]) => Promise<void>
  refreshTrigger?: number
}

interface PendingMissionSummary {
  totalAmount: number
  totalCount: number
  byDate: Record<string, { missions: Mission[], amount: number }>
}

export const WalletSection = memo(function WalletSection({
  currentAllowance,
  missions,
  isParentWithChild,
  userType,
  connectedChildren,
  onTransferMissions,
  refreshTrigger = 0
}: WalletSectionProps) {
  const { profile } = useAuth()
  const [allPendingMissions, setAllPendingMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(false)
  const [showPendingDetail, setShowPendingDetail] = useState(false)
  
  // 월별 조회 관련 상태
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  })
  const [monthlyStats, setMonthlyStats] = useState<{
    income: number
    expense: number
  }>({ income: 0, expense: 0 })
  const [isCurrentMonth, setIsCurrentMonth] = useState(true)

  // 모든 완료되었지만 승인되지 않은 미션들을 로드
  useEffect(() => {
    const loadAllPendingMissions = async () => {
      if (!profile?.id) return
      
      try {
        setLoading(true)
        
        let targetUserId: string
        
        // 부모 계정인 경우 연결된 자녀의 미션 조회, 자녀 계정인 경우 본인의 미션 조회
        if (userType === 'parent' && connectedChildren && connectedChildren.length > 0) {
          targetUserId = connectedChildren[0]!.id // 첫 번째 자녀 ID 사용
          console.log('👨‍👩‍👧‍👦 부모 계정 - 자녀 미션 조회:', targetUserId)
        } else {
          targetUserId = profile.id // 본인 ID 사용
          console.log('👶 자녀 계정 - 본인 미션 조회:', targetUserId)
        }
        
        const pendingMissions = await missionSupabaseService.getAllPendingMissions(targetUserId)
        
        // MissionInstance를 Mission 타입으로 변환
        const convertedMissions: Mission[] = pendingMissions.map(instance => ({
          id: instance.id,
          userId: instance.userId || targetUserId,
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
        
        setAllPendingMissions(convertedMissions)
        console.log('💰 로드된 대기 미션 수:', convertedMissions.length)
      } catch (error) {
        console.error('대기 중인 미션 로드 실패:', error)
        // 실패 시 현재 날짜 미션만 사용
        setAllPendingMissions(missions.filter(m => m.isCompleted && !m.isTransferred))
      } finally {
        setLoading(false)
      }
    }

    loadAllPendingMissions()
  }, [profile?.id, userType, connectedChildren, missions, refreshTrigger])

  // 월별 통계 로드
  useEffect(() => {
    const loadMonthlyStats = async () => {
      if (!profile?.id) return
      
      try {
        const [year, month] = selectedMonth.split('-')
        
        // 선택된 월의 첫날과 마지막날 계산
        const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1)
        const lastDay = new Date(parseInt(year), parseInt(month), 0)
        
        const startDate = firstDay.toISOString().split('T')[0]
        const endDate = lastDay.toISOString().split('T')[0]
        
        // 해당 월의 거래 내역 조회
        const transactions = await allowanceSupabaseService.getFamilyTransactions()
        
        // 선택된 월 범위로 필터링
        const monthlyTransactions = transactions.filter(t => 
          t.date >= startDate && t.date <= endDate
        )
        
        // 수입/지출 합계 계산
        const income = monthlyTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0)
          
        const expense = monthlyTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0)
        
        setMonthlyStats({ income, expense })
        
        // 현재 월인지 확인
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
        setIsCurrentMonth(selectedMonth === currentMonth)
        
      } catch (error) {
        console.error('월별 통계 로드 실패:', error)
        setMonthlyStats({ income: 0, expense: 0 })
      }
    }

    loadMonthlyStats()
  }, [selectedMonth, profile?.id, refreshTrigger])

  // 누적 정산 정보 계산
  const pendingSummary: PendingMissionSummary = allPendingMissions.reduce((acc, mission) => {
    const date = mission.date || 'unknown'
    if (!acc.byDate[date]) {
      acc.byDate[date] = { missions: [], amount: 0 }
    }
    
    acc.byDate[date].missions.push(mission)
    acc.byDate[date].amount += mission.reward
    acc.totalAmount += mission.reward
    acc.totalCount += 1
    
    return acc
  }, { 
    totalAmount: 0, 
    totalCount: 0, 
    byDate: {} as Record<string, { missions: Mission[], amount: number }>
  })

  const hasPendingMissions = allPendingMissions.length > 0

  // 월 변경 핸들러
  const handleMonthChange = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number)
    
    let newYear = year
    let newMonth = month
    
    if (direction === 'prev') {
      newMonth -= 1
      if (newMonth < 1) {
        newMonth = 12
        newYear -= 1
      }
    } else {
      newMonth += 1
      if (newMonth > 12) {
        newMonth = 1
        newYear += 1
      }
    }
    
    setSelectedMonth(`${newYear}-${newMonth.toString().padStart(2, '0')}`)
  }

  // 월 이름 포맷팅
  const getMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
    
    if (monthStr === currentMonth) {
      return `${month}월 (현재)`
    }
    return `${year}년 ${month}월`
  }

  // 디버깅 로그 (초기 로드 시에만)
  useEffect(() => {
    if (profile?.id) {
      console.log('💰 WalletSection 상태:', {
        userType,
        hasPendingMissions,
        allPendingMissionsCount: allPendingMissions.length,
        missionsCount: missions.length,
        pendingSummaryTotal: pendingSummary.totalAmount,
        isParentWithChild,
        selectedMonth,
        monthlyStats,
        isCurrentMonth
      })
    }
  }, [profile?.id, userType, hasPendingMissions, allPendingMissions.length, missions.length, pendingSummary.totalAmount, isParentWithChild, selectedMonth, monthlyStats, isCurrentMonth])

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 text-center mb-6 sm:mb-8">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
          {isParentWithChild ? (
            <>자녀<span className="hidden sm:inline"> 지갑</span></>
          ) : (
            <>내<span className="hidden sm:inline"> 지갑</span></>
          )}
        </h2>
        
        {/* 월 선택기 */}
        <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
          <button
            onClick={() => handleMonthChange('prev')}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-sm font-medium text-gray-700 min-w-[80px]">
            {getMonthLabel(selectedMonth)}
          </span>
          
          <button
            onClick={() => handleMonthChange('next')}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* 반응형 레이아웃: 모바일(세로) vs 데스크톱(가로) */}
      <div className="space-y-4 sm:space-y-0">
        {/* 모바일 레이아웃: 잔액 위, 수입/지출 아래 */}
        <div className="block sm:hidden space-y-4">
          {/* 현재 잔액 - 월별 조회시에도 그대로 유지 */}
          <div className={`rounded-lg p-4 ${isCurrentMonth ? 'bg-green-50' : 'bg-gray-50'}`}>
            <p className={`text-2xl font-bold ${isCurrentMonth ? 'text-green-600' : 'text-gray-600'}`}>
              {currentAllowance.toLocaleString()}원
            </p>
            <p className={`text-sm ${isCurrentMonth ? 'text-gray-600' : 'text-gray-500'}`}>
              내 돈 {!isCurrentMonth && '(현재)'}
            </p>
          </div>
          
          {/* 수입/지출 반반 - 월별 조회시 강조 */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-lg p-4 ${
              !isCurrentMonth 
                ? 'bg-gradient-to-br from-blue-100 to-blue-200 ring-2 ring-blue-300 shadow-lg' 
                : 'bg-blue-50'
            }`}>
              <p className={`font-bold ${
                !isCurrentMonth ? 'text-2xl text-blue-700' : 'text-lg text-blue-600'
              }`}>
                {(isCurrentMonth ? pendingSummary.totalAmount : monthlyStats.income).toLocaleString()}원
              </p>
              <p className={`text-sm ${!isCurrentMonth ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                번 돈
                {isCurrentMonth && pendingSummary.totalCount > 0 && (
                  <button
                    onClick={() => setShowPendingDetail(!showPendingDetail)}
                    className="text-blue-600 hover:text-blue-700 transition-colors ml-1 text-xs"
                    aria-label="정산 내역 상세보기"
                  >
                    📋
                  </button>
                )}
              </p>
            </div>
            
            <div className={`rounded-lg p-4 ${
              !isCurrentMonth 
                ? 'bg-gradient-to-br from-red-100 to-red-200 ring-2 ring-red-300 shadow-lg' 
                : 'bg-red-50'
            }`}>
              <p className={`font-bold ${
                !isCurrentMonth ? 'text-2xl text-red-700' : 'text-lg text-red-600'
              }`}>
                {(isCurrentMonth ? 0 : monthlyStats.expense).toLocaleString()}원
              </p>
              <p className={`text-sm ${!isCurrentMonth ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                쓴 돈
              </p>
            </div>
          </div>
        </div>

        {/* 데스크톱 레이아웃: 3개 가로 정렬 */}
        <div className="hidden sm:grid sm:grid-cols-3 sm:gap-6">
          {/* 현재 잔액 - 월별 조회시에도 그대로 유지 */}
          <div className={`rounded-lg p-4 ${isCurrentMonth ? 'bg-green-50' : 'bg-gray-50'}`}>
            <p className={`text-2xl lg:text-3xl font-bold ${isCurrentMonth ? 'text-green-600' : 'text-gray-600'}`}>
              {currentAllowance.toLocaleString()}원
            </p>
            <p className={`text-base ${isCurrentMonth ? 'text-gray-600' : 'text-gray-500'}`}>
              내 돈 {!isCurrentMonth && '(현재)'}
            </p>
          </div>
          
          {/* 수입 - 월별 조회시 강조 */}
          <div className={`rounded-lg p-4 transition-all duration-300 ${
            !isCurrentMonth 
              ? 'bg-gradient-to-br from-blue-100 to-blue-200 ring-2 ring-blue-300 shadow-lg transform scale-105' 
              : 'bg-blue-50'
          }`}>
            <p className={`font-bold ${
              !isCurrentMonth ? 'text-3xl lg:text-4xl text-blue-700' : 'text-2xl lg:text-3xl text-blue-600'
            }`}>
              {(isCurrentMonth ? pendingSummary.totalAmount : monthlyStats.income).toLocaleString()}원
            </p>
            <p className={`text-base ${!isCurrentMonth ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
              번 돈
              {isCurrentMonth && pendingSummary.totalCount > 0 && (
                <button
                  onClick={() => setShowPendingDetail(!showPendingDetail)}
                  className="text-blue-600 hover:text-blue-700 transition-colors ml-1 text-sm"
                  aria-label="정산 내역 상세보기"
                >
                  📋
                </button>
              )}
            </p>
          </div>
          
          {/* 지출 - 월별 조회시 강조 */}
          <div className={`rounded-lg p-4 transition-all duration-300 ${
            !isCurrentMonth 
              ? 'bg-gradient-to-br from-red-100 to-red-200 ring-2 ring-red-300 shadow-lg transform scale-105' 
              : 'bg-red-50'
          }`}>
            <p className={`font-bold ${
              !isCurrentMonth ? 'text-3xl lg:text-4xl text-red-700' : 'text-2xl lg:text-3xl text-red-600'
            }`}>
              {(isCurrentMonth ? 0 : monthlyStats.expense).toLocaleString()}원
            </p>
            <p className={`text-base ${!isCurrentMonth ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
              쓴 돈
            </p>
          </div>
        </div>
      </div>
      
      {hasPendingMissions && (
        userType === 'parent' ? (
          <button
            onClick={() => onTransferMissions(allPendingMissions)}
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

      {/* 정산 내역 상세 모달 */}
      {showPendingDetail && pendingSummary.totalCount > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-xl p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">
                  💰 정산 대기 내역
                </h3>
                <button
                  onClick={() => setShowPendingDetail(false)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                총 {pendingSummary.totalCount}개 미션 · {pendingSummary.totalAmount.toLocaleString()}원
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {Object.entries(pendingSummary.byDate)
                .sort(([a], [b]) => b.localeCompare(a)) // 최신 날짜부터
                .map(([date, { missions, amount }]) => {
                  const dateObj = new Date(date)
                  const today = new Date().toISOString().split('T')[0]
                  const yesterday = new Date()
                  yesterday.setDate(yesterday.getDate() - 1)
                  
                  let dateLabel = date
                  if (date === today) dateLabel = '오늘'
                  else if (date === yesterday.toISOString().split('T')[0]) dateLabel = '어제'
                  else dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
                  
                  return (
                    <div key={date} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-800">
                          📅 {dateLabel}
                        </span>
                        <span className="font-bold text-orange-600">
                          {amount.toLocaleString()}원
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        {missions.map(mission => (
                          <div key={mission.id} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">
                              {mission.title}
                            </span>
                            <span className="text-gray-600 font-medium">
                              {mission.reward.toLocaleString()}원
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
            </div>
            
            <div className="sticky bottom-0 bg-white rounded-b-xl p-4 border-t border-gray-200">
              <div className="text-center text-sm text-gray-600">
                {userType === 'parent' ? (
                  <p>💡 위 미션들을 일괄로 승인할 수 있습니다</p>
                ) : (
                  <p>⏳ 부모님의 승인을 기다리고 있습니다</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})