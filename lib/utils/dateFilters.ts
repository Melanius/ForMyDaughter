import { getTodayKST } from './dateUtils'

export interface DateRange {
  startDate: string
  endDate: string
}

/**
 * 필터 타입에 따른 날짜 범위 계산 (KST 기준)
 */
export const getDateRangeForFilter = (filterType: string): DateRange => {
  const today = new Date()
  
  switch (filterType) {
    case 'this_month':
      return {
        startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
      }
      
    case 'last_month':
      return {
        startDate: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0],
        endDate: new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0]
      }
      
    case '3_months':
      return {
        startDate: new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().split('T')[0],
        endDate: getTodayKST()
      }
      
    case 'this_year':
      return {
        startDate: new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0],
        endDate: getTodayKST()
      }
      
    default:
      return {
        startDate: getTodayKST(),
        endDate: getTodayKST()
      }
  }
}

/**
 * 날짜 유효성 검증
 */
export const validateDateRange = (startDate: string, endDate: string): string | null => {
  if (!startDate || !endDate) {
    return '시작일과 종료일을 모두 입력해주세요.'
  }
  
  if (startDate > endDate) {
    return '시작일은 종료일보다 이전이어야 합니다.'
  }
  
  return null
}