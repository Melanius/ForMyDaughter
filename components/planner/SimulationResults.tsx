'use client'

import { useMemo } from 'react'
import { PlannerSettings, SimulationScenario, ChildProfile } from '@/lib/types/allowance-planner'
import allowancePlannerService from '@/lib/services/allowance-planner'

interface SimulationResultsProps {
  settings: PlannerSettings
  selectedChild: ChildProfile | null
}

export function SimulationResults({ settings, selectedChild }: SimulationResultsProps) {
  if (!settings.monthlyBudget || !selectedChild) {
    return null
  }

  const scenarios = useMemo(() => {
    return allowancePlannerService.generateScenarios(
      settings,
      selectedChild.pastCompletionRate
    )
  }, [settings, selectedChild.pastCompletionRate])

  const ScenarioCard = ({ scenario }: { scenario: SimulationScenario }) => (
    <div className="bg-white rounded-xl p-4 border-2 border-gray-100 hover:border-blue-200 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{scenario.emoji}</span>
          <div>
            <h4 className="font-semibold text-gray-800">{scenario.title}</h4>
            <p className="text-sm text-gray-600">
              완료율 {Math.round(scenario.completionRate * 100)}%
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {scenario.expectedEarnings.toLocaleString()}원
          </div>
          {scenario.type === 'average' && selectedChild.pastCompletionRate && (
            <div className="text-xs text-blue-600">예상 수익</div>
          )}
        </div>
      </div>
      
      {/* 수익 분해 표시 */}
      <div className="space-y-1 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>데일리 미션</span>
          <span>
            {Math.round(settings.monthlyBudget * (settings.distribution.dailyPercent / 100) * scenario.completionRate).toLocaleString()}원
          </span>
        </div>
        <div className="flex justify-between">
          <span>이벤트 미션</span>
          <span>
            {Math.round(settings.monthlyBudget * (settings.distribution.eventPercent / 100) * Math.min(scenario.completionRate * 1.2, 1)).toLocaleString()}원
          </span>
        </div>
        <div className="flex justify-between">
          <span>연속 보너스</span>
          <span>
            {scenario.completionRate > 0.8 
              ? Math.round(settings.monthlyBudget * (settings.distribution.streakPercent / 100)).toLocaleString()
              : '0'
            }원
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        3️⃣ 실전 시뮬레이션 <span className="text-sm text-gray-500">(결과 확인)</span>
      </h3>

      <div className="space-y-4">
        {/* 시나리오 헤더 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
            📊 한 달 예상 시나리오
          </h4>
          <p className="text-sm text-gray-600">
            {selectedChild.name}의 미션 완료 패턴에 따른 예상 수익을 확인해보세요
          </p>
        </div>

        {/* 시나리오 카드들 */}
        <div className="space-y-3">
          {scenarios.map((scenario, index) => (
            <ScenarioCard key={`${scenario.type}-${index}`} scenario={scenario} />
          ))}
        </div>

        {/* 개인화된 예측 */}
        {selectedChild.pastCompletionRate && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="text-green-600 mr-2">🎯</span>
              <span className="font-semibold text-gray-800">개인화된 예측</span>
            </div>
            <p className="text-sm text-gray-600">
              {selectedChild.name}의 지난 달 완료율 {Math.round(selectedChild.pastCompletionRate * 100)}%를 
              기반으로 한 예상 수익입니다.
            </p>
          </div>
        )}

        {/* 설정 요약 */}
        <div className="border-t pt-4">
          <h5 className="font-medium text-gray-800 mb-3">현재 설정 요약</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">월 예산</div>
              <div className="font-semibold">{settings.monthlyBudget.toLocaleString()}원</div>
            </div>
            <div>
              <div className="text-gray-600">연속 목표</div>
              <div className="font-semibold">{settings.advanced.streakTarget}일</div>
            </div>
            <div>
              <div className="text-gray-600">데일리 비중</div>
              <div className="font-semibold">{settings.distribution.dailyPercent}%</div>
            </div>
            <div>
              <div className="text-gray-600">이벤트 비중</div>
              <div className="font-semibold">{settings.distribution.eventPercent}%</div>
            </div>
          </div>
        </div>

        {/* 팁 */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-yellow-600 mr-2 mt-0.5">💡</span>
            <div className="text-sm">
              <div className="font-semibold text-yellow-800 mb-1">💰 용돈 최적화 팁</div>
              <ul className="text-yellow-700 space-y-1 text-xs">
                <li>• 연속 보너스는 완료율 80% 이상일 때만 지급됩니다</li>
                <li>• 이벤트 미션은 데일리보다 약간 높은 달성률을 보입니다</li>
                <li>• 설정 후 한 달간 운영해보고 필요시 조정하세요</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}