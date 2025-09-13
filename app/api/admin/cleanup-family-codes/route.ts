import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 🧹 관리자용: 자동 생성된 불필요한 family_code 정리 API
 * 자녀가 없는 부모 계정의 family_code를 NULL로 설정
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    console.log('🧹 자동 생성된 불필요한 family_code 정리 시작...')

    // 1. 자녀가 없는 부모 계정들 찾기
    const { data: parentsWithoutChildren, error: queryError } = await supabase
      .from('profiles')
      .select('id, email, family_code')
      .eq('user_type', 'parent')
      .not('family_code', 'is', null)

    if (queryError) {
      console.error('부모 계정 조회 오류:', queryError)
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    console.log(`📊 family_code가 있는 부모 계정 ${parentsWithoutChildren.length}개 발견`)

    let cleanedCount = 0
    const cleanedAccounts = []

    for (const parent of parentsWithoutChildren) {
      // 해당 부모의 자녀가 있는지 확인
      const { data: children, error: childError } = await supabase
        .from('profiles')
        .select('id')
        .eq('parent_id', parent.id)
        .eq('user_type', 'child')

      if (childError) {
        console.error(`자녀 확인 오류 (${parent.email}):`, childError)
        continue
      }

      // 자녀가 없으면 family_code 제거
      if (!children || children.length === 0) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ family_code: null })
          .eq('id', parent.id)

        if (updateError) {
          console.error(`family_code 제거 오류 (${parent.email}):`, updateError)
        } else {
          console.log(`✅ ${parent.email}: family_code ${parent.family_code} 제거됨`)
          cleanedCount++
          cleanedAccounts.push({
            email: parent.email,
            removedFamilyCode: parent.family_code
          })
        }
      } else {
        console.log(`🔒 ${parent.email}: 자녀 ${children.length}명 있어서 family_code 유지`)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${cleanedCount}개 계정의 불필요한 family_code가 정리되었습니다.`,
      cleanedCount,
      cleanedAccounts
    })

  } catch (error) {
    console.error('family_code 정리 중 오류:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'family_code 정리 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}