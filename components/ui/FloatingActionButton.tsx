'use client'

interface FloatingActionButtonProps {
  onClick: () => void
  className?: string
  ariaLabel?: string
  title?: string
}

export function FloatingActionButton({ 
  onClick, 
  className = '',
  ariaLabel = '새 항목 추가',
  title = '새 항목 추가'
}: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-24 md:bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-2xl font-bold z-50 focus:ring-4 focus:ring-orange-200 focus:outline-none ${className}`}
      aria-label={ariaLabel}
      title={title}
      type="button"
    >
      +
    </button>
  )
}