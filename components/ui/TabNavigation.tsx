'use client'

import { usePathname, useRouter } from 'next/navigation'
import { CheckSquare, Wallet, BarChart3 } from 'lucide-react'

export default function TabNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  const tabs = [
    {
      id: 'missions',
      label: '미션 관리',
      icon: CheckSquare,
      path: '/',
      active: pathname === '/'
    },
    {
      id: 'allowance',
      label: '용돈 내역',
      icon: Wallet,
      path: '/allowance',
      active: pathname === '/allowance'
    },
    {
      id: 'statistics',
      label: '통계',
      icon: BarChart3,
      path: '/statistics',
      active: pathname === '/statistics'
    }
  ]

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => router.push(tab.path)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  tab.active
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}