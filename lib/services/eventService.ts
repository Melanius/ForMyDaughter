/**
 * 🗓️ 가족 이벤트 관리 서비스
 */

import { createClient } from '@/lib/supabase/client'
import { 
  FamilyEvent, 
  FamilyEventWithCreator,
  CreateEventRequest, 
  UpdateEventRequest,
  EventWithDDay,
  EventType 
} from '@/lib/types/events'

class EventService {
  private supabase = createClient()

  // 가족의 모든 이벤트 조회 (기존 profiles 시스템 호환)
  async getFamilyEvents(familyId: string): Promise<FamilyEventWithCreator[]> {
    // legacy 시스템 호환성 체크
    if (this.isLegacyFamilyId(familyId)) {
      // 기존 profiles 시스템에서는 이벤트 기능이 없으므로 빈 배열 반환
      console.log('🔄 Legacy family ID 감지: 이벤트 기능 비활성화')
      return []
    }

    const { data, error } = await this.supabase
      .from('family_events')
      .select(`
        *,
        creator:profiles!family_events_created_by_fkey(id, full_name, avatar_url)
      `)
      .eq('family_id', familyId)
      .order('event_date', { ascending: true })

    if (error) {
      throw new Error(`이벤트 조회 실패: ${error.message}`)
    }

    return data || []
  }

  // Legacy family ID 감지 유틸리티
  private isLegacyFamilyId(familyId: string): boolean {
    return familyId.startsWith('legacy-')
  }

  // 다가오는 이벤트 조회 (D-day 계산 포함)
  async getUpcomingEvents(familyId: string, limit = 5): Promise<EventWithDDay[]> {
    const events = await this.getFamilyEvents(familyId)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // D-day 계산하여 이벤트 정보 확장
    const eventsWithDDay: EventWithDDay[] = events.map(event => {
      const eventDate = new Date(event.event_date)
      eventDate.setHours(0, 0, 0, 0)
      
      // 올해 기준으로 계산 (생일의 경우)
      if (event.event_type === 'birthday') {
        const thisYear = today.getFullYear()
        const thisYearEventDate = new Date(thisYear, eventDate.getMonth(), eventDate.getDate())
        
        // 올해 생일이 이미 지났으면 내년 생일로 계산
        if (thisYearEventDate < today) {
          thisYearEventDate.setFullYear(thisYear + 1)
        }
        
        const diffTime = thisYearEventDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        return {
          ...event,
          dday: diffDays,
          dday_text: diffDays === 0 ? 'D-Day' : 
                    diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`
        }
      } else {
        // 일반 이벤트는 해당 날짜 그대로 계산
        const diffTime = eventDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        return {
          ...event,
          dday: diffDays,
          dday_text: diffDays === 0 ? 'D-Day' : 
                    diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`
        }
      }
    })

    // D-day 순으로 정렬하고 제한
    return eventsWithDDay
      .sort((a, b) => {
        // 음수(지난 이벤트)는 뒤로, 양수/0(다가오는/오늘)은 앞으로
        if (a.dday < 0 && b.dday >= 0) return 1
        if (a.dday >= 0 && b.dday < 0) return -1
        return Math.abs(a.dday) - Math.abs(b.dday)
      })
      .slice(0, limit)
  }

  // 이벤트 추가 (기존 profiles 시스템 호환)
  async createEvent(familyId: string, eventData: CreateEventRequest): Promise<FamilyEvent> {
    // legacy 시스템에서는 이벤트 생성 불가
    if (this.isLegacyFamilyId(familyId)) {
      throw new Error('기존 가족 시스템에서는 이벤트 기능을 사용할 수 없습니다.')
    }

    const { data, error } = await this.supabase
      .from('family_events')
      .insert({
        family_id: familyId,
        ...eventData
      })
      .select()
      .single()

    if (error) {
      throw new Error(`이벤트 생성 실패: ${error.message}`)
    }

    return data
  }

  // 이벤트 수정
  async updateEvent(eventId: string, eventData: UpdateEventRequest): Promise<FamilyEvent> {
    const { data, error } = await this.supabase
      .from('family_events')
      .update(eventData)
      .eq('id', eventId)
      .select()
      .single()

    if (error) {
      throw new Error(`이벤트 수정 실패: ${error.message}`)
    }

    return data
  }

  // 이벤트 삭제
  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await this.supabase
      .from('family_events')
      .delete()
      .eq('id', eventId)

    if (error) {
      throw new Error(`이벤트 삭제 실패: ${error.message}`)
    }
  }

  // 가족 구성원들의 생일을 자동으로 이벤트로 추가 (기존 profiles 시스템 호환)
  async syncBirthdays(familyId: string): Promise<void> {
    // legacy 시스템에서는 생일 동기화 생략
    if (this.isLegacyFamilyId(familyId)) {
      console.log('🔄 Legacy family ID: 생일 동기화 생략')
      return
    }

    try {
      // 가족 구성원들의 생일 정보 조회
      const { data: members, error: membersError } = await this.supabase
        .from('family_members')
        .select(`
          user_id,
          profile:profiles!family_members_user_id_fkey(id, full_name, birthday)
        `)
        .eq('family_id', familyId)
        .eq('is_active', true)

      if (membersError) {
        throw membersError
      }

      // 기존 생일 이벤트 조회
      const { data: existingBirthdays } = await this.supabase
        .from('family_events')
        .select('created_by')
        .eq('family_id', familyId)
        .eq('event_type', 'birthday')

      const existingBirthdayCreators = new Set(
        existingBirthdays?.map(e => e.created_by) || []
      )

      // 새로운 생일 이벤트 생성
      const newBirthdays = members
        ?.filter(member => 
          member.profile?.birthday && 
          !existingBirthdayCreators.has(member.user_id)
        )
        .map(member => ({
          family_id: familyId,
          title: `${member.profile.full_name}님의 생일`,
          event_date: member.profile.birthday,
          event_type: 'birthday' as EventType,
          created_by: member.user_id
        }))

      if (newBirthdays && newBirthdays.length > 0) {
        const { error: insertError } = await this.supabase
          .from('family_events')
          .insert(newBirthdays)

        if (insertError) {
          throw insertError
        }

        console.log(`✅ ${newBirthdays.length}개의 생일 이벤트 자동 생성됨`)
      }
    } catch (error) {
      console.error('생일 동기화 실패:', error)
    }
  }
}

export default new EventService()