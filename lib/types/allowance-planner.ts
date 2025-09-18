export interface AllowanceRecommendation {
  grade: 'elementary' | 'middle'
  level: 1 | 2 | 3 | 4 | 5 | 6
  totalAmount: number
  distribution: {
    daily: number      // 비율 (%)
    event: number      // 비율 (%)
    streak: number     // 비율 (%)
  }
}

export interface PlannerSettings {
  childId: string
  monthlyBudget: number
  distribution: {
    dailyPercent: number
    eventPercent: number
    streakPercent: number
  }
  advanced: {
    streakTarget: number     // 연속 목표일
    eventFrequency: number   // 월 이벤트 횟수
  }
}

export interface SimulationScenario {
  type: 'excellent' | 'average' | 'poor'
  completionRate: number
  expectedEarnings: number
  title: string
  emoji: string
}

export interface ChildProfile {
  id: string
  name: string
  grade: 'elementary' | 'middle'
  level: 1 | 2 | 3 | 4 | 5 | 6
  pastCompletionRate?: number
}