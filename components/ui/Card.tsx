'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export default function Card({ children, className = '', hover = false, onClick }: CardProps) {
  const baseClasses = 'bg-white rounded-xl shadow-lg p-6 transition-all duration-200'
  const hoverClasses = hover ? 'hover:shadow-xl cursor-pointer' : ''
  
  return (
    <motion.div
      className={`${baseClasses} ${hoverClasses} ${className}`}
      onClick={onClick}
      whileHover={hover ? { y: -2, scale: 1.02 } : {}}
      whileTap={hover ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {children}
    </motion.div>
  )
}