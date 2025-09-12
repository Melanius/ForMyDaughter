/**
 * 🧪 테스트 데이터 추가 스크립트
 * 각 자녀에게 거래내역 추가
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://igqlkqqgfzbrpaeapvyb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWxrcXFnZnpicnBhZWFwdnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwOTc3OTcsImV4cCI6MjA3MTY3Mzc5N30.zR6ZUyEWMjZQhzqd_2_jgUy9t2dEZW2kK839r1uXAF0'

const supabase = createClient(supabaseUrl, supabaseKey)

function getTodayKST() {
  const now = new Date()
  const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000))
  return kst.toISOString().split('T')[0]
}

async function addTestData() {
  console.log('🧪 ========== 테스트 데이터 추가 시작 ==========')
  
  // 1. 프로필과 가족 연결 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, user_type')
    .eq('user_type', 'child')
  
  const { data: connections } = await supabase
    .from('family_connection_requests')
    .select('id, child_id, status')
    .eq('status', 'approved')
    
  console.log('👶 대상 자녀들:')
  profiles.forEach(p => console.log(`  - ${p.full_name} (${p.id.substring(0, 8)})`))
  
  const today = getTodayKST()
  
  // 2. 각 자녀별로 다른 테스트 데이터 추가
  const testData = [
    {
      name: '로미',
      transactions: [
        { amount: 2000, type: 'income', category: '미션완료', description: '🎯 방 정리하기 완료' },
        { amount: 1500, type: 'income', category: '미션완료', description: '🎯 숙제하기 완료' },
        { amount: 500, type: 'expense', category: '간식', description: '🍭 사탕 구매' }
      ]
    },
    {
      name: '로미1', 
      transactions: [
        { amount: 3000, type: 'income', category: '미션완료', description: '🎯 설거지하기 완료' },
        { amount: 1000, type: 'expense', category: '장난감', description: '🧸 스티커 구매' }
      ]
    },
    {
      name: '로미3',
      transactions: [
        { amount: 2500, type: 'income', category: '미션완료', description: '🎯 책 읽기 완료' },
        { amount: 1800, type: 'income', category: '용돈', description: '💰 주간 용돈' },
        { amount: 800, type: 'expense', category: '간식', description: '🍪 과자 구매' }
      ]
    }
  ]
  
  // 3. 데이터 추가 실행
  for (const childData of testData) {
    const child = profiles.find(p => p.full_name === childData.name)
    if (!child) {
      console.log(`⚠️ ${childData.name} 계정을 찾을 수 없음`)
      continue
    }
    
    const connection = connections.find(c => c.child_id === child.id)
    if (!connection) {
      console.log(`⚠️ ${childData.name}의 가족 연결을 찾을 수 없음`)
      continue
    }
    
    console.log(`\n💰 ${childData.name} (${child.id.substring(0, 8)}) 거래 추가:`)
    
    for (const tx of childData.transactions) {
      const { data, error } = await supabase
        .from('allowance_transactions')
        .insert({
          user_id: child.id,
          family_connection_id: connection.id,
          date: today,
          amount: tx.amount,
          type: tx.type,
          category: tx.category,
          description: tx.description,
          created_at: new Date().toISOString()
        })
        .select()
        
      if (error) {
        console.log(`  ❌ ${tx.description} 추가 실패:`, error.message)
      } else {
        console.log(`  ✅ ${tx.type} ${tx.amount}원 - ${tx.description}`)
      }
    }
  }
  
  // 4. 최종 확인
  console.log('\n📊 최종 거래내역 확인:')
  for (const child of profiles) {
    const { data: transactions } = await supabase
      .from('allowance_transactions')
      .select('amount, type, description')
      .eq('user_id', child.id)
      
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    const balance = totalIncome - totalExpense
    
    console.log(`  💰 ${child.full_name}: 거래 ${transactions.length}개, 잔액 ${balance}원`)
  }
  
  console.log('\n🧪 ========== 테스트 데이터 추가 완료 ==========')
}

addTestData().catch(console.error)