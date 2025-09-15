/**
 * 🛠️ 관리자용 가족 데이터 서비스
 * 
 * families 테이블을 통한 관리자 모니터링 및 통계 기능
 * Phase 2: 관리자용 별도 테이블 시스템
 */

import { createClient } from '@/lib/supabase/client'
import { AdminFamilyTable, AdminFamilyMember, AdminFamilyStats } from '@/lib/types/family'

class AdminFamilyService {
  private supabase = createClient()

  /**
   * 📊 전체 가족 통계 조회
   */
  async getFamilyStats(): Promise<AdminFamilyStats> {
    try {
      // 기본 통계
      const { data: statsData } = await this.supabase
        .from('families')
        .select(`
          total_members,
          parents_count,
          children_count,
          is_active
        `)

      if (!statsData) {
        return this.getEmptyStats()
      }

      const totalFamilies = statsData.length
      const activeFamilies = statsData.filter(f => f.is_active).length
      const totalUsers = statsData.reduce((sum, f) => sum + f.total_members, 0)
      const totalParents = statsData.reduce((sum, f) => sum + f.parents_count, 0)
      const totalChildren = statsData.reduce((sum, f) => sum + f.children_count, 0)

      // 가족 크기별 분포
      const sizeDistribution = new Map<number, number>()
      statsData.forEach(family => {
        const size = family.total_members
        sizeDistribution.set(size, (sizeDistribution.get(size) || 0) + 1)
      })

      const familiesBySize = Array.from(sizeDistribution.entries())
        .map(([size, count]) => ({ size, count }))
        .sort((a, b) => a.size - b.size)

      // 최근 활동 가족들
      const { data: recentActivity } = await this.supabase
        .from('families')
        .select('family_code, family_name, last_activity_at, total_members')
        .eq('is_active', true)
        .not('last_activity_at', 'is', null)
        .order('last_activity_at', { ascending: false })
        .limit(10)

      const recentActivityFormatted = recentActivity?.map(f => ({
        family_code: f.family_code,
        family_name: f.family_name,
        last_activity: f.last_activity_at || '',
        members_count: f.total_members
      })) || []

      return {
        total_families: totalFamilies,
        active_families: activeFamilies,
        total_users: totalUsers,
        total_parents: totalParents,
        total_children: totalChildren,
        families_by_size: familiesBySize,
        recent_activity: recentActivityFormatted
      }
    } catch (error) {
      console.error('가족 통계 조회 실패:', error)
      return this.getEmptyStats()
    }
  }

  /**
   * 👨‍👩‍👧‍👦 모든 가족 목록 조회 (관리자용)
   */
  async getAllFamilies(params: {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
    sortBy?: 'created_at' | 'last_activity_at' | 'total_members' | 'family_name'
    sortOrder?: 'asc' | 'desc'
  } = {}): Promise<{
    families: AdminFamilyTable[]
    total: number
    page: number
    limit: number
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = params

    try {
      let query = this.supabase
        .from('families')
        .select('*', { count: 'exact' })

      // 필터 적용
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive)
      }

      if (search) {
        query = query.or(`family_code.ilike.%${search}%,family_name.ilike.%${search}%`)
      }

      // 정렬 적용
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // 페이지네이션 적용
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        throw error
      }

      const families: AdminFamilyTable[] = (data || []).map(this.convertFromSupabase)

      return {
        families,
        total: count || 0,
        page,
        limit
      }
    } catch (error) {
      console.error('가족 목록 조회 실패:', error)
      return {
        families: [],
        total: 0,
        page,
        limit
      }
    }
  }

  /**
   * 🔍 특정 가족 상세 정보 조회
   */
  async getFamilyByCode(familyCode: string): Promise<AdminFamilyTable | null> {
    try {
      const { data, error } = await this.supabase
        .from('families')
        .select('*')
        .eq('family_code', familyCode)
        .single()

      if (error || !data) {
        return null
      }

      return this.convertFromSupabase(data)
    } catch (error) {
      console.error('가족 상세 정보 조회 실패:', error)
      return null
    }
  }

  /**
   * 🔄 동기화 상태 확인
   */
  async checkSyncStatus(): Promise<{
    status: 'synced' | 'needs_sync' | 'error'
    details: {
      family_code: string
      profiles_count: number
      families_count: number
      sync_status: string
      last_updated?: string
    }[]
  }> {
    try {
      const { data, error } = await this.supabase
        .rpc('check_families_sync_status')

      if (error) {
        throw error
      }

      const details = data || []
      const needsSync = details.some((d: any) => !d.sync_status.includes('동기화됨'))

      return {
        status: needsSync ? 'needs_sync' : 'synced',
        details: details.map((d: any) => ({
          family_code: d.family_code,
          profiles_count: d.profiles_count,
          families_count: d.families_count,
          sync_status: d.sync_status,
          last_updated: d.last_updated
        }))
      }
    } catch (error) {
      console.error('동기화 상태 확인 실패:', error)
      return {
        status: 'error',
        details: []
      }
    }
  }

  /**
   * 🔄 수동 전체 동기화 실행
   */
  async manualSyncAll(): Promise<{
    success: boolean
    syncedCount: number
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .rpc('manual_sync_all_families')

      if (error) {
        throw error
      }

      return {
        success: true,
        syncedCount: data || 0
      }
    } catch (error) {
      console.error('수동 동기화 실패:', error)
      return {
        success: false,
        syncedCount: 0,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      }
    }
  }

  /**
   * 🔧 가족 상태 업데이트 (관리자 전용)
   */
  async updateFamilyStatus(familyCode: string, isActive: boolean): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('families')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('family_code', familyCode)

      return !error
    } catch (error) {
      console.error('가족 상태 업데이트 실패:', error)
      return false
    }
  }

  /**
   * 🧹 비활성 가족 정리
   */
  async cleanupInactiveFamilies(daysInactive: number = 30): Promise<{
    success: boolean
    cleanedCount: number
    error?: string
  }> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysInactive)

      const { data, error } = await this.supabase
        .from('families')
        .update({ is_active: false })
        .lt('last_activity_at', cutoffDate.toISOString())
        .eq('is_active', true)
        .select('family_code')

      if (error) {
        throw error
      }

      return {
        success: true,
        cleanedCount: data?.length || 0
      }
    } catch (error) {
      console.error('비활성 가족 정리 실패:', error)
      return {
        success: false,
        cleanedCount: 0,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      }
    }
  }

  /**
   * 🔄 데이터 변환 유틸리티
   */
  private convertFromSupabase(data: any): AdminFamilyTable {
    return {
      id: data.id,
      family_code: data.family_code,
      family_name: data.family_name,
      members: Array.isArray(data.members) ? data.members : [],
      total_members: data.total_members || 0,
      parents_count: data.parents_count || 0,
      children_count: data.children_count || 0,
      is_active: data.is_active || false,
      last_activity_at: data.last_activity_at,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  /**
   * 📊 빈 통계 객체 반환
   */
  private getEmptyStats(): AdminFamilyStats {
    return {
      total_families: 0,
      active_families: 0,
      total_users: 0,
      total_parents: 0,
      total_children: 0,
      families_by_size: [],
      recent_activity: []
    }
  }
}

// 싱글톤 인스턴스
const adminFamilyService = new AdminFamilyService()
export default adminFamilyService