'use client'

import { useState, useEffect } from 'react'
import { Plus, TrendingUp, TrendingDown, Wallet, Edit2, Trash2, Filter } from 'lucide-react'
import { AllowanceTransaction, AllowanceStatistics, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../../lib/types/allowance'
import allowanceSupabaseService from '../../lib/services/allowanceSupabase'
import enhancedSyncService from '../../lib/services/enhancedSync'
import { useAuth } from '../../components/auth/AuthProvider'
import { getTodayKST } from '@/lib/utils/dateUtils'

// Lazy loading을 일시적으로 비활성화하고 직접 import
import AddTransactionModal from '../../components/allowance/AddTransactionModal'

export default function AllowancePage() {
  const { profile } = useAuth()
  const [transactions, setTransactions] = useState<AllowanceTransaction[]>([])
  const [statistics, setStatistics] = useState<AllowanceStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<AllowanceTransaction | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [selectedDate] = useState(getTodayKST())

  // 초기 데이터 로드 (selectedDate, filterType 변경시)
  useEffect(() => {
    console.log('🔄 [DEBUG] loadData 호출 (selectedDate/filterType 변경):', {
      selectedDate,
      filterType,
      currentTransactionCount: transactions.length
    })
    loadData()
  }, [selectedDate, filterType])

  // 실시간 동기화 구독 (컴포넌트 마운트시 한번만)
  useEffect(() => {
    if (!profile?.id) return

    console.log('🔄 [DEBUG] 실시간 동기화 구독 시작')
    
    let channel: unknown = null
    let unsubscribeSync: (() => void) | null = null

    const setupSubscriptions = async () => {
      try {
        // Supabase 실시간 구독 (async 함수가 되었음)
        channel = await allowanceSupabaseService.subscribeToTransactions((payload) => {
          console.log('📡 Supabase 실시간 업데이트 수신:', payload)
          loadData()
        })

        // enhancedSyncService 실시간 구독 (거래 추가 알림용)
        unsubscribeSync = enhancedSyncService.subscribe({
          onUpdate: async (payload) => {
            console.log('📡 enhancedSync 실시간 업데이트 수신:', payload)
            
            if (payload.type === 'transaction_added' && payload.userId === profile.id) {
              console.log('🔄 새 거래 알림 수신, 데이터 새로고침 중...')
              await loadData()
            }
            
            if (payload.type === 'allowance_update' && payload.userId === profile.id) {
              console.log('💰 용돈 잔액 업데이트 알림 수신')
              await loadData()
            }
          }
        })

        console.log('✅ 실시간 구독 설정 완료')
      } catch (error) {
        console.error('❌ 실시간 구독 설정 실패:', error)
      }
    }

    setupSubscriptions()

    return () => {
      console.log('🔇 실시간 동기화 구독 해제')
      if (channel) {
        channel.unsubscribe()
      }
      if (unsubscribeSync) {
        unsubscribeSync()
      }
    }
  }, [profile?.id]) // profile.id가 변경될 때만 재구독

  const loadData = async () => {
    setLoading(true)
    try {
      // 🔧 가족 관계 자동 진단 및 수정 (모든 계정)
      console.log('🔍 [자동진단] 가족 관계 확인 중...', {
        userType: profile?.user_type,
        userId: profile?.id
      })
      
      const diagnosis = await allowanceSupabaseService.diagnoseFamilyConnection()
      console.log('📊 [진단결과]', diagnosis)
      
      if (diagnosis.fixed) {
        console.log('✅ [자동수정] 가족 관계 연결 완료!')
      } else if (diagnosis.issue) {
        console.log('🚨 [진단결과] 가족 관계 문제:', diagnosis.issue)
        
        // 강제 복구 시도
        console.log('🔧 [긴급복구] 강제 가족 관계 복구 시도...')
        const forceResult = await allowanceSupabaseService.forceFixFamilyRelations()
        console.log('🔧 [긴급복구] 결과:', forceResult)
        
        if (forceResult.success) {
          console.log('✅ [긴급복구] 가족 관계 강제 복구 성공!')
        } else {
          console.error('❌ [긴급복구] 가족 관계 강제 복구 실패:', forceResult.message)
        }
      } else {
        console.log('✅ [진단결과] 가족 관계 정상')
      }

      // 통계 정보 로드 (가족 단위)
      console.log('📊 [DEBUG] 통계 정보 로드 중...')
      const stats = await allowanceSupabaseService.getStatistics('month')
      console.log('📊 [DEBUG] 통계 정보 로드 완료:', {
        currentBalance: stats.currentBalance,
        totalIncome: stats.totalIncome,
        totalExpense: stats.totalExpense,
        topCategories: stats.topCategories.slice(0, 3)
      })
      setStatistics(stats)

      // 🔗 가족 거래 내역 로드 (getFamilyTransactions 사용)
      console.log('🔍 [DEBUG] 가족 거래내역 조회 시작:', {
        filterType: filterType,
        userType: profile?.user_type,
        userId: profile?.id?.substring(0, 8)
      })
      
      let transactionList = await allowanceSupabaseService.getFamilyTransactions()
      
      console.log('🔗 [DEBUG] getFamilyTransactions 조회 완료:', {
        totalCount: transactionList.length,
        recentTransactions: transactionList.slice(0, 3).map(t => ({
          id: t.id.substring(0, 8),
          date: t.date,
          type: t.type,
          amount: t.amount,
          description: t.description,
          userId: t.userId?.substring(0, 8)
        }))
      })
      
      // 📅 최근 30일 필터링 (클라이언트 사이드)
      const today = new Date()
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]
      
      const beforeDateFilter = transactionList.length
      transactionList = transactionList.filter(transaction => {
        return transaction.date >= thirtyDaysAgoStr
      })
      
      console.log('📅 [DEBUG] 30일 필터링 결과:', {
        thirtyDaysAgoStr,
        beforeFilter: beforeDateFilter,
        afterFilter: transactionList.length,
        filteredOut: beforeDateFilter - transactionList.length
      })
      
      console.log('🔍 [DEBUG] 조회된 원본 거래내역:', {
        totalCount: transactionList.length,
        transactions: transactionList.map(t => ({
          id: t.id,
          date: t.date,
          type: t.type,
          amount: t.amount,
          description: t.description
        }))
      })
      
      // 필터 적용
      if (filterType !== 'all') {
        const beforeFilter = transactionList.length
        transactionList = transactionList.filter(t => t.type === filterType)
        console.log('🔍 [DEBUG] 필터 적용 결과:', {
          filterType,
          beforeFilter,
          afterFilter: transactionList.length
        })
      }
      
      setTransactions(transactionList)
      console.log('✅ 가족 거래 내역 로드 완료:', transactionList.length, '개')
      console.log('📊 [DEBUG] 최종 거래내역 상세:', {
        totalTransactions: transactionList.length,
        transactionsByType: {
          income: transactionList.filter(t => t.type === 'income').length,
          expense: transactionList.filter(t => t.type === 'expense').length
        },
        transactionsByDate: transactionList.reduce((acc, t) => {
          acc[t.date] = (acc[t.date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        sampleTransactions: transactionList.slice(0, 3).map(t => ({
          id: t.id.substring(0, 8),
          date: t.date,
          type: t.type,
          amount: t.amount,
          description: t.description
        }))
      })
    } catch (error) {
      console.error('Failed to load allowance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async (transactionData: Omit<AllowanceTransaction, 'id' | 'createdAt'>) => {
    try {
      console.log('🔄 [DEBUG] 거래 추가/수정 시작:', {
        isEditing: !!editingTransaction,
        transactionData: transactionData,
        selectedDate: selectedDate,
        currentTransactionCount: transactions.length
      })

      if (editingTransaction) {
        // 수정
        await allowanceSupabaseService.updateTransaction(editingTransaction.id, transactionData)
        setEditingTransaction(null)
        console.log('✅ 거래 수정 완료')
      } else {
        // 새로 추가
        const transactionId = await allowanceSupabaseService.addTransaction(transactionData)
        console.log('✅ 새 거래 추가 완료:', transactionId)
      }
      
      console.log('🔄 [DEBUG] 데이터 새로고침 시작...')
      await loadData()
      console.log('🔄 [DEBUG] 데이터 새로고침 완료, 모달 닫기 직전 거래수:', transactions.length)
      
      setShowAddModal(false)
    } catch (error) {
      console.error('Failed to add/edit transaction:', error)
      alert('거래 처리에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const handleEditTransaction = (transaction: AllowanceTransaction) => {
    // 자녀는 미션 완료 거래 수정 불가 (부모는 모든 거래 수정 가능)
    if (profile?.user_type === 'child' && 
        (transaction.category === 'mission' || transaction.category === '미션완료' || 
         transaction.description?.includes('미션 완료') || transaction.description?.includes('🎯 미션 완료'))) {
      return
    }
    
    setEditingTransaction(transaction)
    setShowAddModal(true)
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId)
    
    // 자녀는 미션 완료 거래 삭제 불가 (부모는 모든 거래 삭제 가능)  
    if (profile?.user_type === 'child' && 
        (transaction?.category === 'mission' || transaction?.category === '미션완료' || 
         transaction?.description?.includes('미션 완료') || transaction?.description?.includes('🎯 미션 완료'))) {
      return
    }
    
    if (confirm('이 내역을 삭제하시겠습니까?')) {
      try {
        const success = await allowanceSupabaseService.deleteTransaction(transactionId)
        if (success) {
          console.log('✅ 거래 삭제 완료:', transactionId)
          await loadData()
        } else {
          alert('거래 삭제에 실패했습니다.')
        }
      } catch (error) {
        console.error('Failed to delete transaction:', error)
        alert('거래 삭제 중 오류가 발생했습니다.')
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

  const getCategoryIcon = (category: string, type: 'income' | 'expense') => {
    if (type === 'income') {
      switch (category) {
        case INCOME_CATEGORIES.MISSION: return '🎯'
        case INCOME_CATEGORIES.ALLOWANCE: return '💰'
        case INCOME_CATEGORIES.GIFT: return '🎁'
        default: return '💰'
      }
    } else {
      switch (category) {
        case EXPENSE_CATEGORIES.SNACK: return '🍿'
        case EXPENSE_CATEGORIES.TOY: return '🧸'
        case EXPENSE_CATEGORIES.BOOK: return '📚'
        default: return '💸'
      }
    }
  }

  const getCategoryColor = (category: string, type: 'income' | 'expense') => {
    if (type === 'income') {
      switch (category) {
        case INCOME_CATEGORIES.MISSION: return 'bg-blue-100 text-blue-800 border-blue-200'
        case INCOME_CATEGORIES.ALLOWANCE: return 'bg-green-100 text-green-800 border-green-200'
        case INCOME_CATEGORIES.GIFT: return 'bg-purple-100 text-purple-800 border-purple-200'
        default: return 'bg-gray-100 text-gray-800 border-gray-200'
      }
    } else {
      switch (category) {
        case EXPENSE_CATEGORIES.SNACK: return 'bg-orange-100 text-orange-800 border-orange-200'
        case EXPENSE_CATEGORIES.TOY: return 'bg-pink-100 text-pink-800 border-pink-200'
        case EXPENSE_CATEGORIES.BOOK: return 'bg-indigo-100 text-indigo-800 border-indigo-200'
        default: return 'bg-gray-100 text-gray-800 border-gray-200'
      }
    }
  }

  const getCardBorderColor = (category: string, type: 'income' | 'expense') => {
    if (type === 'income') {
      switch (category) {
        case INCOME_CATEGORIES.MISSION: return 'border-l-blue-400'
        case INCOME_CATEGORIES.ALLOWANCE: return 'border-l-green-400'
        case INCOME_CATEGORIES.GIFT: return 'border-l-purple-400'
        default: return 'border-l-gray-400'
      }
    } else {
      switch (category) {
        case EXPENSE_CATEGORIES.SNACK: return 'border-l-orange-400'
        case EXPENSE_CATEGORIES.TOY: return 'border-l-pink-400'
        case EXPENSE_CATEGORIES.BOOK: return 'border-l-indigo-400'
        default: return 'border-l-gray-400'
      }
    }
  }

  const formatDateTime = (dateStr: string, createdAt: string) => {
    const date = new Date(dateStr)
    const created = new Date(createdAt)
    
    // 모바일: MM/DD 형태
    const mobileFormat = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`
    
    // 태블릿 이상: MM/DD HH:mm 형태
    const desktopFormat = `${mobileFormat} ${created.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })}`
    
    return { mobileFormat, desktopFormat }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 p-4 sm:p-8 pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            📝 용돈기입장 
          </h1>
          <p className="text-lg text-gray-600">돈을 어떻게 사용했는지 기록해보자!</p>
        </div>

        {/* 통계 요약 카드 - 반응형 레이아웃 */}
        {statistics && (
          <div className="mb-8">
            {/* 모바일 레이아웃: 잔액 위, 수입/지출 아래 반반 */}
            <div className="block md:hidden space-y-6">
              {/* 현재 잔액 */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">💰 내 돈</p>
                    <p className="text-3xl font-bold text-blue-800 mt-2">
                      {statistics.currentBalance.toLocaleString()}원
                    </p>
                  </div>
                  <div className="bg-blue-200 p-3 rounded-full">
                    <Wallet className="w-8 h-8 text-blue-700" />
                  </div>
                </div>
              </div>

              {/* 수입/지출 반반 배치 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-4 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="text-center">
                    <div className="bg-green-200 p-2 rounded-full w-fit mx-auto mb-3">
                      <TrendingUp className="w-6 h-6 text-green-700" />
                    </div>
                    <p className="text-xs text-green-700 font-medium">📈 번 돈</p>
                    <p className="text-xl font-bold text-green-800 mt-1">
                      {statistics.monthlyIncome.toLocaleString()}원
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl shadow-lg p-4 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="text-center">
                    <div className="bg-pink-200 p-2 rounded-full w-fit mx-auto mb-3">
                      <TrendingDown className="w-6 h-6 text-pink-700" />
                    </div>
                    <p className="text-xs text-pink-700 font-medium">📉 쓴 돈</p>
                    <p className="text-xl font-bold text-pink-800 mt-1">
                      {statistics.monthlyExpense.toLocaleString()}원
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 데스크톱 레이아웃: 3개 가로 정렬 */}
            <div className="hidden md:grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">💰 내 돈</p>
                    <p className="text-3xl font-bold text-blue-800 mt-2">
                      {statistics.currentBalance.toLocaleString()}원
                    </p>
                  </div>
                  <div className="bg-blue-200 p-3 rounded-full">
                    <Wallet className="w-8 h-8 text-blue-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">📈 번 돈</p>
                    <p className="text-3xl font-bold text-green-800 mt-2">
                      {statistics.monthlyIncome.toLocaleString()}원
                    </p>
                  </div>
                  <div className="bg-green-200 p-3 rounded-full">
                    <TrendingUp className="w-8 h-8 text-green-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-pink-700 font-medium">📉 쓴 돈</p>
                    <p className="text-3xl font-bold text-pink-800 mt-2">
                      {statistics.monthlyExpense.toLocaleString()}원
                    </p>
                  </div>
                  <div className="bg-pink-200 p-3 rounded-full">
                    <TrendingDown className="w-8 h-8 text-pink-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 컨트롤 영역 - 가계부 스타일 */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl shadow-lg p-6 mb-8 border-l-4 border-yellow-400">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              📋 거래 기록장
            </h2>

            {/* 필터 아이콘 - 우측 배치 */}
            <div className="relative">
              <button
                onClick={() => {
                  // 순환: all → income → expense → all
                  const nextFilter = filterType === 'all' ? 'income' : filterType === 'income' ? 'expense' : 'all'
                  setFilterType(nextFilter)
                }}
                className={`p-3 rounded-full shadow-md transition-all duration-300 transform hover:scale-110 ${
                  filterType === 'all' 
                    ? 'bg-gray-100 text-gray-600' 
                    : filterType === 'income'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}
                title={
                  filterType === 'all' ? '전체 보기' : 
                  filterType === 'income' ? '수입만 보기' : 
                  '지출만 보기'
                }
              >
                {filterType === 'all' ? (
                  <Filter className="w-5 h-5" />
                ) : filterType === 'income' ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 거래 내역 목록 - 가계부 스타일 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-t-4 border-yellow-400">
          {loading ? (
            <div className="text-center py-16 bg-gradient-to-b from-yellow-50 to-white">
              <div className="animate-spin w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-6"></div>
              <p className="text-gray-600 text-lg font-medium">📋 가계부를 준비하고 있어요...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-b from-blue-50 to-white">
              <div className="mb-6">
                📝
              </div>
              <p className="text-gray-500 text-xl font-medium mb-2">아직 기록이 비어있어요!</p>
              <p className="text-gray-400 mb-6">첫 번째 거래를 기록해보세요 ✨</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-full font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                ✏️ 지금 시작하기
              </button>
            </div>
          ) : (
            <div>
              {transactions.map((transaction, index) => {
                const { mobileFormat, desktopFormat } = formatDateTime(transaction.date, transaction.createdAt)
                const categoryIcon = getCategoryIcon(transaction.category, transaction.type)
                const categoryColor = getCategoryColor(transaction.category, transaction.type)
                const borderColor = getCardBorderColor(transaction.category, transaction.type)
                
                return (
                  <div 
                    key={transaction.id} 
                    className={`p-3 sm:p-4 lg:p-6 transition-all duration-300 hover:bg-gradient-to-r ${
                      transaction.type === 'income' ? 'hover:from-green-50 hover:to-blue-50' : 'hover:from-pink-50 hover:to-orange-50'
                    } ${index !== transactions.length - 1 ? 'border-b border-gray-100' : ''} border-l-4 ${borderColor} group`}
                  >
                    {/* 첫 번째 행: 카테고리, 날짜, 액션 버튼 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        {/* 카테고리 배지 */}
                        <span className={`inline-flex items-center px-2 py-1 text-xs sm:text-sm rounded-full font-medium border ${categoryColor}`}>
                          <span className="mr-1">{categoryIcon}</span>
                          <span className="hidden sm:inline">{transaction.category}</span>
                        </span>
                        
                        {/* 미션 보상 표시 */}
                        {transaction.missionId && (
                          <span className="px-2 py-1 text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full font-medium border border-blue-200">
                            🏆 <span className="hidden sm:inline">보상</span>
                          </span>
                        )}
                        
                        {/* 날짜/시간 - 반응형 */}
                        <span className="text-xs sm:text-sm text-gray-500 font-medium">
                          <span className="sm:hidden">{mobileFormat}</span>
                          <span className="hidden sm:inline">{desktopFormat}</span>
                        </span>
                      </div>
                      
                      {/* 액션 버튼 - 부모는 모든 거래 수정/삭제 가능, 자녀는 미션 완료 거래는 수정/삭제 불가 */}
                      {(profile?.user_type === 'parent' || 
                        (profile?.user_type === 'child' && 
                         !(transaction.category === 'mission' || transaction.category === '미션완료' || 
                           transaction.description?.includes('미션 완료') || transaction.description?.includes('🎯 미션 완료')))) && (
                        <div className="flex space-x-1 sm:space-x-2 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button
                            onClick={() => handleEditTransaction(transaction)}
                            className="p-2 sm:p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-300 transform hover:scale-110 touch-manipulation"
                            title="수정"
                          >
                            <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="p-2 sm:p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-300 transform hover:scale-110 touch-manipulation"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* 두 번째 행: 제목과 금액 */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-3 sm:pr-4">
                        <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800 truncate sm:line-clamp-2 lg:line-clamp-none">
                          {transaction.description}
                        </h3>
                      </div>
                      
                      {/* 금액 표시 */}
                      <div className={`text-right flex-shrink-0 ${transaction.type === 'income' ? 'text-green-700' : 'text-pink-700'}`}>
                        <div className="text-lg sm:text-xl lg:text-2xl font-bold leading-tight">
                          {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString()}원
                        </div>
                        <div className="text-xs sm:text-sm opacity-75 leading-tight">
                          {transaction.type === 'income' ? '들어옴' : '나감'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 카테고리별 지출 분석 - 가계부 스타일 */}
        {statistics && statistics.topCategories.length > 0 && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-xl p-8 mt-8 border-l-4 border-purple-400">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              📊 이번 달 지출 분석
            </h3>
            <div className="space-y-6">
              {statistics.topCategories.map((category, index) => (
                <div key={category.category} className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                        index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' : 
                        'bg-gradient-to-r from-orange-400 to-red-500'
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <span className="font-bold text-gray-800 text-lg">{category.category}</span>
                        <div className="text-sm text-gray-600">
                          전체의 {category.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-2xl text-red-600">
                        {category.amount.toLocaleString()}원
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                        index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' : 
                        'bg-gradient-to-r from-orange-400 to-red-500'
                      }`}
                      style={{ 
                        width: `${category.percentage}%`,
                        animation: `expand 1s ease-out ${index * 0.2}s both`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-white bg-opacity-70 rounded-xl">
              <p className="text-center text-gray-600 text-sm">
                💡 <strong>팁:</strong> 어디에 돈을 많이 쓰는지 확인해보고, 절약할 수 있는 부분을 찾아보세요!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 플로팅 액션 버튼 - 새 기록 추가 */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center z-40 group"
        title="새 기록 추가"
      >
        <Plus className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:rotate-90" />
        
        {/* 데스크톱에서만 보이는 라벨 */}
        <span className="absolute -left-20 bg-gray-800 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden lg:block">
          ✏️ 새 기록
        </span>
      </button>

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