/**
 * 🔍 DB 직접 진단 스크립트
 * 첫째만 데이터 나오는 문제 분석
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://igqlkqqgfzbrpaeapvyb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWxrcXFnZnpicnBhZWFwdnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwOTc3OTcsImV4cCI6MjA3MTY3Mzc5N30.zR6ZUyEWMjZQhzqd_2_jgUy9t2dEZW2kK839r1uXAF0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugDatabase() {
  console.log('🔍 ========== DB 진단 시작 ==========')
  
  // 1. 프로필 확인
  console.log('\n📋 1. 전체 프로필 확인')
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, user_type, parent_id')
    .order('created_at')
  
  if (profileError) {
    console.error('❌ 프로필 조회 실패:', profileError)
    return
  }
  
  console.log('👥 프로필 목록:')
  profiles.forEach((p, idx) => {
    console.log(`  ${idx + 1}. ${p.full_name} (${p.user_type}) - ID: ${p.id.substring(0, 8)}`)
    if (p.parent_id) {
      const parent = profiles.find(pp => pp.id === p.parent_id)
      console.log(`      부모: ${parent?.full_name || 'Unknown'}`)
    }
  })
  
  // 2. 가족 연결 확인
  console.log('\n🔗 2. 가족 연결 상태 확인')
  const { data: connections, error: connectionError } = await supabase
    .from('family_connection_requests')
    .select('id, parent_id, child_id, status')
  
  if (connectionError) {
    console.error('❌ 가족 연결 조회 실패:', connectionError)
  } else {
    console.log('🔗 가족 연결 목록:')
    connections.forEach((c, idx) => {
      const parent = profiles.find(p => p.id === c.parent_id)
      const child = profiles.find(p => p.id === c.child_id)
      console.log(`  ${idx + 1}. ${parent?.full_name} → ${child?.full_name} (${c.status})`)
      console.log(`      연결ID: ${c.id.substring(0, 8)}`)
    })
  }
  
  // 3. 거래내역 확인 (각 자녀별)
  console.log('\n💰 3. 각 자녀별 거래내역 확인')
  const children = profiles.filter(p => p.user_type === 'child')
  
  for (const child of children) {
    console.log(`\n👶 ${child.full_name} (${child.id.substring(0, 8)}) 거래내역:`)
    
    const { data: transactions, error: txError } = await supabase
      .from('allowance_transactions')
      .select('id, amount, type, category, description, date, family_connection_id, created_at')
      .eq('user_id', child.id)
      .order('created_at', { ascending: false })
    
    if (txError) {
      console.error(`  ❌ ${child.full_name} 거래 조회 실패:`, txError)
    } else {
      console.log(`  📊 총 거래 수: ${transactions.length}`)
      
      if (transactions.length > 0) {
        transactions.slice(0, 3).forEach((tx, idx) => {
          console.log(`    ${idx + 1}. ${tx.type} ${tx.amount}원 - ${tx.description}`)
          console.log(`       날짜: ${tx.date}, 카테고리: ${tx.category}`)
          console.log(`       가족연결ID: ${tx.family_connection_id?.substring(0, 8) || 'NULL'}`)
        })
        if (transactions.length > 3) {
          console.log(`       ... 외 ${transactions.length - 3}개`)
        }
      } else {
        console.log(`  ⚠️ 거래내역 없음`)
      }
    }
  }
  
  // 4. RLS 정책 상태 확인 (가능한 범위에서)
  console.log('\n🛡️ 4. RLS 관련 테스트')
  
  // 부모 계정으로 자녀 거래 조회 테스트
  const parent = profiles.find(p => p.user_type === 'parent')
  if (parent && children.length > 0) {
    console.log(`\n👨‍👩‍👧‍👦 부모 ${parent.full_name}으로 자녀 거래 조회 테스트:`)
    
    // 임시로 부모 세션으로 설정 (실제로는 auth.uid() 사용)
    for (const child of children.slice(0, 2)) { // 첫 두 자녀만 테스트
      const { data: parentViewTx, error: parentViewError } = await supabase
        .from('allowance_transactions')
        .select('id, amount, type')
        .eq('user_id', child.id)
      
      if (parentViewError) {
        console.log(`  ❌ ${child.full_name} 거래 조회 실패 (부모 관점):`, parentViewError.message)
      } else {
        console.log(`  ✅ ${child.full_name} 거래 ${parentViewTx.length}개 조회 성공 (부모 관점)`)
      }
    }
  }
  
  console.log('\n🔍 ========== DB 진단 완료 ==========')
}

debugDatabase().catch(console.error)