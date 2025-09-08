/**
 * 🔍 미션 시스템 디버깅 스크립트
 * 주말 반복패턴 문제와 이벤트 미션 정산 문제 진단
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 환경변수 로드
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugMissions() {
  try {
    console.log('🔍 미션 시스템 진단 시작...\n')
    
    // 1. 현재 날짜 확인
    const today = '2025-09-08'
    console.log(`📅 진단 대상 날짜: ${today} (월요일)\n`)
    
    // 2. 모든 미션 템플릿 조회
    console.log('📋 미션 템플릿 분석:')
    const { data: templates, error: templateError } = await supabase
      .from('mission_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (templateError) {
      console.error('❌ 템플릿 조회 실패:', templateError)
      return
    }
    
    console.log(`   총 ${templates.length}개 활성 템플릿`)
    templates.forEach(t => {
      console.log(`   - ${t.title} (${t.mission_type}): ${t.recurring_pattern || 'daily'}`)
    })
    console.log('')
    
    // 3. 오늘 생성된 미션 인스턴스들 조회
    console.log(`🎯 ${today} 생성된 미션들:`)
    const { data: instances, error: instanceError } = await supabase
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
    
    if (instanceError) {
      console.error('❌ 미션 인스턴스 조회 실패:', instanceError)
      return
    }
    
    console.log(`   총 ${instances.length}개 미션`)
    instances.forEach(i => {
      const template = i.mission_templates
      console.log(`   - ${i.title} (${i.mission_type}):`)
      console.log(`     템플릿: ${template?.title || 'N/A'}`)
      console.log(`     반복패턴: ${template?.recurring_pattern || 'daily'}`)
      console.log(`     완료상태: ${i.is_completed}`)
      console.log(`     정산상태: ${i.is_transferred}`)
      console.log(`     사용자ID: ${i.user_id}`)
      console.log('')
    })
    
    // 4. 주말 패턴 미션이 월요일에 생성된 경우 분석
    const weekendMissions = instances.filter(i => 
      i.mission_templates?.recurring_pattern === 'weekends'
    )
    
    if (weekendMissions.length > 0) {
      console.log('⚠️ 월요일에 생성된 주말 패턴 미션들:')
      weekendMissions.forEach(m => {
        console.log(`   - ${m.title}: ${m.mission_templates?.recurring_pattern}`)
      })
      console.log('')
    }
    
    // 5. 정산 시스템 분석 - 완료된 미션들
    console.log('💰 정산 분석 - 완료된 미션들:')
    const completedMissions = instances.filter(i => i.is_completed)
    const dailyCompleted = completedMissions.filter(i => i.mission_type === 'daily')
    const eventCompleted = completedMissions.filter(i => i.mission_type === 'event')
    
    console.log(`   완료된 데일리 미션: ${dailyCompleted.length}개`)
    dailyCompleted.forEach(m => {
      console.log(`     - ${m.title}: ${m.reward}원 (전송: ${m.is_transferred})`)
    })
    
    console.log(`   완료된 이벤트 미션: ${eventCompleted.length}개`)
    eventCompleted.forEach(m => {
      console.log(`     - ${m.title}: ${m.reward}원 (전송: ${m.is_transferred})`)
    })
    
    const totalAmount = completedMissions.reduce((sum, m) => sum + m.reward, 0)
    console.log(`   총 완료 미션 보상: ${totalAmount}원`)
    
    // 6. 미정산 미션들 (is_transferred = false)
    const pendingMissions = completedMissions.filter(m => !m.is_transferred)
    console.log(`   미정산 미션: ${pendingMissions.length}개`)
    const pendingAmount = pendingMissions.reduce((sum, m) => sum + m.reward, 0)
    console.log(`   미정산 금액: ${pendingAmount}원`)
    console.log('')
    
    // 7. 사용자별 분석
    console.log('👥 사용자별 미션 분석:')
    const userGroups = {}
    instances.forEach(i => {
      if (!userGroups[i.user_id]) {
        userGroups[i.user_id] = []
      }
      userGroups[i.user_id].push(i)
    })
    
    Object.entries(userGroups).forEach(([userId, missions]) => {
      console.log(`   사용자 ${userId}:`)
      console.log(`     총 미션: ${missions.length}개`)
      const completed = missions.filter(m => m.is_completed)
      const completedAmount = completed.reduce((sum, m) => sum + m.reward, 0)
      console.log(`     완료 미션: ${completed.length}개 (${completedAmount}원)`)
      
      const dailyMissions = missions.filter(m => m.mission_type === 'daily')
      const eventMissions = missions.filter(m => m.mission_type === 'event')
      console.log(`     데일리: ${dailyMissions.length}개, 이벤트: ${eventMissions.length}개`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ 진단 중 오류 발생:', error)
  }
}

// 스크립트 실행
debugMissions().then(() => {
  console.log('🔍 진단 완료')
  process.exit(0)
}).catch(error => {
  console.error('❌ 스크립트 실행 실패:', error)
  process.exit(1)
})