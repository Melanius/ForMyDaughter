'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, TrendingUp, TrendingDown, Wallet, Edit2, Trash2, Filter, BarChart3, ChevronDown } from 'lucide-react'
import { AllowanceTransaction, AllowanceStatistics, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../../lib/types/allowance'
import allowanceSupabaseService from '../../lib/services/allowanceSupabase'
import enhancedSyncService from '../../lib/services/enhancedSync'
import { useAuth } from '../../components/auth/AuthProvider'
import { getTodayKST } from '@/lib/utils/dateUtils'

// Lazy loading을 일시적으로 비활성화하고 직접 import
import AddTransactionModal from '../../components/allowance/AddTransactionModal'
import AnalyticsModal from '../../components/allowance/AnalyticsModal'

export default function AllowancePage() {
  const { profile } = useAuth()
  const [transactions, setTransactions] = useState<AllowanceTransaction[]>([])
  const [statistics, setStatistics] = useState<AllowanceStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<AllowanceTransaction | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  
  const itemsPerPage = 10

  // 현재 월 계산
  const currentMonth = new Date().getMonth() + 1

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
        allowanceSupabaseService.getTransactions(profile.id),
        allowanceSupabaseService.getStatistics(profile.id, startDate, endDate)
      ])

      console.log('📊 지갑 데이터 로딩 완료:', {
        transactions: transactionsResult.length,
        statistics: statisticsResult
      })

      setTransactions(transactionsResult)
      setStatistics(statisticsResult)
    } catch (error) {
      console.error('❌ 지갑 데이터 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

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
          <div className="text-6xl mb-6">💰</div>
          <p className="text-gray-600 text-lg">용돈 내역을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
        <div className="p-4 sm:p-8 pb-20 md:pb-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">내 지갑</h1>
            
            {/* 통계 카드들 */}
            {statistics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">현재 잔액</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {statistics.currentBalance.toLocaleString()}원
                      </p>
                    </div>
                    <Wallet className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700 font-semibold">{currentMonth}월 받은 돈</p>
                      <p className="text-2xl font-bold text-green-600">
                        {statistics.monthlyIncome.toLocaleString()}원
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-pink-700 font-semibold">{currentMonth}월 쓴 돈</p>
                      <p className="text-2xl font-bold text-pink-600">
                        {statistics.monthlyExpense.toLocaleString()}원
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-pink-600" />
                  </div>
                </div>
              </div>
            )}

            {/* 거래 내역 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">거래 내역</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowAnalytics(true)}
                      className="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center space-x-1"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>분석</span>
                    </button>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>추가</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">💰</div>
                    <p className="text-gray-600">거래 내역이 없습니다.</p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      첫 거래 추가하기
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {transaction.type === 'income' ? 
                              <TrendingUp className="w-4 h-4 text-green-600" /> :
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            }
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-gray-500">{transaction.category}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className={`font-bold ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}
                            {transaction.amount.toLocaleString()}원
                          </p>
                          <p className="text-xs text-gray-500">{transaction.date}</p>
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
      {statistics && (
        <AnalyticsModal
          isOpen={showAnalytics}
          onClose={() => setShowAnalytics(false)}
          statistics={statistics}
        />
      )}
    </>
  )
}