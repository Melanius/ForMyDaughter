/**
 * 🔄 기존 데이터 마이그레이션 스크립트
 * 
 * 기존의 profiles 테이블 구조에서 새로운 가족 시스템으로 데이터를 이전합니다.
 * 
 * 기존 구조:
 * - profiles.parent_id (단일 부모 관계)
 * - profiles.family_code (문자열 기반)
 * 
 * 새 구조:
 * - families 테이블
 * - family_members 테이블 (M:N 관계)
 */

import { createClient } from '@/lib/supabase/client'
import { nowKST } from '@/lib/utils/dateUtils'

interface LegacyProfile {
  id: string
  full_name: string
  user_type: 'parent' | 'child'
  parent_id?: string
  family_code?: string
  created_at: string
}

interface MigrationResult {
  success: boolean
  message: string
  stats: {
    families_created: number
    members_migrated: number
    errors: number
  }
}

class FamilyDataMigrator {
  private supabase = createClient()

  /**
   * 🚀 메인 마이그레이션 실행
   */
  async migrate(): Promise<MigrationResult> {
    console.log('🔄 가족 데이터 마이그레이션 시작...')
    
    const stats = {
      families_created: 0,
      members_migrated: 0,
      errors: 0
    }

    try {
      // 1. 기존 프로필 데이터 조회
      const legacyProfiles = await this.getLegacyProfiles()
      console.log(`📊 발견된 프로필: ${legacyProfiles.length}개`)

      // 2. 가족 그룹 분석
      const familyGroups = this.analyzeFamilyGroups(legacyProfiles)
      console.log(`👨‍👩‍👧‍👦 분석된 가족 그룹: ${familyGroups.length}개`)

      // 3. 각 가족 그룹을 새 시스템으로 마이그레이션
      for (const group of familyGroups) {
        try {
          await this.migrateFamilyGroup(group)
          stats.families_created++
          stats.members_migrated += group.members.length
          console.log(`✅ ${group.family_code} 그룹 마이그레이션 완료`)
        } catch (error) {
          console.error(`❌ ${group.family_code} 그룹 마이그레이션 실패:`, error)
          stats.errors++
        }
      }

      // 4. 고아 프로필 처리 (가족 없는 단독 사용자)
      const orphanProfiles = this.findOrphanProfiles(legacyProfiles, familyGroups)
      for (const profile of orphanProfiles) {
        try {
          await this.migrateOrphanProfile(profile)
          stats.families_created++
          stats.members_migrated++
          console.log(`✅ 단독 사용자 ${profile.full_name} 마이그레이션 완료`)
        } catch (error) {
          console.error(`❌ 단독 사용자 ${profile.full_name} 마이그레이션 실패:`, error)
          stats.errors++
        }
      }

      console.log('🎉 마이그레이션 완료!')
      console.log(`📈 통계: 가족 ${stats.families_created}개, 구성원 ${stats.members_migrated}명, 오류 ${stats.errors}개`)

      return {
        success: stats.errors === 0,
        message: `마이그레이션 완료: 가족 ${stats.families_created}개, 구성원 ${stats.members_migrated}명`,
        stats
      }

    } catch (error) {
      console.error('💥 마이그레이션 중 치명적 오류:', error)
      return {
        success: false,
        message: `마이그레이션 실패: ${error}`,
        stats
      }
    }
  }

  /**
   * 📋 기존 프로필 데이터 조회
   */
  private async getLegacyProfiles(): Promise<LegacyProfile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, full_name, user_type, parent_id, family_code, created_at')

    if (error) {
      throw new Error(`프로필 조회 실패: ${error.message}`)
    }

