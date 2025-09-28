'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types/supabase'
import { checkDailyMissionsOnChildLogin } from '@/lib/services/dailyMissionManager'
import { authLogger, missionLogger } from '@/lib/utils/logger'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = async (userId: string, retryCount = 0) => {
    const MAX_RETRIES = 3
    const RETRY_DELAY = 1000 // 1초
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // PGRST116 에러 (프로필이 아직 생성되지 않음)이고 재시도 가능한 경우
        if (error.code === 'PGRST116' && retryCount < MAX_RETRIES) {
          authLogger.log(`프로필 생성 대기 중... (${retryCount + 1}/${MAX_RETRIES})`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)))
          return fetchProfile(userId, retryCount + 1)
        }
        throw error
      }
      
      setProfile(data)
      authLogger.log('프로필 조회 성공:', data.user_type)
      
      // 자녀 계정 로그인 시 데일리 미션 체크
      await checkDailyMissionsForChild(data)
      
    } catch (error) {
      if (retryCount >= MAX_RETRIES) {
        authLogger.error(`프로필 조회 최종 실패 (${MAX_RETRIES}회 재시도 후):`, error)
      } else {
        authLogger.error('프로필 조회 실패:', error)
      }
      setProfile(null)
    }
  }

  const checkDailyMissionsForChild = async (profileData: Profile) => {
    // 자녀 계정이 아니면 체크하지 않음
    if (!profileData || !['son', 'daughter'].includes(profileData.user_type)) {
      return
    }

    // 첫 로그인인 경우 미션 생성하지 않음 (환영 모달에서 처리)
    if (profileData.is_first_login) {
      authLogger.log('첫 로그인 감지 - 미션 자동 생성 건너뜀', {
        userId: profileData.id,
        userType: profileData.user_type
      })
      return
    }

    // 기존 사용자만 자동 미션 생성
    authLogger.log('기존 자녀 로그인 - 데일리 미션 체크 시작')
    await checkDailyMissionsOnChildLogin(profileData.id)
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      }
      
      setLoading(false)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}