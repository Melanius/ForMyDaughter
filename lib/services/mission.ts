import { MissionInstance, MissionTemplate, DateSummary } from '../types/mission'
import databaseService from './database'
import syncService from './sync'

export class MissionService {
  // 날짜별 미션 조회
  async getMissionsByDate(date: string): Promise<MissionInstance[]> {
    try {
      const missions = await databaseService.getMissionsByDate(date)
      return missions.sort((a, b) => {
        // 완료되지 않은 미션을 먼저, 그 다음 생성 순서대로
        if (a.isCompleted !== b.isCompleted) {
          return a.isCompleted ? 1 : -1
        }
        return a.id.localeCompare(b.id)
      })
    } catch (error) {
      console.error('Failed to get missions by date:', error)
      return []
    }
  }

  // 미래 날짜의 데일리 미션 자동 생성
  async generateDailyMissionsForDate(date: string): Promise<MissionInstance[]> {
    try {
      // 이미 해당 날짜에 미션이 있는지 확인
      const existingMissions = await this.getMissionsByDate(date)
      if (existingMissions.length > 0) {
        return existingMissions
      }

      // 활성화된 데일리 템플릿들 가져오기
      const activeTemplates = await databaseService.getActiveTemplates()
      const dailyTemplates = activeTemplates.filter(t => t.missionType === 'daily')

      if (dailyTemplates.length === 0) {
        console.log('No active daily templates found')
        return []
      }

      console.log(`🔄 Generating ${dailyTemplates.length} daily missions for ${date}`)

      const generatedMissions: MissionInstance[] = []

      for (const template of dailyTemplates) {
        const instanceId = await databaseService.createInstance({
          templateId: template.id,
          date: date,
          title: template.title,
          description: template.description,
          reward: template.reward,
          category: template.category,
          missionType: template.missionType,
          isCompleted: false
        })

        const instance = await databaseService.getInstance(instanceId)
        if (instance) {
          generatedMissions.push(instance)
        }
      }

      // 날짜 요약 업데이트
      await this.updateDateSummary(date)

      return generatedMissions
    } catch (error) {
      console.error('Failed to generate daily missions:', error)
      return []
    }
  }

  // 미션 완료 처리
  async completeMission(missionId: string): Promise<boolean> {
    try {
      const mission = await databaseService.getInstance(missionId)
      if (!mission || mission.isCompleted) {
        return false
      }

      const updatedData = {
        isCompleted: true,
        completedAt: new Date().toISOString()
      }

      await databaseService.updateInstance(missionId, updatedData)

      // 실시간 동기화 이벤트 발생
      syncService.notifyMissionUpdate(missionId, {
        ...mission,
        ...updatedData
      }, undefined, mission.date)

      // 날짜 요약 업데이트
      await this.updateDateSummary(mission.date)
      
      console.log(`✅ 미션 완료 처리 및 동기화 이벤트 발생: ${missionId}`)
      return true
    } catch (error) {
      console.error('Failed to complete mission:', error)
      return false
    }
  }

  // 미션 완료 취소
  async uncompleteMission(missionId: string): Promise<boolean> {
    try {
      const mission = await databaseService.getInstance(missionId)
      if (!mission || !mission.isCompleted || mission.isTransferred) {
        return false
      }

      const updatedData = {
        isCompleted: false,
        completedAt: undefined
      }

      await databaseService.updateInstance(missionId, updatedData)

      // 실시간 동기화 이벤트 발생
      syncService.notifyMissionUpdate(missionId, {
        ...mission,
        ...updatedData
      }, undefined, mission.date)

      // 날짜 요약 업데이트
      await this.updateDateSummary(mission.date)
      
      console.log(`↩️ 미션 완료 취소 및 동기화 이벤트 발생: ${missionId}`)
      return true
    } catch (error) {
      console.error('Failed to uncomplete mission:', error)
      return false
    }
  }

