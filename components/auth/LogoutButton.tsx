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
      className="text-white/80 hover:text-white font-medium transition-colors text-sm"
    >
      로그아웃
    </button>
  )
}