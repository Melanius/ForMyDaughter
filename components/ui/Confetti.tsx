'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface ConfettiProps {
  trigger: boolean
  onComplete?: () => void
}

export default function Confetti({ trigger, onComplete }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{id: number, x: number, color: string, delay: number}>>([])

  useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: ['#FF6B9D', '#4ECDC4', '#FFE66D', '#7BCF6E', '#FFA726'][Math.floor(Math.random() * 5)],
        delay: Math.random() * 0.5
      }))
      
      setParticles(newParticles)
      
      // 애니메이션 완료 후 정리
      setTimeout(() => {
        setParticles([])
        onComplete?.()
      }, 2000)
    }
  }, [trigger, onComplete])

  if (!trigger || particles.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="absolute w-3 h-3 rounded-full"
          style={{ 
            backgroundColor: particle.color,
            left: `${particle.x}%`,
            top: '-10px'
          }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{ 
            y: '110vh', 
            opacity: 0, 
            rotate: 720,
            x: Math.random() * 200 - 100
          }}
          transition={{
            duration: 2,
            delay: particle.delay,
            ease: 'easeIn'
          }}
        />
      ))}
    </div>
  )
}