/**
 * 🎯 미션 제안 서비스
 * 
 * 자녀의 미션 제안부터 부모의 승인/거부까지
 * 전체 제안 시스템을 관리하는 서비스
 */

import { createClient } from '@/lib/supabase/client'
import { nowKST } from '@/lib/utils/dateUtils'
import { isChildRole } from '@/lib/utils/roleUtils'
import familyCompatibilityService from './familyCompatibilityService'
import missionSupabaseService from './missionSupabase'
import notificationService from './notificationService'
import {
  MissionProposal,
  MissionProposalWithProfile,
  CreateMissionProposalRequest,
  UpdateMissionProposalRequest,
  ApproveMissionProposalRequest,
  MissionProposalFilters,
  MissionProposalStats,
  SupabaseMissionProposalTable,
  MissionProposalApiResponse
} from '@/lib/types/missionProposal'

class MissionProposalService {
  private supabase = createClient()

  /**
   * 🆕 미션 제안 생성 (자녀용)
   */
  async createProposal(request: CreateMissionProposalRequest): Promise<MissionProposalApiResponse<MissionProposal>> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        return { data: null, error: '사용자 인증이 필요합니다', success: false }
      }

      // 자녀 권한 확인
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()

      // 자녀 권한 확인 (새로운 4-role 시스템 적용)
      if (!profile || !isChildRole(profile.user_type)) {
        return { data: null, error: '자녀만 미션을 제안할 수 있습니다', success: false }
      }

      // 제안 데이터 생성
      const proposalData: Omit<SupabaseMissionProposalTable, 'id' | 'created_at' | 'updated_at' | 'processed_at' | 'processed_by'> = {
        child_id: user.id,
        parent_id: request.parent_id,
        title: request.title.trim(),
        description: request.description?.trim() || null,
        mission_type: request.mission_type,
        difficulty: request.difficulty || 1, // 🆕 기본값 1로 설정
        reward_amount: request.reward_amount,
        category: request.category, // 🆕 카테고리 추가
        start_date: request.start_date, // 🆕 시작 날짜 추가
        status: 'pending',
        proposed_at: nowKST()
      }

      const { data, error } = await this.supabase
        .from('mission_proposals')
        .insert(proposalData)
        .select()
        .single()

      if (error) {
        console.error('미션 제안 생성 실패:', error)
        return { data: null, error: '미션 제안 생성에 실패했습니다', success: false }
      }

      console.log('✅ 미션 제안 생성 완료:', data.id)
      return { 
        data: this.convertFromSupabase(data), 
        error: null, 
        success: true 
      }

    } catch (error) {
      console.error('미션 제안 생성 중 오류:', error)
      return { data: null, error: '미션 제안 생성 중 오류가 발생했습니다', success: false }
    }
  }

  /**
   * 📋 미션 제안 목록 조회
   */
  async getProposals(filters: MissionProposalFilters = {}): Promise<MissionProposalApiResponse<MissionProposalWithProfile[]>> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        return { data: null, error: '사용자 인증이 필요합니다', success: false }
      }

      let query = this.supabase
        .from('mission_proposals')
        .select(`
          *,
          child_profile:profiles!mission_proposals_child_id_fkey(id, full_name, avatar_url),
          parent_profile:profiles!mission_proposals_parent_id_fkey(id, full_name),
          processor_profile:profiles!mission_proposals_processed_by_fkey(id, full_name)
        `)

      // 필터 적용
      if (filters.child_id) {
        query = query.eq('child_id', filters.child_id)
      }
      if (filters.parent_id) {
        query = query.eq('parent_id', filters.parent_id)
      }
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }
      if (filters.mission_type) {
        query = query.eq('mission_type', filters.mission_type)
      }
      if (filters.date_from) {
        query = query.gte('proposed_at', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('proposed_at', filters.date_to)
      }

      // 최신 순 정렬
      query = query.order('proposed_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('미션 제안 목록 조회 실패:', error)
        return { data: null, error: '미션 제안 목록 조회에 실패했습니다', success: false }
      }

      const proposals: MissionProposalWithProfile[] = data.map(item => ({
        ...this.convertFromSupabase(item),
        child_profile: item.child_profile,
        parent_profile: item.parent_profile,
        processor_profile: item.processor_profile
      }))

      return { data: proposals, error: null, success: true }

    } catch (error) {
      console.error('미션 제안 목록 조회 중 오류:', error)
      return { data: null, error: '미션 제안 목록 조회 중 오류가 발생했습니다', success: false }
    }
  }

  /**
   * ✅ 미션 제안 승인 (부모용)
   */
  async approveProposal(request: ApproveMissionProposalRequest): Promise<MissionProposalApiResponse<boolean>> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        return { data: null, error: '사용자 인증이 필요합니다', success: false }
      }

      // 제안 정보 조회
      const { data: proposal, error: proposalError } = await this.supabase
        .from('mission_proposals')
        .select('*')
        .eq('id', request.proposal_id)
        .single()

      if (proposalError || !proposal) {
        return { data: null, error: '제안을 찾을 수 없습니다', success: false }
      }

      // 승인 권한 확인
      const canApprove = await familyCompatibilityService.canManageMissions(user.id, proposal.child_id)
      if (!canApprove) {
        return { data: null, error: '해당 제안을 승인할 권한이 없습니다', success: false }
      }

      if (proposal.status !== 'pending') {
        return { data: null, error: '이미 처리된 제안입니다', success: false }
      }

      // 수동 승인 프로세스로 처리
      const success = await this.manualApprovalProcess(proposal, user.id, request.target_child_id)
      if (!success) {
        return { data: null, error: '미션 제안 승인에 실패했습니다', success: false }
      }

      console.log('✅ 미션 제안 승인 완료:', request.proposal_id)
      return { data: true, error: null, success: true }

    } catch (error) {
      console.error('미션 제안 승인 중 오류:', error)
      return { data: null, error: '미션 제안 승인 중 오류가 발생했습니다', success: false }
    }
  }

  /**
   * 🚫 미션 제안 거부 (부모용)
   */
  async rejectProposal(proposalId: string, reason: string): Promise<MissionProposalApiResponse<boolean>> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        return { data: null, error: '사용자 인증이 필요합니다', success: false }
      }

      // 제안 정보 조회
      const { data: proposal, error: proposalError } = await this.supabase
        .from('mission_proposals')
        .select('*')
        .eq('id', proposalId)
        .single()

      if (proposalError || !proposal) {
        return { data: null, error: '제안을 찾을 수 없습니다', success: false }
      }

      // 거부 권한 확인
      const canReject = await familyCompatibilityService.canManageMissions(user.id, proposal.child_id)
      if (!canReject) {
        return { data: null, error: '해당 제안을 거부할 권한이 없습니다', success: false }
      }

      if (proposal.status !== 'pending') {
        return { data: null, error: '이미 처리된 제안입니다', success: false }
      }

      // 제안 상태 업데이트 (🆕 거절 사유 포함)
      const { error: updateError } = await this.supabase
        .from('mission_proposals')
        .update({
          status: 'rejected',
          processed_at: nowKST(),
          processed_by: user.id,
          rejection_reason: reason.trim() // 🆕 거절 사유 저장
        })
        .eq('id', proposalId)

      if (updateError) {
        console.error('미션 제안 거부 실패:', updateError)
        return { data: null, error: '미션 제안 거부에 실패했습니다', success: false }
      }

      // 🆕 거절 알림 생성
      try {
        await notificationService.createRejectionNotification(
          proposal.child_id,
          proposal.title,
          proposal.category || '제안 미션',
          reason.trim()
        )
        console.log('✅ 거절 알림 생성 완료')
      } catch (error) {
        console.error('⚠️ 거절 알림 생성 실패:', error)
        // 알림 생성 실패는 전체 프로세스를 실패시키지 않음
      }

      console.log('✅ 미션 제안 거부 완료:', proposalId)
      return { data: true, error: null, success: true }

    } catch (error) {
      console.error('미션 제안 거부 중 오류:', error)
      return { data: null, error: '미션 제안 거부 중 오류가 발생했습니다', success: false }
    }
  }

  /**
   * 📊 미션 제안 통계 조회
   */
  async getProposalStats(parentId?: string): Promise<MissionProposalApiResponse<MissionProposalStats>> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        return { data: null, error: '사용자 인증이 필요합니다', success: false }
      }

      const targetParentId = parentId || user.id

      // 기본 통계 조회
      const { data: statsData, error: statsError } = await this.supabase
        .from('mission_proposals')
        .select('status, child_id')
        .eq('parent_id', targetParentId)

      if (statsError) {
        console.error('제안 통계 조회 실패:', statsError)
        return { data: null, error: '제안 통계 조회에 실패했습니다', success: false }
      }

      // 자녀별 통계를 위한 프로필 조회
      const { data: profilesData, error: profilesError } = await this.supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(new Set(statsData.map(item => item.child_id))))

      if (profilesError) {
        console.error('자녀 프로필 조회 실패:', profilesError)
        return { data: null, error: '자녀 정보 조회에 실패했습니다', success: false }
      }

      // 통계 계산
      const total = statsData.length
      const pending = statsData.filter(item => item.status === 'pending').length
      const approved = statsData.filter(item => item.status === 'approved').length
      const rejected = statsData.filter(item => item.status === 'rejected').length

      // 자녀별 통계
      const childStats = new Map<string, { name: string; count: number }>()
      statsData.forEach(item => {
        const profile = profilesData.find(p => p.id === item.child_id)
        if (profile) {
          const current = childStats.get(item.child_id) || { name: profile.full_name, count: 0 }
          current.count++
          childStats.set(item.child_id, current)
        }
      })

      const proposalsByChild = Array.from(childStats.entries()).map(([childId, data]) => ({
        child_id: childId,
        child_name: data.name,
        count: data.count
      }))

      const stats: MissionProposalStats = {
        total_proposals: total,
        pending_proposals: pending,
        approved_proposals: approved,
        rejected_proposals: rejected,
        proposals_by_child: proposalsByChild
      }

      return { data: stats, error: null, success: true }

    } catch (error) {
      console.error('제안 통계 조회 중 오류:', error)
      return { data: null, error: '제안 통계 조회 중 오류가 발생했습니다', success: false }
    }
  }

  /**
   * 🔄 수동 승인 프로세스 (트랜잭션이 없는 경우)
   */
  private async manualApprovalProcess(proposal: SupabaseMissionProposalTable, processedBy: string, targetChildId?: string | null): Promise<boolean> {
    try {
      // 1. 제안 상태 업데이트
      const { error: updateError } = await this.supabase
        .from('mission_proposals')
        .update({
          status: 'approved',
          processed_at: nowKST(),
          processed_by: processedBy
        })
        .eq('id', proposal.id)

      if (updateError) {
        console.error('제안 상태 업데이트 실패:', updateError)
        return false
      }

      // 2. 미션 생성
      if (proposal.mission_type === 'daily') {
        // 데일리 템플릿으로 추가
        try {
          const templateId = await missionSupabaseService.addMissionTemplate({
            title: proposal.title,
            description: proposal.description || '',
            reward: proposal.reward_amount,
            category: proposal.category || '제안 미션', // 🆕 제안된 카테고리 사용
            missionType: 'daily',
            targetChildId: targetChildId || proposal.child_id
          })
          
          if (!templateId) {
            throw new Error('템플릿 생성 실패')
          }

          console.log('✅ 데일리 템플릿 생성 완료:', templateId)
          
          // 🆕 제안된 시작 날짜 또는 오늘 날짜로 미션 인스턴스 생성
          const targetDate = proposal.start_date || new Date().toISOString().split('T')[0]
          const instanceId = await missionSupabaseService.addMissionInstance({
            userId: targetChildId || proposal.child_id,
            templateId: templateId,
            date: targetDate,
            title: proposal.title,
            description: proposal.description || '',
            reward: proposal.reward_amount,
            category: proposal.category || '제안 미션', // 🆕 제안된 카테고리 사용
            missionType: 'daily',
            isCompleted: false,
            isTransferred: false,
            isFromProposal: true, // 🆕 제안으로부터 생성됨을 표시
            proposalId: proposal.id // 🆕 원본 제안 ID 저장
          })
          
          if (!instanceId) {
            console.warn('⚠️ 미션 인스턴스 생성 실패 (템플릿은 생성됨)')
          } else {
            console.log('✅ 미션 인스턴스 생성 완료:', instanceId)
          }
          
        } catch (error) {
          console.error('템플릿 생성 실패:', error)
          // 롤백: 제안 상태를 다시 pending으로
          await this.supabase
            .from('mission_proposals')
            .update({ status: 'pending', processed_at: null, processed_by: null })
            .eq('id', proposal.id)
          return false
        }
      } else {
        // 이벤트 미션으로 추가
        try {
          // 🆕 제안된 시작 날짜 또는 오늘 날짜 사용
          const targetDate = proposal.start_date || new Date().toISOString().split('T')[0]
          const missionId = await missionSupabaseService.addMissionInstance({
            userId: targetChildId || proposal.child_id,
            templateId: null,
            date: targetDate,
            title: proposal.title,
            description: proposal.description || '',
            reward: proposal.reward_amount,
            category: proposal.category || '제안 미션', // 🆕 제안된 카테고리 사용
            missionType: 'event',
            isCompleted: false,
            isTransferred: false,
            isFromProposal: true, // 🆕 제안으로부터 생성됨을 표시
            proposalId: proposal.id // 🆕 원본 제안 ID 저장
          })
          
          if (!missionId) {
            throw new Error('이벤트 미션 생성 실패')
          }
          
          console.log('✅ 이벤트 미션 생성 완료:', missionId)
          
        } catch (error) {
          console.error('이벤트 미션 생성 실패:', error)
          // 롤백
          await this.supabase
            .from('mission_proposals')
            .update({ status: 'pending', processed_at: null, processed_by: null })
            .eq('id', proposal.id)
          return false
        }
      }

      // 🆕 승인 알림 생성
      try {
        await notificationService.createApprovalNotification(
          targetChildId || proposal.child_id,
          proposal.title,
          proposal.category || '제안 미션',
          proposal.reward_amount,
          proposal.start_date || new Date().toISOString().split('T')[0]
        )
        console.log('✅ 승인 알림 생성 완료')
      } catch (error) {
        console.error('⚠️ 승인 알림 생성 실패:', error)
        // 알림 생성 실패는 전체 프로세스를 실패시키지 않음
      }

      return true

    } catch (error) {
      console.error('수동 승인 프로세스 실패:', error)
      return false
    }
  }

  /**
   * 🔄 Supabase 데이터 변환
   */
  private convertFromSupabase(data: SupabaseMissionProposalTable): MissionProposal {
    return {
      id: data.id,
      child_id: data.child_id,
      parent_id: data.parent_id,
      title: data.title,
      description: data.description,
      mission_type: data.mission_type,
      difficulty: data.difficulty,
      reward_amount: data.reward_amount,
      category: data.category || '제안 미션', // 🆕 카테고리 필드 추가
      start_date: data.start_date || new Date().toISOString().split('T')[0], // 🆕 시작 날짜 필드 추가
      status: data.status,
      proposed_at: data.proposed_at,
      processed_at: data.processed_at,
      processed_by: data.processed_by,
      rejection_reason: data.rejection_reason, // 🆕 거절 사유 필드 추가
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }
}

// 싱글톤 인스턴스
const missionProposalService = new MissionProposalService()
export default missionProposalService