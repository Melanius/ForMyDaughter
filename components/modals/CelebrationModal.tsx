'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// 초등학생 대상 축하 메시지 5개
const CELEBRATION_MESSAGES = [
  "🎉 와! 부모님이 용돈을 전달해주셨어요! 오늘 미션들을 모두 완료한 너 정말 대단해!",
  "💰 축하해요! 용돈을 받았어요! 열심히 미션을 완료한 보상이에요. 최고!",  
  "⭐ 우와! 부모님이 용돈을 보내주셨네요! 성실하게 미션을 해낸 당신이 자랑스러워요!",
  "🏆 멋져요! 용돈 도착! 오늘 미션을 척척 완료한 모습이 정말 훌륭했어요!",
  "🌟 야호! 부모님 용돈이 왔어요! 책임감 있게 미션을 끝낸 당신, 진짜 멋져요!"
]

interface CelebrationModalProps {
  isOpen: boolean
  onClose: () => void
  amount: number
  missionCount: number
}

export function CelebrationModal({ isOpen, onClose, amount, missionCount }: CelebrationModalProps) {
  const [mounted, setMounted] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setMounted(true)
    // 랜덤 메시지 선택
    const randomIndex = Math.floor(Math.random() * CELEBRATION_MESSAGES.length)
    setMessage(CELEBRATION_MESSAGES[randomIndex])
  }, [])

  useEffect(() => {
    if (isOpen) {
      // 3초 후 자동으로 닫기
      const timer = setTimeout(() => {
        onClose()
      }, 5000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isOpen, onClose])

  if (!mounted || !isOpen) {
    return null
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 animate-fade-in"
        onClick={onClose}
      />
      
      {/* 모달 컨테이너 - 모바일 최적화 */}
      <div className="relative bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100 rounded-2xl sm:rounded-3xl shadow-2xl max-w-xs sm:max-w-sm w-full p-4 sm:p-8 animate-celebration-entrance max-h-[90vh] overflow-y-auto">
        {/* 반짝이는 별들 */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute top-4 left-4 text-yellow-400 animate-twinkle-1">✨</div>
          <div className="absolute top-6 right-8 text-pink-400 animate-twinkle-2">⭐</div>
          <div className="absolute bottom-8 left-6 text-purple-400 animate-twinkle-3">🌟</div>
          <div className="absolute bottom-4 right-4 text-blue-400 animate-twinkle-1">✨</div>
          <div className="absolute top-1/2 left-2 text-green-400 animate-twinkle-2">⭐</div>
          <div className="absolute top-1/3 right-2 text-red-400 animate-twinkle-3">🌟</div>
        </div>

        {/* 메인 아이콘 - 모바일 최적화 */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full shadow-lg animate-glow">
            <div className="text-3xl sm:text-4xl animate-bounce-gentle">🎁</div>
          </div>
        </div>

        {/* 제목 - 모바일 최적화 */}
        <h2 className="text-lg sm:text-xl font-bold text-center text-gray-800 mb-3 sm:mb-4">
          용돈 전달 완료! 🎉
        </h2>

        {/* 축하 메시지 - 모바일 최적화 */}
        <p className="text-center text-gray-700 leading-relaxed mb-4 sm:mb-6 text-sm sm:text-sm px-2">
          {message}
        </p>

        {/* 금액 및 미션 정보 - 모바일 최적화 */}
        <div className="bg-white bg-opacity-70 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 text-center">
          <div className="text-xl sm:text-2xl font-bold text-green-600 mb-1">
            {amount.toLocaleString()}원
          </div>
          <div className="text-sm text-gray-600">
            {missionCount}개 미션 완료 보상
          </div>
        </div>

        {/* 닫기 버튼 - 모바일 최적화 */}
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 text-sm sm:text-base min-h-[44px]"
        >
          고마워요! 😊
        </button>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

// CSS 클래스들을 위한 스타일 (globals.css에 추가될 예정)
/*
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes celebration-entrance {
  0% {
    opacity: 0;
    transform: scale(0.7) translateY(-20px);
  }
  50% {
    opacity: 1;
    transform: scale(1.05) translateY(0);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes twinkle-1 {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(1.2); }
}

@keyframes twinkle-2 {
  0%, 100% { opacity: 0.7; transform: scale(1.1); }
  33% { opacity: 1; transform: scale(0.8); }
  66% { opacity: 0.4; transform: scale(1.3); }
}

@keyframes twinkle-3 {
  0%, 100% { opacity: 0.5; transform: scale(0.9); }
  25% { opacity: 1; transform: scale(1.4); }
  75% { opacity: 0.2; transform: scale(1.1); }
}

@keyframes bounce-gentle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.5); }
  50% { box-shadow: 0 0 30px rgba(251, 191, 36, 0.8), 0 0 40px rgba(251, 191, 36, 0.4); }
}

.animate-fade-in { animation: fade-in 0.3s ease-out; }
.animate-celebration-entrance { animation: celebration-entrance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
.animate-twinkle-1 { animation: twinkle-1 2s ease-in-out infinite; }
.animate-twinkle-2 { animation: twinkle-2 2.5s ease-in-out infinite; }
.animate-twinkle-3 { animation: twinkle-3 3s ease-in-out infinite; }
.animate-bounce-gentle { animation: bounce-gentle 2s ease-in-out infinite; }
.animate-glow { animation: glow 2s ease-in-out infinite; }
*/