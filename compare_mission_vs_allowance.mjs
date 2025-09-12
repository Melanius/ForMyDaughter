/**
 * 🔍 미션 데이터 vs 거래 데이터 비교 분석
 * 왜 미션은 정상이고 지갑은 첫째만 나오는지 분석
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://igqlkqqgfzbrpaeapvyb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWxrcXFnZnpicnBhZWFwdnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwOTc3OTcsImV4cCI6MjA3MTY3Mzc5N30.zR6ZUyEWMjZQhzqd_2_jgUy9t2dEZW2kK839r1uXAF0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function compareMissionVsAllowance() {
  console.log('🔍 ========== 미션 vs 거래 데이터 비교 분석 ==========')
  
  // 1. 프로필 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, user_type, parent_id')
    .order('created_at')
    
  const children = profiles.filter(p => p.user_type === 'child')
  console.log('👥 분석 대상 자녀들:')
  children.forEach((child, idx) => {
    console.log(`  ${idx + 1}. ${child.full_name} (${child.id.substring(0, 8)})`)
  })

  // 2. 가족 연결 확인
  const { data: connections } = await supabase
    .from('family_connection_requests')
    .select('id, parent_id, child_id, status')
    .eq('status', 'approved')
    
  console.log('\n🔗 가족 연결 상태:')
  connections.forEach(c => {
    const parent = profiles.find(p => p.id === c.parent_id)
    const child = profiles.find(p => p.id === c.child_id)
    console.log(`  ✅ ${parent?.full_name} → ${child?.full_name} (연결ID: ${c.id.substring(0, 8)})`)
  })

  console.log('\n' + '='.repeat(80))
  
  // 3. 각 자녀별로 미션 vs 거래 데이터 비교
  for (const child of children) {
    console.log(`\n👶 === ${child.full_name} (${child.id.substring(0, 8)}) 분석 ===`)
    
    // 미션 데이터 조회
    console.log('\n📋 [미션 데이터]')
    const { data: missions, error: missionError } = await supabase
      .from('mission_instances')
      .select('id, title, reward, date, is_completed, family_connection_id, created_at')
      .eq('user_id', child.id)
      .order('created_at', { ascending: false })
      .limit(5)
      
    if (missionError) {
      console.log(`  ❌ 미션 조회 실패: ${missionError.message}`)
    } else {
      console.log(`  📊 총 미션 수: ${missions.length}`)
      if (missions.length > 0) {
        missions.forEach((m, idx) => {
          console.log(`    ${idx + 1}. ${m.title} (${m.reward}원) - ${m.date}`)
          console.log(`       완료: ${m.is_completed ? '✅' : '❌'}, 가족연결: ${m.family_connection_id?.substring(0, 8) || 'NULL'}`)
        })
      } else {
        console.log('  ⚠️ 미션 없음')
      }
    }

    // 거래 데이터 조회  
    console.log('\n💰 [거래 데이터]')
    const { data: transactions, error: txError } = await supabase
      .from('allowance_transactions')
      .select('id, amount, type, category, description, date, family_connection_id, created_at')
      .eq('user_id', child.id)
      .order('created_at', { ascending: false })
      .limit(5)
      
    if (txError) {
      console.log(`  ❌ 거래 조회 실패: ${txError.message}`)
    } else {
      console.log(`  📊 총 거래 수: ${transactions.length}`)
      if (transactions.length > 0) {
        transactions.forEach((tx, idx) => {
          console.log(`    ${idx + 1}. ${tx.type} ${tx.amount}원 - ${tx.description}`)
          console.log(`       날짜: ${tx.date}, 가족연결: ${tx.family_connection_id?.substring(0, 8) || 'NULL'}`)
        })
      } else {
        console.log('  ⚠️ 거래내역 없음')
      }
    }

    // 해당 자녀의 가족 연결 ID 확인
    const childConnection = connections.find(c => c.child_id === child.id)
    console.log(`\n🔗 [가족 연결 정보]`)
    if (childConnection) {
      console.log(`  ✅ 연결 ID: ${childConnection.id.substring(0, 8)}`)
      
      // 이 연결 ID로 실제 조회해보기
      console.log('\n🧪 [가족연결 기반 조회 테스트]')
      
      // 미션 조회 (가족연결 기반)
      const { data: familyMissions, error: famMissionError } = await supabase
        .from('mission_instances') 
        .select('id, title, user_id')
        .eq('family_connection_id', childConnection.id)
        .eq('user_id', child.id)
        .limit(3)
        
      if (famMissionError) {
        console.log(`  ❌ 가족연결 미션 조회 실패: ${famMissionError.message}`)
      } else {
        console.log(`  📋 가족연결 미션: ${familyMissions.length}개`)
      }
      
      // 거래 조회 (가족연결 기반)  
      const { data: familyTx, error: famTxError } = await supabase
        .from('allowance_transactions')
        .select('id, amount, user_id')
        .eq('family_connection_id', childConnection.id)
        .eq('user_id', child.id)
        .limit(3)
        
      if (famTxError) {
        console.log(`  ❌ 가족연결 거래 조회 실패: ${famTxError.message}`)
      } else {
        console.log(`  💰 가족연결 거래: ${familyTx.length}개`)
      }
      
    } else {
      console.log(`  ❌ 가족 연결 없음`)
    }
    
    console.log('\n' + '-'.repeat(60))
  }

  // 4. RLS 정책 테스트 (간접적으로)
  console.log('\n🛡️ === RLS 정책 간접 테스트 ===')
  const parent = profiles.find(p => p.user_type === 'parent')
  if (parent && children.length > 0) {
    const testChild = children[0] // 첫째로 테스트
    
    console.log(`\n👨‍👩‍👧‍👦 부모 ${parent.full_name}이 ${testChild.full_name} 데이터 조회:`)
    
    // 부모가 자녀 미션 조회
    const { data: parentMissions, error: parentMissionError } = await supabase
      .from('mission_instances')
      .select('id, title')
      .eq('user_id', testChild.id)
      .limit(3)
      
    console.log(`  📋 미션 조회: ${parentMissionError ? '실패' : '성공'} (${parentMissions?.length || 0}개)`)
    if (parentMissionError) console.log(`    오류: ${parentMissionError.message}`)
    
    // 부모가 자녀 거래 조회
    const { data: parentTx, error: parentTxError } = await supabase
      .from('allowance_transactions')
      .select('id, amount')
      .eq('user_id', testChild.id)
      .limit(3)
      
    console.log(`  💰 거래 조회: ${parentTxError ? '실패' : '성공'} (${parentTx?.length || 0}개)`)
    if (parentTxError) console.log(`    오류: ${parentTxError.message}`)
  }

  console.log('\n🔍 ========== 분석 완료 ==========')
}

compareMissionVsAllowance().catch(console.error)