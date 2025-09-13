import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 🏗️ 새 가족 생성 API
 * 부모 계정이 대표 가족을 생성하는 경우 사용
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { familyName } = await request.json()

    // 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 사용자 프로필 확인 (부모 계정인지 체크)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type, family_code')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 400 })
    }

    if (profile.user_type !== 'parent') {
      return NextResponse.json({ error: '부모 계정만 가족을 생성할 수 있습니다.' }, { status: 403 })
    }

    if (profile.family_code) {
      return NextResponse.json({ error: '이미 가족에 속해 있습니다.' }, { status: 400 })
    }

    // 새 가족 생성 함수 호출
    const { data, error } = await supabase.rpc('create_new_family', {
      user_id: user.id
    })

    if (error) {
      console.error('가족 생성 실패:', error)
      return NextResponse.json({ error: '가족 생성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      familyCode: data,
      message: `${familyName} 가족이 생성되었습니다! 가족 코드: ${data}` 
    })

  } catch (error) {
    console.error('가족 생성 API 오류:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '가족 생성 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}