  // 미션 수정
  async updateMission(missionId: string, updates: Partial<MissionInstance>): Promise<boolean> {
    try {
      const mission = await databaseService.getInstance(missionId)
      if (!mission) {
        return false
      }

      await databaseService.updateInstance(missionId, updates)

      // 날짜 요약 업데이트 (날짜가 변경된 경우 두 날짜 모두 업데이트)
      await this.updateDateSummary(mission.date)
      if (updates.date && updates.date !== mission.date) {
        await this.updateDateSummary(updates.date)
      }

      return true
    } catch (error) {
      console.error('Failed to update mission:', error)
      return false
    }
  }

  // 미션 삭제
  async deleteMission(missionId: string): Promise<boolean> {
    try {
      const mission = await databaseService.getInstance(missionId)
      if (!mission) {
        return false
      }

      await databaseService.deleteInstance(missionId)

      // 날짜 요약 업데이트
      await this.updateDateSummary(mission.date)
      
      return true
    } catch (error) {
      console.error('Failed to delete mission:', error)
      return false
    }
  }

  // 새 미션 생성
  async createMission(missionData: Omit<MissionInstance, 'id'>): Promise<string | null> {
    try {
      const missionId = await databaseService.createInstance(missionData)
      
      // 날짜 요약 업데이트
      await this.updateDateSummary(missionData.date)
      
      return missionId
    } catch (error) {
      console.error('Failed to create mission:', error)
      return null
    }
  }

  // 미션 전달 상태 변경
  async transferMissions(missionIds: string[]): Promise<boolean> {
    try {
      for (const missionId of missionIds) {
        const mission = await databaseService.getInstance(missionId)
        if (mission && mission.isCompleted && !mission.isTransferred) {
          await databaseService.updateInstance(missionId, {
            isTransferred: true
          })
          // 날짜 요약 업데이트
          await this.updateDateSummary(mission.date)
        }
      }
      return true
    } catch (error) {
      console.error('Failed to transfer missions:', error)
      return false
    }
  }

  // 전달 취소
  async undoTransfer(missionId: string): Promise<boolean> {
    try {
      const mission = await databaseService.getInstance(missionId)
      if (!mission || !mission.isTransferred) {
        return false
      }

      await databaseService.updateInstance(missionId, {
        isTransferred: false
      })

      // 날짜 요약 업데이트
      await this.updateDateSummary(mission.date)
      
      return true
    } catch (error) {
      console.error('Failed to undo transfer:', error)
      return false
    }
  }

  // 날짜 요약 업데이트
  async updateDateSummary(date: string): Promise<void> {
    try {
      const missions = await this.getMissionsByDate(date)
      
      const summary: DateSummary = {
        date: date,
        totalMissions: missions.length,
        completedMissions: missions.filter(m => m.isCompleted).length,
        totalReward: missions.reduce((sum, m) => sum + m.reward, 0),
        earnedReward: missions.filter(m => m.isCompleted && !m.isTransferred).reduce((sum, m) => sum + m.reward, 0),
        lastUpdated: new Date().toISOString()
      }

      await databaseService.updateDateSummary(summary)
    } catch (error) {
      console.error('Failed to update date summary:', error)
    }
  }