    return data || []
  }

  /**
   * 🔍 가족 그룹 분석
   */
  private analyzeFamilyGroups(profiles: LegacyProfile[]) {
    const familyMap = new Map<string, {
      family_code: string
      members: LegacyProfile[]
    }>()

    // family_code 기준으로 그룹화
    profiles.forEach(profile => {
      if (profile.family_code) {
        if (!familyMap.has(profile.family_code)) {
          familyMap.set(profile.family_code, {
            family_code: profile.family_code,
            members: []
          })
        }
        familyMap.get(profile.family_code)!.members.push(profile)
      }
    })

    return Array.from(familyMap.values())
  }

  /**
   * 👨‍👩‍👧‍👦 가족 그룹 마이그레이션
   */
  private async migrateFamilyGroup(group: {
    family_code: string
    members: LegacyProfile[]
  }) {
    // 가족명 생성 (첫 번째 부모 이름 + '네 가족')
    const firstParent = group.members.find(m => m.user_type === 'parent')
    const family_name = firstParent 
      ? `${firstParent.full_name.split(' ')[0]}네 가족`
      : `${group.family_code} 가족`

    // 1. families 테이블에 가족 생성
    const { data: family, error: familyError } = await this.supabase
      .from('families')
      .insert({
        family_code: group.family_code,
        family_name,
        created_by: firstParent?.id || group.members[0].id,
        created_at: nowKST(),
        updated_at: nowKST()
      })
      .select()
      .single()

    if (familyError) {
      throw new Error(`가족 생성 실패: ${familyError.message}`)
    }

    // 2. family_members 테이블에 구성원 추가
    for (const member of group.members) {
      const role = this.determineRole(member, group.members)
      
      const { error: memberError } = await this.supabase
        .from('family_members')
        .insert({
          family_id: family.id,
          user_id: member.id,
          role,
          nickname: member.full_name.split(' ').pop(), // 이름만 사용
          joined_at: member.created_at,
          is_active: true
        })

      if (memberError) {
        throw new Error(`구성원 추가 실패 (${member.full_name}): ${memberError.message}`)
      }
    }
  }

  /**
   * 👤 고아 프로필 마이그레이션 (가족 없는 단독 사용자)
   */
  private async migrateOrphanProfile(profile: LegacyProfile) {
    const family_name = `${profile.full_name.split(' ')[0]}네 가족`
    
    // 새 가족 코드 생성
    const family_code = await this.generateUniqueFamilyCode()

    // 1. families 테이블에 단독 가족 생성
    const { data: family, error: familyError } = await this.supabase
      .from('families')
      .insert({
        family_code,
        family_name,
        created_by: profile.id,
        created_at: nowKST(),
        updated_at: nowKST()
      })
      .select()
      .single()

    if (familyError) {
      throw new Error(`단독 가족 생성 실패: ${familyError.message}`)
    }

    // 2. family_members 테이블에 본인 추가
    const role = profile.user_type === 'parent' ? 'father' : 'child' // 기본값
    
    const { error: memberError } = await this.supabase
      .from('family_members')
      .insert({
        family_id: family.id,
        user_id: profile.id,
        role,
        nickname: profile.full_name.split(' ').pop(),
        joined_at: profile.created_at,
        is_active: true
      })

    if (memberError) {
      throw new Error(`단독 구성원 추가 실패: ${memberError.message}`)
    }
  }

  /**
   * 🎯 역할 결정 로직
   */
  private determineRole(profile: LegacyProfile, allMembers: LegacyProfile[]): 'father' | 'mother' | 'child' {
    if (profile.user_type === 'child') {
      return 'child'
    }

    // 부모의 경우 순서대로 father, mother 할당
    const parents = allMembers.filter(m => m.user_type === 'parent')
    const parentIndex = parents.findIndex(p => p.id === profile.id)
    
    return parentIndex === 0 ? 'father' : 'mother'
  }

  /**
   * 👥 고아 프로필 찾기
   */
  private findOrphanProfiles(
    allProfiles: LegacyProfile[], 
    familyGroups: { family_code: string; members: LegacyProfile[] }[]
  ): LegacyProfile[] {
    const familyMemberIds = new Set()
    familyGroups.forEach(group => {
      group.members.forEach(member => {
        familyMemberIds.add(member.id)
      })
    })

    return allProfiles.filter(profile => !familyMemberIds.has(profile.id))
  }

  /**
   * 🔧 고유 가족 코드 생성
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
        return code
      }

      attempts++
    }

    throw new Error('고유 가족 코드 생성 실패')
  }

  private generateFamilyCode(): string {
    const prefix = 'FAM'
    const numbers = Math.floor(100 + Math.random() * 900)
    const letters = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `${prefix}${numbers}${letters}`
  }

  /**
   * 🧹 마이그레이션 롤백 (테스트용)
   */
  async rollback(): Promise<void> {
    console.log('🔄 마이그레이션 롤백 시작...')

    // family_members 삭제
    const { error: membersError } = await this.supabase
      .from('family_members')
      .delete()
      .neq('id', 'never_match') // 모든 레코드 삭제

    if (membersError) {
      console.error('family_members 롤백 실패:', membersError)
    }

    // families 삭제
    const { error: familiesError } = await this.supabase
      .from('families')
      .delete()
      .neq('id', 'never_match') // 모든 레코드 삭제

    if (familiesError) {
      console.error('families 롤백 실패:', familiesError)
    }

    console.log('✅ 롤백 완료')
  }
}

// 실행 함수들
export const migrateFamilyData = async (): Promise<MigrationResult> => {
  const migrator = new FamilyDataMigrator()
  return await migrator.migrate()
}

export const rollbackFamilyData = async (): Promise<void> => {
  const migrator = new FamilyDataMigrator()
  return await migrator.rollback()
}

// 개발/테스트용 즉시 실행
if (typeof window === 'undefined') {
  // 서버 사이드에서만 실행 (필요시 주석 해제)
  // migrateFamilyData().then(result => {
  //   console.log('마이그레이션 결과:', result)
  //   process.exit(result.success ? 0 : 1)
  // })
}