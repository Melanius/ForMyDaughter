'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import missionSupabaseService from '@/lib/services/missionSupabase'
import { useAllowance } from '@/hooks/useAllowance'
import { Mission } from '@/lib/types/mission'
import { X, Gift, Clock } from 'lucide-react'

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

  // 부모 계정에서만 작동
  useEffect(() => {
    if (profile?.user_type !== 'parent' || !connectedChildren?.length) {
      return
    }

    // 실시간 미션 완료 상태 감지
    const checkMissionCompletion = async () => {
      for (const child of connectedChildren) {
        try {
          const today = new Date().toISOString().split('T')[0]!
          const todayMissions = await missionSupabaseService.getFamilyMissionInstances(today)
          
          // 해당 자녀의 오늘 미션들
          const childMissions = todayMissions.filter(m => m.userId === child.id)
          const dailyMissions = childMissions.filter(m => m.missionType === 'daily')
          
          // 모든 데일리 미션이 완료되었는지 확인
          const allCompleted = dailyMissions.length > 0 && 
            dailyMissions.every(m => m.isCompleted) &&
            dailyMissions.some(m => !m.isTransferred) // 아직 전달되지 않은 미션이 있음
          
          if (allCompleted) {
            // 대기 중인 미션들
            const pending = dailyMissions.filter(m => m.isCompleted && !m.isTransferred)
            const totalAmount = pending.reduce((sum, m) => sum + m.reward, 0)
            
            // 미션을 Mission 타입으로 변환
            const convertedMissions: Mission[] = pending.map(mission => ({
              id: mission.id,
              userId: mission.userId || child.id,
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
            
            setCompletedChild({ id: child.id, name: child.full_name })
            setPendingMissions(convertedMissions)
            setTotalReward(totalAmount)
            setShowNotification(true)
            
            console.log(`🎉 ${child.full_name}님이 모든 미션 완료!`, {
              missions: pending.length,
              totalAmount
            })
            break // 한 번에 하나의 알림만 표시
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
    setShowNotification(false)
    // 30분 후 다시 확인하도록 설정할 수 있음
    console.log('⏰ 나중에 확인하기')
  }

  if (!showNotification || !completedChild) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform animate-bounce">
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
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-800">완료한 미션</span>
              <span className="font-bold text-yellow-700">{pendingMissions.length}개</span>
            </div>
            
            <div className="space-y-2">
              {pendingMissions.map(mission => (
                <div key={mission.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{mission.title}</span>
                  <span className="font-medium text-green-600">+{mission.reward.toLocaleString()}원</span>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>총 받을 금액</span>
                <span className="text-green-600">+{totalReward.toLocaleString()}원</span>
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
              <span>대기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}