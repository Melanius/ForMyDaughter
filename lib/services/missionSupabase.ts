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
  async getCurrentUser(): Promise<{ user: unknown, profile: SupabaseProfile | null, childrenIds: string[] }> {
    const { data: { user }, error: userError } = await this.supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('사용자 정보를 가져올 수 없습니다.')
    }

    // 프로필 조회
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('id, user_type, parent_id')
      .eq('id', user.id)
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
        .eq('parent_id', user.id)

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
        user_id: user.id,
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
      .eq('user_id', user.id) // 본인 미션만 완료 가능

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
      .eq('user_id', user.id) // 본인 미션만 취소 가능

    if (error) {
      console.error('미션 완료 취소 실패:', error)
      return false
    }

    console.log('✅ 미션 완료 취소 성공:', missionId)
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
      .eq('user_id', user.id) // 본인 미션만 삭제 가능

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

    const now = new Date().toISOString()
    const { data, error } = await this.supabase
      .from('mission_templates')
      .insert({
        user_id: user.id,
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
   * 🏗️ 기본 템플릿 생성
   */
  async createDefaultTemplates(): Promise<void> {
    const { profile } = await this.getCurrentUser()

    // 자녀는 템플릿을 생성할 수 없음
    if (profile.user_type !== 'parent') {
      return
    }

    const defaultTemplates = [
      {
        title: '방 청소하기',
        description: '침실과 책상 정리정돈',
        reward: 1000,
        category: '집안일',
        missionType: 'daily' as const,
        isActive: true
      },
      {
        title: '숙제 완료하기',
        description: '오늘의 숙제를 모두 끝내기',
        reward: 1500,
        category: '공부',
        missionType: 'daily' as const,
        isActive: true
      },
      {
        title: '설거지 도와주기',
        description: '식사 후 설거지 돕기',
        reward: 800,
        category: '집안일',
        missionType: 'daily' as const,
        isActive: true
      }
    ]

    for (const template of defaultTemplates) {
      try {
        await this.addMissionTemplate(template)
      } catch (error) {
        console.warn('기본 템플릿 생성 실패:', template.title, error)
      }
    }

    console.log('✅ 기본 템플릿 생성 완료')
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
      description: supabaseData.description,
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
      templateId: supabaseData.template_id,
      date: supabaseData.date,
      title: supabaseData.title,
      description: supabaseData.description,
      reward: supabaseData.reward,
      category: supabaseData.category,
      missionType: supabaseData.mission_type,
      isCompleted: supabaseData.is_completed,
      completedAt: supabaseData.completed_at,
      isTransferred: supabaseData.is_transferred,
      createdAt: supabaseData.created_at
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
   * 🧹 정리
   */
  cleanup() {
    console.log('🧹 MissionSupabaseService 정리 완료')
  }
}

// 싱글톤 인스턴스
export const missionSupabaseService = new MissionSupabaseService()
export default missionSupabaseService