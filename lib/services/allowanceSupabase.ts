/**
 * 💰 Supabase 기반 용돈 관리 서비스
 * 
 * 핵심 기능:
 * 1. 가족 관계 기반 데이터 공유 (부모 ↔ 자녀)
 * 2. Supabase 실시간 동기화
 * 3. RLS 정책 활용한 안전한 데이터 접근
 */

import { createClient } from '@/lib/supabase/client'
import { 
  AllowanceTransaction, 
  AllowanceBalance, 
  AllowanceStatistics,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES 
} from '../types/allowance'

export interface SupabaseTransaction {
  id: string
  user_id: string
  date: string
  amount: number
  type: 'income' | 'expense'
  category: string
  description: string
  created_at: string
}

export interface SupabaseProfile {
  id: string
  email: string
  full_name?: string
  user_type: 'parent' | 'child'
  parent_id?: string
  family_code?: string
}

export class AllowanceSupabaseService {
  private supabase = createClient()

  /**
   * 🔍 현재 사용자 정보 및 가족 관계 조회
   */
  async getCurrentUser(): Promise<{ user: unknown, profile: SupabaseProfile, childrenIds: string[] }> {
    const { data: { user }, error: userError } = await this.supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('사용자 정보를 가져올 수 없습니다.')
    }

    // 프로필 조회
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', (user as { id: string }).id)
      .single()

    if (profileError || !profile) {
      throw new Error('프로필 정보를 가져올 수 없습니다.')
    }

    // 자녀 목록 조회 (부모인 경우)
    let childrenIds: string[] = []
    if (profile.user_type === 'parent') {
      const { data: children } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('parent_id', (user as { id: string }).id)

      childrenIds = children?.map(child => child.id) || []
    }

