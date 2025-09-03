import { Mission, MissionInstance, MissionTemplate, UserSettings } from '../types/mission'
import databaseService from './database'

export class MigrationService {
  private static readonly MIGRATION_KEY = 'migration_completed'
  private static readonly BACKUP_KEY = 'migration_backup'

  // 마이그레이션이 필요한지 확인
  static async needsMigration(): Promise<boolean> {
    const migrationCompleted = localStorage.getItem(this.MIGRATION_KEY)
    const hasLocalStorageData = localStorage.getItem('missions') !== null
    
    return hasLocalStorageData && !migrationCompleted
  }

  // 기존 localStorage 데이터를 백업
  private static backupLocalStorageData(): void {
    const backup = {
      missions: localStorage.getItem('missions'),
      currentAllowance: localStorage.getItem('currentAllowance'),
      timestamp: new Date().toISOString()
    }
    localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backup))
  }

  // 기존 Mission을 MissionInstance로 변환
  private static convertMissionToInstance(mission: Mission, date: string): MissionInstance {
    return {
      id: mission.id,
      templateId: null, // 기존 미션은 모두 일회성으로 처리
      date: date,
      title: mission.title,
      description: mission.description ?? '',
      reward: mission.reward,
      category: mission.category ?? '기타',
      missionType: mission.missionType === '이벤트' ? 'event' : 'daily',
      isCompleted: mission.isCompleted,
      completedAt: mission.completedAt ?? '',
      isTransferred: mission.isTransferred ?? false
    }
  }

  // 기존 미션들을 분석해서 템플릿 생성 가능한 것들 찾기
  private static analyzeForTemplates(missions: Mission[]): MissionTemplate[] {
    const templates: MissionTemplate[] = []
    const now = new Date().toISOString()

    // 데일리 미션들을 템플릿으로 변환
    const dailyMissions = missions.filter(m => m.missionType === '데일리' || !m.missionType)
    
    for (const mission of dailyMissions) {
      // 중복 제거 (같은 제목의 템플릿이 이미 있는지 확인)
      if (!templates.find(t => t.title === mission.title)) {
        templates.push({
          id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: mission.title,
          description: mission.description || '',
          reward: mission.reward,
          category: mission.category || '기타',
          missionType: 'daily',
          isActive: true, // 기존 미션들은 활성화 상태로
          createdAt: now,
          updatedAt: now
        })
      }
    }

    return templates
  }

  // 메인 마이그레이션 함수
  static async migrateData(): Promise<boolean> {
    try {
      console.log('🔄 Starting data migration from localStorage to IndexedDB...')

      // 백업 생성
      this.backupLocalStorageData()

      // 기존 데이터 로드
      const missionsJson = localStorage.getItem('missions')
      const currentAllowanceJson = localStorage.getItem('currentAllowance')
      
      if (!missionsJson) {
        console.log('ℹ️ No existing missions data found, creating default setup...')
        await this.createDefaultSetup()
        localStorage.setItem(this.MIGRATION_KEY, 'true')
        return true
      }

      const missions: Mission[] = JSON.parse(missionsJson)
      const currentAllowance = currentAllowanceJson ? parseInt(currentAllowanceJson) : 7500
      
      console.log(`📊 Found ${missions.length} missions to migrate`)

      // 오늘 날짜 계산
      const today = new Date().toISOString().split('T')[0]!

      // 1. 템플릿 생성 (데일리 미션들로부터)
      const templates = this.analyzeForTemplates(missions)
      console.log(`📋 Creating ${templates.length} templates from existing missions`)
      
      for (const template of templates) {
        await databaseService.createTemplate({
          title: template.title,
          description: template.description,
          reward: template.reward,
          category: template.category,
          missionType: template.missionType,
          isActive: template.isActive
        })
      }

      // 2. 기존 미션들을 인스턴스로 변환
      console.log(`📝 Converting ${missions.length} missions to instances`)
      
      for (const mission of missions) {
        // 완료된 미션은 완료일을 기준으로, 아니면 오늘 날짜로
        const missionDate = mission.completedAt 
          ? mission.completedAt.split('T')[0]! 
          : today

        const instance = this.convertMissionToInstance(mission, missionDate!)
        
        // Build the instance object dynamically to handle optional properties
        const instanceData: Omit<MissionInstance, 'id'> = {
          templateId: instance.templateId,
          date: instance.date,
          title: instance.title,
          description: instance.description,
          reward: instance.reward,
          category: instance.category,
          missionType: instance.missionType,
          isCompleted: instance.isCompleted
        }
        
        // Only add optional properties if they have meaningful values
        if (instance.completedAt) {
          instanceData.completedAt = instance.completedAt
        }
        if (instance.isTransferred !== undefined) {
          instanceData.isTransferred = instance.isTransferred
        }
        
        await databaseService.createInstance(instanceData)
      }

      // 3. 기본 사용자 설정 생성
      await this.createDefaultUserSettings(currentAllowance)

      // 4. 오늘 날짜 요약 생성
      await this.updateDateSummaryForToday()

      // 마이그레이션 완료 표시
      localStorage.setItem(this.MIGRATION_KEY, 'true')
      
      console.log('✅ Migration completed successfully!')
      return true

    } catch (error) {
      console.error('❌ Migration failed:', error)
      
      // 실패 시 백업에서 복원
      await this.restoreFromBackup()
      return false
    }
  }

  // 기본 설정 생성
  private static async createDefaultSetup(): Promise<void> {
    // 🚫 기본 템플릿 생성 로직 제거 - missionSupabase.ts에서만 관리
    console.log('🚫 Migration 기본 템플릿 생성 비활성화됨 - missionSupabase.ts에서 관리')
    
    // 기존 템플릿이 있는지 확인만 수행
    const existingTemplates = await databaseService.getAllTemplates()
    console.log(`📊 Migration 확인: 기존 템플릿 ${existingTemplates.length}개`)

    await this.createDefaultUserSettings(7500)
  }

  // 기본 사용자 설정 생성
  private static async createDefaultUserSettings(currentAllowance: number = 7500): Promise<void> {
    const settings: UserSettings = {
      id: 'default',
      autoGenerateDays: 7,
      dataRetentionDays: 365,
      notificationEnabled: false,
      backupEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await databaseService.updateUserSettings(settings)
    
    // 현재 용돈은 별도 관리 (기존 방식 유지)
    localStorage.setItem('currentAllowance', currentAllowance.toString())
  }

  // 오늘 날짜 요약 업데이트
  private static async updateDateSummaryForToday(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]!
    const missions = await databaseService.getMissionsByDate(today)
    
    const summary = {
      date: today,
      totalMissions: missions.length,
      completedMissions: missions.filter(m => m.isCompleted).length,
      totalReward: missions.reduce((sum, m) => sum + m.reward, 0),
      earnedReward: missions.filter(m => m.isCompleted).reduce((sum, m) => sum + m.reward, 0),
      lastUpdated: new Date().toISOString()
    }

    await databaseService.updateDateSummary(summary)
  }

  // 백업에서 복원
  private static async restoreFromBackup(): Promise<void> {
    const backupData = localStorage.getItem(this.BACKUP_KEY)
    if (backupData) {
      const backup = JSON.parse(backupData)
      if (backup.missions) localStorage.setItem('missions', backup.missions)
      if (backup.currentAllowance) localStorage.setItem('currentAllowance', backup.currentAllowance)
    }
  }

  // 마이그레이션 상태 확인
  static isMigrationCompleted(): boolean {
    return localStorage.getItem(this.MIGRATION_KEY) === 'true'
  }

  // 마이그레이션 재실행 (개발/테스트용)
  static async resetMigration(): Promise<void> {
    localStorage.removeItem(this.MIGRATION_KEY)
    await databaseService.clearAllData()
  }

  // 백업 데이터 확인
  static getBackupData(): unknown {
    const backup = localStorage.getItem(this.BACKUP_KEY)
    return backup ? JSON.parse(backup) : null
  }
}

export default MigrationService