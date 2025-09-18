import { AllowanceRecommendation, PlannerSettings, SimulationScenario, ChildProfile } from '@/lib/types/allowance-planner'

class AllowancePlannerService {
  private readonly recommendations = {
    elementary: {
      1: { total: 10000, daily: 60, event: 25, streak: 15 },
      2: { total: 12000, daily: 60, event: 25, streak: 15 },
      3: { total: 15000, daily: 55, event: 30, streak: 15 },
      4: { total: 18000, daily: 55, event: 30, streak: 15 },
      5: { total: 22000, daily: 50, event: 35, streak: 15 },
      6: { total: 25000, daily: 50, event: 35, streak: 15 }
    },
    middle: {
      1: { total: 30000, daily: 45, event: 40, streak: 15 },
      2: { total: 35000, daily: 45, event: 40, streak: 15 },
      3: { total: 40000, daily: 40, event: 45, streak: 15 }
    }
  } as const

  /**
   * 학년별 추천 용돈 및 배분 비율 가져오기
   */
  getRecommendation(grade: 'elementary' | 'middle', level: number): AllowanceRecommendation {
    const gradeRecommendations = this.recommendations[grade]
    const levelKey = Math.min(Math.max(level, 1), grade === 'elementary' ? 6 : 3) as keyof typeof gradeRecommendations
    const rec = gradeRecommendations[levelKey]

    return {
      grade,
      level: levelKey,
      totalAmount: rec.total,
      distribution: {
        daily: rec.daily,
        event: rec.event,
        streak: rec.streak
      }
    }
  }

  /**
   * 자녀 프로필 기반 스마트 추천
   */
  getSmartRecommendation(child: ChildProfile): AllowanceRecommendation {
    const baseRec = this.getRecommendation(child.grade, child.level)
    
    // 과거 완료율이 있다면 조정
    if (child.pastCompletionRate !== undefined) {
      const adjustmentFactor = Math.max(0.8, Math.min(1.2, child.pastCompletionRate))
      baseRec.totalAmount = Math.round(baseRec.totalAmount * adjustmentFactor / 1000) * 1000
    }

    return baseRec
  }

  /**
   * 월 예상 수익 시뮬레이션
   */
  simulateMonthlyEarnings(settings: PlannerSettings, completionRate: number): number {
    const { monthlyBudget, distribution } = settings
    
    // 기본 계산
    const dailyAmount = monthlyBudget * (distribution.dailyPercent / 100)
    const eventAmount = monthlyBudget * (distribution.eventPercent / 100)
    const streakAmount = monthlyBudget * (distribution.streakPercent / 100)
    
    // 완료율 적용
    const earnedDaily = dailyAmount * completionRate
    const earnedEvent = eventAmount * Math.min(completionRate * 1.2, 1) // 이벤트는 약간 높게
    const earnedStreak = streakAmount * (completionRate > 0.8 ? 1 : 0) // 80% 이상만 보너스
    
    return Math.round(earnedDaily + earnedEvent + earnedStreak)
  }

  /**
   * 3가지 시나리오 생성
   */
  generateScenarios(settings: PlannerSettings, childPastRate?: number): SimulationScenario[] {
    const scenarios: SimulationScenario[] = [
      {
        type: 'excellent',
        completionRate: 0.9,
        expectedEarnings: this.simulateMonthlyEarnings(settings, 0.9),
        title: '성실형',
        emoji: '🌟'
      },
      {
        type: 'average',
        completionRate: 0.7,
        expectedEarnings: this.simulateMonthlyEarnings(settings, 0.7),
        title: '평범형',
        emoji: '📚'
      },
      {
        type: 'poor',
        completionRate: 0.5,
        expectedEarnings: this.simulateMonthlyEarnings(settings, 0.5),
        title: '게으름형',
        emoji: '😴'
      }
    ]

    // 과거 완료율이 있다면 개인화된 예측 추가
    if (childPastRate !== undefined) {
      const personalizedEarnings = this.simulateMonthlyEarnings(settings, childPastRate)
      scenarios.push({
        type: 'average',
        completionRate: childPastRate,
        expectedEarnings: personalizedEarnings,
        title: '예상 수익',
        emoji: '💡'
      })
    }

    return scenarios
  }

  /**
   * 배분 비율 유효성 검사
   */
  validateDistribution(distribution: { dailyPercent: number, eventPercent: number, streakPercent: number }): boolean {
    const total = distribution.dailyPercent + distribution.eventPercent + distribution.streakPercent
    return Math.abs(total - 100) < 0.1 // 부동소수점 오차 허용
  }

  /**
   * 기본 설정 생성
   */
  createDefaultSettings(child: ChildProfile): PlannerSettings {
    const recommendation = this.getSmartRecommendation(child)
    
    return {
      childId: child.id,
      monthlyBudget: recommendation.totalAmount,
      distribution: {
        dailyPercent: recommendation.distribution.daily,
        eventPercent: recommendation.distribution.event,
        streakPercent: recommendation.distribution.streak
      },
      advanced: {
        streakTarget: 7,
        eventFrequency: 4
      }
    }
  }
}

export const allowancePlannerService = new AllowancePlannerService()
export default allowancePlannerService