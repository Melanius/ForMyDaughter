'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import streakService from '@/lib/services/streak'
import StreakVerificationService from '@/lib/services/streakVerification'

export function StreakTester() {
  const { user, profile } = useAuth()
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<string[]>([])

  // 부모만 접근 가능한 테스트 도구
  if (profile?.user_type !== 'parent') {
    return null
  }

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const testStreakUpdate = async () => {
    if (!user?.id) {
      addTestResult('❌ 사용자 ID가 없습니다')
      return
    }

    setTesting(true)
    setTestResults([])
    
    try {
      addTestResult('🧪 연속 완료 보너스 테스트 시작...')
      
      // 1. 현재 상태 확인
      const currentProgress = await streakService.getUserProgress(user.id)
      const currentSettings = await streakService.getStreakSettings(user.id)
      
      addTestResult(`📊 현재 연속일: ${currentProgress?.streak_count || 0}일`)
      addTestResult(`⚙️ 목표 설정: ${currentSettings?.streak_target || 7}일마다 ${currentSettings?.streak_bonus || 1000}원`)
      
      // 2. 연속 완료 시뮬레이션
      const result = await streakService.updateStreak(user.id)
      
      addTestResult(`🔥 업데이트 결과: ${result.newStreak}일 연속`)
      addTestResult(`💰 보너스: ${result.bonusEarned}원`)
      addTestResult(`🎉 축하 필요: ${result.shouldCelebrate ? 'YES' : 'NO'}`)
      addTestResult(`📈 신기록: ${result.isNewRecord ? 'YES' : 'NO'}`)
      
      if (result.shouldCelebrate) {
        addTestResult('✨ 축하 이펙트가 표시되어야 합니다!')
      }
      
    } catch (error) {
      console.error('테스트 실패:', error)
      addTestResult(`❌ 테스트 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setTesting(false)
    }
  }

  const resetStreak = async () => {
    if (!user?.id) return
    
    try {
      addTestResult('🔄 연속 기록 초기화 중...')
      await streakService.resetStreak(user.id)
      addTestResult('✅ 연속 기록이 초기화되었습니다')
    } catch (error) {
      addTestResult(`❌ 초기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  const verifySystem = async () => {
    if (!user?.id) {
      addTestResult('❌ 사용자 ID가 없습니다')
      return
    }

    setTesting(true)
    addTestResult('🔍 보너스 지급 시스템 검증 중...')
    
    try {
      const systemStatus = await StreakVerificationService.getSystemStatus(user.id)
      
      addTestResult(`📊 검증 결과: ${systemStatus.success ? '✅ 성공' : '❌ 실패'}`)
      addTestResult(`💬 메시지: ${systemStatus.message}`)
      
      // 보너스 지급 검증
      const bonusPayments = systemStatus.bonusPayments as { success: boolean; details?: { rewardHistory?: { count?: number; totalAmount?: number }; transactions?: { count?: number; totalAmount?: number }; isConsistent?: boolean } }
      if (bonusPayments?.success && bonusPayments.details) {
        const bp = bonusPayments.details
        addTestResult(`💰 보상 내역: ${bp.rewardHistory?.count || 0}건, 총 ${bp.rewardHistory?.totalAmount || 0}원`)
        addTestResult(`💳 거래 내역: ${bp.transactions?.count || 0}건, 총 ${bp.transactions?.totalAmount || 0}원`)
        addTestResult(`🔍 데이터 일관성: ${bp.isConsistent ? '✅ 일치' : '❌ 불일치'}`)
      }
      
      // 연속 완료 로직 검증
      const streakLogic = systemStatus.streakLogic as { success: boolean; details?: { currentStreak?: number; target?: number; validation?: { daysUntilBonus?: number; streakLogicCorrect?: boolean } } }
      if (streakLogic?.success && streakLogic.details) {
        const sl = streakLogic.details
        addTestResult(`🔥 현재 연속: ${sl.currentStreak || 0}일 (목표: ${sl.target || 7}일)`)
        addTestResult(`🎯 다음 보너스까지: ${sl.validation?.daysUntilBonus || 0}일`)
        addTestResult(`✅ 로직 정합성: ${sl.validation?.streakLogicCorrect ? '정상' : '오류'}`)
      }
      
      // 권장사항
      systemStatus.recommendations.forEach(rec => {
        addTestResult(`💡 권장: ${rec}`)
      })
      
    } catch (error) {
      addTestResult(`❌ 검증 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-yellow-800">🧪 연속 완료 시스템 테스트</h3>
        <span className="text-xs text-yellow-600">(부모 전용)</span>
      </div>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={testStreakUpdate}
          disabled={testing}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
        >
          {testing ? '테스트 중...' : '연속 완료 시뮬레이션'}
        </button>
        
        <button
          onClick={resetStreak}
          disabled={testing}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50 text-sm ml-2"
        >
          연속 기록 초기화
        </button>

        <button
          onClick={verifySystem}
          disabled={testing}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 text-sm ml-2"
        >
          시스템 검증
        </button>
      </div>

      {/* 테스트 결과 */}
      {testResults.length > 0 && (
        <div className="bg-white rounded border p-3 max-h-48 overflow-y-auto">
          <div className="text-xs font-mono space-y-1">
            {testResults.map((result, index) => (
              <div key={index} className="text-gray-700">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}