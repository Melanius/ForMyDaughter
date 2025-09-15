/**
 * 🔗 가족 시스템 호환성 서비스
 * 
 * 기존 미션 시스템과 새로운 가족 시스템 간의 호환성을 보장하고,
 * 점진적인 전환을 지원합니다.
 */

import { createClient } from '@/lib/supabase/client'
import { FamilyWithMembers, FamilyMemberWithProfile, FamilyRole } from '@/lib/types/family'
import { isParentRole, isChildRole } from '../utils/roleUtils'

interface LegacyFamilyInfo {
  parent_id?: string
  family_code?: string
  childrenIds: string[]
}

class FamilyCompatibilityService {
  private supabase = createClient()

  /**
   * 🔄 기존 코드와의 호환성을 위한 getCurrentUser 확장
   * 
   * profiles 테이블만 사용하여 가족 정보를 반환합니다.
   * family_members 테이블 의존성 제거
   */
  async getCurrentUserWithFamily(): Promise<{
    profile: {
      id: string
      full_name: string
      user_type: 'parent' | 'child'
      // 레거시 호환성을 위한 필드들
      parent_id?: string
      family_code?: string
    }
    childrenIds: string[]
    family?: FamilyWithMembers
    familyRole?: 'father' | 'mother' | 'son' | 'daughter'
  }> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('사용자 인증이 필요합니다')

