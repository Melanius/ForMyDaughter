'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { QuickSetup } from './QuickSetup'
import { AllocationSliders } from './AllocationSliders'
import { SimulationResults } from './SimulationResults'
import { PlannerSettings, ChildProfile } from '@/lib/types/allowance-planner'
import allowancePlannerService from '@/lib/services/allowance-planner'

interface SmartAllowancePlannerProps {
  isOpen: boolean
  onClose: () => void
}

export function SmartAllowancePlanner({ isOpen, onClose }: SmartAllowancePlannerProps) {
  const { profile } = useAuth()
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null)
  const [settings, setSettings] = useState<PlannerSettings>({
    childId: '',
    monthlyBudget: 0,
    distribution: {
      dailyPercent: 60,
      eventPercent: 25,
      streakPercent: 15
    },
    advanced: {
      streakTarget: 7,
      eventFrequency: 4
    }
  })
  const [loading, setLoading] = useState(false)

  // 목업 데이터 - 실제로는 Supabase에서 가져와야 함
  const children = useMemo<ChildProfile[]>(() => [
    {
      id: '1',
      name: '이서하',
      grade: 'elementary',
      level: 3,
      pastCompletionRate: 0.75
    },
    {
      id: '2',
      name: '김민준',
      grade: 'elementary',
      level: 5,
      pastCompletionRate: 0.85
    }
  ], [])

  useEffect(() => {
    if (selectedChild) {
      const defaultSettings = allowancePlannerService.createDefaultSettings(selectedChild)
      setSettings(defaultSettings)
    }
  }, [selectedChild])

  const handleChildSelect = useCallback((child: ChildProfile) => {
    setSelectedChild(child)
  }, [])

  const handleBudgetChange = useCallback((amount: number) => {
    setSettings(prev => ({
      ...prev,
      monthlyBudget: amount
    }))
  }, [])

  const handleSettingsChange = useCallback((newSettings: PlannerSettings) => {
    setSettings(newSettings)
  }, [])

  const handleApplySettings = async () => {
    if (!selectedChild) return

    setLoading(true)
    try {
      // TODO: 실제 API 호출로 설정 저장
      console.log('Applying settings:', settings)
      
      // 임시 성공 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      alert(`${selectedChild.name}의 용돈 플랜이 적용되었습니다!`)
      onClose()
    } catch (error) {
      console.error('설정 적용 실패:', error)
      alert('설정 적용에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  // 부모 권한 체크 (4역할 시스템: father, mother, son, daughter)
  if (!['father', 'mother'].includes(profile?.user_type || '')) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-lg font-bold mb-4">접근 제한</h2>
          <p className="text-gray-600 mb-4">이 기능은 부모만 사용할 수 있습니다.</p>
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
      <div className="bg-gray-50 rounded-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">📊 스마트 용돈 플래너</h2>
              <p className="text-blue-100">
                부모가 자녀의 용돈을 과학적이고 효율적으로 계획할 수 있는 도구
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-xl font-bold bg-white bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* 1단계: 스마트 설정 */}
            <QuickSetup
              selectedChild={selectedChild}
              onChildSelect={handleChildSelect}
              monthlyBudget={settings.monthlyBudget}
              onBudgetChange={handleBudgetChange}
              children={children}
            />

            {/* 2단계: 스마트 조정 (선택적) */}
            {selectedChild && settings.monthlyBudget > 0 && (
              <AllocationSliders
                settings={settings}
                onSettingsChange={handleSettingsChange}
              />
            )}

            {/* 3단계: 실전 시뮬레이션 */}
            {selectedChild && settings.monthlyBudget > 0 && (
              <SimulationResults
                settings={settings}
                selectedChild={selectedChild}
              />
            )}
          </div>
        </div>

        {/* 푸터 */}
        {selectedChild && settings.monthlyBudget > 0 && (
          <div className="bg-white border-t border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <div className="font-medium">{selectedChild.name}의 용돈 플랜</div>
                <div>월 예산: {settings.monthlyBudget.toLocaleString()}원</div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-6 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleApplySettings}
                  disabled={loading}
                  className="px-8 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 font-medium"
                >
                  {loading ? '적용 중...' : '설정 적용하기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 진행률 표시 */}
        {selectedChild && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-1">
            <div 
              className="bg-white h-full transition-all duration-300"
              style={{ 
                width: `${
                  settings.monthlyBudget > 0 
                    ? '100%' 
                    : selectedChild 
                      ? '33%' 
                      : '0%'
                }` 
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}