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
  // 연속 완료 카운터 업데이트 (개선된 로직)
  async updateStreak(userId: string, completionDate: string = getTodayKST()): Promise<StreakResult> {
    try {
      console.log(`🔧 연속 완료 업데이트 시작: 사용자 ${userId}, 날짜 ${completionDate}`)

      // 보상 설정 조회 (가족 단위)
      const settings = await this.getStreakSettings(userId)
      const isRewardEnabled = settings && settings.streak_enabled
      
      console.log(`⚙️ 보상 설정: ${isRewardEnabled ? '활성화' : '비활성화'}`)

      // 새로운 로직: 오늘부터 과거로 역추적하여 연속 완료일 계산
      const streakCount = await this.calculateStreakFromHistory(userId, completionDate)
      
      console.log(`📊 계산된 연속 완료일: ${streakCount}일`)

      // 이전 기록 조회
      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single()

      const bestStreak = Math.max(progress?.best_streak || 0, streakCount)
      const isNewRecord = streakCount > (progress?.best_streak || 0)
      
      // 보상 계산 (설정이 있을 때만)
      let bonusEarned = 0
      let shouldCelebrate = false
      
      if (isRewardEnabled && streakCount > 0 && streakCount % settings.streak_target === 0) {
        bonusEarned = settings.streak_bonus
        shouldCelebrate = true
        
        console.log(`🎉 연속 완료 달성: ${streakCount}일, 보상 ${bonusEarned}원`)
      }

      // 보상 내역 기록 (설정이 있고 축하할 때만)
      if (shouldCelebrate) {
        const { data: rewardData, error: rewardError } = await supabase
          .from('reward_history')
          .insert({
            user_id: userId,
            reward_type: 'streak_bonus_pending',
            amount: bonusEarned,
            trigger_value: streakCount,
            description: `${streakCount}일 미션 완료 보상 대기`
          })
          .select()

        if (rewardError) {
          console.error('보상 내역 기록 실패:', rewardError)
          // 보상 내역 기록 실패해도 축하는 표시 (사용자 경험 우선)
          console.warn('보상 내역 기록은 실패했지만 축하 모달은 표시됩니다')
        } else {
          console.log(`📝 보상 대기 기록 완료: 보상내역 ID ${rewardData?.[0]?.id}`)
        }
      }

      // 진행상황 업데이트
      const updateData = {
        user_id: userId,
        streak_count: streakCount,
        last_completion_date: completionDate,
        best_streak: bestStreak,
        total_missions_completed: (progress?.total_missions_completed || 0) + 1,
        total_streak_bonus_earned: progress?.total_streak_bonus_earned || 0 // 실제 수령 시에만 업데이트
      }

      await supabase
        .from('user_progress')
        .upsert(updateData)
        
      const result = {
        newStreak: streakCount,
        bonusEarned,
        isNewRecord,
        shouldCelebrate
      }
      
      console.log(`✅ 연속 완료 업데이트 완료:`, result)

      return result

    } catch (error) {
      console.error('연속 완료 업데이트 실패:', error)
      throw error
    }
  }

  // 연속 완료일 계산 (당신이 제안한 개선된 로직)
  // 오늘부터 과거로 역추적하여 연속으로 모든 미션을 완료한 날짜 수를 계산
  private async calculateStreakFromHistory(userId: string, targetDate: string): Promise<number> {
    try {
      console.log(`📊 연속 완료일 계산 시작: 사용자 ${userId}, 기준일 ${targetDate}`)
      
      let streakCount = 0
      let currentDate = new Date(targetDate + 'T00:00:00.000Z') // UTC 기준으로 파싱
      
      // 최대 365일까지만 확인 (무한 루프 방지)
      for (let day = 0; day < 365; day++) {
        const dateString = currentDate.toISOString().split('T')[0]
        
        console.log(`  📅 ${dateString} 확인 중...`)
        
        // 해당 날짜의 모든 미션 조회
        const { data: missions, error } = await supabase
          .from('mission_instances')
          .select('is_completed')
          .eq('user_id', userId)
          .eq('date', dateString)
        
        if (error) {
          console.error(`    ❌ 미션 조회 실패:`, error)
          break
        }

        // 미션이 없는 날은 연속 끊어짐
        if (!missions || missions.length === 0) {
          console.log(`    ⚠️ 미션 없음 - 연속 끊어짐`)
          break
        }

        // 모든 미션이 완료되었는지 확인
        const totalMissions = missions.length
        const completedMissions = missions.filter(m => m.is_completed).length
        const allCompleted = completedMissions === totalMissions
        
        console.log(`    📋 ${completedMissions}/${totalMissions} 완료 ${allCompleted ? '✅' : '❌'}`)
        
        if (allCompleted) {
          // 모든 미션 완료 → 연속일 증가
          streakCount++
          console.log(`    🔥 연속 ${streakCount}일!`)
        } else {
          // 미완료 미션 있음 → 연속 끊어짐
          console.log(`    💔 연속 끊어짐 (미완료 미션 있음)`)
          break
        }
        
        // 하루 이전으로 이동 (안전한 방법)
        currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000)
      }
      
      console.log(`🎯 최종 연속 완료일: ${streakCount}일`)
      return streakCount
      
    } catch (error) {
      console.error('연속 완료일 계산 실패:', error)
      return 0
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
          category: '미션완료',
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

  // 연속 완료 설정 조회 (가족 단위)
  async getStreakSettings(userId: string): Promise<StreakSettings | null> {
    try {
      console.log(`🔍 연속 완료 설정 조회 시작: 사용자 ${userId}`)
      
      // 1. 사용자의 가족 정보 조회
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('family_code, user_type')
        .eq('id', userId)
        .single()
        
      if (profileError || !userProfile) {
        console.error('🚫 사용자 프로필 조회 실패:', profileError)
        return null
      }
      
      if (!userProfile.family_code) {
        console.warn('⚠️ 사용자에게 family_code가 없음')
        return null
      }
      
      console.log(`👥 가족 정보: family_code=${userProfile.family_code}, user_type=${userProfile.user_type}`)
      
      // 2. 같은 가족의 부모 설정 조회 (father 또는 mother)
      const { data: familyProfiles, error: familyError } = await supabase
        .from('profiles')
        .select('id, user_type')
        .eq('family_code', userProfile.family_code)
        .in('user_type', ['father', 'mother'])
        
      if (familyError || !familyProfiles || familyProfiles.length === 0) {
        console.warn('⚠️ 가족에 부모가 없음 또는 조회 실패:', familyError)
        return null
      }
      
      // 3. 부모들의 설정 중 하나라도 있으면 사용 (father 우선)
      let parentSettings: any = null
      for (const parent of familyProfiles.sort((a, b) => a.user_type === 'father' ? -1 : 1)) {
        const { data, error } = await supabase
          .from('reward_settings')
          .select('*')
          .eq('user_id', parent.id)
          .single()
          
        if (!error && data) {
          parentSettings = data
          console.log(`✅ 부모 설정 발견: ${parent.user_type} (${parent.id})`, data)
          break
        }
      }
      
      if (!parentSettings) {
        console.warn('⚠️ 가족에 부모 설정이 없음 - 설정 필요')
        return null // 부모가 설정하지 않았으면 null 반환
      }
      
      // 4. 부모 설정을 현재 사용자 ID로 변경하여 반환
      const settings = {
        ...parentSettings,
        user_id: userId // 현재 사용자 ID로 변경
      }
      
      console.log(`🎯 최종 설정 반환:`, settings)
      return settings
      
    } catch (error) {
      console.warn('⚠️ 연속 완료 설정 조회 실패:', error)
      return null // 에러 시 null 반환하여 UI에서 안내 메시지 표시
    }
  }

  // 연속 완료 설정 업데이트 (부모 전용, 가족 단위 적용)
  async updateStreakSettings(userId: string, settings: Partial<StreakSettings>): Promise<void> {
    try {
      console.log(`🔧 연속 완료 설정 업데이트 시작: 사용자 ${userId}`)
      
      // 1. 부모 권한 확인
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('family_code, user_type, full_name')
        .eq('id', userId)
        .single()
        
      if (profileError || !userProfile) {
        throw new Error('사용자 프로필을 조회할 수 없습니다')
      }
      
      if (!['father', 'mother'].includes(userProfile.user_type || '')) {
        throw new Error('연속 완료 설정은 부모(father, mother)만 변경할 수 있습니다')
      }
      
      if (!userProfile.family_code) {
        throw new Error('가족 코드가 설정되지 않았습니다')
      }
      
      console.log(`👤 부모 권한 확인: ${userProfile.user_type} (${userProfile.full_name})`)
      
      // 2. 가족 구성원 조회
      const { data: familyMembers, error: familyError } = await supabase
        .from('profiles')
        .select('id, user_type, full_name')
        .eq('family_code', userProfile.family_code)
        
      if (familyError || !familyMembers) {
        throw new Error('가족 구성원을 조회할 수 없습니다')
      }
      
      console.log(`👥 가족 구성원 ${familyMembers.length}명:`, familyMembers.map(m => `${m.full_name}(${m.user_type})`))
      
      // 3. 모든 가족 구성원에게 설정 적용
      const updatePromises = familyMembers.map(member => 
        supabase
          .from('reward_settings')
          .upsert({
            user_id: member.id,
            ...settings,
            updated_at: nowKST()
          })
      )
      
      const results = await Promise.allSettled(updatePromises)
      
      // 4. 결과 확인
      const failed = results.filter(result => result.status === 'rejected')
      if (failed.length > 0) {
        console.error('일부 구성원 설정 업데이트 실패:', failed)
        throw new Error(`${failed.length}명의 설정 업데이트에 실패했습니다`)
      }
      
      console.log(`✅ 가족 구성원 ${familyMembers.length}명 설정 업데이트 완료`)
      
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

  // 수동 보상 수령 (자녀가 "받기" 버튼을 눌렀을 때)
  async claimManualReward(userId: string, amount: number, streakCount: number, completionDate: string = getTodayKST()): Promise<void> {
    try {
      console.log(`🎁 수동 보상 수령 시작: ${userId}, ${amount}원, ${streakCount}일 연속`)

      // 1. 보상 내역 기록
      const { data: rewardData, error: rewardError } = await supabase
        .from('reward_history')
        .insert({
          user_id: userId,
          reward_type: 'streak_bonus_claimed',
          amount: amount,
          trigger_value: streakCount,
          description: `${streakCount}일 미션 완료 보상 수령`
        })
        .select()

      if (rewardError) {
        console.error('보상 내역 기록 실패:', rewardError)
        throw rewardError
      }

      // 2. 용돈 거래 내역에 추가
      const { data: transactionData, error: transactionError } = await supabase
        .from('allowance_transactions')
        .insert({
          user_id: userId,
          date: completionDate,
          amount: amount,
          type: 'income',
          category: '미션완료',
          description: `${streakCount}일 미션 완료`
        })
        .select()

      if (transactionError) {
        console.error('용돈 거래 추가 실패:', transactionError)
        throw transactionError
      }

      // 3. 사용자 진행상황의 보상 총합 업데이트
      const { data: currentProgress } = await supabase
        .from('user_progress')
        .select('total_streak_bonus_earned')
        .eq('user_id', userId)
        .single()

      const newTotal = (currentProgress?.total_streak_bonus_earned || 0) + amount

      await supabase
        .from('user_progress')
        .update({ 
          total_streak_bonus_earned: newTotal,
          updated_at: nowKST()
        })
        .eq('user_id', userId)

      console.log(`✅ 수동 보상 수령 완료: 보상내역 ID ${rewardData?.[0]?.id}, 용돈거래 ID ${transactionData?.[0]?.id}, 총 보상금액: ${newTotal}원`)

    } catch (error) {
      console.error('수동 보상 수령 실패:', error)
      throw error
    }
  }

  // 연속 완료 미션 생성 (설정 활성화 시 자동 생성)
  async createStreakMission(userId: string, targetDate: string = getTodayKST()): Promise<void> {
    try {
      console.log(`🎯 연속 완료 미션 생성 시작: 사용자 ${userId}, 날짜 ${targetDate}`)

      // 1. 연속 완료 설정 조회
      const settings = await this.getStreakSettings(userId)
      if (!settings || !settings.streak_enabled) {
        console.log('⚠️ 연속 완료 설정이 비활성화되어 있음 - 미션 생성 안함')
        return
      }

      // 2. 이미 연속 완료 미션이 있는지 확인
      const { data: existingMission, error: checkError } = await supabase
        .from('mission_instances')
        .select('id')
        .eq('user_id', userId)
        .eq('date', targetDate)
        .eq('title', '연속 완료 도전')
        .single()

      if (!checkError && existingMission) {
        console.log('✅ 이미 연속 완료 미션이 존재함 - 생성 생략')
        return
      }

      // 3. 사용자 정보 조회
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, user_type')
        .eq('id', userId)
        .single()

      if (profileError || !profile) {
        throw new Error('사용자 정보를 조회할 수 없습니다')
      }

      // 4. 연속 완료 미션 생성
      const { data: missionData, error: missionError } = await supabase
        .from('mission_instances')
        .insert({
          user_id: userId,
          title: '연속 완료 도전',
          description: `${settings.streak_target}일 연속 완료하면 ${settings.streak_bonus.toLocaleString()}원 보상!`,
          reward_amount: settings.streak_bonus,
          date: targetDate,
          is_completed: false,
          mission_type: 'streak',
          created_at: nowKST(),
          updated_at: nowKST()
        })
        .select()

      if (missionError) {
        console.error('연속 완료 미션 생성 실패:', missionError)
        throw missionError
      }

      console.log(`✅ 연속 완료 미션 생성 완료: ID ${missionData?.[0]?.id}`)
      console.log(`   - 목표: ${settings.streak_target}일 연속`)
      console.log(`   - 보상: ${settings.streak_bonus}원`)

    } catch (error) {
      console.error('연속 완료 미션 생성 실패:', error)
      throw error
    }
  }

  // 가족 모든 구성원에게 연속 완료 미션 생성
  async createStreakMissionsForFamily(parentUserId: string, targetDate: string = getTodayKST()): Promise<void> {
    try {
      console.log(`👥 가족 연속 완료 미션 생성 시작: 부모 ${parentUserId}`)

      // 1. 부모의 가족 코드 조회
      const { data: parentProfile, error: parentError } = await supabase
        .from('profiles')
        .select('family_code, user_type')
        .eq('id', parentUserId)
        .single()

      if (parentError || !parentProfile) {
        throw new Error('부모 정보를 조회할 수 없습니다')
      }

      if (!['father', 'mother'].includes(parentProfile.user_type || '')) {
        throw new Error('연속 완료 미션은 부모만 생성할 수 있습니다')
      }

      if (!parentProfile.family_code) {
        throw new Error('가족 코드가 설정되지 않았습니다')
      }

      // 2. 가족 구성원 조회 (자녀만)
      const { data: familyMembers, error: familyError } = await supabase
        .from('profiles')
        .select('id, full_name, user_type')
        .eq('family_code', parentProfile.family_code)
        .in('user_type', ['son', 'daughter'])

      if (familyError) {
        throw new Error('가족 구성원을 조회할 수 없습니다')
      }

      if (!familyMembers || familyMembers.length === 0) {
        console.log('⚠️ 가족에 자녀가 없음 - 미션 생성 안함')
        return
      }

      console.log(`👨‍👩‍👧‍👦 자녀 ${familyMembers.length}명에게 연속 완료 미션 생성`)

      // 3. 각 자녀에게 연속 완료 미션 생성
      const createPromises = familyMembers.map(child => 
        this.createStreakMission(child.id, targetDate)
      )

      const results = await Promise.allSettled(createPromises)

      // 4. 결과 확인
      const failed = results.filter(result => result.status === 'rejected')
      if (failed.length > 0) {
        console.error('일부 자녀 미션 생성 실패:', failed)
        throw new Error(`${failed.length}명의 연속 완료 미션 생성에 실패했습니다`)
      }

      console.log(`✅ 가족 구성원 ${familyMembers.length}명 연속 완료 미션 생성 완료`)

    } catch (error) {
      console.error('가족 연속 완료 미션 생성 실패:', error)
      throw error
    }
  }
}

export default new StreakService()