'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}

export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  className = ''
}: ButtonProps) {
  const baseClasses = 'font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2'
  
  const variantClasses = {
    primary: 'bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-secondary hover:bg-secondary/90 text-white shadow-lg hover:shadow-xl',
    success: 'bg-success hover:bg-success/90 text-white shadow-lg hover:shadow-xl',
    warning: 'bg-warning hover:bg-warning/90 text-white shadow-lg hover:shadow-xl'
  }
  
  const sizeClasses = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-3 px-4 text-base',
    lg: 'py-4 px-6 text-lg'
  }
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'

  return (
    <motion.button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      disabled={disabled}
    >
      {children}
    </motion.button>
  )
}