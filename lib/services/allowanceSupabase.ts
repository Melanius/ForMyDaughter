/**
 * 💰 Supabase 기반 용돈 관리 서비스
 * 
 * 핵심 기능:
 * 1. 가족 관계 기반 데이터 공유 (부모 ↔ 자녀)
 * 2. Supabase 실시간 동기화
 * 3. RLS 정책 활용한 안전한 데이터 접근
 */

import { createClient } from '@/lib/supabase/client'
import enhancedSyncService from './enhancedSync'
import { 
  AllowanceTransaction, 
  AllowanceBalance, 
  AllowanceStatistics,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES 
} from '../types/allowance'
import { getTodayKST, nowKST } from '../utils/dateUtils'

export interface SupabaseTransaction {
  id: string
  user_id: string
  date: string
  amount: number
  type: 'income' | 'expense'
  category: string
  description: string
  created_at: string
}

export interface SupabaseProfile {
  id: string
  email: string
  full_name?: string
  user_type: 'parent' | 'child'
  parent_id?: string
  family_code?: string
}

export class AllowanceSupabaseService {
  private supabase = createClient()

  /**
   * 🔍 현재 사용자 정보 및 가족 관계 조회 (기존 호환성 유지)
   */
  async getCurrentUser(): Promise<{ user: { id: string; email?: string }, profile: SupabaseProfile, childrenIds: string[] }> {
    const { data: { user }, error: userError } = await this.supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('사용자 정보를 가져올 수 없습니다.')
    }

    // 프로필 조회
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('*')
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
   * 🔍 현재 사용자 정보 및 가족 관계 조회 (부모 ID 포함)
   */
  async getCurrentUserWithParent(): Promise<{ user: unknown, profile: SupabaseProfile, childrenIds: string[], parentId: string | null }> {
    const { data: { user }, error: userError } = await this.supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('사용자 정보를 가져올 수 없습니다.')
    }

    // 프로필 조회
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('*')
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

    // 부모 ID 추가 (자녀인 경우)
    const parentId = profile.user_type === 'child' ? profile.parent_id : null
    
    console.log('🔍 [DEBUG] getCurrentUserWithParent 결과:', {
      userId: (user as { id: string }).id,
      email: (user as { email: string }).email,
      userType: profile.user_type,
      profileId: profile.id,
      parentId: parentId,
      childrenIds: childrenIds,
      profileParentId: profile.parent_id
    })

