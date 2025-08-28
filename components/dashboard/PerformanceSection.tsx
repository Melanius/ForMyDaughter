'use client'

import { Mission } from '@/lib/types/mission'

interface PerformanceSectionProps {
  missions: Mission[]
}

export function PerformanceSection({ missions }: PerformanceSectionProps) {
  const completedMissions = missions.filter(m => m.isCompleted)
  const ongoingMissions = missions.filter(m => !m.isCompleted)
  const totalEarned = completedMissions.reduce((sum, m) => sum + m.reward, 0)

  const currentDate = new Date()
  const currentDay = currentDate.getDate()
  const currentMonth = currentDate.toLocaleDateString('ko-KR', { month: 'long', year: 'numeric' })
  const currentWeekday = currentDate.toLocaleDateString('ko-KR', { weekday: 'long' })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">성과</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-green-50 rounded-lg p-3">
            <span className="text-sm sm:text-base text-gray-700">
              완료<span className="hidden sm:inline">한 미션</span>
            </span>
            <span className="font-bold text-green-600">{completedMissions.length}개</span>
          </div>
          
          <div className="flex justify-between items-center bg-blue-50 rounded-lg p-3">
            <span className="text-sm sm:text-base text-gray-700">
              진행중<span className="hidden sm:inline">인 미션</span>
            </span>
            <span className="font-bold text-blue-600">{ongoingMissions.length}개</span>
          </div>
          
          <div className="flex justify-between items-center bg-yellow-50 rounded-lg p-3">
            <span className="text-sm sm:text-base text-gray-700">
              획득<span className="hidden sm:inline"> 금액</span>
            </span>
            <span className="font-bold text-green-600 text-sm sm:text-base">
              {totalEarned.toLocaleString()}원
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">오늘</h3>
        <div className="text-center bg-blue-50 rounded-lg p-4">
          <p className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">{currentDay}</p>
          <p className="text-sm sm:text-base text-gray-600">{currentMonth}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">{currentWeekday}</p>
        </div>
      </div>
    </div>
  )
}