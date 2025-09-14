import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    console.log('🔍 가족 프로필 표시 디버깅 시작...')

    // 1. 현재 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: '사용자 인증 실패',
        details: userError?.message
      })
    }

    console.log('✅ 사용자 확인:', user.id)

    // 2. 현재 사용자의 프로필 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, user_type, family_code, nickname, phone, bio, birthday')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ 프로필 조회 실패:', profileError)
      return NextResponse.json({
        success: false,
        error: '프로필 조회 실패',
        details: profileError?.message
      })
    }

    console.log('✅ 사용자 프로필:', profile)

    if (!profile.family_code) {
      return NextResponse.json({
        success: false,
        error: '가족 코드가 없습니다',
        profile: profile
      })
    }

    // 3. 같은 가족 코드의 모든 구성원 조회
    const { data: familyMembers, error: membersError } = await supabase
      .from('profiles')
      .select('id, full_name, user_type, avatar_url, family_code, nickname, phone, bio, birthday')
      .eq('family_code', profile.family_code)
      .order('user_type', { ascending: false })

    if (membersError) {
      console.error('❌ 가족 구성원 조회 실패:', membersError)
      return NextResponse.json({
        success: false,
        error: '가족 구성원 조회 실패',
        details: membersError.message
      })
    }

    console.log('✅ 가족 구성원들:', familyMembers)

    // 4. 각 구성원의 프로필 정보 상세 분석
    const membersAnalysis = familyMembers?.map(member => ({
      id: member.id,
      full_name: member.full_name,
      user_type: member.user_type,
      has_nickname: !!member.nickname,
      nickname: member.nickname,
      has_phone: !!member.phone,
      phone: member.phone,
      has_bio: !!member.bio,
      bio: member.bio,
      has_birthday: !!member.birthday,
      birthday: member.birthday,
      has_avatar: !!member.avatar_url,
      avatar_url: member.avatar_url
    }))

    return NextResponse.json({
      success: true,
      currentUser: {
        id: user.id,
        profile: profile
      },
      family: {
        family_code: profile.family_code,
        total_members: familyMembers?.length || 0,
        members: membersAnalysis
      },
      raw_data: {
        familyMembers: familyMembers
      }
    })

  } catch (error) {
    console.error('❌ 디버깅 중 오류:', error)
    return NextResponse.json({
      success: false,
      error: '예상치 못한 오류',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}