    // 사용자 프로필 조회
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) throw new Error('프로필 조회 실패')

    // profiles 기반 가족 정보 조회
    let childrenIds: string[] = []
    let family: FamilyWithMembers | undefined
    let familyRole: 'father' | 'mother' | 'son' | 'daughter' | undefined

    // 사용자 역할 설정
    familyRole = profile.user_type as 'father' | 'mother' | 'son' | 'daughter'

    if (profile.family_code) {
      // 같은 family_code를 가진 모든 구성원 조회
      const { data: familyMembers, error: membersError } = await this.supabase
        .from('profiles')
        .select('id, full_name, user_type, avatar_url, family_code, nickname, phone, bio, birthday')
        .eq('family_code', profile.family_code)
        .order('user_type', { ascending: false })

      if (!membersError && familyMembers && familyMembers.length > 0) {
        // 자녀 ID 목록 생성 (부모인 경우)
        if (isParentRole(profile.user_type)) {
          childrenIds = familyMembers
            .filter(member => isChildRole(member.user_type))
            .map(member => member.id)
        }

        // 가족 이름 결정
        const firstParent = familyMembers.find(m => isParentRole(m.user_type))
        const familyName = firstParent ? `${firstParent.full_name}님의 가족` : '우리 가족'

        // FamilyWithMembers 형태로 변환
        const membersWithProfile: FamilyMemberWithProfile[] = familyMembers.map(member => ({
          id: `legacy-${member.id}`,
          family_id: `legacy-${profile.family_code}`,
          user_id: member.id,
          role: member.user_type as FamilyRole,
          nickname: null as string | null,
          joined_at: new Date().toISOString(),
          is_active: true,
          profile: {
            id: member.id,
            full_name: member.full_name,
            user_type: member.user_type,
            avatar_url: member.avatar_url,
            nickname: (member as any).nickname || null,
            phone: (member as any).phone || null,
            bio: (member as any).bio || null,
            birthday: (member as any).birthday || null
          }
        }))

        family = {
          id: `legacy-${profile.family_code}`,
          family_code: profile.family_code,
          family_name: familyName,
          family_message: null as string | null,
          created_by: firstParent?.id || user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          members: membersWithProfile
        }
      }
    }

    return {
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        user_type: profile.user_type,
        parent_id: profile.parent_id,
        family_code: profile.family_code
      },
      childrenIds,
      family,
      familyRole
    }
  }

  /**
   * 👨‍👩‍👧‍👦 가족 구성원 목록 조회 (profiles 기반)
   */
  async getFamilyMembers(userId?: string): Promise<{
    id: string
    full_name: string
    user_type: 'parent' | 'child'
    role?: 'father' | 'mother' | 'son' | 'daughter'
  }[]> {
    const targetUserId = userId || (await this.supabase.auth.getUser()).data.user?.id
    if (!targetUserId) return []

    // 사용자의 family_code 조회
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('family_code')
      .eq('id', targetUserId)
      .single()

    if (!profile?.family_code) return []

    // 같은 family_code를 가진 모든 구성원 조회
    const { data: familyMembers } = await this.supabase
      .from('profiles')
      .select('id, full_name, user_type')
      .eq('family_code', profile.family_code)

    if (!familyMembers) return []

    return familyMembers.map(member => ({
      id: member.id,
      full_name: member.full_name,
      user_type: member.user_type,
      role: member.user_type as 'father' | 'mother' | 'son' | 'daughter'
    }))
  }

  /**
   * 🔍 특정 사용자가 다른 사용자의 미션을 볼 수 있는지 확인 (profiles 기반)
   */
  async canViewMissions(viewerId: string, targetUserId: string): Promise<boolean> {
    if (viewerId === targetUserId) return true

    const { data: viewerProfile } = await this.supabase
      .from('profiles')
      .select('user_type, family_code')
      .eq('id', viewerId)
      .single()

    const { data: targetProfile } = await this.supabase
      .from('profiles')
      .select('user_type, parent_id, family_code')
      .eq('id', targetUserId)
      .single()

    if (!viewerProfile || !targetProfile) return false

    // 같은 가족인지 확인 (family_code 기준)
    const sameFamily = viewerProfile.family_code && 
                      viewerProfile.family_code === targetProfile.family_code

    if (sameFamily) {
      // 부모는 모든 가족 구성원의 미션을 볼 수 있음
      if (isParentRole(viewerProfile.user_type)) return true
      
      // 자녀는 본인 미션만 볼 수 있음
      return false
    }

    // 레거시 parent_id 관계 확인
    return isParentRole(viewerProfile.user_type) && targetProfile.parent_id === viewerId
  }

  /**
   * 🛡️ 특정 사용자가 다른 사용자의 미션을 관리할 수 있는지 확인 (profiles 기반)
   */
  async canManageMissions(managerId: string, targetUserId: string): Promise<boolean> {
    if (managerId === targetUserId) return true

    const { data: managerProfile } = await this.supabase
      .from('profiles')
      .select('user_type, family_code')
      .eq('id', managerId)
      .single()

    const { data: targetProfile } = await this.supabase
      .from('profiles')
      .select('user_type, parent_id, family_code')
      .eq('id', targetUserId)
      .single()

    if (!managerProfile || !targetProfile) return false

    // 같은 가족인지 확인 (family_code 기준)
    const sameFamily = managerProfile.family_code && 
                      managerProfile.family_code === targetProfile.family_code

    if (sameFamily) {
      // 부모만 다른 구성원의 미션을 관리할 수 있음
      return isParentRole(managerProfile.user_type)
    }

    // 레거시 parent_id 관계 확인
    return isParentRole(managerProfile.user_type) && targetProfile.parent_id === managerId
  }

  /**
   * 💰 용돈 정산 권한 확인 (profiles 기반)
   */
  async canApproveAllowance(approverId: string, childId: string): Promise<boolean> {
    const { data: approverProfile } = await this.supabase
      .from('profiles')
      .select('user_type, family_code')
      .eq('id', approverId)
      .single()

    const { data: childProfile } = await this.supabase
      .from('profiles')
      .select('user_type, parent_id, family_code')
      .eq('id', childId)
      .single()

    if (!approverProfile || !childProfile) return false

    // 같은 가족인지 확인 (family_code 기준)
    const sameFamily = approverProfile.family_code && 
                      approverProfile.family_code === childProfile.family_code

    if (sameFamily) {
      // 부모만 자녀의 용돈을 승인할 수 있음
      return isParentRole(approverProfile.user_type) && isChildRole(childProfile.user_type)
    }

    // 레거시 parent_id 관계 확인
    return isParentRole(approverProfile.user_type) && 
           isChildRole(childProfile.user_type) && 
           childProfile.parent_id === approverId
  }

  /**
   * 🔗 레거시 가족 정보 조회 (기존 parent_id, family_code 기반)
   */
  private async getLegacyFamilyInfo(userId: string, userType: 'parent' | 'child'): Promise<LegacyFamilyInfo> {
    if (userType === 'parent') {
      // 부모인 경우: 연결된 자녀들 찾기
      const { data: children } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('parent_id', userId)
        .eq('user_type', 'child')

      return {
        childrenIds: children?.map(child => child.id) || []
      }
    } else {
      // 자녀인 경우: 부모와 가족 코드 찾기
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('parent_id, family_code')
        .eq('id', userId)
        .single()

      let childrenIds: string[] = []
      if (profile?.parent_id) {
        const { data: siblings } = await this.supabase
          .from('profiles')
          .select('id')
          .eq('parent_id', profile.parent_id)
          .eq('user_type', 'child')

        childrenIds = siblings?.map(sibling => sibling.id) || []
      }

      return {
        parent_id: profile?.parent_id,
        family_code: profile?.family_code,
        childrenIds
      }
    }
  }

  /**
   * 🚀 자동 마이그레이션 트리거 (profiles 기반)
   */
  async autoMigrateUserFamily(userId: string): Promise<{
    migrated: boolean
    family?: FamilyWithMembers
  }> {
    // profiles 기반 가족 정보 확인
    const familyInfo = await this.getCurrentUserWithFamily()
    if (familyInfo.family) {
      return { migrated: true, family: familyInfo.family }
    }

    // 가족 관계가 없는 경우
    return { migrated: false }
  }

  /**
   * 👶 자녀 사용자의 가족 정보 조회 (미션 제안 폼용)
   */
  async getChildData(userId: string): Promise<{
    profile: {
      id: string
      full_name: string
      user_type: 'parent' | 'child'
      parent_id?: string
      family_code?: string
    }
    family?: FamilyWithMembers
  }> {
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || profile.user_type !== 'child') {
      throw new Error('자녀 프로필 조회 실패')
    }

    // 새로운 가족 시스템에서 가족 정보 조회
    const family = await familyService.getCurrentUserFamily()

    return {
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        user_type: profile.user_type,
        parent_id: profile.parent_id,
        family_code: profile.family_code || family?.family_code
      },
      family
    }
  }

  /**
   * 📱 기존 UI와의 호환성을 위한 헬퍼 함수들
   */

  // 기존 connectedChildren 형태로 자녀 목록 반환 (profiles 기반)
  async getConnectedChildrenLegacyFormat(): Promise<{
    id: string
    full_name: string
    family_code: string
  }[]> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('family_code, user_type')
      .eq('id', user.id)
      .single()

    if (!profile?.family_code || !isParentRole(profile.user_type)) return []

    const { data: children } = await this.supabase
      .from('profiles')
      .select('id, full_name')
      .eq('family_code', profile.family_code)
      .in('user_type', ['son', 'daughter'])

    if (!children) return []

    return children.map(child => ({
      id: child.id,
      full_name: child.full_name,
      family_code: profile.family_code
    }))
  }

  // 기존 isParentWithChild 형태의 상태 반환 (profiles 기반)
  async getIsParentWithChild(): Promise<boolean> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('family_code, user_type')
      .eq('id', user.id)
      .single()

    if (!profile?.family_code || !isParentRole(profile.user_type)) return false

    const { count: childrenCount } = await this.supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('family_code', profile.family_code)
      .in('user_type', ['son', 'daughter'])

    return (childrenCount || 0) > 0
  }
}

// 싱글톤 인스턴스
const familyCompatibilityService = new FamilyCompatibilityService()
export default familyCompatibilityService