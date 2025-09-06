/**
 * 🎯 개별 미션 아이템 컴포넌트
 */

'use client'

import { CheckSquare, Square, Clock, DollarSign, AlertTriangle, Calendar } from 'lucide-react'
import { PendingRewardMission } from '@/lib/types/reward'

interface MissionItemProps {
  mission: PendingRewardMission
  isSelected: boolean
  onToggle: (missionId: string) => void
}

export function MissionItem({ mission, isSelected, onToggle }: MissionItemProps) {
  const {
    id,
    title,
    description,
    reward,
    category,
    completedAt,
    daysSinceCompletion,
    priority
  } = mission

  // 완료 시간 포맷팅
  const formatCompletedTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // 우선순위에 따른 스타일
  const getPriorityStyle = () => {
    if (priority === 'high') {
      return {
        border: 'border-red-200',
        bg: 'bg-red-50',
        badge: 'bg-red-100 text-red-800'
      }
    }
    return {
      border: 'border-gray-200',
      bg: 'bg-gray-50',
      badge: 'bg-gray-100 text-gray-700'
    }
  }

  const styles = getPriorityStyle()

  return (
    <div 
      className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
        isSelected 
          ? 'border-blue-300 bg-blue-50' 
          : `${styles.border} ${styles.bg}`
      }`}
      onClick={() => onToggle(id)}
    >
      <div className="flex items-start gap-3">
        {/* 선택 체크박스 */}
        <div className={`mt-0.5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
          {isSelected ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </div>

        {/* 미션 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* 미션 제목 */}
              <h4 className="font-medium text-gray-900 truncate">
                {title}
              </h4>

              {/* 미션 설명 */}
              {description && (
                <p className="text-sm text-gray-600 mt-1 truncate">
                  {description}
                </p>
              )}

              {/* 메타 정보 */}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className={`px-2 py-1 rounded-full ${styles.badge}`}>
                  {category}
                </span>
                
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatCompletedTime(completedAt)}
                </span>
                
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {daysSinceCompletion}일 전
                </span>
              </div>
            </div>

            {/* 보상 금액 */}
            <div className="flex flex-col items-end ml-3">
              <div className="flex items-center gap-1 text-green-600 font-semibold">
                <DollarSign className="w-4 h-4" />
                <span>{reward.toLocaleString()}</span>
              </div>

              {/* 긴급 표시 */}
              {priority === 'high' && (
                <div className="flex items-center gap-1 text-red-600 text-xs mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>긴급</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MissionItem