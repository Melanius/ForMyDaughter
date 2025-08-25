'use client'

import { useState, useEffect } from 'react'
import { Plus, TrendingUp, TrendingDown, Wallet, Calendar, Edit2, Trash2, Filter } from 'lucide-react'
import { AllowanceTransaction, AllowanceStatistics, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../../lib/types/allowance'
import allowanceService from '../../lib/services/allowance'
import AddTransactionModal from '../../components/allowance/AddTransactionModal'

export default function AllowancePage() {
  const [transactions, setTransactions] = useState<AllowanceTransaction[]>([])
  const [statistics, setStatistics] = useState<AllowanceStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<AllowanceTransaction | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadData()
  }, [selectedDate, filterType])

  const loadData = async () => {
    setLoading(true)
    try {
      // 통계 정보 로드
      const stats = await allowanceService.getStatistics('month')
      setStatistics(stats)

      // 거래 내역 로드 (최근 30일)
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      const startDateStr = startDate.toISOString().split('T')[0]
      
      let transactionList = await allowanceService.getTransactionsInRange(startDateStr, endDate)
      
      // 필터 적용
      if (filterType !== 'all') {
        transactionList = transactionList.filter(t => t.type === filterType)
      }
      
      setTransactions(transactionList)
    } catch (error) {
      console.error('Failed to load allowance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async (transactionData: Omit<AllowanceTransaction, 'id' | 'createdAt'>) => {
    try {
      if (editingTransaction) {
        // 수정
        await allowanceService.updateTransaction(editingTransaction.id, transactionData)
        setEditingTransaction(null)
      } else {
        // 새로 추가
        await allowanceService.addTransaction(transactionData)
      }
      
      await loadData()
      setShowAddModal(false)
    } catch (error) {
      console.error('Failed to add/edit transaction:', error)
    }
  }

  const handleEditTransaction = (transaction: AllowanceTransaction) => {
    // 미션에서 자동 생성된 수입은 수정 불가
    if (transaction.missionId) return
    
    setEditingTransaction(transaction)
    setShowAddModal(true)
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId)
    
    // 미션에서 자동 생성된 수입은 삭제 불가
    if (transaction?.missionId) return
    
    if (confirm('이 내역을 삭제하시겠습니까?')) {
      try {
        await allowanceService.deleteTransaction(transactionId)
        await loadData()
      } catch (error) {
        console.error('Failed to delete transaction:', error)
      }
    }
  }

  const formatAmount = (amount: number, type: 'income' | 'expense') => {
    const sign = type === 'income' ? '+' : '-'
    const color = type === 'income' ? 'text-green-600' : 'text-red-600'
    return (
      <span className={`font-semibold ${color}`}>
        {sign}{amount.toLocaleString()}원
      </span>
    )
  }

  const getTransactionIcon = (transaction: AllowanceTransaction) => {
    if (transaction.type === 'income') {
      return <TrendingUp className="w-5 h-5 text-green-600" />
    }
    return <TrendingDown className="w-5 h-5 text-red-600" />
  }

  const getCategoryColor = (category: string, type: 'income' | 'expense') => {
    if (type === 'income') {
      switch (category) {
        case INCOME_CATEGORIES.MISSION: return 'bg-blue-100 text-blue-800'
        case INCOME_CATEGORIES.ALLOWANCE: return 'bg-green-100 text-green-800'
        case INCOME_CATEGORIES.GIFT: return 'bg-purple-100 text-purple-800'
        default: return 'bg-gray-100 text-gray-800'
      }
    } else {
      switch (category) {
        case EXPENSE_CATEGORIES.SNACK: return 'bg-orange-100 text-orange-800'
        case EXPENSE_CATEGORIES.TOY: return 'bg-pink-100 text-pink-800'
        case EXPENSE_CATEGORIES.BOOK: return 'bg-indigo-100 text-indigo-800'
        default: return 'bg-gray-100 text-gray-800'
      }
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">
          용돈 사용 내역
        </h1>

        {/* 통계 요약 카드 */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">현재 잔액</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {statistics.currentBalance.toLocaleString()}원
                  </p>
                </div>
                <Wallet className="w-12 h-12 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">이번 달 수입</p>
                  <p className="text-3xl font-bold text-green-600">
                    {statistics.monthlyIncome.toLocaleString()}원
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">이번 달 지출</p>
                  <p className="text-3xl font-bold text-red-600">
                    {statistics.monthlyExpense.toLocaleString()}원
                  </p>
                </div>
                <TrendingDown className="w-12 h-12 text-red-600" />
              </div>
            </div>
          </div>
        )}

        {/* 컨트롤 영역 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">거래 내역</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>거래 추가</span>
            </button>
          </div>

          {/* 필터 */}
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">전체</option>
                <option value="income">수입</option>
                <option value="expense">지출</option>
              </select>
            </div>
          </div>
        </div>

        {/* 거래 내역 목록 */}
        <div className="bg-white rounded-xl shadow-lg">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">내역을 불러오는 중...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">거래 내역이 없습니다.</p>
              <p className="text-sm text-gray-400 mt-2">첫 번째 거래를 추가해보세요!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getTransactionIcon(transaction)}
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium text-gray-800">
                            {transaction.description}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(transaction.category, transaction.type)}`}>
                            {transaction.category}
                          </span>
                          {transaction.missionId && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              미션보상
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-500 flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{transaction.date}</span>
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(transaction.createdAt).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {formatAmount(transaction.amount, transaction.type)}
                      
                      {/* 액션 버튼 (미션 보상이 아닌 경우만) */}
                      {!transaction.missionId && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditTransaction(transaction)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="수정"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 카테고리별 지출 분석 */}
        {statistics && statistics.topCategories.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6">이번 달 지출 분석</h3>
            <div className="space-y-4">
              {statistics.topCategories.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                    <span className="font-medium text-gray-800">{category.category}</span>
                    <span className="text-sm text-gray-500">
                      ({category.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                    <span className="font-semibold text-red-600 w-20 text-right">
                      {category.amount.toLocaleString()}원
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 거래 추가/수정 모달 */}
      {showAddModal && (
        <AddTransactionModal
          onClose={() => {
            setShowAddModal(false)
            setEditingTransaction(null)
          }}
          onAdd={handleAddTransaction}
          editingTransaction={editingTransaction}
        />
      )}
    </div>
  )
}