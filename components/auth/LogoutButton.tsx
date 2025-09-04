'use client'

import { useAuth } from './AuthProvider'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const { signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-gray-600 hover:text-gray-800 font-medium transition-colors text-xs bg-white/50 hover:bg-white/80 px-2 py-1 rounded-md border border-orange-200/50"
    >
      로그아웃
    </button>
  )
}