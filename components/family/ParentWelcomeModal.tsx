'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Users, Settings, ArrowRight, Home } from 'lucide-react'

interface ParentWelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  userName?: string
}

export function ParentWelcomeModal({ isOpen, onClose, userName }: ParentWelcomeModalProps) {
  const router = useRouter()
  const [closing, setClosing] = useState(false)

  const handleNavigateToFamily = () => {
    setClosing(true)
    onClose()
    router.push('/family')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl transform transition-all duration-300 ${
        closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}>
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">가족 관리 설정</h2>
              <p className="text-sm text-gray-600">MoneySeed에 오신 것을 환영합니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="space-y-6">
          {/* 환영 메시지 */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">👨‍👩‍👧‍👦</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {userName ? `${userName}님, 환영합니다!` : '환영합니다!'}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              자녀의 용돈 관리와 성장을 도와주는<br />
              스마트한 도구를 시작하세요.
            </p>
          </div>

          {/* 기능 소개 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              먼저 가족 설정이 필요합니다
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">가족 코드 생성 또는 참여</p>
                  <p className="text-sm text-gray-600">대표 가족이 되거나 기존 가족에 참여하세요</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">가족 구성원 관리</p>
                  <p className="text-sm text-gray-600">자녀와 다른 가족 구성원들을 초대하세요</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">미션과 용돈 관리</p>
                  <p className="text-sm text-gray-600">체계적인 용돈 관리 시스템을 활용하세요</p>
                </div>
              </div>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              나중에 설정
            </button>
            <button
              onClick={handleNavigateToFamily}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-4 py-3 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Users className="w-4 h-4" />
              가족 설정 시작
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 도움말 */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              💡 가족 설정은 언제든지 '가족' 탭에서 변경할 수 있습니다
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}