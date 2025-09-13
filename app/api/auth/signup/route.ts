import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { email, password, fullName, userType, familyCode } = await request.json()

    // 1. Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      console.error('Auth signup error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'User creation failed' }, { status: 400 })
    }

    // 2. Create user profile
    const profileData: Record<string, unknown> = {
      id: authData.user.id,
      email,
      full_name: fullName,
      user_type: userType
    }

    // 자녀인 경우만 family_code 추가 (부모는 회원가입 후 별도로 가족 생성)
    if (userType === 'child' && familyCode) {
      profileData['family_code'] = familyCode
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData)

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // 🔒 보안: 관리자 권한 제거 - 프로필 생성 실패 시에도 사용자 계정은 유지
      // 사용자가 다시 로그인 시 프로필 재생성 시도하도록 변경
      console.warn('⚠️ 프로필 생성 실패 - 사용자가 재로그인 시 프로필 생성 재시도 필요')
      return NextResponse.json({ 
        error: '프로필 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
        retryable: true 
      }, { status: 500 })
    }

    // 🔒 부모 계정의 경우 family_code가 자동 생성되지 않도록 추가 보안
    if (userType === 'parent') {
      await supabase
        .from('profiles')
        .update({ family_code: null })
        .eq('id', authData.user.id)
    }

    // 3. 자녀 계정인 경우 가족 연결 요청 생성
    if (userType === 'child' && familyCode) {
      // 부모 찾기
      const { data: parentData, error: parentError } = await supabase
        .from('profiles')
        .select('id')
        .eq('family_code', familyCode)
        .eq('user_type', 'parent')
        .single()

      if (parentError) {
        console.error('Parent lookup error:', parentError)
        return NextResponse.json({ 
          error: '가족 코드를 찾을 수 없습니다. 부모님께 확인해주세요.' 
        }, { status: 400 })
      }

      // 연결 요청 생성
      const { error: requestError } = await supabase
        .from('family_connection_requests')
        .insert({
          parent_id: parentData.id,
          child_id: authData.user.id,
        })

      if (requestError) {
        console.error('Family connection request error:', requestError)
        return NextResponse.json({ error: requestError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: userType === 'parent' 
        ? '부모 계정 회원가입이 완료되었습니다! 로그인 후 가족을 생성해주세요.' 
        : '자녀 계정 회원가입이 완료되었습니다. 부모님의 승인을 기다려주세요.'
    })

  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}