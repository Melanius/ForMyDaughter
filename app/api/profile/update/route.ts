import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { nowKST } from '@/lib/utils/dateUtils'

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 요청 데이터 파싱
    const updateData = await request.json()
    
    // 허용된 필드만 추출
    const allowedFields = ['full_name', 'nickname', 'birthday', 'phone', 'bio', 'avatar_url']
    const profileUpdate: Record<string, any> = {}
    
    for (const field of allowedFields) {
      if (updateData.hasOwnProperty(field)) {
        profileUpdate[field] = updateData[field]
      }
    }

    // 역할 업데이트 처리 (부모의 경우)
    let familyMemberUpdate: Record<string, any> | null = null
    if (updateData.role) {
      familyMemberUpdate = {
        role: updateData.role,
        updated_at: nowKST()
      }
    }

    // 필수 필드 검증
    if (profileUpdate.full_name !== undefined && !profileUpdate.full_name?.trim()) {
      return NextResponse.json({ error: '이름을 입력해주세요' }, { status: 400 })
    }

    // 휴대전화 번호 형식 검증
    if (profileUpdate.phone && !/^01[0-9]-?\d{4}-?\d{4}$/.test(profileUpdate.phone.replace(/-/g, ''))) {
      return NextResponse.json({ 
        error: '올바른 휴대전화 번호를 입력해주세요 (예: 010-1234-5678)' 
      }, { status: 400 })
    }

    // bio 길이 검증
    if (profileUpdate.bio && profileUpdate.bio.length > 200) {
      return NextResponse.json({ 
        error: '하고싶은말은 200자 이내로 입력해주세요' 
      }, { status: 400 })
    }

    // updated_at 필드 추가
    profileUpdate.updated_at = nowKST()

    // 프로필 업데이트
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('프로필 업데이트 실패:', updateError)
      return NextResponse.json({ 
        error: '프로필 업데이트에 실패했습니다' 
      }, { status: 500 })
    }

    // 가족 구성원 역할 업데이트 (새로운 family_members 테이블이 있는 경우에만)
    if (familyMemberUpdate) {
      const { error: memberUpdateError } = await supabase
        .from('family_members')
        .update(familyMemberUpdate)
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (memberUpdateError) {
        console.error('가족 구성원 역할 업데이트 실패:', memberUpdateError)
        // 프로필은 성공했으므로 경고만 로그에 남김
      }
    }

    return NextResponse.json({ 
      success: true, 
      profile: updatedProfile,
      message: '프로필이 성공적으로 업데이트되었습니다'
    })

  } catch (error) {
    console.error('프로필 업데이트 API 오류:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다' 
    }, { status: 500 })
  }
}