/**
 * 🎯 Supabase 기반 미션 관리 서비스
 * 
 * 핵심 기능:
 * 1. 가족 관계 기반 미션 공유 (부모 ↔ 자녀)
 * 2. Supabase 실시간 동기화
 * 3. RLS 정책 활용한 안전한 데이터 접근
 */

import { createClient } from '@/lib/supabase/client'
import { MissionTemplate, MissionInstance } from '../types/mission'

export interface SupabaseMissionTemplate {
  id: string
  user_id: string
  title: string
  description?: string
  reward: number
  category: string
  mission_type: 'daily' | 'event'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SupabaseMissionInstance {
  id: string
  user_id: string
  template_id?: string
  date: string
  title: string
  description?: string
  reward: number
  category: string
  mission_type: 'daily' | 'event'
  is_completed: boolean
  completed_at?: string
  is_transferred: boolean
  created_at: string
}

export interface SupabaseProfile {
  id: string
  user_type: 'parent' | 'child'
  parent_id?: string
}

export class MissionSupabaseService {
  private supabase = createClient()

  /**
   * 🔍 현재 사용자 정보 및 가족 관계 조회
   */
  async getCurrentUser(): Promise<{ user: unknown, profile: SupabaseProfile, childrenIds: string[] }> {
    const { data: { user }, error: userError } = await this.supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('사용자 정보를 가져올 수 없습니다.')
    }

    // 프로필 조회
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('id, user_type, parent_id')
      .eq('id', (user as { id: string }).id)
      .single()

    if (profileError || !profile) {
      throw new Error('프로필 정보를 가져올 수 없습니다.')
    }

    // 자녀 목록 조회 (부모인 경우)
    let childrenIds: string[] = []
    if (profile.user_type === 'parent') {
      const { data: children } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('parent_id', (user as { id: string }).id)

      childrenIds = children?.map(child => child.id) || []
    }

    return { user, profile, childrenIds }
  }

  /**
   * 🎯 가족 단위 미션 템플릿 조회 (부모가 생성한 것들)
   */
  async getFamilyMissionTemplates(): Promise<MissionTemplate[]> {
    const { profile, childrenIds } = await this.getCurrentUser()
    
    let creatorIds: string[]
    
    if (profile.user_type === 'parent') {
      // 부모: 본인이 생성한 템플릿
      creatorIds = [profile.id]
    } else if (profile.parent_id) {
      // 자녀: 부모가 생성한 템플릿 
      creatorIds = [profile.parent_id]
    } else {
      // 가족 연결 없음
      creatorIds = [profile.id]
    }

    const { data: templates, error } = await this.supabase
      .from('mission_templates')
      .select('*')
      .in('user_id', creatorIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('미션 템플릿 조회 실패:', error)
      return []
    }

    return (templates || []).map(this.convertSupabaseToTemplate)
  }

  /**
   * 📅 가족 단위 미션 인스턴스 조회 (특정 날짜)
   */
  async getFamilyMissionInstances(date: string): Promise<MissionInstance[]> {
    const { profile, childrenIds } = await this.getCurrentUser()
    
    let targetUserIds: string[]
    
    if (profile.user_type === 'parent') {
      // 부모: 본인 + 모든 자녀의 미션
      targetUserIds = [profile.id, ...childrenIds]
    } else {
      // 자녀: 본인 미션만
      targetUserIds = [profile.id]
    }

    const { data: instances, error } = await this.supabase
      .from('mission_instances')
      .select('*')
      .in('user_id', targetUserIds)
      .eq('date', date)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('미션 인스턴스 조회 실패:', error)
      return []
    }

