'use client'

import { useState, useEffect } from 'react'
import { X, Save, User, Calendar, Phone, MessageSquare, Camera } from 'lucide-react'
import { Profile } from '@/lib/types/supabase'
import { ProfileImageUpload } from '@/components/family/ProfileImageUpload'

interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
  currentProfile: Profile
  onUpdate: (updatedProfile: Partial<Profile>) => Promise<void>
}

export function ProfileEditModal({ 
  isOpen, 
  onClose, 
  currentProfile, 
  onUpdate 
}: ProfileEditModalProps) {
  const [formData, setFormData] = useState({
    full_name: currentProfile.full_name || '',
    nickname: currentProfile.nickname || '',
    birthday: currentProfile.birthday || '',
    phone: currentProfile.phone || '',
    bio: currentProfile.bio || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState(currentProfile.avatar_url || '')

  // 모달이 열릴 때마다 현재 프로필 데이터로 초기화
  useEffect(() => {
    if (isOpen) {
      setFormData({
        full_name: currentProfile.full_name || '',
        nickname: currentProfile.nickname || '',
        birthday: currentProfile.birthday || '',
        phone: currentProfile.phone || '',
        bio: currentProfile.bio || ''
      })
      setProfileImageUrl(currentProfile.avatar_url || '')
      setError(null)
    }
  }, [isOpen, currentProfile])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImageUpdate = (newUrl: string) => {
    setProfileImageUrl(newUrl)
  }

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      setError('이름을 입력해주세요')
      return false
    }

    if (formData.phone && !/^01[0-9]-?\d{4}-?\d{4}$/.test(formData.phone.replace(/-/g, ''))) {
      setError('올바른 휴대전화 번호를 입력해주세요 (예: 010-1234-5678)')
      return false
    }

    if (formData.bio && formData.bio.length > 200) {
      setError('하고싶은말은 200자 이내로 입력해주세요')
      return false
    }

    return true
  }

  const handleSave = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)
      setError(null)

      const updateData: Partial<Profile> = {
        full_name: formData.full_name.trim(),
        nickname: formData.nickname.trim() || null,
        birthday: formData.birthday || null,
        phone: formData.phone.trim() || null,
        bio: formData.bio.trim() || null
      }

      // 프로필 이미지가 변경된 경우에만 포함
      if (profileImageUrl !== currentProfile.avatar_url) {
        updateData.avatar_url = profileImageUrl
      }

      await onUpdate(updateData)
      onClose()
    } catch (error) {
      console.error('프로필 업데이트 실패:', error)
      setError('프로필 업데이트에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    // 원래 데이터로 리셋
    setFormData({
      full_name: currentProfile.full_name || '',
      nickname: currentProfile.nickname || '',
      birthday: currentProfile.birthday || '',
      phone: currentProfile.phone || '',
      bio: currentProfile.bio || ''
    })
    setProfileImageUrl(currentProfile.avatar_url || '')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-800">개인정보 수정</h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* 컨텐츠 */}
        <div className="p-6 space-y-6">
          {/* 프로필 사진 */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-center gap-2">
              <Camera className="w-5 h-5" />
              프로필 사진
            </h3>
            <div className="flex justify-center">
              <ProfileImageUpload
                userId={currentProfile.id}
                currentImageUrl={profileImageUrl}
                name={currentProfile.full_name || '사용자'}
                role={currentProfile.user_type === 'parent' ? 'father' : 'child'}
                canEdit={true}
                onImageUpdate={handleImageUpdate}
              />
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5" />
              기본 정보
            </h3>
            
            {/* 이름 */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                이름 *
              </label>
              <input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="홍길동"
                disabled={loading}
                maxLength={50}
              />
            </div>

            {/* 닉네임 */}
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                닉네임
              </label>
              <input
                id="nickname"
                type="text"
                value={formData.nickname}
                onChange={(e) => handleInputChange('nickname', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="별명이나 애칭을 입력하세요"
                disabled={loading}
                maxLength={30}
              />
            </div>

            {/* 생일 */}
            <div>
              <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                생일
              </label>
              <input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => handleInputChange('birthday', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                disabled={loading}
              />
            </div>

            {/* 휴대전화 */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                휴대전화
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="010-1234-5678"
                disabled={loading}
              />
            </div>
          </div>

          {/* 하고싶은말 */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              가족에게 하고싶은말
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              rows={3}
              placeholder="가족에게 전하고 싶은 메시지를 입력하세요..."
              disabled={loading}
              maxLength={200}
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {formData.bio.length}/200자
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !formData.full_name.trim()}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}