'use client'

import { useState } from 'react'
import { SmartAllowancePlanner } from '@/components/planner/SmartAllowancePlanner'

interface AllowancePlannerSectionProps {
  userType?: string
}

export function AllowancePlannerSection({ userType }: AllowancePlannerSectionProps) {
  const [showPlanner, setShowPlanner] = useState(false)

  // 부모 권한 체크 - father, mother만 표시
  if (!['father', 'mother'].includes(userType || '')) {
    return null
  }

  return (
    <div className="mb-6 sm:mb-8">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        {/* 헤더 */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center">
              📊 스마트 용돈 플래너
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              자녀의 용돈을 과학적이고 효율적으로 계획해보세요
            </p>
          </div>
          <button
            onClick={() => setShowPlanner(true)}
            className="text-gray-500 hover:text-gray-700 p-2"
            title="용돈 플래너 열기"
          >
            ⚙️
          </button>
        </div>

        {/* 간단한 소개와 기능 설명 */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl mb-2">🎯</div>
                <div className="font-medium text-gray-800">1단계 스마트 설정</div>
                <div className="text-xs text-gray-600 mt-1">
                  AI가 학년별 추천 금액을<br/>자동으로 계산해드려요
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">⚖️</div>
                <div className="font-medium text-gray-800">2단계 배분 조정</div>
                <div className="text-xs text-gray-600 mt-1">
                  데일리·이벤트·연속보너스<br/>비율을 슬라이더로 조정
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="font-medium text-gray-800">3단계 시뮬레이션</div>
                <div className="text-xs text-gray-600 mt-1">
                  완료율별 예상 수익을<br/>미리 확인해보세요
                </div>
              </div>
            </div>
          </div>

          {/* 주요 특징 */}
          <div className="grid md:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✅</span>
              <span className="text-gray-700">학년별 표준 용돈 데이터 기반</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✅</span>
              <span className="text-gray-700">실시간 배분 비율 조정</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✅</span>
              <span className="text-gray-700">3가지 시나리오 시뮬레이션</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✅</span>
              <span className="text-gray-700">과거 완료율 기반 개인화 예측</span>
            </div>
          </div>

          {/* 시작하기 버튼 */}
          <div className="pt-2">
            <button
              onClick={() => setShowPlanner(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors font-medium"
            >
              💡 스마트 플래너 시작하기
            </button>
          </div>
        </div>
      </div>

      {/* 스마트 용돈 플래너 모달 */}
      <SmartAllowancePlanner
        isOpen={showPlanner}
        onClose={() => setShowPlanner(false)}
      />
    </div>
  )
}