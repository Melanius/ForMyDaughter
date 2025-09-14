import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 모든 user_type 값 조회
    const { data: userTypes, error } = await supabase
      .from('profiles')
      .select('id, full_name, user_type, family_code')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // user_type 별로 그룹화
    const typeGroups = userTypes?.reduce((acc: Record<string, any[]>, profile) => {
      const type = profile.user_type || 'null'
      if (!acc[type]) acc[type] = []
      acc[type].push(profile)
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      totalProfiles: userTypes?.length || 0,
      currentUser: user.id,
      typeGroups
    })

  } catch (error) {
    console.error('Debug API 오류:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다' 
    }, { status: 500 })
  }
}