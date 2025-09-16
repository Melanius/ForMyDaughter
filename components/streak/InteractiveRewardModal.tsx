'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import streakService from '@/lib/services/streak'
import { nowKST } from '@/lib/utils/dateUtils'

interface InteractiveRewardModalProps {
  isVisible: boolean
  streakCount: number
  bonusAmount: number
  onClaim: () => void
  onClose: () => void
}

export function InteractiveRewardModal({ 
  isVisible, 
  streakCount, 
  bonusAmount, 
  onClaim,
  onClose 
}: InteractiveRewardModalProps) {
  const { user } = useAuth()
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'celebrate' | 'waiting'>('enter')
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([] )

  useEffect(() => {
    if (!isVisible) return

    // 파티클 생성 (더 많이, 더 활발하게)
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 0.8
    }))
    setParticles(newParticles)

    // 애니메이션 단계 관리
    const timer1 = setTimeout(() => setAnimationPhase('celebrate'), 300)
    const timer2 = setTimeout(() => setAnimationPhase('waiting'), 2000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [isVisible, onClose])

  const handleClaimReward = async () => {
    if (!user?.id || claiming || claimed) return

    try {
      setClaiming(true)

      // 보상 수령 처리 (용돈 기입장에 추가)
      await streakService.claimManualReward(user.id, bonusAmount, streakCount, nowKST())
      
      setClaimed(true)
      
      // 축하 애니메이션을 위한 딜레이 후 완료 처리
      setTimeout(() => {
        onClaim()
        setClaimed(false)
        setClaiming(false)
        setAnimationPhase('enter')
      }, 2000)

    } catch (error) {
      console.error('보상 수령 실패:', error)
      alert('보상 수령에 실패했습니다. 다시 시도해주세요.')
      setClaiming(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-700 ${
          animationPhase === 'celebrate' || animationPhase === 'waiting' ? 'bg-opacity-40' : 'bg-opacity-0'
        }`}
      />
      
      {/* 파티클 효과 - 더 화려하게 */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className={`absolute transition-all duration-2000 ${
            animationPhase === 'celebrate' || animationPhase === 'waiting'
              ? 'animate-bounce scale-100 opacity-100' 
              : 'scale-0 opacity-0'
          }`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${particle.delay}s`,
            transform: animationPhase === 'celebrate' || animationPhase === 'waiting'
              ? `scale(${Math.random() * 1.5 + 0.8}) rotate(${Math.random() * 360}deg)`
              : 'scale(0)',
            fontSize: `${Math.random() * 20 + 25}px`
          }}
        >
          {['🎉', '🔥', '⭐', '💎', '🏆', '🎈'][Math.floor(Math.random() * 6)]}
        </div>
      ))}

      {/* 메인 보상 모달 */}
      <div 
        className={`relative bg-gradient-to-br from-yellow-300 via-orange-300 to-red-400 rounded-2xl shadow-2xl transform transition-all duration-700 max-w-sm w-full ${
          animationPhase === 'enter' ? 'scale-75 rotate-6 opacity-0' :
          animationPhase === 'celebrate' ? 'scale-105 rotate-0 opacity-100' :
          'scale-100 rotate-0 opacity-100'
        }`}
      >
        {/* 반짝이는 보더 효과 */}
        <div className="absolute inset-0 rounded-2xl animate-pulse bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 opacity-30"></div>
        
        <div className="relative p-8 text-center text-white">
          {/* 메인 축하 이모지 - 더 크고 움직이게 */}
          <div className="text-8xl mb-6">
            <div className={`inline-block ${animationPhase === 'celebrate' ? 'animate-bounce' : ''}`}>
              🎉
            </div>
            <div className={`inline-block ${animationPhase === 'celebrate' ? 'animate-pulse' : ''}`}>
              🔥
            </div>
            <div className={`inline-block ${animationPhase === 'celebrate' ? 'animate-bounce' : ''}`}>
              🎉
            </div>
          </div>
          
          {/* 축하 메시지 - 초등학생 친화적 */}
          <h2 className="text-2xl font-black mb-3 drop-shadow-lg">
            와! 대단해요! 🏆
          </h2>
          <p className="text-xl font-bold mb-2">
            {streakCount}일 연속 미션 완료!
          </p>
          <p className="text-lg opacity-90 mb-6">
            정말 열심히 했어요! 👏
          </p>
          
          {/* 보상 금액 표시 - 눈에 잘 띄게 */}
          <div className="bg-white bg-opacity-25 backdrop-blur-sm rounded-xl p-6 mb-6 border-2 border-white border-opacity-30">
            <div className="text-sm font-medium opacity-80 mb-1">🎁 받을 보상</div>
            <div className="text-4xl font-black text-yellow-100 drop-shadow-lg">
              {bonusAmount.toLocaleString()}원
            </div>
          </div>
          
          {/* 액션 버튼들 */}
          {!claimed ? (
            <div className="space-y-3">
              {/* 보상 받기 버튼 - 크고 눈에 띄게 */}
              <button
                onClick={handleClaimReward}
                disabled={claiming || animationPhase !== 'waiting'}
                className={`w-full py-4 px-6 rounded-xl text-xl font-black transition-all duration-300 ${
                  claiming 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : animationPhase === 'waiting'
                      ? 'bg-green-500 hover:bg-green-600 active:scale-95 shadow-xl hover:shadow-2xl animate-pulse'
                      : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {claiming ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>받는 중...</span>
                  </div>
                ) : animationPhase === 'waiting' ? (
                  '🎁 보상 받기!'
                ) : (
                  '잠시만 기다려주세요...'
                )}
              </button>
              
              {/* 나중에 받기 버튼 */}
              {animationPhase === 'waiting' && (
                <button
                  onClick={onClose}
                  className="w-full py-2 px-4 rounded-lg text-white text-opacity-80 hover:text-opacity-100 transition-all text-sm"
                >
                  나중에 받을게요
                </button>
              )}
            </div>
          ) : (
            /* 수령 완료 상태 */
            <div className="space-y-4">
              <div className="text-6xl animate-bounce">🎉</div>
              <p className="text-2xl font-black">보상을 받았어요!</p>
              <p className="text-lg">용돈에 추가되었습니다! 💰</p>
            </div>
          )}
          
          {/* 격려 메시지 */}
          <div className="mt-6 p-4 bg-white bg-opacity-15 rounded-lg">
            <p className="text-sm font-medium opacity-90">
              계속해서 좋은 습관을 만들어가요! 💪✨
            </p>
          </div>
        </div>
      </div>

      {/* 추가 장식 효과들 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 코너 별들 */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`absolute text-6xl transition-all duration-1000 ${
              animationPhase === 'celebrate' || animationPhase === 'waiting' ? 'animate-ping opacity-70' : 'opacity-0'
            }`}
            style={{
              left: `${15 + (i % 4) * 25}%`,
              top: `${10 + Math.floor(i / 4) * 30}%`,
              animationDelay: `${i * 0.15}s`
            }}
          >
            {i % 3 === 0 ? '⭐' : i % 3 === 1 ? '✨' : '💫'}
          </div>
        ))}
        
        {/* 하트 효과 */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`heart-${i}`}
            className={`absolute text-4xl transition-all duration-2000 ${
              animationPhase === 'celebrate' || animationPhase === 'waiting' ? 'animate-pulse opacity-60' : 'opacity-0'
            }`}
            style={{
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 80 + 10}%`,
              animationDelay: `${i * 0.2}s`
            }}
          >
            💖
          </div>
        ))}
      </div>
    </div>
  )
}