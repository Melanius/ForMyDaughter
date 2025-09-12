/**
 * 🔧 가족 연결 수정 스크립트  
 * 로미1 계정의 가족 연결 추가
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://igqlkqqgfzbrpaeapvyb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWxrcXFnZnpicnBhZWFwdnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwOTc3OTcsImV4cCI6MjA3MTY3Mzc5N30.zR6ZUyEWMjZQhzqd_2_jgUy9t2dEZW2kK839r1uXAF0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixFamilyConnection() {
  console.log('🔧 ========== 가족 연결 수정 시작 ==========')
  
  // 1. 현재 프로필 확인
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, user_type, parent_id')
    
  const parent = profiles.find(p => p.user_type === 'parent')
  const romi1 = profiles.find(p => p.full_name === '로미1')
  
  console.log('👨‍👩‍👧‍👦 대상 계정:')
  console.log(`  부모: ${parent.full_name} (${parent.id.substring(0, 8)})`)
  console.log(`  자녀: ${romi1.full_name} (${romi1.id.substring(0, 8)})`)
  
  // 2. 기존 연결 확인
  const { data: existingConnection } = await supabase
    .from('family_connection_requests')
    .select('*')
    .eq('parent_id', parent.id)
    .eq('child_id', romi1.id)
    .single()
    
  if (existingConnection) {
    console.log('✅ 이미 연결 요청 존재:', existingConnection.status)
    if (existingConnection.status !== 'approved') {
      // 승인 상태로 변경
      const { error: updateError } = await supabase
        .from('family_connection_requests')
        .update({ 
          status: 'approved',
          responded_at: new Date().toISOString()
        })
        .eq('id', existingConnection.id)
        
      if (updateError) {
        console.error('❌ 연결 승인 실패:', updateError)
      } else {
        console.log('✅ 연결 승인 완료')
      }
    }
  } else {
    console.log('🔄 새 가족 연결 요청 생성...')
    
    // 3. 새 가족 연결 요청 생성
    const { data: newConnection, error: insertError } = await supabase
      .from('family_connection_requests')
      .insert({
        parent_id: parent.id,
        child_id: romi1.id,
        status: 'approved',
        created_at: new Date().toISOString(),
        responded_at: new Date().toISOString()
      })
      .select()
      .single()
      
    if (insertError) {
      console.error('❌ 가족 연결 생성 실패:', insertError)
    } else {
      console.log('✅ 새 가족 연결 생성 완료:', newConnection.id.substring(0, 8))
    }
  }
  
  // 4. 로미1의 parent_id 업데이트
  console.log('🔄 로미1의 parent_id 업데이트...')
  const { error: parentUpdateError } = await supabase
    .from('profiles')
    .update({ parent_id: parent.id })
    .eq('id', romi1.id)
    
  if (parentUpdateError) {
    console.error('❌ parent_id 업데이트 실패:', parentUpdateError)
  } else {
    console.log('✅ parent_id 업데이트 완료')
  }
  
  // 5. 최종 확인
  console.log('\n📋 최종 가족 연결 상태:')
  const { data: finalConnections } = await supabase
    .from('family_connection_requests')
    .select('id, parent_id, child_id, status')
    
  finalConnections.forEach(c => {
    const parent = profiles.find(p => p.id === c.parent_id)
    const child = profiles.find(p => p.id === c.child_id)
    console.log(`  ✅ ${parent?.full_name} → ${child?.full_name} (${c.status})`)
  })
  
  console.log('\n🔧 ========== 가족 연결 수정 완료 ==========')
}

fixFamilyConnection().catch(console.error)