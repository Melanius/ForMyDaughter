import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isParentRole } from '@/lib/utils/roleUtils'

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

    if (!isParentRole(profile.user_type)) {
      return NextResponse.json({ error: '부모 계정(아빠/엄마)만 가족을 생성할 수 있습니다.' }, { status: 403 })
    }

    if (profile.family_code) {
      return NextResponse.json({ error: '이미 가족에 속해 있습니다.' }, { status: 400 })
    }

    // 가족 코드 생성 (FAM + 3자리 숫자 + 3자리 대문자)
    let familyCode = ''
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      // FAM + 3자리 숫자 (100-999) + 3자리 랜덤 대문자 생성
      const numbers = Math.floor(Math.random() * 900) + 100
      const letters = Array.from({ length: 3 }, () => 
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
      ).join('')
      
      familyCode = `FAM${numbers}${letters}`

      // 중복 확인
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('family_code', familyCode)
        .limit(1)

      if (checkError) {
        console.error('가족 코드 중복 확인 실패:', checkError)
        return NextResponse.json({ error: '가족 코드 생성 중 오류가 발생했습니다.' }, { status: 500 })
      }

      // 중복이 없으면 사용
      if (!existing || existing.length === 0) {
        break
      }

      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json({ error: '가족 코드 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 })
    }

    // 사용자 프로필에 가족 코드 설정
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        family_code: familyCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('가족 코드 업데이트 실패:', updateError)
      return NextResponse.json({ error: '가족 코드 설정에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      familyCode: familyCode,
      message: `${familyName} 가족이 생성되었습니다! 가족 코드: ${familyCode}` 
    })

  } catch (error) {
    console.error('가족 생성 API 오류:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '가족 생성 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}