  // 월별 요약 조회 (달력용)
  async getMonthSummary(year: number, month: number): Promise<DateSummary[]> {
    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`
      
      return await databaseService.getDateSummariesInRange(startDate, endDate)
    } catch (error) {
      console.error('Failed to get month summary:', error)
      return []
    }
  }

  // 특정 기간의 통계
  async getStatistics(startDate: string, endDate: string) {
    try {
      const summaries = await databaseService.getDateSummariesInRange(startDate, endDate)
      
      return {
        totalDays: summaries.length,
        totalMissions: summaries.reduce((sum, s) => sum + s.totalMissions, 0),
        completedMissions: summaries.reduce((sum, s) => sum + s.completedMissions, 0),
        totalReward: summaries.reduce((sum, s) => sum + s.totalReward, 0),
        earnedReward: summaries.reduce((sum, s) => sum + s.earnedReward, 0),
        completionRate: summaries.length > 0 
          ? (summaries.reduce((sum, s) => sum + s.completedMissions, 0) / summaries.reduce((sum, s) => sum + s.totalMissions, 0)) * 100
          : 0
      }
    } catch (error) {
      console.error('Failed to get statistics:', error)
      return {
        totalDays: 0,
        totalMissions: 0,
        completedMissions: 0,
        totalReward: 0,
        earnedReward: 0,
        completionRate: 0
      }
    }
  }

  // 템플릿 관련 메서드들
  async getAllTemplates(): Promise<MissionTemplate[]> {
    return await databaseService.getAllTemplates()
  }

  async createTemplate(template: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return await databaseService.createTemplate(template)
  }

  async updateTemplate(templateId: string, updates: Partial<MissionTemplate>): Promise<void> {
    await databaseService.updateTemplate(templateId, updates)
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await databaseService.deleteTemplate(templateId)
  }

  // 기본 템플릿 생성 (처음 사용할 때)
  async createDefaultTemplates(): Promise<void> {
    try {
      const existingTemplates = await this.getAllTemplates()
      if (existingTemplates.length > 0) {
        console.log('Templates already exist, skipping default template creation')
        return
      }

      console.log('Creating default mission templates...')

      const defaultTemplates = [
        {
          title: '방 청소하기',
          description: '침실 정리정돈하고 먼지 털기, 옷 정리하기',
          reward: 1000,
          category: '집안일',
          missionType: 'daily' as const,
          isActive: true
        },
        {
          title: '숙제 완료하기',
          description: '학교에서 낸 숙제 모두 끝내기',
          reward: 1500,
          category: '공부',
          missionType: 'daily' as const,
          isActive: true
        },
        {
          title: '책 읽기',
          description: '하루 30분 이상 책 읽고 독서 일기 쓰기',
          reward: 800,
          category: '독서',
          missionType: 'daily' as const,
          isActive: true
        },
        {
          title: '식사 후 설거지 도움',
          description: '식사 후 그릇 정리하고 설거지 도와주기',
          reward: 500,
          category: '집안일',
          missionType: 'daily' as const,
          isActive: true
        },
        {
          title: '운동하기',
          description: '30분 이상 운동하기 (산책, 자전거 타기, 줄넘기 등)',
          reward: 600,
          category: '운동',
          missionType: 'daily' as const,
          isActive: false
        },
        {
          title: '일찍 일어나기',
          description: '정해진 시간에 일어나서 세면하고 아침 준비하기',
          reward: 300,
          category: '건강',
          missionType: 'daily' as const,
          isActive: false
        },
        {
          title: '생일파티 준비',
          description: '가족이나 친구 생일을 위한 특별한 준비 돕기',
          reward: 2000,
          category: '기타',
          missionType: 'event' as const,
          isActive: true
        },
        {
          title: '대청소 도움',
          description: '집 전체 대청소를 도와주기 (창문 닦기, 바닥 청소 등)',
          reward: 3000,
          category: '집안일',
          missionType: 'event' as const,
          isActive: true
        },
        {
          title: '특별한 요리 도움',
          description: '특별한 날 요리를 만들 때 도와주기',
          reward: 1500,
          category: '집안일',
          missionType: 'event' as const,
          isActive: true
        }
      ]

      for (const template of defaultTemplates) {
        await this.createTemplate(template)
      }

      console.log(`✅ Created ${defaultTemplates.length} default templates`)
    } catch (error) {
      console.error('Failed to create default templates:', error)
    }
  }

  // 활성화된 데일리 템플릿이 있는지 확인하고, 없으면 기본 템플릿 생성
  async ensureTemplatesExist(): Promise<void> {
    try {
      const activeTemplates = await databaseService.getActiveTemplates()
      const dailyTemplates = activeTemplates.filter(t => t.missionType === 'daily')
      
      if (dailyTemplates.length === 0) {
        console.log('No active daily templates found, creating default templates...')
        await this.createDefaultTemplates()
      }
    } catch (error) {
      console.error('Failed to ensure templates exist:', error)
    }
  }
}

// 싱글톤 인스턴스
export const missionService = new MissionService()
export default missionService