'use client'

import { useState, useEffect } from 'react'

interface CelebrationEffectProps {
  isVisible: boolean
  streakCount: number
  bonusAmount: number
  onComplete: () => void
}

export function CelebrationEffect({ isVisible, streakCount, bonusAmount, onComplete }: CelebrationEffectProps) {
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'celebrate' | 'exit'>('enter')
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  useEffect(() => {
    if (!isVisible) return

    // 파티클 생성
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 0.5
    }))
    setParticles(newParticles)

    // 애니메이션 단계 관리
    const timer1 = setTimeout(() => setAnimationPhase('celebrate'), 200)
    const timer2 = setTimeout(() => setAnimationPhase('exit'), 2500)
    const timer3 = setTimeout(() => {
      onComplete()
      setAnimationPhase('enter')
    }, 3000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2) 
      clearTimeout(timer3)
    }
  }, [isVisible, onComplete])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-500 ${
          animationPhase === 'celebrate' ? 'bg-opacity-30' : 'bg-opacity-0'
        }`}
      />
      
      {/* 파티클 효과 */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className={`absolute w-2 h-2 rounded-full transition-all duration-2000 ${
            animationPhase === 'celebrate' 
              ? 'bg-yellow-400 animate-bounce' 
              : 'bg-transparent'
          }`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${particle.delay}s`,
            transform: animationPhase === 'celebrate' 
              ? `scale(${Math.random() * 2 + 1}) rotate(${Math.random() * 360}deg)`
              : 'scale(0)'
          }}
        />
      ))}

      {/* 메인 축하 메시지 */}
      <div 
        className={`bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-8 shadow-2xl transform transition-all duration-500 ${
          animationPhase === 'enter' ? 'scale-0 rotate-12' :
          animationPhase === 'celebrate' ? 'scale-100 rotate-0' :
          'scale-110 opacity-0'
        }`}
      >
        <div className="text-center text-white">
          {/* 축하 이모지 */}
          <div className="text-6xl mb-4 animate-bounce">
            🎉🔥🎉
          </div>
          
          {/* 축하 메시지 */}
          <h2 className="text-2xl font-bold mb-2">
            연속 완료 달성!
          </h2>
          <p className="text-lg mb-4">
            {streakCount}일 연속으로 미션을 완료했어요!
          </p>
          
          {/* 보너스 금액 */}
          <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-4">
            <div className="text-sm opacity-80">보너스 지급</div>
            <div className="text-3xl font-bold">
              +{bonusAmount.toLocaleString()}원
            </div>
          </div>
          
          {/* 격려 메시지 */}
          <p className="text-sm opacity-80">
            정말 대단해요! 계속해서 좋은 습관을 만들어가세요! 💪
          </p>
        </div>
      </div>

      {/* 불꽃 효과 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-8 h-8 text-4xl transition-all duration-1000 ${
              animationPhase === 'celebrate' ? 'animate-ping' : 'opacity-0'
            }`}
            style={{
              left: `${20 + (i % 4) * 20}%`,
              top: `${20 + Math.floor(i / 4) * 60}%`,
              animationDelay: `${i * 0.1}s`
            }}
          >
            ✨
          </div>
        ))}
      </div>
    </div>
  )
}