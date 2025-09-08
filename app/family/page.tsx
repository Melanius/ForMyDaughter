'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import familyService from '@/lib/services/familyService'
import { FamilyWithMembers } from '@/lib/types/family'
import { Copy, Users, Settings, RefreshCw, Crown, Heart } from 'lucide-react'

export default function FamilyPage() {
  const { user, profile } = useAuth()
  const [family, setFamily] = useState<FamilyWithMembers | null>(null)
  const [loading, setLoading] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)

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

  const regenerateFamilyCode = async () => {
    if (!family) return
    
    const confirmed = confirm('🔄 정말 가족 코드를 새로 만들까요?\n기존 코드는 사용할 수 없게 됩니다.')
    if (!confirmed) return

    try {
      const newCode = await familyService.regenerateFamilyCode(family.id)
      setFamily({ ...family, family_code: newCode })
      alert('🎉 새로운 가족 코드가 만들어졌어요!')
    } catch (error) {
      console.error('가족 코드 재생성 오류:', error)
      alert('😅 가족 코드 재생성에 실패했어요. 다시 시도해주세요.')
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

  // 현재 사용자가 부모인지 확인
  const isParent = family?.members.find(member => 
    member.user_id === user?.id && ['father', 'mother'].includes(member.role)
  )

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
        <div className="text-center max-w-md">
          <div className="text-8xl mb-6">😢</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            가족이 없어요!
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            회원가입할 때 가족을 만들거나 참여했어야 해요.
          </p>
          <button
            onClick={loadFamilyData}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 px-6 rounded-xl text-lg transition-all transform hover:scale-105"
          >
            🔄 다시 확인하기
          </button>
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
          {/* 가족 코드 섹션 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🔑</span>
              <h2 className="text-xl font-bold text-gray-800">가족 코드</h2>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
              <div className="text-center">
                <p className="text-gray-600 mb-2">친구나 형제가 우리 가족에 참여할 때 사용해요</p>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="bg-white rounded-lg px-6 py-3 border-2 border-dashed border-gray-300">
                    <span className="text-2xl font-mono font-bold text-blue-600">
                      {family.family_code}
                    </span>
                  </div>
                  <button
                    onClick={copyFamilyCode}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      copySuccess 
                        ? 'bg-green-500 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    <Copy className="w-4 h-4" />
                    {copySuccess ? '복사됨!' : '복사하기'}
                  </button>
                </div>
                
                {isParent && (
                  <button
                    onClick={regenerateFamilyCode}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-all mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    새 코드 만들기
                  </button>
                )}
              </div>
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
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {family.members.map((member) => (
                <div
                  key={member.id}
                  className={`bg-gradient-to-br rounded-xl p-4 border-2 transition-all ${
                    member.user_id === user?.id
                      ? 'from-yellow-100 to-orange-100 border-orange-300 shadow-lg' 
                      : 'from-gray-50 to-gray-100 border-gray-200'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">
                      {getRoleEmoji(member.role)}
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 mb-1">
                      {member.profile.full_name}
                      {member.nickname && ` (${member.nickname})`}
                    </h3>
                    <div className="flex items-center justify-center gap-1 mb-2">
                      {['father', 'mother'].includes(member.role) && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="text-sm font-medium text-gray-600">
                        {getRoleText(member.role)}
                      </span>
                    </div>
                    {member.user_id === user?.id && (
                      <div className="inline-block bg-orange-200 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                        ✨ 나
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 가족 통계 섹션 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📊</span>
              <h2 className="text-xl font-bold text-gray-800">가족 현황</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">👨‍👩‍👧‍👦</div>
                <div className="text-2xl font-bold text-blue-600">{family.members.length}</div>
                <div className="text-sm text-gray-600">전체 구성원</div>
              </div>
              
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">👑</div>
                <div className="text-2xl font-bold text-green-600">
                  {family.members.filter(m => ['father', 'mother'].includes(m.role)).length}
                </div>
                <div className="text-sm text-gray-600">부모님</div>
              </div>
              
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">🧒</div>
                <div className="text-2xl font-bold text-purple-600">
                  {family.members.filter(m => m.role === 'child').length}
                </div>
                <div className="text-sm text-gray-600">자녀</div>
              </div>
              
              <div className="bg-yellow-50 rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">⏰</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {new Date(family.created_at).toLocaleDateString().slice(2)}
                </div>
                <div className="text-sm text-gray-600">가족 시작일</div>
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
    </div>
  )
}