'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Wallet, Filter, BarChart3, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
import { AllowanceTransaction, AllowanceStatistics, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../../lib/types/allowance'
import allowanceSupabaseService from '../../lib/services/allowanceSupabase'
import enhancedSyncService from '../../lib/services/enhancedSync'
import { useAuth } from '../../components/auth/AuthProvider'
import { useSelectedChild } from '@/lib/contexts/ChildSelectionContext'
import ChildSelector from '@/components/child-selection/ChildSelector'
import { getTodayKST } from '@/lib/utils/dateUtils'
import { allowanceLogger } from '@/lib/utils/logger'
import AllowanceRequestButton from '../../components/allowance/AllowanceRequestButton'

// Lazy loading을 일시적으로 비활성화하고 직접 import
import AddTransactionModal from '../../components/allowance/AddTransactionModal'
import AnalyticsModal from '../../components/allowance/AnalyticsModal'
import FilterModal, { FilterOption } from '../../components/allowance/FilterModal'
import { FloatingActionButton } from '../../components/ui/FloatingActionButton'
import { isParentRole, isChildRole } from '@/lib/utils/roleUtils'

export default function AllowancePage() {
  const { profile } = useAuth()
  const selectedChildId = useSelectedChild()
  const [transactions, setTransactions] = useState<AllowanceTransaction[]>([])
  const [statistics, setStatistics] = useState<AllowanceStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [currentFilter, setCurrentFilter] = useState<FilterOption>({ type: 'this_month' })
  const [allTransactions, setAllTransactions] = useState<AllowanceTransaction[]>([])
  const [editingTransaction, setEditingTransaction] = useState<AllowanceTransaction | null>(null)
  
  // 거래 내역 페이지네이션을 위한 상태
  const [visibleTransactionsCount, setVisibleTransactionsCount] = useState(10)

  // 현재 월 계산 (KST 기준)
  const currentMonth = useMemo(() => {
    const today = new Date()
    return today.getMonth() + 1
  }, [])

  // 데이터 로딩
  const loadData = useCallback(async () => {
    console.log('🚀 [DEBUG] loadData 호출됨:', { 
      hasProfile: !!profile?.id, 
      hasSelectedChildId: !!selectedChildId,
      profileId: profile?.id?.substring(0, 8),
      selectedChildId: selectedChildId?.substring(0, 8),
      profileUserType: profile?.user_type
    })

    if (!profile?.id || !selectedChildId) {
      console.log('❌ [DEBUG] loadData 조기 종료 - 필수 값 부재')
      return
    }

    try {
      setLoading(true)
      
      // 현재 월의 시작과 끝 날짜 계산
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      
      allowanceLogger.log('📊 지갑 데이터 로딩 시작:', { userId: profile.id, selectedChildId, startDate, endDate })
      console.log('🔍 [DEBUG] allowanceSupabaseService 호출 직전:', {
        targetUserId: selectedChildId.substring(0, 8),
        method: 'getFamilyTransactions'
      })

      // 자녀 지갑 초기화 (필요시)
      try {
        await allowanceSupabaseService.initializeChildWallet(selectedChildId, 0)
      } catch (initError) {
        console.warn('⚠️ 자녀 지갑 초기화 실패 (계속 진행):', initError)
      }

      // 병렬로 데이터 로딩 (선택된 자녀 ID로)
      const [transactionsResult, statisticsResult] = await Promise.all([
        allowanceSupabaseService.getFamilyTransactions(selectedChildId),
        allowanceSupabaseService.getStatistics(selectedChildId)
      ])

      allowanceLogger.log('📊 지갑 데이터 로딩 완료:', {
        selectedChildId: selectedChildId?.substring(0, 8),
        transactions: transactionsResult.length,
        statistics: statisticsResult
      })

      console.log('✅ [DEBUG] 데이터 로딩 결과:', {
        selectedChildId: selectedChildId?.substring(0, 8),
        transactionCount: transactionsResult.length,
        hasStatistics: !!statisticsResult,
        firstTransaction: transactionsResult[0] ? {
          id: transactionsResult[0].id.substring(0, 8),
          date: transactionsResult[0].date,
          amount: transactionsResult[0].amount,
          type: transactionsResult[0].type,
          category: transactionsResult[0].category
        } : null
      })

      // 🔧 임시 테스트: 거래가 없는 자녀에게 테스트 데이터 추가
      if (transactionsResult.length === 0 && selectedChildId) {
        console.log('🧪 [TEST] 거래내역이 없으므로 테스트 데이터 추가 시도...')
        try {
          await allowanceSupabaseService.addMissionIncomeForUser(
            selectedChildId, 
            'test-mission', 
            1000, 
            '테스트 미션', 
            new Date().toISOString().split('T')[0]
          )
          console.log('✅ [TEST] 테스트 데이터 추가 성공, 데이터 재로딩...')
          // 데이터 재로딩
          const [reloadTransactions] = await Promise.all([
            allowanceSupabaseService.getFamilyTransactions(selectedChildId)
          ])
          console.log('📊 [TEST] 재로딩 결과:', reloadTransactions.length)
        } catch (testError) {
          console.log('⚠️ [TEST] 테스트 데이터 추가 실패:', testError)
        }
      }

      setAllTransactions(transactionsResult)
      // 통계는 자동으로 계산됨 (filteredStatistics useMemo로)
    } catch (error) {
      allowanceLogger.error('❌ 지갑 데이터 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, selectedChildId])

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

  // 현재 달 기준 통계 계산 (내 지갑용 - 필터 무관)
  const currentMonthStatistics = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    
    let income = 0
    let expense = 0
    let totalIncome = 0
    let totalExpense = 0
    
    // 전체 거래에서 현재 달과 전체 누계 계산
    allTransactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date)
      const transactionYear = transactionDate.getFullYear()
      const transactionMonth = transactionDate.getMonth() + 1
      const transactionMonthKey = `${transactionYear}-${String(transactionMonth).padStart(2, '0')}`
      
      // 전체 누계
      if (transaction.type === 'income') {
        totalIncome += transaction.amount
      } else {
        totalExpense += transaction.amount
      }
      
      // 현재 달만
      if (transactionMonthKey === currentMonthKey) {
        if (transaction.type === 'income') {
          income += transaction.amount
        } else {
          expense += transaction.amount
        }
      }
    })
    
    return {
      currentBalance: totalIncome - totalExpense, // 전체 누계로 현재 잔액
      monthlyIncome: income, // 현재 달만
      monthlyExpense: expense // 현재 달만
    }
  }, [allTransactions])

  // 필터링된 데이터로 거래 내역만 계산 (용돈기입장용)
  const filteredStatistics = useMemo(() => {
    let income = 0
    let expense = 0
    
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

  // 페이지네이션된 거래 내역 계산
  const visibleTransactions = useMemo(() => {
    return filteredTransactions.slice(0, visibleTransactionsCount)
  }, [filteredTransactions, visibleTransactionsCount])
  
  // 현재 표시될 거래 내역 및 통계
  const displayedTransactions = visibleTransactions
  const displayedStatistics = currentMonthStatistics // 내 지갑은 항상 현재 달 기준
  
  // 더보기 관련 계산
  const totalTransactions = filteredTransactions.length
  const hasMoreTransactions = visibleTransactionsCount < totalTransactions
  const remainingTransactions = totalTransactions - visibleTransactionsCount

  // 더보기/접기 핸들러 함수들
  const handleLoadMore = useCallback(() => {
    setVisibleTransactionsCount(prev => Math.min(prev + 10, totalTransactions))
  }, [totalTransactions])
  
  const handleShowLess = useCallback(() => {
    setVisibleTransactionsCount(10)
    // 부드러운 스크롤을 위해 용돈기입장 섹션으로 스크롤
    document.querySelector('[data-transactions-section]')?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    })
  }, [])

  // 필터가 변경될 때 visibleTransactionsCount 초기화
  useEffect(() => {
    setVisibleTransactionsCount(10)
  }, [currentFilter])

  // 초기 데이터 로딩
  useEffect(() => {
    loadData()
  }, [loadData])

  // 동기화 설정
  useEffect(() => {
    if (!profile?.id) return

    allowanceLogger.log('🔄 지갑 페이지 동기화 구독 시작')

    const unsubscribe = enhancedSyncService.subscribe({
      onUpdate: (payload) => {
        if (payload.type === 'allowance_update') {
          allowanceLogger.log('⚡ 용돈 업데이트 수신:', payload)
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
            
            {/* 자녀 선택 섹션 (부모용) */}
            <ChildSelector />
            
            {/* 받을 수 있는 용돈 섹션 (자녀용 - 최상단) */}
            {isChildRole(profile?.user_type) && selectedChildId && (
              <AllowanceRequestButton 
                userId={selectedChildId}
                onRequestSent={(amount, missions) => {
                  console.log('용돈 요청 완료:', { amount, missions })
                  // 데이터 새로고침
                  loadData()
                }}
              />
            )}
            
            {/* 내 지갑 섹션 */}
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
                        <TrendingUp className="w-6 h-6 text-green-600" />
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
                        <TrendingDown className="w-6 h-6 text-pink-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 거래 내역 */}
            <div className="bg-white rounded-lg shadow" data-transactions-section>
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                      <span>📝</span>
                      <span>용돈기입장</span>
                    </h2>
                    {totalTransactions > 0 && (
                      <span className="bg-blue-100 text-blue-700 text-sm font-medium px-2 py-1 rounded-full">
                        총 {totalTransactions}개
                      </span>
                    )}
                  </div>
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
                      className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors flex items-center justify-center"
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
                        <div className="flex-1">
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
                
                {/* 더보기/접기 버튼 */}
                {totalTransactions > 10 && (
                  <div className="mt-6 text-center">
                    {hasMoreTransactions ? (
                      <button
                        onClick={handleLoadMore}
                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        <ChevronDown className="w-5 h-5" />
                        <span>더 보기</span>
                        <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-sm">
                          {remainingTransactions}개 더 있어요
                        </span>
                      </button>
                    ) : (
                      visibleTransactionsCount > 10 && (
                        <button
                          onClick={handleShowLess}
                          className="inline-flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-full font-medium transition-all duration-300 transform hover:scale-105"
                        >
                          <ChevronUp className="w-5 h-5" />
                          <span>접기</span>
                          <span className="text-sm opacity-70">처음 10개만 보기</span>
                        </button>
                      )
                    )}
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
          targetUserId={selectedChildId}
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