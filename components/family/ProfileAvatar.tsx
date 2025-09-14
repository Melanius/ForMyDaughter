'use client'

import { useState } from 'react'
import { User, Camera } from 'lucide-react'

interface ProfileAvatarProps {
  imageUrl?: string
  name: string
  role: string
  size?: 'sm' | 'md' | 'lg'
  canEdit?: boolean
  onEditClick?: () => void
}

export function ProfileAvatar({ 
  imageUrl, 
  name, 
  role, 
  size = 'md', 
  canEdit = false,
  onEditClick 
}: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false)

  // 크기별 CSS 클래스
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16 sm:w-20 sm:h-20', 
    lg: 'w-24 h-24 sm:w-32 sm:h-32'
  }

  // 역할별 기본 이모지
  const getRoleEmoji = (role: string) => {
    switch (role) {
      case 'father': return '👨'
      case 'mother': return '👩'
      case 'son': return '👦'
      case 'daughter': return '👧'
      case 'child': return '🧒' // 호환성을 위해 유지
      default: return '👤'
    }
  }

  // 이미지 로드 실패 시 처리
  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <div className="relative group">
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-4 border-white shadow-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center`}>
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={`${name}님의 프로필 사진`}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        ) : (
          <div className="flex items-center justify-center text-3xl sm:text-4xl">
            {getRoleEmoji(role)}
          </div>
        )}
      </div>

      {/* 편집 버튼 (본인만 표시) */}
      {canEdit && (
        <button
          onClick={onEditClick}
          className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 group-hover:scale-110"
        >
          <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}
    </div>
  )
}