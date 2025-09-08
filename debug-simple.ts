/**
 * 간단한 미션 디버깅 함수 (브라우저 콘솔용)
 */

import { createClient } from '@/lib/supabase/client'

export async function debugTodayMissions() {
  const supabase = createClient()
  const today = '2025-09-08'
  
  console.log('🔍 오늘의 미션 디버깅 시작:', today)
  
  try {
    // 1. 오늘 생성된 미션 인스턴스들 조회
    const { data: instances, error } = await supabase
      .from('mission_instances')
      .select(`
        *,
        mission_templates (
          title,
          recurring_pattern,
          mission_type
        )
      `)
      .eq('date', today)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ 미션 조회 실패:', error)
      return
    }
    
    console.log(`📊 총 ${instances.length}개 미션 발견`)
    
    instances.forEach((instance, index) => {
      const template = instance.mission_templates
      console.log(`${index + 1}. ${instance.title}`)
      console.log(`   타입: ${instance.mission_type}`)
      console.log(`   반복패턴: ${template?.recurring_pattern || 'daily'}`)
      console.log(`   완료: ${instance.is_completed}`)
      console.log(`   전송: ${instance.is_transferred}`)
      console.log(`   보상: ${instance.reward}원`)
      console.log(`   사용자: ${instance.user_id}`)
      console.log('')
    })
    
    // 주말 패턴 미션이 월요일에 생성된 경우
    const weekendMissions = instances.filter(i => 
      i.mission_templates?.recurring_pattern === 'weekends'
    )
    
    if (weekendMissions.length > 0) {
      console.warn('⚠️ 월요일에 생성된 주말 패턴 미션들:')
      weekendMissions.forEach(m => {
        console.warn(`   - ${m.title} (템플릿: ${m.mission_templates?.title})`)
      })
    }
    
    // 정산 분석
    const completedMissions = instances.filter(i => i.is_completed)
    const pendingMissions = completedMissions.filter(i => !i.is_transferred)
    
    console.log('💰 정산 현황:')
    console.log(`   완료된 미션: ${completedMissions.length}개`)
    console.log(`   미정산 미션: ${pendingMissions.length}개`)
    
    const totalAmount = pendingMissions.reduce((sum, m) => sum + m.reward, 0)
    console.log(`   미정산 금액: ${totalAmount}원`)
    
    // 사용자별 분석
    const userGroups = {}
    instances.forEach(i => {
      if (!userGroups[i.user_id]) {
        userGroups[i.user_id] = { daily: [], event: [] }
      }
      if (i.mission_type === 'daily') {
        userGroups[i.user_id].daily.push(i)
      } else {
        userGroups[i.user_id].event.push(i)
      }
    })
    
    console.log('👥 사용자별 미션:')
    Object.entries(userGroups).forEach(([userId, missions]) => {
      console.log(`   ${userId}:`)
      console.log(`     데일리: ${missions.daily.length}개`)
      console.log(`     이벤트: ${missions.event.length}개`)
      
      const completedDaily = missions.daily.filter(m => m.is_completed)
      const completedEvent = missions.event.filter(m => m.is_completed)
      console.log(`     완료 - 데일리: ${completedDaily.length}개, 이벤트: ${completedEvent.length}개`)
      
      const pendingDaily = completedDaily.filter(m => !m.is_transferred)
      const pendingEvent = completedEvent.filter(m => !m.is_transferred)
      const pendingDailyAmount = pendingDaily.reduce((sum, m) => sum + m.reward, 0)
      const pendingEventAmount = pendingEvent.reduce((sum, m) => sum + m.reward, 0)
      
      console.log(`     미정산 - 데일리: ${pendingDaily.length}개(${pendingDailyAmount}원), 이벤트: ${pendingEvent.length}개(${pendingEventAmount}원)`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ 디버깅 실패:', error)
  }
}