'use client'

import { useState, useEffect } from 'react'
import { X, TrendingUp, TrendingDown, PieChart, BarChart3, Calendar, Lightbulb, ChevronDown } from 'lucide-react'
import { AllowanceStatistics } from '@/lib/types/allowance'
import allowanceSupabaseService from '@/lib/services/allowanceSupabase'

interface AnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
  statistics: AllowanceStatistics
}

type PeriodType = 'current_month' | 'last_3months' | 'this_year' | 'last_year' | 'custom'

interface PeriodOption {
  value: PeriodType
  label: string
}

export default function AnalyticsModal({ isOpen, onClose, statistics: initialStatistics }: AnalyticsModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('current_month')
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false)
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [statistics, setStatistics] = useState<AllowanceStatistics>(initialStatistics)
  const [loading, setLoading] = useState(false)
  const [customStartMonth, setCustomStartMonth] = useState('')
  const [customEndMonth, setCustomEndMonth] = useState('')

  const periodOptions: PeriodOption[] = [
    { value: 'current_month', label: '이번 달' },
    { value: 'last_3months', label: '최근 3개월' },
    { value: 'this_year', label: '올해' },
    { value: 'last_year', label: '작년' },
    { value: 'custom', label: '사용자 지정' }
  ]

  // Generate year and month options for custom selection
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const years = Array.from({length: 5}, (_, i) => currentYear - i)
  const months = [
    { value: '01', label: '1월' }, { value: '02', label: '2월' },
    { value: '03', label: '3월' }, { value: '04', label: '4월' },
    { value: '05', label: '5월' }, { value: '06', label: '6월' },
    { value: '07', label: '7월' }, { value: '08', label: '8월' },
    { value: '09', label: '9월' }, { value: '10', label: '10월' },
    { value: '11', label: '11월' }, { value: '12', label: '12월' }
  ]

  // Initialize custom date values
  useEffect(() => {
    const currentYearMonth = `${currentYear}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
    if (!customStartMonth) setCustomStartMonth(currentYearMonth)
    if (!customEndMonth) setCustomEndMonth(currentYearMonth)
  }, [])

  const loadStatistics = async (period: PeriodType) => {
    if (period === selectedPeriod && period !== 'custom') return
    
    setLoading(true)
    try {
      let params = {}
      
      if (period === 'custom') {
        if (!customStartMonth || !customEndMonth) {
          setLoading(false)
          return
        }
        params = {
          type: 'custom' as const,
          custom: {
            startMonth: customStartMonth,
            endMonth: customEndMonth
          }
        }
      } else {
        params = {
          type: 'preset' as const,
          preset: period
        }
      }
      
      const newStats = await allowanceSupabaseService.getStatistics(params)
      setStatistics(newStats)
    } catch (error) {
      console.error('통계 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePeriodSelect = async (period: PeriodType) => {
    setSelectedPeriod(period)
    setShowPeriodDropdown(false)
    
    if (period === 'custom') {
      setShowCustomRange(true)
    } else {
      setShowCustomRange(false)
      await loadStatistics(period)
    }
  }

  const handleCustomApply = async () => {
    if (customStartMonth && customEndMonth) {
      await loadStatistics('custom')
      setShowCustomRange(false)
    }
  }

  if (!isOpen) return null

  const savingsRate = statistics.currentBalance > 0 ? 
    ((statistics.monthlyIncome - statistics.monthlyExpense) / statistics.monthlyIncome * 100) : 0

  const selectedPeriodLabel = periodOptions.find(option => option.value === selectedPeriod)?.label || '이번 달'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      {/* 모바일: 하단에서 슬라이드업 */}
      <div className="sm:hidden fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="p-6">
          {/* 모바일 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                📊 {statistics.periodLabel || selectedPeriodLabel} 분석
              </h2>
              {loading && (
                <div className="text-sm text-gray-500 mt-1">로딩 중...</div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 모바일 기간 선택 */}
          <div className="mb-6">
            <div className="relative">
              <button
                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-700">{statistics.periodLabel || selectedPeriodLabel}</span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showPeriodDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                  {periodOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handlePeriodSelect(option.value)}
                      className={`w-full text-left p-3 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl ${
                        selectedPeriod === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 커스텀 기간 선택 모달 */}
          {showCustomRange && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">기간 선택</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">시작 월</label>
                  <input
                    type="month"
                    value={customStartMonth}
                    onChange={(e) => setCustomStartMonth(e.target.value)}
                    className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">종료 월</label>
                  <input
                    type="month"
                    value={customEndMonth}
                    onChange={(e) => setCustomEndMonth(e.target.value)}
                    className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={handleCustomApply}
                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    적용
                  </button>
                  <button
                    onClick={() => setShowCustomRange(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <AnalyticsContent statistics={statistics} savingsRate={savingsRate} />
        </div>
      </div>

      {/* 데스크톱: 중앙 모달 */}
      <div className="hidden sm:block w-full max-w-4xl bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* 데스크톱 헤더 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                📊 {statistics.periodLabel || selectedPeriodLabel} 분석 대시보드
              </h2>
              {loading && (
                <div className="text-gray-500 mt-2">데이터를 불러오는 중...</div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 데스크톱 기간 선택 */}
          <div className="mb-8">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">{statistics.periodLabel || selectedPeriodLabel}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showPeriodDropdown && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[160px]">
                    {periodOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handlePeriodSelect(option.value)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl ${
                          selectedPeriod === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 커스텀 기간 선택 (데스크톱) */}
          {showCustomRange && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
              <h3 className="text-xl font-semibold text-blue-800 mb-4">기간 선택</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">시작 월</label>
                  <input
                    type="month"
                    value={customStartMonth}
                    onChange={(e) => setCustomStartMonth(e.target.value)}
                    className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">종료 월</label>
                  <input
                    type="month"
                    value={customEndMonth}
                    onChange={(e) => setCustomEndMonth(e.target.value)}
                    className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleCustomApply}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  적용
                </button>
                <button
                  onClick={() => setShowCustomRange(false)}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}
          
          <AnalyticsContent statistics={statistics} savingsRate={savingsRate} />
        </div>
      </div>
    </div>
  )
}

function AnalyticsContent({ statistics, savingsRate }: { 
  statistics: AllowanceStatistics
  savingsRate: number 
}) {
  return (
    <div className="space-y-6">
      {/* 요약 카드들 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 현재 잔액 */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-l-4 border-blue-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-semibold">현재 잔액</p>
              <p className="text-2xl font-bold text-blue-800 mt-1">
                {statistics.currentBalance.toLocaleString()}원
              </p>
            </div>
            <div className="bg-blue-200 p-3 rounded-full">
              <PieChart className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </div>

        {/* 이번 달 수입 */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-l-4 border-green-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-semibold">이번 달 수입</p>
              <p className="text-2xl font-bold text-green-800 mt-1">
                +{statistics.monthlyIncome.toLocaleString()}원
              </p>
            </div>
            <div className="bg-green-200 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-700" />
            </div>
          </div>
        </div>

        {/* 이번 달 지출 */}
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-6 border-l-4 border-pink-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-pink-700 font-semibold">이번 달 지출</p>
              <p className="text-2xl font-bold text-pink-800 mt-1">
                -{statistics.monthlyExpense.toLocaleString()}원
              </p>
            </div>
            <div className="bg-pink-200 p-3 rounded-full">
              <TrendingDown className="w-6 h-6 text-pink-700" />
            </div>
          </div>
        </div>
      </div>

      {/* 절약률 및 저축 현황 */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border-l-4 border-purple-400">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          💰 절약 현황
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">이번 달 절약률</span>
              <span className="text-2xl font-bold text-purple-600">
                {savingsRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(savingsRate, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-2">이번 달 순증가</div>
            <div className={`text-2xl font-bold ${
              (statistics.monthlyIncome - statistics.monthlyExpense) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {statistics.monthlyIncome - statistics.monthlyExpense >= 0 ? '+' : ''}
              {(statistics.monthlyIncome - statistics.monthlyExpense).toLocaleString()}원
            </div>
          </div>
        </div>
      </div>

      {/* 카테고리별 지출 TOP 5 */}
      {statistics.topCategories && statistics.topCategories.length > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border-l-4 border-orange-400">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            📈 지출 카테고리 TOP 5
          </h3>
          <div className="space-y-4">
            {statistics.topCategories.slice(0, 5).map((category, index) => (
              <div key={category.category} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                      index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' : 
                      index === 2 ? 'bg-gradient-to-r from-orange-400 to-red-500' :
                      'bg-gradient-to-r from-gray-300 to-gray-500'
                    }`}>
                      #{index + 1}
                    </div>
                    <span className="font-semibold text-gray-800">{category.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-600">
                      {category.amount.toLocaleString()}원
                    </div>
                    <div className="text-xs text-gray-500">
                      {category.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                      index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' : 
                      index === 2 ? 'bg-gradient-to-r from-orange-400 to-red-500' :
                      'bg-gradient-to-r from-gray-300 to-gray-500'
                    }`}
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 절약 인사이트 & 팁 */}
      <div className="bg-gradient-to-br from-yellow-50 to-green-50 rounded-2xl p-6 border-l-4 border-yellow-400">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          💡 똑똑한 절약 팁
        </h3>
        <div className="space-y-3">
          {savingsRate > 50 ? (
            <div className="flex items-start gap-3 p-4 bg-green-100 rounded-xl">
              <Lightbulb className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <p className="font-semibold text-green-800">훌륭한 절약 습관이에요! 🎉</p>
                <p className="text-sm text-green-700">
                  절약률이 {savingsRate.toFixed(1)}%로 매우 좋습니다. 이 습관을 계속 유지해보세요!
                </p>
              </div>
            </div>
          ) : savingsRate > 20 ? (
            <div className="flex items-start gap-3 p-4 bg-blue-100 rounded-xl">
              <Lightbulb className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="font-semibold text-blue-800">좋은 시작이에요! 👍</p>
                <p className="text-sm text-blue-700">
                  절약률 {savingsRate.toFixed(1)}%는 괜찮은 수준입니다. 조금 더 절약해볼까요?
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-orange-100 rounded-xl">
              <Lightbulb className="w-5 h-5 text-orange-600 mt-1" />
              <div>
                <p className="font-semibold text-orange-800">절약 기회가 있어요! 💪</p>
                <p className="text-sm text-orange-700">
                  지출을 조금 줄여서 더 많이 모아보는 건 어떨까요?
                </p>
              </div>
            </div>
          )}
          
          {statistics.topCategories && statistics.topCategories.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-purple-100 rounded-xl">
              <BarChart3 className="w-5 h-5 text-purple-600 mt-1" />
              <div>
                <p className="font-semibold text-purple-800">가장 많이 쓰는 곳</p>
                <p className="text-sm text-purple-700">
                  <strong>{statistics.topCategories[0].category}</strong>에서 가장 많이 썼어요. 
                  다음 달엔 조금 줄여볼까요?
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}