    return { user, profile, childrenIds }
  }

  /**
   * 📊 가족 단위 거래 내역 조회 (부모는 자녀 포함, 자녀는 본인만)
   */
  async getFamilyTransactions(): Promise<AllowanceTransaction[]> {
    const { profile, childrenIds } = await this.getCurrentUser()
    
    let targetUserIds: string[]
    
    if (profile.user_type === 'parent') {
      // 부모: 본인 + 모든 자녀
      targetUserIds = [profile.id, ...childrenIds]
    } else {
      // 자녀: 본인만
      targetUserIds = [profile.id]
    }

    const { data: transactions, error } = await this.supabase
      .from('allowance_transactions')
      .select('*')
      .in('user_id', targetUserIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('거래 내역 조회 실패:', error)
      return []
    }

    // AllowanceTransaction 형식으로 변환
    return (transactions || []).map(this.convertSupabaseToTransaction)
  }

  /**
   * 💳 새 거래 추가 (현재 사용자 기준)
   */
  async addTransaction(transaction: Omit<AllowanceTransaction, 'id' | 'createdAt'>): Promise<string> {
    const { user } = await this.getCurrentUser()

    const { data, error } = await this.supabase
      .from('allowance_transactions')
      .insert({
        user_id: (user as { id: string }).id,
        date: transaction.date,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        description: transaction.description
      })
      .select('id')
      .single()

    if (error) {
      console.error('거래 추가 실패:', error)
      throw new Error('거래를 추가할 수 없습니다.')
    }

    console.log('✅ 거래 추가 성공:', data.id)
    return data.id
  }

  /**
   * ✏️ 거래 수정 (본인 거래만)
   */
  async updateTransaction(id: string, updates: Partial<AllowanceTransaction>): Promise<boolean> {
    const { user } = await this.getCurrentUser()

    const { error } = await this.supabase
      .from('allowance_transactions')
      .update({
        ...(updates.date && { date: updates.date }),
        ...(updates.amount && { amount: updates.amount }),
        ...(updates.type && { type: updates.type }),
        ...(updates.category && { category: updates.category }),
        ...(updates.description && { description: updates.description })
      })
      .eq('id', id)
      .eq('user_id', (user as { id: string }).id) // 본인 거래만 수정 가능

    if (error) {
      console.error('거래 수정 실패:', error)
      return false
    }

    console.log('✅ 거래 수정 성공:', id)
    return true
  }

  /**
   * 🗑️ 거래 삭제 (본인 거래만) - 미션 관련 거래 삭제 시 미션 상태 되돌리기
   */
  async deleteTransaction(id: string): Promise<boolean> {
    const { user } = await this.getCurrentUser()

    try {
      // 1. 삭제할 거래의 정보를 먼저 조회 (mission_id 확인용)
      const { data: transaction, error: fetchError } = await this.supabase
        .from('allowance_transactions')
        .select('mission_id, user_id')
        .eq('id', id)
        .eq('user_id', (user as { id: string }).id) // 본인 거래만 
        .single()

      if (fetchError) {
        console.error('거래 조회 실패:', fetchError)
        return false
      }

      // 2. 거래 삭제
      const { error: deleteError } = await this.supabase
        .from('allowance_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', (user as { id: string }).id)

      if (deleteError) {
        console.error('거래 삭제 실패:', deleteError)
        return false
      }

      // 3. 미션 관련 거래였다면 해당 미션을 미완료 상태로 되돌리기
      if (transaction?.mission_id) {
        await this.revertMissionFromTransaction(transaction.mission_id, transaction.user_id)
      }

      console.log('✅ 거래 삭제 성공:', id)
      return true
    } catch (error) {
      console.error('거래 삭제 중 오류:', error)
      return false
    }
  }

  /**
   * 🔄 미션 관련 거래 삭제 시 미션 상태 되돌리기
   */
  private async revertMissionFromTransaction(missionId: string, userId: string): Promise<void> {
    try {
      // missionSupabaseService를 직접 import해서 사용해야 함
      // 하지만 순환 참조를 피하기 위해 Supabase 클라이언트를 직접 사용
      const { error } = await this.supabase
        .from('mission_instances')
        .update({
          is_completed: false,
          completed_at: null,
          is_transferred: false // 전달 상태도 되돌리기
        })
        .eq('id', missionId)
        .eq('user_id', userId) // 보안을 위해 사용자 확인

      if (error) {
        console.error('미션 상태 되돌리기 실패:', error)
        throw new Error(`미션 상태 되돌리기 실패: ${missionId}`)
      }

      console.log('✅ 미션 상태 되돌리기 성공:', missionId)
    } catch (error) {
      console.error('미션 되돌리기 중 오류:', error)
      // 오류가 발생해도 거래 삭제는 이미 완료되었으므로 throw하지 않고 로그만 남김
    }
  }

  /**
   * 📅 날짜별 거래 내역 조회
   */
  async getTransactionsByDate(date: string): Promise<AllowanceTransaction[]> {
    const transactions = await this.getFamilyTransactions()
    return transactions.filter(t => t.date === date)
  }

  /**
   * 📊 기간별 거래 내역 조회
   */
  async getTransactionsInRange(startDate: string, endDate: string): Promise<AllowanceTransaction[]> {
    const transactions = await this.getFamilyTransactions()
    return transactions.filter(t => t.date >= startDate && t.date <= endDate)
  }

  /**
   * 💰 현재 잔액 계산 (가족 단위)
   */
  async getCurrentBalance(): Promise<number> {
    const transactions = await this.getFamilyTransactions()
    const today = new Date().toISOString().split('T')[0]

    const totalIncome = transactions
      .filter(t => t.type === 'income' && t.date <= today)
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter(t => t.type === 'expense' && t.date <= today)
      .reduce((sum, t) => sum + t.amount, 0)

    return totalIncome - totalExpense
  }

  /**
   * 📈 통계 정보 조회
   */
  async getStatistics(period: 'month' | 'all' = 'month'): Promise<AllowanceStatistics> {
    try {
      const now = new Date()
      const currentBalance = await this.getCurrentBalance()
      
      let transactions: AllowanceTransaction[]
      
      if (period === 'month') {
        const startDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`
        const endDate = now.toISOString().split('T')[0]
        transactions = await this.getTransactionsInRange(startDate, endDate)
      } else {
        transactions = await this.getFamilyTransactions()
      }

      const income = transactions.filter(t => t.type === 'income')
      const expenses = transactions.filter(t => t.type === 'expense')

      const totalIncome = income.reduce((sum, t) => sum + t.amount, 0)
      const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0)

      // 카테고리별 지출 통계
      const categoryStats = new Map<string, number>()
      expenses.forEach(t => {
        categoryStats.set(t.category, (categoryStats.get(t.category) || 0) + t.amount)
      })

      const topCategories = Array.from(categoryStats.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      // 최근 거래 내역
      const recentTransactions = transactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)

      return {
        currentBalance,
        totalIncome,
        totalExpense,
        monthlyIncome: period === 'month' ? totalIncome : income.filter(t => t.date.startsWith(`${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`)).reduce((sum, t) => sum + t.amount, 0),
        monthlyExpense: period === 'month' ? totalExpense : expenses.filter(t => t.date.startsWith(`${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`)).reduce((sum, t) => sum + t.amount, 0),
        topCategories,
        recentTransactions
      }
    } catch (error) {
      console.error('통계 조회 실패:', error)
      return {
        currentBalance: 0,
        totalIncome: 0,
        totalExpense: 0,
        monthlyIncome: 0,
        monthlyExpense: 0,
        topCategories: [],
        recentTransactions: []
      }
    }
  }

  /**
   * 🎯 미션 완료 시 자동 수입 추가 (현재 사용자)
   */
  async addMissionIncome(missionId: string, amount: number, missionTitle: string, date: string): Promise<string> {
    return await this.addTransaction({
      type: 'income',
      amount,
      description: `미션 완료: ${missionTitle}`,
      category: INCOME_CATEGORIES.MISSION,
      date,
      missionId
    })
  }

  /**
   * 💸 미션 승인 시 자녀 계정에 수입 추가 (특정 사용자 ID 지정)
   */
  async addMissionIncomeForUser(userId: string, missionId: string, amount: number, missionTitle: string, date: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('allowance_transactions')
      .insert({
        user_id: userId,
        date: date,
        amount: amount,
        type: 'income',
        category: INCOME_CATEGORIES.MISSION,
        description: `미션 완료: ${missionTitle}`,
        mission_id: missionId
      })
      .select('id')
      .single()

    if (error) {
      console.error('거래 추가 실패:', error)
      throw new Error('거래를 추가할 수 없습니다.')
    }

    console.log('✅ 자녀 계정에 미션 수입 추가 성공:', data.id)
    return data.id
  }

  /**
   * 🔄 미션 되돌리기 시 수입 제거
   */
  async removeMissionIncome(missionId: string): Promise<boolean> {
    try {
      const { user } = await this.getCurrentUser()
      
      const { data: missionTransaction, error } = await this.supabase
        .from('allowance_transactions')
        .select('id')
        .eq('user_id', (user as { id: string }).id)
        .eq('mission_id', missionId)
        .single()

      if (error || !missionTransaction) {
        return false
      }

      return await this.deleteTransaction(missionTransaction.id)
    } catch (error) {
      console.error('미션 수입 제거 실패:', error)
      return false
    }
  }

  /**
   * 🔧 Supabase 데이터를 앱 형식으로 변환
   */
  private convertSupabaseToTransaction(supabaseData: SupabaseTransaction): AllowanceTransaction {
    return {
      id: supabaseData.id,
      type: supabaseData.type,
      amount: supabaseData.amount,
      description: supabaseData.description,
      category: supabaseData.category,
      date: supabaseData.date,
      createdAt: supabaseData.created_at
    }
  }

  /**
   * 🎧 실시간 동기화 구독
   */
  subscribeToTransactions(callback: (payload: unknown) => void) {
    return this.supabase
      .channel('allowance_transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'allowance_transactions' },
        callback
      )
      .subscribe()
  }

  /**
   * 🧹 정리
   */
  cleanup() {
    console.log('🧹 AllowanceSupabaseService 정리 완료')
  }
}

// 싱글톤 인스턴스
export const allowanceSupabaseService = new AllowanceSupabaseService()
export default allowanceSupabaseService