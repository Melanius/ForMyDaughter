import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export class StreakVerificationService {
  // 보너스 지급 내역 검증
  static async verifyBonusPayments(userId: string): Promise<{
    success: boolean
    message: string
    details: any
  }> {
    try {
      // 1. 보상 내역 조회
      const { data: rewardHistory, error: rewardError } = await supabase
        .from('reward_history')
        .select('*')
        .eq('user_id', userId)
        .eq('reward_type', 'streak_bonus')
        .order('created_at', { ascending: false })
        .limit(10)

      if (rewardError) {
        return {
          success: false,
          message: '보상 내역 조회 실패',
          details: rewardError
        }
      }

      // 2. 용돈 거래 내역 조회 (연속완료보너스)
      const { data: transactions, error: transactionError } = await supabase
        .from('allowance_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('category', '연속완료보너스')
        .order('created_at', { ascending: false })
        .limit(10)

      if (transactionError) {
        return {
          success: false,
          message: '거래 내역 조회 실패',
          details: transactionError
        }
      }

      // 3. 데이터 일관성 검증
      const totalRewardAmount = rewardHistory?.reduce((sum, reward) => sum + (reward.amount || 0), 0) || 0
      const totalTransactionAmount = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0

      const isConsistent = totalRewardAmount === totalTransactionAmount

      // 4. 사용자 진행상황 조회
      const { data: userProgress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single()

      return {
        success: true,
        message: isConsistent ? '✅ 보너스 지급 시스템이 정상적으로 작동합니다' : '⚠️ 데이터 불일치 발견',
        details: {
          isConsistent,
          rewardHistory: {
            count: rewardHistory?.length || 0,
            totalAmount: totalRewardAmount,
            recent: rewardHistory?.slice(0, 3) || []
          },
          transactions: {
            count: transactions?.length || 0,
            totalAmount: totalTransactionAmount,
            recent: transactions?.slice(0, 3) || []
          },
          userProgress: userProgress || null,
          analysis: {
            rewardTransactionMatch: isConsistent,
            recordedBonusEarned: userProgress?.total_streak_bonus_earned || 0,
            actualBonusEarned: totalRewardAmount
          }
        }
      }

    } catch (error) {
      return {
        success: false,
        message: '검증 과정에서 오류 발생',
        details: error
      }
    }
  }

  // 연속 완료 로직 검증
  static async verifyStreakLogic(userId: string): Promise<{
    success: boolean
    message: string
    details: any
  }> {
    try {
      // 현재 진행상황과 설정 조회
      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single()

      const { data: settings } = await supabase
        .from('reward_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!progress || !settings) {
        return {
          success: false,
          message: '사용자 데이터를 찾을 수 없습니다',
          details: { progress, settings }
        }
      }

      // 연속 완료 로직 검증
      const currentStreak = progress.streak_count
      const target = settings.streak_target
      const shouldHaveBonus = currentStreak > 0 && currentStreak % target === 0

      // 최근 보너스 지급 내역 확인
      const { data: recentReward } = await supabase
        .from('reward_history')
        .select('*')
        .eq('user_id', userId)
        .eq('reward_type', 'streak_bonus')
        .eq('trigger_value', currentStreak)
        .order('created_at', { ascending: false })
        .limit(1)

      return {
        success: true,
        message: '연속 완료 로직 검증 완료',
        details: {
          currentStreak,
          target,
          shouldHaveBonus,
          hasRecentBonus: !!recentReward?.[0],
          recentReward: recentReward?.[0] || null,
          progress,
          settings,
          validation: {
            streakLogicCorrect: shouldHaveBonus === !!recentReward?.[0],
            nextBonusAt: Math.ceil((currentStreak + 1) / target) * target,
            daysUntilBonus: target - (currentStreak % target)
          }
        }
      }

    } catch (error) {
      return {
        success: false,
        message: '검증 과정에서 오류 발생',
        details: error
      }
    }
  }

  // 종합 시스템 상태 검증
  static async getSystemStatus(userId: string): Promise<{
    success: boolean
    message: string
    bonusPayments: any
    streakLogic: any
    recommendations: string[]
  }> {
    const bonusVerification = await this.verifyBonusPayments(userId)
    const logicVerification = await this.verifyStreakLogic(userId)

    const recommendations: string[] = []

    if (!bonusVerification.details?.isConsistent) {
      recommendations.push('보상 내역과 거래 내역 불일치 - 데이터베이스 정합성 확인 필요')
    }

    if (!logicVerification.details?.validation?.streakLogicCorrect) {
      recommendations.push('연속 완료 로직과 보너스 지급 로직 불일치 - 로직 검토 필요')
    }

    if (bonusVerification.success && logicVerification.success && recommendations.length === 0) {
      recommendations.push('✅ 시스템이 정상적으로 작동 중입니다')
    }

    return {
      success: bonusVerification.success && logicVerification.success,
      message: recommendations.length > 0 ? recommendations[0] : '검증 완료',
      bonusPayments: bonusVerification,
      streakLogic: logicVerification,
      recommendations
    }
  }
}

export default StreakVerificationService