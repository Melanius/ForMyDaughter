/**
 * 📅 날짜별 미션 그룹 카드
 */

'use client'

import { useState } from 'react'
import { CheckSquare, Square, ChevronDown, ChevronUp, User, Clock, DollarSign, AlertTriangle } from 'lucide-react'
import { DateGroupedMissions } from '@/lib/types/reward'
import { MissionItem } from './MissionItem'

interface DateGroupCardProps {
  group: DateGroupedMissions
  selectedMissionIds: string[]
  onToggleMission: (missionId: string) => void
  onToggleDateSelection: (date: string) => void
}

export function DateGroupCard({
  group,
  selectedMissionIds,
  onToggleMission,
  onToggleDateSelection
}: DateGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  const { date, missions, totalAmount, childGroups } = group
  
  // 선택 상태 계산
  const missionIds = missions.map(m => m.id)
  const selectedCount = missionIds.filter(id => selectedMissionIds.includes(id)).length
  const isAllSelected = selectedCount === missions.length
  const isPartiallySelected = selectedCount > 0 && selectedCount < missions.length

  // 긴급 미션 수 계산
  const urgentCount = missions.filter(m => m.priority === 'high').length

  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const dateOnly = dateStr.split('T')[0]
    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    if (dateOnly === todayStr) return '오늘'
    if (dateOnly === yesterdayStr) return '어제'
    
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const dayName = dayNames[date.getDay()]
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    return `${month}월 ${day}일 (${dayName})`
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 전체 선택 체크박스 */}
            <button
              onClick={() => onToggleDateSelection(date)}
              className={`p-1 rounded ${
                isAllSelected 
                  ? 'text-blue-600' 
                  : isPartiallySelected 
                    ? 'text-blue-400' 
                    : 'text-gray-400 hover:text-gray-600'
              } transition-colors`}
            >
              {isAllSelected ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>

            {/* 날짜 정보 */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">
                  {formatDate(date)}
                </h3>
                {urgentCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                    <AlertTriangle className="w-3 h-3" />
                    긴급 {urgentCount}개
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {Object.keys(childGroups).length}명
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {missions.length}개 미션
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {totalAmount.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          {/* 선택 상태 및 확장/축소 */}
          <div className="flex items-center gap-3">
            {selectedCount > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {selectedCount}개 선택
              </span>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 미션 목록 */}
      {isExpanded && (
        <div className="divide-y divide-gray-100">
          {Object.entries(childGroups).map(([childName, childMissions]) => (
            <div key={childName} className="p-4">
              {/* 자녀 이름 */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">{childName}</span>
                <span className="text-sm text-gray-500">
                  {childMissions.length}개 미션
                </span>
              </div>

              {/* 미션 목록 */}
              <div className="ml-10 space-y-2">
                {childMissions.map(mission => (
                  <MissionItem
                    key={mission.id}
                    mission={mission}
                    isSelected={selectedMissionIds.includes(mission.id)}
                    onToggle={onToggleMission}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DateGroupCard