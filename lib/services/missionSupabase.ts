/**
 * 🎯 Supabase 기반 미션 관리 서비스
 * 
 * 핵심 기능:
 * 1. 가족 관계 기반 미션 공유 (부모 ↔ 자녀)
 * 2. Supabase 실시간 동기화
 * 3. RLS 정책 활용한 안전한 데이터 접근
 */

import { createClient } from '@/lib/supabase/client'
import { nowKST, shouldCreateMissionForDate, getTodayKST, addDaysKST } from '../utils/dateUtils'
import { MissionTemplate, MissionInstance, RecurringPattern } from '../types/mission'
import { isParentRole, isChildRole } from '../utils/roleUtils'

export interface SupabaseMissionTemplate {
  id: string
  user_id: string
  title: string
  description?: string
  reward: number
  category: string
  mission_type: 'daily' | 'event'
  recurring_pattern?: RecurringPattern
  is_active: boolean
  target_child_id?: string | null   // 특정 자녀 대상 템플릿
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
  recurring_pattern?: RecurringPattern
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
    if (isParentRole(profile.user_type)) {
      const { data: children } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('parent_id', (user as { id: string }).id)

      childrenIds = children?.map(child => child.id) || []
    }

    return { user, profile, childrenIds }
  }

  /**
   * 🎯 가족 단위 미션 템플릿 조회 (자녀별 템플릿 + 공용 템플릿)
   */
  async getFamilyMissionTemplates(targetChildId?: string | null): Promise<MissionTemplate[]> {
    const { profile, childrenIds } = await this.getCurrentUser()
    
    let creatorIds: string[]
    let childFilter: string | null = null
    
    if (isParentRole(profile.user_type)) {
      // 부모: 본인이 생성한 템플릿만 조회
      creatorIds = [profile.id]
      
      // targetChildId가 제공되면 해당 자녀의 템플릿만 필터링
      if (targetChildId) {
        childFilter = targetChildId
      }
    } else if (profile.parent_id) {
      // 자녀: 부모가 생성한 템플릿 중 본인 대상 + 공용 템플릿
      creatorIds = [profile.parent_id]
      childFilter = profile.id // 자녀는 본인 대상 템플릿만
    } else {
      // 가족 연결 없음 - 본인 템플릿만
      creatorIds = [profile.id]
    }

    // 쿼리 생성: 생성자가 일치하고 (target_child_id가 null이거나 특정 자녀)
    let query = this.supabase
      .from('mission_templates')
      .select('*')
      .in('user_id', creatorIds)

    if (childFilter) {
      // 특정 자녀의 템플릿 + 공용 템플릿 (target_child_id가 null)
      query = query.or(`target_child_id.is.null,target_child_id.eq.${childFilter}`)
    }

    const { data: templates, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      console.error('미션 템플릿 조회 실패:', error)
      return []
    }

    console.log(`📋 템플릿 조회 결과 (childFilter: ${childFilter}):`, {
      totalCount: templates?.length || 0,
      childSpecific: templates?.filter(t => t.target_child_id === childFilter).length || 0,
      common: templates?.filter(t => t.target_child_id === null).length || 0
    })

    return (templates || []).map(this.convertSupabaseToTemplate)
  }

  /**
   * 📅 가족 단위 미션 인스턴스 조회 (특정 날짜 또는 최근 1주일)
   * @param date - 조회할 날짜
   * @param targetUserId - 특정 사용자의 미션만 조회 (선택적, 부모가 특정 자녀 선택 시 사용)
   */
  async getFamilyMissionInstances(date: string, targetUserId?: string): Promise<MissionInstance[]> {
    const { profile, childrenIds } = await this.getCurrentUser()
    
    let targetUserIds: string[]
    
    if (targetUserId) {
      // 특정 사용자 지정된 경우: 권한 검증 후 해당 사용자만
      if (isParentRole(profile.user_type)) {
        // 부모는 자녀들과 본인의 미션 볼 수 있음
        const allowedUserIds = [profile.id, ...childrenIds]
        if (allowedUserIds.includes(targetUserId)) {
          targetUserIds = [targetUserId]
        } else {
          console.warn('⚠️ 권한 없는 사용자 ID 접근 시도:', targetUserId)
          return []
        }
      } else if (profile.id === targetUserId) {
        // 자녀는 본인 미션만
        targetUserIds = [profile.id]
      } else {
        console.warn('⚠️ 자녀는 다른 사용자 미션 조회 불가:', targetUserId)
        return []
      }
    } else {
      // targetUserId가 없는 경우: 기존 로직 (가족 전체)
      if (isParentRole(profile.user_type)) {
        // 부모: 본인 + 모든 자녀의 미션
        targetUserIds = [profile.id, ...childrenIds]
      } else {
        // 자녀: 본인 미션만
        targetUserIds = [profile.id]
      }
    }

    // 🔍 날짜 범위 설정: targetUserId가 없는 경우(가족 전체 조회)만 1주일 제한 적용
    let query = this.supabase
      .from('mission_instances')
      .select('*')
      .in('user_id', targetUserIds)

    if (targetUserId) {
      // 특정 사용자 조회: 특정 날짜만 조회 (기존 동작 유지)
      query = query.eq('date', date)
    } else {
      // 가족 전체 조회: 최근 1주일로 제한 (성능 최적화)
      const oneWeekAgo = addDaysKST(getTodayKST(), -7) // 7일 전
      const today = getTodayKST()
      
      query = query
        .gte('date', oneWeekAgo)  // 7일 전 이후
        .lte('date', today)      // 오늘까지
      
      console.log(`📅 가족 전체 미션 조회 범위: ${oneWeekAgo} ~ ${today} (최근 1주일)`)
    }

    const { data: instances, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('미션 인스턴스 조회 실패:', error)
      return []
    }

    const missions = (instances || []).map(this.convertSupabaseToInstance)
    
    if (targetUserId) {
      console.log(`📅 ${date} 특정 사용자(${targetUserId}) 미션 조회: ${missions.length}개`)
    } else {
      console.log(`📅 가족 전체 미션 조회 (최근 1주일): ${missions.length}개`)
    }

    return missions
  }

  /**
   * 📅 특정 사용자의 특정 날짜 미션 조회 (데일리 + 이벤트 모두 포함)
   */
  async getMissionsForDate(userId: string, date: string): Promise<MissionInstance[]> {
    try {
      const { data: instances, error } = await this.supabase
        .from('mission_instances')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(`특정 날짜(${date}) 미션 조회 실패:`, error)
        return []
      }

      const missions = (instances || []).map(item => this.convertSupabaseToInstance(item))
      console.log(`📅 ${date} 날짜 미션 조회: 총 ${missions.length}개 (사용자: ${userId})`)
      
      const dailyCount = missions.filter(m => m.missionType === 'daily').length
      const eventCount = missions.filter(m => m.missionType === 'event').length
      console.log(`   - 데일리: ${dailyCount}개, 이벤트: ${eventCount}개`)

      return missions
    } catch (error) {
      console.error(`특정 날짜(${date}) 미션 조회 중 오류:`, error)
      return []
    }
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
        recurring_pattern: mission.recurringPattern,
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
   * ➕ 이벤트 미션을 가족 구성원에게 생성 (부모 전용)
   * @param mission - 생성할 미션 정보
   * @param targetUserIds - 미션을 받을 사용자 ID 배열 (비어있으면 모든 자녀)
   */
  async addEventMissionToFamily(
    mission: Omit<MissionInstance, 'id' | 'userId'>, 
    targetUserIds?: string[]
  ): Promise<string[]> {
    const { profile, childrenIds } = await this.getCurrentUser()

    // 부모만 가족 이벤트 미션 생성 가능
    if (!isParentRole(profile.user_type)) {
      throw new Error('가족 이벤트 미션은 부모만 생성할 수 있습니다.')
    }

    // 대상 사용자 결정
    let recipientIds: string[]
    
    if (targetUserIds && targetUserIds.length > 0) {
      // 특정 자녀들에게만 미션 생성
      recipientIds = targetUserIds.filter(id => childrenIds.includes(id))
      
      if (recipientIds.length === 0) {
        throw new Error('유효한 자녀 ID가 없습니다.')
      }
      
      console.log(`🎯 특정 자녀 ${recipientIds.length}명에게 미션 생성`)
    } else {
      // 모든 자녀에게 미션 생성 (기존 동작)
      recipientIds = childrenIds
      console.log(`👨‍👩‍👧‍👦 모든 자녀 ${recipientIds.length}명에게 미션 생성`)
    }

    if (recipientIds.length === 0) {
      throw new Error('미션을 받을 자녀가 없습니다.')
    }

    const createdIds: string[] = []
    
    // 대상 자녀들에게 미션 생성
    for (const childId of recipientIds) {
      try {
        const missionId = await this.addMissionInstance({
          ...mission,
          userId: childId
        })
        createdIds.push(missionId)
        console.log(`✅ 자녀 ${childId}에게 이벤트 미션 생성: ${missionId}`)
      } catch (error) {
        console.error(`❌ 자녀 ${childId}에게 미션 생성 실패:`, error)
      }
    }

    console.log(`🎉 총 ${createdIds.length}명의 자녀에게 이벤트 미션 생성 완료`)
    return createdIds
  }

  /**
   * ✅ 미션 완료 처리
   */
  async completeMission(missionId: string): Promise<boolean> {
    const { user } = await this.getCurrentUser()
    const now = nowKST()

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

    // 🔍 완료된 미션 상세 정보 확인
    const { data: completedMission, error: selectError } = await this.supabase
      .from('mission_instances')
      .select('id, title, mission_type, reward, is_completed, is_transferred, user_id')
      .eq('id', missionId)
      .single()

    if (!selectError && completedMission) {
      console.log('✅ 미션 완료 성공:', {
        id: missionId,
        title: completedMission.title,
        missionType: completedMission.mission_type,
        reward: completedMission.reward,
        isCompleted: completedMission.is_completed,
        isTransferred: completedMission.is_transferred,
        userId: completedMission.user_id
      })
    } else {
      console.log('✅ 미션 완료 성공 (상세 정보 조회 실패):', missionId)
    }
    
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
    if (updates.title !== undefined) updateData['title'] = updates.title
    if (updates.description !== undefined) updateData['description'] = updates.description
    if (updates.reward !== undefined) updateData['reward'] = updates.reward
    if (updates.category !== undefined) updateData['category'] = updates.category
    if (updates.missionType !== undefined) updateData['mission_type'] = updates.missionType

    // 수정 시간 업데이트
    updateData['updated_at'] = nowKST()

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
   * 🗑️ 미션 삭제 (부모/자녀 모두 가능, 권한에 따라 다른 로직)
   */
  async deleteMissionInstance(missionId: string): Promise<boolean> {
    console.log('🔍 [DELETE] 미션 삭제 시작:', { missionId })
    
    try {
      const { user, profile } = await this.getCurrentUser()
      console.log('🔍 [DELETE] 현재 사용자:', { 
        userId: user.id, 
        userType: profile.user_type,
        userName: profile.full_name 
      })

      // 먼저 미션 정보를 조회하여 권한 확인
      const { data: mission, error: fetchError } = await this.supabase
        .from('mission_instances')
        .select('id, user_id, title')
        .eq('id', missionId)
        .single()

      if (fetchError) {
        console.error('🚨 [DELETE] 미션 조회 실패:', fetchError)
        throw new Error(`미션을 찾을 수 없습니다: ${fetchError.message}`)
      }

      console.log('🔍 [DELETE] 미션 정보:', {
        missionId: mission.id,
        title: mission.title,
        userId: mission.user_id
      })

      // 권한 확인: 부모만 미션 삭제 가능
      let canDelete = false
      let deleteReason = ''
      
      if (isChildRole(profile.user_type)) {
        // 자녀: 미션 삭제 불가능
        canDelete = false
        deleteReason = '자녀는 미션을 삭제할 수 없습니다'
        console.log('🔍 [DELETE] 자녀 권한 체크:', { canDelete, deleteReason })
      } else if (isParentRole(profile.user_type)) {
        // 부모: 가족 구성원의 모든 미션 삭제 가능
        console.log('🔍 [DELETE] 가족 미션 여부 확인 중...')
        const { data: missionOwnerProfile, error: ownerError } = await this.supabase
          .from('profiles')
          .select('id, parent_id, full_name, user_type')
          .eq('id', mission.user_id)
          .single()
        
        if (ownerError) {
          console.error('🚨 [DELETE] 미션 소유자 프로필 조회 실패:', ownerError)
          canDelete = false
          deleteReason = '미션 소유자 정보를 찾을 수 없습니다'
        } else {
          console.log('🔍 [DELETE] 미션 소유자 프로필:', missionOwnerProfile)
          
          // 부모 본인의 미션이거나 자녀의 미션인 경우 삭제 가능
          if (missionOwnerProfile.id === user.id) {
            canDelete = true
            deleteReason = '부모 본인의 미션'
          } else if (missionOwnerProfile.parent_id === user.id) {
            canDelete = true
            deleteReason = '자녀의 미션'
          } else {
            canDelete = false
            deleteReason = '다른 가족의 미션'
          }
        }
        console.log('🔍 [DELETE] 부모 권한 체크:', { canDelete, deleteReason })
      }

      if (!canDelete) {
        console.error('🚨 [DELETE] 권한 없음:', { 
          userType: profile.user_type,
          reason: deleteReason 
        })
        throw new Error(`이 미션을 삭제할 권한이 없습니다 (${deleteReason})`)
      }

      console.log('✅ [DELETE] 권한 확인 완료, 삭제 실행 중...')

      // 실제 삭제 실행
      const { data: deleteData, error: deleteError } = await this.supabase
        .from('mission_instances')
        .delete()
        .eq('id', missionId)
        .select() // 삭제된 행 반환

      if (deleteError) {
        console.error('🚨 [DELETE] DB 삭제 실패:', deleteError)
        throw new Error(`미션 삭제에 실패했습니다: ${deleteError.message}`)
      }

      console.log('✅ [DELETE] DB 삭제 성공:', deleteData)

      // 삭제 확인 (삭제된 행이 반환되었는지 체크)
      if (!deleteData || deleteData.length === 0) {
        console.error('🚨 [DELETE] 삭제된 행이 없음 - RLS 정책 문제일 수 있음')
        throw new Error('미션이 삭제되지 않았습니다. 권한을 확인해주세요.')
      }

      console.log('🎉 [DELETE] 미션 삭제 완료:', { 
        missionId, 
        title: mission.title,
        deletedRows: deleteData.length 
      })
      
      return true

    } catch (error) {
      console.error('🚨 [DELETE] 전체 삭제 프로세스 실패:', error)
      // 에러를 다시 throw하여 UI에서 처리할 수 있도록
      throw error
    }
  }

  /**
   * 📝 미션 템플릿 생성 (부모만 가능)
   */
  async addMissionTemplate(template: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { user, profile } = await this.getCurrentUser()

    // 부모만 템플릿 생성 가능
    if (!isParentRole(profile.user_type)) {
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
    const now = nowKST()
    const { data, error } = await this.supabase
      .from('mission_templates')
      .insert({
        user_id: (user as { id: string }).id,
        title: template.title,
        description: template.description,
        reward: template.reward,
        category: template.category,
        mission_type: template.missionType,
        recurring_pattern: template.recurringPattern,
        is_active: template.isActive,
        target_child_id: template.targetChildId || null
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
    recurringPattern?: RecurringPattern
    isActive?: boolean
    targetChildId?: string | null
  }): Promise<boolean> {
    console.log('🔧 템플릿 수정 요청:', templateId, updates)
    
    const { user, profile } = await this.getCurrentUser()
    console.log('👤 현재 사용자 정보:', { userId: (user as { id: string })?.id, userType: profile.user_type })

    // 부모만 템플릿 수정 가능
    if (!isParentRole(profile.user_type)) {
      throw new Error('미션 템플릿은 부모만 수정할 수 있습니다.')
    }

    // 업데이트할 필드만 추출
    const updateData: Record<string, unknown> = {}
    if (updates.title !== undefined) updateData['title'] = updates.title
    if (updates.description !== undefined) updateData['description'] = updates.description
    if (updates.reward !== undefined) updateData['reward'] = updates.reward
    if (updates.category !== undefined) updateData['category'] = updates.category
    if (updates.missionType !== undefined) updateData['mission_type'] = updates.missionType
    if (updates.recurringPattern !== undefined) updateData['recurring_pattern'] = updates.recurringPattern
    if (updates.isActive !== undefined) updateData['is_active'] = updates.isActive
    if (updates.targetChildId !== undefined) updateData['target_child_id'] = updates.targetChildId

    // 수정 시간 업데이트
    updateData['updated_at'] = nowKST()
    
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
   * 🗑️ 미션 템플릿 삭제 (부모만 가능) - 소프트 삭제
   */
  async deleteMissionTemplate(templateId: string): Promise<boolean> {
    const { user, profile } = await this.getCurrentUser()

    // 부모만 템플릿 삭제 가능
    if (!isParentRole(profile.user_type)) {
      throw new Error('미션 템플릿은 부모만 삭제할 수 있습니다.')
    }

    // 소프트 삭제 (is_active = false)를 사용하여 기존 인스턴스와의 연결 유지
    const { error } = await this.supabase
      .from('mission_templates')
      .update({
        is_active: false,
        updated_at: nowKST()
      })
      .eq('id', templateId)
      .eq('user_id', (user as { id: string }).id) // 본인이 생성한 템플릿만 삭제 가능

    if (error) {
      console.error('미션 템플릿 비활성화 실패:', error)
      throw new Error('미션 템플릿을 비활성화할 수 없습니다.')
    }

    console.log('✅ 미션 템플릿 비활성화 성공:', templateId)
    return true
  }

  /**
   * 🗑️ 미션 템플릿 완전 삭제 (부모만 가능) - 하드 삭제
   */
  async hardDeleteMissionTemplate(templateId: string): Promise<boolean> {
    const { user, profile } = await this.getCurrentUser()

    // 부모만 템플릿 삭제 가능
    if (!isParentRole(profile.user_type)) {
      throw new Error('미션 템플릿은 부모만 삭제할 수 있습니다.')
    }

    console.log('🗑️ 템플릿 완전 삭제 시작:', templateId)

    try {
      // 1단계: 관련된 미션 인스턴스들의 template_id를 NULL로 설정
      const { error: updateError } = await this.supabase
        .from('mission_instances')
        .update({ template_id: null })
        .eq('template_id', templateId)

      if (updateError) {
        console.error('기존 미션 인스턴스 업데이트 실패:', updateError)
        throw new Error('기존 미션 업데이트에 실패했습니다.')
      }

      // 2단계: 템플릿 완전 삭제
      const { error: deleteError } = await this.supabase
        .from('mission_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', (user as { id: string }).id) // 본인이 생성한 템플릿만 삭제 가능

      if (deleteError) {
        console.error('미션 템플릿 완전 삭제 실패:', deleteError)
        throw new Error('미션 템플릿을 완전 삭제할 수 없습니다.')
      }

      console.log('✅ 미션 템플릿 완전 삭제 성공:', templateId)
      return true

    } catch (error) {
      console.error('미션 템플릿 완전 삭제 중 오류:', error)
      throw error
    }
  }

  /**
   * 🏗️ 기본 템플릿 생성
   */
  async createDefaultTemplates(): Promise<void> {
    const { profile } = await this.getCurrentUser()

    // 자녀는 템플릿을 생성할 수 없음
    if (!isParentRole(profile.user_type)) {
      return
    }

    // 🔒 강화된 중복 체크: 기본 템플릿 중복 생성 방지
    const existingTemplates = await this.getFamilyMissionTemplates()
    const existingTitles = existingTemplates.map(t => t.title)
    
    // 기본 템플릿 제목 목록
    const defaultTemplateTitle = '방 청소하기'
    
    // 이미 기본 템플릿이 존재하거나, 전체 템플릿이 5개 이상이면 건너뛰기
    if (existingTitles.includes(defaultTemplateTitle) || existingTemplates.length >= 5) {
      console.log(`🚫 기본 템플릿 생성 건너뜀 - 기존 템플릿: ${existingTemplates.length}개, 기본 템플릿 존재: ${existingTitles.includes(defaultTemplateTitle)}`)
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
    const { profile, childrenIds } = await this.getCurrentUser();
    
    let createdCount = 0;
    let targetUserIds: string[];

    if (isParentRole(profile.user_type)) {
      // 부모: 모든 자녀에게 개별적으로 미션 생성
      targetUserIds = childrenIds;
    } else {
      // 자녀: 본인에게만 미션 생성
      targetUserIds = [profile.id];
    }

    console.log(`🎯 데일리 미션 생성 시작 - 날짜: ${date}, 대상 사용자: ${targetUserIds.length}명`);

    // 각 대상 사용자별로 개별 템플릿 조회 및 미션 생성
    for (const userId of targetUserIds) {
      try {
        // 🔑 핵심: 각 자녀별로 개별 템플릿 조회
        const userTemplates = await this.getFamilyMissionTemplates(userId);
        const dailyTemplates = userTemplates.filter(t => t.missionType === 'daily' && t.isActive);
        
        console.log(`👤 사용자 ${userId}의 템플릿 조회:`, {
          전체템플릿: userTemplates.length,
          데일리템플릿: dailyTemplates.length,
          공용템플릿: dailyTemplates.filter(t => t.targetChildId === null).length,
          전용템플릿: dailyTemplates.filter(t => t.targetChildId === userId).length
        });
        
        if (dailyTemplates.length === 0) {
          console.log(`❌ 사용자 ${userId}의 활성 데일리 템플릿이 없습니다.`);
          continue;
        }
        
        // 🚨 안전장치: 데일리 템플릿이 너무 많으면 최대 5개로 제한
        const limitedTemplates = dailyTemplates.slice(0, 5);
        if (dailyTemplates.length > 5) {
          console.log(`⚠️ 사용자 ${userId} 템플릿 개수 제한: ${dailyTemplates.length}개 → 5개로 제한`);
        }

        // 해당 사용자의 템플릿으로만 미션 생성
        for (const template of limitedTemplates) {
          try {
            // 반복 패턴 확인 - 해당 날짜에 미션을 생성해야 하는지 체크
            const pattern = template.recurringPattern || 'daily';
            const shouldCreate = shouldCreateMissionForDate(date, pattern);
            
            // 🔍 상세한 패턴 디버깅 로그 추가
            console.log(`🔍 패턴 체크: ${template.title}`);
            console.log(`   날짜: ${date} (요일: ${new Date(date + 'T00:00:00').getDay()})`);
            console.log(`   패턴: ${pattern}`);
            console.log(`   생성 여부: ${shouldCreate}`);
            
            if (!shouldCreate) {
              console.log(`❌ 반복 패턴으로 스킵: ${template.title} (${pattern}, ${date})`);
              continue;
            } else {
              console.log(`✅ 패턴 통과: ${template.title} - 미션 생성 진행`);
            }

            // 중복 미션 체크
            const { data: existingMission } = await this.supabase
              .from('mission_instances')
              .select('id')
              .eq('user_id', userId)
              .eq('template_id', template.id)
              .eq('date', date)
              .single();

            if (existingMission) {
              console.log(`이미 존재하는 미션 스킵: ${template.title} (${userId})`);
              continue;
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
                recurring_pattern: template.recurringPattern,
                is_completed: false,
                is_transferred: false
              });

            if (!error) {
              createdCount++;
              console.log(`✅ 미션 생성 성공: ${template.title} (사용자: ${userId})`);
            } else {
              console.error(`❌ 미션 생성 DB 오류: ${template.title}`, error);
            }
          } catch (error) {
            console.warn(`⚠️ 미션 생성 실패: ${template.title} (사용자: ${userId})`, error);
          }
        }
      } catch (userError) {
        console.error(`❌ 사용자 ${userId}의 미션 생성 중 오류:`, userError);
      }
    }

    console.log(`✨ ${createdCount}개의 데일리 미션 생성됨`);
    return createdCount;
  }

  /**
   * 🔧 Supabase 데이터를 앱 형식으로 변환
   */
  private convertSupabaseToTemplate(supabaseData: SupabaseMissionTemplate): MissionTemplate {
    return {
      id: supabaseData.id,
      userId: supabaseData.user_id,
      title: supabaseData.title,
      description: supabaseData.description || '',
      reward: supabaseData.reward,
      category: supabaseData.category,
      missionType: supabaseData.mission_type,
      recurringPattern: supabaseData.recurring_pattern,
      isActive: supabaseData.is_active,
      targetChildId: supabaseData.target_child_id || null,
      createdAt: supabaseData.created_at,
      updatedAt: supabaseData.updated_at
    }
  }

  private convertSupabaseToInstance(supabaseData: SupabaseMissionInstance): MissionInstance {
    const instance: MissionInstance = {
      id: supabaseData.id,
      userId: supabaseData.user_id,
      templateId: supabaseData.template_id || null,
      date: supabaseData.date,
      title: supabaseData.title,
      description: supabaseData.description || '',
      reward: supabaseData.reward,
      category: supabaseData.category,
      missionType: supabaseData.mission_type,
      recurringPattern: supabaseData.recurring_pattern,
      isCompleted: supabaseData.is_completed,
      isTransferred: supabaseData.is_transferred
    }
    
    // Only add completedAt if it has a value
    if (supabaseData.completed_at) {
      instance.completedAt = supabaseData.completed_at
    }
    
    return instance
  }

  /**
   * 🎧 실시간 동기화 구독
   */
  subscribeToMissions(callback: (payload: unknown) => void) {
    const channel = this.supabase
      .channel(`mission_instances_${Date.now()}`) // 고유한 채널명 생성
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'mission_instances'
        },
        (payload) => {
          console.log('🎧 실시간 미션 변경:', payload)
          try {
            callback(payload)
          } catch (error) {
            console.error('실시간 구독 콜백 오류:', error)
          }
        }
      )
      .subscribe((status) => {
        console.log('🎧 구독 상태:', status)
      })

    return channel
  }

  subscribeToTemplates(callback: (payload: unknown) => void) {
    const channel = this.supabase
      .channel(`mission_templates_${Date.now()}`) // 고유한 채널명 생성
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'mission_templates'
        },
        (payload) => {
          console.log('🎧 실시간 템플릿 변경:', payload)
          try {
            callback(payload)
          } catch (error) {
            console.error('실시간 템플릿 구독 콜백 오류:', error)
          }
        }
      )
      .subscribe((status) => {
        console.log('🎧 템플릿 구독 상태:', status)
      })

    return channel
  }

  /**
   * 💰 모든 완료되었지만 승인되지 않은 미션들 조회 (최근 1주일, 누적 정산용)
   */
  async getAllPendingMissions(userId: string): Promise<MissionInstance[]> {
    try {
      console.log(`🔍 getAllPendingMissions 호출됨 - 사용자 ID: ${userId}`)
      
      // 🚀 성능 최적화: 최근 1주일로 조회 범위 제한
      const oneWeekAgo = addDaysKST(getTodayKST(), -7) // 7일 전
      const today = getTodayKST()
      
      console.log(`📅 조회 범위: ${oneWeekAgo} ~ ${today} (최근 1주일)`)

      const { data, error } = await this.supabase
        .from('mission_instances')
        .select('*')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .eq('is_transferred', false)
        .gte('date', oneWeekAgo)  // 7일 전 이후
        .lte('date', today)      // 오늘까지
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('대기 중인 미션 조회 실패:', error)
        throw error
      }

      const missions = (data || []).map(item => this.convertSupabaseToInstance(item))
      
      // 🔍 상세 디버깅 로깅 추가
      console.log(`📋 ${missions.length}개의 승인 대기 미션 조회됨 (사용자: ${userId}, 최근 1주일)`)
      console.log('🔍 조회된 미션 상세 정보:', missions.map(m => ({
        id: m.id,
        title: m.title,
        missionType: m.missionType,
        reward: m.reward,
        isCompleted: m.isCompleted,
        isTransferred: m.isTransferred,
        date: m.date
      })))
      
      const dailyMissions = missions.filter(m => m.missionType === 'daily')
      const eventMissions = missions.filter(m => m.missionType === 'event')
      
      console.log(`📊 미션 유형별 분석 (최근 1주일):`)
      console.log(`   - 데일리 미션: ${dailyMissions.length}개`)
      console.log(`   - 이벤트 미션: ${eventMissions.length}개`)
      console.log(`   - 총 금액: ${missions.reduce((sum, m) => sum + m.reward, 0)}원`)
      
      return missions
    } catch (error) {
      console.error('getAllPendingMissions 처리 중 오류:', error)
      throw error
    }
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
   * 📅 특정 템플릿으로 생성된 특정 날짜의 미션들 조회
   */
  async getMissionsByTemplateAndDate(templateId: string, date: string): Promise<MissionInstance[]> {
    try {
      const { data, error } = await this.supabase
        .from('mission_instances')
        .select('*')
        .eq('template_id', templateId)
        .eq('date', date)

      if (error) {
        console.error('템플릿별 날짜 미션 조회 실패:', error)
        throw error
      }

      return (data || []).map(item => this.convertSupabaseToInstance(item))
    } catch (error) {
      console.error('getMissionsByTemplateAndDate 처리 중 오류:', error)
      throw error
    }
  }

  /**
   * 👤 자녀 프로필 정보 조회
   */
  async getChildProfile(userId: string): Promise<{ full_name: string } | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('자녀 프로필 조회 실패:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('getChildProfile 처리 중 오류:', error)
      return null
    }
  }

  /**
   * 🗑️ 미션 템플릿 삭제 (오늘 미션도 함께 삭제 옵션)
   */
  async deleteTemplateWithTodayMissions(templateId: string, deleteToday: boolean = false): Promise<boolean> {
    const { user, profile } = await this.getCurrentUser()

    // 부모만 템플릿 삭제 가능
    if (!isParentRole(profile.user_type)) {
      throw new Error('미션 템플릿은 부모만 삭제할 수 있습니다.')
    }

    console.log('🗑️ 템플릿 삭제 시작:', { templateId, deleteToday })

    try {
      // 오늘 미션 삭제 옵션이 true인 경우
      if (deleteToday) {
        const today = nowKST().split('T')[0] // YYYY-MM-DD 형식
        
        console.log('📅 오늘 생성된 미션 삭제 중...', today)
        
        const { error: deleteTodayError } = await this.supabase
          .from('mission_instances')
          .delete()
          .eq('template_id', templateId)
          .eq('date', today)

        if (deleteTodayError) {
          console.error('오늘 미션 삭제 실패:', deleteTodayError)
          throw new Error('오늘 생성된 미션을 삭제할 수 없습니다.')
        }

        console.log('✅ 오늘 미션 삭제 완료')
      }

      // 기존 하드 삭제 로직 실행
      return await this.hardDeleteMissionTemplate(templateId)

    } catch (error) {
      console.error('템플릿 삭제 중 오류:', error)
      throw error
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