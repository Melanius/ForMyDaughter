'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import missionSupabaseService from '@/lib/services/missionSupabase'
import { useAllowance } from '@/hooks/useAllowance'
import { Mission } from '@/lib/types/mission'
import { X, Gift, Clock, Calendar } from 'lucide-react'
import { getTodayKST } from '@/lib/utils/dateUtils'

// 날짜를 사용자 친화적 한국어 형식으로 포맷
const formatCompletionDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    
    if (isToday) {
      return '오늘 완료'
    } else {
      return `${month}월 ${day}일 완료`
    }
  } catch {
    return '완료'
  }
}

// 미션을 날짜별로 그룹화
const groupMissionsByDate = (missions: Mission[]) => {
  const grouped = missions.reduce((acc, mission) => {
    const dateKey = mission.date || getTodayKST()
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(mission)
    return acc
  }, {} as Record<string, Mission[]>)

  // 날짜순으로 정렬 (최신순)
  return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a))
}

interface MissionCompletionNotificationProps {
  connectedChildren?: { id: string; full_name: string; family_code: string }[]
}

export default function MissionCompletionNotification({ 
  connectedChildren 
}: MissionCompletionNotificationProps) {
  const { profile } = useAuth()
  const { transferMissions } = useAllowance()
  const [showNotification, setShowNotification] = useState(false)
  const [completedChild, setCompletedChild] = useState<{ id: string; name: string } | null>(null)
  const [pendingMissions, setPendingMissions] = useState<Mission[]>([])
  const [totalReward, setTotalReward] = useState(0)
  const [waitMessage, setWaitMessage] = useState('')
  const [isWaiting, setIsWaiting] = useState(false)

  // 부모 계정에서만 작동
  useEffect(() => {
    if (profile?.user_type !== 'parent' || !connectedChildren?.length) {
      return
    }

    // 실시간 미션 완료 상태 감지
    const checkMissionCompletion = async () => {
      const today = getTodayKST()
      
      for (const child of connectedChildren) {
        try {
          // 오늘 미션만 확인 (팝업 트리거용)
          const todayMissions = await missionSupabaseService.getFamilyMissionInstances(today)
          const childTodayMissions = todayMissions.filter(m => m.userId === child.id)
          const todayDailyMissions = childTodayMissions.filter(m => m.missionType === 'daily')
          
          // 오늘의 모든 데일리 미션이 완료되었는지 확인 (이벤트 미션은 별도로 정산 가능하므로 데일리만 체크)
          const todayAllCompleted = todayDailyMissions.length > 0 && 
            todayDailyMissions.every(m => m.isCompleted) &&
            childTodayMissions.some(m => !m.isTransferred) // 데일리든 이벤트든 아직 전달되지 않은 미션이 있음
          
          if (todayAllCompleted) {
            // 🎯 당일 미션 완료 시: 모든 대기 중인 미션 함께 정산
            console.log(`🎉 ${child.full_name}님이 오늘 미션 모두 완료! 과거 미션도 함께 정산 시작...`)
            
            // 모든 과거 미션까지 포함해서 대기 중인 미션 조회
            const allPendingMissions = await getAllPendingMissions(child.id)
            
            if (allPendingMissions.length > 0) {
              const totalAmount = allPendingMissions.reduce((sum, m) => sum + m.reward, 0)
              
              setCompletedChild({ id: child.id, name: child.full_name })
              setPendingMissions(allPendingMissions)
              setTotalReward(totalAmount)
              setShowNotification(true)
              
              console.log(`📊 정산 대상:`, {
                todayMissions: allPendingMissions.filter(m => m.date === today).length,
                pastMissions: allPendingMissions.filter(m => m.date !== today).length,
                totalMissions: allPendingMissions.length,
                totalAmount
              })
              
              break // 한 번에 하나의 알림만 표시
            }
          } else {
            // 🗓️ 과거 미션 완료 체크 (팝업 없이 대기 상태만 유지)
            await checkPastMissionCompletion(child.id)
          }
        } catch (error) {
          console.error('미션 완료 상태 확인 실패:', error)
        }
      }
    }

    // 10초마다 확인
    const interval = setInterval(checkMissionCompletion, 10000)
    
    // 초기 체크
    checkMissionCompletion()

    return () => clearInterval(interval)
  }, [profile, connectedChildren])

  // 모든 대기 중인 미션 조회 (과거 + 당일)
  const getAllPendingMissions = async (userId: string): Promise<Mission[]> => {
    try {
      // 지난 30일간의 미션 중 완료되었지만 전달되지 않은 미션 조회
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const startDate = thirtyDaysAgo.toISOString().split('T')[0]!
      const endDate = getTodayKST()
      
      const allMissions: Mission[] = []
      
      // 날짜별로 조회
      for (let date = new Date(startDate); date <= new Date(endDate); date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0]!
        const dayMissions = await missionSupabaseService.getFamilyMissionInstances(dateStr)
        
        const pendingMissions = dayMissions
          .filter(m => m.userId === userId && m.isCompleted && !m.isTransferred)
          .map(mission => ({
            id: mission.id,
            userId: mission.userId || userId,
            title: mission.title,
            description: mission.description,
            reward: mission.reward,
            isCompleted: mission.isCompleted,
            completedAt: mission.completedAt || '',
            isTransferred: mission.isTransferred || false,
            category: mission.category,
            missionType: mission.missionType === 'daily' ? '데일리' : '이벤트',
            date: mission.date,
            templateId: mission.templateId
          }))
        
        allMissions.push(...pendingMissions)
      }
      
      return allMissions
    } catch (error) {
      console.error('대기 중인 미션 조회 실패:', error)
      return []
    }
  }

  // 과거 미션 완료 체크 (팝업 없이 로그만)
  const checkPastMissionCompletion = async (userId: string) => {
    // 간단한 로그만 남김 - 실제 검증 로직은 getAllPendingMissions에서 처리됨
    console.log(`🗓️ 과거 미션 완료 상태 체크 - 사용자: ${userId}`)
  }

  const handleTransfer = async () => {
    try {
      await transferMissions(pendingMissions)
      setShowNotification(false)
      // 성공 피드백
      console.log('✅ 용돈 전달 완료!')
    } catch (error) {
      console.error('용돈 전달 실패:', error)
      alert('용돈 전달에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const handleWait = () => {
    setWaitMessage('1분 뒤에 다시 알람이 울려요!')
    setIsWaiting(true)
    setShowNotification(false)
    
    // 3초 후 안내 메시지 숨김
    setTimeout(() => {
      setWaitMessage('')
    }, 3000)
    
    // 1분 후 다시 알람 표시
    setTimeout(() => {
      setShowNotification(true)
      setIsWaiting(false)
      console.log('⏰ 1분 대기 완료 - 알람 재표시')
    }, 60000)
    
    console.log('⏰ 1분 대기 시작')
  }

  if (!showNotification || !completedChild) {
    // 대기 메시지가 있을 때만 토스트 표시
    if (waitMessage) {
      return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>{waitMessage}</span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 hover:scale-105">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white p-6 rounded-t-2xl text-center relative">
          <button
            onClick={() => setShowNotification(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">미션 완료!</h2>
          <p className="text-lg opacity-90">
            <strong>{completedChild.name}</strong>님이<br />
            오늘의 모든 미션을 완료했어요!
          </p>
        </div>

        {/* 내용 */}
        <div className="p-6">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-5 mb-6 shadow-sm">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-yellow-600" />
                <span className="font-bold text-gray-800">완료한 미션</span>
              </div>
              <div className="bg-yellow-100 px-3 py-1 rounded-full">
                <span className="font-bold text-yellow-700">{pendingMissions.length}개</span>
              </div>
            </div>
            
            {/* 날짜별로 그룹화된 미션 목록 */}
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {groupMissionsByDate(pendingMissions).map(([date, missions]) => {
                const dateObj = new Date(date)
                const month = dateObj.getMonth() + 1
                const day = dateObj.getDate()
                const isToday = date === getTodayKST()
                
                return (
                  <div key={date} className="bg-white rounded-lg p-4 shadow-sm border border-yellow-100">
                    {/* 날짜 헤더 */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`font-semibold text-sm ${isToday ? 'text-green-700' : 'text-gray-700'}`}>
                        {isToday ? '📅 오늘' : `📅 ${month}월 ${day}일`}
                      </h4>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {missions.length}개
                      </span>
                    </div>
                    
                    {/* 미션 목록 */}
                    <div className="space-y-2">
                      {missions.map(mission => (
                        <div key={mission.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 text-sm">{mission.title}</div>
                            {mission.completedAt && (
                              <div className="flex items-center space-x-1 mt-1">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-green-600 font-medium">
                                  {formatCompletionDate(mission.completedAt)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <span className="font-bold text-green-600 text-sm">+{mission.reward.toLocaleString()}원</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* 총합 */}
            <div className="border-t border-yellow-200 pt-4 mt-4">
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800 flex items-center space-x-2">
                    <Gift className="w-4 h-4 text-green-600" />
                    <span>총 받을 금액</span>
                  </span>
                  <span className="font-bold text-xl text-green-600">+{totalReward.toLocaleString()}원</span>
                </div>
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex space-x-3">
            <button
              onClick={handleTransfer}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-4 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <Gift className="w-5 h-5" />
              <span>용돈 전달 완료</span>
            </button>
            
            <button
              onClick={handleWait}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <Clock className="w-5 h-5" />
              <span>1분 대기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}