    return (instances || []).map(this.convertSupabaseToInstance)
  }

  /**
   * ➕ 새 미션 생성 (인스턴스)
   */
  async addMissionInstance(mission: Omit<MissionInstance, 'id'>): Promise<string> {
    const { user } = await this.getCurrentUser()

    const { data, error } = await this.supabase
      .from('mission_instances')
      .insert({
        user_id: mission.userId || (user as { id: string }).id, // mission에서 지정된 userId 우선 사용
        template_id: mission.templateId,
        date: mission.date,
        title: mission.title,
        description: mission.description,
        reward: mission.reward,
        category: mission.category,
        mission_type: mission.missionType,
        is_completed: mission.isCompleted,
        completed_at: mission.completedAt,
        is_transferred: mission.isTransferred
      })
      .select('id')
      .single()

    if (error) {
      console.error('미션 추가 실패:', error)
      throw new Error('미션을 추가할 수 없습니다.')
    }

    console.log('✅ 미션 추가 성공:', data.id)
    return data.id
  }

  /**
   * ✅ 미션 완료 처리
   */
  async completeMission(missionId: string): Promise<boolean> {
    const { user } = await this.getCurrentUser()
    const now = new Date().toISOString()

    const { error } = await this.supabase
      .from('mission_instances')
      .update({
        is_completed: true,
        completed_at: now
      })
      .eq('id', missionId)
      .eq('user_id', (user as { id: string }).id) // 본인 미션만 완료 가능

    if (error) {
      console.error('미션 완료 실패:', error)
      return false
    }

    console.log('✅ 미션 완료 성공:', missionId)
    return true
  }

  /**
   * ↩️ 미션 완료 취소
   */
  async uncompleteMission(missionId: string): Promise<boolean> {
    const { user } = await this.getCurrentUser()

    const { error } = await this.supabase
      .from('mission_instances')
      .update({
        is_completed: false,
        completed_at: null
      })
      .eq('id', missionId)
      .eq('user_id', (user as { id: string }).id) // 본인 미션만 취소 가능

    if (error) {
      console.error('미션 완료 취소 실패:', error)
      return false
    }

    console.log('✅ 미션 완료 취소 성공:', missionId)
    return true
  }

  /**
   * ✏️ 미션 수정
   */
  async updateMissionInstance(missionId: string, updates: {
    title?: string
    description?: string
    reward?: number
    category?: string
    missionType?: 'daily' | 'event'
  }): Promise<boolean> {
    const { user } = await this.getCurrentUser()

    // 업데이트할 필드만 추출
    const updateData: Record<string, unknown> = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.reward !== undefined) updateData.reward = updates.reward
    if (updates.category !== undefined) updateData.category = updates.category
    if (updates.missionType !== undefined) updateData.mission_type = updates.missionType

    // 수정 시간 업데이트
    updateData.updated_at = new Date().toISOString()

    const { error } = await this.supabase
      .from('mission_instances')
      .update(updateData)
      .eq('id', missionId)
      .eq('user_id', (user as { id: string }).id) // 본인 미션만 수정 가능

    if (error) {
      console.error('미션 수정 실패:', error)
      return false
    }

    console.log('✅ 미션 수정 성공:', missionId, updates)
    return true
  }

  /**
   * 🗑️ 미션 삭제
   */
  async deleteMissionInstance(missionId: string): Promise<boolean> {
    const { user } = await this.getCurrentUser()

    const { error } = await this.supabase
      .from('mission_instances')
      .delete()
      .eq('id', missionId)
      .eq('user_id', (user as { id: string }).id) // 본인 미션만 삭제 가능

    if (error) {
      console.error('미션 삭제 실패:', error)
      return false
    }

    console.log('✅ 미션 삭제 성공:', missionId)
    return true
  }

  /**
   * 📝 미션 템플릿 생성 (부모만 가능)
   */
  async addMissionTemplate(template: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { user, profile } = await this.getCurrentUser()

    // 부모만 템플릿 생성 가능
    if (profile.user_type !== 'parent') {
      throw new Error('미션 템플릿은 부모만 생성할 수 있습니다.')
    }

    // 🔒 동일한 제목의 템플릿이 이미 있는지 확인 (중복 방지)
    const { data: existingTemplate, error: checkError } = await this.supabase
      .from('mission_templates')
      .select('id, title')
      .eq('title', template.title)
      .eq('user_id', (user as { id: string }).id)
      .maybeSingle()

    if (checkError) {
      console.error('템플릿 중복 체크 실패:', checkError)
    } else if (existingTemplate) {
      console.log(`🚫 동일한 제목의 템플릿 '${template.title}'이 이미 존재함 (ID: ${existingTemplate.id})`)
      return existingTemplate.id // 기존 템플릿 ID 반환
    }

    console.log(`✨ 새 템플릿 '${template.title}' 생성 시작...`)
    const now = new Date().toISOString()
    const { data, error } = await this.supabase
      .from('mission_templates')
      .insert({
        user_id: (user as { id: string }).id,
        title: template.title,
        description: template.description,
        reward: template.reward,
        category: template.category,
        mission_type: template.missionType,
        is_active: template.isActive
      })
      .select('id')
      .single()

    if (error) {
      console.error('미션 템플릿 추가 실패:', error)
      throw new Error('미션 템플릿을 추가할 수 없습니다.')
    }

    console.log('✅ 미션 템플릿 추가 성공:', data.id)
    return data.id
  }

  /**
   * ✏️ 미션 템플릿 수정 (부모만 가능)
   */
  async updateMissionTemplate(templateId: string, updates: {
    title?: string
    description?: string
    reward?: number
    category?: string
    missionType?: 'daily' | 'event'
    isActive?: boolean
  }): Promise<boolean> {
    console.log('🔧 템플릿 수정 요청:', templateId, updates)
    
    const { user, profile } = await this.getCurrentUser()
    console.log('👤 현재 사용자 정보:', { userId: (user as { id: string })?.id, userType: profile.user_type })

    // 부모만 템플릿 수정 가능
    if (profile.user_type !== 'parent') {
      throw new Error('미션 템플릿은 부모만 수정할 수 있습니다.')
    }

    // 업데이트할 필드만 추출
    const updateData: Record<string, unknown> = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.reward !== undefined) updateData.reward = updates.reward
    if (updates.category !== undefined) updateData.category = updates.category
    if (updates.missionType !== undefined) updateData.mission_type = updates.missionType
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive

    // 수정 시간 업데이트
    updateData.updated_at = new Date().toISOString()
    
    console.log('📝 업데이트 데이터:', updateData)

    const { data, error, count } = await this.supabase
      .from('mission_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('user_id', (user as { id: string }).id) // 본인이 생성한 템플릿만 수정 가능
      .select()

    console.log('🔍 Supabase 업데이트 결과:', { data, error, count })

    if (error) {
      console.error('❌ 미션 템플릿 수정 실패:', error)
      throw new Error(`미션 템플릿을 수정할 수 없습니다: ${error.message}`)
    }

    if (!data || data.length === 0) {
      console.error('⚠️ 업데이트된 행이 없습니다. 템플릿을 찾을 수 없거나 권한이 없습니다.')
      throw new Error('템플릿을 찾을 수 없거나 수정 권한이 없습니다.')
    }

    console.log('✅ 미션 템플릿 수정 성공:', templateId, updates, '업데이트된 데이터:', data)
    return true
  }

  /**
   * 🗑️ 미션 템플릿 삭제 (부모만 가능)
   */
  async deleteMissionTemplate(templateId: string): Promise<boolean> {
    const { user, profile } = await this.getCurrentUser()

    // 부모만 템플릿 삭제 가능
    if (profile.user_type !== 'parent') {
      throw new Error('미션 템플릿은 부모만 삭제할 수 있습니다.')
    }

    // 소프트 삭제 (is_active = false)를 사용하여 기존 인스턴스와의 연결 유지
    const { error } = await this.supabase
      .from('mission_templates')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('user_id', (user as { id: string }).id) // 본인이 생성한 템플릿만 삭제 가능

    if (error) {
      console.error('미션 템플릿 삭제 실패:', error)
      throw new Error('미션 템플릿을 삭제할 수 없습니다.')
    }

    console.log('✅ 미션 템플릿 삭제 성공 (비활성화):', templateId)
    return true
  }

  /**
   * 🏗️ 기본 템플릿 생성
   */
  async createDefaultTemplates(): Promise<void> {
    const { profile } = await this.getCurrentUser()

    // 자녀는 템플릿을 생성할 수 없음
    if (profile.user_type !== 'parent') {
      return
    }

    // 🔒 이미 템플릿이 있으면 생성하지 않음 (중복 방지)
    const existingTemplates = await this.getFamilyMissionTemplates()
    if (existingTemplates.length > 0) {
      console.log(`🚫 기존 템플릿 ${existingTemplates.length}개가 있어서 기본 템플릿 생성을 건너뜀`)
      return
    }

    // 🔒 부모의 첫 로그인 여부 확인 (profiles 테이블의 created_at과 현재 시간 비교)
    const { data: profileData, error: profileError } = await this.supabase
      .from('profiles')
      .select('created_at')
      .eq('id', profile.id)
      .single()

    if (profileError) {
      console.error('프로필 정보 조회 실패:', profileError)
      return
    }

    // 회원가입 후 24시간 이내에만 기본 템플릿 생성 허용
    const createdTime = new Date(profileData.created_at).getTime()
    const currentTime = new Date().getTime()
    const hoursSinceSignup = (currentTime - createdTime) / (1000 * 60 * 60)
    
    if (hoursSinceSignup > 24) {
      console.log(`🚫 회원가입 후 ${hoursSinceSignup.toFixed(1)}시간 경과로 기본 템플릿 생성을 건너뜀`)
      return
    }

    console.log(`🏗️ 부모 회원가입 후 첫 로그인 감지 (${hoursSinceSignup.toFixed(1)}시간 경과) - 기본 템플릿 1개 생성 시작...`)
    
    // 🎯 기본 템플릿 1개만 생성
    const defaultTemplate = {
      title: '방 청소하기',
      description: '침실과 책상을 깔끔하게 정리정돈해주세요',
      reward: 1000,
      category: '집안일',
      missionType: 'daily' as const,
      isActive: true
    }

    try {
      await this.addMissionTemplate(defaultTemplate)
      console.log('✅ 기본 템플릿 1개 생성 완료')
    } catch (error) {
      console.warn('기본 템플릿 생성 실패:', defaultTemplate.title, error)
    }
  }

  /**
   * 📊 오늘의 미션 생성 (템플릿 기반)
   */
  async generateDailyMissions(date: string): Promise<number> {
    const { profile, childrenIds } = await this.getCurrentUser()
    
    // 템플릿 조회
    const templates = await this.getFamilyMissionTemplates()
    const dailyTemplates = templates.filter(t => t.missionType === 'daily' && t.isActive)
    
    if (dailyTemplates.length === 0) {
      console.log('생성할 데일리 템플릿이 없습니다.')
      return 0
    }

    let createdCount = 0
    let targetUserIds: string[]

    if (profile.user_type === 'parent') {
      // 부모: 모든 자녀에게 미션 생성
      targetUserIds = childrenIds
    } else {
      // 자녀: 본인에게만 미션 생성
      targetUserIds = [profile.id]
    }

    // 각 대상 사용자에 대해 미션 생성
    for (const userId of targetUserIds) {
      for (const template of dailyTemplates) {
        try {
          // 중복 미션 체크
          const { data: existingMission } = await this.supabase
            .from('mission_instances')
            .select('id')
            .eq('user_id', userId)
            .eq('template_id', template.id)
            .eq('date', date)
            .single()

          if (existingMission) {
            console.log(`이미 존재하는 미션 스킵: ${template.title} (${userId})`)
            continue
          }

          const { error } = await this.supabase
            .from('mission_instances')
            .insert({
              user_id: userId,
              template_id: template.id,
              date,
              title: template.title,
              description: template.description,
              reward: template.reward,
              category: template.category,
              mission_type: 'daily',
              is_completed: false,
              is_transferred: false
            })

          if (!error) {
            createdCount++
          }
        } catch (error) {
          console.warn('미션 생성 실패:', template.title, error)
        }
      }
    }

    console.log(`✨ ${createdCount}개의 데일리 미션 생성됨`)
    return createdCount
  }

  /**
   * 🔧 Supabase 데이터를 앱 형식으로 변환
   */
  private convertSupabaseToTemplate(supabaseData: SupabaseMissionTemplate): MissionTemplate {
    return {
      id: supabaseData.id,
      title: supabaseData.title,
      description: supabaseData.description || '',
      reward: supabaseData.reward,
      category: supabaseData.category,
      missionType: supabaseData.mission_type,
      isActive: supabaseData.is_active,
      createdAt: supabaseData.created_at,
      updatedAt: supabaseData.updated_at
    }
  }

  private convertSupabaseToInstance(supabaseData: SupabaseMissionInstance): MissionInstance {
    return {
      id: supabaseData.id,
      userId: supabaseData.user_id,
      templateId: supabaseData.template_id || null,
      date: supabaseData.date,
      title: supabaseData.title,
      description: supabaseData.description || '',
      reward: supabaseData.reward,
      category: supabaseData.category,
      missionType: supabaseData.mission_type,
      isCompleted: supabaseData.is_completed,
      completedAt: supabaseData.completed_at || undefined,
      isTransferred: supabaseData.is_transferred
    }
  }

  /**
   * 🎧 실시간 동기화 구독
   */
  subscribeToMissions(callback: (payload: unknown) => void) {
    return this.supabase
      .channel('mission_instances')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_instances' },
        callback
      )
      .subscribe()
  }

  subscribeToTemplates(callback: (payload: unknown) => void) {
    return this.supabase
      .channel('mission_templates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_templates' },
        callback
      )
      .subscribe()
  }

  /**
   * 💸 미션 전달 완료 처리 (부모가 자녀에게 용돈 지급)
   */
  async transferMissions(missionIds: string[]): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('mission_instances')
        .update({
          is_transferred: true
        })
        .in('id', missionIds)

      if (error) {
        console.error('미션 전달 실패:', error)
        return false
      }

      console.log(`✅ ${missionIds.length}개 미션 전달 완료`)
      return true
    } catch (error) {
      console.error('미션 전달 처리 중 오류:', error)
      return false
    }
  }

  /**
   * 🧹 정리
   */
  cleanup() {
    console.log('🧹 MissionSupabaseService 정리 완료')
  }
}

// 싱글톤 인스턴스
export const missionSupabaseService = new MissionSupabaseService()
export default missionSupabaseService