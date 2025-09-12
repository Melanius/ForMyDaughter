'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { ProfileAvatar } from './ProfileAvatar'
import { ImageCropModal } from './ImageCropModal'

interface ProfileImageUploadProps {
  userId: string
  currentImageUrl?: string
  name: string
  role: string
  canEdit: boolean
  onImageUpdate?: (newImageUrl: string) => void
}

export function ProfileImageUpload({
  userId,
  currentImageUrl,
  name,
  role,
  canEdit,
  onImageUpdate
}: ProfileImageUploadProps) {
  const { user } = useAuth()
  const [showCropModal, setShowCropModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // 프로필 이미지 업로드
  const handleImageSave = async (croppedImageBlob: Blob) => {
    if (!user || !canEdit) {
      alert('권한이 없습니다.')
      return
    }

    try {
      setIsUploading(true)
      const supabase = createClient()

      // 파일명 생성 (사용자ID + 타임스탬프)
      const fileName = `${userId}_${Date.now()}.jpg`
      const filePath = `avatars/${fileName}`

      // 기존 이미지 삭제 (선택사항)
      if (currentImageUrl) {
        const oldFileName = currentImageUrl.split('/').pop()
        if (oldFileName && oldFileName !== fileName) {
          await supabase.storage
            .from('family-avatars')
            .remove([`avatars/${oldFileName}`])
        }
      }

      // 새 이미지 업로드
      const { error: uploadError } = await supabase.storage
        .from('family-avatars')
        .upload(filePath, croppedImageBlob, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('family-avatars')
        .getPublicUrl(filePath)

      // 프로필 테이블 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      // 부모 컴포넌트에 알림
      onImageUpdate?.(publicUrl)

      console.log('✅ 프로필 이미지 업로드 성공:', publicUrl)
    } catch (error) {
      console.error('❌ 프로필 이미지 업로드 실패:', error)
      alert('프로필 이미지 업로드에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <ProfileAvatar
        imageUrl={currentImageUrl}
        name={name}
        role={role}
        size="lg"
        canEdit={canEdit && !isUploading}
        onEditClick={() => setShowCropModal(true)}
      />

      <ImageCropModal
        isOpen={showCropModal}
        onClose={() => setShowCropModal(false)}
        onSave={handleImageSave}
      />

      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
        </div>
      )}
    </>
  )
}