    return { user, profile, childrenIds, parentId }
  }

  /**
   * 🔧 가족 관계 연결 상태 진단 및 수정
   */
  async diagnoseFamilyConnection(): Promise<{ 
    issue: string | null, 
    fixed: boolean,
    parentProfile?: any,
    childProfile?: any 
  }> {
    try {
      const { profile } = await this.getCurrentUserWithParent()
      
      if (profile.user_type === 'child') {
        if (!profile.parent_id) {
          console.log('🚨 [진단] 자녀 계정에 parent_id가 없음')
          
          // 같은 family_code를 가진 부모 계정 찾기
          if (profile.family_code) {
            const { data: parentProfile, error } = await this.supabase
              .from('profiles')
              .select('*')
              .eq('family_code', profile.family_code)
              .eq('user_type', 'parent')
              .single()
            
            if (!error && parentProfile) {
              // parent_id 수정
              const { error: updateError } = await this.supabase
                .from('profiles')
                .update({ parent_id: parentProfile.id })
                .eq('id', profile.id)
              
              if (!updateError) {
                console.log('✅ [수정] parent_id 설정 완료:', parentProfile.id)
                return { 
                  issue: 'parent_id was null', 
                  fixed: true,
                  parentProfile,
                  childProfile: profile 
                }
              }
            }
          }
          
          return { issue: 'parent_id is null and cannot auto-fix', fixed: false }
        } else {
          console.log('✅ [진단] 자녀 계정 parent_id 정상:', profile.parent_id)
          return { issue: null, fixed: false }
        }
      } else {
        console.log('✅ [진단] 부모 계정 - 진단 불필요')
        return { issue: null, fixed: false }
      }
    } catch (error) {
      console.error('가족 관계 진단 실패:', error)
      return { issue: 'diagnosis failed', fixed: false }
    }
  }


  /**
   * 🔧 강제 가족 관계 복구 (긴급용)
   */
  async forceFixFamilyRelations(): Promise<{ success: boolean, message: string }> {
    try {
      console.log('🚨 [강제수정] 가족 관계 복구 시작...')
      
      // 현재 사용자 정보 조회
      const { user } = await this.getCurrentUser()
      const userId = (user as { id: string }).id
      
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!profile) {
        return { success: false, message: '프로필 조회 실패' }
      }

      console.log('🔧 [강제수정] 현재 프로필:', {
        id: profile.id,
        userType: profile.user_type,
        parentId: profile.parent_id,
        familyCode: profile.family_code
      })

      if (profile.user_type === 'child') {
        // 자녀 계정: family_code로 부모 찾아서 parent_id 설정
        const { data: parents } = await this.supabase
          .from('profiles')
          .select('*')
          .eq('family_code', profile.family_code)
          .eq('user_type', 'parent')

        console.log('🔧 [강제수정] 같은 family_code 부모들:', parents)

        if (parents && parents.length > 0) {
          const parent = parents[0]
          
          const { error: updateError } = await this.supabase
            .from('profiles')
            .update({ parent_id: parent.id })
            .eq('id', profile.id)

          if (!updateError) {
            console.log('✅ [강제수정] 자녀 parent_id 설정 완료:', parent.id)
            return { success: true, message: `자녀 계정의 parent_id를 ${parent.id}로 설정 완료` }
          } else {
            console.error('❌ [강제수정] parent_id 업데이트 실패:', updateError)
            return { success: false, message: 'parent_id 업데이트 실패' }
          }
        } else {
          return { success: false, message: '같은 family_code의 부모 계정을 찾을 수 없음' }
        }
      } else if (profile.user_type === 'parent') {
        // 부모 계정: family_code로 자녀들 찾아서 parent_id 설정
        const { data: children } = await this.supabase
          .from('profiles')
          .select('*')
          .eq('family_code', profile.family_code)
          .eq('user_type', 'child')

        console.log('🔧 [강제수정] 같은 family_code 자녀들:', children)

        if (children && children.length > 0) {
          let fixedCount = 0
          for (const child of children) {
            if (!child.parent_id || child.parent_id !== profile.id) {
              const { error: updateError } = await this.supabase
                .from('profiles')
                .update({ parent_id: profile.id })
                .eq('id', child.id)

              if (!updateError) {
                fixedCount++
                console.log(`✅ [강제수정] 자녀 ${child.id} parent_id 설정 완료`)
              }
            }
          }
          return { success: true, message: `${fixedCount}명의 자녀 계정 parent_id 수정 완료` }
        } else {
          return { success: false, message: '같은 family_code의 자녀 계정을 찾을 수 없음' }
        }
      }

      return { success: false, message: '처리할 수 없는 계정 유형' }
    } catch (error) {
      console.error('❌ [강제수정] 오류:', error)
      return { success: false, message: `오류 발생: ${error}` }
    }
  }

  /**
   * 🔗 승인된 가족 연결 ID 조회 (자동 승인 포함)
   */
  async getApprovedFamilyConnectionId(): Promise<string | null> {
    const { profile } = await this.getCurrentUserWithParent()
    
    console.log('🔗 [DEBUG] 가족 연결 ID 조회 시작:', {
      userId: profile.id.substring(0, 8),
      userType: profile.user_type
    })
    
    let query = this.supabase
      .from('family_connection_requests')
      .select('id, parent_id, child_id, status')
    
    if (profile.user_type === 'parent') {
      query = query.eq('parent_id', profile.id)
    } else {
      query = query.eq('child_id', profile.id)
    }
    
    const { data: connections, error } = await query
    
    if (error) {
      console.error('❌ 가족 연결 조회 실패:', error)
      return null
    }
    
    console.log('🔗 [DEBUG] 조회된 가족 연결들:', {
      totalConnections: connections?.length || 0,
      connections: connections?.map(c => ({
        id: c.id.substring(0, 8),
        parentId: c.parent_id.substring(0, 8),
        childId: c.child_id.substring(0, 8),
        status: c.status
      }))
    })
    
    // 승인된 연결 찾기
    let approvedConnection = connections?.find(c => c.status === 'approved')
    
    // 승인된 연결이 없으면 pending 연결을 자동 승인
    if (!approvedConnection && connections?.length > 0) {
      const pendingConnection = connections.find(c => c.status === 'pending')
      if (pendingConnection) {
        console.log('🔄 [AUTO_APPROVE] pending 연결을 자동 승인 중:', {
          connectionId: pendingConnection.id.substring(0, 8)
        })
        
        const { error: approveError } = await this.supabase
          .from('family_connection_requests')
          .update({ 
            status: 'approved',
            responded_at: nowKST()
          })
          .eq('id', pendingConnection.id)
          
        if (!approveError) {
          approvedConnection = { ...pendingConnection, status: 'approved' as const }
          console.log('✅ [AUTO_APPROVE] 가족 연결 자동 승인 완료!')
        } else {
          console.error('❌ [AUTO_APPROVE] 자동 승인 실패:', approveError)
        }
      }
    }
    
    console.log('🔗 [DEBUG] 최종 가족 연결 결과:', {
      found: !!approvedConnection,
      connectionId: approvedConnection?.id.substring(0, 8),
      parentId: approvedConnection?.parent_id.substring(0, 8),
      childId: approvedConnection?.child_id.substring(0, 8),
      status: approvedConnection?.status
    })
    
    return approvedConnection?.id || null
  }

  /**
   * 📊 가족 단위 거래 내역 조회 (family_connection_id 기반)
   * @param targetUserId - 특정 사용자의 거래만 조회 (선택적, 부모가 특정 자녀 선택 시 사용)
   */
  async getFamilyTransactions(targetUserId?: string): Promise<AllowanceTransaction[]> {
    const familyConnectionId = await this.getApprovedFamilyConnectionId()
    
    if (!familyConnectionId) {
      console.log('⚠️ 승인된 가족 연결이 없습니다. profiles.parent_id 관계로 조회합니다.')
      const { profile } = await this.getCurrentUserWithParent()
      
      // targetUserId가 있으면 권한 검증 후 해당 사용자의 거래 조회
      if (targetUserId) {
        console.log('🔍 [DEBUG] 권한 검증 시작:', {
          currentUserId: profile.id.substring(0, 8),
          currentUserType: profile.user_type,
          targetUserId: targetUserId.substring(0, 8)
        })
        
        // 부모인 경우: 자녀의 거래를 조회할 권한 검증
        if (profile.user_type === 'parent') {
          const { data: targetProfile, error: profileError } = await this.supabase
            .from('profiles')
            .select('id, parent_id, user_type, full_name')
            .eq('id', targetUserId)
            .single()
            
          console.log('🔍 [DEBUG] 대상 프로필 조회 결과:', {
            targetProfile,
            profileError,
            hasTargetProfile: !!targetProfile
          })
            
          if (profileError) {
            console.error('❌ 대상 프로필 조회 실패:', profileError)
            return []
          }
            
          if (!targetProfile) {
            console.warn('⚠️ 대상 프로필을 찾을 수 없음:', targetUserId.substring(0, 8))
            return []
          }
          
          console.log('🔍 [DEBUG] 부모-자녀 관계 검증:', {
            targetParentId: targetProfile.parent_id?.substring(0, 8),
            currentParentId: profile.id.substring(0, 8),
            isMatch: targetProfile.parent_id === profile.id
          })
          
          if (targetProfile.parent_id !== profile.id) {
            console.warn('⚠️ 부모가 권한 없는 자녀의 거래 조회 시도:', {
              targetUserId: targetUserId.substring(0, 8),
              targetParentId: targetProfile.parent_id?.substring(0, 8),
              currentParentId: profile.id.substring(0, 8)
            })
            return []
          }
          
          console.log('✅ [FALLBACK] profiles.parent_id로 자녀 거래 조회 승인:', {
            parentId: profile.id.substring(0, 8),
            childId: targetUserId.substring(0, 8),
            childName: targetProfile.full_name
          })
        }
        // 자녀인 경우: 본인 거래만 조회 가능
        else if (targetUserId !== profile.id) {
          console.warn('⚠️ 자녀가 다른 사용자의 거래 조회 시도:', {
            currentUserId: profile.id.substring(0, 8),
            targetUserId: targetUserId.substring(0, 8)
          })
          return []
        }
      }
      
      const userId = targetUserId || profile.id
      
      // NULL family_connection_id 거래들도 포함해서 조회
      const { data: transactions, error } = await this.supabase
        .from('allowance_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        
      if (error) {
        console.error('❌ 개인 거래 내역 조회 실패:', error)
        return []
      }
      
      console.log('📊 [FALLBACK] 조회된 거래 수:', transactions?.length || 0, {
        userId: userId.substring(0, 8),
        targetUserId: targetUserId?.substring(0, 8) || 'all',
        transactions: transactions?.slice(0, 2).map(t => ({
          id: t.id.substring(0, 8),
          user_id: t.user_id.substring(0, 8),
          amount: t.amount,
          type: t.type,
          date: t.date
        })) || []
      })
      return (transactions || []).map(this.convertSupabaseToTransaction)
    }

    console.log('🔗 [DEBUG] 가족 거래 조회:', {
      familyConnectionId: familyConnectionId.substring(0, 8),
      targetUserId: targetUserId?.substring(0, 8) || 'all'
    })

    // 쿼리 빌더 시작
    let query = this.supabase
      .from('allowance_transactions')
      .select('*')
      .eq('family_connection_id', familyConnectionId)

    // targetUserId가 지정된 경우 해당 사용자의 거래만 필터링
    if (targetUserId) {
      query = query.eq('user_id', targetUserId)
    }

    const { data: transactions, error } = await query.order('created_at', { ascending: false })

    console.log('🔗 [DEBUG] 가족 거래 쿼리 결과:', {
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.code,
      familyConnectionId: familyConnectionId.substring(0, 8),
      totalTransactions: transactions?.length || 0,
      transactions: transactions?.slice(0, 3).map(t => ({
        id: t.id.substring(0, 8),
        user_id: t.user_id.substring(0, 8),
        family_connection_id: t.family_connection_id?.substring(0, 8),
        type: t.type,
        amount: t.amount,
        description: t.description,
        date: t.date
      })) || []
    })

    if (error) {
      console.error('❌ 거래 내역 조회 실패:', error)
      return []
    }


    // AllowanceTransaction 형식으로 변환
    return (transactions || []).map(this.convertSupabaseToTransaction)
  }

  /**
   * 💳 새 거래 추가 (family_connection_id 기반)
   */
  async addTransaction(transaction: Omit<AllowanceTransaction, 'id' | 'createdAt'>): Promise<string> {
    const { user } = await this.getCurrentUser()
    const userId = (user as { id: string }).id
    
    console.log('🔍 [DEBUG] 거래 추가 시도:', {
      userId: userId.substring(0, 8),
      userEmail: (user as { email: string }).email,
      transaction: transaction
    })
    
    // 가족 연결 ID 조회
    const familyConnectionId = await this.getApprovedFamilyConnectionId()
    
    console.log('🔗 [DEBUG] 거래 추가용 가족 연결:', {
      userId: userId.substring(0, 8),
      familyConnectionId: familyConnectionId?.substring(0, 8),
      hasConnection: !!familyConnectionId
    })

    const { data, error } = await this.supabase
      .from('allowance_transactions')
      .insert({
        user_id: userId,
        family_connection_id: familyConnectionId,
        date: transaction.date,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        description: transaction.description
      })
      .select('id')
      .single()

    if (error) {
      console.error('❌ 거래 추가 실패:', error)
      throw new Error('거래를 추가할 수 없습니다.')
    }

    console.log('✅ 거래 추가 성공:', {
      transactionId: data.id,
      userId: userId.substring(0, 8),
      familyConnectionId: familyConnectionId?.substring(0, 8),
      date: transaction.date,
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description
    })

    // 🔧 [임시] allowance_balances 테이블 업데이트 제거 (스키마 오류 방지)
    // 잔액은 getCurrentBalance()에서 거래내역 기반으로 실시간 계산됨
    console.log('💰 [임시] 잔액 테이블 업데이트 건너뜀 - 거래내역 기반 계산 사용')

    // 🔄 실시간 동기화 알림 (family_connection_id 기반)
    try {
      if (familyConnectionId) {
        // 가족 연결이 있는 경우: 같은 연결 ID를 가진 모든 사용자에게 알림
        const { data: connections } = await this.supabase
          .from('family_connection_requests')
          .select('parent_id, child_id')
          .eq('id', familyConnectionId)
          .eq('status', 'approved')
          .single()
        
        if (connections) {
          const allFamilyMembers = [connections.parent_id, connections.child_id]
          const notifyTargets = allFamilyMembers.filter(memberId => memberId !== userId)
          
          console.log('🔄 [DEBUG] 가족 실시간 동기화:', {
            familyConnectionId: familyConnectionId.substring(0, 8),
            allMembers: allFamilyMembers.map(id => id.substring(0, 8)),
            notifyTargets: notifyTargets.map(id => id.substring(0, 8)),
            transactionBy: userId.substring(0, 8)
          })

          for (const targetUserId of notifyTargets) {
            enhancedSyncService.notify({
              type: 'allowance_update',
              entityId: data.id,
              data: {
                transaction_id: data.id,
                user_id: userId,
                family_connection_id: familyConnectionId,
                type: transaction.type,
                amount: transaction.amount,
                description: transaction.description,
                date: transaction.date
              },
              userId: targetUserId
            })
            
            console.log(`🔄 가족 실시간 알림 전송: ${targetUserId.substring(0, 8)}에게 거래 추가 알림`)
          }
        }
      } else {
        console.log('⚠️ 가족 연결이 없어 실시간 알림을 전송하지 않습니다.')
      }
    } catch (syncError) {
      console.error('❌ 실시간 동기화 알림 실패:', syncError)
    }

    return data.id
  }

  /**
   * ✏️ 거래 수정 (본인 거래만)
   */
  async updateTransaction(id: string, updates: Partial<AllowanceTransaction>): Promise<boolean> {
    const { user } = await this.getCurrentUser()

    const { error } = await this.supabase
      .from('allowance_transactions')
      .update({
        ...(updates.date && { date: updates.date }),
        ...(updates.amount && { amount: updates.amount }),
        ...(updates.type && { type: updates.type }),
        ...(updates.category && { category: updates.category }),
        ...(updates.description && { description: updates.description })
      })
      .eq('id', id)
      .eq('user_id', (user as { id: string }).id) // 본인 거래만 수정 가능

    if (error) {
      console.error('거래 수정 실패:', error)
      return false
    }

    console.log('✅ 거래 수정 성공:', id)
    return true
  }

  /**
   * 🗑️ 거래 삭제 (본인 거래만) - 미션 관련 거래 삭제 시 미션 상태 되돌리기
   */
  async deleteTransaction(id: string): Promise<boolean> {
    const { user } = await this.getCurrentUser()

    try {
      // 1. 삭제할 거래의 정보를 먼저 조회 (미션 관련 거래인지 확인)
      const { data: transaction, error: fetchError } = await this.supabase
        .from('allowance_transactions')
        .select('description, user_id, date, category')
        .eq('id', id)
        .eq('user_id', (user as { id: string }).id) // 본인 거래만 
        .single()

      if (fetchError) {
        console.error('거래 조회 실패:', fetchError)
        return false
      }

      // 2. 거래 삭제
      const { error: deleteError } = await this.supabase
        .from('allowance_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', (user as { id: string }).id)

      if (deleteError) {
        console.error('거래 삭제 실패:', deleteError)
        return false
      }

      // 3. 미션 관련 거래였다면 해당 미션을 미완료 상태로 되돌리기
      if (transaction?.category === INCOME_CATEGORIES.MISSION && transaction.description?.includes('미션 완료')) {
        // 설명에서 미션 ID 추출 시도 (기존 형태와 신규 형태 모두 지원)
        let missionId: string | null = null
        
        // 기존 형태: "미션 완료: 제목 (ID: xxx)" 
        const oldFormatMatch = transaction.description.match(/\(ID: ([^)]+)\)/)
        if (oldFormatMatch && oldFormatMatch[1]) {
          missionId = oldFormatMatch[1]
        }
        
        // 신규 형태에서는 미션 제목으로 역추적하는 방식으로 향후 개선 예정
        // 현재는 기존 ID 형태가 없으면 날짜 기준으로 되돌리기
        
        if (missionId) {
          await this.revertMissionFromTransaction(missionId, transaction.user_id)
        } else {
          // ID를 찾을 수 없으면 해당 날짜의 전달된 미션들을 되돌리기
          await this.revertMissionsForDate(transaction.date, transaction.user_id)
        }
      }

      console.log('✅ 거래 삭제 성공:', id)
      return true
    } catch (error) {
      console.error('거래 삭제 중 오류:', error)
      return false
    }
  }

  /**
   * 🔄 미션 관련 거래 삭제 시 미션 상태 되돌리기
   */
  private async revertMissionFromTransaction(missionId: string, userId: string): Promise<void> {
    try {
      // missionSupabaseService를 직접 import해서 사용해야 함
      // 하지만 순환 참조를 피하기 위해 Supabase 클라이언트를 직접 사용
      const { error } = await this.supabase
        .from('mission_instances')
        .update({
          is_completed: false,
          completed_at: null,
          is_transferred: false // 전달 상태도 되돌리기
        })
        .eq('id', missionId)
        .eq('user_id', userId) // 보안을 위해 사용자 확인

      if (error) {
        console.error('미션 상태 되돌리기 실패:', error)
        throw new Error(`미션 상태 되돌리기 실패: ${missionId}`)
      }

      console.log('✅ 미션 상태 되돌리기 성공:', missionId)
    } catch (error) {
      console.error('미션 되돌리기 중 오류:', error)
      // 오류가 발생해도 거래 삭제는 이미 완료되었으므로 throw하지 않고 로그만 남김
    }
  }

  /**
   * 🔄 특정 날짜의 전달된 미션들을 되돌리기 (미션 ID를 찾을 수 없을 때)
   */
  private async revertMissionsForDate(date: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('mission_instances')
        .update({
          is_completed: false,
          completed_at: null,
          is_transferred: false
        })
        .eq('date', date)
        .eq('user_id', userId)
        .eq('is_transferred', true) // 전달된 미션들만

      if (error) {
        console.error('날짜별 미션 되돌리기 실패:', error)
        throw new Error(`날짜별 미션 되돌리기 실패: ${date}`)
      }

      console.log('✅ 날짜별 미션 되돌리기 성공:', date)
    } catch (error) {
      console.error('날짜별 미션 되돌리기 중 오류:', error)
      // 오류가 발생해도 거래 삭제는 이미 완료되었으므로 throw하지 않고 로그만 남김
    }
  }

  /**
   * 📅 날짜별 거래 내역 조회
   */
  async getTransactionsByDate(date: string): Promise<AllowanceTransaction[]> {
    const transactions = await this.getFamilyTransactions()
    return transactions.filter(t => t.date === date)
  }

  /**
   * 📊 기간별 거래 내역 조회
   */
  async getTransactionsInRange(startDate: string, endDate: string, targetUserId?: string): Promise<AllowanceTransaction[]> {
    const transactions = await this.getFamilyTransactions(targetUserId)
    return transactions.filter(t => t.date >= startDate && t.date <= endDate)
  }

  /**
   * 💰 현재 잔액 계산 (가족 단위)
   */
  async getCurrentBalance(): Promise<number> {
    const { user } = await this.getCurrentUser()
    const userId = (user as { id: string }).id
    
    console.log('💰 [임시] getCurrentBalance - 거래 내역 기반 계산 시작')

    // 🔧 임시 해결책: allowance_balances 의존성 제거, 직접 거래내역으로 계산
    const transactions = await this.getFamilyTransactions()
    const today = getTodayKST()

    const totalIncome = transactions
      .filter(t => t.type === 'income' && t.date <= today)
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter(t => t.type === 'expense' && t.date <= today)
      .reduce((sum, t) => sum + t.amount, 0)

    const calculatedBalance = totalIncome - totalExpense

    console.log('💰 [임시] 잔액 계산 완료:', {
      userId: userId.substring(0, 8),
      totalIncome,
      totalExpense,
      calculatedBalance,
      transactionCount: transactions.length
    })

    return calculatedBalance
  }

  /**
   * 💰 특정 사용자의 현재 잔액 조회 (부모-자녀 동기화용)
   * 🔧 임시 해결책: allowance_balances 테이블 완전 우회, 거래내역 기반 계산만 사용
   */
  async getCurrentBalanceForUser(userId: string): Promise<number> {
    console.log('💰 [임시] getCurrentBalanceForUser - 거래내역 기반 계산 시작')
    
    const { data: transactions, error } = await this.supabase
      .from('allowance_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('사용자 거래내역 조회 실패:', error)
      return 0
    }

    const today = getTodayKST()
    
    const totalIncome = transactions
      .filter(t => t.type === 'income' && t.date <= today)
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter(t => t.type === 'expense' && t.date <= today)
      .reduce((sum, t) => sum + t.amount, 0)

    const calculatedBalance = totalIncome - totalExpense

    console.log('💰 [임시] getCurrentBalanceForUser 계산 완료:', {
      userId: userId.substring(0, 8),
      totalIncome,
      totalExpense,
      calculatedBalance
    })

    return calculatedBalance
  }

  /**
   * 📈 통계 정보 조회 (기간별 필터링 지원)
   */
  async getStatistics(params?: {
    type?: 'preset' | 'custom'
    preset?: 'current_month' | 'last_3months' | 'this_year' | 'last_year'
    custom?: { startMonth: string, endMonth: string } // 'YYYY-MM' format
  }, targetUserId?: string): Promise<AllowanceStatistics> {
    try {
      const now = new Date()
      // targetUserId가 있으면 해당 사용자의 잔액, 없으면 현재 사용자 잔액
      const currentBalance = targetUserId 
        ? await this.getCurrentBalanceForUser(targetUserId)
        : await this.getCurrentBalance()
      
      // 기본값: 이번 달
      const defaultParams = { type: 'preset' as const, preset: 'current_month' as const }
      const finalParams = params || defaultParams
      
      let transactions: AllowanceTransaction[]
      let periodLabel = ''
      
      if (finalParams.type === 'custom' && finalParams.custom) {
        // 커스텀 기간
        const { startMonth, endMonth } = finalParams.custom
        const startDate = `${startMonth}-01`
        
        // 종료 월의 마지막 날 계산
        const endYear = parseInt(endMonth.split('-')[0])
        const endMonthNum = parseInt(endMonth.split('-')[1])
        const lastDay = new Date(endYear, endMonthNum, 0).getDate()
        const endDate = `${endMonth}-${lastDay.toString().padStart(2, '0')}`
        
        transactions = await this.getTransactionsInRange(startDate, endDate, targetUserId)
        periodLabel = `${startMonth} ~ ${endMonth}`
      } else {
        // 프리셋 기간
        const preset = finalParams.preset || 'current_month'
        let startDate: string
        let endDate: string
        
        switch (preset) {
          case 'current_month':
            startDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`
            endDate = getTodayKST()
            periodLabel = '이번 달'
            break
            
          case 'last_3months':
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
            startDate = `${threeMonthsAgo.getFullYear()}-${(threeMonthsAgo.getMonth() + 1).toString().padStart(2, '0')}-01`
            endDate = getTodayKST()
            periodLabel = '지난 3개월'
            break
            
          case 'this_year':
            startDate = `${now.getFullYear()}-01-01`
            endDate = getTodayKST()
            periodLabel = `${now.getFullYear()}년`
            break
            
          case 'last_year':
            const lastYear = now.getFullYear() - 1
            startDate = `${lastYear}-01-01`
            endDate = `${lastYear}-12-31`
            periodLabel = `${lastYear}년`
            break
            
          default:
            startDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`
            endDate = getTodayKST()
            periodLabel = '이번 달'
        }
        
        transactions = await this.getTransactionsInRange(startDate, endDate, targetUserId)
      }

      const income = transactions.filter(t => t.type === 'income')
      const expenses = transactions.filter(t => t.type === 'expense')

      const totalIncome = income.reduce((sum, t) => sum + t.amount, 0)
      const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0)

      // 카테고리별 지출 통계
      const categoryStats = new Map<string, number>()
      expenses.forEach(t => {
        categoryStats.set(t.category, (categoryStats.get(t.category) || 0) + t.amount)
      })

      const topCategories = Array.from(categoryStats.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      // 최근 거래 내역
      const recentTransactions = transactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)

      return {
        currentBalance,
        totalIncome,
        totalExpense,
        monthlyIncome: totalIncome, // 선택된 기간의 총 수입
        monthlyExpense: totalExpense, // 선택된 기간의 총 지출
        topCategories,
        recentTransactions,
        periodLabel // 선택된 기간 라벨 추가
      }
    } catch (error) {
      console.error('통계 조회 실패:', error)
      return {
        currentBalance: 0,
        totalIncome: 0,
        totalExpense: 0,
        monthlyIncome: 0,
        monthlyExpense: 0,
        topCategories: [],
        recentTransactions: [],
        periodLabel: '오류'
      }
    }
  }

  /**
   * 🎯 미션 완료 시 자동 수입 추가 (현재 사용자)
   */
  async addMissionIncome(missionId: string, amount: number, missionTitle: string, date: string): Promise<string> {
    return await this.addTransaction({
      type: 'income',
      amount,
      description: `미션 완료: ${missionTitle}`,
      category: INCOME_CATEGORIES.MISSION,
      date,
      missionId
    })
  }

  /**
   * 💸 미션 승인 시 자녀 계정에 수입 추가 (특정 사용자 ID 지정)
   */
  async addMissionIncomeForUser(userId: string, missionId: string, amount: number, missionTitle: string, date: string): Promise<string> {
    // 🔗 해당 사용자의 가족 연결 ID 조회
    console.log('🎯 [DEBUG] 미션 수입 추가:', {
      userId: userId.substring(0, 8),
      missionTitle,
      amount
    })
    
    // 임시로 현재 인증된 사용자 정보를 저장하고 대상 사용자로 변경
    const originalProfile = await this.getCurrentUserWithParent()
    
    // 대상 사용자의 가족 연결 ID 조회를 위해 임시로 프로필 설정
    const { data: targetProfile } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      
    if (!targetProfile) {
      throw new Error('대상 사용자 프로필을 찾을 수 없습니다.')
    }
    
    let familyConnectionId: string | null = null
    
    // 대상 사용자의 가족 연결 조회
    if (targetProfile.user_type === 'child') {
      const { data: connection } = await this.supabase
        .from('family_connection_requests')
        .select('id')
        .eq('child_id', userId)
        .eq('status', 'approved')
        .single()
      familyConnectionId = connection?.id || null
    } else if (targetProfile.user_type === 'parent') {
      const { data: connection } = await this.supabase
        .from('family_connection_requests')
        .select('id')
        .eq('parent_id', userId)
        .eq('status', 'approved')
        .single()
      familyConnectionId = connection?.id || null
    }
    
    console.log('🔗 [DEBUG] 미션 수입용 가족 연결:', {
      userId: userId.substring(0, 8),
      userType: targetProfile.user_type,
      familyConnectionId: familyConnectionId?.substring(0, 8)
    })

    const { data, error } = await this.supabase
      .from('allowance_transactions')
      .insert({
        user_id: userId,
        family_connection_id: familyConnectionId,
        date: date,
        amount: amount,
        type: 'income',
        category: INCOME_CATEGORIES.MISSION,
        description: `🎯 미션 완료 - ${missionTitle}` // 초등학생 친화적 형태로 변경
      })
      .select('id')
      .single()

    if (error) {
      console.error('거래 추가 실패:', error)
      throw new Error('거래를 추가할 수 없습니다.')
    }

    // 🔧 [임시] allowance_balances 테이블 업데이트 제거 (스키마 오류 방지)
    // 잔액은 getCurrentBalanceForUser()에서 거래내역 기반으로 실시간 계산됨
    console.log('💰 [임시] 잔액 테이블 업데이트 건너뜀 - 거래내역 기반 계산 사용')

    console.log('✅ 자녀 계정에 미션 수입 추가 성공:', data.id)
    return data.id
  }

  /**
   * 🔄 미션 되돌리기 시 수입 제거
   */
  async removeMissionIncome(missionId: string): Promise<boolean> {
    try {
      const { user } = await this.getCurrentUser()
      
      // 기존 형태와 새 형태 모두 검색
      // 1. 기존 형태: description에 ID가 포함된 경우
      let { data: missionTransactions, error } = await this.supabase
        .from('allowance_transactions')
        .select('id, description')
        .eq('user_id', (user as { id: string }).id)
        .eq('category', INCOME_CATEGORIES.MISSION)
        .like('description', `%ID: ${missionId}%`)

      // 2. 새 형태: description에 ID가 없는 경우, 시간과 타이틀로 추정
      if ((!missionTransactions || missionTransactions.length === 0)) {
        console.log('ID 기반 검색 실패, 최근 미션 거래로 재시도...')
        
        const { data: recentMissions, error: recentError } = await this.supabase
          .from('allowance_transactions')
          .select('id, description, created_at')
          .eq('user_id', (user as { id: string }).id)
          .eq('category', INCOME_CATEGORIES.MISSION)
          .order('created_at', { ascending: false })
          .limit(10) // 최근 10개만 검사
        
        if (recentError) {
          console.error('최근 미션 검색 실패:', recentError)
          return false
        }
        
        missionTransactions = recentMissions || []
      }

      if (!missionTransactions || missionTransactions.length === 0) {
        console.log('해당 미션의 거래 내역을 찾을 수 없음:', missionId)
        return false
      }

      // 첫 번째 매칭되는 거래 삭제
      const firstTransaction = missionTransactions[0]
      if (!firstTransaction) {
        console.log('거래 데이터가 유효하지 않음')
        return false
      }
      return await this.deleteTransaction(firstTransaction.id)
    } catch (error) {
      console.error('미션 수입 제거 실패:', error)
      return false
    }
  }

  /**
   * 🔧 Supabase 데이터를 앱 형식으로 변환
   */
  private convertSupabaseToTransaction(supabaseData: SupabaseTransaction): AllowanceTransaction {
    // 미션 완료 거래에서 ID 부분 제거
    let cleanDescription = supabaseData.description
    if (supabaseData.category === INCOME_CATEGORIES.MISSION && supabaseData.description) {
      // 기존 형태: "미션 완료: 제목 (ID: xxx)" → "🎯 미션 완료 - 제목"
      // 새 형태: "🎯 미션 완료 - 제목" (그대로 유지)
      cleanDescription = supabaseData.description.replace(/\s*\(ID:\s*[^)]+\)\s*$/, '')
      
      // 기존 형태를 새 형태로 변환
      if (cleanDescription.startsWith('미션 완료:')) {
        const title = cleanDescription.replace(/^미션 완료:\s*/, '').trim()
        cleanDescription = `🎯 미션 완료 - ${title}`
      }
    }

    return {
      id: supabaseData.id,
      type: supabaseData.type,
      amount: supabaseData.amount,
      description: cleanDescription,
      category: supabaseData.category,
      date: supabaseData.date,
      createdAt: supabaseData.created_at
    }
  }

  /**
   * 🎧 실시간 동기화 구독
   */
  async subscribeToTransactions(callback: (payload: unknown) => void) {
    try {
      // 현재 사용자의 가족 정보 조회
      const { profile, childrenIds, parentId } = await this.getCurrentUserWithParent()
      
      let targetUserIds: string[]
      if (profile.user_type === 'parent') {
        // 부모: 본인 + 모든 자녀의 거래 구독
        targetUserIds = [profile.id, ...childrenIds]
      } else {
        // 자녀: 본인 + 부모의 거래 구독
        targetUserIds = parentId ? [profile.id, parentId] : [profile.id]
      }

      console.log('📡 [DEBUG] 실시간 구독 설정:', {
        userType: profile.user_type,
        profileId: profile.id,
        targetUserIds,
        parentId,
        childrenIds
      })

      return this.supabase
        .channel('family_allowance_transactions')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'allowance_transactions',
            // RLS가 설정되어 있다면 추가 필터링은 RLS에서 처리
          },
          (payload) => {
            console.log('📡 [DEBUG] 실시간 데이터베이스 변경 감지:', {
              event: payload.eventType,
              userId: (payload.new as any)?.user_id || (payload.old as any)?.user_id,
              targetUserIds,
              isRelevant: targetUserIds.includes((payload.new as any)?.user_id || (payload.old as any)?.user_id)
            })

            // 가족 구성원의 거래인지 확인 후 콜백 실행
            const changedUserId = (payload.new as any)?.user_id || (payload.old as any)?.user_id
            if (targetUserIds.includes(changedUserId)) {
              console.log('✅ 가족 구성원의 거래 변경, 콜백 실행')
              callback(payload)
            } else {
              console.log('🚫 다른 가족의 거래, 무시')
            }
          }
        )
        .subscribe()
    } catch (error) {
      console.error('❌ 실시간 구독 설정 실패:', error)
      // 실패 시 기본 구독으로 폴백
      return this.supabase
        .channel('allowance_transactions_fallback')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'allowance_transactions' },
          callback
        )
        .subscribe()
    }
  }

  /**
   * 🏦 자녀 초기 지갑 설정 - 임시 버전 (테이블 의존성 없음)
   * 
   * @param childId 자녀 사용자 ID
   * @param initialBalance 초기 잔액 (기본: 0원)
   */
  async initializeChildWallet(childId: string, initialBalance: number = 0): Promise<void> {
    console.log('🏦 [임시] 자녀 지갑 초기화 시작 (테이블 우회):', {
      childId: childId.substring(0, 8),
      initialBalance
    })

    try {
      // 💡 임시 해결책: allowance_balances 테이블 생성을 건너뛰고
      // 필요 시에만 초기 거래 내역으로 지갑 시작
      
      if (initialBalance > 0) {
        console.log('💰 초기 거래 내역 생성 시도...')
        await this.addTransaction({
          date: getTodayKST(),
          amount: initialBalance,
          type: 'income',
          category: '초기지급',
          description: '지갑 개설 축하금'
        })
        console.log('✅ 초기 거래 내역 생성 완료')
      }

      console.log('✅ [임시] 자녀 지갑 초기화 완료 (거래 내역 기반)')

    } catch (error) {
      console.warn('⚠️ [임시] 자녀 지갑 초기화 실패 (정상 동작):', error instanceof Error ? error.message : error)
      // 에러를 던지지 않고 로그만 남김 (정상 진행)
    }
  }

  /**
   * 🧹 정리
   */
  cleanup() {
    console.log('🧹 AllowanceSupabaseService 정리 완료')
  }
}

// 싱글톤 인스턴스
export const allowanceSupabaseService = new AllowanceSupabaseService()
export default allowanceSupabaseService