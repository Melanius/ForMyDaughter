'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import streakService, { UserProgress, StreakSettings } from '@/lib/services/streak'

interface StreakDisplayProps {
  onStreakUpdate?: (newStreak: number, bonusEarned: number) => void
}

export function StreakDisplay({ onStreakUpdate }: StreakDisplayProps) {
  const { user } = useAuth()
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [settings, setSettings] = useState<StreakSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      loadStreakData()
    }
  }, [user?.id])

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

      {/* 진행률 바 */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>목표까지</span>
          <span>
            {isAtTarget 
              ? '🎉 달성!' 
              : `${daysToNext}일 남음`
            }
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              isAtTarget 
                ? 'bg-gradient-to-r from-green-400 to-green-600' 
                : 'bg-gradient-to-r from-orange-400 to-red-500'
            }`}
            style={{ 
              width: isAtTarget ? '100%' : `${progressPercent}%` 
            }}
          ></div>
        </div>
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
    </div>
  )
}