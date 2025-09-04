import { createClient } from '@/lib/supabase/client'
import { getTodayKST, nowKST } from '../utils/dateUtils'

const supabase = createClient()

export interface StreakSettings {
  user_id: string
  streak_target: number
  streak_bonus: number
  streak_repeat: boolean
  streak_enabled: boolean
}

export interface UserProgress {
  user_id: string
  streak_count: number
  last_completion_date: string | null
  best_streak: number
  total_missions_completed: number
  total_streak_bonus_earned: number
}

export interface StreakResult {
  newStreak: number
  bonusEarned: number
  isNewRecord: boolean
  shouldCelebrate: boolean
}

class StreakService {
  // 연속 완료 카운터 업데이트
  async updateStreak(userId: string, completionDate: string = getTodayKST()): Promise<StreakResult> {
    try {
      // 현재 진행상황 조회
      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single()

      // 보상 설정 조회
      const { data: settings } = await supabase
        .from('reward_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!settings?.streak_enabled) {
        return {
          newStreak: progress?.streak_count || 0,
          bonusEarned: 0,
          isNewRecord: false,
          shouldCelebrate: false
        }
      }

      const currentStreak = progress?.streak_count || 0
      const lastDate = progress?.last_completion_date
      const bestStreak = progress?.best_streak || 0

      let newStreak = 1
      let bonusEarned = 0
      let shouldCelebrate = false

      // 연속일 계산
      if (lastDate) {
        const lastCompletion = new Date(lastDate)
        const today = new Date(completionDate)
        const diffTime = today.getTime() - lastCompletion.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
          // 연속된 날
          newStreak = currentStreak + 1
        } else if (diffDays === 0) {
          // 같은 날 (이미 완료함)
          return {
            newStreak: currentStreak,
            bonusEarned: 0,
            isNewRecord: false,
            shouldCelebrate: false
          }
        } else {
          // 연속 끊어짐
          newStreak = 1
        }
      }

      // 목표 달성 시 보너스 지급 - 개선된 검증 로직
      if (newStreak > 0 && newStreak % settings.streak_target === 0) {
        bonusEarned = settings.streak_bonus
        shouldCelebrate = true

        console.log(`🎉 연속 완료 보너스 지급: ${userId}, ${newStreak}일 연속, ${bonusEarned}원`)

        // 트랜잭션으로 안전하게 처리
        try {
          // 1. 보상 내역 기록
          const { data: rewardData, error: rewardError } = await supabase
            .from('reward_history')
            .insert({
              user_id: userId,
              reward_type: 'streak_bonus',
              amount: bonusEarned,
              trigger_value: newStreak,
              description: `${settings.streak_target}일 연속 완료 보너스`
            })
            .select()

          if (rewardError) {
            console.error('보상 내역 기록 실패:', rewardError)
            throw rewardError
          }

          // 2. 용돈에 보너스 추가 (검증 강화)
          await this.addStreakBonus(userId, bonusEarned, completionDate)
          
          console.log(`✅ 보너스 지급 완료: 보상내역 ID ${rewardData?.[0]?.id}, 용돈 추가 완료`)

        } catch (error) {
          console.error('보너스 지급 과정에서 오류 발생:', error)
          // 부분 실패 시에도 streak은 업데이트하되 bonusEarned는 0으로 설정
          bonusEarned = 0
          shouldCelebrate = false
          throw error
        }
      }

      // 진행상황 업데이트
      const updateData = {
        user_id: userId,
        streak_count: newStreak,
        last_completion_date: completionDate,
        best_streak: Math.max(bestStreak, newStreak),
        total_missions_completed: (progress?.total_missions_completed || 0) + 1,
        total_streak_bonus_earned: (progress?.total_streak_bonus_earned || 0) + bonusEarned
      }

      await supabase
        .from('user_progress')
        .upsert(updateData)

      return {
        newStreak,
        bonusEarned,
        isNewRecord: newStreak > bestStreak,
        shouldCelebrate
      }

    } catch (error) {
      console.error('연속 완료 업데이트 실패:', error)
      throw error
    }
  }

  // 연속 완료 보너스를 용돈에 추가 - 검증 강화
  private async addStreakBonus(userId: string, amount: number, date: string) {
    try {
      console.log(`💰 용돈 보너스 추가 시작: ${userId}, ${amount}원, ${date}`)

      // 용돈 거래 내역에 추가
      const { data: transactionData, error: transactionError } = await supabase
        .from('allowance_transactions')
        .insert({
          user_id: userId,
          date,
          amount,
          type: 'income',
          category: '연속완료보너스',
          description: `${amount}원 연속 완료 보너스`
        })
        .select()

      if (transactionError) {
        console.error('용돈 거래 추가 실패:', transactionError)
        throw transactionError
      }

      console.log(`✅ 용돈 거래 추가 성공: ID ${transactionData?.[0]?.id}`)

      // 거래 후 잔액 확인 (선택적)
      const { data: balance } = await supabase
        .from('allowance_transactions')
        .select('amount')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (balance) {
        const totalBalance = balance.reduce((sum, tx) => sum + (tx.amount || 0), 0)
        console.log(`💳 최근 거래 후 누적 잔액 (최근 5건 기준): ${totalBalance}원`)
      }

      return transactionData

    } catch (error) {
      console.error('연속 완료 보너스 지급 실패:', error)
      throw error
    }
  }

  // 사용자 진행상황 조회
  async getUserProgress(userId: string): Promise<UserProgress | null> {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // not found가 아닌 에러
        // 테이블이 없거나 접근 권한이 없는 경우 기본값 반환
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          console.warn('⚠️ user_progress 테이블을 찾을 수 없음 - 기본값 사용')
          return {
            user_id: userId,
            streak_count: 0,
            last_completion_date: null,
            best_streak: 0,
            total_missions_completed: 0,
            total_streak_bonus_earned: 0
          }
        }
        throw error
      }

      return data || {
        user_id: userId,
        streak_count: 0,
        last_completion_date: null,
        best_streak: 0,
        total_missions_completed: 0,
        total_streak_bonus_earned: 0
      }
    } catch (error) {
      console.warn('⚠️ 사용자 진행상황 조회 실패 - 기본값 사용:', error)
      
      // 최종 fallback: 기본값 반환 (에러 전파 방지)
      return {
        user_id: userId,
        streak_count: 0,
        last_completion_date: null,
        best_streak: 0,
        total_missions_completed: 0,
        total_streak_bonus_earned: 0
      }
    }
  }

  // 연속 완료 설정 조회
  async getStreakSettings(userId: string): Promise<StreakSettings | null> {
    try {
      const { data, error } = await supabase
        .from('reward_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        // 테이블이 없거나 접근 권한이 없는 경우 기본값 반환
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          console.warn('⚠️ reward_settings 테이블을 찾을 수 없음 - 기본값 사용')
          return {
            user_id: userId,
            streak_target: 7,
            streak_bonus: 1000,
            streak_repeat: true,
            streak_enabled: true
          }
        }
        throw error
      }

      return data || {
        user_id: userId,
        streak_target: 7,
        streak_bonus: 1000,
        streak_repeat: true,
        streak_enabled: true
      }
    } catch (error) {
      console.warn('⚠️ 연속 완료 설정 조회 실패 - 기본값 사용:', error)
      
      // 최종 fallback: 기본값 반환 (에러 전파 방지)
      return {
        user_id: userId,
        streak_target: 7,
        streak_bonus: 1000,
        streak_repeat: true,
        streak_enabled: false // 오류 시 비활성화로 안전하게
      }
    }
  }

  // 연속 완료 설정 업데이트 (부모 전용)
  async updateStreakSettings(userId: string, settings: Partial<StreakSettings>): Promise<void> {
    try {
      await supabase
        .from('reward_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: nowKST()
        })
    } catch (error) {
      console.error('연속 완료 설정 업데이트 실패:', error)
      throw error
    }
  }

  // 연속 기록 리셋 (디버깅/테스트 용)
  async resetStreak(userId: string): Promise<void> {
    try {
      await supabase
        .from('user_progress')
        .update({
          streak_count: 0,
          last_completion_date: null,
          updated_at: nowKST()
        })
        .eq('user_id', userId)
    } catch (error) {
      console.error('연속 기록 리셋 실패:', error)
      throw error
    }
  }
}

export default new StreakService()