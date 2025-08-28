'use client'

import { useState } from 'react'
import { StreakDisplay } from '@/components/streak/StreakDisplay'
import { StreakSettingsModal } from '@/components/streak/StreakSettings'
import { StreakTester } from '@/components/streak/StreakTester'

interface StreakSectionProps {
  userType?: string
  celebrationTrigger: { streakCount: number; bonusAmount: number; timestamp: number } | null
  onStreakUpdate: (newStreak: number, bonusEarned: number) => void
}

export function StreakSection({
  userType,
  celebrationTrigger,
  onStreakUpdate
}: StreakSectionProps) {
  const [showStreakSettings, setShowStreakSettings] = useState(false)

  const handleSettingsSave = () => {
    // 설정이 변경되면 UI 새로고침
    window.location.reload()
  }

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">연속 완료 도전</h2>
        {userType === 'parent' && (
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
        onStreakUpdate={onStreakUpdate}
        triggerCelebration={celebrationTrigger}
      />
      
      {/* 개발 테스트 도구 (부모만 표시) */}
      <StreakTester />

      {/* 연속 완료 설정 모달 */}
      <StreakSettingsModal
        isOpen={showStreakSettings}
        onClose={() => setShowStreakSettings(false)}
        onSave={handleSettingsSave}
      />
    </div>
  )
}