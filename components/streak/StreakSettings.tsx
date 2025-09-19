'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import streakService, { StreakSettings } from '@/lib/services/streak'

interface StreakSettingsProps {
  isOpen: boolean
  onClose: () => void
  onSave?: () => void
}

export function StreakSettingsModal({ isOpen, onClose, onSave }: StreakSettingsProps) {
  const { user, profile } = useAuth()
  const [settings, setSettings] = useState<StreakSettings>({
    user_id: '',
    streak_target: 7,
    streak_bonus: 1000,
    streak_repeat: true,
    streak_enabled: true
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && user?.id) {
      loadSettings()
    }
  }, [isOpen, user?.id])

  const loadSettings = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const settingsData = await streakService.getStreakSettings(user.id)
      if (settingsData) {
        setSettings(settingsData)
      }
    } catch (error) {
      console.error('연속 완료 설정 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user?.id) return

    try {
      setSaving(true)
      
      // 1. 설정 저장
      await streakService.updateStreakSettings(user.id, settings)
      
      // 2. 연속 완료가 활성화된 경우 가족에게 미션 생성
      if (settings.streak_enabled) {
        console.log('🎯 연속 완료 설정이 활성화됨 - 가족 미션 생성 시작')
        try {
          await streakService.createStreakMissionsForFamily(user.id)
          console.log('✅ 가족 연속 완료 미션 생성 완료')
        } catch (missionError) {
          console.error('연속 완료 미션 생성 실패:', missionError)
          // 미션 생성 실패해도 설정은 저장됨을 알림
          alert('설정은 저장되었지만, 연속 완료 미션 생성에 실패했습니다. 나중에 다시 시도해주세요.')
        }
      }
      
      onSave?.()
      onClose()
    } catch (error) {
      console.error('연속 완료 설정 저장 실패:', error)
      alert('설정 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!user?.id) return

    if (confirm('연속 완료 기록을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await streakService.resetStreak(user.id)
        alert('연속 완료 기록이 초기화되었습니다.')
        onSave?.()
      } catch (error) {
        console.error('연속 기록 초기화 실패:', error)
        alert('초기화에 실패했습니다.')
      }
    }
  }

  if (!isOpen) return null

  // 부모 권한 체크 (4역할 시스템: father, mother, son, daughter)
  if (!['father', 'mother'].includes(profile?.user_type || '')) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-lg font-bold mb-4">접근 제한</h2>
          <p className="text-gray-600 mb-4">이 설정은 부모만 변경할 수 있습니다.</p>
          <button
            onClick={onClose}
            className="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
          >
            확인
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">연속 완료 보너스 설정</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 mt-2">설정 로딩 중...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 활성화 토글 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  연속 완료 보너스
                </label>
                <p className="text-xs text-gray-500">
                  연속으로 미션을 완료했을 때 보너스를 지급합니다
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.streak_enabled}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    streak_enabled: e.target.checked
                  }))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.streak_enabled && (
              <>
                {/* 목표 연속일 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    목표 연속일수
                  </label>
                  <div className="space-y-2">
                    {[3, 7, 14, 30].map(days => (
                      <label key={days} className="flex items-center">
                        <input
                          type="radio"
                          name="streak_target"
                          value={days}
                          checked={settings.streak_target === days}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            streak_target: parseInt(e.target.value)
                          }))}
                          className="mr-2"
                        />
                        <span className="text-sm">{days}일 연속</span>
                      </label>
                    ))}
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="streak_target"
                        checked={![3, 7, 14, 30].includes(settings.streak_target)}
                        onChange={() => {}}
                        className="mr-2"
                      />
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.streak_target}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          streak_target: parseInt(e.target.value) || 1
                        }))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-sm ml-1">일 (직접 입력)</span>
                    </div>
                  </div>
                </div>

                {/* 보너스 금액 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    보너스 금액
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={settings.streak_bonus}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        streak_bonus: parseInt(e.target.value) || 0
                      }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">원</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {settings.streak_target}일 연속 완료 시 {settings.streak_bonus.toLocaleString()}원이 지급됩니다
                  </p>
                </div>

                {/* 반복 보상 */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      반복 보상
                    </label>
                    <p className="text-xs text-gray-500">
                      목표 달성 후에도 계속 보상을 받을지 설정합니다
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.streak_repeat}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        streak_repeat: e.target.checked
                      }))}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </>
            )}

            {/* 위험한 작업 */}
            <div className="border-t pt-4">
              <button
                onClick={handleReset}
                className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 text-sm"
              >
                연속 기록 초기화
              </button>
              <p className="text-xs text-gray-500 mt-1 text-center">
                ⚠️ 주의: 이 작업은 되돌릴 수 없습니다
              </p>
            </div>

            {/* 버튼들 */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={onClose}
                disabled={saving}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}