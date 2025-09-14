import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 🔍 특정 사용자의 프로필 정보 조회 API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    const { userId } = params

    // 현재 로그인한 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 프로필 정보 조회
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      console.error('프로필 조회 실패:', error)
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 권한 확인: 본인이거나 같은 가족 구성원인지 확인
    if (profile.id !== user.id) {
      // 현재 사용자의 프로필 조회
      const { data: currentUserProfile, error: currentUserError } = await supabase
        .from('profiles')
        .select('family_code')
        .eq('id', user.id)
        .single()

      if (currentUserError || !currentUserProfile) {
        return NextResponse.json({ error: '권한 확인에 실패했습니다.' }, { status: 403 })
      }

      // 가족 코드가 같은지 확인
      if (currentUserProfile.family_code !== profile.family_code) {
        return NextResponse.json({ error: '다른 가족의 프로필에 접근할 수 없습니다.' }, { status: 403 })
      }
    }

    return NextResponse.json(profile)

  } catch (error) {
    console.error('프로필 조회 API 오류:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '프로필 조회 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}