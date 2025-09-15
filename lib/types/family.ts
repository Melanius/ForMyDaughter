/**
 * 🏠 가족 시스템 타입 정의
 */

// 가족 역할 타입 (이제 user_type과 동일)
export type FamilyRole = 'father' | 'mother' | 'son' | 'daughter'

// 가족 정보
export interface Family {
  id: string
  family_code: string
  family_name: string
  family_message?: string
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
    user_type: 'father' | 'mother' | 'son' | 'daughter'
    avatar_url?: string
    nickname?: string
    phone?: string
    bio?: string
    birthday?: string
    role?: string
  }
}

// 완전한 가족 정보 (구성원 포함)
export interface FamilyWithMembers {
  id: string
  family_code: string
  family_name: string
  family_message?: string
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
  family_message?: string
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

// 관리자용 families 테이블 타입 (Phase 2)
export interface AdminFamilyTable {
  id: string
  family_code: string
  family_name: string
  members: AdminFamilyMember[]
  total_members: number
  parents_count: number
  children_count: number
  is_active: boolean
  last_activity_at?: string
  created_at: string
  updated_at: string
}

export interface AdminFamilyMember {
  user_id: string
  name: string
  role: FamilyRole
  joined_at: string
  is_active: boolean
}

// 관리자용 가족 통계
export interface AdminFamilyStats {
  total_families: number
  active_families: number
  total_users: number
  total_parents: number
  total_children: number
  families_by_size: {
    size: number
    count: number
  }[]
  recent_activity: {
    family_code: string
    family_name: string
    last_activity: string
    members_count: number
  }[]
}