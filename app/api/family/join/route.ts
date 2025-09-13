import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 🔗 기존 가족 참여 API
 * 두 번째 부모나 다른 가족 구성원이 기존 가족에 참여하는 경우 사용
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { familyCode } = await request.json()

    if (!familyCode) {
      return NextResponse.json({ error: '가족 코드를 입력해주세요.' }, { status: 400 })
    }

    // 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 사용자 프로필 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type, family_code, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 400 })
    }

    if (profile.family_code) {
      return NextResponse.json({ error: '이미 가족에 속해 있습니다.' }, { status: 400 })
    }

    // 기존 가족 참여 함수 호출
    const { data, error } = await supabase.rpc('join_existing_family', {
      user_id: user.id,
      family_code_input: familyCode
    })

    if (error) {
      console.error('가족 참여 실패:', error)
      return NextResponse.json({ error: error.message || '가족 참여에 실패했습니다.' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `${profile.full_name}님이 가족에 참여했습니다!` 
    })

  } catch (error) {
    console.error('가족 참여 API 오류:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '가족 참여 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}