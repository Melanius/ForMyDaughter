'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { PlannerSettings } from '@/lib/types/allowance-planner'
import allowancePlannerService from '@/lib/services/allowance-planner'

interface AllocationSlidersProps {
  settings: PlannerSettings
  onSettingsChange: (settings: PlannerSettings) => void
}

export function AllocationSliders({ settings, onSettingsChange }: AllocationSlidersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [tempDistribution, setTempDistribution] = useState(settings.distribution)

  useEffect(() => {
    setTempDistribution(settings.distribution)
  }, [settings.distribution])

  const handleDistributionChange = (type: 'dailyPercent' | 'eventPercent' | 'streakPercent', value: number) => {
    // 현재 변경하는 항목의 값 업데이트
    const newDistribution = { ...tempDistribution, [type]: value }
    
    // 나머지 두 항목의 합이 100이 되도록 조정
    const otherKeys = Object.keys(newDistribution).filter(key => key !== type) as Array<keyof typeof newDistribution>
    const otherSum = otherKeys.reduce((sum, key) => sum + newDistribution[key], 0)
    const remaining = 100 - value
    
    if (remaining >= 0 && otherSum > 0) {
      // 비례적으로 나머지 항목들 조정
      const ratio = remaining / otherSum
      otherKeys.forEach(key => {
        newDistribution[key] = Math.round(newDistribution[key] * ratio)
      })
      
      // 반올림 오차 보정
      const finalSum = Object.values(newDistribution).reduce((sum, val) => sum + val, 0)
      if (finalSum !== 100) {
        newDistribution[otherKeys[0]] += 100 - finalSum
      }
    }

    setTempDistribution(newDistribution)
    
    // 실시간 업데이트
    onSettingsChange({
      ...settings,
      distribution: newDistribution
    })
  }

  const calculateAmount = useCallback((percentage: number) => {
    return Math.round(settings.monthlyBudget * (percentage / 100))
  }, [settings.monthlyBudget])

  const defaultDistribution = useMemo(() => ({
    dailyPercent: 60,
    eventPercent: 25,
    streakPercent: 15
  }), [])

  const resetToDefault = useCallback(() => {
    if (settings.childId) {
      setTempDistribution(defaultDistribution)
      onSettingsChange({
        ...settings,
        distribution: defaultDistribution
      })
    }
  }, [settings, defaultDistribution, onSettingsChange])

  const handleAdvancedChange = (key: 'streakTarget' | 'eventFrequency', value: number) => {
    onSettingsChange({
      ...settings,
      advanced: {
        ...settings.advanced,
        [key]: value
      }
    })
  }

  if (!settings.monthlyBudget) {
    return null
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          2️⃣ 스마트 조정 <span className="text-sm text-gray-500">(선택적, 1분)</span>
        </h3>
        <button
          onClick={resetToDefault}
          className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 hover:border-blue-300"
        >
          기본 설정 복원
        </button>
      </div>

      <div className="space-y-6">
        {/* 배분 슬라이더들 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
          {/* 데일리 미션 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">데일리 미션</label>
              <span className="text-sm font-semibold text-gray-900">
                {tempDistribution.dailyPercent}% ({calculateAmount(tempDistribution.dailyPercent).toLocaleString()}원)
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="30"
                max="80"
                value={tempDistribution.dailyPercent}
                onChange={(e) => handleDistributionChange('dailyPercent', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-blue"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>30%</span>
                <span>80%</span>
              </div>
            </div>
            <div className="h-4 bg-blue-500 rounded" style={{width: `${tempDistribution.dailyPercent}%`}}></div>
          </div>

          {/* 이벤트 미션 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">이벤트 미션</label>
              <span className="text-sm font-semibold text-gray-900">
                {tempDistribution.eventPercent}% ({calculateAmount(tempDistribution.eventPercent).toLocaleString()}원)
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="10"
                max="50"
                value={tempDistribution.eventPercent}
                onChange={(e) => handleDistributionChange('eventPercent', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-green"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10%</span>
                <span>50%</span>
              </div>
            </div>
            <div className="h-4 bg-green-500 rounded" style={{width: `${tempDistribution.eventPercent}%`}}></div>
          </div>

          {/* 연속 보너스 */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">연속 보너스</label>
              <span className="text-sm font-semibold text-gray-900">
                {tempDistribution.streakPercent}% ({calculateAmount(tempDistribution.streakPercent).toLocaleString()}원)
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="5"
                max="30"
                value={tempDistribution.streakPercent}
                onChange={(e) => handleDistributionChange('streakPercent', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-purple"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5%</span>
                <span>30%</span>
              </div>
            </div>
            <div className="h-4 bg-purple-500 rounded" style={{width: `${tempDistribution.streakPercent}%`}}></div>
          </div>

          {/* 합계 확인 */}
          <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-800">합계</span>
              <span className="text-xl font-bold text-gray-900">
                {settings.monthlyBudget.toLocaleString()}원
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {tempDistribution.dailyPercent + tempDistribution.eventPercent + tempDistribution.streakPercent}% = 100%
            </div>
          </div>
        </div>

        {/* 고급 옵션 */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800"
          >
            <span className="mr-2">{showAdvanced ? '▼' : '▶'}</span>
            고급 옵션
          </button>
          
          {showAdvanced && (
            <div className="mt-4 space-y-4 bg-gray-50 rounded-lg p-4">
              {/* 연속 목표일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  연속 목표일수
                </label>
                <select
                  value={settings.advanced.streakTarget}
                  onChange={(e) => handleAdvancedChange('streakTarget', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={3}>3일</option>
                  <option value={7}>7일</option>
                  <option value={14}>14일</option>
                  <option value={30}>30일</option>
                </select>
              </div>

              {/* 이벤트 빈도 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  월 이벤트 횟수
                </label>
                <select
                  value={settings.advanced.eventFrequency}
                  onChange={(e) => handleAdvancedChange('eventFrequency', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={2}>월 2회</option>
                  <option value={4}>월 4회</option>
                  <option value={6}>월 6회</option>
                  <option value={8}>월 8회</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .slider-blue::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
        }
        .slider-green::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #10b981;
          border-radius: 50%;
          cursor: pointer;
        }
        .slider-purple::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}