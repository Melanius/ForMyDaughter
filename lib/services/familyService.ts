/**
 * 🏠 가족 관리 서비스
 * 
 * 핵심 기능:
 * 1. 가족 생성 및 관리
 * 2. 구성원 초대 및 가입
 * 3. 역할 기반 권한 관리
 * 4. 기존 데이터와의 호환성
 */

import { createClient } from '@/lib/supabase/client'
import { 
  Family, 
  FamilyMember, 
  FamilyMemberWithProfile,
  FamilyWithMembers,
  FamilyJoinRequest,
  FamilyCreateRequest,
  FamilyStats,
  FamilyRole,
  SupabaseFamilyTable,
  SupabaseFamilyMemberTable
} from '@/lib/types/family'
import { nowKST } from '@/lib/utils/dateUtils'

class FamilyService {
  private supabase = createClient()

  /**
   * 🏗️ 새 가족 생성
   */
  async createFamily(request: FamilyCreateRequest): Promise<Family> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('사용자 인증이 필요합니다')

    // 고유한 가족 코드 생성
    const family_code = await this.generateUniqueFamilyCode()
    
    const familyData: Omit<SupabaseFamilyTable, 'id'> = {
      family_code,
      family_name: request.family_name,
      created_by: user.id,
      created_at: nowKST(),
      updated_at: nowKST()
    }

    const { data: family, error } = await this.supabase
      .from('families')
      .insert(familyData)
      .select()
      .single()

    if (error) {
      console.error('가족 생성 실패:', error)
      throw new Error('가족 생성에 실패했습니다')
    }

    // 생성자를 가족 구성원으로 추가
    await this.addFamilyMember(family.id, user.id, request.role)

