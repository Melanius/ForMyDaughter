'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { Crown } from 'lucide-react'
import { ProfileImageUpload } from './ProfileImageUpload'
import { FamilyMemberWithProfile } from '@/lib/types/family'

interface SwipeableProfileCardProps {
  members: FamilyMemberWithProfile[]
  currentUserId?: string
  onImageUpdate: (userId: string, newUrl: string) => void
}

export function SwipeableProfileCard({ 
  members, 
  currentUserId, 
  onImageUpdate 
}: SwipeableProfileCardProps) {
  // 현재 사용자를 첫 번째로 정렬
  const sortedMembers = [...members].sort((a, b) => {
    if (a.user_id === currentUserId) return -1
    if (b.user_id === currentUserId) return 1
    return 0
  })

  // 역할별 한국어 반환
  const getRoleText = (role: string) => {
    switch (role) {
      case 'father': return '아빠'
      case 'mother': return '엄마'
      case 'child': return '자녀'
      default: return '가족'
    }
  }

  // 프로필 정보 (확장 예정)
  const getProfileInfo = (member: FamilyMemberWithProfile) => {
    return [
      { label: '역할', value: getRoleText(member.role) },
      { label: '가입일', value: new Date(member.joined_at).toLocaleDateString('ko-KR') },
      // TODO: 생일, 메시지 등 추가 정보
    ]
  }

  return (
    <div className="w-full">
      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={20}
        slidesPerView={1}
        navigation={{
          nextEl: '.swiper-button-next-custom',
          prevEl: '.swiper-button-prev-custom',
        }}
        pagination={{
          clickable: true,
          bulletClass: 'w-2 h-2 bg-gray-300 rounded-full inline-block mx-1 cursor-pointer transition-colors',
          bulletActiveClass: 'bg-blue-500',
        }}
        className="family-profile-swiper"
      >
        {sortedMembers.map((member) => (
          <SwiperSlide key={member.id}>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              {/* 프로필 사진 */}
              <div className="relative flex justify-center mb-6">
                <ProfileImageUpload
                  userId={member.user_id}
                  currentImageUrl={member.profile.avatar_url}
                  name={member.profile.full_name}
                  role={member.role}
                  canEdit={member.user_id === currentUserId}
                  onImageUpdate={(newUrl) => onImageUpdate(member.user_id, newUrl)}
                />
                
                {/* 현재 사용자 표시 */}
                {member.user_id === currentUserId && (
                  <div className="absolute -top-2 -right-2">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
                      ✨ 나
                    </div>
                  </div>
                )}
              </div>

              {/* 이름 및 역할 */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {member.profile.full_name}
                </h3>
                <div className="flex items-center justify-center gap-2">
                  {['father', 'mother'].includes(member.role) && (
                    <Crown className="w-5 h-5 text-yellow-500" />
                  )}
                  <span className="text-lg text-gray-600 font-medium">
                    {getRoleText(member.role)}
                  </span>
                </div>
              </div>

              {/* 프로필 정보 */}
              <div className="space-y-4">
                {getProfileInfo(member).map((info, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-gray-600 font-medium">{info.label}</span>
                    <span className="text-gray-800">{info.value}</span>
                  </div>
                ))}
              </div>

              {/* 추가 정보 영역 (향후 확장) */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600">
                  💭 가족에게 하고 싶은 말
                </p>
                <p className="text-gray-800 mt-2 italic">
                  "아직 메시지가 없어요 ✨"
                </p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* 커스텀 네비게이션 버튼 */}
      <div className="swiper-button-prev-custom absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
        <span className="text-gray-600 text-lg">‹</span>
      </div>
      <div className="swiper-button-next-custom absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
        <span className="text-gray-600 text-lg">›</span>
      </div>
    </div>
  )
}