/**
 * 🔍 미션 데이터 실제 현황 분석
 * 미션은 어떻게 정상 작동하는지 파악
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://igqlkqqgfzbrpaeapvyb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWxrcXFnZnpicnBhZWFwdnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwOTc3OTcsImV4cCI6MjA3MTY3Mzc5N30.zR6ZUyEWMjZQhzqd_2_jgUy9t2dEZW2kK839r1uXAF0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMissionData() {
  console.log('🔍 ========== 미션 데이터 실제 현황 분석 ==========')
  
  // 1. 프로필 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, user_type, parent_id')
    .order('created_at')
    
  const children = profiles.filter(p => p.user_type === 'child')
  
  // 2. mission_instances 테이블 스키마 확인
  console.log('📋 mission_instances 테이블 스키마 정보:')
  
  const { data: sampleMission, error: schemaError } = await supabase
    .from('mission_instances')
    .select('*')
    .limit(1)
    .single()
    
  if (sampleMission) {
    console.log('  📊 컬럼들:', Object.keys(sampleMission).join(', '))
  } else if (schemaError) {
    console.log('  ❌ 스키마 조회 실패:', schemaError.message)
  }

  // 3. 각 자녀별 미션 데이터 실제 조회
  for (const child of children) {
    console.log(`\n👶 === ${child.full_name} (${child.id.substring(0, 8)}) 미션 분석 ===`)
    
    // 미션 인스턴스 조회 (family_connection_id 없이)
    const { data: missions, error: missionError } = await supabase
      .from('mission_instances')
      .select('id, title, reward, date, is_completed, user_id, created_at')
      .eq('user_id', child.id)
      .order('created_at', { ascending: false })
      .limit(10)
      
    if (missionError) {
      console.log(`  ❌ 미션 조회 실패: ${missionError.message}`)
    } else {
      console.log(`  📊 총 미션 수: ${missions.length}`)
      
      if (missions.length > 0) {
        console.log('  📋 최근 미션들:')
        missions.slice(0, 5).forEach((m, idx) => {
          console.log(`    ${idx + 1}. ${m.title} (${m.reward}원) - ${m.date}`)
          console.log(`       완료: ${m.is_completed ? '✅' : '❌'}, 생성일: ${m.created_at.split('T')[0]}`)
        })
        
        // 미션 통계
        const completed = missions.filter(m => m.is_completed).length
        const pending = missions.length - completed
        const totalReward = missions.filter(m => m.is_completed).reduce((sum, m) => sum + m.reward, 0)
        
        console.log(`  📈 통계: 완료 ${completed}개, 대기 ${pending}개, 획득 보상 ${totalReward}원`)
      } else {
        console.log('  ⚠️ 미션 없음')
      }
    }

    // 미션 템플릿 조회
    const { data: templates, error: templateError } = await supabase
      .from('mission_templates')
      .select('id, title, reward, is_active, user_id')
      .eq('user_id', child.id)
      .limit(5)
      
    if (!templateError && templates.length > 0) {
      console.log(`  🎯 미션 템플릿: ${templates.length}개`)
      templates.forEach(t => {
        console.log(`    - ${t.title} (${t.reward}원) ${t.is_active ? '✅' : '❌'}`)
      })
    } else {
      console.log(`  🎯 미션 템플릿: 없음`)
    }
  }

  // 4. 부모 계정에서 자녀 미션 조회 테스트
  console.log('\n🔍 === 부모 관점에서 미션 조회 테스트 ===')
  const parent = profiles.find(p => p.user_type === 'parent')
  
  if (parent && children.length > 0) {
    console.log(`\n👨‍👩‍👧‍👦 부모 ${parent.full_name}이 자녀들 미션 조회:`)
    
    for (const child of children.slice(0, 2)) { // 처음 2명만
      const { data: parentViewMissions, error: parentError } = await supabase
        .from('mission_instances')
        .select('id, title, user_id, date')
        .eq('user_id', child.id)
        .limit(3)
        
      if (parentError) {
        console.log(`  ❌ ${child.full_name} 미션 조회 실패: ${parentError.message}`)
      } else {
        console.log(`  ✅ ${child.full_name} 미션 ${parentViewMissions.length}개 조회 성공`)
        if (parentViewMissions.length > 0) {
          parentViewMissions.forEach(m => {
            console.log(`    - ${m.title} (${m.date})`)
          })
        }
      }
    }
  }

  // 5. profiles.parent_id 관계 확인
  console.log('\n🔗 === profiles.parent_id 관계 확인 ===')
  children.forEach(child => {
    const parent = profiles.find(p => p.id === child.parent_id)
    console.log(`  👶 ${child.full_name} → 👨‍👩‍👧‍👦 ${parent?.full_name || '부모 없음'} (${child.parent_id ? '연결됨' : '연결 안됨'})`)
  })

  console.log('\n🔍 ========== 미션 분석 완료 ==========')
}

checkMissionData().catch(console.error)