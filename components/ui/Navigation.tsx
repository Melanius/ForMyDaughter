'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, Calendar, Coins, BarChart3 } from 'lucide-react'

const navItems = [
  { href: '/', icon: Home, label: '홈' },
  { href: '/dashboard', icon: BarChart3, label: '대시보드' },
  { href: '/calendar', icon: Calendar, label: '달력' },
  { href: '/allowance', icon: Coins, label: '용돈' },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-100 z-30">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'text-primary bg-primary/10' 
                    : 'text-gray-500 hover:text-primary hover:bg-primary/5'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Icon size={20} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    className="absolute bottom-0 left-1/2 w-1 h-1 bg-primary rounded-full"
                    layoutId="activeIndicator"
                    style={{ transform: 'translateX(-50%)' }}
                  />
                )}
              </motion.div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}