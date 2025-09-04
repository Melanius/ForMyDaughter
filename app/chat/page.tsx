'use client'

import { useAuth } from '@/components/auth/AuthProvider'

export default function ChatPage() {
  const { profile } = useAuth()

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 flex items-center justify-center">
        <p className="text-gray-600">로그인이 필요합니다.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 p-4 md:p-8 pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-4xl sm:text-5xl">💬</span>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
              채팅
            </h1>
            <span className="text-4xl sm:text-5xl">💭</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-lg text-gray-600">
            <span className="text-2xl">🔨</span>
            <span>준비 중이에요!</span>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center py-16">
            <div className="text-6xl mb-6">🚧</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              채팅 기능 개발 중
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              가족과 함께 대화할 수 있는<br />
              채팅 기능을 준비하고 있어요!
            </p>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 max-w-md mx-auto">
              <div className="text-3xl mb-3">✨</div>
              <p className="text-sm text-gray-700">
                곧 멋진 채팅 기능으로 만날게요!
              </p>
            </div>
          </div>
        </div>

        {/* 사용자 정보 표시 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {profile.full_name || '사용자'}님, 조금만 기다려 주세요! 🙏
          </p>
        </div>
      </div>
    </div>
  )
}