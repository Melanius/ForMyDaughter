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
      .eq('id', user.id)
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
        .eq('parent_id', user.id)

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
        user_id: user.id,
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
      .eq('user_id', user.id) // 본인 거래만 수정 가능

    if (error) {
      console.error('거래 수정 실패:', error)
      return false
    }

    console.log('✅ 거래 수정 성공:', id)
    return true
  }

  /**
   * 🗑️ 거래 삭제 (본인 거래만)
   */
  async deleteTransaction(id: string): Promise<boolean> {
    const { user } = await this.getCurrentUser()

    const { error } = await this.supabase
      .from('allowance_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // 본인 거래만 삭제 가능

    if (error) {
      console.error('거래 삭제 실패:', error)
      return false
    }

    console.log('✅ 거래 삭제 성공:', id)
    return true
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
   * 🎯 미션 완료 시 자동 수입 추가
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
   * 🔄 미션 되돌리기 시 수입 제거
   */
  async removeMissionIncome(missionId: string): Promise<boolean> {
    try {
      const { user } = await this.getCurrentUser()
      
      const { data: missionTransaction, error } = await this.supabase
        .from('allowance_transactions')
        .select('id')
        .eq('user_id', user.id)
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