'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import familyService from '@/lib/services/familyService'
import { FamilyWithMembers } from '@/lib/types/family'
import { Copy, Users, Settings, Crown, Heart } from 'lucide-react'
import { ProfileImageUpload } from '@/components/family/ProfileImageUpload'
import { SwipeableProfileCard } from '@/components/family/SwipeableProfileCard'
import { EventDayCounter } from '@/components/family/EventDayCounter'
import { EventManageModal } from '@/components/family/EventManageModal'
import { FamilyJoinOptions } from '@/components/family/FamilyJoinOptions'
import { ProfileEditModal } from '@/components/profile/ProfileEditModal'
import { Profile } from '@/lib/types/supabase'

export default function FamilyPage() {
  const { user, profile } = useAuth()
  const [family, setFamily] = useState<FamilyWithMembers | null>(null)
  const [loading, setLoading] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (user && profile) {
      loadFamilyData()
    }
  }, [user, profile])

  const loadFamilyData = async () => {
    try {
      setLoading(true)
      const familyData = await familyService.getCurrentUserFamily()
      setFamily(familyData)
    } catch (error) {
      console.error('가족 정보 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyFamilyCode = async () => {
    if (family?.family_code) {
      try {
        await navigator.clipboard.writeText(family.family_code)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } catch (err) {
        // 클립보드 API 실패 시 알림으로 대체
        alert(`가족 코드: ${family.family_code}`)
      }
    }
  }

  const handleProfileEdit = (userId: string) => {
    if (!family) return
    
    // 해당 사용자의 프로필 정보 찾기
    const member = family.members.find(m => m.user_id === userId)
    if (member) {
      const profileData: Profile = {
        id: member.profile.id,
        email: '', // 이메일은 편집하지 않으므로 빈 값
        full_name: member.profile.full_name,
        user_type: member.profile.user_type,
        family_code: null,
        parent_id: null,
        avatar_url: member.profile.avatar_url || null,
        birthday: (member.profile as any).birthday || null,
        phone: (member.profile as any).phone || null,
        nickname: (member.profile as any).nickname || null,
        bio: (member.profile as any).bio || null,
        created_at: '',
        updated_at: ''
      }
      setCurrentProfile(profileData)
      setShowProfileModal(true)
    }
  }

  const handleProfileUpdate = async (updatedData: Partial<Profile>) => {
    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '프로필 업데이트에 실패했습니다')
      }

      // 가족 데이터 새로고침
      await loadFamilyData()
      
      console.log('✅ 프로필이 성공적으로 업데이트되었습니다')
    } catch (error) {
      console.error('❌ 프로필 업데이트 실패:', error)
      throw error
    }
  }

  const handleCreateFamily = async (familyName: string) => {
    try {
      const response = await fetch('/api/family/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyName })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || '가족 생성에 실패했습니다.')
      }

      alert(data.message)
      await loadFamilyData() // 가족 정보 다시 로드
    } catch (error) {
      console.error('가족 생성 오류:', error)
      alert(error instanceof Error ? error.message : '가족 생성 중 오류가 발생했습니다.')
    }
  }

  const handleJoinFamily = async (familyCode: string) => {
    try {
      const response = await fetch('/api/family/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyCode })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || '가족 참여에 실패했습니다.')
      }

      alert(data.message)
      await loadFamilyData() // 가족 정보 다시 로드
    } catch (error) {
      console.error('가족 참여 오류:', error)
      alert(error instanceof Error ? error.message : '가족 참여 중 오류가 발생했습니다.')
    }
  }


  // 역할별 이모지 반환
  const getRoleEmoji = (role: string) => {
    switch (role) {
      case 'father': return '👨'
      case 'mother': return '👩'
      case 'child': return '🧒'
      default: return '👤'
    }
  }

  // 역할별 한국어 반환
  const getRoleText = (role: string) => {
    switch (role) {
      case 'father': return '아빠'
      case 'mother': return '엄마'
      case 'child': return '자녀'
      default: return '가족'
    }
  }


  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <div className="text-xl font-medium text-gray-700">로그인이 필요해요!</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🔄</div>
          <div className="text-xl font-medium text-gray-700">가족 정보를 불러오고 있어요...</div>
        </div>
      </div>
    )
  }

  if (!family) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="w-full">
          <FamilyJoinOptions
            onCreateFamily={handleCreateFamily}
            onJoinFamily={handleJoinFamily}
            loading={loading}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Heart className="w-10 h-10 text-red-400" />
            <h1 className="text-4xl font-bold text-gray-800">
              우리 가족
            </h1>
            <Users className="w-10 h-10 text-blue-400" />
          </div>
          <p className="text-lg text-gray-600">
            {family.family_name}
          </p>
        </div>

        <div className="space-y-6">
          {/* 가족 통계 섹션 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📊</span>
              <h2 className="text-xl font-bold text-gray-800">가족 현황</h2>
            </div>
            
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              <div className="bg-blue-50 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl mb-1 sm:mb-2">👨‍👩‍👧‍👦</div>
                <div className="text-lg sm:text-2xl font-bold text-blue-600">{family.members.length}</div>
                <div className="text-xs sm:text-sm text-gray-600">전체 구성원</div>
              </div>
              
              <div className="bg-green-50 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl mb-1 sm:mb-2">👑</div>
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {family.members.filter(m => ['father', 'mother'].includes(m.role)).length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">부모님</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl mb-1 sm:mb-2">🧒</div>
                <div className="text-lg sm:text-2xl font-bold text-purple-600">
                  {family.members.filter(m => m.role === 'child').length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">자녀</div>
              </div>
              
              <EventDayCounter
                familyId={family.id}
                onClick={() => setShowEventModal(true)}
              />
            </div>
          </div>

          {/* 가족 구성원 섹션 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">👨‍👩‍👧‍👦</span>
              <h2 className="text-xl font-bold text-gray-800">
                우리 가족 구성원 ({family.members.length}명)
              </h2>
            </div>
            
            <div className="relative">
              <SwipeableProfileCard
                members={family.members}
                currentUserId={user?.id}
                onImageUpdate={(userId, newUrl) => {
                  // 이미지 업데이트 시 상태 갱신
                  setFamily(prev => {
                    if (!prev) return prev
                    return {
                      ...prev,
                      members: prev.members.map(m => 
                        m.user_id === userId 
                          ? { ...m, profile: { ...m.profile, avatar_url: newUrl } }
                          : m
                      )
                    }
                  })
                }}
                onProfileEdit={handleProfileEdit}
              />
            </div>
          </div>

          {/* 가족 코드 섹션 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🔑</span>
              <h2 className="text-xl font-bold text-gray-800">가족 코드</h2>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">친구나 형제가 우리 가족에 참여할 때 사용해요</p>
                <div className="flex justify-center mb-6">
                  <div className="bg-white rounded-lg px-6 py-3 border-2 border-dashed border-gray-300">
                    <span className="text-2xl font-mono font-bold text-blue-600">
                      {family.family_code}
                    </span>
                  </div>
                </div>
                
                {/* 복사 버튼을 하단 중앙으로 이동 */}
                <div className="flex justify-center mb-4">
                  <button
                    onClick={copyFamilyCode}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${
                      copySuccess 
                        ? 'bg-green-500 text-white shadow-lg' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl'
                    }`}
                  >
                    <Copy className="w-4 h-4" />
                    {copySuccess ? '복사됨!' : '복사하기'}
                  </button>
                </div>
                
              </div>
            </div>
          </div>

          {/* 도움말 섹션 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-dashed border-blue-200">
            <div className="text-center">
              <div className="text-4xl mb-3">💡</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">도움말</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• 가족 코드를 복사해서 새 가족 구성원을 초대할 수 있어요</p>
                <p>• 부모님은 가족 코드를 새로 만들 수 있어요</p>
                <p>• 모든 가족이 함께 미션과 용돈을 관리할 수 있어요</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 이벤트 관리 모달 */}
      {family && (
        <EventManageModal
          isOpen={showEventModal}
          onClose={() => setShowEventModal(false)}
          familyId={family.id}
        />
      )}

      {/* 개인정보 수정 모달 */}
      {currentProfile && family && (
        <ProfileEditModal
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false)
            setCurrentProfile(null)
          }}
          currentProfile={currentProfile}
          currentRole={family.members.find(m => m.user_id === user?.id)?.role}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  )
}