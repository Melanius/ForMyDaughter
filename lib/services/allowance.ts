import { 
  AllowanceTransaction, 
  AllowanceBalance, 
  AllowanceStatistics,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES 
} from '../types/allowance'
import databaseService from './database'

export class AllowanceService {
  // 거래 내역 추가
  async addTransaction(transaction: Omit<AllowanceTransaction, 'id' | 'createdAt'>): Promise<string> {
    try {
      const transactionId = await databaseService.createTransaction(transaction)
      
      // 잔액 업데이트
      await this.updateBalanceForDate(transaction.date)
      
      return transactionId
    } catch (error) {
      console.error('Failed to add transaction:', error)
      throw error
    }
  }

  // 미션 완료 시 자동 수입 추가
  async addMissionIncome(missionId: string, amount: number, missionTitle: string, date: string): Promise<string> {
    const transaction = {
      type: 'income' as const,
      amount,
      description: `미션 완료: ${missionTitle}`,
      category: INCOME_CATEGORIES.MISSION,
      date,
      missionId
    }
    
    return await this.addTransaction(transaction)
  }

  // 미션 되돌리기 시 수입 제거
  async removeMissionIncome(missionId: string): Promise<boolean> {
    try {
      const allTransactions = await databaseService.getAllTransactions()
      const missionTransaction = allTransactions.find(t => t.missionId === missionId)
      
      if (missionTransaction) {
        await databaseService.deleteTransaction(missionTransaction.id)
        await this.updateBalanceForDate(missionTransaction.date)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to remove mission income:', error)
      return false
    }
  }

  // 거래 내역 수정
  async updateTransaction(id: string, updates: Partial<AllowanceTransaction>): Promise<boolean> {
    try {
      const original = await databaseService.getTransaction(id)
      if (!original) return false

      await databaseService.updateTransaction(id, updates)
      
      // 원래 날짜와 새 날짜 모두 잔액 업데이트
      await this.updateBalanceForDate(original.date)
      if (updates.date && updates.date !== original.date) {
        await this.updateBalanceForDate(updates.date)
      }
      
      return true
    } catch (error) {
      console.error('Failed to update transaction:', error)
      return false
    }
  }

  // 거래 내역 삭제
  async deleteTransaction(id: string): Promise<boolean> {
    try {
      const transaction = await databaseService.getTransaction(id)
      if (!transaction) return false

      await databaseService.deleteTransaction(id)
      await this.updateBalanceForDate(transaction.date)
      
      return true
    } catch (error) {
      console.error('Failed to delete transaction:', error)
      return false
    }
  }

  // 날짜별 거래 내역 조회
  async getTransactionsByDate(date: string): Promise<AllowanceTransaction[]> {
    try {
      const transactions = await databaseService.getTransactionsByDate(date)
      return transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      console.error('Failed to get transactions by date:', error)
      return []
    }
  }

  // 기간별 거래 내역 조회
  async getTransactionsInRange(startDate: string, endDate: string): Promise<AllowanceTransaction[]> {
    try {
      const allTransactions = await databaseService.getAllTransactions()
      return allTransactions
        .filter(t => t.date >= startDate && t.date <= endDate)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      console.error('Failed to get transactions in range:', error)
      return []
    }
  }

  // 현재 잔액 계산
  async getCurrentBalance(): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const allTransactions = await databaseService.getAllTransactions()
      
      const totalIncome = allTransactions
        .filter(t => t.type === 'income' && t.date <= today)
        .reduce((sum, t) => sum + t.amount, 0)
      
      const totalExpense = allTransactions
        .filter(t => t.type === 'expense' && t.date <= today)
        .reduce((sum, t) => sum + t.amount, 0)
      
      return totalIncome - totalExpense
    } catch (error) {
      console.error('Failed to calculate current balance:', error)
      return 0
    }
  }

  // 특정 날짜의 잔액 업데이트
  async updateBalanceForDate(date: string): Promise<void> {
    try {
      const allTransactions = await databaseService.getAllTransactions()
      
      // 해당 날짜까지의 모든 거래 계산
      const transactionsUntilDate = allTransactions.filter(t => t.date <= date)
      const dailyTransactions = allTransactions.filter(t => t.date === date)
      
      const totalIncome = transactionsUntilDate
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)
      
      const totalExpense = transactionsUntilDate
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
      
      const dailyIncome = dailyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)
      
      const dailyExpense = dailyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      const balance: AllowanceBalance = {
        id: date,
        date,
        balance: totalIncome - totalExpense,
        totalIncome,
        totalExpense,
        dailyIncome,
        dailyExpense,
        lastUpdated: new Date().toISOString()
      }

      await databaseService.updateBalance(balance)
    } catch (error) {
      console.error('Failed to update balance for date:', error)
    }
  }

  // 통계 정보 조회
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
        transactions = await databaseService.getAllTransactions()
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
      console.error('Failed to get statistics:', error)
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

  // 초기 잔액 설정 (마이그레이션 시 사용)
  async initializeBalance(initialAmount: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // 초기 잔액을 수입으로 기록
      await this.addTransaction({
        type: 'income',
        amount: initialAmount,
        description: '초기 용돈',
        category: INCOME_CATEGORIES.ALLOWANCE,
        date: today
      })
    } catch (error) {
      console.error('Failed to initialize balance:', error)
    }
  }
}

// 싱글톤 인스턴스
export const allowanceService = new AllowanceService()
export default allowanceService