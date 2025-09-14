import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 1. 현재 사용자 정보 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.log('🔍 현재 프로필:', profile)

    let updateNeeded = false
    const updates: any = {}

    // 2. user_type 변환 (parent -> father, child -> son)
    if (profile.user_type === 'parent') {
      updates.user_type = 'father'  // 기본값으로 father 설정
      updateNeeded = true
    } else if (profile.user_type === 'child') {
      updates.user_type = 'son'     // 기본값으로 son 설정
      updateNeeded = true
    }

    // 3. 업데이트 실행
    if (updateNeeded) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select('*')
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: '사용자 타입이 업데이트되었습니다',
        before: profile,
        after: updatedProfile
      })
    } else {
      return NextResponse.json({
        success: true,
        message: '업데이트가 필요하지 않습니다',
        current: profile
      })
    }

  } catch (error) {
    console.error('Fix user type API 오류:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다' 
    }, { status: 500 })
  }
}