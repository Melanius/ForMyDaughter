/**
 * 🔗 가족 시스템 호환성 서비스
 * 
 * 기존 미션 시스템과 새로운 가족 시스템 간의 호환성을 보장하고,
 * 점진적인 전환을 지원합니다.
 */

import { createClient } from '@/lib/supabase/client'
import familyService from './familyService'
import { FamilyWithMembers, FamilyMemberWithProfile } from '@/lib/types/family'
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
   * 기존 missionSupabaseService.getCurrentUser() 스타일과 호환되도록
   * 가족 정보를 포함하여 반환합니다.
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
    familyRole?: 'father' | 'mother' | 'child'
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

    // 새로운 가족 시스템에서 가족 정보 조회
    const family = await familyService.getCurrentUserFamily()
    
    let childrenIds: string[] = []
    let familyRole: 'father' | 'mother' | 'child' | undefined

    if (family) {
      // 현재 사용자의 역할 찾기
      const currentMember = family.members.find(m => m.user_id === user.id)
      familyRole = currentMember?.role

      // 자녀 ID 목록 생성 (부모인 경우)
      if (currentMember?.role === 'father' || currentMember?.role === 'mother') {
        // family_members 테이블에서 자녀들
        const familyTableChildren = family.members
          .filter(m => m.role === 'child')
          .map(m => m.user_id)

        // 레거시 profiles 테이블에서도 자녀들을 추가로 조회 (혼재 상황 대응)
        const { data: profileChildren } = await this.supabase
          .from('profiles')
          .select('id')
          .eq('parent_id', user.id)
          .eq('user_type', 'child')

        const profileChildrenIds = profileChildren?.map(child => child.id) || []
        
        // 중복 제거하여 병합
        childrenIds = Array.from(new Set([...familyTableChildren, ...profileChildrenIds]))
        
        // profiles에서만 있는 자녀들을 family.members에도 추가
        const missingChildrenIds = profileChildrenIds.filter(id => !familyTableChildren.includes(id))
        
        if (missingChildrenIds.length > 0) {
          const { data: missingChildrenProfiles } = await this.supabase
            .from('profiles')
            .select('id, full_name, user_type, avatar_url')
            .in('id', missingChildrenIds)
          
          if (missingChildrenProfiles) {
            // 누락된 자녀들을 family.members에 추가
            const additionalMembers = missingChildrenProfiles.map(profile => ({
              id: `temp_${profile.id}`, // 임시 ID
              family_id: family.id,
              user_id: profile.id,
              role: 'child' as const,
              nickname: null,
              joined_at: new Date().toISOString(),
              is_active: true,
              profile: {
                id: profile.id,
                full_name: profile.full_name,
                user_type: profile.user_type,
                avatar_url: profile.avatar_url
              }
            }))
            
            family.members.push(...additionalMembers)
          }
        }
        
        console.log('👶 자녀 ID 및 멤버 병합 완료:', {
          familyTableChildren: familyTableChildren.length,
          profileChildrenIds: profileChildrenIds.length,
          missingChildren: missingChildrenIds.length,
          totalChildren: childrenIds.length,
          totalMembers: family.members.length,
          childrenIds
        })
      }
    } else {
      // 새로운 가족 시스템에 없는 경우, 레거시 방식으로 조회
      const legacyInfo = await this.getLegacyFamilyInfo(user.id, profile.user_type)
      childrenIds = legacyInfo.childrenIds

      // 레거시 데이터를 프로필에 추가
      profile.parent_id = legacyInfo.parent_id
      profile.family_code = legacyInfo.family_code
    }

    return {
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        user_type: profile.user_type,
        parent_id: profile.parent_id,
        family_code: profile.family_code || family?.family_code
      },
      childrenIds,
      family,
      familyRole
    }
  }

  /**
   * 👨‍👩‍👧‍👦 가족 구성원 목록 조회 (기존 코드 호환용)
   */
  async getFamilyMembers(userId?: string): Promise<{
    id: string
    full_name: string
    user_type: 'parent' | 'child'
    role?: 'father' | 'mother' | 'child'
  }[]> {
    const targetUserId = userId || (await this.supabase.auth.getUser()).data.user?.id
    if (!targetUserId) return []

    const family = await familyService.getCurrentUserFamily()
    if (!family) return []

    return family.members.map(member => ({
      id: member.user_id,
      full_name: member.profile.full_name,
      user_type: member.profile.user_type,
      role: member.role
    }))
  }

  /**
   * 🔍 특정 사용자가 다른 사용자의 미션을 볼 수 있는지 확인
   */
  async canViewMissions(viewerId: string, targetUserId: string): Promise<boolean> {
    if (viewerId === targetUserId) return true

    // 먼저 레거시 방식으로 부모-자녀 관계 확인
    const { data: viewerProfile } = await this.supabase
      .from('profiles')
      .select('user_type')
      .eq('id', viewerId)
      .single()

    const { data: targetProfile } = await this.supabase
      .from('profiles')
      .select('user_type, parent_id')
      .eq('id', targetUserId)
      .single()

    if (!viewerProfile || !targetProfile) return false

    // 부모가 자신의 자녀를 보는 경우
    if (isParentRole(viewerProfile.user_type) && targetProfile.parent_id === viewerId) {
      return true
    }

    // 새로운 가족 시스템으로도 확인
    const family = await familyService.getCurrentUserFamily()
    if (!family) return true // 레거시 시스템에서만 동작하는 경우

    const viewer = family.members.find(m => m.user_id === viewerId)
    const target = family.members.find(m => m.user_id === targetUserId)

    // family_members에 있는 경우 기존 로직 사용
    if (viewer && target) {
      // 부모는 모든 가족 구성원의 미션을 볼 수 있음
      if (viewer.role === 'father' || viewer.role === 'mother') return true
      
      // 자녀는 본인 미션만 볼 수 있음
      return false
    }

    // 하나라도 family_members에 없으면 레거시 결과 사용
    return isParentRole(viewerProfile.user_type) && targetProfile.parent_id === viewerId
  }

  /**
   * 🛡️ 특정 사용자가 다른 사용자의 미션을 관리할 수 있는지 확인
   */
  async canManageMissions(managerId: string, targetUserId: string): Promise<boolean> {
    if (managerId === targetUserId) return true

    // 먼저 레거시 방식으로 부모-자녀 관계 확인
    const { data: managerProfile } = await this.supabase
      .from('profiles')
      .select('user_type')
      .eq('id', managerId)
      .single()

    const { data: targetProfile } = await this.supabase
      .from('profiles')
      .select('user_type, parent_id')
      .eq('id', targetUserId)
      .single()

    if (!managerProfile || !targetProfile) return false

    // 부모가 자신의 자녀를 관리하는 경우
    if (isParentRole(managerProfile.user_type) && targetProfile.parent_id === managerId) {
      return true
    }

    // 새로운 가족 시스템으로도 확인
    const family = await familyService.getCurrentUserFamily()
    if (!family) return true // 레거시 시스템에서만 동작하는 경우

    const manager = family.members.find(m => m.user_id === managerId)
    const target = family.members.find(m => m.user_id === targetUserId)

    // family_members에 있는 경우 기존 로직 사용
    if (manager && target) {
      // 부모만 다른 구성원의 미션을 관리할 수 있음
      return manager.role === 'father' || manager.role === 'mother'
    }

    // 하나라도 family_members에 없으면 레거시 결과 사용
    return isParentRole(managerProfile.user_type) && targetProfile.parent_id === managerId
  }

  /**
   * 💰 용돈 정산 권한 확인
   */
  async canApproveAllowance(approverId: string, childId: string): Promise<boolean> {
    // 먼저 레거시 방식으로 부모-자녀 관계 확인
    const { data: approverProfile } = await this.supabase
      .from('profiles')
      .select('user_type')
      .eq('id', approverId)
      .single()

    const { data: childProfile } = await this.supabase
      .from('profiles')
      .select('user_type, parent_id')
      .eq('id', childId)
      .single()

    if (!approverProfile || !childProfile) return false

    // 부모가 자신의 자녀의 용돈을 승인하는 경우
    if (isParentRole(approverProfile.user_type) && 
        isChildRole(childProfile.user_type) && 
        childProfile.parent_id === approverId) {
      return true
    }

    // 새로운 가족 시스템으로도 확인
    const family = await familyService.getCurrentUserFamily()
    if (!family) return true // 레거시 시스템에서만 동작하는 경우

    const approver = family.members.find(m => m.user_id === approverId)
    const child = family.members.find(m => m.user_id === childId)

    // family_members에 있는 경우 기존 로직 사용
    if (approver && child) {
      // 부모만 자녀의 용돈을 승인할 수 있음
      return (approver.role === 'father' || approver.role === 'mother') && child.role === 'child'
    }

    // 하나라도 family_members에 없으면 레거시 결과 사용
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
   * 🚀 자동 마이그레이션 트리거
   * 
   * 사용자가 앱에 접속할 때 자동으로 가족 시스템으로 마이그레이션을 시도합니다.
   */
  async autoMigrateUserFamily(userId: string): Promise<{
    migrated: boolean
    family?: FamilyWithMembers
  }> {
    // 이미 새로운 가족 시스템에 있는지 확인
    const existingFamily = await familyService.getCurrentUserFamily()
    if (existingFamily) {
      return { migrated: true, family: existingFamily }
    }

    // 레거시 데이터가 있는지 확인
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('parent_id, family_code, user_type')
      .eq('id', userId)
      .single()

    if (!profile?.family_code && !profile?.parent_id) {
      // 가족 관계가 없는 단독 사용자
      return { migrated: false }
    }

    try {
      // TODO: 실제 마이그레이션 로직 구현
      // 현재는 수동 마이그레이션이 필요
      console.log('🔄 자동 마이그레이션 필요:', userId)
      return { migrated: false }
    } catch (error) {
      console.error('자동 마이그레이션 실패:', error)
      return { migrated: false }
    }
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

  // 기존 connectedChildren 형태로 자녀 목록 반환
  async getConnectedChildrenLegacyFormat(): Promise<{
    id: string
    full_name: string
    family_code: string
  }[]> {
    const family = await familyService.getCurrentUserFamily()
    if (!family) return []

    return family.members
      .filter(member => member.role === 'child')
      .map(member => ({
        id: member.user_id,
        full_name: member.profile.full_name,
        family_code: family.family_code
      }))
  }

  // 기존 isParentWithChild 형태의 상태 반환
  async getIsParentWithChild(): Promise<boolean> {
    const family = await familyService.getCurrentUserFamily()
    if (!family) return false

    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return false

    const currentMember = family.members.find(m => m.user_id === user.id)
    const hasChildren = family.members.some(m => m.role === 'child')

    return (currentMember?.role === 'father' || currentMember?.role === 'mother') && hasChildren
  }
}

// 싱글톤 인스턴스
const familyCompatibilityService = new FamilyCompatibilityService()
export default familyCompatibilityService