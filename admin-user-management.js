/**
 * 관리자용 사용자 관리 스크립트
 * 사용법: node admin-user-management.js [list|delete]
 */

const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')
const path = require('path')
const fs = require('fs')

// .env.local 파일 로드
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local 파일을 찾을 수 없습니다.')
    return false
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')
  
  lines.forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    }
  })
  
  return true
}

if (!loadEnv()) {
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase URL 또는 Anon Key가 설정되지 않았습니다.')
  process.exit(1)
}

// 서비스 키가 있으면 사용하고, 없으면 일반 키 사용
const isAdmin = !!supabaseServiceKey
const supabaseKey = supabaseServiceKey || supabaseAnonKey

console.log(`🔑 ${isAdmin ? '관리자' : '일반 사용자'} 권한으로 연결합니다.`)

if (!isAdmin) {
  console.log('⚠️  서비스 키가 없어 일부 기능이 제한됩니다.')
  console.log('   완전한 관리 기능을 위해서는 .env.local에 SUPABASE_SERVICE_ROLE_KEY를 추가하세요.\n')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve)
  })
}

// 모든 사용자 목록 조회
async function listUsers() {
  console.log('\n🔍 등록된 사용자 목록을 조회합니다...\n')
  
  try {
    // profiles 테이블에서 모든 사용자 정보 조회
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        user_type,
        family_code,
        parent_id,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (profileError) {
      console.error('❌ 사용자 정보 조회 실패:', profileError)
      return []
    }

    if (!profiles || profiles.length === 0) {
      console.log('📝 등록된 사용자가 없습니다.')
      return []
    }

    console.log(`📊 총 ${profiles.length}명의 사용자가 등록되어 있습니다.\n`)
    console.log('━'.repeat(120))
    console.log('번호 | 사용자 ID                            | 이메일                    | 이름      | 유형 | 가족코드      | 가입일')
    console.log('━'.repeat(120))

    profiles.forEach((user, index) => {
      const createdAt = new Date(user.created_at).toLocaleDateString('ko-KR')
      const familyCode = user.family_code || '-'
      const userType = user.user_type === 'parent' ? '부모' : '자녀'
      
      console.log(
        `${String(index + 1).padStart(2)} | ${user.id} | ${user.email.padEnd(25)} | ${user.full_name.padEnd(8)} | ${userType.padEnd(2)} | ${familyCode.padEnd(12)} | ${createdAt}`
      )
    })
    console.log('━'.repeat(120))

    return profiles

  } catch (error) {
    console.error('❌ 사용자 목록 조회 중 오류 발생:', error)
    return []
  }
}

// 사용자 삭제 (완전 삭제)
async function deleteUser(userId, userEmail) {
  console.log(`\n⚠️  사용자 삭제를 진행합니다:`)
  console.log(`   ID: ${userId}`)
  console.log(`   이메일: ${userEmail}`)
  
  const confirmation = await question('\n정말로 이 사용자를 삭제하시겠습니까? (yes/no): ')
  
  if (confirmation.toLowerCase() !== 'yes') {
    console.log('❎ 사용자 삭제가 취소되었습니다.')
    return false
  }

  try {
    console.log('\n🗑️ 사용자 관련 데이터를 삭제합니다...')

    // 1. 관련 테이블 데이터 삭제 순서 중요 (외래 키 제약으로 인해)
    
    // 1-1. family_connection_requests 삭제
    await supabase
      .from('family_connection_requests')
      .delete()
      .or(`parent_id.eq.${userId},child_id.eq.${userId}`)

    // 1-2. 자녀인 경우 mission_instances 삭제
    await supabase
      .from('mission_instances')
      .delete()
      .eq('user_id', userId)

    // 1-3. mission_templates 삭제
    await supabase
      .from('mission_templates')
      .delete()
      .eq('user_id', userId)

    // 1-4. allowance_transactions 삭제
    await supabase
      .from('allowance_transactions')
      .delete()
      .eq('user_id', userId)

    // 1-5. allowance_balances 삭제
    await supabase
      .from('allowance_balances')
      .delete()
      .eq('user_id', userId)

    // 1-6. user_progress 삭제 (연속 기록)
    await supabase
      .from('user_progress')
      .delete()
      .eq('user_id', userId)

    // 1-7. reward_settings 삭제
    await supabase
      .from('reward_settings')
      .delete()
      .eq('user_id', userId)

    // 1-8. reward_history 삭제
    await supabase
      .from('reward_history')
      .delete()
      .eq('user_id', userId)

    // 2. profiles 테이블에서 삭제
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('❌ 프로필 삭제 실패:', profileError)
      throw profileError
    }

    // 3. Supabase Auth에서 사용자 삭제 (서비스 키가 있을 때만)
    if (isAdmin) {
      const { error: authError } = await supabase.auth.admin.deleteUser(userId)
      
      if (authError) {
        console.error('❌ 인증 사용자 삭제 실패:', authError)
        throw authError
      }
    } else {
      console.log('⚠️  서비스 키가 없어 Auth 사용자는 삭제되지 않습니다.')
      console.log('   완전한 삭제를 위해서는 Supabase Dashboard에서 직접 삭제해야 합니다.')
    }

    console.log('✅ 사용자 데이터가 성공적으로 삭제되었습니다.')
    console.log('   - 프로필 정보 삭제 완료')
    console.log('   - 관련 데이터 삭제 완료')
    if (isAdmin) {
      console.log('   - 인증 계정 삭제 완료')
    } else {
      console.log('   - 인증 계정은 Supabase Dashboard에서 수동 삭제 필요')
    }
    
    return true

  } catch (error) {
    console.error('❌ 사용자 삭제 중 오류 발생:', error)
    return false
  }
}

// 메인 실행 함수
async function main() {
  console.log('🔧 MoneySeed 사용자 관리 도구')
  console.log('================================')
  
  const command = process.argv[2]
  
  try {
    if (command === 'list') {
      await listUsers()
    } else if (command === 'delete') {
      const users = await listUsers()
      
      if (users.length === 0) {
        console.log('삭제할 사용자가 없습니다.')
        return
      }
      
      console.log('\n삭제할 사용자의 번호를 입력하세요 (취소: 0):')
      const input = await question('번호: ')
      const userIndex = parseInt(input) - 1
      
      if (input === '0') {
        console.log('❎ 삭제가 취소되었습니다.')
      } else if (userIndex >= 0 && userIndex < users.length) {
        const user = users[userIndex]
        await deleteUser(user.id, user.email)
      } else {
        console.log('❌ 잘못된 번호입니다.')
      }
    } else {
      console.log('\n사용법:')
      console.log('  node admin-user-management.js list    # 사용자 목록 조회')
      console.log('  node admin-user-management.js delete   # 사용자 삭제')
      console.log('\n예시:')
      console.log('  node admin-user-management.js list')
    }
  } catch (error) {
    console.error('❌ 실행 중 오류 발생:', error)
  } finally {
    rl.close()
  }
}

main().catch(console.error)