'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Wallet, Filter, BarChart3 } from 'lucide-react'
import { AllowanceTransaction, AllowanceStatistics, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../../lib/types/allowance'
import allowanceSupabaseService from '../../lib/services/allowanceSupabase'
import enhancedSyncService from '../../lib/services/enhancedSync'
import { useAuth } from '../../components/auth/AuthProvider'
import { getTodayKST } from '@/lib/utils/dateUtils'

// Lazy loading을 일시적으로 비활성화하고 직접 import
import AddTransactionModal from '../../components/allowance/AddTransactionModal'
import AnalyticsModal from '../../components/allowance/AnalyticsModal'
import FilterModal, { FilterOption } from '../../components/allowance/FilterModal'
import { FloatingActionButton } from '../../components/ui/FloatingActionButton'

export default function AllowancePage() {
  const { profile } = useAuth()
  const [transactions, setTransactions] = useState<AllowanceTransaction[]>([])
  const [statistics, setStatistics] = useState<AllowanceStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [currentFilter, setCurrentFilter] = useState<FilterOption>({ type: 'this_month' })
  const [allTransactions, setAllTransactions] = useState<AllowanceTransaction[]>([])
  const [editingTransaction, setEditingTransaction] = useState<AllowanceTransaction | null>(null)

  // 현재 월 계산 (KST 기준)
  const currentMonth = useMemo(() => {
    const today = new Date()
    return today.getMonth() + 1
  }, [])

  // 데이터 로딩
  const loadData = useCallback(async () => {
    if (!profile?.id) return

    try {
      setLoading(true)
      
      // 현재 월의 시작과 끝 날짜 계산
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      
      console.log('📊 지갑 데이터 로딩 시작:', { userId: profile.id, startDate, endDate })

      // 병렬로 데이터 로딩
      const [transactionsResult, statisticsResult] = await Promise.all([
        allowanceSupabaseService.getFamilyTransactions(),
        allowanceSupabaseService.getStatistics()
      ])

      console.log('📊 지갑 데이터 로딩 완료:', {
        transactions: transactionsResult.length,
        statistics: statisticsResult
      })

      setAllTransactions(transactionsResult)
      // 통계는 자동으로 계산됨 (filteredStatistics useMemo로)
    } catch (error) {
      console.error('❌ 지갑 데이터 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  // 필터링된 거래 내역 계산 (Memoized for performance)
  const filteredTransactions = useMemo(() => {
    if (!currentFilter.startDate || !currentFilter.endDate || allTransactions.length === 0) {
      return allTransactions
    }
    
    return allTransactions.filter(transaction => {
      const transactionDate = transaction.date
      return transactionDate >= currentFilter.startDate! && transactionDate <= currentFilter.endDate!
    })
  }, [allTransactions, currentFilter.startDate, currentFilter.endDate])

  // 필터링된 데이터로 통계 계산 (Memoized for performance)
  const filteredStatistics = useMemo(() => {
    let income = 0
    let expense = 0
    
    // 하나의 루프로 최적화
    filteredTransactions.forEach(transaction => {
      if (transaction.type === 'income') {
        income += transaction.amount
      } else {
        expense += transaction.amount
      }
    })
    
    return {
      currentBalance: income - expense,
      monthlyIncome: income,
      monthlyExpense: expense
    }
  }, [filteredTransactions])

  // 현재 표시될 거래 내역 및 통계
  const displayedTransactions = filteredTransactions
  const displayedStatistics = filteredStatistics

  // 초기 데이터 로딩
  useEffect(() => {
    loadData()
  }, [loadData])

  // 동기화 설정
  useEffect(() => {
    if (!profile?.id) return

    console.log('🔄 지갑 페이지 동기화 구독 시작')

    const unsubscribe = enhancedSyncService.subscribe({
      onUpdate: (payload) => {
        if (payload.type === 'allowance_update') {
          console.log('⚡ 용돈 업데이트 수신:', payload)
          loadData() // 데이터 새로고침
        }
      }
    })

    return () => {
      console.log('🔇 지갑 페이지 동기화 구독 해제')
      unsubscribe()
    }
  }, [profile?.id, loadData])

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 p-8">
        <div className="max-w-4xl mx-auto text-center pt-20">
          <div className="text-7xl mb-6 animate-bounce">💰</div>
          <p className="text-gray-700 text-xl font-medium mb-2">용돈 내역을 불러오는 중...</p>
          <p className="text-gray-500 text-sm">잠시만 기다려주세요 😊</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
        <div className="p-4 sm:p-8 pb-20 md:pb-8">
          <div className="max-w-4xl mx-auto">
            
            {/* 페이지 헤더 */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center space-x-2">
                <span className="text-3xl">💰</span>
                <span>나의 용돈 관리</span>
                <span className="text-3xl">🎯</span>
              </h1>
              <p className="text-gray-600 text-sm">똑똑하게 용돈을 관리하고 저축 습관을 길러보세요!</p>
            </div>
            
            {/* 통계 카드들 */}
            {displayedStatistics && (
              <div className="mb-8">
                {/* 현재 잔액 - 상단 전체 너비 */}
                <div className="bg-white rounded-lg shadow p-6 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">현재 잔액</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {displayedStatistics.currentBalance.toLocaleString()}원
                      </p>
                    </div>
                    <Wallet className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                
                {/* 받은 돈/쓴 돈 - 2열 배치 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-green-700 font-semibold mb-1">{currentMonth}월 받은 돈</p>
                        <p className="text-lg font-bold text-green-600">
                          {displayedStatistics.monthlyIncome.toLocaleString()}원
                        </p>
                      </div>
                      <div className="ml-2">
                        <span className="text-lg">💰</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-pink-700 font-semibold mb-1">{currentMonth}월 쓴 돈</p>
                        <p className="text-lg font-bold text-pink-600">
                          {displayedStatistics.monthlyExpense.toLocaleString()}원
                        </p>
                      </div>
                      <div className="ml-2">
                        <span className="text-lg">💸</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 거래 내역 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                    <span>📝</span>
                    <span>용돈기입장</span>
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowAnalytics(true)}
                      className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center"
                      title="분석"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowFilterModal(true)}
                      className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                      title="필터"
                    >
                      <Filter className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {displayedTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-8xl mb-6">🐷</div>
                    <p className="text-gray-700 text-lg font-medium mb-2">아직 거래 내역이 없어요!</p>
                    <p className="text-gray-500 mb-6">오른쪽 아래 + 버튼을 눌러서 첫 거래를 기록해보세요 🚀</p>
                    <div className="bg-yellow-100 border-2 border-yellow-300 rounded-xl p-4 mx-auto max-w-sm">
                      <p className="text-yellow-800 text-sm font-medium">💡 팁: 용돈을 받거나 사용할 때마다 기록해보세요!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-colors shadow-sm">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                            transaction.type === 'income' ? 'bg-green-100' : 'bg-pink-100'
                          }`}>
                            {transaction.type === 'income' ? '💰' : '💸'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-base">{transaction.description}</p>
                            <p className="text-sm text-gray-600 mt-1">{transaction.category}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className={`font-bold text-lg ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-pink-600'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}
                            {transaction.amount.toLocaleString()}원
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{transaction.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 거래 추가 모달 */}
      {showAddModal && (
        <AddTransactionModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false)
            setEditingTransaction(null)
          }}
          onAdd={async (transaction) => {
            try {
              if (editingTransaction) {
                await allowanceSupabaseService.updateTransaction(editingTransaction.id, transaction)
              } else {
                await allowanceSupabaseService.addTransaction(transaction)
              }
              await loadData()
              setShowAddModal(false)
              setEditingTransaction(null)
            } catch (error) {
              console.error('거래 처리 실패:', error)
              alert('거래 처리에 실패했습니다. 다시 시도해주세요.')
            }
          }}
          editingTransaction={editingTransaction}
        />
      )}

      {/* 분석 모달 */}
      {displayedStatistics && (
        <AnalyticsModal
          isOpen={showAnalytics}
          onClose={() => setShowAnalytics(false)}
          statistics={displayedStatistics}
        />
      )}

      {/* 필터 모달 */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilter={(filter) => {
          setCurrentFilter(filter)
        }}
      />

      {/* 플로팅 액션 버튼 */}
      <FloatingActionButton onClick={() => setShowAddModal(true)} />
    </>
  )
}