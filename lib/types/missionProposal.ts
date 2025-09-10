/**
 * 🎯 미션 제안 시스템 타입 정의
 * 
 * 자녀가 부모에게 미션을 제안하는 시스템의 
 * 모든 타입을 정의합니다.
 */

/**
 * 미션 제안 상태
 */
export type MissionProposalStatus = 'pending' | 'approved' | 'rejected'

/**
 * 미션 제안 타입
 */
export type MissionProposalType = 'daily' | 'event'

/**
 * 기본 미션 제안 인터페이스
 */
export interface MissionProposal {
  id: string
  child_id: string
  parent_id: string
  title: string
  description: string | null
  mission_type: MissionProposalType
  difficulty: number
  reward_amount: number
  category: string // 🆕 자녀가 선택하는 카테고리
  start_date: string // 🆕 미션 시작 날짜 (YYYY-MM-DD)
  status: MissionProposalStatus
  proposed_at: string
  processed_at: string | null
  processed_by: string | null
  rejection_reason: string | null // 🆕 거절 사유
  created_at: string
  updated_at: string
}

/**
 * 프로필 정보가 포함된 미션 제안 (UI 표시용)
 */
export interface MissionProposalWithProfile extends MissionProposal {
  child_profile: {
    id: string
    full_name: string
    avatar_url?: string
  }
  parent_profile: {
    id: string
    full_name: string
  }
  processor_profile?: {
    id: string
    full_name: string
  }
}

/**
 * 미션 제안 생성 요청 데이터
 */
export interface CreateMissionProposalRequest {
  title: string
  description?: string
  mission_type: MissionProposalType
  difficulty?: number // 🆕 optional로 변경 (기본값 1)
  reward_amount: number
  category: string // 🆕 자녀가 선택하는 카테고리
  start_date: string // 🆕 미션 시작 날짜 (YYYY-MM-DD)
  parent_id: string
}

/**
 * 미션 제안 수정 요청 데이터 (상태 변경 등)
 */
export interface UpdateMissionProposalRequest {
  status?: MissionProposalStatus
  processed_by?: string
  processed_at?: string
}

/**
 * 미션 제안 승인 요청 데이터
 */
export interface ApproveMissionProposalRequest {
  proposal_id: string
  // 템플릿으로 승인할 경우 추가 옵션
  target_child_id?: string | null // null이면 공용 템플릿
}

/**
 * 미션 제안 거부 요청 데이터
 */
export interface RejectMissionProposalRequest {
  proposal_id: string
  rejection_reason: string // 🆕 필수로 변경
}

/**
 * 미션 제안 목록 조회 필터
 */
export interface MissionProposalFilters {
  child_id?: string
  parent_id?: string
  status?: MissionProposalStatus[]
  mission_type?: MissionProposalType
  date_from?: string
  date_to?: string
}

/**
 * 미션 제안 통계 정보
 */
export interface MissionProposalStats {
  total_proposals: number
  pending_proposals: number
  approved_proposals: number
  rejected_proposals: number
  proposals_by_child: Array<{
    child_id: string
    child_name: string
    count: number
  }>
}

/**
 * Supabase 데이터베이스 테이블 타입 (내부용)
 */
export interface SupabaseMissionProposalTable {
  id: string
  child_id: string
  parent_id: string
  title: string
  description: string | null
  mission_type: MissionProposalType
  difficulty: number
  reward_amount: number
  category: string // 🆕 카테고리 추가
  start_date: string // 🆕 시작 날짜 추가
  status: MissionProposalStatus
  proposed_at: string
  processed_at: string | null
  processed_by: string | null
  rejection_reason: string | null // 🆕 거절 사유 추가
  created_at: string
  updated_at: string
}

/**
 * API 응답 타입들
 */
export interface MissionProposalApiResponse<T = any> {
  data: T | null
  error: string | null
  success: boolean
}

export interface MissionProposalListResponse {
  proposals: MissionProposalWithProfile[]
  total: number
  page: number
  limit: number
}

/**
 * React Hook 상태 타입들
 */
export interface UseMissionProposalsState {
  proposals: MissionProposalWithProfile[]
  loading: boolean
  error: string | null
  stats: MissionProposalStats | null
}

export interface UseMissionProposalFormState {
  title: string
  description: string
  mission_type: MissionProposalType
  difficulty: number
  reward_amount: number
  submitting: boolean
  error: string | null
}

/**
 * 미션 제안 폼 검증 규칙
 */
export interface MissionProposalValidationRules {
  title: {
    required: true
    minLength: 2
    maxLength: 100
  }
  description: {
    maxLength: 500
  }
  difficulty: {
    min: 1
    max: 5
  }
  reward_amount: {
    min: 0
    max: 100000
  }
}