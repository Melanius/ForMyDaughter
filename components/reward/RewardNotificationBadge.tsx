/**
 * 🔔 정산 알림 배지 컴포넌트
 */

'use client'

import { useEffect, useState } from 'react'
import { DollarSign, AlertTriangle, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import rewardService from '@/lib/services/rewardService'
import { RewardSummary } from '@/lib/types/reward'
import { isParentRole, isChildRole } from '@/lib/utils/roleUtils'

interface RewardNotificationBadgeProps {
  className?: string
}

export function RewardNotificationBadge({ className = '' }: RewardNotificationBadgeProps) {
  const { profile } = useAuth()
  const router = useRouter()
  const [summary, setSummary] = useState<RewardSummary>({
    totalPending: 0,
    totalAmount: 0,
    urgentCount: 0
  })
  const [isLoading, setIsLoading] = useState(false)

  // 정산 요약 정보 로드
  const loadRewardSummary = async () => {
    if (!profile?.id || profile.user_type !== 'parent') return

    setIsLoading(true)
    try {
      const summaryData = await rewardService.getRewardSummary(profile.id)
      setSummary(summaryData)
    } catch (error) {
      console.error('정산 요약 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 정산 센터로 이동 (임시로 비활성화)
  const handleClick = () => {
    alert('정산 센터 기능이 준비 중입니다.\n데이터베이스 마이그레이션이 필요합니다.')
    // router.push('/reward-center')
  }

  // 컴포넌트 마운트시 데이터 로드
  useEffect(() => {
    if (isParentRole(profile?.user_type)) {
      loadRewardSummary()
      
      // 5분마다 자동 새로고침
      const interval = setInterval(loadRewardSummary, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
    // 부모가 아닌 경우 빈 함수 반환
    return () => {}
  }, [profile])

  // 실시간 구독
  useEffect(() => {
    if (!profile?.id || profile.user_type !== 'parent') {
      return () => {}
    }

    const unsubscribe = rewardService.subscribeToMissionCompletions(
      profile.id,
      () => {
        // 새로운 미션 완료시 요약 정보 새로고침
        loadRewardSummary()
      }
    )

    return unsubscribe
  }, [profile])

  // 부모가 아니거나 정산할 미션이 없으면 렌더링하지 않음
  if (profile?.user_type !== 'parent' || summary.totalPending === 0) {
    return null
  }

  // 우선순위에 따른 스타일 결정
  const getStyle = () => {
    if (summary.urgentCount > 0) {
      return {
        bgColor: 'bg-red-500',
        textColor: 'text-white',
        icon: AlertTriangle,
        borderColor: 'border-red-200',
        hoverBg: 'hover:bg-red-600'
      }
    } else {
      return {
        bgColor: 'bg-orange-500',
        textColor: 'text-white', 
        icon: Clock,
        borderColor: 'border-orange-200',
        hoverBg: 'hover:bg-orange-600'
      }
    }
  }

  const style = getStyle()
  const IconComponent = style.icon

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        ${style.bgColor} ${style.textColor} ${style.hoverBg}
        border-2 ${style.borderColor}
        rounded-lg p-3 transition-all duration-200 shadow-sm hover:shadow-md
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <IconComponent className="w-5 h-5" />
          <span className="font-medium">정산 대기</span>
        </div>
        
        <div className="bg-white/20 rounded-full px-2 py-1">
          <span className="text-sm font-bold">
            {summary.totalPending}
          </span>
        </div>
      </div>
      
      <div className="text-xs mt-1 opacity-90">
        {summary.urgentCount > 0 ? (
          <>긴급 {summary.urgentCount}개 포함</>
        ) : (
          <>{summary.totalAmount.toLocaleString()}원</>
        )}
      </div>
    </button>
  )
}

// 간단한 배지 버전 (상단 네비게이션용)
export function RewardNotificationBadgeSimple() {
  const { profile } = useAuth()
  const router = useRouter()
  const [summary, setSummary] = useState<RewardSummary>({
    totalPending: 0,
    totalAmount: 0,
    urgentCount: 0
  })

  const loadRewardSummary = async () => {
    if (!profile?.id || profile.user_type !== 'parent') return

    try {
      const summaryData = await rewardService.getRewardSummary(profile.id)
      setSummary(summaryData)
    } catch (error) {
      console.error('정산 요약 로드 실패:', error)
    }
  }

  useEffect(() => {
    if (isParentRole(profile?.user_type)) {
      loadRewardSummary()
      
      const unsubscribe = rewardService.subscribeToMissionCompletions(
        profile.id,
        () => loadRewardSummary()
      )

      return unsubscribe
    }
    return () => {}
  }, [profile])

  if (profile?.user_type !== 'parent' || summary.totalPending === 0) {
    return null
  }

  return (
    <button
      onClick={() => alert('정산 센터 기능이 준비 중입니다.\n데이터베이스 마이그레이션이 필요합니다.')}
      className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      title={`정산 대기 중인 미션 ${summary.totalPending}개`}
    >
      <DollarSign className="w-6 h-6" />
      
      {/* 배지 */}
      <div className={`
        absolute -top-1 -right-1 min-w-[20px] h-5 
        flex items-center justify-center px-1 rounded-full text-xs font-bold text-white
        ${summary.urgentCount > 0 ? 'bg-red-500' : 'bg-orange-500'}
      `}>
        {summary.totalPending > 99 ? '99+' : summary.totalPending}
      </div>
    </button>
  )
}

export default RewardNotificationBadge