    console.log(`✅ 새 가족 생성 완료: ${request.family_name} (${family_code})`)
    return this.convertFromSupabase(family)
  }

  /**
   * 🔗 기존 가족에 가입
   */
  async joinFamily(request: FamilyJoinRequest): Promise<FamilyWithMembers> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('사용자 인증이 필요합니다')

    // 가족 코드로 가족 찾기
    const family = await this.getFamilyByCode(request.family_code)
    if (!family) {
      throw new Error('유효하지 않은 가족 코드입니다')
    }

    // 이미 가족 구성원인지 확인
    const existingMember = await this.getFamilyMemberByUserId(family.id, user.id)
    if (existingMember) {
      throw new Error('이미 이 가족의 구성원입니다')
    }

    // 가족 구성원으로 추가
    await this.addFamilyMember(family.id, user.id, request.role, request.nickname)

    console.log(`✅ 가족 가입 완료: ${user.id} → ${family.family_name}`)
    return await this.getFamilyWithMembers(family.id)
  }

  /**
   * 👥 가족 구성원 추가
   */
  private async addFamilyMember(
    familyId: string, 
    userId: string, 
    role: FamilyRole, 
    nickname?: string
  ): Promise<FamilyMember> {
    const memberData: Omit<SupabaseFamilyMemberTable, 'id'> = {
      family_id: familyId,
      user_id: userId,
      role,
      nickname,
      joined_at: nowKST(),
      is_active: true
    }

    const { data: member, error } = await this.supabase
      .from('family_members')
      .insert(memberData)
      .select()
      .single()

    if (error) {
      console.error('가족 구성원 추가 실패:', error)
      throw new Error('가족 구성원 추가에 실패했습니다')
    }

    return this.convertMemberFromSupabase(member)
  }

  /**
   * 🔍 가족 코드로 가족 찾기
   */
  async getFamilyByCode(familyCode: string): Promise<Family | null> {
    const { data, error } = await this.supabase
      .from('families')
      .select('*')
      .eq('family_code', familyCode)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('가족 코드 조회 실패:', error)
      return null
    }

    return data ? this.convertFromSupabase(data) : null
  }

  /**
   * 👤 현재 사용자의 가족 정보 조회
   */
  async getCurrentUserFamily(): Promise<FamilyWithMembers | null> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return null

    // 사용자가 속한 가족 구성원 정보 조회
    const { data: member, error } = await this.supabase
      .from('family_members')
      .select(`
        *,
        families!family_members_family_id_fkey (*)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('사용자 가족 조회 실패:', error)
      return null
    }

    if (!member || !member.families) return null

    return await this.getFamilyWithMembers(member.family_id)
  }

  /**
   * 🏠 가족 상세 정보 조회 (구성원 포함)
   */
  async getFamilyWithMembers(familyId: string): Promise<FamilyWithMembers> {
    // 가족 기본 정보
    const { data: family, error: familyError } = await this.supabase
      .from('families')
      .select('*')
      .eq('id', familyId)
      .single()

    if (familyError) {
      console.error('가족 정보 조회 실패:', familyError)
      throw new Error('가족 정보를 찾을 수 없습니다')
    }

    // 가족 구성원 정보 (프로필 포함)
    const { data: members, error: membersError } = await this.supabase
      .from('family_members')
      .select(`
        *,
        profiles!family_members_user_id_fkey (
          id,
          full_name,
          user_type,
          avatar_url
        )
      `)
      .eq('family_id', familyId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true })

    if (membersError) {
      console.error('가족 구성원 조회 실패:', membersError)
      throw new Error('가족 구성원 정보를 조회할 수 없습니다')
    }

    const membersWithProfile: FamilyMemberWithProfile[] = members.map(member => ({
      id: member.id,
      family_id: member.family_id,
      user_id: member.user_id,
      role: member.role,
      nickname: member.nickname,
      joined_at: member.joined_at,
      is_active: member.is_active,
      profile: member.profiles
    }))

    return {
      ...this.convertFromSupabase(family),
      members: membersWithProfile
    }
  }

  /**
   * 📊 가족 통계 조회
   */
  async getFamilyStats(familyId: string): Promise<FamilyStats> {
    // 구성원 수 조회
    const { count: totalMembers } = await this.supabase
      .from('family_members')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', familyId)
      .eq('is_active', true)

    const { count: parentsCount } = await this.supabase
      .from('family_members')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', familyId)
      .in('role', ['father', 'mother'])
      .eq('is_active', true)

    const { count: childrenCount } = await this.supabase
      .from('family_members')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', familyId)
      .eq('role', 'child')
      .eq('is_active', true)

    return {
      total_members: totalMembers || 0,
      parents_count: parentsCount || 0,
      children_count: childrenCount || 0,
      active_missions: 0, // TODO: 미션 서비스와 연동
      completed_missions_today: 0, // TODO: 미션 서비스와 연동
      pending_allowance: 0 // TODO: 정산 서비스와 연동
    }
  }

  /**
   * ✏️ 가족 정보 업데이트
   */
  async updateFamily(familyId: string, updates: Partial<Pick<Family, 'family_name'>>): Promise<void> {
    const { error } = await this.supabase
      .from('families')
      .update({
        ...updates,
        updated_at: nowKST()
      })
      .eq('id', familyId)

    if (error) {
      console.error('가족 정보 업데이트 실패:', error)
      throw new Error('가족 정보 업데이트에 실패했습니다')
    }
  }

  /**
   * 🔄 가족 코드 재생성
   */
  async regenerateFamilyCode(familyId: string): Promise<string> {
    const newFamilyCode = await this.generateUniqueFamilyCode()

    const { error } = await this.supabase
      .from('families')
      .update({
        family_code: newFamilyCode,
        updated_at: nowKST()
      })
      .eq('id', familyId)

    if (error) {
      console.error('가족 코드 재생성 실패:', error)
      throw new Error('가족 코드 재생성에 실패했습니다')
    }

    console.log(`✅ 가족 코드 재생성 완료: ${newFamilyCode}`)
    return newFamilyCode
  }

  /**
   * 🚫 가족 구성원 제거 (비활성화)
   */
  async removeFamilyMember(memberId: string): Promise<void> {
    const { error } = await this.supabase
      .from('family_members')
      .update({ is_active: false })
      .eq('id', memberId)

    if (error) {
      console.error('가족 구성원 제거 실패:', error)
      throw new Error('가족 구성원 제거에 실패했습니다')
    }
  }

  /**
   * 🔧 유틸리티: 고유 가족 코드 생성
   */
  private async generateUniqueFamilyCode(): Promise<string> {
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const code = this.generateFamilyCode()
      
      const { data } = await this.supabase
        .from('families')
        .select('id')
        .eq('family_code', code)
        .single()

      if (!data) {
        return code // 중복되지 않는 코드 발견
      }

      attempts++
    }

    throw new Error('가족 코드 생성에 실패했습니다')
  }

  /**
   * 🎲 가족 코드 생성 (예: FAM123ABC)
   */
  private generateFamilyCode(): string {
    const prefix = 'FAM'
    const numbers = Math.floor(100 + Math.random() * 900) // 100-999
    const letters = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `${prefix}${numbers}${letters}`
  }

  /**
   * 🔍 사용자 ID로 가족 구성원 정보 조회
   */
  private async getFamilyMemberByUserId(familyId: string, userId: string): Promise<FamilyMember | null> {
    const { data, error } = await this.supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('가족 구성원 조회 실패:', error)
      return null
    }

    return data ? this.convertMemberFromSupabase(data) : null
  }

  /**
   * 🔄 Supabase 데이터 변환
   */
  private convertFromSupabase(data: SupabaseFamilyTable): Family {
    return {
      id: data.id,
      family_code: data.family_code,
      family_name: data.family_name,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  private convertMemberFromSupabase(data: SupabaseFamilyMemberTable): FamilyMember {
    return {
      id: data.id,
      family_id: data.family_id,
      user_id: data.user_id,
      role: data.role,
      nickname: data.nickname,
      joined_at: data.joined_at,
      is_active: data.is_active
    }
  }
}

// 싱글톤 인스턴스
const familyService = new FamilyService()
export default familyService