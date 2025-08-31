'use client'

import { useState, useEffect } from 'react'
import { Mission } from '@/lib/types/mission'
import { useAuth } from '@/components/auth/AuthProvider'
import missionSupabaseService from '@/lib/services/missionSupabase'

interface WalletSectionProps {
  currentAllowance: number
  missions: Mission[]
  isParentWithChild: boolean
  userType?: string
  onTransferMissions: () => Promise<void>
}

interface PendingMissionSummary {
  totalAmount: number
  totalCount: number
  byDate: Record<string, { missions: Mission[], amount: number }>
}

export function WalletSection({
  currentAllowance,
  missions,
  isParentWithChild,
  userType,
  onTransferMissions
}: WalletSectionProps) {
  const { profile } = useAuth()
  const [allPendingMissions, setAllPendingMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(false)
  const [showPendingDetail, setShowPendingDetail] = useState(false)

  // 모든 완료되었지만 승인되지 않은 미션들을 로드
  useEffect(() => {
    const loadAllPendingMissions = async () => {
      if (!profile?.id) return
      
      try {
        setLoading(true)
        const pendingMissions = await missionSupabaseService.getAllPendingMissions(profile.id)
        setAllPendingMissions(pendingMissions)
      } catch (error) {
        console.error('대기 중인 미션 로드 실패:', error)
        // 실패 시 현재 날짜 미션만 사용
        setAllPendingMissions(missions.filter(m => m.isCompleted && !m.isTransferred))
      } finally {
        setLoading(false)
      }
    }

    loadAllPendingMissions()
  }, [profile?.id, missions])

  // 누적 정산 정보 계산
  const pendingSummary: PendingMissionSummary = allPendingMissions.reduce((acc, mission) => {
    const date = mission.date
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

  return (
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
          <p className="text-2xl sm:text-3xl font-bold text-green-600">
            {currentAllowance.toLocaleString()}원
          </p>
          <p className="text-sm sm:text-base text-gray-600">
            보유<span className="hidden sm:inline"> 금액</span>
          </p>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4 relative">
          <div className="flex items-center justify-center space-x-2">
            <p className="text-2xl sm:text-3xl font-bold text-orange-600">
              {loading ? '로딩...' : `${pendingSummary.totalAmount.toLocaleString()}원`}
            </p>
            {pendingSummary.totalCount > 0 && (
              <button
                onClick={() => setShowPendingDetail(!showPendingDetail)}
                className="text-orange-600 hover:text-orange-700 transition-colors ml-2 p-1 hover:bg-orange-100 rounded-full"
                aria-label="정산 내역 상세보기"
              >
                📋
              </button>
            )}
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            받을<span className="hidden sm:inline"> 금액</span>
            {pendingSummary.totalCount > 0 && (
              <span className="text-xs text-orange-600 ml-1">
                ({pendingSummary.totalCount}개 대기)
              </span>
            )}
          </p>
        </div>
      </div>
      
      {hasPendingMissions && (
        userType === 'parent' ? (
          <button
            onClick={onTransferMissions}
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
}