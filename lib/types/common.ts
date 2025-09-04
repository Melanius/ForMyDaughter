/**
 * 🔧 공통 타입 정의
 * 애플리케이션 전반에서 사용되는 공통 타입들
 */

// 기본 사용자 정보
export interface BaseUser {
  id: string
  email: string
  full_name?: string | null
  created_at: string
  updated_at: string
}

// 사용자 타입
export type UserType = 'parent' | 'child'

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 페이지네이션
export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// 정렬 옵션
export interface SortOption {
  field: string
  order: 'asc' | 'desc'
}

// 날짜 범위
export interface DateRange {
  start: string
  end: string
}

// 로딩 상태
export interface LoadingState {
  loading: boolean
  error: string | null
}

// 폼 필드 상태
export interface FormField<T = string> {
  value: T
  error?: string
  touched: boolean
}

// 모달 상태
export interface ModalState {
  isOpen: boolean
  title?: string
  content?: React.ReactNode
}

// 색상 테마
export type ColorTheme = 'orange' | 'blue' | 'green' | 'purple' | 'red' | 'yellow'

// 화면 크기
export type ScreenSize = 'mobile' | 'tablet' | 'desktop'

// 애니메이션 지속시간
export type AnimationDuration = 'fast' | 'normal' | 'slow'