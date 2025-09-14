import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    console.log('🔍 Storage 권한 테스트 시작...')

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

    // 2. Storage 버킷 목록 조회
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    console.log('📦 사용 가능한 버킷들:', buckets)

    if (bucketsError) {
      console.error('❌ 버킷 조회 오류:', bucketsError)
      return NextResponse.json({
        success: false,
        error: '버킷 조회 실패',
        details: bucketsError.message,
        buckets: buckets
      })
    }

    // 3. family-avatars 버킷 존재 확인
    const familyAvatarsBucket = buckets?.find(bucket => bucket.name === 'family-avatars')
    if (!familyAvatarsBucket) {
      console.error('❌ family-avatars 버킷이 없습니다!')
      return NextResponse.json({
        success: false,
        error: 'family-avatars 버킷이 존재하지 않습니다',
        availableBuckets: buckets?.map(b => b.name) || []
      })
    }

    console.log('✅ family-avatars 버킷 확인:', familyAvatarsBucket)

    // 4. 테스트 업로드 시도
    const testContent = 'test-upload-content'
    const testFileName = `test-uploads/test_${user.id}_${Date.now()}.txt`

    console.log('🔄 테스트 업로드 시도:', testFileName)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('family-avatars')
      .upload(testFileName, testContent, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('❌ 테스트 업로드 실패:', uploadError)
      return NextResponse.json({
        success: false,
        error: '업로드 권한 없음',
        details: uploadError.message,
        bucketExists: true,
        userAuthenticated: true
      })
    }

    console.log('✅ 테스트 업로드 성공:', uploadData)

    // 5. 공개 URL 생성 테스트
    const { data: { publicUrl } } = supabase.storage
      .from('family-avatars')
      .getPublicUrl(testFileName)

    console.log('✅ 공개 URL 생성:', publicUrl)

    // 6. 테스트 파일 삭제
    const { error: deleteError } = await supabase.storage
      .from('family-avatars')
      .remove([testFileName])

    if (deleteError) {
      console.warn('⚠️ 테스트 파일 삭제 실패:', deleteError)
    } else {
      console.log('✅ 테스트 파일 삭제 성공')
    }

    return NextResponse.json({
      success: true,
      message: 'Storage 권한 테스트 통과!',
      details: {
        userId: user.id,
        bucketExists: true,
        uploadSuccess: true,
        publicUrlGenerated: publicUrl,
        testFileName: testFileName
      }
    })

  } catch (error) {
    console.error('❌ Storage 테스트 중 오류:', error)
    return NextResponse.json({
      success: false,
      error: '예상치 못한 오류',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}