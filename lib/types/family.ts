/**
 * 🏠 가족 시스템 타입 정의
 */

// 가족 역할 타입
export type FamilyRole = 'father' | 'mother' | 'child'

// 가족 정보
export interface Family {
  id: string
  family_code: string
  family_name: string
  created_by: string
  created_at: string
  updated_at: string
}

// 가족 구성원
export interface FamilyMember {
  id: string
  family_id: string
  user_id: string
  role: FamilyRole
  nickname?: string
  joined_at: string
  is_active: boolean
}

// 가족 구성원 + 프로필 정보 조인
export interface FamilyMemberWithProfile {
  id: string
  family_id: string
  user_id: string
  role: FamilyRole
  nickname?: string
  joined_at: string
  is_active: boolean
  profile: {
    id: string
    full_name: string
    user_type: 'parent' | 'child'
    avatar_url?: string
  }
}

// 완전한 가족 정보 (구성원 포함)
export interface FamilyWithMembers {
  id: string
  family_code: string
  family_name: string
  created_by: string
  created_at: string
  updated_at: string
  members: FamilyMemberWithProfile[]
}

// 가족 가입 요청
export interface FamilyJoinRequest {
  family_code: string
  role: FamilyRole
  nickname?: string
}

// 가족 생성 요청
export interface FamilyCreateRequest {
  family_name: string
  role: FamilyRole
}

// 가족 구성원 초대
export interface FamilyInviteRequest {
  family_id: string
  email?: string
  role: FamilyRole
  nickname?: string
}

// 가족 통계
export interface FamilyStats {
  total_members: number
  parents_count: number
  children_count: number
  active_missions: number
  completed_missions_today: number
  pending_allowance: number
}

// Supabase 테이블 타입 (스네이크 케이스)
export interface SupabaseFamilyTable {
  id: string
  family_code: string
  family_name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface SupabaseFamilyMemberTable {
  id: string
  family_id: string
  user_id: string
  role: FamilyRole
  nickname?: string
  joined_at: string
  is_active: boolean
}