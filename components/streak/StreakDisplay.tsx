'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import streakService, { UserProgress, StreakSettings } from '@/lib/services/streak'
import { CelebrationEffect } from './CelebrationEffect'

interface StreakDisplayProps {
  onStreakUpdate?: (newStreak: number, bonusEarned: number) => void
  triggerCelebration?: { streakCount: number; bonusAmount: number; timestamp: number } | null
}

export function StreakDisplay({ onStreakUpdate, triggerCelebration }: StreakDisplayProps) {
  const { user } = useAuth()
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [settings, setSettings] = useState<StreakSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationData, setCelebrationData] = useState<{ streakCount: number; bonusAmount: number } | null>(null)

  useEffect(() => {
    if (user?.id) {
      loadStreakData()
    }
  }, [user?.id])

  // 축하 효과 트리거
  useEffect(() => {
    if (triggerCelebration && !showCelebration) {
      setCelebrationData({
        streakCount: triggerCelebration.streakCount,
        bonusAmount: triggerCelebration.bonusAmount
      })
      setShowCelebration(true)
      
      // 데이터 새로고침
      setTimeout(() => {
        loadStreakData()
      }, 500)
    }
  }, [triggerCelebration, showCelebration])

  const loadStreakData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const [progressData, settingsData] = await Promise.all([
        streakService.getUserProgress(user.id),
        streakService.getStreakSettings(user.id)
      ])
      
      setProgress(progressData)
      setSettings(settingsData)
    } catch (error) {
      console.error('연속 완료 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !progress || !settings) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    )
  }

  if (!settings.streak_enabled) {
    return null
  }

  const progressPercent = Math.min((progress.streak_count % settings.streak_target) / settings.streak_target * 100, 100)
  const daysToNext = settings.streak_target - (progress.streak_count % settings.streak_target)
  const isAtTarget = progress.streak_count > 0 && progress.streak_count % settings.streak_target === 0
  
  // 진행률 표시 개선을 위한 계산
  const nextMilestone = Math.ceil(progress.streak_count / settings.streak_target) * settings.streak_target
  const currentCycleProgress = progress.streak_count % settings.streak_target || (isAtTarget ? settings.streak_target : 0)
  const progressWidth = isAtTarget ? 100 : (currentCycleProgress / settings.streak_target) * 100

  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl shadow-lg p-4 border border-orange-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🔥</span>
          <div>
            <h3 className="font-bold text-gray-800">
              {progress.streak_count > 0 ? `${progress.streak_count}일 연속!` : '연속 완료 시작!'}
            </h3>
            {progress.best_streak > 0 && (
              <p className="text-xs text-gray-600">
                최고 기록: {progress.best_streak}일
              </p>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-medium text-orange-600">
            다음 보너스
          </div>
          <div className="text-lg font-bold text-orange-700">
            +{settings.streak_bonus.toLocaleString()}원
          </div>
        </div>
      </div>

      {/* 진행률 바 - 개선된 버전 */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>진행률 ({currentCycleProgress}/{settings.streak_target})</span>
          <span>
            {isAtTarget 
              ? '🎉 달성!' 
              : `${daysToNext}일 남음`
            }
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
          {/* 배경 패턴 */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-200"></div>
          
          {/* 진행률 바 */}
          <div 
            className={`h-full rounded-full transition-all duration-700 ease-out relative ${
              isAtTarget 
                ? 'bg-gradient-to-r from-green-400 to-green-600 shadow-lg' 
                : progressWidth > 80 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-md'
                  : 'bg-gradient-to-r from-orange-400 to-red-500'
            }`}
            style={{ 
              width: `${progressWidth}%`
            }}
          >
            {/* 진행률이 높을 때 반짝이는 효과 */}
            {progressWidth > 60 && (
              <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-pulse"></div>
            )}
          </div>
          
          {/* 목표점 표시 */}
          {!isAtTarget && (
            <div className="absolute right-0 top-0 h-full w-1 bg-gray-400 opacity-50"></div>
          )}
        </div>
        
        {/* 다음 마일스톤 힌트 */}
        {progress.streak_count > 0 && !isAtTarget && (
          <div className="text-xs text-gray-500 mt-1 text-center">
            다음 목표: {nextMilestone}일 연속 완료
          </div>
        )}
      </div>

      {/* 상태 메시지 */}
      <div className="text-center">
        {progress.streak_count === 0 ? (
          <p className="text-sm text-gray-600">
            미션을 완료하고 연속 기록을 시작해보세요!
          </p>
        ) : isAtTarget ? (
          <p className="text-sm text-green-600 font-medium">
            🎉 {settings.streak_target}일 목표 달성! 보너스를 받았어요!
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            {settings.streak_target}일 연속 완료하면 
            <span className="font-medium text-orange-600">
              +{settings.streak_bonus.toLocaleString()}원 보너스!
            </span>
          </p>
        )}
      </div>

      {/* 위험 알림 (연속이 끊어질 수 있는 경우) */}
      {progress.streak_count > 0 && progress.last_completion_date !== new Date().toISOString().split('T')[0] && (
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
          <div className="flex items-center space-x-1">
            <span className="text-yellow-600">⚠️</span>
            <p className="text-xs text-yellow-700">
              오늘 미션을 완료하지 않으면 연속 기록이 초기화됩니다!
            </p>
          </div>
        </div>
      )}

      {/* 축하 효과 */}
      {celebrationData && (
        <CelebrationEffect
          isVisible={showCelebration}
          streakCount={celebrationData.streakCount}
          bonusAmount={celebrationData.bonusAmount}
          onComplete={() => {
            setShowCelebration(false)
            setCelebrationData(null)
          }}
        />
      )}
    </div>
  )
}